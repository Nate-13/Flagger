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
  store: null, // loaded { sessions: [...], openId } from chrome.storage
  sessionId: null, // id of the current open session (null until first flag)
  history: null, // history panel element
  historyOpen: false,
  toolbar: null, // toolbar element
  style: null, // injected <style> element
};
