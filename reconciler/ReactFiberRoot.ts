/**
 * Fiber Root
 */

import { noTimeout, supportsHydration } from "./ReactFiberHostConfig";
import { createHostRootFiber } from "./ReactFiber";
import {
  NoLane,
  NoLanes,
  NoTimestamp,
  TotalLanes,
  createLaneMap,
} from "./ReactFiberLane";
import {
  enableSuspenseCallback,
  enableCache,
  enableProfilerCommitHooks,
  enableProfilerTimer,
  enableUpdaterTracking,
} from "../shared/ReactFeatureFlags";
import { initializeUpdateQueue } from "./ReactUpdateQueue";
import { LegacyRoot, ConcurrentRoot } from "./ReactRootTags";

class FiberRootNode {
  public current: Fiber | null;
  public context: Context;
  public pendingContext: Context;
  public tag: RootTag;
  public containerInfo: HTMLElement;
  public hydrationCallbacks?: any; // tmp
  public pooledCache: any;
  public pendingLanes: Lanes;
  public suspendedLanes: Lanes;
  public pingedLanes: Lanes;
  public eventTimes: Array<EventTime>;
  public expirationTimes: Array<EventTime>;
  constructor(containerInfo: HTMLElement, tag: RootTag, hydrate: boolean) {
    this.current = null;
    this.context = null;
    this.tag = tag;
    this.containerInfo = containerInfo;
    this.hydrationCallbacks = null;
    this.pendingContext = null;
    this.pooledCache = null; // tmp
    this.pendingLanes = NoLanes;
    this.suspendedLanes = NoLanes;
    this.pingedLanes = NoLanes;
    this.eventTimes = [];
    this.expirationTimes = [];
  }

  //  constructor(containerInfo: HTMLElement, tag: RootTag, hydrate: boolean) : FiberRoot {
  //   this.tag = tag;
  //   this.containerInfo = containerInfo;
  //   this.pendingChildren = null;
  //   this.current = null;
  //   this.pingCache = null;
  //   this.finishedWork = null;
  //   this.timeoutHandle = noTimeout;
  //   this.context = null;
  //   this.pendingContext = null;
  //   this.hydrate = hydrate;
  //   this.callbackNode = null;
  //   this.callbackPriority = NoLane;
  //   this.eventTimes = createLaneMap(NoLanes);
  //   this.expirationTimes = createLaneMap(NoTimestamp);

  //   this.pendingLanes = NoLanes;
  //   this.suspendedLanes = NoLanes;
  //   this.pingedLanes = NoLanes;
  //   this.expiredLanes = NoLanes;
  //   this.mutableReadLanes = NoLanes;
  //   this.finishedLanes = NoLanes;

  //   this.entangledLanes = NoLanes;
  //   this.entanglements = createLaneMap(NoLanes);

  //   if (enableCache) {
  //     this.pooledCache = null;
  //     this.pooledCacheLanes = NoLanes;
  //   }

  //   if (supportsHydration) {
  //     this.mutableSourceEagerHydrationData = null;
  //   }

  //   if (enableSuspenseCallback) {
  //     this.hydrationCallbacks = null;
  //   }

  //   if (enableProfilerTimer && enableProfilerCommitHooks) {
  //     this.effectDuration = 0;
  //     this.passiveEffectDuration = 0;
  //   }

  //   if (enableUpdaterTracking) {
  //     this.memoizedUpdaters = new Set();
  //     const pendingUpdatersLaneMap = (this.pendingUpdatersLaneMap = []);
  //     for (let i = 0; i < TotalLanes; i++) {
  //       pendingUpdatersLaneMap.push(new Set());
  //     }
  //   }
  //   // if (__DEV__) {
  //   //   switch (tag) {
  //   //     case ConcurrentRoot:
  //   //       this._debugRootType = 'createRoot()';
  //   //       break;
  //   //     case LegacyRoot:
  //   //       this._debugRootType = 'createLegacyRoot()';
  //   //       break;
  //   //   }
  //   // }
  //  }
}

export function createFiberRoot(
  containerInfo: any,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: SuspenseHydrationCallbacks | null,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: boolean | null
): FiberRoot {
  const root: FiberRoot = new FiberRootNode(containerInfo, tag, hydrate);
  if (enableSuspenseCallback) {
    root.hydrationCallbacks = hydrationCallbacks;
  }
  // Cyclic construction. This cheats the type system right now because stateNode is any.
  const uninitializedFiber: Fiber = createHostRootFiber(
    tag,
    isStrictMode,
    concurrentUpdatesByDefaultOverride
  );
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  if (enableCache) {
    const initialCache = new Map();
    root.pooledCache = initialCache;
    const initialState = {
      element: null,
      cache: initialCache,
    };
    uninitializedFiber.memoizedState = initialState;
  } else {
    const initialState = {
      element: null,
    };
    uninitializedFiber.memoizedState = initialState;
  }
  initializeUpdateQueue(uninitializedFiber);
  return root;
}
