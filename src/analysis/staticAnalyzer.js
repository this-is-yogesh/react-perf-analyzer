import { traverse, isPascalCase } from './babel';

/**
 * Hook callbacks that indicate computation is memoized or deferred.
 */
const HOOK_CALLBACK_NAMES = new Set(['useMemo', 'useCallback', 'useEffect', 'useLayoutEffect']);

/**
 * Array methods that perform significant iteration/transformation.
 */
const EXPENSIVE_ARRAY_METHODS = new Set(['filter', 'map', 'sort', 'reduce', 'slice']);

/**
 * Checks whether a given AST path is located inside a hook callback
 * (e.g. inside the callback passed to useMemo, useCallback, or useEffect)
 * before reaching the outer component boundary.
 */
function isInsideHookCallback(path) {
  let current = path.parentPath;
  while (current) {
    if (
      (current.isFunctionExpression() || current.isArrowFunctionExpression()) &&
      current.parentPath &&
      current.parentPath.isCallExpression()
    ) {
      const callee = current.parentPath.node.callee;
      const calleeName =
        callee.type === 'Identifier'
          ? callee.name
          : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
          ? callee.property.name
          : null;
      if (calleeName && HOOK_CALLBACK_NAMES.has(calleeName)) {
        return true;
      }
    }
    // Stop traversal if we hit the outer component function boundary
    if (
      current.isFunctionDeclaration() ||
      (current.isVariableDeclarator() &&
        current.node.id &&
        isPascalCase(current.node.id.name))
    ) {
      return false;
    }
    current = current.parentPath;
  }
  return false;
}

/**
 * Finds the nearest enclosing React component name for a given AST path.
 * Traverses upwards through parent nodes until it hits a function declaration
 * or arrow/function variable declaration with a PascalCase name.
 */
function findEnclosingComponentName(path) {
  let current = path.parentPath;
  while (current) {
    if (current.isFunctionDeclaration() && current.node.id && isPascalCase(current.node.id.name)) {
      return current.node.id.name;
    }
    if (
      (current.isFunctionExpression() || current.isArrowFunctionExpression()) &&
      current.parentPath &&
      current.parentPath.isVariableDeclarator() &&
      current.parentPath.node.id &&
      isPascalCase(current.parentPath.node.id.name)
    ) {
      return current.parentPath.node.id.name;
    }
    current = current.parentPath;
  }
  return null;
}

/**
 * Analyzes the AST for common static React performance anti-patterns.
 *
 * Current checks:
 * 1. Inline callback functions passed in JSX props (e.g. onClick={() => ...})
 * 2. Inline object literals passed in JSX props (e.g. style={{ padding: 8 }})
 * 3. Inline array literals passed in JSX props (e.g. items={[1, 2, 3]})
 * 4. Chained or expensive array transformations in render body (e.g. .slice().sort().map())
 * 5. Loops (for / while) executing directly in component render body
 */
export function analyzeAST(ast) {
  const issues = [];

  traverse(ast, {
    // Check 1, 2, 3: Inline functions, objects, and arrays in JSX attributes
    JSXAttribute(path) {
      const attrName = path.node.name?.name;
      const value = path.node.value;
      if (!value || value.type !== 'JSXExpressionContainer') return;

      const expr = value.expression;
      const componentName = findEnclosingComponentName(path);
      const line = path.node.loc?.start?.line;

      // Anti-pattern 1: Inline function / arrow function passed as prop
      if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
        issues.push({
          id: `inline-cb-${line}-${attrName}`,
          type: 'inline-callback',
          severity: 'medium',
          title: `Inline function passed to "${attrName}"`,
          description: `A new function instance is created on every render for the "${attrName}" prop${
            componentName ? ` inside <${componentName} />` : ''
          }. This breaks reference equality and causes memoized child components to re-render.`,
          fix: 'Wrap the handler in useCallback, or hoist it outside render if it has no dependencies.',
          line,
          componentName,
        });
      }
      // Anti-pattern 2: Inline object literal passed as prop
      else if (expr.type === 'ObjectExpression') {
        issues.push({
          id: `inline-obj-${line}-${attrName}`,
          type: 'inline-object',
          severity: 'medium',
          title: `Inline object passed to "${attrName}"`,
          description: `A new object literal is created on every render for the "${attrName}" prop${
            componentName ? ` inside <${componentName} />` : ''
          }. This defeats shallow prop comparisons.`,
          fix: 'Wrap the object in useMemo, or lift it outside the component if it is static.',
          line,
          componentName,
        });
      }
      // Anti-pattern 3: Inline array literal passed as prop
      else if (expr.type === 'ArrayExpression') {
        issues.push({
          id: `inline-arr-${line}-${attrName}`,
          type: 'inline-array',
          severity: 'medium',
          title: `Inline array passed to "${attrName}"`,
          description: `A new array literal is created on every render for the "${attrName}" prop${
            componentName ? ` inside <${componentName} />` : ''
          }. This defeats shallow prop comparisons.`,
          fix: 'Wrap the array in useMemo, or hoist it outside the component if it never changes.',
          line,
          componentName,
        });
      }
    },

    // Check 4: Chained or expensive array transformations directly in render body
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return;
      if (!EXPENSIVE_ARRAY_METHODS.has(callee.property.name)) return;

      const componentName = findEnclosingComponentName(path);
      if (!componentName) return;

      // If already wrapped in useMemo or other hook callback, skip
      if (isInsideHookCallback(path)) return;

      // Only flag the outermost call in a chained sequence to avoid duplicate issues
      if (
        path.parentPath.isMemberExpression() &&
        path.parentPath.parentPath &&
        path.parentPath.parentPath.isCallExpression() &&
        EXPENSIVE_ARRAY_METHODS.has(path.parentPath.node.property?.name)
      ) {
        return;
      }

      // Count the chained calls and collect their method names
      let chainLength = 0;
      let cursor = path;
      const methods = [];
      while (
        cursor &&
        cursor.node.type === 'CallExpression' &&
        cursor.node.callee.type === 'MemberExpression' &&
        EXPENSIVE_ARRAY_METHODS.has(cursor.node.callee.property.name)
      ) {
        chainLength += 1;
        methods.push(`.${cursor.node.callee.property.name}()`);
        const objectPath = cursor.get('callee.object');
        cursor = objectPath.node.type === 'CallExpression' ? objectPath : null;
      }

      // Flag chained calls (>= 2 operations) or in-place sorting in render
      if (chainLength >= 2 || callee.property.name === 'sort') {
        const line = path.node.loc?.start?.line;
        const chainStr = methods.reverse().join('');
        issues.push({
          id: `expensive-call-${line}-${callee.property.name}`,
          type: 'expensive-computation',
          severity: chainLength >= 2 ? 'high' : 'medium',
          title: `Expensive computation in <${componentName} />`,
          description: `${
            chainLength >= 2
              ? `A chain of ${chainLength} array operations (${chainStr})`
              : `An array .${callee.property.name}() call`
          } runs directly in <${componentName} />'s render body on every render.`,
          fix: 'Wrap this calculation in useMemo so it only re-runs when its input dependencies change.',
          line,
          componentName,
        });
      }
    },

    // Check 5: Heavy loops (for/while) executing directly in render body
    'ForStatement|WhileStatement|DoWhileStatement'(path) {
      const componentName = findEnclosingComponentName(path);
      if (!componentName) return;
      if (isInsideHookCallback(path)) return;

      const line = path.node.loc?.start?.line;
      const loopType = path.node.type.replace('Statement', '').toLowerCase();
      issues.push({
        id: `loop-${line}-${loopType}`,
        type: 'expensive-loop',
        severity: 'high',
        title: `Loop runs on every render of <${componentName} />`,
        description: `A ${loopType} loop executes directly in <${componentName} />'s render body on every render.`,
        fix: 'Move this loop into useMemo, or extract it into a helper function outside the component.',
        line,
        componentName,
      });
    },
  });

  return issues;
}
