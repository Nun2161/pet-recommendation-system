"use strict";

const API_BASE_URL = window.CATMATCH_API_URL;

const AUTH_STORAGE_KEYS = [
  "catmatch_token",
  "userToken",
  "token",
  "catmatch_user",
  "user"
];

const FAVORITE_FALLBACK_IMAGE =
  "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg";

const FAVORITE_DOG_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80";

const FAVORITE_SPECIES =
  new URLSearchParams(window.location.search).get("species") === "dog"
    ? "dog"
    : "cat";

const IS_DOG_FAVORITES = FAVORITE_SPECIES === "dog";
const DOG_FAVORITES_STORAGE_PREFIX = "dogmatch_favorite_dogs_v1";
const DOG_FAVORITES_SHARED_KEY = "dogmatch_favorite_dogs_v2";
const DOG_FAVORITE_RECORDS_SHARED_KEY = "dogmatch_favorite_dog_records_v2";

const pendingRemovals =
  new Set();

function getFavoriteLoginUrl() {
  return IS_DOG_FAVORITES
    ? "./login.html?return=favorites&species=dog"
    : "./login.html?return=favorites";
}

function setFavoriteText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function applyFavoriteSpeciesCopy() {
  if (!IS_DOG_FAVORITES) return;

  document.documentElement.dataset.favoriteSpecies = "dog";
  document.body.classList.add("dog-favorites-page");
  document.title = "สุนัขที่ถูกใจ — DogMatch";

  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = "รายการสายพันธุ์สุนัขที่บันทึกไว้ในบัญชี DogMatch";

  const brand = document.querySelector(".site-header .brand");
  if (brand) {
    brand.href = "./dog-index.html";
    brand.setAttribute("aria-label", "DogMatch หน้าแรก");
    const logo = brand.querySelector(".brand-logo");
    if (logo) {
      logo.innerHTML = `
        <svg aria-label="โลโก้สุนัขหน้ากลมของ DogMatch" class="cute-dog-icon dogmatch-round-dog" role="img" viewBox="0 0 64 64">
          <path class="dog-logo-ear" d="M20.2 22.2C16.5 18.7 11.4 19.1 9.8 25.1c-2 7.5.6 14.8 6.3 18 2.6 1.5 5.2.5 6.6-2.1 1.5-2.9.7-6.8.2-10.2-.5-3.4-.7-6.3-2.7-8.6Z"></path>
          <path class="dog-logo-ear" d="M43.8 22.2c3.7-3.5 8.8-3.1 10.4 2.9 2 7.5-.6 14.8-6.3 18-2.6 1.5-5.2.5-6.6-2.1-1.5-2.9-.7-6.8-.2-10.2.5-3.4.7-6.3 2.7-8.6Z"></path>
          <path class="dog-logo-face" d="M32 12.5c-10.5 0-17.4 7.4-17.4 19 0 12.8 7 21.2 17.4 21.2s17.4-8.4 17.4-21.2c0-11.6-6.9-19-17.4-19Z"></path>
          <circle class="dog-logo-eye" cx="27.4" cy="31.9" r="1.55"></circle>
          <circle class="dog-logo-eye" cx="36.6" cy="31.9" r="1.55"></circle>
          <path class="dog-logo-nose" d="M29.5 37.5c1.6-1.15 3.4-1.15 5 0-1 1.7-1.7 2.45-2.5 2.45s-1.5-.75-2.5-2.45Z"></path>
          <path class="dog-logo-mouth" d="M32 39.9v1.25M32 41.1c-1.2 2.8-4.4 4-6.8 1.2M32 41.1c1.2 2.8 4.4 4 6.8 1.2"></path>
        </svg>`;
    }
  }

  setFavoriteText(".brand-text strong", "DogMatch");
  setFavoriteText(".brand-text small", "สุนัขที่ใช่ สำหรับคุณ");

  const navLinks = [...document.querySelectorAll(".site-header .main-nav .nav-link")];
  [
    ["./dog-index.html", "หน้าหลัก"],
    ["./dog-assessment.html?species=dog", "แบบประเมิน"],
    ["./dog-breeds.html", "หมาของเรา"],
    ["./about.html?species=dog", "เกี่ยวกับเรา"]
  ].forEach(([href, label], index) => {
    const link = navLinks[index];
    if (!link) return;
    link.href = href;
    const labelElement = link.querySelector("span");
    if (labelElement) labelElement.textContent = label;
  });

  const accountLinks = [...document.querySelectorAll(".account-menu-item[href]")];
  accountLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.includes("adoption-requests.html") || href.includes("notifications.html") || href.includes("account-info.html")) {
      const separator = href.includes("?") ? "&" : "?";
      if (!href.includes("species=dog")) link.href = `${href}${separator}species=dog`;
    }
  });

  const currentFavoriteLink = document.querySelector(".account-menu-item.is-current");
  if (currentFavoriteLink) currentFavoriteLink.href = "./favorites.html?species=dog";
  setFavoriteText(".account-menu-item.is-current strong", "สุนัขที่ถูกใจ");
  setFavoriteText(".account-menu-item.is-current small", "สายพันธุ์สุนัขที่คุณบันทึกไว้");
  setFavoriteText("#accountSettingsButton small", "ตั้งค่าการใช้งาน DogMatch");

  setFavoriteText(".favorites-eyebrow", "MY FAVORITE DOGS");
  setFavoriteText(".favorites-heading h1", "สุนัขที่ถูกใจ");
  setFavoriteText(".favorites-heading > p:last-child", "รวมสายพันธุ์สุนัขที่คุณบันทึกไว้ในบัญชีนี้");

  const browseButton = document.querySelector(".favorites-browse-button");
  if (browseButton) {
    browseButton.href = "./dog-breeds.html";
    browseButton.innerHTML = 'ดูสุนัขทั้งหมด <span aria-hidden="true">→</span>';
  }

  setFavoriteText("#favoritesLoading strong", "กำลังโหลดสุนัขที่ถูกใจ...");
  setFavoriteText("#favoritesEmpty h2", "ยังไม่มีสุนัขที่ถูกใจ");
  setFavoriteText("#favoritesEmpty p", "เมื่อกดหัวใจบนการ์ดสายพันธุ์สุนัข รายการที่บันทึกไว้จะมาแสดงในหน้านี้");

  const emptyBrowse = document.querySelector("#favoritesEmpty a");
  if (emptyBrowse) {
    emptyBrowse.href = "./dog-breeds.html";
    emptyBrowse.innerHTML = 'เลือกดูสายพันธุ์สุนัข <span aria-hidden="true">→</span>';
  }

  setFavoriteText(".favorites-footer span", "© 2026 DogMatch");
  const footerLink = document.querySelector(".favorites-footer a");
  if (footerLink) footerLink.href = "./dog-index.html";
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    applyFavoriteSpeciesCopy();

    const authenticated =
      setupFavoriteAccount();

    if (!authenticated) {
      return;
    }

    setupMobileMenu();
    setupFavoriteActions();

    if (IS_DOG_FAVORITES) {
      await ensureDogBreedData();
    }

    void loadFavorites();
  }
);

/* =========================================================
   AUTHENTICATION
   ========================================================= */

function readStoredJSON(key) {
  for (
    const storage of [
      localStorage,
      sessionStorage
    ]
  ) {
    const raw =
      storage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      // ข้ามค่าที่ไม่ใช่ JSON
    }
  }

  return null;
}

function getStoredToken() {
  const tokenKeys = [
    "catmatch_token",
    "userToken",
    "token"
  ];

  for (
    const storage of [
      localStorage,
      sessionStorage
    ]
  ) {
    for (
      const key of tokenKeys
    ) {
      const token =
        storage.getItem(key);

      if (token) {
        return token;
      }
    }
  }

  return "";
}

function getStoredUser() {
  return (
    readStoredJSON(
      "catmatch_user"
    ) ||
    readStoredJSON("user") ||
    null
  );
}

function clearAuthentication() {
  for (
    const storage of [
      localStorage,
      sessionStorage
    ]
  ) {
    AUTH_STORAGE_KEYS.forEach(
      (key) => {
        storage.removeItem(key);
      }
    );
  }
}

function getDisplayName(user) {
  const username =
    String(
      user?.username || ""
    ).trim();

  const fullName =
    String(
      user?.full_name ||
      user?.name ||
      ""
    ).trim();

  if (username) {
    return username;
  }

  if (fullName) {
    return fullName;
  }

  return "ผู้ใช้งาน";
}

/* =========================================================
   ACCOUNT MENU
   ========================================================= */

function setupFavoriteAccount() {
  const token =
    getStoredToken();

  const user =
    getStoredUser();

  if (!token || !user) {
    window.location.replace(
      getFavoriteLoginUrl()
    );

    return false;
  }

  const guestActions =
    document.getElementById(
      "guestNavActions"
    );

  const userActions =
    document.getElementById(
      "userNavActions"
    );

  if (guestActions) {
    guestActions.hidden = true;

    guestActions.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  if (userActions) {
    userActions.hidden = false;

    userActions.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  const displayName =
    getDisplayName(user);

  const email =
    String(
      user?.email || ""
    ).trim();

  const initial =
    displayName
      .charAt(0)
      .toUpperCase() || "U";

  const accountValues = {
    userDisplayName:
      displayName,

    userMenuName:
      displayName,

    userMenuEmail:
      email,

    userAvatar:
      initial,

    userMenuAvatar:
      initial
  };

  Object.entries(
    accountValues
  ).forEach(
    ([id, value]) => {
      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = value;
      }
    }
  );

  setupAccountDropdown();
  setupAccountButtons();

  return true;
}

function setupAccountDropdown() {
  const menuTrigger =
    document.getElementById(
      "userMenuTrigger"
    );

  const menuPanel =
    document.getElementById(
      "userMenuPanel"
    );

  if (
    !menuTrigger ||
    !menuPanel
  ) {
    return;
  }

  /*
   * ย้ายเมนูไปไว้ใต้ body
   * ป้องกันการถูก Header บัง
   */
  document.body.appendChild(
    menuPanel
  );

  function positionMenu() {
    if (menuPanel.hidden) {
      return;
    }

    const triggerRect =
      menuTrigger
        .getBoundingClientRect();

    const panelWidth =
      Math.min(
        360,
        window.innerWidth - 24
      );

    const left =
      Math.max(
        12,
        Math.min(
          triggerRect.right -
          panelWidth,

          window.innerWidth -
          panelWidth -
          12
        )
      );

    const availableBottom =
      window.innerHeight - 16;

    const preferredTop =
      triggerRect.bottom + 10;

    menuPanel.style.width =
      `${panelWidth}px`;

    menuPanel.style.left =
      `${left}px`;

    menuPanel.style.top =
      `${Math.min(
        preferredTop,
        availableBottom
      )}px`;
  }

  function closeMenu() {
    menuTrigger.setAttribute(
      "aria-expanded",
      "false"
    );

    menuPanel.classList.remove(
      "is-open"
    );

    menuPanel.hidden = true;
  }

  function openMenu() {
    menuPanel.hidden = false;

    menuPanel.classList.add(
      "is-open"
    );

    menuTrigger.setAttribute(
      "aria-expanded",
      "true"
    );

    positionMenu();
  }

  menuTrigger.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      const isOpen =
        menuTrigger.getAttribute(
          "aria-expanded"
        ) === "true";

      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }
  );

  menuPanel.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
    }
  );

  document.addEventListener(
    "click",
    closeMenu
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape"
      ) {
        closeMenu();
      }
    }
  );

  window.addEventListener(
    "resize",
    positionMenu
  );

  window.addEventListener(
    "scroll",
    positionMenu,
    {
      passive: true
    }
  );
}

function setupAccountButtons() {
  const accountSettingsButton =
    document.getElementById(
      "accountSettingsButton"
    );

  const logoutButton =
    document.getElementById(
      "logoutButton"
    );

  accountSettingsButton
    ?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        window.location.href =
          IS_DOG_FAVORITES
            ? "./settings.html?species=dog"
            : "./settings.html";
      }
    );

  logoutButton
    ?.addEventListener(
      "click",
      () => {
        clearAuthentication();

        window.location.replace(
          IS_DOG_FAVORITES
            ? "./dog-index.html"
            : "./index.html"
        );
      }
    );
}

/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {
  const menuToggle =
    document.getElementById(
      "menuToggle"
    );

  const mainNav =
    document.getElementById(
      "mainNav"
    );

  if (
    !menuToggle ||
    !mainNav
  ) {
    return;
  }

  menuToggle.addEventListener(
    "click",
    () => {
      const isOpen =
        menuToggle.getAttribute(
          "aria-expanded"
        ) === "true";

      menuToggle.setAttribute(
        "aria-expanded",
        String(!isOpen)
      );

      mainNav.classList.toggle(
        "is-open",
        !isOpen
      );
    }
  );

  mainNav
    .querySelectorAll("a")
    .forEach((link) => {
      link.addEventListener(
        "click",
        () => {
          menuToggle.setAttribute(
            "aria-expanded",
            "false"
          );

          mainNav.classList.remove(
            "is-open"
          );
        }
      );
    });
}

/* =========================================================
   PAGE ACTIONS
   ========================================================= */

function setupFavoriteActions() {
  const refreshButton =
    document.getElementById(
      "refreshFavorites"
    );

  const retryButton =
    document.getElementById(
      "retryFavorites"
    );

  const favoritesGrid =
    document.getElementById(
      "favoritesGrid"
    );

  refreshButton
    ?.addEventListener(
      "click",
      () => {
        void loadFavorites();
      }
    );

  retryButton
    ?.addEventListener(
      "click",
      () => {
        void loadFavorites();
      }
    );

  favoritesGrid
    ?.addEventListener(
      "click",
      async (event) => {
        const removeButton =
          event.target.closest(
            ".favorite-remove-button[data-breed-id]"
          );

        if (!removeButton) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const breedId =
          Number(
            removeButton
              .dataset
              .breedId
          );

        if (
          !Number.isInteger(
            breedId
          ) ||
          breedId <= 0 ||
          pendingRemovals.has(
            breedId
          )
        ) {
          return;
        }

        await handleRemoveFavorite(
          breedId,
          removeButton
        );
      }
    );
}

function collectStoredDogUsers() {
  const users = [];
  [sessionStorage, localStorage].forEach((storage) => {
    ["catmatch_user", "user"].forEach((key) => {
      try {
        const value = JSON.parse(storage.getItem(key) || "null");
        if (value && typeof value === "object") users.push(value);
      } catch (_error) {}
    });
  });
  return users;
}

function getDogFavoriteStorageKeys() {
  const identifiers = collectStoredDogUsers()
    .flatMap((user) => [user.firebase_uid, user.uid, user.user_id, user.id, user.email, user.username])
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(identifiers)];
  return [
    DOG_FAVORITES_SHARED_KEY,
    ...unique.map((id) => `${DOG_FAVORITES_STORAGE_PREFIX}:${id}`),
    ...unique.map((id) => `${DOG_FAVORITES_SHARED_KEY}:${id}`)
  ];
}

function ensureDogBreedData() {
  if (Array.isArray(window.DOGMATCH_DOG_BREEDS) && window.DOGMATCH_DOG_BREEDS.length) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-dog-favorite-breed-data="true"]');
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", resolve, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `../js/dog-breed-data.js?v=12&ts=${Date.now()}`;
    script.dataset.dogFavoriteBreedData = "true";
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = resolve;
    document.head.appendChild(script);
  });
}

function getDogFavoriteIds() {
  const merged = new Set();
  const keys = new Set(getDogFavoriteStorageKeys());
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(`${DOG_FAVORITES_STORAGE_PREFIX}:`)) keys.add(key);
  }
  [localStorage, sessionStorage].forEach((storage) => {
    keys.forEach((key) => {
      try {
        const value = JSON.parse(storage.getItem(key) || "[]");
        (Array.isArray(value) ? value : value?.ids || [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0)
          .forEach((id) => merged.add(id));
      } catch (_error) {}
    });
    try {
      const records = JSON.parse(storage.getItem(DOG_FAVORITE_RECORDS_SHARED_KEY) || "{}") || {};
      Object.keys(records)
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
        .forEach((id) => merged.add(id));
    } catch (_error) {}
  });
  return [...merged].sort((first, second) => first - second);
}

function saveDogFavoriteIds(ids) {
  const normalized = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    .sort((first, second) => first - second);
  const value = JSON.stringify(normalized);
  getDogFavoriteStorageKeys().forEach((key) => {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  });
}

function getStoredDogFavoriteRecords() {
  const merged = {};
  [localStorage, sessionStorage].forEach((storage) => {
    try {
      const records = JSON.parse(storage.getItem(DOG_FAVORITE_RECORDS_SHARED_KEY) || "{}") || {};
      Object.assign(merged, records);
    } catch (_error) {}
  });
  return merged;
}

function saveStoredDogFavoriteRecords(records) {
  const value = JSON.stringify(records || {});
  localStorage.setItem(DOG_FAVORITE_RECORDS_SHARED_KEY, value);
  sessionStorage.setItem(DOG_FAVORITE_RECORDS_SHARED_KEY, value);
}

function loadDogFavoriteRecords() {
  const rows = Array.isArray(window.DOGMATCH_DOG_BREEDS)
    ? window.DOGMATCH_DOG_BREEDS
    : [];
  const rowMap = new Map(
    rows.map((row) => [Number(row.breed_id || row.source_order || 0), row])
  );
  const storedRecords = getStoredDogFavoriteRecords();

  return getDogFavoriteIds()
    .map((id) => rowMap.get(id) || storedRecords[String(id)] || null)
    .filter(Boolean)
    .map((row) => ({
      ...row,
      breed_id: Number(row.breed_id || row.source_order || 0),
      image_url: row.image_url || FAVORITE_DOG_FALLBACK_IMAGE,
      description:
        row.description ||
        `ดูรายละเอียด ลักษณะนิสัย และข้อมูลสำคัญของ ${row.breed_name || "สุนัขสายพันธุ์นี้"}`
    }));
}

/* =========================================================
   LOAD FAVORITES
   ========================================================= */

async function loadFavorites() {
  const token =
    getStoredToken();

  if (!token) {
    window.location.replace(
      getFavoriteLoginUrl()
    );

    return;
  }

  const refreshButton =
    document.getElementById(
      "refreshFavorites"
    );

  setPageState("loading");

  if (refreshButton) {
    refreshButton.disabled = true;

    refreshButton.textContent =
      "กำลังโหลด...";
  }

  try {
    if (IS_DOG_FAVORITES) {
      renderFavorites(loadDogFavoriteRecords());
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/favorites`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${token}`
        },

        cache: "no-store"
      }
    );

    const result =
      await response
        .json()
        .catch(() => ({}));

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      clearAuthentication();

      window.location.replace(
        getFavoriteLoginUrl()
      );

      return;
    }

  const favorites =
  Array.isArray(result.data)
    ? result.data
    : [];

/*
 * กรณีไม่มีรายการโปรด
 * ให้แสดงหน้าว่าง ไม่ใช่ข้อความ Error
 */
const resultMessage =
  String(
    result.message || ""
  );

const isEmptyFavoriteResult =
  (
    response.ok &&
    result.success !== false &&
    favorites.length === 0
  ) ||
  (
    response.status === 404 &&
    (
      resultMessage.includes(
        "ไม่พบรายการ"
      ) ||
      resultMessage.includes(
        "ยังไม่มี"
      ) ||
      resultMessage.includes(
        "favorite"
      )
    )
  );
if (isEmptyFavoriteResult) {
  renderFavorites([]);
  return;
}

if (
  !response.ok ||
  result.success === false
) {
  throw new Error(
    result.message ||
    "ไม่สามารถโหลดแมวที่ถูกใจได้"
  );
}

renderFavorites(favorites);
  } catch (error) {
    console.error(
      "Load favorites error:",
      error
    );

    setPageState(
      "error",
      error.message
    );
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;

      refreshButton.textContent =
        "โหลดข้อมูลใหม่";
    }
  }
}

/* =========================================================
   RENDER FAVORITES
   ========================================================= */

function renderFavorites(
  favorites
) {
  const favoritesGrid =
    document.getElementById(
      "favoritesGrid"
    );

  if (!favoritesGrid) {
    return;
  }

  updateFavoriteCount(
    favorites.length
  );

  if (!favorites.length) {
    favoritesGrid.innerHTML = "";

    setPageState("empty");

    return;
  }

  favoritesGrid.innerHTML =
    favorites
      .map(
        (favorite) =>
          createFavoriteCard(
            favorite
          )
      )
      .join("");

  setupFavoriteImageFallbacks();

  setPageState("ready");
}

function createFavoriteCard(
  breed
) {
  const breedId =
    Number(
      breed.breed_id
    );

  const breedName =
    String(
      breed.breed_name ||
      "ไม่ระบุสายพันธุ์"
    );

  const knowledge = IS_DOG_FAVORITES
    ? {}
    : (window.CatMatchBreedKnowledge?.get?.(breedId) || {});

  const imageUrl =
    knowledge.image ||
    knowledge.thumbnail ||
    breed.image_url ||
    (IS_DOG_FAVORITES ? FAVORITE_DOG_FALLBACK_IMAGE : FAVORITE_FALLBACK_IMAGE);

  const fallbackImage =
    knowledge.thumbnail ||
    knowledge.image ||
    (IS_DOG_FAVORITES ? FAVORITE_DOG_FALLBACK_IMAGE : FAVORITE_FALLBACK_IMAGE);

  const description =
    String(
      breed.description ||
      knowledge.description ||
      "ดูรายละเอียด ลักษณะนิสัย และข้อมูลสำคัญของสายพันธุ์นี้"
    ).trim();

  const tags =
    buildFavoriteTags(
      breed
    );

  const savedDate =
    formatFavoriteDate(
      breed.favorited_at ||
      breed.created_at
    );

  return `
    <article
      class="favorite-card"
      data-breed-id="${breedId}"
    >
      <div class="favorite-card-image">
        <img
          src="${escapeHTML(
            imageUrl
          )}"
          data-fallback-src="${escapeHTML(
            fallbackImage
          )}"
          alt="${escapeHTML(
            breedName
          )}"
          loading="lazy"
          decoding="async"
        >

        <button
          class="favorite-remove-button"
          type="button"
          data-breed-id="${breedId}"
          aria-label="นำ ${escapeHTML(
            breedName
          )} ออกจาก${IS_DOG_FAVORITES ? "สุนัข" : "แมว"}ที่ถูกใจ"
          title="นำออกจาก${IS_DOG_FAVORITES ? "สุนัข" : "แมว"}ที่ถูกใจ"
        >
          ♥
        </button>
      </div>

      <div class="favorite-card-body">
        <h2>
          ${escapeHTML(
            breedName
          )}
        </h2>

        <p class="favorite-card-description">
          ${escapeHTML(
            truncateText(
              description,
              125
            )
          )}
        </p>

        <div class="favorite-card-tags">
          ${tags
            .map(
              (tag) => `
                <span class="favorite-card-tag">
                  ${escapeHTML(
                    tag
                  )}
                </span>
              `
            )
            .join("")}
        </div>

        <div class="favorite-card-footer">
          <small>
            ${
              savedDate
                ? `บันทึกเมื่อ ${escapeHTML(
                    savedDate
                  )}`
                : "บันทึกไว้ในบัญชีของคุณ"
            }
          </small>

          <a
            href="${IS_DOG_FAVORITES
              ? `./dog-detail.html?id=${breedId}&species=dog`
              : `./cat_detail.html?id=${breedId}`
            }"
          >
            รายละเอียด
            <span aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </div>
    </article>
  `;
}

function setupFavoriteImageFallbacks() {
  document
    .querySelectorAll(
      ".favorite-card-image img"
    )
    .forEach((image) => {
      image.addEventListener(
        "error",
        () => {
          const fallback =
            image.dataset
              .fallbackSrc;

          if (
            fallback &&
            image.src !== fallback
          ) {
            image.src = fallback;
          }
        },
        {
          once: true
        }
      );
    });
}

/* =========================================================
   FAVORITE TAGS
   ========================================================= */

function buildFavoriteTags(
  breed
) {
  const tags = [];

  if (
    Number(
      breed.friendly
    ) >= 4
  ) {
    tags.push(
      "เข้ากับคนง่าย"
    );
  }

  if (
    Number(
      breed.affectionate
    ) >= 4
  ) {
    tags.push(
      "ชอบปฏิสัมพันธ์"
    );
  }

  if (
    Number(
      breed.playful
    ) >= 4
  ) {
    tags.push(
      "ชอบกิจกรรม"
    );
  }

  if (
    Number(
      breed.family_friendly
    ) >= 4
  ) {
    tags.push(
      "เหมาะกับครอบครัว"
    );
  }

  if (
    Number(
      breed.apartment_suitability
    ) >= 4
  ) {
    tags.push(
      "เหมาะกับพื้นที่จำกัด"
    );
  }

  if (
    Number(
      breed.first_time_owner_friendly
    ) >= 4
  ) {
    tags.push(
      "เหมาะกับผู้เลี้ยงครั้งแรก"
    );
  }

  if (
    Number(
      breed.grooming_need
    ) <= 2
  ) {
    tags.push(
      "ดูแลขนไม่ซับซ้อน"
    );
  }

  if (!tags.length) {
    tags.push(
      "สายพันธุ์ที่คุณสนใจ"
    );
  }

  return tags.slice(0, 3);
}

/* =========================================================
   REMOVE FAVORITE
   ========================================================= */

async function handleRemoveFavorite(
  breedId,
  removeButton
) {
  pendingRemovals.add(
    breedId
  );

  removeButton.disabled = true;

  removeButton.textContent =
    "…";

  try {
    await removeFavorite(
      breedId
    );

    const card =
      removeButton.closest(
        ".favorite-card"
      );

    if (card) {
      card.style.opacity = "0";

      card.style.transform =
        "translateY(12px)";

      await wait(180);

      card.remove();
    }

    updateVisibleFavoriteCount();
  } catch (error) {
    console.error(
      "Remove favorite error:",
      error
    );

    removeButton.disabled = false;

    removeButton.textContent =
      "♥";

    await showMessage(
      error.message,
      "นำออกจากรายการไม่ได้"
    );
  } finally {
    pendingRemovals.delete(
      breedId
    );
  }
}

async function removeFavorite(
  breedId
) {
  if (IS_DOG_FAVORITES) {
    const remaining = getDogFavoriteIds().filter((id) => id !== Number(breedId));
    saveDogFavoriteIds(remaining);
    const records = getStoredDogFavoriteRecords();
    delete records[String(breedId)];
    saveStoredDogFavoriteRecords(records);
    return;
  }

  const token =
    getStoredToken();

  const response = await fetch(
    `${API_BASE_URL}/favorites/${breedId}`,
    {
      method: "DELETE",

      headers: {
        Accept:
          "application/json",

        Authorization:
          `Bearer ${token}`
      }
    }
  );

  const result =
    await response
      .json()
      .catch(() => ({}));

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    clearAuthentication();

    window.location.replace(
      getFavoriteLoginUrl()
    );

    throw new Error(
      "กรุณาเข้าสู่ระบบอีกครั้ง"
    );
  }

  if (
    !response.ok ||
    result.success === false
  ) {
    throw new Error(
      result.message ||
      `ไม่สามารถนำ${IS_DOG_FAVORITES ? "สุนัข" : "แมว"}ออกจากรายการที่ถูกใจได้`
    );
  }
}

/* =========================================================
   PAGE STATES
   ========================================================= */

function setPageState(
  state,
  message = ""
) {
  const stateElements = {
    loading:
      document.getElementById(
        "favoritesLoading"
      ),

    error:
      document.getElementById(
        "favoritesError"
      ),

    empty:
      document.getElementById(
        "favoritesEmpty"
      ),

    ready:
      document.getElementById(
        "favoritesGrid"
      )
  };

  Object.entries(
    stateElements
  ).forEach(
    ([name, element]) => {
      if (element) {
        element.hidden =
          name !== state;
      }
    }
  );

  const errorMessage =
    document.getElementById(
      "favoritesErrorMessage"
    );

  if (errorMessage) {
    errorMessage.textContent =
      message;
  }
}

function updateVisibleFavoriteCount() {
  const total =
    document.querySelectorAll(
      ".favorite-card"
    ).length;

  updateFavoriteCount(total);

  if (total === 0) {
    setPageState("empty");
  }
}

function updateFavoriteCount(
  total
) {
  const countElement =
    document.getElementById(
      "favoriteCount"
    );

  if (!countElement) {
    return;
  }

  countElement.textContent =
    `${Number(total)
      .toLocaleString(
        "th-TH"
      )} สายพันธุ์`;
}

/* =========================================================
   HELPERS
   ========================================================= */

function formatFavoriteDate(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  ).format(date);
}

function truncateText(
  value,
  maximumLength
) {
  const text =
    String(
      value || ""
    ).trim();

  if (
    text.length <=
    maximumLength
  ) {
    return text;
  }

  return `${text
    .slice(
      0,
      maximumLength
    )
    .trim()}…`;
}

function wait(milliseconds) {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

async function showMessage(
  message,
  title
) {
  if (
    window
      .CatMatchDialog
      ?.alert
  ) {
    await window
      .CatMatchDialog
      .alert(
        message,
        {
          title,
          icon: "♡"
        }
      );

    return;
  }

  window.alert(
    `${title}\n\n${message}`
  );
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}