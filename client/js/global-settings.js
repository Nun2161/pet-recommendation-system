"use strict";

(() => {
  const BASE_KEY = "catmatch_settings";
  const defaults = {
    theme: "light",
    sakuraMotion: true,
    reducedMotion: false,
    farmResponses: true,
    recommendationUpdates: true,
    productUpdates: false,
    saveAssessmentHistory: true,
    personalizedRecommendations: true,
    newAdoptionRequests: true,
    requestStatusChanges: true,
    farmSystemUpdates: true,
    farmProfileVisible: true,
    showFarmContact: true,
    showFarmLocation: true,
  };

  function readJSON(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch (_error) {
      return null;
    }
  }

  function firstStoredValue(keys) {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of keys) {
        const value = storage.getItem(key);
        if (value) return value;
      }
    }
    return "";
  }

  function currentAccount() {
    const params = new URLSearchParams(window.location.search);
    const page = window.location.pathname.split("/").pop()?.toLowerCase() || "";
    const farmContext = params.get("from") === "farm" || page === "farm.html";

    const farmToken = firstStoredValue([
      "catmatch_farm_token",
      "farm_token",
      "farmToken",
    ]);
    const userToken = firstStoredValue([
      "catmatch_token",
      "userToken",
      "token",
    ]);

    let record = null;
    let role = "guest";

    if (farmContext && farmToken) {
      role = "farm";
      record =
        readJSON(localStorage, "catmatch_farm") ||
        readJSON(sessionStorage, "catmatch_farm") ||
        readJSON(localStorage, "farm") ||
        readJSON(sessionStorage, "farm");
    } else if (!farmContext && userToken) {
      role = "user";
      record =
        readJSON(localStorage, "catmatch_user") ||
        readJSON(sessionStorage, "catmatch_user") ||
        readJSON(localStorage, "user") ||
        readJSON(sessionStorage, "user");
    } else if (farmToken && !userToken) {
      role = "farm";
      record =
        readJSON(localStorage, "catmatch_farm") ||
        readJSON(sessionStorage, "catmatch_farm") ||
        readJSON(localStorage, "farm") ||
        readJSON(sessionStorage, "farm");
    } else if (userToken) {
      role = "user";
      record =
        readJSON(localStorage, "catmatch_user") ||
        readJSON(sessionStorage, "catmatch_user") ||
        readJSON(localStorage, "user") ||
        readJSON(sessionStorage, "user");
    }

    if (!record || role === "guest") {
      return { role: "guest", id: "", storageKey: "" };
    }

    const id = String(
      record.firebase_uid ||
      record.uid ||
      record.farm_id ||
      record.user_id ||
      record.email ||
      ""
    ).trim().toLowerCase();

    if (!id) return { role: "guest", id: "", storageKey: "" };

    return {
      role,
      id,
      storageKey: `${BASE_KEY}::${role}::${encodeURIComponent(id)}`,
    };
  }

  function read() {
    const account = currentAccount();
    if (!account.storageKey) return { ...defaults };

    try {
      const stored = JSON.parse(localStorage.getItem(account.storageKey) || "null");
      return { ...defaults, ...(stored || {}) };
    } catch (_error) {
      return { ...defaults };
    }
  }

  let activeIdentity = "";
  let state = read();

  function apply() {
    const account = currentAccount();
    activeIdentity = account.storageKey;
    state = read();

    let theme = state.theme;
    if (theme === "system") {
      theme = matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    const root = document.documentElement;
    root.dataset.catmatchTheme = theme;
    root.dataset.sakuraMotion = String(Boolean(state.sakuraMotion));
    root.dataset.reducedMotion = String(Boolean(state.reducedMotion));
    root.dataset.settingsAccount = account.role;

    window.dispatchEvent(new CustomEvent("catmatch:settings-applied", {
      detail: {
        ...state,
        resolvedTheme: theme,
        accountRole: account.role,
        accountScoped: Boolean(account.storageKey),
      },
    }));
  }

  function save(patch) {
    const account = currentAccount();
    if (!account.storageKey) {
      state = { ...defaults };
      apply();
      return { ...state };
    }

    state = { ...read(), ...patch };
    localStorage.setItem(account.storageKey, JSON.stringify(state));
    apply();
    return { ...state };
  }

  window.CatMatchSettings = {
    get key() {
      return currentAccount().storageKey;
    },
    baseKey: BASE_KEY,
    defaults: { ...defaults },
    get: () => ({ ...read() }),
    save,
    apply,
    getAccount: () => ({ ...currentAccount() }),
  };

  // ค่ารุ่นเก่าเป็นค่ารวมทุกบัญชี จึงไม่อ่านอีกเพื่อป้องกันธีมรั่วไปบัญชีอื่น
  try {
    localStorage.removeItem(BASE_KEY);
  } catch (_error) {}

  apply();

  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener?.("change", () => {
    if (read().theme === "system") apply();
  });

  window.addEventListener("storage", apply);
  window.addEventListener("pageshow", apply);

  // ตรวจการสลับบัญชี/ออกจากระบบที่เกิดในแท็บเดียวกัน
  window.setInterval(() => {
    const nextIdentity = currentAccount().storageKey;
    if (nextIdentity !== activeIdentity) apply();
  }, 600);

  document.addEventListener("click", (event) => {
    const element = event.target.closest("#accountSettingsButton,[data-open-settings]");
    if (!element) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const account = currentAccount();
    const params = new URLSearchParams(window.location.search);
    const dogContext =
      params.get("species") === "dog" ||
      document.body?.dataset?.species === "dog" ||
      document.body?.classList?.contains("dog-account-context") ||
      document.body?.classList?.contains("dog-theme");

    window.location.href = account.role === "farm"
      ? "./settings.html?from=farm"
      : (dogContext ? "./settings.html?species=dog" : "./settings.html");
  }, true);
})();

/* =========================================================
   Unified account dropdown — stable on every page
   Keeps the panel inside the header, removes legacy fixed-position
   inline styles, and prevents map/forms from covering the menu.
   ========================================================= */
(() => {
  "use strict";

  let observer = null;
  let cleanupQueued = false;

  const POSITION_STYLE_PROPERTIES = [
    "position",
    "inset",
    "inset-inline",
    "inset-block",
    "left",
    "right",
    "top",
    "bottom",
    "width",
    "max-width",
    "transform",
    "transform-origin",
  ];

  function removeLegacyPositionStyles(panel) {
    if (!panel) return;

    let changed = false;
    for (const property of POSITION_STYLE_PROPERTIES) {
      if (panel.style.getPropertyValue(property)) {
        panel.style.removeProperty(property);
        changed = true;
      }
    }

    if (changed && !panel.getAttribute("style")?.trim()) {
      panel.removeAttribute("style");
    }
  }

  function setupUnifiedAccountMenu() {
    const trigger = document.getElementById("userMenuTrigger");
    const panel = document.getElementById("userMenuPanel");
    const userActions =
      document.getElementById("userNavActions") ||
      trigger?.closest(".user-nav-actions");
    const header = trigger?.closest("header");

    if (!trigger || !panel || !userActions || !header) return;

    header.classList.add("catmatch-account-header");

    const normalizePanel = () => {
      if (panel.parentElement !== userActions) {
        userActions.appendChild(panel);
      }
      removeLegacyPositionStyles(panel);
    };

    const closeMenu = () => {
      trigger.setAttribute("aria-expanded", "false");
      panel.classList.remove("is-open");
      panel.hidden = true;
      removeLegacyPositionStyles(panel);
    };

    const openMenu = () => {
      normalizePanel();
      panel.hidden = false;
      panel.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");

      // Older page scripts may try to add fixed coordinates immediately
      // after this click. Remove those values once more on the next frame.
      window.requestAnimationFrame(() => removeLegacyPositionStyles(panel));
    };

    normalizePanel();

    if (trigger.dataset.catmatchUnifiedMenuBound !== "true") {
      trigger.dataset.catmatchUnifiedMenuBound = "true";
      closeMenu();

      document.addEventListener(
        "click",
        (event) => {
          const clickedTrigger = event.target.closest?.("#userMenuTrigger");

          if (clickedTrigger) {
            event.preventDefault();
            event.stopImmediatePropagation();

            const isOpen =
              trigger.getAttribute("aria-expanded") === "true" &&
              !panel.hidden;

            if (isOpen) closeMenu();
            else openMenu();
            return;
          }

          if (!event.target.closest?.("#userMenuPanel")) {
            closeMenu();
          }
        },
        true
      );

      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        closeMenu();
        trigger.focus({ preventScroll: true });
      });

      window.addEventListener(
        "resize",
        () => {
          removeLegacyPositionStyles(panel);
          if (!panel.hidden) closeMenu();
        },
        { passive: true }
      );
    }

    observer?.disconnect();
    observer = new MutationObserver(() => {
      if (cleanupQueued) return;
      cleanupQueued = true;

      window.requestAnimationFrame(() => {
        cleanupQueued = false;
        normalizePanel();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  const start = () => window.setTimeout(setupUnifiedAccountMenu, 0);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("pageshow", start);
})();

/* DogMatch account context. Runs only on shared account pages opened with ?species=dog. */
(() => {
  "use strict";

  const ACCOUNT_PAGES = new Set([
    "adoption-requests.html",
    "notifications.html",
    "favorites.html",
    "account-info.html",
    "settings.html"
  ]);

  const DOG_CONTEXT_PAGES = new Set([
    ...ACCOUNT_PAGES,
    "about.html"
  ]);

  const pageName = window.location.pathname.split("/").pop()?.toLowerCase() || "";
  const params = new URLSearchParams(window.location.search);
  const isDogAccount = DOG_CONTEXT_PAGES.has(pageName) && params.get("species") === "dog";
  if (!isDogAccount) return;

  const DOG_HEADER_HTML = `<header class="site-header" id="siteHeader">
<div class="container nav-shell">
<a aria-label="DogMatch หน้าแรก" class="brand" href="./dog-index.html">
<span aria-hidden="true" class="brand-logo">
<svg aria-label="โลโก้สุนัขหน้ากลมของ DogMatch" class="cute-dog-icon dogmatch-round-dog" role="img" viewBox="0 0 64 64">
<path class="dog-logo-ear" d="M20.2 22.2C16.5 18.7 11.4 19.1 9.8 25.1c-2 7.5.6 14.8 6.3 18 2.6 1.5 5.2.5 6.6-2.1 1.5-2.9.7-6.8.2-10.2-.5-3.4-.7-6.3-2.7-8.6Z"></path>
<path class="dog-logo-ear" d="M43.8 22.2c3.7-3.5 8.8-3.1 10.4 2.9 2 7.5-.6 14.8-6.3 18-2.6 1.5-5.2.5-6.6-2.1-1.5-2.9-.7-6.8-.2-10.2.5-3.4.7-6.3 2.7-8.6Z"></path>
<path class="dog-logo-face" d="M32 12.5c-10.5 0-17.4 7.4-17.4 19 0 12.8 7 21.2 17.4 21.2s17.4-8.4 17.4-21.2c0-11.6-6.9-19-17.4-19Z"></path>
<path class="dog-logo-ear-line" d="M18.9 23.8c-1.8 3.6-2.1 8.4-1.1 12.3"></path>
<path class="dog-logo-ear-line" d="M45.1 23.8c1.8 3.6 2.1 8.4 1.1 12.3"></path>
<circle class="dog-logo-eye" cx="27.4" cy="31.9" r="1.55"></circle>
<circle class="dog-logo-eye" cx="36.6" cy="31.9" r="1.55"></circle>
<circle class="dog-logo-cheek" cx="22.7" cy="37.8" r="2.35"></circle>
<circle class="dog-logo-cheek" cx="41.3" cy="37.8" r="2.35"></circle>
<path class="dog-logo-nose" d="M29.5 37.5c1.6-1.15 3.4-1.15 5 0-1 1.7-1.7 2.45-2.5 2.45s-1.5-.75-2.5-2.45Z"></path>
<path class="dog-logo-mouth" d="M32 39.9v1.25"></path>
<path class="dog-logo-mouth" d="M32 41.1c-1.2 2.8-4.4 4-6.8 1.2"></path>
<path class="dog-logo-mouth" d="M32 41.1c1.2 2.8 4.4 4 6.8 1.2"></path>
</svg>
</span>
<span class="brand-text">
<strong>DogMatch</strong>
<small>สุนัขที่ใช่ สำหรับคุณ</small>
</span>
</a>
<nav aria-label="เมนูหลัก" class="main-nav" id="mainNav">
<a class="nav-link" href="./dog-index.html">
<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6"></path></svg>
<span>หน้าหลัก</span>
</a>
<a class="nav-link" href="./dog-assessment.html?species=dog">
<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 4h12v16H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path><path d="m16 15 1.5 1.5L20 13.5"></path></svg>
<span>แบบประเมิน</span>
</a>
<a class="nav-link" href="./dog-breeds.html">
<svg aria-hidden="true" class="dogmatch-round-dog-nav" viewBox="0 0 64 64">
<path class="dog-logo-ear" d="M20.2 22.2C16.5 18.7 11.4 19.1 9.8 25.1c-2 7.5.6 14.8 6.3 18 2.6 1.5 5.2.5 6.6-2.1 1.5-2.9.7-6.8.2-10.2-.5-3.4-.7-6.3-2.7-8.6Z"></path>
<path class="dog-logo-ear" d="M43.8 22.2c3.7-3.5 8.8-3.1 10.4 2.9 2 7.5-.6 14.8-6.3 18-2.6 1.5-5.2.5-6.6-2.1-1.5-2.9-.7-6.8-.2-10.2.5-3.4.7-6.3 2.7-8.6Z"></path>
<path class="dog-logo-face" d="M32 12.5c-10.5 0-17.4 7.4-17.4 19 0 12.8 7 21.2 17.4 21.2s17.4-8.4 17.4-21.2c0-11.6-6.9-19-17.4-19Z"></path>
<path class="dog-logo-ear-line" d="M18.9 23.8c-1.8 3.6-2.1 8.4-1.1 12.3"></path>
<path class="dog-logo-ear-line" d="M45.1 23.8c1.8 3.6 2.1 8.4 1.1 12.3"></path>
<circle class="dog-logo-eye" cx="27.4" cy="31.9" r="1.55"></circle>
<circle class="dog-logo-eye" cx="36.6" cy="31.9" r="1.55"></circle>
<circle class="dog-logo-cheek" cx="22.7" cy="37.8" r="2.35"></circle>
<circle class="dog-logo-cheek" cx="41.3" cy="37.8" r="2.35"></circle>
<path class="dog-logo-nose" d="M29.5 37.5c1.6-1.15 3.4-1.15 5 0-1 1.7-1.7 2.45-2.5 2.45s-1.5-.75-2.5-2.45Z"></path>
<path class="dog-logo-mouth" d="M32 39.9v1.25"></path>
<path class="dog-logo-mouth" d="M32 41.1c-1.2 2.8-4.4 4-6.8 1.2"></path>
<path class="dog-logo-mouth" d="M32 41.1c1.2 2.8 4.4 4 6.8 1.2"></path>
</svg>
<span>หมาของเรา</span>
</a>
<a class="nav-link" href="./about.html?species=dog">
<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4-4"></path></svg>
<span>เกี่ยวกับเรา</span>
</a>
</nav>
<div class="nav-actions auth-nav" id="authNav">
<div class="guest-nav-actions" id="guestNavActions">
<a class="button button-secondary button-small" href="./login.html?return=dog-index">เข้าสู่ระบบ</a>
<a class="button button-primary button-small" href="./register.html?fresh=1">สมัครสมาชิก</a>
</div>
<div class="user-nav-actions" hidden="" id="userNavActions">
<button aria-controls="userMenuPanel" aria-expanded="false" class="user-menu-trigger" id="userMenuTrigger" type="button">
<span aria-hidden="true" class="user-avatar" id="userAvatar">U</span>
<span class="user-summary">
<strong id="userDisplayName">ผู้ใช้งาน</strong>
<small>บัญชีของฉัน</small>
</span>
<svg aria-hidden="true" class="user-menu-chevron" viewBox="0 0 24 24">
<path d="m7 10 5 5 5-5"></path>
</svg>
</button>
<div class="user-menu-panel" hidden="" id="userMenuPanel">
<div class="user-menu-account">
<span aria-hidden="true" class="user-menu-avatar" id="userMenuAvatar">U</span>
<span>
<strong id="userMenuName">ผู้ใช้งาน</strong>
<small id="userMenuEmail"></small>
</span>
</div>
<div class="account-menu-group">
<small class="account-menu-label">กิจกรรมของฉัน</small>
<a class="account-menu-item" href="./adoption-requests.html">
<span aria-hidden="true" class="account-menu-icon">
<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-8.5C.7 9 2.5 5 6.3 5c2.2 0 3.8 1.2 5.7 3.2C13.9 6.2 15.5 5 17.7 5c3.8 0 5.6 4 3.6 7.5C19 16.4 12 21 12 21Z"></path></svg>
</span>
<span>
<strong>คำขออุปการะของฉัน</strong>
<small>ติดตามสถานะคำขอที่ส่งไปยังฟาร์ม</small>
</span>
</a>
<a class="account-menu-item" href="./notifications.html">
<span aria-hidden="true" class="account-menu-icon">
<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"></path><path d="M10 21h4"></path></svg>
</span>
<span>
<strong>การแจ้งเตือน</strong>
<small>ดูการตอบกลับและความเคลื่อนไหวล่าสุด</small>
</span>
</a>
<a class="account-menu-item" href="./favorites.html">
<span aria-hidden="true" class="account-menu-icon account-menu-heart">
<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-8.5C.7 9 2.5 5 6.3 5c2.2 0 3.8 1.2 5.7 3.2C13.9 6.2 15.5 5 17.7 5c3.8 0 5.6 4 3.6 7.5C19 16.4 12 21 12 21Z"></path></svg>
</span>
<span>
<strong>สุนัขที่ถูกใจ</strong>
<small>สายพันธุ์ที่คุณบันทึกไว้</small>
</span>
</a>
</div>
<div class="account-menu-group">
<small class="account-menu-label">จัดการบัญชี</small>
<a class="account-menu-item" href="./account-info.html" id="accountInfoButton">
<span aria-hidden="true" class="account-menu-icon">
<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path></svg>
</span>
<span>
<strong>ข้อมูลบัญชี</strong>
<small>ชื่อบัญชี อีเมล และข้อมูลส่วนตัว</small>
</span>
</a>
<button class="account-menu-item account-menu-button" id="accountSettingsButton" type="button">
<span aria-hidden="true" class="account-menu-icon">
<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"></path></svg>
</span>
<span>
<strong>การตั้งค่า</strong>
<small>ตั้งค่าการใช้งาน DogMatch</small>
</span>
</button>
</div>
<button class="logout-button" id="logoutButton" type="button">
<span aria-hidden="true">↪</span>
<span>ออกจากระบบ</span>
</button>
</div>
</div>
</div>
<button aria-label="เปิดเมนู" class="menu-toggle" id="menuToggle" type="button">
<span></span><span></span><span></span>
</button>
</div>
</header>`;

  const DOG_PAGE_MAP = new Map([
    ["index.html", "dog-index.html"],
    ["assessment.html", "dog-assessment.html"],
    ["assessment-history.html", "dog-assessment-history.html"],
    ["result.html", "dog-result.html"],
    ["cat-breeds.html", "dog-breeds.html"],
    ["cat_detail.html", "dog-detail.html"],
    ["farm-map.html", "dog-farm-map.html"]
  ]);

  const TEXT_REPLACEMENTS = [
    [/ภาพเคลื่อนไหวกลีบดอกไม้/g, "ภาพเคลื่อนไหวหิมะ"],
    [/แสดงกลีบดอกไม้ที่เคลื่อนไหวบนพื้นหลัง/g, "แสดงเกล็ดหิมะที่เคลื่อนไหวบนพื้นหลัง"],
    [/CatMatch/g, "DogMatch"],
    [/CATMATCH/g, "DOGMATCH"],
    [/catmatch/g, "dogmatch"],
    [/\bMY FAVORITE CATS\b/g, "MY FAVORITE DOGS"],
    [/\bMy Favorite Cats\b/g, "My Favorite Dogs"],
    [/\bCATS\b/g, "DOGS"],
    [/\bCats\b/g, "Dogs"],
    [/\bcats\b/g, "dogs"],
    [/\bCAT\b/g, "DOG"],
    [/\bCat\b/g, "Dog"],
    [/\bcat\b/g, "dog"],
    [/แมว/g, "สุนัข"]
  ];

  const replaceText = (value) => {
    let result = String(value ?? "");
    TEXT_REPLACEMENTS.forEach(([pattern, replacement]) => {
      result = result.replace(pattern, replacement);
    });
    return result;
  };

  const ensureStyles = () => {
    const links = [
      ["dog-theme-account-runtime", "../css/dog-theme.css?v=17"],
      ["dog-account-theme-runtime", "../css/dog-account-theme.css?v=6"]
    ];

    links.forEach(([id, href]) => {
      let link = document.getElementById(id);
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = href;
    });
  };

  const withDogContext = (href) => {
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return href;

    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return href;

      let targetPage = url.pathname.split("/").pop()?.toLowerCase() || "";
      const mappedPage = DOG_PAGE_MAP.get(targetPage);
      if (mappedPage) {
        targetPage = mappedPage;
        url.pathname = url.pathname.replace(/[^/]+$/, mappedPage);
      }

      if (ACCOUNT_PAGES.has(targetPage) || targetPage === "about.html") {
        url.searchParams.set("species", "dog");
      }

      if ([
        "dog-assessment.html",
        "dog-assessment-history.html",
        "dog-result.html",
        "dog-farm-map.html"
      ].includes(targetPage)) {
        url.searchParams.set("species", "dog");
      }

      return `./${targetPage}${url.search}${url.hash}`;
    } catch (_error) {
      return href;
    }
  };

  const replaceVisibleLanguage = (root = document.body) => {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || parent.closest("script,style,noscript,textarea,code,pre")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const next = replaceText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });

    root.querySelectorAll?.("[title],[aria-label],[alt],[placeholder]").forEach((element) => {
      ["title", "aria-label", "alt", "placeholder"].forEach((name) => {
        if (!element.hasAttribute(name)) return;
        const current = element.getAttribute(name) || "";
        const next = replaceText(current);
        if (next !== current) element.setAttribute(name, next);
      });
    });
  };

  const rewriteLinks = (root = document) => {
    root.querySelectorAll?.("a[href]").forEach((link) => {
      const current = link.getAttribute("href") || "";
      const next = withDogContext(current);
      if (next && next !== current) link.setAttribute("href", next);
    });
  };

  const markCurrentAccountItem = () => {
    document.querySelectorAll(".account-menu-item").forEach((item) => {
      item.classList.remove("is-current");
      item.removeAttribute("aria-current");
    });

    const selectorByPage = {
      "adoption-requests.html": 'a[href*="adoption-requests.html"]',
      "notifications.html": 'a[href*="notifications.html"]',
      "favorites.html": 'a[href*="favorites.html"]',
      "account-info.html": '#accountInfoButton',
      "settings.html": '#accountSettingsButton'
    };

    const selector = selectorByPage[pageName] || "";
    const current = selector ? document.querySelector(selector) : null;
    if (current) {
      current.classList.add("is-current");
      current.setAttribute("aria-current", "page");
    }
  };

  const replaceHeader = () => {
    const currentHeader = document.getElementById("siteHeader");
    if (!currentHeader) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = DOG_HEADER_HTML.trim();
    const exactHeader = wrapper.firstElementChild;
    if (!exactHeader) return;

    currentHeader.replaceWith(exactHeader);
    rewriteLinks(exactHeader);
    markCurrentAccountItem();
  };

  const bindSettingsButton = () => {
    const button = document.getElementById("accountSettingsButton");
    if (!button || button.dataset.dogAccountBound === "true") return;
    button.dataset.dogAccountBound = "true";
    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = "./settings.html?species=dog";
      },
      true
    );
  };

  const createSnow = () => {
    if (document.querySelector(".dog-account-snow")) return;
    const scene = document.createElement("div");
    scene.className = "dog-account-snow";
    scene.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 22; index += 1) {
      const flake = document.createElement("i");
      flake.style.setProperty("--left", `${(index * 47 + 9) % 100}%`);
      flake.style.setProperty("--size", `${6 + (index % 5) * 2}px`);
      flake.style.setProperty("--opacity", `${0.38 + (index % 4) * 0.12}`);
      flake.style.setProperty("--duration", `${14 + (index % 7) * 2}s`);
      flake.style.setProperty("--delay", `${-(index % 12)}s`);
      flake.style.setProperty("--sway", `${3.2 + (index % 5) * 0.65}s`);
      flake.style.setProperty("--drift", `${index % 2 ? 34 : -34}px`);
      scene.appendChild(flake);
    }

    document.body.prepend(scene);
  };

  const loadDogHeaderController = () => {
    if (document.getElementById("dog-account-header-controller")) return;
    const script = document.createElement("script");
    script.id = "dog-account-header-controller";
    script.src = "../js/dog-header.js?v=3";
    script.defer = true;
    document.body.appendChild(script);
  };

  const updateDocumentMetadata = () => {
    document.title = replaceText(document.title);
    document.querySelectorAll('meta[name="description"]').forEach((meta) => {
      meta.content = replaceText(meta.content);
    });
  };

  const DOG_LEGAL_LOGO = `
    <svg aria-hidden="true" class="dog-account-logo dogmatch-round-dog" viewBox="0 0 64 64">
      <path class="dog-logo-ear" d="M20.2 22.2C16.5 18.7 11.4 19.1 9.8 25.1c-2 7.5.6 14.8 6.3 18 2.6 1.5 5.2.5 6.6-2.1 1.5-2.9.7-6.8.2-10.2-.5-3.4-.7-6.3-2.7-8.6Z"></path>
      <path class="dog-logo-ear" d="M43.8 22.2c3.7-3.5 8.8-3.1 10.4 2.9 2 7.5-.6 14.8-6.3 18-2.6 1.5-5.2.5-6.6-2.1-1.5-2.9-.7-6.8-.2-10.2.5-3.4.7-6.3 2.7-8.6Z"></path>
      <path class="dog-logo-face" d="M32 12.5c-10.5 0-17.4 7.4-17.4 19 0 12.8 7 21.2 17.4 21.2s17.4-8.4 17.4-21.2c0-11.6-6.9-19-17.4-19Z"></path>
      <path class="dog-logo-ear-line" d="M18.9 23.8c-1.8 3.6-2.1 8.4-1.1 12.3"></path>
      <path class="dog-logo-ear-line" d="M45.1 23.8c1.8 3.6 2.1 8.4 1.1 12.3"></path>
      <circle class="dog-logo-eye" cx="27.4" cy="31.9" r="1.55"></circle>
      <circle class="dog-logo-eye" cx="36.6" cy="31.9" r="1.55"></circle>
      <circle class="dog-logo-cheek" cx="22.7" cy="37.8" r="2.35"></circle>
      <circle class="dog-logo-cheek" cx="41.3" cy="37.8" r="2.35"></circle>
      <path class="dog-logo-nose" d="M29.5 37.5c1.6-1.15 3.4-1.15 5 0-1 1.7-1.7 2.45-2.5 2.45s-1.5-.75-2.5-2.45Z"></path>
      <path class="dog-logo-mouth" d="M32 39.9v1.25"></path>
      <path class="dog-logo-mouth" d="M32 41.1c-1.2 2.8-4.4 4-6.8 1.2"></path>
      <path class="dog-logo-mouth" d="M32 41.1c1.2 2.8 4.4 4 6.8 1.2"></path>
    </svg>`;

  const normalizeDogAboutPage = () => {
    if (pageName !== "about.html") return;

    document.body.classList.add("dog-about-page");
    const brand = document.querySelector(".legal-brand");
    const brandMark = brand?.querySelector(".legal-brand-mark");
    if (brandMark) brandMark.innerHTML = DOG_LEGAL_LOGO;
    if (brand) brand.href = "./dog-index.html";

    const back = document.querySelector(".legal-back");
    if (back) {
      back.href = "./dog-index.html";
      back.textContent = "← กลับหน้า DogMatch";
    }
  };

  const normalizeDogAccount = () => {
    replaceVisibleLanguage(document.body);
    rewriteLinks(document);
    bindSettingsButton();
    markCurrentAccountItem();
    normalizeDogAboutPage();
  };

  const start = () => {
    document.documentElement.dataset.dogAccountContext = "true";
    document.body.classList.add("dog-theme", "dog-account-context");
    document.body.dataset.species = "dog";
    sessionStorage.setItem("catmatch_account_species", "dog");

    ensureStyles();
    replaceHeader();
    updateDocumentMetadata();
    normalizeDogAccount();
    createSnow();
    loadDogHeaderController();

    let queued = false;
    const observer = new MutationObserver((records) => {
      if (queued) return;
      if (!records.some((record) => record.type === "childList" || record.type === "characterData")) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        normalizeDogAccount();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
