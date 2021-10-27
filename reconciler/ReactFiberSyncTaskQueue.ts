/**
 * Sync
 */

import {
  DiscreteEventPriority,
  getCurrentUpdatePriority,
  setCurrentUpdatePriority,
} from "./ReactEventPriorities";
import { ImmediatePriority, scheduleCallback } from "./Scheduler";

let syncQueue: Array<SchedulerCallback> = []; // _INFO !null
let includesLegacySyncCallbacks: boolean = false;
let isFlushingSyncQueue: boolean = false;

export function scheduleSyncCallback(callback: SchedulerCallback) {
  syncQueue.push(callback);
}

export function scheduleLegacySyncCallback(callback: SchedulerCallback) {
  includesLegacySyncCallbacks = true;
  scheduleSyncCallback(callback);
}

export function flushSyncCallbacks(): null {
  return null;
}
