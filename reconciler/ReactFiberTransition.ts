//
import ReactSharedInternals from "../shared/ReactSharedInternals";

const { ReactCurrentBatchConfig } = ReactSharedInternals;

export const NoTransition: Transition = 0;

export function requestCurrentTransition(): Transition {
  return ReactCurrentBatchConfig.transition;
}
