/**
 * Interleaved updates
 */

// _INFO 此处改为空数组.
let interleavedQueues: Array<UpdateQueue | Shared> = [];

export function pushInterleavedQueue(queue: UpdateQueue | Shared) {
  interleavedQueues.push(queue);
}
