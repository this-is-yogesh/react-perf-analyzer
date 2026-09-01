import { parseCode, traverse, isInsideHookCallback, isPascalCase, returnsJSX } from './babel.js';

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function loc(node) {
  return node.loc ? node.loc.start.line : null;
}

const EXPENSIVE_CALL_NAMES = new Set(['map', 'filter', 'reduce', 'sort', 'flatMap']);

function findEnclosingComponentName(path) {
  let current = path.parentPath;
  while (current) {
    if (current.isFunctionDeclaration() && current.node.id && isPascalCase(current.node.id.name)) {
      if (returnsJSX(current)) return current.node.id.name;
    }
    if (current.isFunctionExpression() || current.isArrowFunctionExpression()) {
      const parent = current.parentPath;
      if (parent && parent.isVariableDeclarator() && parent.node.id.type === 'Identifier') {
        if (isPascalCase(parent.node.id.name) && returnsJSX(current)) {
          return parent.node.id.name;
        }
      }
    }
    current = current.parentPath;
  }
  return null;
}

/**
 * Runs static AST analysis over pasted source code.
 * Returns { issues, componentNames, error }.
 * `error` is set (with a `loc` of {line, column}) when the code fails to parse.
 */
export function analyzeStatic(code) {
  idCounter = 0;
  let ast;
  try {
    ast = parseCode(code);
  } catch (err) {
    return {
      issues: [],
      componentNames: [],
      error: {
        message: err.message || 'Failed to parse code',
        line: err.loc ? err.loc.line : null,
        column: err.loc ? err.loc.column : null,
      },
    };
  }

  const issues = [];
  const componentNames = new Set();
  const localFnDeclarations = []; // { name, line, componentName, usedInJSX }

  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id && isPascalCase(path.node.id.name) && returnsJSX(path)) {
        componentNames.add(path.node.id.name);
        const hasProps = path.node.params.length > 0;
        checkMemoOpportunity(path, path.node.id.name, hasProps);
      }
    },
    VariableDeclarator(path) {
      const id = path.node.id;
      if (id.type !== 'Identifier' || !isPascalCase(id.name)) return;
      let fnPath = null;
      let isMemoWrapped = false;
      if (path.get('init').isArrowFunctionExpression() || path.get('init').isFunctionExpression()) {
        fnPath = path.get('init');
      } else if (path.get('init').isCallExpression()) {
        const callee = path.node.init.callee;
        const calleeName =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
            ? callee.property.name
            : null;
        if (calleeName === 'memo' && path.node.init.arguments.length) {
          const argPath = path.get('init.arguments.0');
          if (argPath.isArrowFunctionExpression() || argPath.isFunctionExpression()) {
            fnPath = argPath;
            isMemoWrapped = true;
          }
        }
      }
      if (fnPath && returnsJSX(fnPath)) {
        componentNames.add(id.name);
        const params = fnPath.node.params || [];
        if (!isMemoWrapped) {
          checkMemoOpportunity(path, id.name, params.length > 0);
        }
      }
    },

    // Inline callbacks / objects / arrays passed as JSX props
    JSXAttribute(path) {
      const value = path.node.value;
      if (!value || value.type !== 'JSXExpressionContainer') return;
      const expr = value.expression;
      const attrName = path.node.name.name;
      const line = loc(path.node);
      const componentName = findEnclosingComponentName(path);
      if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
        issues.push({
          id: nextId('inline-callback'),
          category: 'inline-callback',
          severity: 'medium',
          title: `Inline function passed to "${attrName}"`,
          description: `A new function is created on every render for the "${attrName}" prop${
            componentName ? ` inside ${componentName}` : ''
          }. This breaks reference equality, forcing memoized children to re-render.`,
          fix: 'Wrap the handler in useCallback (or hoist it outside render if it has no dependencies).',
          line,
          componentName,
        });
      } else if (expr.type === 'ObjectExpression') {
        issues.push({
          id: nextId('inline-object'),
          category: 'inline-object-prop',
          severity: 'medium',
          title: `Inline object passed to "${attrName}"`,
          description: `A new object literal is created on every render for the "${attrName}" prop${
            componentName ? ` inside ${componentName}` : ''
          }, which defeats shallow prop comparisons.`,
          fix: 'Wrap the object in useMemo, or lift it outside the component if it never changes.',
          line,
          componentName,
        });
      } else if (expr.type === 'ArrayExpression') {
        issues.push({
          id: nextId('inline-array'),
          category: 'inline-array-prop',
          severity: 'medium',
          title: `Inline array passed to "${attrName}"`,
          description: `A new array literal is created on every render for the "${attrName}" prop${
            componentName ? ` inside ${componentName}` : ''
          }, which defeats shallow prop comparisons.`,
          fix: 'Wrap the array in useMemo, or hoist it outside the component if it is constant.',
          line,
          componentName,
        });
      }
    },

    // Expensive loops directly inside render (not inside useMemo/useCallback/useEffect)
    'ForStatement|WhileStatement|DoWhileStatement'(path) {
      const componentName = findEnclosingComponentName(path);
      if (!componentName) return;
      if (isInsideHookCallback(path)) return;
      let nested = false;
      path.traverse({
        'ForStatement|WhileStatement|DoWhileStatement'() {
          nested = true;
        },
      });
      issues.push({
        id: nextId('expensive-loop'),
        category: 'expensive-loop',
        severity: nested ? 'high' : 'medium',
        title: `${nested ? 'Nested loop' : 'Loop'} runs on every render of ${componentName}`,
        description: `A ${path.node.type.replace('Statement', '').toLowerCase()} loop executes directly in ${componentName}'s render body${
          nested ? ', with another loop nested inside it' : ''
        }, redoing the work on every re-render.`,
        fix: 'Move the computation into useMemo so it only re-runs when its dependencies change.',
        line: loc(path.node),
        componentName,
      });
    },

    // Chained/expensive array method calls directly in render, not memoized
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return;
      if (!EXPENSIVE_CALL_NAMES.has(callee.property.name)) return;
      const componentName = findEnclosingComponentName(path);
      if (!componentName) return;
      if (isInsideHookCallback(path)) return;
      // only flag the outermost call in a chain to avoid duplicate reports
      if (
        path.parentPath.isMemberExpression() &&
        path.parentPath.parentPath &&
        path.parentPath.parentPath.isCallExpression() &&
        EXPENSIVE_CALL_NAMES.has(path.parentPath.node.property && path.parentPath.node.property.name)
      ) {
        return;
      }
      let chainLength = 0;
      let cursor = path;
      while (
        cursor &&
        cursor.node.type === 'CallExpression' &&
        cursor.node.callee.type === 'MemberExpression' &&
        EXPENSIVE_CALL_NAMES.has(cursor.node.callee.property.name)
      ) {
        chainLength += 1;
        const objectPath = cursor.get('callee.object');
        cursor = objectPath.node.type === 'CallExpression' ? objectPath : null;
      }
      if (chainLength >= 2 || callee.property.name === 'sort') {
        issues.push({
          id: nextId('expensive-computation'),
          category: 'expensive-computation',
          severity: chainLength >= 2 ? 'high' : 'medium',
          title: `Expensive computation in ${componentName}`,
          description: `${
            chainLength >= 2
              ? `A chain of ${chainLength} array operations (.${callee.property.name}, ...)`
              : `An array .${callee.property.name}() call`
          } runs directly in ${componentName}'s render body on every render.`,
          fix: 'Wrap this computation in useMemo, keyed on the values it actually depends on.',
          line: loc(path.node),
          componentName,
        });
      }
    },

    // Missing useCallback: a function declared inside a component and later passed as a JSX prop
    VariableDeclaration(path) {
      const componentName = findEnclosingComponentName(path);
      if (!componentName) return;
      if (isInsideHookCallback(path)) return;
      path.node.declarations.forEach((decl) => {
        if (
          decl.id.type === 'Identifier' &&
          decl.init &&
          (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression')
        ) {
          localFnDeclarations.push({
            name: decl.id.name,
            line: loc(decl),
            componentName,
            declaratorPath: path,
          });
        } else if (
          decl.id.type === 'Identifier' &&
          decl.init &&
          decl.init.type === 'CallExpression' &&
          decl.init.callee.type === 'MemberExpression' &&
          EXPENSIVE_CALL_NAMES.has(decl.init.callee.property.name) === false
        ) {
          // not an expensive-call case; ignore here (handled by CallExpression visitor)
        }
      });
    },
  });

  // Second pass: see which locally declared functions get referenced inside a JSX attribute
  const usedAsPropNames = new Set();
  traverse(ast, {
    JSXAttribute(path) {
      const value = path.node.value;
      if (!value || value.type !== 'JSXExpressionContainer') return;
      const expr = value.expression;
      if (expr.type === 'Identifier') {
        usedAsPropNames.add(expr.name);
      }
    },
  });
  localFnDeclarations.forEach((decl) => {
    if (usedAsPropNames.has(decl.name)) {
      issues.push({
        id: nextId('missing-usecallback'),
        category: 'missing-usecallback',
        severity: 'medium',
        title: `"${decl.name}" recreated every render in ${decl.componentName}`,
        description: `"${decl.name}" is declared as a plain function inside ${decl.componentName} and passed down as a prop, so it gets a new identity on every render.`,
        fix: `Wrap "${decl.name}" in useCallback so its reference stays stable between renders.`,
        line: decl.line,
        componentName: decl.componentName,
      });
    }
  });

  function checkMemoOpportunity(path, name, hasProps) {
    if (!hasProps) return;
    issues.push({
      id: nextId('missing-memo'),
      category: 'missing-memo',
      severity: 'low',
      title: `${name} isn't wrapped in React.memo`,
      description: `${name} accepts props but is a plain function component, so it re-renders whenever its parent renders, even with identical props.`,
      fix: `Wrap the export in React.memo: export default React.memo(${name}).`,
      line: loc(path.node),
      componentName: name,
    });
  }

  // useMemo opportunities for expensive array chains are already emitted as
  // "expensive-computation"; surface a lighter useMemo-specific issue only
  // when a chain exists but is short (single .map with heavy body is common
  // and still worth flagging at low severity if repeated 1x).
  return {
    issues,
    componentNames: Array.from(componentNames),
    error: null,
  };
}
