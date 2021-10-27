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
// 同一事件安排了两次更新，我们视他们的event time为同一时间
let currentEventTime: number = NoTimestamp;
let currentEventTransitionLane: Lanes = NoLanes;
// The lanes we're rendering 我们正在更新的lanes
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
// Most things in the work loop should deal with WIPRootRenderLanes. work循环中大多数处理
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
// Lanes that were updated (in an interleaved event) during this render. 交叉更新中已更新的lanes
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

/* TO_UN currentEventTime对更新的影响 */
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
    // 旧的行为是为其提供与当前渲染的内容相同的“线程”lane。因此，如果对稍后在同一渲染中发生的组件调用“setState”，它将刷新。
    // 理想情况下，我们希望删除特殊情况，并将其视为来自交错事件。无论如何，官方并不支持这种模式。
    // 这种行为只是一种倒退。该标志仅在我们可以推出setState警告之前存在，因为现有代码可能会意外地依赖于当前行为。
    return pickArbitraryLane(WIPRootRenderLanes); // 因此返回当前lanes最低位，它将一同更新
  }
  const isTransition = requestCurrentTransition() !== NoTransition;
  if (isTransition) {
    // The algorithm for assigning an update to a lane should be stable for all
    // updates at the same priority within the same event. To do this, the
    // inputs to the algorithm must be the same.
    // 对于同一事件中具有相同优先级的所有更新，为车道分配更新的算法应该是稳定的。为此，算法的输入必须相同。
    // The trick we use is to cache the first of each of these inputs within an
    // event. Then reset the cached values once we can be sure the event is
    // over. Our heuristic for that is whenever we enter a concurrent work loop.
    // 我们使用的技巧是在事件中缓存这些输入中的第一个。然后在我们确定事件结束后重置缓存值。我们的启发式方法是每当我们进入一个并发工作循环时。
    if (currentEventTransitionLane === NoLane) {
      // All transitions within the same event are assigned the same lane. 同一事件中的所有transitions都指定了相同的lane
      currentEventTransitionLane = claimNextTransitionLane();
    }
    return currentEventTransitionLane;
  }
  // Updates originating inside certain React methods, like flushSync,
  // have their priority set by tracking it with a context variable.
  // 源自某些React方法（如flushSync）的更新通过使用上下文变量跟踪来设置优先级。
  // The opaque type returned by the host config is internally a lane, so we can use that directly.
  // Move this type conversion to the event priority module.
  const updateLane: Lane = getCurrentUpdatePriority(); // TIP: 设置时机及正常更新是否设置 currentUpdatePriority
  if (updateLane !== NoLane) {
    return updateLane; // UN_VE 如果正常更新设置它, 那么这里不会是Nolane.因此正常更新是不是不会影响 currentUpdatePriority
  }
  // This update originated outside React. Ask the host environment for an appropriate priority, based on the type of event.
  // 此更新源于React外部。根据事件类型，向主机环境询问适当的优先级。
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
      // 当前(上一次的)的更新被暂停，因此它未完成，在新的更新(这里接受到的)到来将它设置为Suspended，这具有中断当前更新，切换到新的更新的效果
      // TODO: Make sure this doesn't override pings that happen while we've
      // already started rendering. 确保这不会覆盖我们已经开始渲染时发生的 ping。
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
    // 以保留在不立即刷新回调的情况下调度回调的能力。
    // We only do this for user-initiated updates, to preserve historical behavior of legacy mode.
    // resetRenderTimer();
    // flushSyncCallbacksOnlyInLegacyMode();
  }

  return root;
}

// This is split into a separate function so we can mark a fiber with pending work without treating it as a typical update that originates from an event;
// 这被拆分为一个单独的函数，这样可以标记我们未做的工作，而不必将其视为源于事件的典型更新；
// e.g. retrying a Suspense boundary isn't an update, but it does schedule work on a fiber.
// e.g. retrying 悬念边界不是更新，但它确实安排了光纤上的工作。
function markUpdateLaneFromFiberToRoot(
  sourceFiber: Fiber,
  lane: Lane
): FiberRoot | null {
  // inline, 便于后续修改
  const root = markUpdateLanes(sourceFiber, lane);
  // 更新当前fiber路径上的alternate. alternate路径向上是否需要或者是否是和之前路径重叠？
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
  return markUpdateLanes(fiber.return!, lane); // lane可以是 fiber.lanes 吗?
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
  // 当前fiber的更新，只需要unlock子组件或者路径上的父组件的 suspend
  //
  // We don't do this if the incoming update is idle, because we never process
  // idle updates until after all the regular updates have finished; there's no
  // way it could unblock a transition.
  // 所有常规的更新完成才处理idle，idle无法转换transition
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
  // 始终排除我们pinged或者render阶段的lanes(这是上次的lane，交叉更新中已更新的lanes)
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
