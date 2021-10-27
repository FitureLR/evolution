//
type DispatchConfig = {
  dependencies?: Array<DOMEventName>;
  phasedRegistrationNames: {
    bubbled: null | string;
    captured: null | string;
  };
  registrationName?: string;
};

type BaseSyntheticEvent = {
  isPersistent: () => boolean;
  isPropagationStopped: () => boolean;
  _dispatchInstances?: null | Array<Fiber | null> | Fiber;
  _dispatchListeners?: null | Array<Function> | Function;
  _targetInst: Fiber;
  nativeEvent: Event;
  target?: Mixed;
  relatedTarget?: Mixed;
  type: string;
  currentTarget: null | EventTarget;
};

type KnownReactSyntheticEvent = BaseSyntheticEvent & {
  _reactName: string;
};
type UnknownReactSyntheticEvent = BaseSyntheticEvent & {
  _reactName: null;
};

type ReactSyntheticEvent =
  | KnownReactSyntheticEvent
  | UnknownReactSyntheticEvent;
