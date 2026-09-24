import Babel from '@babel/standalone';

/**Babel is a tool that can understand
 *  JavaScript/React code. */
const parserPkg = Babel.packages.parser;
/**
 * Babel contains a parser so this means 
 * Give me Babel's parser so I can use it.
 */
const PARSE_PLUGINS = [
  'jsx',
  'classProperties',
  'objectRestSpread',
  'optionalChaining',
  'logicalAssignment',
  'topLevelAwait',
];
/**
 * 
This code uses Babel to parse JavaScript and React (JSX) code and
 convert it into an Abstract Syntax Tree (AST). It supports modern 
 JavaScript features such as optional chaining, object spread,
  nullish coalescing, and JSX. The parseCode() function takes the 
  source code as input and returns its AST, which can then be 
  inspected by other parts of the application to understand and
   analyze the code structure. If the code contains a syntax error, 
the parser throws an error instead of trying to continue.
 */
export function parseCode(code) {
  return parserPkg.parse(code, {
    sourceType: 'module',//Treat this as a JavaScript module so import React from "react" ,export default App; are valid
    plugins: PARSE_PLUGINS,//tells Babel to support the JavaScript/React features we listed earlier.
    errorRecovery: false // If the code has a syntax error, don't try to continue. Throw an error.
  });
}
/**
 * Babel takes your code and parses it. 
 * It returns an Abstract Syntax Tree (AST).
 * In simple terms, an AST is a tree-like structure that 
 * represents the code in a structured format
 */
