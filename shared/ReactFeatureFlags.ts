/**
 * Feature Flags
 */

// _TODO
export const enableSuspenseCallback = true;
export const enableCache = true;
export const enableProfilerCommitHooks = true;
export const enableProfilerTimer = true;
export const enableUpdaterTracking = true;
export const createRootStrictEffectsByDefault = true;
export const enableStrictEffects = true;
export const enableSyncDefaultUpdates = true;

export const allowConcurrentByDefault = false;

// 官方不支持在渲染阶段进行的更新。但当它们确实发生时，我们picking当前未渲染的一个lane将它们推迟到后续渲染。
// 我们对待它们的态度就像它们来自交错事件一样。迁移到新行为后，请删除此标志。
export const deferRenderPhaseUpdateToNextBatch = false;
