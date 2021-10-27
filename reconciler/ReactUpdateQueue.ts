/**
 * C
 */
import { isInterleavedUpdate } from "./ReactFiberWorkLoop";
import { pushInterleavedQueue } from "./ReactFiberInterleavedUpdates";
import { NoLanes } from "./ReactFiberLane";

export const UpdateState: State = 0;
export const ReplaceState: State = 1;
export const ForceUpdate: State = 2;
export const CaptureUpdate: State = 3;

export function createUpdate(eventTime: EventTime, lane: Lane) {
  const update: Update = {
    eventTime,
    lane,

    tag: UpdateState,
    next: null,
    payload: null,
    callback: null,
  };
  return update;
}

export function enqueueUpdate(fiber: Fiber, update: Update, lane: Lane) {
  const updateQueue = fiber.updateQueue;
  if (updateQueue === null) return null; // has been mounted.
  const shared = updateQueue.shared;
  if (isInterleavedUpdate(fiber, lane)) {
    const interleaved = shared.interleaved;
    if (interleaved === null) {
      update.next = update; // circular list
      // At the end of the current render, this queue's interleaved updates will be transferred to the pending queue.
      pushInterleavedQueue(shared);
    } else {
      update.next = interleaved.next;
      interleaved.next = update;
    }
    shared.interleaved = update;
  } else {
    const pending = shared.pending;
    if (pending === null) {
      update.next = update; // This is the first update. Create a circular list.
    } else {
      update.next = pending.next;
      pending.next = update;
    }
    shared.pending = update;
  }
}

export function initializeUpdateQueue<State>(fiber: Fiber): void {
  const queue: UpdateQueue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null,
      interleaved: null,
      lanes: NoLanes,
    },
    effects: null,
  };
  fiber.updateQueue = queue;
}
