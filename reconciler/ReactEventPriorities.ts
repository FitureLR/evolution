//
import {
  NoLane,
  SyncLane,
  InputContinuousLane,
  DefaultLane,
  IdleLane,
} from "./ReactFiberLane";

export const DiscreteEventPriority = SyncLane; // EventPriority
export const ContinuousEventPriority = InputContinuousLane;
export const DefaultEventPriority = DefaultLane;
export const IdleEventPriority = IdleLane;

let currentUpdatePriority: EventPriority = NoLane;
export function getCurrentUpdatePriority(): EventPriority {
  return currentUpdatePriority;
}

export function setCurrentUpdatePriority(newPriority: EventPriority) {
  currentUpdatePriority = newPriority;
}

export function lanesToEventPriority(taskLanes: Lanes): EventPriority {
  return IdleEventPriority;
}
