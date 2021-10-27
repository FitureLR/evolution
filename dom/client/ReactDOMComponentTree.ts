/**
 * Component
 */

const randomKey = Math.random().toString(36).slice(2);
// 去掉了下面所有key的randomKey
const internalInstanceKey = "__reactFiber";
const internalPropsKey = "__reactProps";
const internalContainerInstanceKey = "__reactContainer";
const internalEventHandlersKey = "__reactEvents";
const internalEventHandlerListenersKey = "__reactListeners";
const internalEventHandlesSetKey = "__reactHandles";

export function markContainerAsRoot(hostRoot: Fiber, node: Container): void {
  node[internalContainerInstanceKey] = hostRoot;
}
