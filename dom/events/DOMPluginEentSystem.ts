//
import { allNativeEvents, selectionchange } from "./EventRegistry";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener";

// _todo inline eventSystemFlags
export function listenToNativeEvent(
  target: Node,
  eventName: EventName,
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
  domEventName: EventName,
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
