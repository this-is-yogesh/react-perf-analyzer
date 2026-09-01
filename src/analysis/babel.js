import Babel from '@babel/standalone';

const parserPkg = Babel.packages.parser;
const traversePkg = Babel.packages.traverse;
const typesPkg = Babel.packages.types;
const generatorPkg = Babel.packages.generator;

export const t = typesPkg;
export const traverse = traversePkg.default || traversePkg;
export const generate = (generatorPkg.default || generatorPkg).default
  ? (generatorPkg.default || generatorPkg).default
  : (generatorPkg.default || generatorPkg);

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
 * Parses source into a Babel AST. Throws a SyntaxError-like object with
 * loc info (line/column) on failure so callers can surface it in the editor.
 */
export function parseCode(code) {
  return parserPkg.parse(code, {
    sourceType: 'module',
    plugins: PARSE_PLUGINS,
    errorRecovery: false,
  });
}

export function generateCode(ast) {
  return generate(ast, { retainLines: false, compact: false }).code;
}

export function isPascalCase(name) {
  return typeof name === 'string' && /^[A-Z][A-Za-z0-9]*$/.test(name);
}

/** Does this function's body return JSX anywhere (shallow scan, not crossing nested functions)? */
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
      // don't descend into nested function bodies (their own JSX doesn't count
      // toward the outer function being a component), except allow arrow's own body
      if (inner.node !== path.node) {
        inner.skip();
      }
    },
  });
  // also handle arrow functions with an implicit JSX expression body
  if (
    path.node.type === 'ArrowFunctionExpression' &&
    path.node.body &&
    (path.node.body.type === 'JSXElement' || path.node.body.type === 'JSXFragment')
  ) {
    found = true;
  }
  return found;
}

const HOOK_CALLBACK_NAMES = new Set(['useMemo', 'useCallback', 'useEffect', 'useLayoutEffect']);

/** Walk up from a path to see whether it sits inside one of the given hook callbacks
 *  before reaching a component function boundary. */
export function isInsideHookCallback(path, hookNames = HOOK_CALLBACK_NAMES) {
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
      if (calleeName && hookNames.has(calleeName)) {
        return true;
      }
    }
    if (
      current.isFunctionDeclaration() ||
      (current.isVariableDeclarator() === false &&
        (current.isFunctionExpression() || current.isArrowFunctionExpression()) &&
        isLikelyComponentPath(current))
    ) {
      // reached a component boundary without finding a hook callback wrapper
      return false;
    }
    current = current.parentPath;
  }
  return false;
}

export function isLikelyComponentPath(path) {
  const node = path.node;
  if (node.type === 'FunctionDeclaration') {
    return node.id && isPascalCase(node.id.name) && returnsJSX(path);
  }
  if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    const parent = path.parentPath;
    if (parent && parent.isVariableDeclarator() && parent.node.id.type === 'Identifier') {
      return isPascalCase(parent.node.id.name) && returnsJSX(path);
    }
    if (parent && parent.isCallExpression()) {
      // e.g. memo(props => ...)
      const grandParent = parent.parentPath;
      if (grandParent && grandParent.isVariableDeclarator() && grandParent.node.id.type === 'Identifier') {
        return isPascalCase(grandParent.node.id.name) && returnsJSX(path);
      }
    }
  }
  return false;
}
