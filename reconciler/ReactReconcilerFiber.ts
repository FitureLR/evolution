/**
 * CopyLeft
 */

import { requestEventTime, requestUpdateLane } from "./ReactFiberWorkLoop";
import { getContextForSubtree } from "./ReactFiberContext";
import { createUpdate, enqueueUpdate } from "./ReactUpdateQueue";
import { createFiberRoot } from "./ReactFiberRoot";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

export function createContainer(
  containerInfo: Container,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: SuspenseHydrationCallbacks | null,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: boolean | null
): FiberRoot {
  return createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride
  );
}

export function updateContainer(
  children: ReactNodeList,
  fiberRoot: FiberRoot,
  parentComponent: ReactElment | null,
  callback?: () => void
) {
  const current = fiberRoot.current!;
  const taskTime = requestEventTime();
  const lane = requestUpdateLane(current!);
  const parentContext = getContextForSubtree(parentComponent!);
  if (fiberRoot.context == null) {
    fiberRoot.context = parentContext;
  } else {
    fiberRoot.pendingContext = parentContext;
  }
  const update: Update = createUpdate(taskTime, lane);
  update.payload = { element: children };
  // Wran: !function
  if (typeof callback === "function") update.callback = callback;
  // Wran: Rendering
  enqueueUpdate(current, update, lane);
  const root = scheduleUpdateOnFiber(current, lane, taskTime);
  // if (root !== null) {
  //   entangleTransitions(root, current, lane);
  // }
  return lane;
}
