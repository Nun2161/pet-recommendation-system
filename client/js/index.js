const API_BASE_URL = "http://localhost:3000/api";

const CAT_API_BASE_URL = "https://api.thecatapi.com/v1";
const CAT_IMAGE_CACHE_KEY = "catmatch_breed_image_cache_v1";

const CAT_API_BREED_ALIASES = {
  "american bobtail shorthair": "american shorthair",
  "british longhair": "british longhair",
  "domestic shorthair": "american shorthair",
  "persian longhair": "persian",
  "siamese thai": "siamese"
};

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

// ชุดสำรองใช้ชื่อและ URL เดียวกับหน้า “แมวของเรา”
const fallbackBreeds = [
  {
    breed_id: 1,
    breed_name: "Abyssinian",
    image_url: "https://tica.org/wp-content/uploads/2018/08/Ruddy-Aby-Breed-snippet.jpg",
    traits: ["เป็นมิตร", "ขี้เล่น", "กระฉับกระเฉง"]
  },
  {
    breed_id: 3,
    breed_name: "American Bobtail",
    image_url: "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Full-Body_.jpg",
    traits: ["เป็นมิตร", "ขี้เล่น", "ปรับตัวง่าย"]
  },
  {
    breed_id: 4,
    breed_name: "American Bobtail Shorthair",
    image_url: "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Shorthair-Full-Body.jpg",
    traits: ["เป็นมิตร", "ขี้เล่น", "รักอิสระ"]
  },
  {
    breed_id: 16,
    breed_name: "British Longhair",
    image_url: "https://tica.org/wp-content/uploads/2018/08/British-Longhair-Full-Body.jpg",
    traits: ["อ่อนโยน", "ขนนุ่ม", "รักสงบ"]
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

function prepareAuthenticationForPageLoad() {
  // ไม่เก็บสถานะ Login แบบถาวรใน localStorage
  removeAuthFromStorage(localStorage);

  // เมื่อผู้ใช้กด Refresh/Hard Refresh ให้เริ่มสถานะทดสอบใหม่
  const navigation = performance.getEntriesByType?.("navigation")?.[0];
  const isReload = navigation?.type === "reload";

  if (isReload) {
    removeAuthFromStorage(sessionStorage);
  }
}

prepareAuthenticationForPageLoad();

document.addEventListener("DOMContentLoaded", () => {
  setupAuthNavigation();
  setupMobileMenu();
  setupHeaderScroll();
  setupNewsletter();
  setupRevealAnimation();
  setupPetalParallax();
  setupFavoriteButtons();
  loadHomepageData();
});


function readStoredJSON(key) {
  for (const storage of [localStorage, sessionStorage]) {
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

  for (const storage of [localStorage, sessionStorage]) {
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

  accountInfoButton?.addEventListener("click", () => {
    closeMenu();
    showAccountToast(`บัญชี: ${displayName}${email ? ` · ${email}` : ""}`);
  });

  accountSettingsButton?.addEventListener("click", () => {
    closeMenu();
    showAccountToast("หน้าการตั้งค่าบัญชีจะเชื่อมต่อในขั้นตอนถัดไป");
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


function setupFavoriteButtons() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".favorite-button");

    if (!button) {
      return;
    }

    const isActive = button.classList.toggle("is-active");
    button.setAttribute("aria-pressed", String(isActive));
    button.textContent = isActive ? "♥" : "♡";
  });
}

function setupNewsletter() {
  document
    .querySelector(".newsletter-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();

      const input = event.currentTarget.querySelector("input");

      if (!input?.value.trim()) {
        input?.focus();
        return;
      }

      alert("ขอบคุณที่สนใจรับข่าวสารจาก CatMatch");
      event.currentTarget.reset();
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

async function loadHomepageData() {
  await Promise.allSettled([loadBreeds(), loadStats()]);
}

async function loadBreeds() {
  const breedGrid = document.getElementById("breedGrid");
  if (!breedGrid) return;

  const sharedData = Array.isArray(window.CATMATCH_CAT_BREEDS)
    ? window.CATMATCH_CAT_BREEDS
    : [];

  const featuredBreeds = FEATURED_BREED_IDS
    .map((id) => sharedData.find((breed) => Number(breed.breed_id) === id))
    .filter(Boolean)
    .map((breed) => ({
      ...breed,
      traits: buildBreedTraits(breed),
      match_score: null
    }));

  const sourceBreeds = featuredBreeds.length === FEATURED_BREED_IDS.length
    ? featuredBreeds
    : fallbackBreeds.map((breed) => ({ ...breed, match_score: null }));

  setStat("breeds", sharedData.length || fallbackBreeds.length);
  renderBreeds(await attachBreedImages(sourceBreeds));
}

async function attachBreedImages(breeds) {
  return breeds.map((breed, index) => {
    const id = Number(breed.breed_id);
    const knowledge = window.CatMatchBreedKnowledge?.get?.(id) || {};
    const fallback = fallbackBreeds[index % fallbackBreeds.length];

    return {
      ...breed,
      // ใช้ URL จากแหล่งข้อมูลเดียวกับหน้า cat-breeds.html จึงเป็นรูปเดียวกันแน่นอน
      image_url: knowledge.image || knowledge.thumbnail || breed.image_url || fallback.image_url,
      image_fallback: knowledge.thumbnail || knowledge.image || fallback.image_url
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

function buildBreedTraits(breed) {
  const traits = [];

  if (Number(breed.friendly) >= 4) {
    traits.push("เป็นมิตร");
  }

  if (Number(breed.playful) >= 4) {
    traits.push("ขี้เล่น");
  }

  if (Number(breed.independence) >= 4) {
    traits.push("รักอิสระ");
  }

  if (Number(breed.apartment_suitability) >= 4) {
    traits.push("เหมาะกับคอนโด");
  }

  if (Number(breed.first_time_owner_friendly) >= 4) {
    traits.push("เหมาะกับมือใหม่");
  }

  return traits.slice(0, 3).length
    ? traits.slice(0, 3)
    : ["น่ารัก", "มีเอกลักษณ์", "น่าศึกษา"];
}

function renderBreeds(breeds) {
  const breedGrid = document.getElementById("breedGrid");

  if (!breedGrid) {
    return;
  }

  breedGrid.innerHTML = breeds
    .map((breed) => {
      const hasMatchScore = Number.isFinite(Number(breed.match_score));

      return `
        <article class="card breed-card reveal is-visible">
          <div class="breed-card-image">
            <img
              src="${escapeHTML(breed.image_url || fallbackBreeds[0].image_url)}"
              data-fallback-src="${escapeHTML(breed.image_fallback || fallbackBreeds[0].image_url)}"
              alt="${escapeHTML(breed.breed_name)}"
              loading="eager"
              decoding="async"
              fetchpriority="high"
            >

            <button
              class="icon-button favorite-button"
              type="button"
              aria-pressed="false"
              aria-label="บันทึก ${escapeHTML(breed.breed_name)}"
            >
              ♡
            </button>
          </div>

          <div class="breed-card-body">
            <h3>${escapeHTML(breed.breed_name)}</h3>

            <div class="trait-tags">
              ${(breed.traits || [])
                .map(
                  (trait) => `
                    <span class="trait-tag">${escapeHTML(trait)}</span>
                  `
                )
                .join("")}
            </div>

            <div class="match-block">
              ${
                hasMatchScore
                  ? `
                    <div class="match-row">
                      <span>ความเหมาะสม</span>
                      <strong>${Number(breed.match_score).toFixed(0)}%</strong>
                    </div>
                    <div class="match-track">
                      <div
                        class="match-fill"
                        style="width:${Math.max(0, Math.min(100, Number(breed.match_score)))}%"
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
              <span>ดูข้อมูลสายพันธุ์</span>
              <a class="text-link" href="./cat_detail.html?id=${Number(breed.breed_id)}">
                รายละเอียด →
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  breedGrid.querySelectorAll(".breed-card-image img").forEach((image) => {
    image.addEventListener("error", () => {
      const fallback = image.dataset.fallbackSrc;
      if (fallback && image.src !== fallback) image.src = fallback;
    }, { once: true });
  });
}

async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/stats`);

    if (!response.ok) {
      return;
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return;
    }

    setStat("farms", result.data.farms?.total);
    setStat("available", result.data.animals?.available);
    setStat("assessments", result.data.assessments?.total);
  } catch (error) {
    // ใช้ค่า 0 ต่อไป
  }
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
