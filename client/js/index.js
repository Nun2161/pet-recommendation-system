const API_BASE_URL = window.CATMATCH_API_URL;

const CAT_API_BASE_URL = "https://api.thecatapi.com/v1";
const CAT_IMAGE_CACHE_KEY = "catmatch_breed_image_cache_v1";

const CAT_API_BREED_ALIASES = {
  "american bobtail shorthair": "american shorthair",
  "british longhair": "british longhair",
  "domestic shorthair": "american shorthair",
  "persian longhair": "persian",
  "siamese thai": "siamese"
};

const HOMEPAGE_STATS_REFRESH_TIME =
  10 * 1000;

let homepageStatsTimer = null;
let homepageStatsLoading = false;
let homepageStatsListenersBound = false;
let homepageBreedTotal = 0;

// ใช้เมื่อบริการรูปภายนอกไม่ตอบสนอง เพื่อไม่ให้การ์ดกลับไปใช้รูปเดียวกันทั้งหมด
const BREED_IMAGE_FALLBACKS = {
  "abyssinian": "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg",
  "american bobtail": "https://cdn2.thecatapi.com/images/hBXicehMA.jpg",
  "american bobtail shorthair": "https://cdn2.thecatapi.com/images/JFPROfGtQ.jpg",
  "american shorthair": "https://cdn2.thecatapi.com/images/JFPROfGtQ.jpg",
  "american curl": "https://cdn2.thecatapi.com/images/xnsqonbjW.jpg",
  "bengal": "https://cdn2.thecatapi.com/images/O3btzLlsO.jpg",
  "british shorthair": "https://cdn2.thecatapi.com/images/s4wQfYoEk.jpg",
  "maine coon": "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg",
  "persian": "https://cdn2.thecatapi.com/images/-Zfz5z2jK.jpg",
  "ragdoll": "https://cdn2.thecatapi.com/images/oGefY4YoG.jpg",
  "russian blue": "https://cdn2.thecatapi.com/images/Rhj-JsTLP.jpg",
  "siamese": "https://cdn2.thecatapi.com/images/ai6Jps4sx.jpg",
  "sphynx": "https://cdn2.thecatapi.com/images/BDb8ZXb1v.jpg"
};

const FEATURED_BREED_IDS = [1, 3, 4, 16];
const HOMEPAGE_BREED_ROTATION_TIME =
  5 * 1000;

const HOMEPAGE_BREED_COUNT = 4;

let homepageBreedPool = [];
let homepageMatchScoreMap = new Map();
let homepageRotationTimer = null;
let homepageBreedCursor = HOMEPAGE_BREED_COUNT;
let homepagePreviousBreedSet = "";
let favoriteBreedIds = new Set();
let favoriteRequestPending = new Set();

// ชุดสำรองใช้ชื่อและ URL เดียวกับหน้า “แมวของเรา”
const fallbackBreeds = [
  {
    breed_id: 1,
    breed_name: "Abyssinian",
    image_url: "https://tica.org/wp-content/uploads/2018/08/Ruddy-Aby-Breed-snippet.jpg",
    tags: [
      { label: "ขนสั้น", key: "coat-short" },
      { label: "เข้ากับคนง่าย", key: "friendly" },
      { label: "ชอบกิจกรรม", key: "active" }
    ]
  },
  {
    breed_id: 3,
    breed_name: "American Bobtail",
    image_url: "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Full-Body_.jpg",
    tags: [
      { label: "เข้ากับคนง่าย", key: "friendly" },
      { label: "ชอบกิจกรรม", key: "active" },
      { label: "เหมาะกับครอบครัว", key: "family" }
    ]
  },
  {
    breed_id: 4,
    breed_name: "American Bobtail Shorthair",
    image_url: "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Shorthair-Full-Body.jpg",
    tags: [
      { label: "ขนสั้น", key: "coat-short" },
      { label: "เข้ากับคนง่าย", key: "friendly" },
      { label: "มีความเป็นอิสระ", key: "independent" }
    ]
  },
  {
    breed_id: 16,
    breed_name: "British Longhair",
    image_url: "https://tica.org/wp-content/uploads/2018/08/British-Longhair-Full-Body.jpg",
    tags: [
      { label: "ขนยาว", key: "coat-long" },
      { label: "บุคลิกสุขุม", key: "calm" },
      { label: "เหมาะกับครอบครัว", key: "family" }
    ]
  }
];

const AUTH_STORAGE_KEYS = [
  "catmatch_token",
  "userToken",
  "token",
  "catmatch_user",
  "user"
];

function removeAuthFromStorage(storage) {
  AUTH_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
}

document.addEventListener("DOMContentLoaded", () => {
  setupAuthNavigation();
  setupMobileMenu();
  setupHeaderScroll();
  setupNewsletter();
  setupRevealAnimation();
  setupPetalParallax();
  setupFavoriteButtons();
  setupFarmRegistrationNotice();
  loadHomepageData();
});


function readStoredJSON(key) {
  for (const storage of [sessionStorage, localStorage]) {
    const raw = storage.getItem(key);

    if (!raw) continue;

    try {
      return JSON.parse(raw);
    } catch (error) {
      // ข้ามค่าที่ไม่ใช่ JSON
    }
  }

  return null;
}

function getStoredToken() {
  const keys = ["catmatch_token", "userToken", "token"];

  for (const storage of [sessionStorage, localStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  }

  return "";
}

function getStoredUser() {
  return readStoredJSON("catmatch_user") || readStoredJSON("user") || null;
}

function getDisplayName(user) {
  const username = String(user?.username || "").trim();
  const fullName = String(user?.name || user?.full_name || "").trim();

  if (username) return username;
  if (fullName) return fullName.split(/\s+/)[0];
  return "ผู้ใช้งาน";
}

function clearAuthentication() {
  removeAuthFromStorage(localStorage);
  removeAuthFromStorage(sessionStorage);
}

function setupAuthNavigation() {
  const guestActions = document.getElementById("guestNavActions");
  const userActions = document.getElementById("userNavActions");
  const menuTrigger = document.getElementById("userMenuTrigger");
  const menuPanel = document.getElementById("userMenuPanel");
  const logoutButton = document.getElementById("logoutButton");
  const accountInfoButton = document.getElementById("accountInfoButton");
  const accountSettingsButton = document.getElementById("accountSettingsButton");
  const token = getStoredToken();
  const user = getStoredUser();

  if (!guestActions || !userActions) return;

  const loggedIn = Boolean(token && user);

  guestActions.hidden = loggedIn;
  userActions.hidden = !loggedIn;
  guestActions.setAttribute("aria-hidden", String(loggedIn));
  userActions.setAttribute("aria-hidden", String(!loggedIn));

  if (!loggedIn || !menuTrigger || !menuPanel) return;

  const displayName = getDisplayName(user);
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const email = String(user?.email || "").trim();

  const values = {
    userDisplayName: displayName,
    userMenuName: displayName,
    userMenuEmail: email,
    userAvatar: initial,
    userMenuAvatar: initial,
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  // ย้าย dropdown ไปไว้ใต้ body เพื่อไม่ให้ถูก Hero หรือ Header บัง
  document.body.appendChild(menuPanel);

  const positionMenu = () => {
    if (menuPanel.hidden) return;

    const rect = menuTrigger.getBoundingClientRect();
    const panelWidth = Math.min(310, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 12));
    const top = Math.min(rect.bottom + 10, window.innerHeight - 20);

    menuPanel.style.width = `${panelWidth}px`;
    menuPanel.style.left = `${left}px`;
    menuPanel.style.top = `${top}px`;
  };

  const closeMenu = () => {
    menuTrigger.setAttribute("aria-expanded", "false");
    menuPanel.classList.remove("is-open");
    menuPanel.hidden = true;
  };

  const openMenu = () => {
    menuPanel.hidden = false;
    menuPanel.classList.add("is-open");
    menuTrigger.setAttribute("aria-expanded", "true");
    positionMenu();
  };

  menuTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const isOpen = menuTrigger.getAttribute("aria-expanded") === "true";
    if (isOpen) closeMenu();
    else openMenu();
  });

  menuPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", positionMenu);
  window.addEventListener("scroll", positionMenu, { passive: true });

  const showAccountToast = (message) => {
    let toast = document.getElementById("accountMenuToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "accountMenuToast";
      toast.className = "account-menu-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showAccountToast.timer);
    showAccountToast.timer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2400);
  };

  accountInfoButton?.addEventListener("click", (event) => {
    event.preventDefault();
    closeMenu();
    window.location.href = "./account-info.html";
  });

  accountSettingsButton?.addEventListener("click", (event) => {
    event.preventDefault();
    closeMenu();
    window.location.href = "./settings.html";
  });

  logoutButton?.addEventListener("click", () => {
    clearAuthentication();
    window.location.replace("./index.html");
  });
}
function setupMobileMenu() {
  const header = document.getElementById("siteHeader");
  const menuToggle = document.getElementById("menuToggle");

  menuToggle?.addEventListener("click", () => {
    header?.classList.toggle("menu-open");
  });
}

function setupHeaderScroll() {
  const header = document.getElementById("siteHeader");

  const onScroll = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function setupPetalParallax() {
  const scene = document.querySelector(".sakura-scene");

  if (!scene) {
    return;
  }

  const onScroll = () => {
    const y = window.scrollY || 0;
    const shift = Math.min(y * 0.05, 28);
    const boost = Math.min(y / 5000, 0.12);

    scene.style.setProperty("--scene-shift", `${shift}px`);
    scene.style.setProperty("--petal-boost", boost.toFixed(2));
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

async function loadFavoriteBreedIds() {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    favoriteBreedIds = new Set();
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/favorites`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      }
    );

    const result =
      await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message ||
        "โหลดแมวที่ถูกใจไม่สำเร็จ"
      );
    }

    const favorites =
      Array.isArray(result.data)
        ? result.data
        : [];

    favoriteBreedIds = new Set(
      favorites
        .map((item) => Number(item.breed_id))
        .filter(
          (breedId) =>
            Number.isInteger(breedId) &&
            breedId > 0
        )
    );
  } catch (error) {
    console.warn(
      "Load favorites error:",
      error.message
    );

    favoriteBreedIds = new Set();
  }
}

function updateFavoriteButtons() {
  document
    .querySelectorAll(
      ".favorite-button[data-breed-id]"
    )
    .forEach((button) => {
      const breedId =
        Number(button.dataset.breedId);

      const isFavorite =
        favoriteBreedIds.has(breedId);

      button.classList.toggle(
        "is-active",
        isFavorite
      );

      button.setAttribute(
        "aria-pressed",
        String(isFavorite)
      );

      button.setAttribute(
        "aria-label",
        isFavorite
          ? "นำออกจากแมวที่ถูกใจ"
          : "บันทึกเป็นแมวที่ถูกใจ"
      );

      button.textContent =
        isFavorite ? "♥" : "♡";
    });
}

async function saveFavorite(breedId) {
  const token = getStoredToken();

  const response = await fetch(
    `${API_BASE_URL}/favorites`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        breed_id: breedId
      })
    }
  );

  const result =
    await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
      "บันทึกแมวที่ถูกใจไม่สำเร็จ"
    );
  }
}

async function deleteFavorite(breedId) {
  const token = getStoredToken();

  const response = await fetch(
    `${API_BASE_URL}/favorites/${breedId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    }
  );

  const result =
    await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
      "นำออกจากแมวที่ถูกใจไม่สำเร็จ"
    );
  }
}
function setupFavoriteButtons() {
  document.addEventListener(
    "click",
    async (event) => {
      const button =
        event.target.closest(
          ".favorite-button[data-breed-id]"
        );

      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const token = getStoredToken();
      const user = getStoredUser();

      if (!token || !user) {
        window.location.href =
          "./login.html?return=index";
        return;
      }

      const breedId =
        Number(button.dataset.breedId);

      if (
        !Number.isInteger(breedId) ||
        breedId <= 0 ||
        favoriteRequestPending.has(breedId)
      ) {
        return;
      }

      const wasFavorite =
        favoriteBreedIds.has(breedId);

      favoriteRequestPending.add(breedId);
      button.disabled = true;

      /*
       * เปลี่ยนหน้าตาก่อนเพื่อให้ตอบสนองเร็ว
       */
      if (wasFavorite) {
        favoriteBreedIds.delete(breedId);
      } else {
        favoriteBreedIds.add(breedId);
      }

      updateFavoriteButtons();

      try {
        if (wasFavorite) {
          await deleteFavorite(breedId);
        } else {
          await saveFavorite(breedId);
        }
      } catch (error) {
        /*
         * คืนสถานะเดิมเมื่อ API ล้มเหลว
         */
        if (wasFavorite) {
          favoriteBreedIds.add(breedId);
        } else {
          favoriteBreedIds.delete(breedId);
        }

        updateFavoriteButtons();

        await window.CatMatchDialog?.alert?.(
          error.message,
          {
            title: "บันทึกรายการไม่ได้",
            icon: "!"
          }
        );
      } finally {
        favoriteRequestPending.delete(
          breedId
        );

        button.disabled = false;
      }
    }
  );
}
function setupNewsletter() {
  const form = document.querySelector(".newsletter-form");

  if (!form) {
    return;
  }

  const input = form.querySelector("input[type='email']");
  const submitButton = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = String(input?.value || "")
      .trim()
      .toLowerCase();

    if (!email || !input?.checkValidity()) {
      input?.focus();

      await window.CatMatchDialog?.alert?.(
        "กรุณากรอกอีเมลให้ถูกต้อง เช่น Example@gmail.com",
        {
          title: "ตรวจสอบอีเมลอีกครั้ง",
          icon: "@",
          confirmText: "กลับไปแก้ไข"
        }
      );

      return;
    }

    const originalLabel = submitButton?.textContent || "→";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.textContent = "…";
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/newsletter/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
          "สมัครรับข่าวสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
        );
      }

      const message = payload.emailSent
        ? `เราได้บันทึก ${email} และส่งอีเมลยืนยันให้แล้ว\nกรุณาตรวจกล่องจดหมาย รวมถึงโฟลเดอร์จดหมายขยะ`
        : `เราได้บันทึก ${email} สำหรับรับข่าวสารแล้ว\nขณะนี้ยังส่งอีเมลยืนยันไม่ได้ แต่การสมัครของคุณถูกบันทึกเรียบร้อย`;

      await window.CatMatchDialog?.alert?.(
        message,
        {
          title: payload.emailSent
            ? "สมัครรับข่าวสารสำเร็จ"
            : "บันทึกอีเมลเรียบร้อย",
          icon: "✉",
          confirmText: "เรียบร้อย"
        }
      );

      form.reset();
    } catch (error) {
      await window.CatMatchDialog?.alert?.(
        error?.message ||
        "ไม่สามารถเชื่อมต่อระบบสมัครรับข่าวสารได้",
        {
          title: "สมัครรับข่าวสารไม่สำเร็จ",
          icon: "!",
          confirmText: "ลองอีกครั้ง"
        }
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.textContent = originalLabel;
      }
    }
  });
}

function setupRevealAnimation() {
  const revealElements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach((element) => {
      element.classList.add("is-visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((element) => {
    observer.observe(element);
  });
}
function shuffleHomepageBreeds(items) {
  const result = [...items];

  for (
    let index = result.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(Math.random() * (index + 1));

    [
      result[index],
      result[randomIndex]
    ] = [
      result[randomIndex],
      result[index]
    ];
  }

  return result;
}

function getRecommendationBreedId(item) {
  return Number(
    item?.breed_id ||
    item?.breed?.breed_id ||
    0
  );
}

function getRecommendationScore(item) {
  const value = Number(
    item?.match_score ??
    item?.score ??
    item?.match_percentage
  );

  return Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : null;
}

function createMatchScoreMap(recommendations) {
  const scoreMap = new Map();

  recommendations.forEach((item) => {
    const breedId =
      getRecommendationBreedId(item);

    const score =
      getRecommendationScore(item);

    if (
      breedId > 0 &&
      score !== null
    ) {
      scoreMap.set(breedId, score);
    }
  });

  return scoreMap;
}

async function fetchLatestAccountRecommendations() {
  const token = getStoredToken();
  const user = getStoredUser();

  /*
   * ยังไม่ได้เข้าสู่ระบบ
   * จะไม่ดึงคะแนนของบัญชีอื่นมาแสดง
   */
  if (!token || !user) {
    return [];
  }

  try {
    /*
     * โหลดประวัติของผู้ใช้ที่ล็อกอิน
     */
    const historyResponse = await fetch(
      `${API_BASE_URL}/history`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      }
    );

    const historyPayload =
      await historyResponse
        .json()
        .catch(() => ({}));

    if (
      !historyResponse.ok ||
      historyPayload.success === false
    ) {
      return [];
    }

    const historyItems =
      Array.isArray(historyPayload.data)
        ? historyPayload.data
        : [];

    if (!historyItems.length) {
      return [];
    }

    /*
     * ป้องกันกรณี Backend ไม่ได้เรียงล่าสุดก่อน
     */
    const sortedHistory =
      [...historyItems].sort(
        (first, second) => {
          const firstDate =
            new Date(first.created_at || 0)
              .getTime();

          const secondDate =
            new Date(second.created_at || 0)
              .getTime();

          return secondDate - firstDate;
        }
      );

    const latestResult =
      sortedHistory[0];

    /*
     * บาง Backend ส่ง recommendations
     * มาพร้อมรายการประวัติอยู่แล้ว
     */
    if (
      Array.isArray(
        latestResult.recommendations
      ) &&
      latestResult.recommendations.length
    ) {
      return latestResult.recommendations;
    }

    const resultId =
      Number(latestResult.result_id || 0);

    if (!resultId) {
      return [];
    }

    /*
     * โหลดคะแนนทุกสายพันธุ์ของผลล่าสุด
     */
    const recommendationResponse =
      await fetch(
        `${API_BASE_URL}/recommendations/${resultId}`,
        {
          cache: "no-store"
        }
      );

    const recommendationPayload =
      await recommendationResponse
        .json()
        .catch(() => ({}));

    if (
      !recommendationResponse.ok ||
      recommendationPayload.success === false
    ) {
      return [];
    }

    const recommendations =
      recommendationPayload.data ||
      recommendationPayload.recommendations ||
      [];

    return Array.isArray(recommendations)
      ? recommendations
      : [];
  } catch (error) {
    console.warn(
      "โหลดคะแนนความเหมาะสมล่าสุดไม่สำเร็จ:",
      error.message
    );

    return [];
  }
}

function getRandomHomepageBreeds() {
  if (!homepageBreedPool.length) {
    return [];
  }

  const count = Math.min(
    HOMEPAGE_BREED_COUNT,
    homepageBreedPool.length
  );

  const selectedBreeds = Array.from(
    { length: count },
    (_, index) =>
      homepageBreedPool[
        (homepageBreedCursor + index) %
          homepageBreedPool.length
      ]
  );

  homepageBreedCursor =
    (homepageBreedCursor + count) %
    homepageBreedPool.length;

  return selectedBreeds.map((breed) => {
    const breedId = Number(breed.breed_id);

    return {
      ...breed,
      tags:
        Array.isArray(breed.tags) &&
        breed.tags.length
          ? breed.tags
          : buildBreedTags(breed),
      match_score:
        homepageMatchScoreMap.get(breedId) ??
        null
    };
  });
}

async function rotateHomepageBreeds(
  useAnimation = true
) {
  const breedGrid =
    document.getElementById("breedGrid");

  if (!breedGrid) {
    return;
  }

  const selectedBreeds =
    getRandomHomepageBreeds();

  if (!selectedBreeds.length) {
    return;
  }

  if (useAnimation) {
    breedGrid.classList.add(
      "is-changing-breeds"
    );

    await new Promise((resolve) => {
      window.setTimeout(resolve, 220);
    });
  }

  const breedsWithImages =
    await attachBreedImages(
      selectedBreeds
    );

  renderBreeds(breedsWithImages);

  breedGrid.classList.remove(
    "is-changing-breeds"
  );
  breedGrid.classList.add(
    "is-entering-breeds"
  );

  window.setTimeout(() => {
    breedGrid.classList.remove(
      "is-entering-breeds"
    );
  }, 520);
}

function startHomepageBreedRotation() {
  if (homepageRotationTimer) {
    window.clearInterval(
      homepageRotationTimer
    );
  }

  homepageRotationTimer =
    window.setInterval(() => {
      void rotateHomepageBreeds(true);
    }, HOMEPAGE_BREED_ROTATION_TIME);
}
async function loadHomepageData() {
  await loadFavoriteBreedIds();

  await Promise.allSettled([
    loadBreeds(),
    loadStats()
  ]);

  updateFavoriteButtons();
  startHomepageStatsUpdates();
}
async function loadBreeds() {
  const breedGrid = document.getElementById("breedGrid");
  if (!breedGrid) return;

  const sharedData = Array.isArray(window.CATMATCH_CAT_BREEDS)
    ? window.CATMATCH_CAT_BREEDS
    : [];

  const allBreeds = sharedData.length
    ? sharedData
    : fallbackBreeds;

  const featuredBreeds = FEATURED_BREED_IDS
    .map((id) =>
      allBreeds.find(
        (breed) => Number(breed.breed_id) === id
      )
    )
    .filter(Boolean);

  const featuredIds = new Set(
    featuredBreeds.map((breed) =>
      Number(breed.breed_id)
    )
  );

  const orderedBreeds = [
    ...featuredBreeds,
    ...allBreeds.filter(
      (breed) =>
        !featuredIds.has(
          Number(breed.breed_id)
        )
    )
  ];

  homepageBreedPool = orderedBreeds.map((breed) => ({
    ...breed,
    tags:
      Array.isArray(breed.tags) &&
      breed.tags.length
        ? breed.tags
        : buildBreedTags(breed),
    match_score: null
  }));

  homepageBreedTotal =
    sharedData.length ||
    fallbackBreeds.length;
  setStat("breeds", homepageBreedTotal);

  const latestRecommendations =
    await fetchLatestAccountRecommendations();

  homepageMatchScoreMap =
    createMatchScoreMap(
      latestRecommendations
    );

  const initialBreeds =
    homepageBreedPool.slice(
      0,
      HOMEPAGE_BREED_COUNT
    );

  const rows = initialBreeds.map((breed) => ({
    ...breed,
    match_score:
      homepageMatchScoreMap.get(
        Number(breed.breed_id)
      ) ?? null
  }));

  homepageBreedCursor =
    homepageBreedPool.length >
    HOMEPAGE_BREED_COUNT
      ? HOMEPAGE_BREED_COUNT
      : 0;

  renderBreeds(
    await attachBreedImages(rows)
  );

  startHomepageBreedRotation();
}

async function attachBreedImages(breeds) {
  return breeds.map((breed) => {
    const id = Number(breed.breed_id);
    const knowledge =
      window.CatMatchBreedKnowledge?.get?.(id) ||
      {};
    const normalizedName =
      normalizeBreedName(breed.breed_name);
    const exactFallback =
      BREED_IMAGE_FALLBACKS[
        normalizedName
      ] ||
      breed.image_url ||
      knowledge.thumbnail ||
      knowledge.image ||
      "";

    return {
      ...breed,
      image_url:
        knowledge.image ||
        knowledge.thumbnail ||
        breed.image_url ||
        exactFallback,
      image_fallback: exactFallback
    };
  });
}

async function loadCatApiBreedCatalog() {
  const cache = readBreedImageCache();
  if (Array.isArray(cache.catalog) && cache.catalog.length) return cache.catalog;

  const response = await fetch(`${CAT_API_BASE_URL}/breeds`, {
    headers: { Accept: "application/json" },
    cache: "force-cache"
  });
  if (!response.ok) throw new Error(`TheCatAPI returned ${response.status}`);

  const catalog = await response.json();
  if (!Array.isArray(catalog)) throw new Error("Invalid cat breed catalog");
  writeBreedImageCache({ ...cache, catalog });
  return catalog;
}

function findCatApiBreed(catalog, breedName) {
  const original = normalizeBreedName(breedName);
  const aliased = CAT_API_BREED_ALIASES[original] || original;
  return catalog.find((item) => normalizeBreedName(item.name) === aliased)
    || catalog.find((item) => {
      const apiName = normalizeBreedName(item.name);
      return apiName.includes(aliased) || aliased.includes(apiName);
    })
    || null;
}

async function getCatApiBreedImage(catApiBreed) {
  const cache = readBreedImageCache();
  const cacheKey = String(catApiBreed.id || normalizeBreedName(catApiBreed.name));
  if (cache.images?.[cacheKey]) return cache.images[cacheKey];

  if (catApiBreed.image?.url) {
    writeBreedImageCache({
      ...cache,
      images: { ...(cache.images || {}), [cacheKey]: catApiBreed.image.url }
    });
    return catApiBreed.image.url;
  }

  const response = await fetch(
    `${CAT_API_BASE_URL}/images/search?breed_ids=${encodeURIComponent(catApiBreed.id)}&limit=1`,
    { headers: { Accept: "application/json" }, cache: "force-cache" }
  );
  if (!response.ok) throw new Error(`Cat image request returned ${response.status}`);

  const images = await response.json();
  const imageUrl = Array.isArray(images) ? images[0]?.url : null;
  if (imageUrl) {
    writeBreedImageCache({
      ...cache,
      images: { ...(cache.images || {}), [cacheKey]: imageUrl }
    });
  }
  return imageUrl || null;
}

function readBreedImageCache() {
  try {
    return JSON.parse(localStorage.getItem(CAT_IMAGE_CACHE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeBreedImageCache(value) {
  try {
    localStorage.setItem(CAT_IMAGE_CACHE_KEY, JSON.stringify(value));
  } catch {
    // Cache is optional.
  }
}

function normalizeBreedName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function readHomepageScore(breed, keys, fallback = 3) {
  for (const key of keys) {
    const value = Number(breed?.[key]);

    if (Number.isFinite(value)) {
      return Math.min(5, Math.max(1, Math.round(value)));
    }
  }

  return fallback;
}

function getHomepageCoatInfo(breed) {
  const id = Number(breed.breed_id ?? breed.id);
  const name = String(breed.breed_name ?? breed.name ?? "");

  const knowledgeLabel =
    window.CatMatchBreedKnowledge?.coatLabel?.(id, name) || "";

  const rawCoat = String(
    knowledgeLabel ||
    breed.coat_length ||
    breed.coat_type ||
    ""
  ).toLowerCase();

  let coat = "short";

  if (
    rawCoat.includes("ไม่มีขน") ||
    rawCoat.includes("hairless")
  ) {
    coat = "hairless";
  } else if (
    rawCoat.includes("หยิก") ||
    rawCoat.includes("ลอน") ||
    rawCoat.includes("curly")
  ) {
    coat = "curly";
  } else if (
    rawCoat.includes("ยาว") ||
    rawCoat.includes("long")
  ) {
    coat = "long";
  } else if (
    rawCoat.includes("ปานกลาง") ||
    rawCoat.includes("medium") ||
    rawCoat.includes("กึ่งยาว")
  ) {
    coat = "medium";
  }

  const labels = {
    short: "ขนสั้น",
    medium: "ขนปานกลาง",
    long: "ขนยาว",
    curly: "ขนหยิกหรือขนลอน",
    hairless: "ไม่มีขนหรือมีขนอ่อนมาก"
  };

  return {
    coat,
    label: knowledgeLabel || labels[coat]
  };
}

function getHomepageCoatTagKey(coat) {
  return {
    short: "coat-short",
    medium: "coat-medium",
    long: "coat-long",
    curly: "coat-curly",
    hairless: "coat-hairless"
  }[coat] || "coat-short";
}

function getHomepageCalmScore(values) {
  const activityCalm = 6 - values.activity;
  const quietness = 6 - values.noise;
  const playCalm = 6 - values.playful;

  const calculated =
    activityCalm * 0.4 +
    quietness * 0.3 +
    playCalm * 0.15 +
    values.adaptability * 0.1 +
    values.independence * 0.05;

  return Math.min(5, Math.max(1, calculated));
}

function buildBreedTags(breed) {
  const values = {
    friendly: readHomepageScore(breed, ["friendly"]),
    affectionate: readHomepageScore(
      breed,
      ["affectionate", "affection"]
    ),
    playful: readHomepageScore(breed, ["playful"]),
    independence: readHomepageScore(
      breed,
      ["independence"]
    ),
    adaptability: readHomepageScore(
      breed,
      ["adaptability"]
    ),
    activity: readHomepageScore(
      breed,
      ["activity_level", "activity", "energy_level"]
    ),
    exercise: readHomepageScore(
      breed,
      ["exercise_need"]
    ),
    apartment: readHomepageScore(
      breed,
      ["apartment_suitability"]
    ),
    family: readHomepageScore(
      breed,
      ["family_friendly"]
    ),
    child: readHomepageScore(
      breed,
      ["child_friendly"]
    ),
    firstTime: readHomepageScore(
      breed,
      ["first_time_owner_friendly"]
    ),
    grooming: readHomepageScore(
      breed,
      ["grooming_need", "care_need"]
    ),
    shedding: readHomepageScore(
      breed,
      ["shedding_level"]
    ),
    noise: readHomepageScore(
      breed,
      ["noise_level"]
    )
  };

  const coat = getHomepageCoatInfo(breed);

  /*
   * แท็กแรกเป็นชนิดขนเสมอ
   * อีก 2 แท็กเลือกจากบุคลิกหรือความเหมาะสม
   */
  const tags = [
    {
      label: coat.label,
      key: getHomepageCoatTagKey(coat.coat)
    }
  ];

  if (values.friendly >= 4) {
    tags.push({
      label: "เข้ากับคนง่าย",
      key: "friendly"
    });
  }

  if (values.affectionate >= 4) {
    tags.push({
      label: "ชอบปฏิสัมพันธ์",
      key: "affectionate"
    });
  }

  if (
    values.playful >= 4 ||
    values.activity >= 4 ||
    values.exercise >= 4
  ) {
    tags.push({
      label: "ชอบกิจกรรม",
      key: "active"
    });
  }

  if (
    getHomepageCalmScore(values) >= 3.1 &&
    values.activity <= 3 &&
    values.noise <= 3
  ) {
    tags.push({
      label: "บุคลิกสุขุม",
      key: "calm"
    });
  }

  if (values.independence >= 4) {
    tags.push({
      label: "มีความเป็นอิสระ",
      key: "independent"
    });
  }

  if (values.apartment >= 4) {
    tags.push({
      label: "เหมาะกับพื้นที่จำกัด",
      key: "apartment"
    });
  }

  if (
    values.family >= 4 &&
    values.friendly >= 3
  ) {
    tags.push({
      label: "เหมาะกับครอบครัว",
      key: "family"
    });
  }

  if (
    values.child >= 4 &&
    values.friendly >= 4
  ) {
    tags.push({
      label: "เข้ากับเด็กได้ดี",
      key: "child-friendly"
    });
  }

  if (values.firstTime >= 4) {
    tags.push({
      label: "เหมาะสำหรับผู้เลี้ยงครั้งแรก",
      key: "first-time"
    });
  }

  if (
    values.grooming <= 2 &&
    values.shedding <= 3
  ) {
    tags.push({
      label: "ดูแลขนไม่ซับซ้อน",
      key: "low-grooming"
    });
  }

  return tags
    .filter(
      (tag, index, allTags) =>
        allTags.findIndex((item) => item.key === tag.key) === index
    )
    .slice(0, 3);
}

function renderBreeds(breeds) {
  const breedGrid =
    document.getElementById("breedGrid");

  if (!breedGrid) {
    return;
  }

  breedGrid.innerHTML = breeds
    .map((breed) => {
      const breedId =
        Number(breed.breed_id);

      const matchScore =
        Number(breed.match_score);

      const hasMatchScore =
        breed.match_score !== null &&
        breed.match_score !== undefined &&
        breed.match_score !== "" &&
        Number.isFinite(matchScore);

      const isFavorite =
        favoriteBreedIds.has(breedId);

      return `
        <article class="card breed-card reveal is-visible">
          <div class="breed-card-image">
            <img
              src="${escapeHTML(
                breed.image_url ||
                fallbackBreeds[0].image_url
              )}"
              data-fallback-src="${escapeHTML(
                breed.image_fallback ||
                fallbackBreeds[0].image_url
              )}"
              alt="${escapeHTML(
                breed.breed_name
              )}"
              loading="eager"
              decoding="async"
              fetchpriority="high"
            >

  <button
  class="icon-button favorite-button ${
    isFavorite
      ? "is-active"
      : ""
  }"
  type="button"
  data-breed-id="${breedId}"
  aria-pressed="${String(isFavorite)}"
  aria-label="${
    isFavorite
      ? `นำ ${escapeHTML(
          breed.breed_name
        )} ออกจากแมวที่ถูกใจ`
      : `บันทึก ${escapeHTML(
          breed.breed_name
        )} เป็นแมวที่ถูกใจ`
  }"
>
  ${isFavorite ? "♥" : "♡"}
</button>
          </div>

          <div class="breed-card-body">
            <h3>
              ${escapeHTML(
                breed.breed_name
              )}
            </h3>

            <div
              class="trait-tags homepage-trait-tags"
            >
              ${(breed.tags || [])
                .slice(0, 3)
                .map(
                  (tag) => `
                    <span class="trait-tag homepage-trait-tag">
                      ${escapeHTML(tag.label)}
                    </span>
                  `
                )
                .join("")}
            </div>

            <div class="match-block">
              ${
                hasMatchScore
                  ? `
                    <div class="match-row">
                      <span>
                        ความเหมาะสม
                      </span>

                      <strong>
                        ${matchScore.toFixed(0)}%
                      </strong>
                    </div>

                    <div class="match-track">
                      <div
                        class="match-fill"
                        style="width:${Math.max(
                          0,
                          Math.min(
                            100,
                            matchScore
                          )
                        )}%"
                      ></div>
                    </div>
                  `
                  : `
                    <div class="match-placeholder">
                      ทำแบบประเมินเพื่อดูเปอร์เซ็นต์ความเหมาะสม
                    </div>
                  `
              }
            </div>

            <div class="breed-card-footer">
              <span>
                ดูข้อมูลสายพันธุ์
              </span>

              <a
                class="text-link"
                href="./cat_detail.html?id=${breedId}"
              >
                รายละเอียด →
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  breedGrid
    .querySelectorAll(
      ".breed-card-image img"
    )
    .forEach((image) => {
      image.addEventListener(
        "error",
        () => {
          const fallback =
            image.dataset.fallbackSrc;

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

  /*
   * ตรวจให้สถานะหัวใจตรงกับข้อมูล
   * ห:contentReference[oaicite:1]{index=1} */
 updateFavoriteButtons();
}

async function loadStats() {
  if (homepageStatsLoading) return;
  homepageStatsLoading = true;

  const breedCount =
    homepageBreedTotal ||
    (Array.isArray(window.CATMATCH_CAT_BREEDS)
      ? window.CATMATCH_CAT_BREEDS.length
      : fallbackBreeds.length);

  /* ล้างค่าที่ผูกกับบัญชีก่อนโหลดใหม่ เพื่อไม่ให้เห็นยอดของบัญชีก่อนหน้า */
  updateStatNumber("farms", 0);
  updateStatNumber("breeds", breedCount);
  updateStatNumber("available", 0);
  updateStatNumber("assessments", 0);

  try {
    const [farmResult, shelterResult, assessmentResult] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/farms?species=cat&include_animals=1`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          throw new Error(payload.message || "โหลดข้อมูลฟาร์มไม่สำเร็จ");
        }
        return Array.isArray(payload.data) ? payload.data : [];
      }),
      fetch(`${API_BASE_URL}/shelters/animals?species=cat`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          throw new Error(payload.message || "โหลดข้อมูลแมวที่พร้อมหาบ้านไม่สำเร็จ");
        }
        return Array.isArray(payload.data) ? payload.data : [];
      }),
      loadCurrentAccountAssessmentCount("cat"),
    ]);

    if (farmResult.status === "fulfilled") {
      const farmIds = farmResult.value
        .map((row) => Number(row.farm_id))
        .filter((id) => Number.isInteger(id) && id > 0);
      updateStatNumber("farms", new Set(farmIds).size);
    } else {
      console.warn("โหลดจำนวนฟาร์มแมวไม่สำเร็จ:", farmResult.reason?.message || farmResult.reason);
    }

    if (shelterResult.status === "fulfilled") {
      const availableRows = shelterResult.value.filter(
        (row) => String(row.status || "available").toLowerCase() === "available"
      );
      updateStatNumber("available", availableRows.length);
    } else {
      console.warn("โหลดจำนวนแมวที่พร้อมหาบ้านไม่สำเร็จ:", shelterResult.reason?.message || shelterResult.reason);
    }

    if (assessmentResult.status === "fulfilled") {
      updateStatNumber("assessments", assessmentResult.value);
    } else {
      console.warn("โหลดผลแบบประเมินของบัญชีปัจจุบันไม่สำเร็จ:", assessmentResult.reason?.message || assessmentResult.reason);
      updateStatNumber("assessments", 0);
    }
  } finally {
    homepageStatsLoading = false;
  }
}

async function loadCurrentAccountAssessmentCount(species) {
  /*
   * หน้าแรกเป็นหน้าสาธารณะ จึงห้ามเรียก ensure() ที่อาจกู้บัญชี Google เก่า
   * ขึ้นมาเองในขณะที่แถบหัวเว็บยังแสดงว่าไม่ได้เข้าสู่ระบบ
   */
  const token = getStoredToken();
  const user = getStoredUser();
  const role = String(
    sessionStorage.getItem("catmatch_role") ||
    localStorage.getItem("catmatch_role") ||
    "user"
  ).toLowerCase();

  if (!token || !user || role !== "user") return 0;

  const url = `${API_BASE_URL}/history?species=${encodeURIComponent(species)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    if (response.status === 401) return 0;
    throw new Error(payload.message || "โหลดประวัติผลแบบประเมินไม่สำเร็จ");
  }

  if (Number.isFinite(Number(payload.total_results))) {
    return Number(payload.total_results);
  }
  return Array.isArray(payload.data) ? payload.data.length : 0;
}

function startHomepageStatsUpdates() {
  if (homepageStatsTimer) window.clearInterval(homepageStatsTimer);

  homepageStatsTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") void loadStats();
  }, HOMEPAGE_STATS_REFRESH_TIME);

  if (homepageStatsListenersBound) return;
  homepageStatsListenersBound = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void loadStats();
  });

  window.addEventListener("pageshow", () => void loadStats());

  /* เปลี่ยน Google Account แล้วต้องเปลี่ยนยอดผลแบบประเมินทันที */
  window.addEventListener("catmatch:user-session", () => void loadStats());

  window.addEventListener("storage", (event) => {
    if ([
      "catmatch_token",
      "userToken",
      "token",
      "catmatch_user",
      "user",
      "catmatch_auth_uid",
      "catmatch_auth_user_id",
      "catmatch_auth_email",
    ].includes(String(event.key || ""))) {
      void loadStats();
    }
  });
}

function updateStatNumber(
  name,
  nextValue
) {
  const element =
    document.querySelector(
      `[data-stat="${name}"]`
    );

  const target =
    Number(nextValue);

  if (
    !element ||
    !Number.isFinite(target)
  ) {
    return;
  }

  const currentText =
    String(element.textContent || "0")
      .replace(/[^\d.-]/g, "");

  const current =
    Number(currentText) || 0;

  if (current === target) {
    return;
  }

  const duration = 500;
  const startTime =
    performance.now();

  function animateNumber(now) {
    const progress =
      Math.min(
        (now - startTime) / duration,
        1
      );

    const eased =
      1 - Math.pow(1 - progress, 3);

    const displayValue =
      Math.round(
        current +
        (target - current) * eased
      );

    element.textContent =
      displayValue.toLocaleString(
        "th-TH"
      );

    if (progress < 1) {
      window.requestAnimationFrame(
        animateNumber
      );
    }
  }

  window.requestAnimationFrame(
    animateNumber
  );
}
function setStat(name, value) {
  const element = document.querySelector(`[data-stat="${name}"]`);

  if (!element || !Number.isFinite(Number(value))) {
    return;
  }

  element.textContent = Number(value).toLocaleString("th-TH");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function setupFarmRegistrationNotice() {
  const params = new URLSearchParams(window.location.search);
  const submittedByUrl = params.get("farm_request") === "submitted";
  const onceKey = "catmatch_farm_notice_once";

  const modal = document.getElementById("farmRequestModal");
  const closeButton = document.getElementById("farmRequestClose");
  const loginLink = document.getElementById("farmRequestLoginLink");
  const banner = document.getElementById("farmStatusBanner");
  const bannerBadge = document.getElementById("farmStatusBadge");
  const bannerTitle = document.getElementById("farmStatusTitle");
  const bannerDescription = document.getElementById("farmStatusDescription");
  const bannerAction = document.getElementById("farmStatusAction");

  /*
   * แจ้งเตือนนี้เป็นแบบครั้งเดียว:
   * - แสดงเฉพาะเมื่อกลับมาจากขั้นตอนลงทะเบียน/ตรวจสอบฟาร์ม
   * - เมื่อ Refresh หน้า index จะไม่แสดงซ้ำ
   * - ไม่อ่านข้อมูลเก่าจาก localStorage เพื่อไม่ให้ผู้ใช้ทั่วไปเห็น
   */
  try {
    localStorage.removeItem("catmatch_farm_registration_result");
    localStorage.removeItem("catmatch_farm_notice_acknowledged");
  } catch (_error) {
    // Storage อาจถูกปิด แต่หน้าเว็บยังทำงานได้
  }

  function readOneTimeNotice() {
    if (submittedByUrl) {
      return {
        farm_name: params.get("farm_name") || "ฟาร์มของคุณ",
        email: params.get("email") || "",
        status: String(params.get("status") || "pending").toLowerCase()
      };
    }

    try {
      const raw = sessionStorage.getItem(onceKey);
      if (!raw) return null;
      sessionStorage.removeItem(onceKey);
      const value = JSON.parse(raw);
      return value && typeof value === "object" ? value : null;
    } catch (_error) {
      sessionStorage.removeItem(onceKey);
      return null;
    }
  }

  const result = readOneTimeNotice();

  if (!result) {
    if (banner) {
      banner.hidden = true;
      banner.setAttribute("hidden", "");
    }
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("hidden", "");
    }
    return;
  }

  /*
   * ลบ Query ทันที เพื่อให้ Refresh แล้วข้อความไม่กลับมาอีก
   */
  const cleanUrl = new URL(window.location.href);
  ["farm_request", "farm_name", "email", "status", "t"].forEach((key) => {
    cleanUrl.searchParams.delete(key);
  });
  window.history.replaceState(
    {},
    "",
    cleanUrl.pathname + cleanUrl.search + cleanUrl.hash
  );

  const status = String(result.status || "pending").toLowerCase();
  const farmName = String(result.farm_name || "ฟาร์มของคุณ");
  const flowSpecies = document.body.classList.contains("dog-theme") ? "dog" : "cat";
  const farmFlowUrl = (page, extra = {}) => {
    const target = new URL(`./${page}`, window.location.href);
    target.searchParams.set("species", flowSpecies);
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") target.searchParams.set(key, String(value));
    });
    return target.href;
  };

  function renderBanner() {
    if (!banner) return;

    banner.hidden = false;
    banner.removeAttribute("hidden");
    banner.classList.remove(
      "is-pending",
      "is-approved",
      "is-rejected",
      "is-inactive"
    );
    banner.classList.add(`is-${status}`);

    if (status === "approved") {
      if (bannerBadge) bannerBadge.textContent = "อนุมัติแล้ว";
      if (bannerTitle) bannerTitle.textContent = "บัญชีฟาร์มได้รับอนุมัติแล้ว";
      if (bannerDescription) {
        bannerDescription.textContent =
          `${farmName} พร้อมเข้าใช้งานแล้ว เข้าสู่ระบบเพื่อเริ่มจัดการข้อมูลฟาร์มและข้อมูลแมว`;
      }
      if (bannerAction) {
        bannerAction.href = farmFlowUrl("login.html", { farm_status: "approved", role: "farm", return: "farm" });
        bannerAction.innerHTML =
          'ไปหน้าเข้าสู่ระบบ <span aria-hidden="true">→</span>';
      }
      return;
    }

    if (status === "rejected") {
      if (bannerBadge) bannerBadge.textContent = "ต้องแก้ไขข้อมูล";
      if (bannerTitle) {
        bannerTitle.textContent =
          "คำขอลงทะเบียนฟาร์มยังไม่ผ่านการอนุมัติ";
      }
      if (bannerDescription) {
        bannerDescription.textContent = result.rejection_reason
          ? `เหตุผลจากผู้ดูแลระบบ: ${result.rejection_reason}`
          : "กรุณาตรวจสอบรายละเอียดคำขอและแก้ไขข้อมูล";
      }
      if (bannerAction) {
        bannerAction.href = farmFlowUrl("farm-pending.html", { status });
        bannerAction.innerHTML =
          'ดูรายละเอียด <span aria-hidden="true">→</span>';
      }
      return;
    }

    if (status === "inactive") {
      if (bannerBadge) bannerBadge.textContent = "ระงับชั่วคราว";
      if (bannerTitle) bannerTitle.textContent = "บัญชีฟาร์มถูกระงับการใช้งาน";
      if (bannerDescription) {
        bannerDescription.textContent =
          "กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบสถานะบัญชี";
      }
      if (bannerAction) {
        bannerAction.href = farmFlowUrl("farm-pending.html", { status });
        bannerAction.innerHTML =
          'ดูสถานะบัญชี <span aria-hidden="true">→</span>';
      }
      return;
    }

    if (bannerBadge) bannerBadge.textContent = "รอตรวจสอบ";
    if (bannerTitle) {
      bannerTitle.textContent =
        "คำขอลงทะเบียนฟาร์มกำลังอยู่ระหว่างตรวจสอบ";
    }
    if (bannerDescription) {
      bannerDescription.textContent =
        `ผู้ดูแลระบบกำลังตรวจสอบข้อมูลและใบรับรองของ ${farmName}`;
    }
    if (bannerAction) {
      const target = new URL(farmFlowUrl("farm-pending.html"));
      target.searchParams.set("farm_name", farmName);
      target.searchParams.set("email", result.email || "");
      target.searchParams.set("status", status);
      bannerAction.href = target.href;
      bannerAction.innerHTML =
        'ดูสถานะคำขอ <span aria-hidden="true">→</span>';
    }
  }

  function configureModal() {
    if (!modal) return;

    const eyebrow = document.getElementById("farmRequestEyebrow");
    const title = document.getElementById("farmRequestTitle");
    const message = document.getElementById("farmRequestMessage");
    const name = document.getElementById("farmRequestName");
    const note = document.getElementById("farmRequestNote");
    const finalStep = document.getElementById("farmRequestFinalStep");

    modal.classList.remove("is-approved", "is-rejected");
    if (name) name.textContent = farmName;

    if (status === "approved") {
      modal.classList.add("is-approved");
      if (eyebrow) eyebrow.textContent = "ตรวจสอบเรียบร้อยแล้ว";
      if (title) title.textContent = "บัญชีฟาร์มได้รับอนุมัติแล้ว";
      if (message) {
        message.innerHTML =
          `ผู้ดูแลระบบอนุมัติคำขอของ <strong id="farmRequestName">${escapeHTML(farmName)}</strong> เรียบร้อยแล้ว ตอนนี้บัญชีฟาร์มพร้อมใช้งาน`;
      }
      if (note) {
        note.textContent =
          "เข้าสู่ระบบเพื่อเริ่มจัดการข้อมูลฟาร์ม ข้อมูลแมว และคำขออุปการะ";
      }
      finalStep?.classList.add("is-complete");
      finalStep?.classList.remove("is-current");
      if (loginLink) {
        loginLink.href = farmFlowUrl("login.html", { farm_status: "approved", role: "farm", return: "farm" });
        loginLink.textContent = "ไปหน้าเข้าสู่ระบบ";
      }
      return;
    }

    if (eyebrow) eyebrow.textContent = "ส่งคำขอเรียบร้อยแล้ว";
    if (title) title.textContent = "กำลังรอผู้ดูแลระบบอนุมัติ";
    if (message) {
      message.innerHTML =
        `CatMatch ได้รับคำขอลงทะเบียนของ <strong id="farmRequestName">${escapeHTML(farmName)}</strong> แล้ว ผู้ดูแลระบบจะตรวจสอบข้อมูล เลขทะเบียน และใบรับรองฟาร์ม`;
    }
    if (note) {
      note.textContent =
        "ระหว่างรออนุมัติ บัญชีฟาร์มจะยังไม่สามารถเข้าใช้งานระบบจัดการฟาร์มได้";
    }
    finalStep?.classList.remove("is-complete");
  }

  function openModal() {
    if (!modal) return;
    configureModal();
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.classList.remove("is-celebrating");
    void modal.offsetWidth;
    modal.classList.add("is-celebrating");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButton?.focus(), 120);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.classList.remove("is-celebrating");
    document.body.style.overflow = "";
    renderBanner();
  }

  renderBanner();
  openModal();

  closeButton?.addEventListener("click", closeModal);
  modal
    ?.querySelector(".farm-request-backdrop")
    ?.addEventListener("click", closeModal);
}
