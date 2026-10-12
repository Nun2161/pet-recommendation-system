"use strict";

(() => {
  if (window.CatMatchChatNav?.__stableRefreshVersion) return;

  const SVG = {
    home: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6"></path></svg>',
    assessment: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 4h12v16H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path><path d="m16 15 1.5 1.5L20 13.5"></path></svg>',
    cat: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6.5 9 5 4l4 2.5c2-.8 4-.8 6 0L19 4l-1.5 5c1.7 1.6 2.5 3.4 2.5 5.5C20 18 16.8 20 12 20s-8-2-8-5.5C4 12.4 4.8 10.6 6.5 9Z"></path><path d="M9.5 13h.01M14.5 13h.01M10.5 16c1 .8 2.5.8 3.5 0"></path></svg>',
    dog: '<svg aria-hidden="true" class="dogmatch-round-dog-nav" viewBox="0 0 64 64"><path class="dog-logo-ear" d="M20.2 22.2C16.5 18.7 11.4 19.1 9.8 25.1c-2 7.5.6 14.8 6.3 18 2.6 1.5 5.2.5 6.6-2.1 1.5-2.9.7-6.8.2-10.2-.5-3.4-.7-6.3-2.7-8.6Z"></path><path class="dog-logo-ear" d="M43.8 22.2c3.7-3.5 8.8-3.1 10.4 2.9 2 7.5-.6 14.8-6.3 18-2.6 1.5-5.2.5-6.6-2.1-1.5-2.9-.7-6.8-.2-10.2.5-3.4.7-6.3 2.7-8.6Z"></path><path class="dog-logo-face" d="M32 12.5c-10.5 0-17.4 7.4-17.4 19 0 12.8 7 21.2 17.4 21.2s17.4-8.4 17.4-21.2c0-11.6-6.9-19-17.4-19Z"></path><path class="dog-logo-ear-line" d="M18.9 23.8c-1.8 3.6-2.1 8.4-1.1 12.3M45.1 23.8c1.8 3.6 2.1 8.4 1.1 12.3"></path><circle class="dog-logo-eye" cx="27.4" cy="31.9" r="1.55"></circle><circle class="dog-logo-eye" cx="36.6" cy="31.9" r="1.55"></circle><circle class="dog-logo-cheek" cx="22.7" cy="37.8" r="2.35"></circle><circle class="dog-logo-cheek" cx="41.3" cy="37.8" r="2.35"></circle><path class="dog-logo-nose" d="M29.5 37.5c1.6-1.15 3.4-1.15 5 0-1 1.7-1.7 2.45-2.5 2.45s-1.5-.75-2.5-2.45Z"></path><path class="dog-logo-mouth" d="M32 39.9v1.25M32 41.1c-1.2 2.8-4.4 4-6.8 1.2M32 41.1c1.2 2.8 4.4 4 6.8 1.2"></path></svg>',
    chat: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5Z"></path><path d="M8 9h8M8 12h5"></path></svg>',
    about: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4-4"></path></svg>',
  };

  let stream = null;
  let pollTimer = null;
  let lastAvatarSignature = "";
  let refreshInFlight = null;
  let streamFailed = false;

  function pageName() {
    return String(location.pathname.split("/").pop() || "").toLowerCase();
  }

  function species() {
    const preset = document.documentElement.dataset.chatSpecies;
    if (preset === "dog" || preset === "cat") return preset;
    const params = new URLSearchParams(location.search);
    if (params.get("species") === "dog") return "dog";
    if (params.get("species") === "cat") return "cat";
    const page = pageName();
    if (page.startsWith("dog-") || document.body?.classList.contains("dog-page") || document.body?.classList.contains("chat-page--dog")) return "dog";
    const brand = document.querySelector(".brand-text strong, #chatBrandName")?.textContent || "";
    return /dogmatch/i.test(brand) ? "dog" : "cat";
  }

  function navItems(kind) {
    return [
      { key: "home", label: "หน้าหลัก", href: kind === "dog" ? "./dog-index.html" : "./index.html", icon: SVG.home },
      { key: "assessment", label: "แบบประเมิน", href: kind === "dog" ? "./dog-assessment.html?species=dog" : "./assessment.html", icon: SVG.assessment },
      { key: "breeds", label: kind === "dog" ? "หมาของเรา" : "แมวของเรา", href: kind === "dog" ? "./dog-breeds.html" : "./cat-breeds.html", icon: kind === "dog" ? SVG.dog : SVG.cat },
      { key: "chat", label: "ข้อความ", href: `./chat.html?species=${kind}`, icon: SVG.chat },
      { key: "about", label: "เกี่ยวกับเรา", href: "./about.html", icon: SVG.about },
    ];
  }

  function currentKey() {
    const page = pageName();
    if (page === "chat.html") return "chat";
    if (page.includes("assessment")) return "assessment";
    if (page.includes("breed") || page.includes("detail") || page.includes("shelter")) return "breeds";
    if (page === "about.html") return "about";
    if (page === "index.html" || page === "dog-index.html" || !page) return "home";
    return "";
  }

  function normalizeMainNav() {
    const kind = species();
    const active = currentKey();
    document.querySelectorAll(".main-nav").forEach((nav) => {
      const signature = `${kind}:${active}`;
      if (nav.dataset.chatNavSignature === signature && nav.querySelector("[data-chat-unread-badge]")) return;
      const existingClasses = new Map();
      [...nav.querySelectorAll("a")].forEach((link) => {
        const text = String(link.textContent || "").trim();
        const href = String(link.getAttribute("href") || "");
        const key = href.includes("chat.html") || text === "ข้อความ" ? "chat"
          : href.includes("assessment") || text.includes("แบบประเมิน") ? "assessment"
          : href.includes("breed") || text.includes("ของเรา") ? "breeds"
          : href.includes("about") || text.includes("เกี่ยวกับ") ? "about"
          : href.includes("index") || text.includes("หน้าหลัก") ? "home" : "";
        if (key) existingClasses.set(key, link.className);
      });
      nav.innerHTML = navItems(kind).map((item) => {
        const classes = new Set(String(existingClasses.get(item.key) || "nav-link").split(/\s+/).filter(Boolean));
        classes.add("nav-link");
        if (item.key === "chat") classes.add("chat-nav-link");
        if (item.key === active) classes.add("is-active"); else classes.delete("is-active");
        const badge = item.key === "chat" ? '<span class="chat-nav-badge" data-chat-unread-badge hidden></span>' : "";
        return `<a class="${[...classes].join(" ")}" href="${item.href}"${item.key === active ? ' aria-current="page"' : ""}>${item.icon}<span>${item.label}</span>${badge}</a>`;
      }).join("");
      nav.dataset.chatNavSignature = signature;
    });
  }

  function parseStoredUser() {
    const records = [];
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of ["catmatch_user", "user"]) {
        try {
          const value = JSON.parse(storage.getItem(key) || "null");
          if (value && typeof value === "object") records.push(value);
        } catch (_error) {}
      }
    }
    const actor = window.CatMatchChatApi?.getActor?.("user") || {};
    return records.find((row) => Number(row.user_id || row.id) === Number(actor.id)) || records[0] || {};
  }

  function profileImage() {
    const user = parseStoredUser();
    const fromHelper = window.CatMatchProfileAvatar?.readProfileImage?.(user);
    if (fromHelper) return String(fromHelper);
    const fields = ["profile_image", "profile_image_url", "google_photo_url", "photo_url", "photoURL", "picture", "avatar_url", "avatar"];
    for (const key of fields) {
      const value = String(user?.[key] || "").trim();
      if (/^(data:image\/|https?:\/\/|\/uploads\/)/i.test(value)) return value;
    }
    return "";
  }

  function displayName() {
    const user = parseStoredUser();
    return String(user.nickname || user.name || user.username || user.email || "ผู้ใช้").trim();
  }

  function renderOwnAvatar() {
    const image = profileImage();
    const initial = displayName().charAt(0).toUpperCase() || "U";
    document.querySelectorAll("[data-chat-header-avatar]").forEach((node) => {
      node.innerHTML = image ? `<img src="${image.replace(/"/g, "&quot;")}" alt="รูปโปรไฟล์">` : initial;
    });
  }

  async function syncOwnAvatar(force = false) {
    const api = window.CatMatchChatApi;
    const actor = api?.getActor?.("user");
    const image = profileImage();
    if (!api || !actor?.id) return;
    const signature = image
      ? `${actor.id}:${image.length}:${image.slice(0, 42)}:${image.slice(-24)}`
      : `${actor.id}:empty`;
    if (!force && (signature === lastAvatarSignature || sessionStorage.getItem(`catmatch_chat_avatar_synced:${actor.id}`) === signature)) return;
    try {
      await api.request("/profile/avatar", {
        method: "POST",
        body: JSON.stringify({ avatar_url: image }),
      }, "user");
      lastAvatarSignature = signature;
      sessionStorage.setItem(`catmatch_chat_avatar_synced:${actor.id}`, signature);
    } catch (_error) {}
  }

  function setUnread(count) {
    const value = Math.max(0, Number(count || 0));
    document.querySelectorAll("[data-chat-unread-badge]").forEach((badge) => {
      badge.textContent = value > 99 ? "99+" : String(value);
      badge.hidden = value === 0;
      badge.setAttribute("aria-label", value ? `มีข้อความที่ยังไม่ได้อ่าน ${value} ข้อความ` : "ไม่มีข้อความใหม่");
    });
  }

  async function refreshUnread() {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      const api = window.CatMatchChatApi;
      if (!api?.getToken?.("user")) {
        setUnread(0);
        return 0;
      }
      try {
        const payload = await api.request("/conversations", {}, "user");
        const count = Number(payload.unread_count || 0);
        setUnread(count);
        return count;
      } catch (error) {
        // แชทล่มหรือเซสชันแชทใช้ไม่ได้ ต้องไม่แตะสถานะล็อกอินของทั้งเว็บ
        if (Number(error?.status || 0) !== 401) {
          console.debug("Chat unread refresh skipped:", error?.message || error);
        }
        return 0;
      }
    })().finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  }

  function disconnectUnreadStream() {
    if (stream) stream.close();
    stream = null;
  }

  function connectUnreadStream() {
    if (stream || streamFailed || document.hidden || !window.CatMatchChatApi?.getToken?.("user")) return;
    stream = window.CatMatchChatApi.createStream("user");
    if (!stream) return;
    ["message:new", "conversation:read"].forEach((name) => {
      stream.addEventListener(name, () => void refreshUnread());
    });
    stream.onopen = () => { streamFailed = false; };
    stream.onerror = () => {
      // EventSource จะพยายามเชื่อมใหม่เองตลอด หาก Token ใช้กับแชทไม่ได้
      // จึงปิดไว้และใช้ polling แบบไม่กระทบ Token หลักแทน
      streamFailed = true;
      disconnectUnreadStream();
    };
  }

  function bindLogoutFallback() {
    if (window.__petmatchLogoutFallbackBound) return;
    window.__petmatchLogoutFallbackBound = true;

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element
        ? event.target.closest("#logoutButton,[data-catmatch-logout]")
        : null;
      if (!target || window.CatMatchUserSession?.logout) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      target.disabled = true;

      const keys = [
        "catmatch_token", "userToken", "token", "authToken", "accessToken",
        "catmatch_user", "user", "firebase_uid", "catmatch_identity"
      ];
      for (const storage of [localStorage, sessionStorage]) {
        keys.forEach((key) => storage.removeItem(key));
      }

      const kind = species();
      const destination = target.dataset.logoutRedirect || (kind === "dog" ? "./dog-index.html" : "./index.html");
      const navigate = () => window.location.replace(destination);
      Promise.race([
        Promise.resolve(window.catmatchFirebase?.signOut?.()).catch(() => false),
        new Promise((resolve) => window.setTimeout(resolve, 350)),
      ]).finally(navigate);
      window.setTimeout(navigate, 500);
    }, true);
  }

  function boot() {
    bindLogoutFallback();
    normalizeMainNav();
    renderOwnAvatar();
    void syncOwnAvatar();
    void refreshUnread();
    connectUnreadStream();
    clearInterval(pollTimer);
    pollTimer = window.setInterval(() => {
      if (!document.hidden) void refreshUnread();
    }, 60000);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      disconnectUnreadStream();
      return;
    }
    streamFailed = false;
    void refreshUnread();
    connectUnreadStream();
  });

  window.addEventListener("pagehide", disconnectUnreadStream);

  window.CatMatchChatNav = {
    __stableRefreshVersion: "2",
    refreshUnread,
    syncOwnAvatar,
    renderOwnAvatar,
    normalizeMainNav,
  };
  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("catmatch:chat-unread", (event) => setUnread(event.detail?.count || 0));
  window.addEventListener("catmatch:profile-image-updated", () => {
    renderOwnAvatar();
    void syncOwnAvatar(true);
  });
  window.addEventListener("catmatch:user-session", () => {
    renderOwnAvatar();
    void syncOwnAvatar(true);
    void refreshUnread();
  });
})();
