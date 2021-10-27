/**
 * React Fiber
 */

import { ConcurrentRoot } from "./ReactRootTags";
import {
  NoMode,
  ConcurrentMode,
  ProfileMode,
  StrictLegacyMode,
  StrictEffectsMode,
  ConcurrentUpdatesByDefaultMode,
} from "./ReactTypeOfMode";
import {
  enableProfilerTimer,
  enableStrictEffects,
  createRootStrictEffectsByDefault,
  enableSyncDefaultUpdates,
  allowConcurrentByDefault,
} from "../shared/ReactFeatureFlags";
import { HostRoot } from "./ReactWorkTags";
import { isDevToolsPresent } from "./ReactFiberDevToolsHook";
import { NoLane } from "./ReactFiberLane";

export function createHostRootFiber(
  tag: RootTag,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean
): Fiber {
  let mode;
  if (tag === ConcurrentRoot) {
    mode = ConcurrentMode;
    if (isStrictMode === true) {
      mode |= StrictLegacyMode;

      if (enableStrictEffects) {
        mode |= StrictEffectsMode;
      }
    } else if (enableStrictEffects && createRootStrictEffectsByDefault) {
      mode |= StrictLegacyMode | StrictEffectsMode;
    }
    if (
      // We only use this flag for our repo tests to check both behaviors.
      // TODO: Flip this flag and rename it something like "forceConcurrentByDefaultForTesting"
      !enableSyncDefaultUpdates ||
      // Only for internal experiments.
      (allowConcurrentByDefault && concurrentUpdatesByDefaultOverride)
    ) {
      mode |= ConcurrentUpdatesByDefaultMode;
    }
  } else {
    mode = NoMode;
  }

  if (enableProfilerTimer && isDevToolsPresent) {
    // Always collect profile timings when DevTools are present.
    // This enables DevTools to start capturing timing at any point–
    // Without some nodes in the tree having empty base times.
    mode |= ProfileMode;
  }

  return createFiber(HostRoot, null, null, mode);
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.
const createFiber = function (
  tag: WorkTag,
  pendingProps: Mixed,
  key: null | string,
  mode: TypeOfMode
): Fiber {
  return new FiberNode(tag, pendingProps, key, mode);
};

class FiberNode {
  public mode: TypeOfMode;
  public key: string | null;
  public tag: WorkTag;
  public pendingProps: any; // tmp
  public stateNode: any;
  public updateQueue: UpdateQueue | null;
  public memoizedState: FiberState;
  public lanes: Lanes;
  public alternate: Fiber | null;
  public return: Fiber | null;

  constructor(tag: WorkTag, pendingProps: any, key: any, mode: TypeOfMode) {
    this.mode = NoMode;
    this.tag = tag;
    this.key = key;
    this.updateQueue = null;
    this.memoizedState = null;
    this.lanes = NoLane;
    this.alternate = null;
    this.return = null;
  }
}
