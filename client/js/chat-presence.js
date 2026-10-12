"use strict";

(() => {
  let stream = null;
  let retryTimer = null;
  let closing = false;

  function resolveRole() {
    const explicit = String(document.body?.dataset.chatPresenceRole || "").trim().toLowerCase();
    if (["user", "farm", "admin"].includes(explicit)) return explicit;
    if (document.body?.classList.contains("admin-page")) return "admin";
    if (document.body?.classList.contains("farm-page")) return "farm";
    return "user";
  }

  function closeStream() {
    if (stream) stream.close();
    stream = null;
  }

  function scheduleReconnect(role) {
    clearTimeout(retryTimer);
    if (closing) return;
    retryTimer = window.setTimeout(() => connect(role), 10_000);
  }

  function connect(role = resolveRole()) {
    if (closing || stream || !window.CatMatchChatApi?.getToken?.(role)) return;
    stream = window.CatMatchChatApi.createStream(role);
    if (!stream) return;
    stream.onopen = () => clearTimeout(retryTimer);
    stream.onerror = () => {
      closeStream();
      scheduleReconnect(role);
    };
  }

  document.addEventListener("DOMContentLoaded", () => connect());
  window.addEventListener("pageshow", () => {
    closing = false;
    connect();
  });
  window.addEventListener("pagehide", () => {
    closing = true;
    clearTimeout(retryTimer);
    closeStream();
  });
})();
