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