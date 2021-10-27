/**
 * CopyLeft
 */

const emptyContext = {};
export function getContextForSubtree(parent: ReactElment) {
  if (!parent?.context) {
    return emptyContext;
  }
  return parent.context;
}
