/**
 * Reconciler types
 */

// Mode types
type TypeOfMode = number;

// work loop
type EventTime = number;

// about executionContext
type ExecutionContext = number;
type RootExitStatus = 0 | 1 | 2 | 3 | 4 | 5;

// lane
type Lane = number;
type Lanes = Lane;
type LaneMap<T> = Array<T>;

// declare namespace FiberRoot {}

type Context = Object | null;
// 方便hover
type FiberRoot = {
  tag: RootTag;
  current: Fiber | null; // mount root element
  context: Context;
  pendingContext: Context;
  pendingLanes: Lanes;
  suspendedLanes: Lanes;
  pingedLanes: Lanes;
  eventTimes: Array<EventTime>;
  expirationTimes: Array<EventTime>;

  hydrationCallbacks?: any; // tmp
  pooledCache: Map<any, any>; // tmp
};

interface FiberRootNode {
  current: Fiber | null; // mount root element
  context: Context;
  pendingContext: Context;

  hydrationCallbacks?: any; // tmp
}

type FiberState = any; // _INFO tmp
// 方便hover查看属性
type Fiber = {
  tag: WorkTag; // component type
  mode: TypeOfMode;
  stateNode: any; // HTMLElement | FiberRoot
  updateQueue: UpdateQueue | null; // add null
  lanes: Lanes;
  alternate: Fiber | null;
  return: Fiber | null;

  memoizedState: FiberState;
};

type RootFiber = Fiber;

/* Update */
type State = 0 | 1 | 2 | 3; // state for update unit
type Update = {
  eventTime: EventTime;
  lane: Lane;

  tag: State;
  payload: any;
  callback: (() => Mixed) | null;

  next: Update | null;
};

// _INFO interleave 中便于区分 type ClassQueue = Shared
type Shared = {
  pending: Update | null;
  interleaved: Update | null;
  lanes: Lanes;
};
// _INFO type HookQueue = UpdateQueue
type UpdateQueue = {
  shared: Shared; // shared 始终不会是null吗？
  baseState: FiberState;
  firstBaseUpdate: Update | null;
  lastBaseUpdate: Update | null;
  effects: Array<Update> | null;
};

//
type EventPriority = Lane;

// RootTags
type RootTag = 0 | 1;

// other
type SuspenseHydrationCallbacks = {
  onHydrated?: (suspenseInstance: SuspenseInstance) => void;
  onDeleted?: (suspenseInstance: SuspenseInstance) => void;
};

//

//

// Work Tags
type WorkTag =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24;
