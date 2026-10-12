"use strict";

const AUTH_KEYS = ["catmatch_token", "userToken", "token", "catmatch_user", "user", "catmatch_farm_token", "farm_token", "farmToken", "catmatch_farm", "farm"];
const SETTINGS_PARAMS = new URLSearchParams(window.location.search);
const IS_FARM_CONTEXT = SETTINGS_PARAMS.get("from") === "farm";
const IS_DOG_CONTEXT = SETTINGS_PARAMS.get("species") === "dog";

const DEFAULT_SETTINGS = {
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

let settingsState = { ...DEFAULT_SETTINGS };
let toastTimer = 0;

window.addEventListener("DOMContentLoaded", initializeSettingsPage);

async function initializeSettingsPage() {
  if (!IS_FARM_CONTEXT && window.CatMatchUserSession?.ensure) {
    await window.CatMatchUserSession.ensure().catch((error) => {
      console.warn("Settings session validation failed:", error);
    });
  }

  if (!getToken()) {
    window.location.replace(
      IS_DOG_CONTEXT
        ? "./login.html?return=settings&species=dog"
        : "./login.html?return=settings"
    );
    return;
  }

  settingsState = loadSettings();
  applyFarmContextLinks();
  applyDogContext();
  setupAccountNavigation();
  setupMenus();
  setupSettingsControls();
  setupSectionTracking();
  applySettings();
}



function applyDogContext() {
  if (!IS_DOG_CONTEXT || IS_FARM_CONTEXT) return;

  document.documentElement.dataset.dogAccountContext = "true";
  document.body.classList.add("dog-theme", "dog-account-context");
  document.body.dataset.species = "dog";
  sessionStorage.setItem("catmatch_account_species", "dog");
  document.title = "การตั้งค่า — DogMatch";

  const replacements = [
    [/CatMatch/g, "DogMatch"],
    [/CATMATCH/g, "DOGMATCH"],
    [/แมว/g, "สุนัข"],
    [/กลีบดอกไม้/g, "เกล็ดหิมะ"],
    [/ภาพเคลื่อนไหวซากุระ/g, "ภาพเคลื่อนไหวหิมะ"],
  ];

  const replaceValue = (value) => {
    let next = String(value || "");
    replacements.forEach(([pattern, replacement]) => {
      next = next.replace(pattern, replacement);
    });
    return next;
  };

  const walker = document.createTreeWalker(
    document.body,
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

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    node.nodeValue = replaceValue(node.nodeValue);
  });

  document.querySelectorAll("[title],[aria-label],[placeholder]").forEach((element) => {
    ["title", "aria-label", "placeholder"].forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      element.setAttribute(attribute, replaceValue(element.getAttribute(attribute)));
    });
  });

  const pageMap = new Map([
    ["index.html", "dog-index.html"],
    ["assessment.html", "dog-assessment.html"],
    ["assessment-history.html", "dog-assessment-history.html"],
    ["result.html", "dog-result.html"],
    ["cat-breeds.html", "dog-breeds.html"],
    ["cat_detail.html", "dog-detail.html"],
    ["farm-map.html", "dog-farm-map.html"],
  ]);

  document.querySelectorAll("a[href]").forEach((link) => {
    const raw = link.getAttribute("href") || "";
    if (!raw || /^(#|mailto:|tel:|javascript:)/i.test(raw)) return;

    try {
      const url = new URL(raw, window.location.href);
      if (url.origin !== window.location.origin) return;

      let page = url.pathname.split("/").pop()?.toLowerCase() || "";
      const mapped = pageMap.get(page);
      if (mapped) {
        page = mapped;
        url.pathname = url.pathname.replace(/[^/]+$/, mapped);
      }

      if ([
        "adoption-requests.html",
        "notifications.html",
        "favorites.html",
        "account-info.html",
        "settings.html",
        "about.html",
        "dog-assessment.html",
        "dog-assessment-history.html",
        "dog-result.html",
        "dog-farm-map.html",
      ].includes(page)) {
        url.searchParams.set("species", "dog");
      }

      link.setAttribute("href", `./${page}${url.search}${url.hash}`);
    } catch (_error) {
      // คงลิงก์เดิมถ้าแปลงไม่ได้
    }
  });

  const footerHome = document.querySelector(".notifications-footer a, .settings-footer a");
  if (footerHome) footerHome.href = "./dog-index.html";
}

function applyFarmContextLinks() {
  if (!IS_FARM_CONTEXT) return;

  document.body.classList.add("is-farm-settings");
  document.title = "การตั้งค่าฟาร์ม — CatMatch";

  document.querySelectorAll('a[href="./index.html"]').forEach((link) => {
    link.href = "./farm.html";
  });

  document.querySelectorAll('a[href="./account-info.html"]').forEach((link) => {
    link.href = "./farm.html?panel=profile";
    const title = link.querySelector("strong");
    const detail = link.querySelector("small");
    if (title) title.textContent = "โปรไฟล์ฟาร์ม";
    if (detail) detail.textContent = "รูปโปรไฟล์ ข้อมูลติดต่อ ที่อยู่ และตำแหน่งฟาร์ม";
  });

  document.querySelectorAll('a[href="./settings.html"]').forEach((link) => {
    link.href = "./settings.html?from=farm";
  });

  document.querySelectorAll(
    'a[href="./notifications.html"],a[href="./favorites.html"],a[href="./adoption-requests.html"]'
  ).forEach((link) => {
    link.closest(".account-menu-group")?.setAttribute("hidden", "");
  });

  const mainNav = document.getElementById("mainNav");
  if (mainNav) {
    mainNav.innerHTML = '<a class="nav-link" href="./farm.html"><span>← กลับศูนย์จัดการฟาร์ม</span></a>';
  }

  const brandSmall = document.querySelector(".brand-text small");
  if (brandSmall) brandSmall.textContent = "ศูนย์จัดการฟาร์ม";

  const triggerLabel = document.querySelector("#userMenuTrigger .user-summary small");
  if (triggerLabel) triggerLabel.textContent = "บัญชีฟาร์ม";

  const menuLabel = document.querySelector("#userMenuPanel .account-menu-group:not([hidden]) .account-menu-label");
  if (menuLabel) menuLabel.textContent = "จัดการบัญชีฟาร์ม";

  const currentSettingsItem = document.querySelector('#userMenuPanel a[href^="./settings.html"] span:last-child small');
  if (currentSettingsItem) currentSettingsItem.textContent = "ตั้งค่าการใช้งานสำหรับบัญชีฟาร์ม";

  const heroEyebrow = document.querySelector(".settings-eyebrow");
  if (heroEyebrow) heroEyebrow.textContent = "FARM SETTINGS";

  const heroTitle = document.querySelector(".settings-hero h1");
  if (heroTitle) heroTitle.textContent = "การตั้งค่าฟาร์ม";

  const heroText = document.querySelector(".settings-hero p:last-child");
  if (heroText) {
    heroText.textContent = "จัดการการแสดงผล การแจ้งเตือนคำขอ และข้อมูลที่ผู้ใช้มองเห็นจากฟาร์มของคุณ";
  }

  const sidebar = document.querySelector(".settings-sidebar");
  if (sidebar) {
    sidebar.innerHTML = `
      <a class="is-active" href="#appearance"><span>☼</span>การแสดงผล</a>
      <a href="#notifications"><span>◷</span>การแจ้งเตือนฟาร์ม</a>
      <a href="#privacy"><span>⌂</span>การแสดงข้อมูลฟาร์ม</a>
      <a href="#account"><span>♙</span>บัญชีฟาร์ม</a>
    `;
  }

  const notifications = document.getElementById("notifications");
  if (notifications) {
    notifications.innerHTML = `
      <div class="settings-card-heading">
        <span class="settings-card-icon">◷</span>
        <div><p>FARM NOTIFICATIONS</p><h2>การแจ้งเตือนฟาร์ม</h2><small>เลือกเหตุการณ์สำคัญที่เจ้าของฟาร์มต้องการรับทราบ</small></div>
      </div>
      <div class="settings-row">
        <div><strong>คำขออุปการะใหม่</strong><small>แจ้งเตือนเมื่อผู้ใช้ส่งคำขอเกี่ยวกับแมวในฟาร์ม</small></div>
        <label class="switch"><input id="newAdoptionRequests" type="checkbox"><span></span></label>
      </div>
      <div class="settings-row">
        <div><strong>การเปลี่ยนแปลงสถานะคำขอ</strong><small>แจ้งเตือนเมื่อคำขอถูกยกเลิกหรือมีข้อมูลใหม่</small></div>
        <label class="switch"><input id="requestStatusChanges" type="checkbox"><span></span></label>
      </div>
      <div class="settings-row">
        <div><strong>ประกาศสำหรับเจ้าของฟาร์ม</strong><small>รับข่าวสารเรื่องการตรวจสอบฟาร์มและการอัปเดตระบบ</small></div>
        <label class="switch"><input id="farmSystemUpdates" type="checkbox"><span></span></label>
      </div>
    `;
  }

  const privacy = document.getElementById("privacy");
  if (privacy) {
    privacy.innerHTML = `
      <div class="settings-card-heading">
        <span class="settings-card-icon">⌂</span>
        <div><p>FARM VISIBILITY</p><h2>การแสดงข้อมูลฟาร์ม</h2><small>ควบคุมข้อมูลฟาร์มที่แสดงต่อผู้ใช้งาน</small></div>
      </div>
      <div class="settings-row">
        <div><strong>แสดงโปรไฟล์ฟาร์ม</strong><small>ให้ฟาร์มปรากฏในรายการฟาร์มที่ผ่านการยืนยัน</small></div>
        <label class="switch"><input id="farmProfileVisible" type="checkbox"><span></span></label>
      </div>
      <div class="settings-row">
        <div><strong>แสดงช่องทางติดต่อ</strong><small>แสดงเบอร์โทร เว็บไซต์ และช่องทางติดต่อที่ฟาร์มบันทึกไว้</small></div>
        <label class="switch"><input id="showFarmContact" type="checkbox"><span></span></label>
      </div>
      <div class="settings-row">
        <div><strong>แสดงตำแหน่งบนแผนที่</strong><small>ให้ผู้ใช้ค้นหาฟาร์มใกล้เคียงจากหมุดที่ฟาร์มปักไว้</small></div>
        <label class="switch"><input id="showFarmLocation" type="checkbox"><span></span></label>
      </div>
    `;
  }

  const account = document.getElementById("account");
  if (account) {
    account.innerHTML = `
      <div class="settings-card-heading">
        <span class="settings-card-icon">♙</span>
        <div><p>FARM ACCOUNT &amp; SECURITY</p><h2>บัญชีฟาร์มและความปลอดภัย</h2><small>จัดการโปรไฟล์และการเข้าสู่ระบบของเจ้าของฟาร์ม</small></div>
      </div>
      <a class="settings-action" href="./farm.html?panel=profile">
        <span><strong>แก้ไขโปรไฟล์ฟาร์ม</strong><small>รูปโปรไฟล์ ข้อมูลติดต่อ ที่อยู่ และตำแหน่งฟาร์ม</small></span><b>›</b>
      </a>
      <a class="settings-action" href="./forgot-password.html?role=farm">
        <span><strong>เปลี่ยนหรือรีเซ็ตรหัสผ่านฟาร์ม</strong><small>ดำเนินการด้วยอีเมลที่ใช้สมัครบัญชีฟาร์ม</small></span><b>›</b>
      </a>
      <button class="settings-action settings-logout" id="settingsLogoutButton" type="button">
        <span><strong>ออกจากระบบฟาร์ม</strong><small>ออกจากศูนย์จัดการฟาร์มบนอุปกรณ์นี้</small></span><b>↪</b>
      </button>
    `;
  }
}

function readStoredJSON(key) {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const value = JSON.parse(storage.getItem(key) || "null");
      if (value) return value;
    } catch (_error) {
      // ข้ามค่าที่อ่านไม่ได้
    }
  }
  return null;
}

function getToken() {
  const keys = IS_FARM_CONTEXT
    ? ["catmatch_farm_token", "farm_token", "farmToken"]
    : ["catmatch_token", "userToken", "token"];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of keys) {
      const token = storage.getItem(key);
      if (token) return token;
    }
  }
  return "";
}

function getStoredUser() {
  if (IS_FARM_CONTEXT) {
    return readStoredJSON("catmatch_farm") || readStoredJSON("farm") || {};
  }
  return readStoredJSON("catmatch_user") || readStoredJSON("user") || {};
}

function clearAuth() {
  const keys = IS_FARM_CONTEXT
    ? ["catmatch_farm_token", "farm_token", "farmToken", "catmatch_farm", "farm"]
    : ["catmatch_token", "userToken", "token", "catmatch_user", "user"];

  for (const storage of [localStorage, sessionStorage]) {
    keys.forEach((key) => storage.removeItem(key));
  }
}

function resolveFarmImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:|https?:)/i.test(raw)) return raw;
  const base = String(window.CATMATCH_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

function renderSettingsAvatar(element, imageUrl, initial, name) {
  if (!element) return;
  element.style.overflow = "hidden";
  element.style.padding = "0";
  element.style.borderRadius = "50%";
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `รูปโปรไฟล์ ${name}`;
    image.decoding = "async";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    element.replaceChildren(image);
  } else {
    element.textContent = initial;
  }
}

function setupAccountNavigation() {
  const user = getStoredUser();
  const name = String(
    IS_FARM_CONTEXT
      ? (user.farm_name || user.owner_name || "ฟาร์มของคุณ")
      : (user.username || user.full_name || user.name || "ผู้ใช้งาน")
  ).trim();
  const email = String(user.email || "").trim();
  const initial = name.charAt(0).toUpperCase() || "U";

  const values = {
    userDisplayName: name,
    userMenuName: name,
    userMenuEmail: email,
    userAvatar: initial,
    userMenuAvatar: initial,
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  if (IS_FARM_CONTEXT) {
    const farmImage = resolveFarmImageUrl(user.profile_image || user.image_url || "");
    renderSettingsAvatar(document.getElementById("userAvatar"), farmImage, initial, name);
    renderSettingsAvatar(document.getElementById("userMenuAvatar"), farmImage, initial, name);
  }

  const actions = document.getElementById("userNavActions");
  if (actions) actions.hidden = false;

  const logout = async (event) => {
    event?.preventDefault?.();

    if (!IS_FARM_CONTEXT && window.CatMatchUserSession?.logout) {
      await window.CatMatchUserSession.logout({
        redirectTo: IS_DOG_CONTEXT ? "./dog-index.html" : "./login.html",
      });
      return;
    }

    clearAuth();
    await window.catmatchFirebase?.signOut?.().catch(() => {});
    window.location.replace(
      IS_FARM_CONTEXT
        ? "./login.html?role=farm"
        : (IS_DOG_CONTEXT ? "./dog-index.html" : "./login.html")
    );
  };

  document.getElementById("logoutButton")?.addEventListener("click", logout);
  document.getElementById("settingsLogoutButton")?.addEventListener("click", logout);
}

function setupMenus() {
  const trigger = document.getElementById("userMenuTrigger");
  const panel = document.getElementById("userMenuPanel");
  const menuToggle = document.getElementById("menuToggle");
  const header = document.getElementById("siteHeader");

  const closeUserMenu = () => {
    if (!panel || !trigger) return;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };

  trigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = panel?.hidden ?? true;
    if (panel) panel.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", String(willOpen));
  });

  panel?.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", closeUserMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeUserMenu();
  });

  menuToggle?.addEventListener("click", () => {
    const open = header?.classList.toggle("menu-open") ?? false;
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  window.addEventListener("scroll", () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive: true });
}

function loadSettings() {
  if (window.CatMatchSettings) {
    return { ...DEFAULT_SETTINGS, ...window.CatMatchSettings.get() };
  }
  return { ...DEFAULT_SETTINGS };
}

function setupSettingsControls() {
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.checked = input.value === settingsState.theme;
    input.addEventListener("change", () => updateSetting("theme", input.value));
  });

  const settingKeys = IS_FARM_CONTEXT
    ? ["sakuraMotion", "reducedMotion", "newAdoptionRequests", "requestStatusChanges", "farmSystemUpdates", "farmProfileVisible", "showFarmContact", "showFarmLocation"]
    : ["sakuraMotion", "reducedMotion", "farmResponses", "recommendationUpdates", "productUpdates", "saveAssessmentHistory", "personalizedRecommendations"];

  settingKeys.forEach((key) => {
      const input = document.getElementById(key);
      if (!input) return;
      input.checked = Boolean(settingsState[key]);
      input.addEventListener("change", () => updateSetting(key, input.checked));
    });
}

function updateSetting(key, value) {
  settingsState[key] = value;
  if (window.CatMatchSettings) {
    settingsState = window.CatMatchSettings.save({ [key]: value });
  }
  applySettings();
  showSavedState();
}

function applySettings() {
  if (window.CatMatchSettings) {
    window.CatMatchSettings.apply();
    settingsState = { ...DEFAULT_SETTINGS, ...window.CatMatchSettings.get() };
    return;
  }

  const root = document.documentElement;
  root.dataset.catmatchTheme = "light";
  root.dataset.reducedMotion = "false";
  root.dataset.sakuraMotion = "true";
}

function showSavedState() {
  const state = document.getElementById("settingsSaveState");
  const toast = document.getElementById("settingsToast");

  if (state) {
    state.textContent = "บันทึกแล้ว";
    window.setTimeout(() => { state.textContent = "บันทึกอัตโนมัติ"; }, 1400);
  }

  if (toast) {
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }
}

function setupSectionTracking() {
  const links = [...document.querySelectorAll(".settings-sidebar a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    links.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  }, { rootMargin: "-18% 0px -65%", threshold: [0.1, 0.35, 0.6] });

  sections.forEach((section) => observer.observe(section));
}
