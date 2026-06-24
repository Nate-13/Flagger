// Entry point. Injected once per page; guards against double-activation,
// then mounts the overlay.
import { mount } from "./overlay.js";

if (window.__flaggerActive) {
  alert("Flagger is already running on this page.");
} else {
  window.__flaggerActive = true;
  mount();
}
