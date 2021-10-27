/**
 * inject
 * all Tmp
 */

import { NoLane } from "./ReactFiberLane";

const noop: () => Lane = () => NoLane;
const noTimeout = 0;
const supportsHydration = true;
const supportsMicrotasks = true;
const scheduleMicrotask = (callback: any) => {};

export {
  noop as getCurrentEventPriority,
  noTimeout,
  supportsHydration,
  supportsMicrotasks,
  scheduleMicrotask,
};
