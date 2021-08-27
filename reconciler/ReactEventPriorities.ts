//

type EventPriority = Lane;

declare const DiscreteEventPriority = SyncLane; // EventPriority
declare const ContinuousEventPriority = InputContinuousLane;
declare const DefaultEventPriority = DefaultLane;
declare const IdleEventPriority = IdleLane;
