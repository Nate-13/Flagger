// Single shared mutable state object for the overlay. Every module imports this
// same instance and mutates it directly (it is the overlay's "global").
export const STATE = {
  flags: [],
  selectedEl: null,
  popup: null,
  panel: null,
  panelOpen: false,
  hoverEl: null,
  nextId: 1,
  dragging: false,
  dragOffX: 0,
  dragOffY: 0,
  exiting: false,
  paused: false, // browsing mode: interception off, native page clicks pass through
  following: false, // "follow across pages" on for this tab (needs host permission)
  modal: null, // the in-page follow modal (an iframe), if open
  _followKnown: false, // got follow state back from the background yet
  _tabId: null, // this tab's id (from the background) for the modal iframe
  _resumeDone: false, // initSessions finished its resume check
  _resumedSpansPages: false, // resumed a session with flags from other pages
  _followPromptedAlready: false, // the open session was already offered Follow
  _offered: false, // the follow modal has been shown this load
  store: null, // loaded { sessions: [...], openId } from chrome.storage
  sessionId: null, // id of the current open session (null until first flag)
  history: null, // history panel element
  historyOpen: false,
  toolbar: null, // toolbar element
  style: null, // injected <style> element
};
