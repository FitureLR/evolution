//
import {
  hasQueuedDiscreteEvents,
  isReplayableDiscreteEvent,
  queueDiscreteEvent,
} from "./ReactDOMEventReplaying";
import { dispatchEventForPluginEventSystem } from "./DOMPluginEventSystem";

export function createEventListenerWrapperWithPriority(
  targetContainer: Node,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags
): Function {
  const eventPriority = getEventPriority(domEventName);
  let listenerWrapper;
  switch (eventPriority) {
    case DiscreteEventPriority:
      listenerWrapper = dispatchDiscreteEvent;
      break;
    case ContinuousEventPriority:
      listenerWrapper = dispatchContinuousEvent;
      break;
    case DefaultEventPriority:
    default:
      listenerWrapper = dispatchEvent;
      break;
  }
  return listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer
  );
}

export function dispatchEvent(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: Node,
  nativeEvent: AnyNativeEvent
) {
  const isAllowReplay = (eventSystemFlags & IS_CAPTURE_PHASE) === 0;
  if (
    isAllowReplay &&
    hasQueuedDiscreteEvents() &&
    isReplayableDiscreteEvent(domEventName)
  ) {
    return queueDiscreteEvent(
      null, // Flags that we're not actually blocked on anything as far as we know.
      domEventName,
      eventSystemFlags,
      targetContainer,
      nativeEvent
    );
  }

  // blockedOn 类型为 SuspenseComponent || (HostRoot & hydrate) || null
  const blockedOn = attemptToDispatchEvent(
    domEventName,
    eventSystemFlags,
    targetContainer,
    nativeEvent
  );

  if (blockedOn === null) {
    // isAllowReplay && clearIfContinuousEvent(domEventName, nativeEvent); // _todo
    return;
  }
  //
}

// ***** Attempt dispatching an event. Returns a SuspenseInstance or Container if it's blocked.
export function attemptToDispatchEvent(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: Node,
  nativeEvent: AnyNativeEvent
) {
  // check
  let targetInst = null; // 触发事件对应节点挂在的最近的Fiber
  dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  );
  // We're not blocked on anything.
  return null;
}

export function getEventPriority(domEventName: DOMEventName): Lane {
  switch (domEventName) {
    // Used by SimpleEventPlugin:
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    // Used by polyfills:
    // eslint-disable-next-line no-fallthrough
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    // Only enableCreateEventHandleAPI:
    // eslint-disable-next-line no-fallthrough
    case "beforeblur":
    case "afterblur":
    // Not used by React but could be by user code:
    // eslint-disable-next-line no-fallthrough
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return DiscreteEventPriority;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    // Not used by React but could be by user code:
    // eslint-disable-next-line no-fallthrough
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return ContinuousEventPriority;
    case "message": {
      // We might be in the Scheduler callback.
      // Eventually this mechanism will be replaced by a check
      // of the current priority on the native scheduler.
      const schedulerPriority = getCurrentSchedulerPriorityLevel();
      switch (schedulerPriority) {
        case ImmediateSchedulerPriority:
          return DiscreteEventPriority;
        case UserBlockingSchedulerPriority:
          return ContinuousEventPriority;
        case NormalSchedulerPriority:
        case LowSchedulerPriority:
          // TODO: Handle LowSchedulerPriority, somehow. Maybe the same lane as hydration.
          return DefaultEventPriority;
        case IdleSchedulerPriority:
          return IdleEventPriority;
        default:
          return DefaultEventPriority;
      }
    }
    default:
      return DefaultEventPriority;
  }
}
