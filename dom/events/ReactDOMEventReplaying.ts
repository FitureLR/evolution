//

type QueuedReplayableEvent = {
  blockedOn: null | Container | SuspenseInstance;
  domEventName: DOMEventName;
  eventSystemFlags: EventSystemFlags;
  nativeEvent: AnyNativeEvent;
  targetContainers: Array<EventTarget>;
};

let hasScheduledReplayAttempt = false;

// The queue of discrete events to be replayed. 要重放的离散事件队列
const queuedDiscreteEvents: Array<QueuedReplayableEvent> = [];

export const hasQueuedDiscreteEvents = () => queuedDiscreteEvents.length > 0;

const discreteReplayableEvents: Array<DOMEventName> = [
  "mousedown",
  "mouseup",
  "touchcancel",
  "touchend",
  "touchstart",
  "auxclick",
  "dblclick",
  "pointercancel",
  "pointerdown",
  "pointerup",
  "dragend",
  "dragstart",
  "drop",
  "compositionend",
  "compositionstart",
  "keydown",
  "keypress",
  "keyup",
  "input",
  "textInput", // Intentionally camelCase
  "copy",
  "cut",
  "paste",
  "click",
  "change",
  "contextmenu",
  "reset",
  "submit",
];

export function isReplayableDiscreteEvent(eventType: DOMEventName): boolean {
  return discreteReplayableEvents.indexOf(eventType) > -1;
}

export function queueDiscreteEvent(
  blockedOn: null | Container | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent
): void {
  const queuedEvent = createQueuedReplayableEvent(
    blockedOn,
    domEventName,
    eventSystemFlags,
    targetContainer,
    nativeEvent
  );
  queuedDiscreteEvents.push(queuedEvent);
  // _todo 试验性相关
}

function createQueuedReplayableEvent(
  blockedOn: null | Container | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent
): QueuedReplayableEvent {
  return {
    blockedOn,
    domEventName,
    eventSystemFlags: eventSystemFlags | IS_REPLAYED,
    nativeEvent,
    targetContainers: [targetContainer],
  };
}
