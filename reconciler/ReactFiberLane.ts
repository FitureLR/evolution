//
import { ConcurrentUpdatesByDefaultMode, NoMode } from "./ReactTypeOfMode";
import { allowConcurrentByDefault } from "../shared/ReactFeatureFlags";

/* Lanes */

// Lane values below should be kept in sync with getLabelForLane(), used by react-devtools-scheduling-profiler.
// If those values are changed that package should be rebuilt and redeployed.

export const TotalLanes = 31;

export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane: Lanes = /*            */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
export const DefaultLane: Lanes = /*                    */ 0b0000000000000000000000000010000;

const TransitionHydrationLane: Lane = /*                */ 0b0000000000000000000000000100000;
const TransitionLanes: Lanes = /*                       */ 0b0000000001111111111111111000000;
const TransitionLane1: Lane = /*                        */ 0b0000000000000000000000001000000;
const TransitionLane2: Lane = /*                        */ 0b0000000000000000000000010000000;
const TransitionLane3: Lane = /*                        */ 0b0000000000000000000000100000000;
const TransitionLane4: Lane = /*                        */ 0b0000000000000000000001000000000;
const TransitionLane5: Lane = /*                        */ 0b0000000000000000000010000000000;
const TransitionLane6: Lane = /*                        */ 0b0000000000000000000100000000000;
const TransitionLane7: Lane = /*                        */ 0b0000000000000000001000000000000;
const TransitionLane8: Lane = /*                        */ 0b0000000000000000010000000000000;
const TransitionLane9: Lane = /*                        */ 0b0000000000000000100000000000000;
const TransitionLane10: Lane = /*                       */ 0b0000000000000001000000000000000;
const TransitionLane11: Lane = /*                       */ 0b0000000000000010000000000000000;
const TransitionLane12: Lane = /*                       */ 0b0000000000000100000000000000000;
const TransitionLane13: Lane = /*                       */ 0b0000000000001000000000000000000;
const TransitionLane14: Lane = /*                       */ 0b0000000000010000000000000000000;
const TransitionLane15: Lane = /*                       */ 0b0000000000100000000000000000000;
const TransitionLane16: Lane = /*                       */ 0b0000000001000000000000000000000;

const RetryLanes: Lanes = /*                            */ 0b0000111110000000000000000000000;
const RetryLane1: Lane = /*                             */ 0b0000000010000000000000000000000;
const RetryLane2: Lane = /*                             */ 0b0000000100000000000000000000000;
const RetryLane3: Lane = /*                             */ 0b0000001000000000000000000000000;
const RetryLane4: Lane = /*                             */ 0b0000010000000000000000000000000;
const RetryLane5: Lane = /*                             */ 0b0000100000000000000000000000000;

export const SomeRetryLane: Lane = RetryLane1;

export const SelectiveHydrationLane: Lane = /*          */ 0b0001000000000000000000000000000;

const NonIdleLanes = /*                                 */ 0b0001111111111111111111111111111;

export const IdleHydrationLane: Lane = /*               */ 0b0010000000000000000000000000000;
export const IdleLane: Lanes = /*                       */ 0b0100000000000000000000000000000;

export const OffscreenLane: Lane = /*                   */ 0b1000000000000000000000000000000;

// EventTime
export const NoTimestamp: EventTime = -1;
let nextTransitionLane: Lane = TransitionLane1;

export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes;
}

export function pickArbitraryLane(lanes: Lanes): Lane {
  // 内联函数，取哪一个lane无所谓，getHighestPriorityLane步骤最少，所以用它
  return getHighestPriorityLane(lanes);
}

export function claimNextTransitionLane(): Lane {
  // Cycle through the lanes, assigning each new transition to the next lane. 在lanes间循环，将每个新的过渡段指定给下一个车道。
  // In most cases, this means every transition gets its own lane, until we run out of lanes and cycle back to the beginning.
  // 在大多数情况下，这意味着每个transition段都有自己的lane，直到我们用完lane并重置nextTransitionLane。
  const lane = nextTransitionLane;
  nextTransitionLane <<= 1;
  if ((nextTransitionLane & TransitionLanes) === 0) {
    nextTransitionLane = TransitionLane1;
  }
  return lane;
}

// TO_UN
export function createLaneMap<T>(initial: T): LaneMap<T> {
  // Intentionally pushing one by one.
  // https://v8.dev/blog/elements-kinds#avoid-creating-holes
  const laneMap = [];
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial);
  }
  return laneMap;
}

export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
  return a | b;
}

export function removeLanes(lanes: Lanes, subLanes: Lanes): Lanes {
  return lanes & ~subLanes;
}

// _TODO 此函数并非返回随机index，
export function pickArbitraryLaneIndex(lanes: Lanes): number {
  // 31 - 最高位为距离1, lanes为0时 31-32返回-1.
  // lanes为0是没有更新，不会走到这里
  return 31 - Math.clz32(lanes);
}

function getHighestPriorityLanes(lanes: Lanes): Lanes {
  switch (getHighestPriorityLane(lanes)) {
    case SyncLane:
      return SyncLane;
    default:
      return lanes;
  }
}

export function laneToIndex(lanes: Lanes) {
  return pickArbitraryLaneIndex(lanes);
}

export function markRootSuspended(root: FiberRoot, suspendedLanes: Lanes) {
  root.suspendedLanes |= suspendedLanes;
  root.pingedLanes &= ~suspendedLanes;
  // The suspended lanes are no longer CPU-bound. Clear their expiration times.
  const expirationTimes = root.expirationTimes;
  let lanes = suspendedLanes;
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;

    expirationTimes[index] = NoTimestamp;

    lanes &= ~lane;
  }
}

export function markStarvedLanesAsExpired(root: FiberRoot, curTime: EventTime) {
  // TODO: This gets called every time we yield. We can optimize by storing the earliest expiration time on the root.
  // Then use that to quickly bail out of this function.
  const { pendingLanes, suspendedLanes, pingedLanes, expirationTimes } = root;
  let lanes = pendingLanes;
  while (lanes) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    const expirdTime = expirationTimes[index];
    if (expirdTime === NoTimestamp) {
      // Found a pending lane with no expiration time. If it's not suspended,
      // or if it's pinged, assume it's CPU-bound. Compute a new expiration time using the current time.
      if (
        (lane & suspendedLanes) === NoLanes ||
        (lane & pingedLanes) !== NoLanes
      ) {
        expirationTimes[index] = computeExpirationTime(lane, curTime);
      }
    } else if (expirdTime <= curTime) {
      root.expiredLanes |= lane;
    }
    lanes &= ~lane;
  }
}

function computeExpirationTime(lane: Lane, currentTime: EventTime): EventTime {
  switch (lane) {
    case SyncLane:
    case InputContinuousHydrationLane:
    case InputContinuousLane:
      return currentTime + 250;
    case DefaultHydrationLane:
    case InputContinuousLane:
      return currentTime + 5000;
    default:
      return NoTimestamp;
  }
}

export function getNextLanes(root: FiberRoot, wipLanes: Lanes): Lanes {
  const { pendingLanes, suspendedLanes, pingedLanes } = root;
  if (pendingLanes === NoLanes) return NoLanes;

  // Do not work on any idle work until all the non-idle work has finished, even if the work is suspended.
  const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
  let nextWorkLanes = NoLanes;
  if (nonIdlePendingLanes !== NoLanes) {
    const nonIdleUnblockLanes = nonIdlePendingLanes & ~suspendedLanes;
    if (nonIdleUnblockLanes !== NoLanes) {
      nextWorkLanes = nonIdleUnblockLanes;
    } else {
      const nonIdlepingedLanes = nonIdlePendingLanes & pingedLanes;
      if (nonIdlepingedLanes !== NoLanes) {
        nextWorkLanes = nonIdleUnblockLanes;
      }
    }
  } else {
    const unblockLanes = pingedLanes & ~suspendedLanes;
    if (unblockLanes !== NoLanes) {
      nextWorkLanes = unblockLanes;
    } else {
      if (pingedLanes !== NoLanes) {
        nextWorkLanes = pingedLanes;
      }
    }
  }
  let nextLanes = getHighestPriorityLanes(nextWorkLanes);
  if (nextLanes === NoLanes) return NoLanes;
  // If we're already in the middle of a render, switching lanes will interrupt it and we'll lose our progress.
  // We should only do this if the new lanes are higher priority.
  if (
    wipLanes !== NoLanes &&
    wipLanes !== nextLanes &&
    // If we already suspended with a delay, then interrupting is fine. Don't bother waiting until the root is complete.
    (wipLanes & suspendedLanes) === NoLanes
  ) {
    if (
      nextLanes >= wipLanes ||
      // Default priority updates should not interrupt transition updates.
      // The only difference between default updates and transition updates is that default updates do not support refresh transitions.
      (nextLanes === DefaultLane && (wipLanes & TransitionLanes) !== NoLanes)
    ) {
      // Keep working on the existing in-progress tree. Do not interrupt.
      return wipLanes;
    }
  }
  const RootFiberMode = root.current?.mode || NoMode; // ts-ignore
  if (
    allowConcurrentByDefault &&
    (RootFiberMode & ConcurrentUpdatesByDefaultMode) !== NoMode
  ) {
    // nothing
  } else if ((nextLanes & InputContinuousLane) !== NoLane) {
    // When updates are sync by default, we entangle continuous priority updates and default updates, so they render in the same batch.
    // The only reason they use separate lanes is because continuous updates should interrupt transitions, but default updates should not.
    // 默认的同步更新中，continuous 和 default 在同一个batch中更新(entangle)，使用不同的lane仅仅是continuous可以中断transitions
    nextLanes |= pendingLanes & DefaultLane;
  }
  // Check for entangled lanes and add them to the batch.
  const { entangledLanes, entangledments } = root; // entangledLanes何时被更新
  // A lane is said to be entangled with another
  // when it's not allowed to render in a batch that does not also include the other lane.
  // 当它不允许在一个不包含它的batch中去render
  // Typically we do this when multiple updates have the same source, and we only want to respond to
  // the most recent event from that source.
  // 通常，当多个更新具有相同的源时，我们会这样做，并且我们只希望响应来自该源的最新事件。
  let nextEntangleLanes = nextLanes & entangledLanes;
  while (entangledLanes !== NoLanes) {
    const index = 1 << pickArbitraryLaneIndex(entangledLanes);
    const lane: Lane = entangledments[index];
    nextLanes |= lane;
    nextEntangleLanes &= ~lane;
  }
  return nextLanes;
}
