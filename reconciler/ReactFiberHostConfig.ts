// inject

import { NoLane } from "./ReactFiberLane";

const noop: () => Lane = () => NoLane;
const noTimeout = 0;
const supportsHydration = true;

export { noop as getCurrentEventPriority, noTimeout, supportsHydration };
