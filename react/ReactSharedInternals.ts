//
import ReactCurrentBatchConfig from "./ReactCurrentBatchConfig";
import ReactCurrentActQueue from "./ReactCurrentActQueue";

const ReactSharedInternals = {
  ReactCurrentBatchConfig,
  ReactCurrentActQueue,
};

export { ReactCurrentBatchConfig, ReactCurrentActQueue };

export default ReactSharedInternals;
