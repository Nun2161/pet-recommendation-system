"use strict";

(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector('[data-chat-app][data-chat-role="admin"]');
    if (!root || !window.CatMatchChatUI) return;
    const badge = document.getElementById("adminChatUnread");
    const chat = window.CatMatchChatUI.create(root, {
      role: "admin",
      onUnread(total) {
        if (!badge) return;
        badge.textContent = total ? (total > 99 ? "99+" : String(total)) : "";
        badge.hidden = !total;
      },
    });
    void chat.init();
  });
})();
