import { traverse, isPascalCase } from './babel';

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
 */
export function analyzeAST(ast) {
  const issues = [];

  traverse(ast, {
    JSXAttribute(path) {
      const attrName = path.node.name?.name;
      const value = path.node.value;
      if (!value || value.type !== 'JSXExpressionContainer') return;

      const expr = value.expression;
      const componentName = findEnclosingComponentName(path);
      const line = path.node.loc?.start?.line;
      console.log(attrName, expr.type, 'type**')
      // Anti-pattern 1: Inline function / arrow function passed as prop
      if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
        issues.push({
          id: `inline-cb-${line}-${attrName}`,
          type: 'inline-callback',
          severity: 'medium',
          title: `Inline function passed to "${attrName}"`,
          description: `A new function instance is created on every render for the "${attrName}" prop${componentName ? ` inside <${componentName} />` : ''
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
          description: `A new object literal is created on every render for the "${attrName}" prop${componentName ? ` inside <${componentName} />` : ''
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
          description: `A new array literal is created on every render for the "${attrName}" prop${componentName ? ` inside <${componentName} />` : ''
            }. This defeats shallow prop comparisons.`,
          fix: 'Wrap the array in useMemo, or hoist it outside the component if it never changes.',
          line,
          componentName,
        });
      }
    },
  });

  return issues;
}
