/**
 * .
 */

import {
  NoTimestamp,
  NoLanes,
  pickArbitraryLane,
  NoLane,
} from "./ReactFiberLane";
import { ConcurrentMode, NoMode } from "./ReactTypeOfMode";
import {
  SyncLane,
  claimNextTransitionLane,
  IdleLane,
  mergeLanes,
  removeLanes,
  laneToIndex,
  markRootSuspended as markRootSuspended_dontCallThisOneDirectly,
  markStarvedLanesAsExpired,
  getNextLanes,
  getHighestPriorityLane,
} from "./ReactFiberLane";
import { requestCurrentTransition, NoTransition } from "./ReactFiberTransition";
import {
  getCurrentUpdatePriority,
  lanesToEventPriority,
} from "./ReactEventPriorities";
import {
  getCurrentEventPriority,
  supportsMicrotasks,
  scheduleMicrotask,
} from "./ReactFiberHostConfig";
import { HostRoot } from "./ReactWorkTags";
import {
  scheduleLegacySyncCallback,
  scheduleSyncCallback,
  flushSyncCallbacks,
} from "./ReactFiberSyncTaskQueue";
import {
  scheduleCallback,
  ImmediatePriority,
  NormalPriority,
  LowSchedulerPriority,
} from "./Scheduler";
import {
  DiscreteEventPriority,
  DefaultEventPriority,
} from "./ReactEventPriorities";

import { ReactCurrentActQueue } from "../react/ReactSharedInternals";
import {
  deferRenderPhaseUpdateToNextBatch,
  enableUpdaterTracking,
} from "../shared/ReactFeatureFlags";
import { isDevToolsPresent } from "./ReactFiberDevToolsHook";
import { LegacyRoot } from "./ReactRootTags";

// some ExecutionContext
export const NoContext: ExecutionContext = 0b0000;
const BatchedContext = /*               */ 0b0001;
const RenderContext = /*                */ 0b0010;
const CommitContext = /*                */ 0b0100;
export const RetryAfterError = /*       */ 0b1000;

// RootExitStatus
const RootIncomplete: RootExitStatus = 0;
const RootFatalErrored = 1;
const RootErrored = 2;
const RootSuspended = 3;
const RootSuspendedWithDelay = 4;
const RootCompleted = 5;

// Describes where we are in the React execution stack
let executionContext: ExecutionContext = NoContext;

// If two updates are scheduled within the same event, we should treat their event times as simultaneous,
// even if the actual clock time has advanced between the first and second call.
// ??????????????????????????????????????????????????????event time???????????????
let currentEventTime: number = NoTimestamp;
let currentEventTransitionLane: Lanes = NoLanes;
// The lanes we're rendering ?????????????????????lanes
let WIPRootRenderLanes = NoLanes; // workInProgressRootRenderLanes

let WIPRoot: FiberRoot | null = null; // workInProgressRoot
// The fiber we're working on
let workInProgress: Fiber | null = null;

// Stack that allows components to change the render lanes for its subtree
// This is a superset of the lanes we started working on at the root. The only
// case where it's different from `WIPRootRenderLanes` is when we
// enter a subtree that is hidden and needs to be unhidden: Suspense and
// Offscreen component.
//
// Most things in the work loop should deal with WIPRootRenderLanes. work????????????????????????
// Most things in begin/complete phases should deal with subtreeRenderLanes.
export let subtreeRenderLanes: Lanes = NoLanes;
// const subtreeRenderLanesCursor: StackCursor<Lanes> = createCursor(NoLanes);
// Whether to root completed, errored, suspended, etc.
let workInProgressRootExitStatus: RootExitStatus = RootIncomplete;
// A fatal error, if one is thrown
let workInProgressRootFatalError: Mixed = null;
// "Included" lanes refer to lanes that were worked on during this render. It's
// slightly different than `renderLanes` because `renderLanes` can change as you
// enter and exit an Offscreen tree. This value is the combination of all render
// lanes for the entire render phase.
let workInProgressRootIncludedLanes: Lanes = NoLanes;
// The work left over by components that were visited during this render. Only
// includes unprocessed updates, not work in bailed out children.
let workInProgressRootSkippedLanes: Lanes = NoLanes;
// Lanes that were updated (in an interleaved event) during this render. ???????????????????????????lanes
let WIPRootUpdateLanes: Lanes = NoLanes; // workInProgressRootUpdatedLanes
// Lanes that were pinged (in an interleaved event) during this render.
let WIPRootPingedLanes: Lanes = NoLanes; // workInProgressRootPingedLanes
// The most recent time we committed a fallback. This lets us ensure a train
// model where we don't commit new loading states in too quick succession.
let globalMostRecentFallbackTime: number = 0;
const FALLBACK_THROTTLE_MS: number = 500;
// The absolute time for when we should start giving up on rendering
// more and prefer CPU suspense heuristics instead.
let workInProgressRootRenderTargetTime: number = Infinity;
// How long a render is supposed to take before we start following CPU
// suspense heuristics and opt out of rendering more content.
const RENDER_TIMEOUT_MS = 500;

function now(): EventTime {
  return performance.now(); // tmp
}

/* TO_UN currentEventTime?????????????????? */
export function requestEventTime(): EventTime {
  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    return now();
  }
  if (currentEventTime !== NoTimestamp) {
    return currentEventTime;
  }
  return (currentEventTime = now());
}

/* TO_UN */
export function requestUpdateLane(current: Fiber): Lane {
  const mode = current.mode;
  if ((mode & ConcurrentMode) === NoMode) {
    return SyncLane;
  }
  if (
    !deferRenderPhaseUpdateToNextBatch &&
    (executionContext & RenderContext) !== NoContext &&
    WIPRootRenderLanes !== NoLanes
  ) {
    // ????????????????????????????????????????????????????????????????????????lane?????????????????????????????????????????????????????????????????????setState?????????????????????
    // ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
    // ??????????????????????????????????????????????????????????????????setState?????????????????????????????????????????????????????????????????????????????????
    return pickArbitraryLane(WIPRootRenderLanes); // ??????????????????lanes??????????????????????????????
  }
  const isTransition = requestCurrentTransition() !== NoTransition;
  if (isTransition) {
    // The algorithm for assigning an update to a lane should be stable for all
    // updates at the same priority within the same event. To do this, the
    // inputs to the algorithm must be the same.
    // ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
    // The trick we use is to cache the first of each of these inputs within an
    // event. Then reset the cached values once we can be sure the event is
    // over. Our heuristic for that is whenever we enter a concurrent work loop.
    // ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
    if (currentEventTransitionLane === NoLane) {
      // All transitions within the same event are assigned the same lane. ????????????????????????transitions?????????????????????lane
      currentEventTransitionLane = claimNextTransitionLane();
    }
    return currentEventTransitionLane;
  }
  // Updates originating inside certain React methods, like flushSync,
  // have their priority set by tracking it with a context variable.
  // ????????????React????????????flushSync??????????????????????????????????????????????????????????????????
  // The opaque type returned by the host config is internally a lane, so we can use that directly.
  // Move this type conversion to the event priority module.
  const updateLane: Lane = getCurrentUpdatePriority(); // TIP: ??????????????????????????????????????? currentUpdatePriority
  if (updateLane !== NoLane) {
    return updateLane; // UN_VE ???????????????????????????, ?????????????????????Nolane.??????????????????????????????????????? currentUpdatePriority
  }
  // This update originated outside React. Ask the host environment for an appropriate priority, based on the type of event.
  // ???????????????React????????????????????????????????????????????????????????????????????????
  const eventLane: Lane = getCurrentEventPriority();
  return eventLane;
}

export function isInterleavedUpdate(fiber: Fiber, lane: Lane): boolean {
  return (
    WIPRoot !== null &&
    fiber.mode === ConcurrentMode &&
    (deferRenderPhaseUpdateToNextBatch ||
      (executionContext & RenderContext) === NoContext)
  );
}

export function scheduleUpdateOnFiber(
  fiber: Fiber,
  lane: Lane,
  taskTime: EventTime
): FiberRoot | null {
  // checkForNestedUpdates
  // checkIsRendering
  const root = markUpdateLaneFromFiberToRoot(fiber, lane);
  if (root == null) return null;
  if (enableUpdaterTracking) {
    if (isDevToolsPresent) {
      // addFiberToLanesMap(root, fiber, lane);
    }
  }
  // Mark that the root has a pending update.
  markRootUpdated(root, lane, taskTime);
  // if (enableProfilerTimer && enableProfilerNestedUpdateScheduledHook) {}
  if (WIPRoot) {
    // deferRenderPhaseUpdateToNextBatch || (executionContext & RenderContext) === NoContext
    if (isInterleavedUpdate(fiber, lane)) {
      WIPRootUpdateLanes = mergeLanes(WIPRootUpdateLanes, lane);
    }
    if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
      // The root already suspended with a delay, which means this render
      // definitely won't finish. Since we have a new update, let's mark it as
      // suspended now, right before marking the incoming update. This has the
      // effect of interrupting the current render and switching to the update.
      // ??????(????????????)?????????????????????????????????????????????????????????(??????????????????)?????????????????????Suspended???????????????????????????????????????????????????????????????
      // TODO: Make sure this doesn't override pings that happen while we've
      // already started rendering. ????????????????????????????????????????????????????????? ping???
      markRootSuspended(root, WIPRootRenderLanes);
    }
  }
  ensureRootIsScheduled(root, taskTime);
  if (
    lane === SyncLane &&
    executionContext === NoContext &&
    (fiber.mode & ConcurrentMode) === NoMode &&
    // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
    !(/*__DEV__ && */ ReactCurrentActQueue.isBatchingLegacy)
  ) {
    // Flush the synchronous work now, unless we're already working or inside a batch.
    // This is intentionally inside scheduleUpdateOnFiber instead of scheduleCallbackForFiber
    // to preserve the ability to schedule a callback without immediately flushing it.
    // ?????????????????????????????????????????????????????????????????????
    // We only do this for user-initiated updates, to preserve historical behavior of legacy mode.
    // resetRenderTimer();
    // flushSyncCallbacksOnlyInLegacyMode();
  }

  return root;
}

// This is split into a separate function so we can mark a fiber with pending work without treating it as a typical update that originates from an event;
// ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// e.g. retrying a Suspense boundary isn't an update, but it does schedule work on a fiber.
// e.g. retrying ?????????????????????????????????????????????????????????????????????
function markUpdateLaneFromFiberToRoot(
  sourceFiber: Fiber,
  lane: Lane
): FiberRoot | null {
  // inline, ??????????????????
  const root = markUpdateLanes(sourceFiber, lane);
  // ????????????fiber????????????alternate. alternate???????????????????????????????????????????????????????????????
  // markUpdateLanes(sourceFiber.alternate!, lane);
  return root;
}

function markUpdateLanes(fiber: Fiber, lane: Lane): FiberRoot | null {
  if (!fiber) return null; // null or undefined
  if (fiber.tag === HostRoot) return fiber.stateNode; // root
  fiber.lanes = mergeLanes(fiber.lanes, lane);
  const alternate = fiber.alternate;
  // warnAboutUpdateOnNotYetMountedFiberInDEV(fiber)
  if (alternate) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
    // warnAboutUpdateOnNotYetMountedFiberInDEV(alternate)
  }
  return markUpdateLanes(fiber.return!, lane); // lane????????? fiber.lanes ????
}

export function markRootUpdated(
  root: FiberRoot,
  updateLane: Lane,
  eventTime: number
) {
  root.pendingLanes |= updateLane;
  // If there are any suspended transitions, it's possible this new update could unblock them.
  // Clear the suspended lanes so that we can try rendering them again.
  //
  // TODO: We really only need to unsuspend only lanes that are in the
  // `subtreeLanes` of the updated fiber, or the update lanes of the return
  // path. This would exclude suspended updates in an unrelated sibling tree,
  // since there's no way for this update to unblock it.
  // ??????fiber?????????????????????unlock??????????????????????????????????????? suspend
  //
  // We don't do this if the incoming update is idle, because we never process
  // idle updates until after all the regular updates have finished; there's no
  // way it could unblock a transition.
  // ????????????????????????????????????idle???idle????????????transition
  if (updateLane !== IdleLane) {
    root.suspendedLanes = NoLanes;
    root.pingedLanes = NoLanes;
  }

  const eventTimes = root.eventTimes;
  const index = laneToIndex(updateLane);
  // We can always overwrite an existing timestamp because we prefer the most recent event,
  // and we assume time is monotonically increasing.
  eventTimes[index] = eventTime;
}

function markRootSuspended(root: FiberRoot, suspendedLanes: Lanes) {
  // When suspending, we should always exclude lanes that were pinged or (more rarely, since we try to avoid it) updated during the render phase.
  // ??????????????????pinged??????render?????????lanes(???????????????lane??????????????????????????????lanes)
  suspendedLanes = removeLanes(suspendedLanes, WIPRootPingedLanes);
  suspendedLanes = removeLanes(suspendedLanes, WIPRootUpdateLanes);
  markRootSuspended_dontCallThisOneDirectly(root, suspendedLanes);
}

// _TODO
function fakeActCallbackNode() {}

function ensureRootIsScheduled(root: FiberRoot, taskTime: EventTime) {
  const existingCallbackNode = root.callbackNode;
  markStarvedLanesAsExpired(root, taskTime);
  // Determine the next lanes to work on, and their priority.
  const nextLanes = getNextLanes(
    root,
    root === WIPRoot ? WIPRootRenderLanes : NoLanes
  );
  if (nextLanes === NoLanes) {
    // Special case: There's nothing to work on.
    if (existingCallbackNode !== null) {
      // cancelCallback(existingCallbackNode);
    }
    root.callbackNode = null;
    root.callbackPriority = NoLane;
  }
  // We use the highest priority lane to represent the priority of the callback.
  const newCallbackPriority = getHighestPriorityLane(nextLanes);
  // Check if there's an existing task. We may be able to reuse it.
  const existingCallbackPriority = root.callbackPriority;
  if (
    newCallbackPriority === existingCallbackPriority &&
    !(
      ReactCurrentActQueue.current !== null &&
      existingCallbackNode !== fakeActCallbackNode
    )
  ) {
    // The priority hasn't changed. We can reuse the existing task. Exit.
    return;
  }
  if (existingCallbackNode != null) {
    // Cancel the existing callback. We'll schedule a new one below.
    // cancelCallback(existingCallbackNode);
  }
  // Schedule a new callback.
  let newCallbackNode = null;
  if (newCallbackPriority === SyncLane) {
    if (root.tag === LegacyRoot) {
      if (ReactCurrentActQueue.isBatchingLegacy !== null) {
        ReactCurrentActQueue.didScheduleLegacyUpdate = true;
      }
      scheduleLegacySyncCallback(performSyncWorkOnRoot.bind(null, root));
    } else {
      scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    }
    if (supportsMicrotasks) {
      if (ReactCurrentActQueue.current !== null) {
        ReactCurrentActQueue.current.push(flushSyncCallbacks);
      }
      scheduleMicrotask(flushSyncCallbacks);
    } else {
      scheduleCallback(ImmediatePriority, flushSyncCallbacks);
    }
    newCallbackNode = null;
  } else {
    let schedulerPriorityLevel;
    // TaskLanes => EventPriority => SchedulerPriority
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediatePriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalPriority;
        break;
      default:
        schedulerPriorityLevel = NormalPriority;
    }
    newCallbackNode = scheduleCallback(
      schedulerPriorityLevel
      // performConcurrentWorkOnRoot.bind(null, root)
    );
  }
  root.callbackNode = newCallbackNode;
  root.callbackPriority = newCallbackPriority; // TaskLane
}

// This is the entry point for synchronous tasks that don't go through Scheduler
function performSyncWorkOnRoot(root: FiberRoot): SchedulerCallback {
  //
  return null;
}
