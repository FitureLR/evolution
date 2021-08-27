//
import { allNativeEvents, selectionchange } from "./EventRegistry";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener";
import { batchedUpdates } from "./ReactDOMUpdateBatching";

type DispatchListener = {
  instance: null | Fiber;
  listener: Function;
  currentTarget: EventTarget;
};

type DispatchEntry = {
  event: ReactSyntheticEvent;
  listeners: Array<DispatchListener>;
};

export type DispatchQueue = Array<DispatchEntry>;

// _todo inline eventSystemFlags
export function listenToNativeEvent(
  target: Node,
  eventName: DOMEventName,
  isCapturePhase: boolean
) {
  //
  let eventSystemFlags: EventSystemFlags = 0;
  if (isCapturePhase) {
    eventSystemFlags |= IS_CAPTURE_PHASE;
  }
  addTrappedEventListener(target, eventName, isCapturePhase, eventSystemFlags);
}

// Node extends EventTarget
export function listenToAllSupportedEvents(
  rootContainerElement: Node & { ListeningMarker: boolean }
): void {
  if (rootContainerElement[ListeningMarker]) return;
  rootContainerElement[ListeningMarker] = true;
  allNativeEvents.forEach(i => i);
  const ownerDocument =
    rootContainerElement.nodeType === DOCUMENT_NODE
      ? rootContainerElement
      : rootContainerElement.ownerDocument;
  //
  ownerDocument && listenToNativeEvent(ownerDocument, selectionchange, false);
}

function addTrappedEventListener(
  target: Node,
  domEventName: DOMEventName,
  isCapturePhase: boolean,
  eventSystemFlags: EventSystemFlags
) {
  let listener = createEventListenerWrapperWithPriority(
    target,
    domEventName,
    eventSystemFlags
  );
  // to addEventListener
}

export function dispatchEventForPluginEventSystem(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetInst: Fiber | null,
  targetContainer: Node
) {
  let ancestorInst = targetInst;
  if (
    (eventSystemFlags & IS_EVENT_HANDLE_NON_MANAGED_NODE) === 0 &&
    eventSystemFlags & IS_NON_DELEGATED
  ) {
    // _todo
    // 上面的逻辑使我们必须找到事件触发节点的根Fiber HostRoot (ancestorInst必须为一个 HostRoot 或者是 null)
    batchedUpdates(() =>
      dispatchEventsForPlugins(
        domEventName,
        eventSystemFlags,
        nativeEvent,
        ancestorInst,
        targetContainer
      )
    );
  }
}

function dispatchEventsForPlugins(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetInst: null | Fiber, // rootFiber
  targetContainer: EventTarget
): void {
  const nativeEventTarget = getEventTarget(nativeEvent);
  const dispatchQueue: DispatchQueue = [];
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  );
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}
