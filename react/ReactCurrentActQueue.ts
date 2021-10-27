//
// type RendererTask = boolean => RendererTask | null;

const ReactCurrentActQueue = {
  current: null, // Array<RendererTask>
  // Our internal tests use a custom implementation of `act` that works by
  // mocking the Scheduler package. Use this field to disable the `act` warning.
  // TODO: Maybe the warning should be disabled by default, and then turned
  // on at the testing frameworks layer? Instead of what we do now, which
  // is check if a `jest` global is defined.
  disableActWarning: false,

  // Used to reproduce behavior of `batchedUpdates` in legacy mode.
  isBatchingLegacy: false,
  didScheduleLegacyUpdate: false,
};

export default ReactCurrentActQueue;
