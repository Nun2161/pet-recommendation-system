"use strict";

(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector('[data-chat-app][data-chat-role="farm"]');
    if (!root || !window.CatMatchChatUI) return;
    const badge = document.getElementById("farmChatUnread");
    const chat = window.CatMatchChatUI.create(root, {
      role: "farm",
      onUnread(total) {
        if (!badge) return;
        badge.textContent = total ? (total > 99 ? "99+" : String(total)) : "";
        badge.hidden = !total;
      },
    });
    void chat.init();
  });
})();
