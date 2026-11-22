// Shared between the Access Denied modal and notify
export const ACCESS_DENIED_EVENT = "app:access-denied";

let lastDenied = { at: 0, message: "" };

// Called when an API returns 403 → opens the modal
export function showAccessDenied(message?: string) {
  lastDenied = { at: Date.now(), message: message || "" };
  window.dispatchEvent(new CustomEvent(ACCESS_DENIED_EVENT, { detail: message }));
}

// true only for the SAME message the modal is already showing (within 2 seconds)
export function wasJustDenied(message?: string) {
  if (Date.now() - lastDenied.at > 2000) return false;
  if (!message || !lastDenied.message) return true;
  return message === lastDenied.message;
}