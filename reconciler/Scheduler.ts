//

import * as Scheduler from "../scheduler";

declare const scheduleCallback = Scheduler.unstable_scheduleCallback;
declare const cancelCallback = Scheduler.unstable_cancelCallback;
declare const shouldYield = Scheduler.unstable_shouldYield;
declare const requestPaint = Scheduler.unstable_requestPaint;
declare const now = Scheduler.unstable_now;
declare const getCurrentPriorityLevel =
  Scheduler.unstable_getCurrentPriorityLevel;
declare const ImmediateSchedulerPriority = Scheduler.unstable_ImmediatePriority;
declare const UserBlockingSchedulerPriority =
  Scheduler.unstable_UserBlockingPriority;
declare const NormalSchedulerPriority = Scheduler.unstable_NormalPriority;
declare const LowSchedulerPriority = Scheduler.unstable_LowPriority;
declare const IdleSchedulerPriority = Scheduler.unstable_IdlePriority;
declare type SchedulerCallback = (isSync: boolean) => SchedulerCallback | null;
