import Babel from '@babel/standalone';
import { parseCode, generateCode, traverse, t, isPascalCase, returnsJSX } from './babel';

/**
 * Instruments pasted React source code for runtime tracking in the sandbox:
 * 1. Strips import statements (React, ReactDOM, and hooks are injected by the sandbox).
 * 2. Unwraps export keywords so the code executes cleanly inside a sandboxed function scope.
 * 3. Removes stray manual ReactDOM.render or createRoot calls.
 * 4. Wraps all detected function components with __track(fn, "ComponentName").
 * 5. Identifies the root component to mount (default export > "App" > last component).
 * 6. Compiles JSX into React.createElement using the classic runtime.
 *
 * @param {string} code - Raw source code from editor
 * @returns {{ source: string|null, rootExpr: string|null, componentNames: string[], error: object|null }}
 */
export function instrumentCode(code) {
  let ast;
  try {
    ast = parseCode(code);
  } catch (err) {
    return {
      source: null,
      rootExpr: null,
      componentNames: [],
      error: {
        message: err.message || 'Failed to parse code for instrumentation',
        line: err.loc ? err.loc.line : null,
        column: err.loc ? err.loc.column : null,
      },
    };
  }

  const componentNames = [];
  let defaultExportName = null;

  // 1. Strip imports and unwrap exports so the code can execute as a script
  traverse(ast, {
    Program(path) {
      const body = path.get('body');
      body.forEach((stmt) => {
        if (stmt.isImportDeclaration()) {
          stmt.remove();
        } else if (stmt.isExportNamedDeclaration()) {
          if (stmt.node.declaration) {
            stmt.replaceWith(stmt.node.declaration);
          } else {
            stmt.remove();
          }
        } else if (stmt.isExportDefaultDeclaration()) {
          const decl = stmt.node.declaration;
          if (decl.type === 'FunctionDeclaration') {
            const name = decl.id ? decl.id.name : '__DefaultExport';
            if (!decl.id) decl.id = t.identifier(name);
            defaultExportName = decl.id.name;
            stmt.replaceWith(decl);
          } else if (decl.type === 'Identifier') {
            defaultExportName = decl.name;
            stmt.remove();
          } else {
            defaultExportName = '__DefaultExport';
            stmt.replaceWith(
              t.variableDeclaration('const', [
                t.variableDeclarator(t.identifier('__DefaultExport'), decl),
              ])
            );
          }
        }
      });
    },
  });

  // 2. Strip any stray top-level ReactDOM.render / createRoot(...).render calls
  traverse(ast, {
    Program(path) {
      path.get('body').forEach((stmt) => {
        if (!stmt.isExpressionStatement()) return;
        const source = generateCode(t.program([stmt.node]));
        if (/ReactDOM\s*\.\s*(render|createRoot)/.test(source) || /\bcreateRoot\s*\(/.test(source)) {
          stmt.remove();
        }
      });
    },
  });

  // 3. Wrap component definitions with __track(fn, "Name")
  traverse(ast, {
    FunctionDeclaration(path) {
      if (!path.parentPath.isProgram()) return;
      const id = path.node.id;
      if (!id || !isPascalCase(id.name)) return;
      if (!returnsJSX(path)) return;
      componentNames.push(id.name);

      const fnExpr = t.functionExpression(
        t.identifier(id.name),
        path.node.params,
        path.node.body,
        path.node.generator,
        path.node.async
      );
      const wrapped = t.callExpression(t.identifier('__track'), [fnExpr, t.stringLiteral(id.name)]);
      const decl = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(id.name), wrapped)]);
      path.replaceWith(decl);
    },

    VariableDeclarator(path) {
      if (!path.parentPath.parentPath.isProgram()) return;
      const id = path.node.id;
      if (id.type !== 'Identifier' || !isPascalCase(id.name)) return;
      const initPath = path.get('init');
      if (!initPath.node) return;

      if (initPath.isArrowFunctionExpression() || initPath.isFunctionExpression()) {
        if (!returnsJSX(initPath)) return;
        componentNames.push(id.name);
        const wrapped = t.callExpression(t.identifier('__track'), [initPath.node, t.stringLiteral(id.name)]);
        initPath.replaceWith(wrapped);
        return;
      }

      // Preserve React.memo(Component) wrapping
      if (initPath.isCallExpression()) {
        const callee = initPath.node.callee;
        const calleeName =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
            ? callee.property.name
            : null;

        if (calleeName === 'memo' && initPath.node.arguments.length) {
          const argPath = initPath.get('arguments.0');
          if (
            (argPath.isArrowFunctionExpression() || argPath.isFunctionExpression()) &&
            returnsJSX(argPath)
          ) {
            componentNames.push(id.name);
            const wrapped = t.callExpression(t.identifier('__track'), [
              argPath.node,
              t.stringLiteral(id.name),
            ]);
            argPath.replaceWith(wrapped);
          }
        }
      }
    },
  });

  if (componentNames.length === 0) {
    return {
      source: null,
      rootExpr: null,
      componentNames: [],
      error: {
        message: 'No React function component was found to instrument.',
        line: null,
        column: null,
      },
    };
  }

  // 4. Determine the root component: default export > "App" > last declared component
  let rootName = null;
  if (defaultExportName && componentNames.includes(defaultExportName)) {
    rootName = defaultExportName;
  } else if (componentNames.includes('App')) {
    rootName = 'App';
  } else {
    rootName = componentNames[componentNames.length - 1];
  }

  // 5. Compile JSX -> React.createElement using the classic runtime
  const rawSource = generateCode(ast);
  let compiled;
  try {
    compiled = Babel.transform(rawSource, {
      presets: [['react', { runtime: 'classic' }]],
      filename: 'sandbox.jsx',
    }).code;
  } catch (err) {
    return {
      source: null,
      rootExpr: null,
      componentNames: [],
      error: {
        message: err.message || 'Failed to compile instrumented code',
        line: null,
        column: null,
      },
    };
  }

  // Supply hooks from React into the local scope
  const prelude =
    'const { useState, useEffect, useLayoutEffect, useContext, useCallback, useMemo, useRef, ' +
    'useReducer, useId, memo, forwardRef, createContext, Fragment, Component, StrictMode } = React;\n';

  return {
    source: prelude + compiled,
    rootExpr: rootName,
    componentNames,
    error: null,
  };
}
