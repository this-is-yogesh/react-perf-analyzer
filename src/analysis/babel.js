import Babel from '@babel/standalone';

/**
 * Babel is a tool that can understand
 * JavaScript/React code.
 */
const parserPkg = Babel.packages.parser;

/**
 * Babel contains a parser, so this gives us
 * Babel's parser to parse JavaScript/React code.
 */
const PARSE_PLUGINS = [
  'jsx',
  'classProperties',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'logicalAssignment',
  'topLevelAwait',
];

/**
 * This function takes JavaScript/React source code
 * and converts it into an Abstract Syntax Tree (AST).
 *
 * The AST is a tree-like structure that represents
 * the code in a structured format, which allows us
 * to inspect and analyze the code.
 *
 * If the code contains a syntax error, Babel throws an error.
 */
export function parseCode(code) {
  return parserPkg.parse(code, {
    // Treat the code as a JavaScript module,
    // so import/export statements are supported.
    sourceType: 'module',

    // Tell Babel which JavaScript/React features to support.
    plugins: PARSE_PLUGINS,

    // If there is a syntax error, throw an error
    // instead of trying to recover.
    errorRecovery: false,
  });
}

/**
 * Babel's traverse package allows us to walk through
 * each node in the Abstract Syntax Tree (AST).
 */
const traversePkg = Babel.packages.traverse;
export const traverse = traversePkg.default || traversePkg;

/**
 * Checks whether a name follows PascalCase convention (e.g. 'Counter', 'App').
 * In React, custom components always start with an uppercase letter.
 */
export function isPascalCase(name) {
  return typeof name === 'string' && /^[A-Z][A-Za-z0-9]*$/.test(name);
}

/**
 * Traverses the AST to find all React component declarations.
 *
 * Looks for:
 * 1. Function declarations with PascalCase names:
 *    function Counter() { ... }
 * 2. Variable declarations assigned to functions:
 *    const Counter = () => { ... }
 */
export function findComponents(ast) {
  const components = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name;
      if (name && isPascalCase(name)) {
        components.push({
          name,
          line: path.node.loc?.start?.line,
        });
      }
    },
    VariableDeclarator(path) {
      const name = path.node.id?.name;
      const init = path.node.init;
      const isFunction =
        init &&
        (init.type === 'ArrowFunctionExpression' ||
          init.type === 'FunctionExpression');

      if (name && isPascalCase(name) && isFunction) {
        components.push({
          name,
          line: path.node.loc?.start?.line,
        });
      }
    },
  });

  return components;
}

/**
 * Babel types package for AST node checking and creation.
 */
export const t = Babel.packages.types;

/**
 * Babel generator for converting AST back into JavaScript code.
 */
const generatorPkg = Babel.packages.generator;
const generate = (generatorPkg.default || generatorPkg).default || (generatorPkg.default || generatorPkg);

export function generateCode(ast) {
  return generate(ast, { retainLines: false, compact: false }).code;
}

/**
 * Checks whether a function body returns JSX anywhere
 * (without crossing into nested inner component functions).
 */
export function returnsJSX(path) {
  let found = false;
  path.traverse({
    JSXElement() {
      found = true;
    },
    JSXFragment() {
      found = true;
    },
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(inner) {
      if (inner.node !== path.node) {
        inner.skip();
      }
    },
  });

  // Handle arrow functions with an implicit expression body returning JSX: () => <div />
  if (
    path.node.type === 'ArrowFunctionExpression' &&
    path.node.body &&
    (path.node.body.type === 'JSXElement' || path.node.body.type === 'JSXFragment')
  ) {
    found = true;
  }

  return found;
}