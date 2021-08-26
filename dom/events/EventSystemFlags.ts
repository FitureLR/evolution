//
type EventSystemFlags = number;

declare const IS_EVENT_HANDLE_NON_MANAGED_NODE = 1;
declare const IS_NON_DELEGATED = 2; // 1 << 1
declare const IS_CAPTURE_PHASE = 4; // 2
declare const IS_PASSIVE = 8;
declare const IS_REPLAYED = 16;
declare const IS_LEGACY_FB_SUPPORT_MODE = 32;

declare const SHOULD_NOT_DEFER_CLICK_FOR_FB_SUPPORT_MODE = 52; // IS_LEGACY_FB_SUPPORT_MODE | IS_REPLAYED | IS_CAPTURE_PHASE;

// We do not want to defer if the event system has already been
// set to LEGACY_FB_SUPPORT. LEGACY_FB_SUPPORT only gets set when
// we call willDeferLaterForLegacyFBSupport, thus not bailing out
// will result in endless cycles like an infinite loop.
// We also don't want to defer during event replaying.
declare const SHOULD_NOT_PROCESS_POLYFILL_EVENT_PLUGINS = 7; // IS_EVENT_HANDLE_NON_MANAGED_NODE | IS_NON_DELEGATED | IS_CAPTURE_PHASE;
