/**
 * React types
 */

type ReactElmentProperty = {
  __typeof: string | symbol | number;
  context: any;
};
// temporary
type ReactElment = ReactElmentProperty;
type ReactNodeList = ReactElment | Array<ReactElment>;

// temporary
type Mixed = any;

// ReactSharedInternals
type Transition = number;
type ReactCurrentBatchConfig = {
  transition: Transition;
};
