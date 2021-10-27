/**
 * Legacy Root
 */

import { updateContainer } from "../../reconciler/ReactReconcilerFiber";
import { LegacyRoot } from "../../reconciler/ReactRootTags";
import { createContainer } from "../../reconciler/ReactReconcilerFiber";
import { markContainerAsRoot } from "../client/ReactDOMComponentTree";
import { listenToAllSupportedEvents } from "../events/DOMPluginEventSystem";

function legacyRenderSubtreeIntoContainer(
  parentComponent: ReactElment | null,
  children: ReactNodeList,
  container: Container,
  forceHydrate?: boolean,
  callback?: () => void
) {
  let root = container._reactRootContainer;
  let fiberRoot;
  if (!root) {
    // two line, pretties uglify
    fiberRoot = root = legacyCreateRootFromDOMContainer(container, false);
    container._reactRootContainer = root;
    if (typeof callback === "function") {
      const originalCallback = callback;
      callback = () => {
        // const instance = getPublicRootInstance(fiberRoot);
        originalCallback.call(null /*instance*/); // null => instance
      };
    }
    // sync update
    updateContainer(children, fiberRoot, parentComponent, callback);
  } else {
    fiberRoot = root;
    // machining callback
    updateContainer(children, fiberRoot, parentComponent, callback);
  }
  // return getPublicRootInstance(fiberRoot);
}

function legacyCreateRootFromDOMContainer(
  container: Container,
  forceHydrate: boolean
): FiberRoot {
  if (!forceHydrate) {
    let rootSibling;
    while ((rootSibling = container.lastChild)) {
      container.removeChild(rootSibling);
    }
  }
  const root: FiberRoot = createContainer(
    container,
    LegacyRoot,
    forceHydrate,
    null, // hydrationCallbacks
    false, // isStrictMode
    false // concurrentUpdatesByDefaultOverride,
  );
  markContainerAsRoot(root.current!, container);
  const rootContainerElement =
    container.nodeType === COMMENT_NODE ? container.parentNode : container;
  listenToAllSupportedEvents(rootContainerElement as any); // tmp
  return root;
}

export function render(
  element: ReactElment,
  container: Container,
  callback?: () => void
) {
  return legacyRenderSubtreeIntoContainer(
    null,
    element,
    container,
    false,
    callback
  );
}
