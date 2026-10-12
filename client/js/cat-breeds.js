"use strict";

const API_BASE_URL = window.CATMATCH_API_URL;
const AUTH_STORAGE_KEYS = [
  "catmatch_token",
  "userToken",
  "token",
  "catmatch_user",
  "user"
];

const CAT_TAG_RULES = [
  { key: "coat-short", label: "ขนสั้น", match: (breed) => breed.coat === "short" },
  { key: "coat-medium", label: "ขนปานกลาง", match: (breed) => breed.coat === "medium" },
  { key: "coat-long", label: "ขนยาว", match: (breed) => breed.coat === "long" },
  { key: "coat-curly", label: "ขนหยิกหรือขนลอน", match: (breed) => breed.coat === "curly" },
  { key: "coat-hairless", label: "ไม่มีขน", match: (breed) => breed.coat === "hairless" },
  { key: "friendly", label: "เข้ากับคนง่าย", match: (breed) => breed.friendly >= 4 },
  { key: "affectionate", label: "ชอบปฏิสัมพันธ์", match: (breed) => breed.affectionate >= 4 },
  { key: "playful", label: "ชอบเล่น", match: (breed) => breed.playful >= 4 },
  { key: "calm", label: "บุคลิกสุขุม", match: (breed) => calmScore(breed) >= 3.1 && breed.activity <= 3 && breed.noise <= 3 },
  { key: "independent", label: "มีความเป็นอิสระ", match: (breed) => breed.independence >= 4 },
  { key: "trainable", label: "ฝึกและเรียนรู้ได้ดี", match: (breed) => breed.trainability >= 4 },
  { key: "protective", label: "มีแนวโน้มปกป้องพื้นที่", match: (breed) => breed.protective >= 4 },
  { key: "adaptable", label: "ปรับตัวเก่ง", match: (breed) => breed.adaptability >= 4 },
  { key: "social", label: "เข้าสังคมได้ดี", match: (breed) => breed.sociability >= 4 },
  { key: "active", label: "ชอบกิจกรรม", match: (breed) => breed.activity >= 4 || breed.playful >= 4 || breed.exercise >= 4 },
  { key: "exercise-high", label: "ต้องการกิจกรรมสม่ำเสมอ", match: (breed) => breed.exercise >= 4 },
  { key: "outdoor", label: "ชอบพื้นที่ภายนอก", match: (breed) => breed.outdoor >= 4 },
  { key: "apartment", label: "เหมาะกับพื้นที่จำกัด", match: (breed) => breed.apartment >= 4 },
  { key: "family", label: "เหมาะกับครอบครัว", match: (breed) => breed.family >= 4 && breed.friendly >= 3 },
  { key: "child-friendly", label: "เข้ากับเด็กได้ดี", match: (breed) => breed.child >= 4 && breed.friendly >= 4 },
  { key: "first-time", label: "เหมาะสำหรับผู้เลี้ยงครั้งแรก", match: (breed) => breed.firstTime >= 4 },
  { key: "low-grooming", label: "ดูแลขนไม่ซับซ้อน", match: (breed) => breed.grooming <= 2 && breed.shedding <= 3 },
  { key: "grooming-high", label: "ต้องดูแลขนสม่ำเสมอ", match: (breed) => breed.grooming >= 4 },
  { key: "shedding-low", label: "ผลัดขนน้อย", match: (breed) => breed.shedding <= 2 },
  { key: "shedding-high", label: "ผลัดขนมาก", match: (breed) => breed.shedding >= 4 },
  { key: "quiet", label: "ค่อนข้างเงียบ", match: (breed) => breed.noise <= 2 },
  { key: "vocal", label: "ชอบส่งเสียง", match: (breed) => breed.noise >= 4 },
  { key: "heat", label: "ทนร้อนได้ดี", match: (breed) => breed.heat >= 4 },
  { key: "cold", label: "ทนหนาวได้ดี", match: (breed) => breed.cold >= 4 }
];

const CAT_TAG_KEYS = new Set(CAT_TAG_RULES.map((rule) => rule.key));
const CARD_TAG_LIMIT = 3;
const CARD_TAG_GROUPS = [
  ["apartment", "family", "child-friendly", "first-time", "coat-short", "coat-medium", "coat-long", "coat-curly", "coat-hairless"],
  ["friendly", "affectionate", "playful", "calm", "independent", "trainable", "social", "adaptable", "protective"],
  ["active", "exercise-high", "outdoor", "low-grooming", "grooming-high", "shedding-low", "shedding-high", "quiet", "vocal", "heat", "cold"]
];
const state = {
  breeds: [],
  filtered: [],
  quick: "all",
  query: "",
  favorites: new Set(),
  expandedTags: new Set()
};
const elements = {};

window.addEventListener("DOMContentLoaded", initCatBreedsPage);

async function initCatBreedsPage() {
  cacheElements();
  setupAuthNavigation();
  setupHeader();
  setupFilters();
  setupGridActions();
  setupReveal();

  await loadFavoriteBreedIds();

  applyUrlFilters();
  loadBreeds();
}
function cacheElements() {
  elements.header = document.getElementById("siteHeader");
  elements.menuToggle = document.getElementById("menuToggle");
  elements.search = document.getElementById("breedSearch");
  elements.activity = document.getElementById("activityFilter");
  elements.coat = document.getElementById("coatFilter");
  elements.home = document.getElementById("homeFilter");
  elements.sort = document.getElementById("sortBreeds");
  elements.reset = document.getElementById("resetFilters");
  elements.emptyReset = document.getElementById("emptyReset");
  elements.grid = document.getElementById("breedGrid");
  elements.empty = document.getElementById("emptyState");
  elements.count = document.getElementById("resultCount");
 elements.heroTotal = document.getElementById("heroBreedTotal");
elements.heroBeginner = document.getElementById("heroBeginnerTotal");
elements.heroApartment = document.getElementById("heroApartmentTotal");
}
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
    for (const key of tokenKeys) {
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
    readStoredJSON("catmatch_user") ||
    readStoredJSON("user") ||
    null
  );
}

function getAccountDisplayName(user) {
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
    return fullName
      .split(/\s+/)[0];
  }

  return "ผู้ใช้งาน";
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

function setupAuthNavigation() {
  const guestActions =
    document.getElementById(
      "guestNavActions"
    );

  const userActions =
    document.getElementById(
      "userNavActions"
    );

  const menuTrigger =
    document.getElementById(
      "userMenuTrigger"
    );

  const menuPanel =
    document.getElementById(
      "userMenuPanel"
    );

  const token =
    getStoredToken();

  const user =
    getStoredUser();

  const loggedIn =
    Boolean(token && user);

  if (guestActions) {
    guestActions.hidden =
      loggedIn;

    guestActions.setAttribute(
      "aria-hidden",
      String(loggedIn)
    );
  }

  if (userActions) {
    userActions.hidden =
      !loggedIn;

    userActions.setAttribute(
      "aria-hidden",
      String(!loggedIn)
    );
  }

  if (
    !loggedIn ||
    !menuTrigger ||
    !menuPanel
  ) {
    return;
  }

  const displayName =
    getAccountDisplayName(user);

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
        element.textContent =
          value;
      }
    }
  );

  document.body.appendChild(
    menuPanel
  );

  function positionMenu() {
    if (menuPanel.hidden) {
      return;
    }

    const rect =
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
          rect.right -
          panelWidth,

          window.innerWidth -
          panelWidth -
          12
        )
      );

    menuPanel.style.width =
      `${panelWidth}px`;

    menuPanel.style.left =
      `${left}px`;

    menuPanel.style.top =
      `${rect.bottom + 10}px`;
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
        return;
      }

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
      if (event.key === "Escape") {
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

  document
    .getElementById(
      "logoutButton"
    )
    ?.addEventListener(
      "click",
      () => {
        clearAuthentication();

        window.location.replace(
          "./index.html"
        );
      }
    );

  document
    .getElementById("accountInfoButton")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
      window.location.href = "./account-info.html";
    });

  document
    .getElementById("accountSettingsButton")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
      window.location.href = "./settings.html";
    });
}

function setupHeader() {
  const updateHeader = () => {
    elements.header?.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  elements.menuToggle?.addEventListener("click", () => {
    const open = elements.header?.classList.toggle("menu-open");
    elements.menuToggle.setAttribute("aria-expanded", String(Boolean(open)));
  });
}

function setupFilters() {
  [elements.search, elements.activity, elements.coat, elements.home, elements.sort]
    .filter(Boolean)
    .forEach((control) => {
      const eventName = control === elements.search ? "input" : "change";
      control.addEventListener(eventName, applyFilters);
    });

  elements.reset?.addEventListener("click", resetFilters);
  elements.emptyReset?.addEventListener("click", resetFilters);

  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.quick = chip.dataset.quick || "all";
      document.querySelectorAll(".quick-chip").forEach((item) => {
        item.classList.toggle("is-active", item === chip);
      });
      updateTagQuery();
      applyFilters();
    });
  });

  document.getElementById("catClearTagFilter")?.addEventListener("click", clearTagFilter);
}

function setupGridActions() {
  elements.grid?.addEventListener("click", async (event) => {
    const favoriteButton = event.target.closest("[data-favorite-id]");
    if (favoriteButton) {
      event.preventDefault();
      await toggleFavorite(Number(favoriteButton.dataset.favoriteId));
      return;
    }

    const tagButton = event.target.closest("[data-tag-key]");
    if (tagButton) {
      event.preventDefault();
      selectTagFilter(String(tagButton.dataset.tagKey || ""));
      return;
    }

    const moreButton = event.target.closest("[data-cat-tag-more]");
    if (moreButton) {
      event.preventDefault();
      const breedId = Number(moreButton.dataset.catTagMore);
      if (state.expandedTags.has(breedId)) state.expandedTags.delete(breedId);
      else state.expandedTags.add(breedId);
      renderBreeds();
      return;
    }

    const detailLink = event.target.closest("[data-detail-id]");
    if (!detailLink) return;

    const breed = state.breeds.find(
      (item) => item.id === Number(detailLink.dataset.detailId)
    );

    if (!breed) return;

    try {
      sessionStorage.setItem("catmatch_selected_breed", JSON.stringify(breed));
    } catch {
      // หน้า Detail ยังโหลดจากข้อมูล local หรือ Backend ได้
    }
  });
}
function setupReveal() {
  const items = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });

  items.forEach((item) => observer.observe(item));
}

async function loadBreeds() {
  const localRows = Array.isArray(window.CATMATCH_CAT_BREEDS)
    ? window.CATMATCH_CAT_BREEDS
    : [];

  let rows = localRows;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${API_BASE_URL}/breeds?limit=100`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      if (response.ok) {
        const payload = await response.json();
        const remoteRows = extractRows(payload);
        if (remoteRows.length) rows = mergeRows(localRows, remoteRows);
      }
    } finally {
      window.clearTimeout(timer);
    }
  } catch (error) {
    console.info("ใช้ข้อมูลสายพันธุ์ในเครื่อง:", error?.message || error);
  }

  const normalized = rows.map(normalizeBreed);

  // แสดงข้อมูลทันที แล้วเติมรูปสำรองเฉพาะรายการที่ไม่มีรูปใน Knowledge
  state.breeds = normalized;
  updateTotals();
  applyFilters();

  enrichMissingImages(normalized).catch((error) => {
    console.info("โหลดรูปสำรองบางรายการไม่สำเร็จ:", error?.message || error);
  });
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.breeds)) return payload.breeds;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function mergeRows(localRows, remoteRows) {
  if (!localRows.length) return remoteRows;

  const remoteById = new Map(
    remoteRows.map((row) => [Number(row.breed_id ?? row.id), row])
  );

  return localRows.map((local) => {
    const id = Number(local.breed_id ?? local.id);
    const remote = remoteById.get(id) || {};

    return {
      ...local,
      ...remote,
      breed_id: local.breed_id ?? local.id,
      breed_name: local.breed_name ?? local.name
    };
  });
}

function normalizeBreed(raw, index = 0) {
  const id = Number(raw.breed_id ?? raw.id ?? index + 1);
  const knowledge = window.CatMatchBreedKnowledge?.get?.(id) || {};
  const databaseName = String(
    raw.breed_name ?? raw.name ?? `สายพันธุ์ ${id}`
  ).trim();
  const name = String(knowledge.officialName || databaseName).trim();
  const coatLabel = window.CatMatchBreedKnowledge?.coatLabel?.(id, name)
    || coatText(normalizeCoat(raw.coat_length ?? raw.coat_type ?? inferCoatFromName(name)));
  const coat = normalizeCoat(raw.coat_length ?? raw.coat_type ?? coatLabel);

  return {
    id,
    name,
    databaseName,
    thaiName: String(
      raw.thai_name ?? raw.breed_name_th ?? raw.thai_breed_name ?? ""
    ),
    origin: String(knowledge.origin || raw.origin || raw.country_of_origin || "ไม่ระบุ"),
    description: String(raw.description ?? raw.breed_description ?? ""),
    coat,
    coatLabel,
    image: String(knowledge.image || knowledge.thumbnail || raw.image || ""),
    thumbnail: String(knowledge.thumbnail || knowledge.image || raw.image || ""),
    sourceUrl: String(knowledge.sourceUrl || ""),
    referenceImageId: "",
    imageMatched: Boolean(knowledge.image || knowledge.thumbnail),
    matchedBreedName: name,
    imageSource: knowledge.image || knowledge.thumbnail ? "knowledge" : "none",
    features: Array.isArray(knowledge.features) ? knowledge.features : [],
    comparisons: Array.isArray(knowledge.comparisons) ? knowledge.comparisons : [],
    friendly: score(raw.friendly, 3),
    affectionate: score(raw.affectionate ?? raw.affection, 3),
    playful: score(raw.playful, 3),
    independence: score(raw.independence, 3),
    trainability: score(raw.trainability, 3),
    protective: score(raw.protective, 3),
    adaptability: score(raw.adaptability, 3),
    sociability: score(raw.sociability, 3),
    activity: score(raw.activity_level ?? raw.activity ?? raw.energy_level, 3),
    exercise: score(raw.exercise_need, 3),
    outdoor: score(raw.outdoor_preference, 3),
    apartment: score(raw.apartment_suitability, 3),
    family: score(raw.family_friendly, 3),
    child: score(raw.child_friendly, 3),
    firstTime: score(raw.first_time_owner_friendly, 3),
    grooming: score(raw.grooming_need ?? raw.care_need, 3),
    shedding: score(raw.shedding_level, 3),
    noise: score(raw.noise_level, 3),
    heat: score(raw.heat_tolerance, 3),
    cold: score(raw.cold_tolerance, 3),
    lifeSpan: String(raw.life_span ?? ""),
    temperament: String(raw.temperament ?? "")
  };
}

async function enrichMissingImages(breeds) {
  const resolver = window.CatMatchBreedImages;
  if (!resolver?.matchBreed) return;

  const missing = breeds.filter((breed) => !breed.image);
  if (!missing.length) return;

  const enriched = await Promise.all(missing.map(async (breed) => {
    const match = await resolver.matchBreed(breed);
    return { breed, match };
  }));

  let changed = false;

  enriched.forEach(({ breed, match }) => {
    if (!match?.matched || !match.imageUrl) return;

    breed.image = match.imageUrl;
    breed.thumbnail = match.thumbnail || match.imageUrl;
    breed.referenceImageId = match.referenceImageId || "";
    breed.imageMatched = true;
    breed.matchedBreedName = match.matchedName || breed.name;
    breed.imageSource = match.source || "fallback";
    breed.sourceUrl = breed.sourceUrl || match.sourceUrl || "";

    if (breed.origin === "ไม่ระบุ" && match.metadata?.origin) {
      breed.origin = String(match.metadata.origin);
    }
    if (!breed.lifeSpan && match.metadata?.life_span) {
      breed.lifeSpan = String(match.metadata.life_span);
    }
    if (!breed.temperament && match.metadata?.temperament) {
      breed.temperament = String(match.metadata.temperament);
    }

    changed = true;
  });

  if (changed) applyFilters();
}

function updateTotals() {
  const total = state.breeds.length;

  const beginnerCount = state.breeds.filter(
    (breed) => breed.firstTime >= 4
  ).length;

  const apartmentCount = state.breeds.filter(
    (breed) => breed.apartment >= 4
  ).length;

  if (elements.heroTotal) {
    elements.heroTotal.textContent = total.toLocaleString("th-TH");
  }

  if (elements.heroBeginner) {
    elements.heroBeginner.textContent =
      beginnerCount.toLocaleString("th-TH");
  }

  if (elements.heroApartment) {
    elements.heroApartment.textContent =
      apartmentCount.toLocaleString("th-TH");
  }
}
function getBreedTags(breed) {
  const tags = CAT_TAG_RULES
    .filter((rule) => rule.match(breed))
    .map(({ key, label }) => ({ key, label }));

  if (tags.length) return tags;

  return [{
    key: getCoatTagKey(breed.coat),
    label: breed.coatLabel || "ข้อมูลสายพันธุ์"
  }];
}

function getCoatTagKey(coat) {
  const keys = {
    short: "coat-short",
    medium: "coat-medium",
    long: "coat-long",
    curly: "coat-curly",
    hairless: "coat-hairless"
  };
  return keys[coat] || "coat-short";
}

function getTagLabel(tagKey) {
  return CAT_TAG_RULES.find((rule) => rule.key === tagKey)?.label || "";
}

function getCompactTags(tags) {
  if (tags.length <= CARD_TAG_LIMIT) return tags;

  const byKey = new Map(tags.map((tag) => [tag.key, tag]));
  const selected = [];

  CARD_TAG_GROUPS.forEach((group) => {
    if (selected.length >= CARD_TAG_LIMIT) return;
    const key = group.find((candidate) =>
      byKey.has(candidate) && !selected.some((tag) => tag.key === candidate)
    );
    if (key) selected.push(byKey.get(key));
  });

  tags.forEach((tag) => {
    if (
      selected.length < CARD_TAG_LIMIT &&
      !selected.some((item) => item.key === tag.key)
    ) selected.push(tag);
  });

  if (
    state.quick !== "all" &&
    byKey.has(state.quick) &&
    !selected.some((tag) => tag.key === state.quick)
  ) {
    selected[selected.length - 1] = byKey.get(state.quick);
  }

  return selected.slice(0, CARD_TAG_LIMIT);
}

function updateTagQuery() {
  const url = new URL(window.location.href);
  if (state.quick && state.quick !== "all") url.searchParams.set("tag", state.quick);
  else url.searchParams.delete("tag");
  window.history.replaceState({}, "", url);
}

function renderActiveTagFilter() {
  const panel = document.getElementById("catActiveTagFilter");
  const label = document.getElementById("catActiveTagLabel");
  if (!panel || !label) return;

  if (!state.quick || state.quick === "all") {
    panel.hidden = true;
    label.textContent = "";
    return;
  }

  panel.hidden = false;
  label.textContent = getTagLabel(state.quick) || "ตัวกรองที่เลือก";
}

function selectTagFilter(tagKey) {
  if (!CAT_TAG_KEYS.has(tagKey)) return;

  state.quick = tagKey;
  state.query = "";

  if (elements.search) elements.search.value = "";
  if (elements.activity) elements.activity.value = "all";
  if (elements.coat) elements.coat.value = "all";
  if (elements.home) elements.home.value = "all";

  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.quick === tagKey);
  });

  updateTagQuery();
  applyFilters();
  document.getElementById("catActiveTagFilter")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function clearTagFilter() {
  state.quick = "all";
  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.quick === "all");
  });
  updateTagQuery();
  applyFilters();
}


function joinThaiSummary(parts) {
  const values = parts.filter(Boolean).slice(0, 3);

  if (!values.length) return "มีลักษณะนิสัยและการดูแลเฉพาะตัว";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} และ${values[1]}`;

  return `${values[0]} ${values[1]} และ${values[2]}`;
}

function getCatCardSummary(breed) {
  const name = breed.thaiName && breed.thaiName !== "ชื่อสายพันธุ์สากล"
    ? breed.thaiName
    : breed.name;

  const profile = [];

  if (breed.trainability >= 4) {
    profile.push("เรียนรู้ไว");
  }

  if (breed.playful >= 4 || breed.activity >= 4) {
    profile.push("กระตือรือร้น");
  } else if (breed.activity <= 2 && breed.noise <= 3) {
    profile.push("มีบุคลิกสงบ");
  }

  if (breed.friendly >= 4 && breed.affectionate >= 4) {
    profile.push("ชอบมีส่วนร่วมกับสมาชิกในครอบครัว");
  } else if (breed.family >= 4) {
    profile.push("ปรับตัวเข้ากับครอบครัวได้ดี");
  } else if (breed.independence >= 4) {
    profile.push("มีความเป็นอิสระ");
  } else if (breed.apartment >= 4) {
    profile.push("เหมาะกับการเลี้ยงในบ้าน");
  }

  if (profile.length < 2 && breed.grooming >= 4) {
    profile.push("ควรดูแลขนอย่างสม่ำเสมอ");
  } else if (profile.length < 2 && breed.grooming <= 2 && breed.shedding <= 3) {
    profile.push("ดูแลขนได้ไม่ซับซ้อน");
  }

  return `${name} เป็นแมวที่${joinThaiSummary(profile)}`;
}

function renderBreeds() {
  if (elements.count) {
    elements.count.textContent =
      state.filtered.length.toLocaleString("th-TH");
  }

  if (elements.empty) {
    elements.empty.hidden = state.filtered.length !== 0;
  }

  if (elements.grid) {
    elements.grid.hidden = state.filtered.length === 0;
  }

  if (!elements.grid) {
    return;
  }

  const placeholder =
    window.CatMatchBreedKnowledge?.placeholder || "";

  elements.grid.innerHTML = state.filtered
    .map((breed) => {
      const favorite = state.favorites.has(breed.id);
      const tags = getBreedTags(breed);
      const tagsExpanded = state.expandedTags.has(breed.id);
      const visibleTags = tagsExpanded ? tags : getCompactTags(tags);
      const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
      const imageUrl = breed.image || placeholder;

      return `
        <article class="breed-card cat-compact-card">
          <div class="breed-image ${
            breed.imageMatched
              ? "image-verified"
              : "image-pending"
          }">
            <img
              src="${escapeHTML(imageUrl)}"
              data-breed-id="${breed.id}"
              data-breed-name="${escapeHTML(breed.name)}"
              data-reference-image-id="${escapeHTML(
                breed.referenceImageId
              )}"
              data-image-stage="full"
              alt="ภาพอ้างอิงแมวสายพันธุ์ ${escapeHTML(
                breed.name
              )}"
              loading="lazy"
              onerror="window.CatMatchBreedImages.repairImageElement(this)"
            >

            <button
              class="favorite-btn ${
                favorite ? "is-active" : ""
              }"
              type="button"
              data-favorite-id="${breed.id}"
              aria-pressed="${favorite}"
              aria-label="${
                favorite
                  ? "นำออกจากรายการโปรด"
                  : "บันทึกเป็นรายการโปรด"
              }"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>
              </svg>
            </button>
          </div>

          <div class="breed-body">
            <h3>${escapeHTML(breed.name)}</h3>

            <p class="cat-card-summary">
              ${escapeHTML(getCatCardSummary(breed))}
            </p>

            <div class="trait-tags ${tagsExpanded ? "is-expanded" : ""}" aria-label="แท็กของ ${escapeHTML(breed.name)}">
              ${visibleTags
                .map(
                  (tag) => `
                    <button
                      class="trait-tag ${state.quick === tag.key ? "is-active" : ""}"
                      type="button"
                      data-tag-key="${escapeHTML(tag.key)}"
                      aria-pressed="${state.quick === tag.key}"
                      title="แสดงแมวทั้งหมดที่มีแท็ก ${escapeHTML(tag.label)}"
                    >
                      ${escapeHTML(tag.label)}
                    </button>
                  `
                )
                .join("")}
              ${tags.length > CARD_TAG_LIMIT ? `
                <button
                  class="cat-tag-more"
                  type="button"
                  data-cat-tag-more="${breed.id}"
                  aria-expanded="${tagsExpanded}"
                  title="${tagsExpanded ? "ย่อรายการแท็ก" : `ดูแท็กเพิ่มเติมอีก ${hiddenTagCount} รายการ`}"
                >${tagsExpanded ? "ย่อแท็ก" : `+อีก ${hiddenTagCount}`}</button>
              ` : ""}
            </div>

            <a
              class="detail-btn"
              href="./cat_detail.html?id=${encodeURIComponent(
                breed.id
              )}"
              data-detail-id="${breed.id}"
            >
              ดูรายละเอียดสายพันธุ์
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function applyFilters() {
  const query = normalizeText(elements.search?.value || "");
  const activityFilter = elements.activity?.value || "all";
  const coatFilter = elements.coat?.value || "all";
  const homeFilter = elements.home?.value || "all";

  state.query = query;

  state.filtered = state.breeds.filter((breed) => {
    const matchesSearch = matchesNameSearch(breed, query);

    const matchesActivity =
      activityFilter === "all" ||
      getActivityGroup(breed.activity) === activityFilter;

    const matchesCoat =
      coatFilter === "all" ||
      breed.coat === coatFilter;

    const matchesHome =
      homeFilter === "all" ||
      (
        homeFilter === "apartment" &&
        breed.apartment >= 4
      ) ||
      (
        homeFilter === "family" &&
        breed.family >= 4 &&
        breed.child >= 3
      ) ||
      (
        homeFilter === "first-time" &&
        breed.firstTime >= 4
      );

    return (
      matchesSearch &&
      matchesActivity &&
      matchesCoat &&
      matchesHome &&
      matchesQuickFilter(breed, state.quick)
    );
  });

  sortFilteredBreeds();
  renderActiveTagFilter();
  renderBreeds();
}

/*
 * คืนชื่อที่อนุญาตให้นำมาใช้ค้นหา
 * ไม่ค้นจากประเทศ แหล่งกำเนิด ขน หรือคำอธิบาย
 */
function getNameCandidates(breed, query) {
  const aliases = breed.id === 1
    ? [
        "Abyssinian",
        "อบิสซิเนียน",
        "อะบิสซิเนียน"
      ]
    : [];

  const hasThai = /[\u0E00-\u0E7F]/.test(query);
  const hasEnglish = /[a-z]/i.test(query);

  /*
   * เมื่อพิมพ์ภาษาไทย ให้เทียบกับชื่อไทย
   * เช่น อบิส หรือ โ
   */
  if (hasThai && !hasEnglish) {
    return [
      breed.thaiName,
      ...aliases.filter((name) =>
        /[\u0E00-\u0E7F]/.test(name)
      )
    ].filter(Boolean);
  }

  /*
   * เมื่อพิมพ์ภาษาอังกฤษ ให้เทียบกับชื่ออังกฤษ
   */
  if (hasEnglish && !hasThai) {
    return [
      breed.name,
      breed.databaseName,
      ...aliases.filter((name) =>
        /[a-z]/i.test(name)
      )
    ].filter(Boolean);
  }

  return [
    breed.name,
    breed.databaseName,
    breed.thaiName,
    ...aliases
  ].filter(Boolean);
}

/*
 * ลำดับความใกล้เคียงของชื่อ
 * 0 = ชื่อตรงกัน
 * 1 = ขึ้นต้นด้วยคำค้นหา
 * 2 = มีคำค้นหาอยู่ภายในชื่อ
 * 99 = ไม่ตรง
 */
function nameSearchRank(breed, query) {
  if (!query) return 0;

  const candidates = getNameCandidates(breed, query)
    .map(normalizeText)
    .filter(Boolean);

  let bestRank = 99;

  candidates.forEach((name) => {
    if (name === query) {
      bestRank = Math.min(bestRank, 0);
      return;
    }

    if (name.startsWith(query)) {
      bestRank = Math.min(bestRank, 1);
      return;
    }

    /*
     * การค้นหาภายในชื่อใช้ตั้งแต่ 2 ตัวอักษรขึ้นไป
     * ป้องกันการพิมพ์เพียงตัวเดียวแล้วเจอผลลัพธ์มากเกินไป
     */
    if (query.length >= 2 && name.includes(query)) {
      bestRank = Math.min(bestRank, 2);
    }
  });

  return bestRank;
}

function matchesNameSearch(breed, query) {
  if (!query) return true;
  return nameSearchRank(breed, query) < 99;
}

/*
 * คะแนนบุคลิกสุขุมคำนวณจากหลายคุณลักษณะ
 * ไม่ได้กำหนดรายชื่อสายพันธุ์ไว้ตายตัว
 */
function calmScore(breed) {
  const activityCalm = 6 - breed.activity;
  const quietness = 6 - breed.noise;
  const playCalm = 6 - breed.playful;

  const calculated =
    activityCalm * 0.4 +
    quietness * 0.3 +
    playCalm * 0.15 +
    breed.adaptability * 0.1 +
    breed.independence * 0.05;

  return Math.min(5, Math.max(1, calculated));
}

function matchesQuickFilter(breed, quick) {
  if (!quick || quick === "all") return true;
  const rule = CAT_TAG_RULES.find((item) => item.key === quick);
  return rule ? Boolean(rule.match(breed)) : true;
}
function sortFilteredBreeds() {
  const sort = elements.sort?.value || "name-asc";

  state.filtered.sort((a, b) => {
    /*
     * เมื่อมีคำค้นหา ให้ชื่อที่ตรงหรือขึ้นต้นตรงกัน
     * แสดงก่อนชื่อที่เพียงมีคำนั้นอยู่ภายใน
     */
    if (state.query) {
      const rankDifference =
        nameSearchRank(a, state.query) -
        nameSearchRank(b, state.query);

      if (rankDifference !== 0) {
        return rankDifference;
      }

      const queryIsThai =
        /[\u0E00-\u0E7F]/.test(state.query);

      const displayNameA = queryIsThai
        ? a.thaiName || a.name
        : a.name;

      const displayNameB = queryIsThai
        ? b.thaiName || b.name
        : b.name;

      const nameDifference = displayNameA.localeCompare(
        displayNameB,
        queryIsThai ? "th" : "en"
      );

      if (nameDifference !== 0) {
        return nameDifference;
      }
    }

    if (sort === "name-desc") {
      return b.name.localeCompare(a.name, "en");
    }

    if (sort === "friendly") {
      return (
        b.friendly - a.friendly ||
        a.name.localeCompare(b.name, "en")
      );
    }

    if (sort === "easy-care") {
      return (
        a.grooming - b.grooming ||
        a.name.localeCompare(b.name, "en")
      );
    }

    return a.name.localeCompare(b.name, "en");
  });
}

function miniScore(label, value) {
  const safeValue = Math.min(
    5,
    Math.max(1, Math.round(Number(value) || 1))
  );

  return `
    <div
      class="mini-score"
      aria-label="${escapeHTML(label)} ${safeValue} จาก 5"
    >
      <span>${escapeHTML(label)}</span>

      <div class="mini-track" aria-hidden="true">
        <div
          class="mini-fill"
          style="width: ${safeValue * 20}%"
        ></div>
      </div>

      <strong>${safeValue}</strong>
    </div>
  `;
}

async function loadFavoriteBreedIds() {
  const token =
    getStoredToken();

  state.favorites.clear();

  if (!token) {
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
      await response
        .json()
        .catch(() => ({}));

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      clearAuthentication();

      window.location.replace(
        "./login.html"
      );

      return;
    }

    if (
      !response.ok ||
      result.success === false
    ) {
      throw new Error(
        result.message ||
        "ไม่สามารถโหลดรายการที่ถูกใจได้"
      );
    }

    const favorites =
      Array.isArray(result.data)
        ? result.data
        : [];

    favorites.forEach((favorite) => {
      const breedId =
        Number(
          favorite.breed_id ??
          favorite.id
        );

      if (
        Number.isInteger(breedId) &&
        breedId > 0
      ) {
        state.favorites.add(
          breedId
        );
      }
    });
  } catch (error) {
    console.error(
      "Load favorite breeds error:",
      error
    );
  }
}

async function toggleFavorite(id) {
  const breedId =
    Number(id);

  const token =
    getStoredToken();

  if (
    !Number.isInteger(breedId) ||
    breedId <= 0
  ) {
    return;
  }

  if (!token) {
    window.alert(
      "กรุณาเข้าสู่ระบบก่อนบันทึกแมวที่ถูกใจ"
    );

    window.location.href =
      "./login.html";

    return;
  }

  const alreadyFavorite =
    state.favorites.has(
      breedId
    );

  const favoriteButton =
    elements.grid?.querySelector(
      `[data-favorite-id="${breedId}"]`
    );

  if (favoriteButton) {
    favoriteButton.disabled = true;
  }

  try {
    const requestOptions = {
      method:
        alreadyFavorite
          ? "DELETE"
          : "POST",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    };

    let requestUrl =
      `${API_BASE_URL}/favorites`;

    if (alreadyFavorite) {
      requestUrl =
        `${API_BASE_URL}/favorites/${breedId}`;
    } else {
      requestOptions.headers[
        "Content-Type"
      ] = "application/json";

      requestOptions.body =
        JSON.stringify({
          breed_id: breedId
        });
    }

    const response = await fetch(
      requestUrl,
      requestOptions
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
        "./login.html"
      );

      return;
    }

    if (
      !response.ok ||
      result.success === false
    ) {
      throw new Error(
        result.message ||
        "ไม่สามารถบันทึกรายการที่ถูกใจได้"
      );
    }

    if (alreadyFavorite) {
      state.favorites.delete(
        breedId
      );
    } else {
      state.favorites.add(
        breedId
      );
    }

    renderBreeds();
  } catch (error) {
    console.error(
      "Toggle favorite error:",
      error
    );

    window.alert(
      error.message ||
      "บันทึกรายการไม่สำเร็จ"
    );
  } finally {
    if (
      favoriteButton &&
      document.body.contains(
        favoriteButton
      )
    ) {
      favoriteButton.disabled =
        false;
    }
  }
}
function applyUrlFilters() {
  const parameters = new URLSearchParams(window.location.search);
  const tag = normalizeText(parameters.get("tag") || "");

  if (!CAT_TAG_KEYS.has(tag)) return;

  state.quick = tag;
  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.quick === tag);
  });
}
function resetFilters() {
  if (elements.search) {
    elements.search.value = "";
  }

  if (elements.activity) {
    elements.activity.value = "all";
  }

  if (elements.coat) {
    elements.coat.value = "all";
  }

  if (elements.home) {
    elements.home.value = "all";
  }

  if (elements.sort) {
    elements.sort.value = "name-asc";
  }

  state.quick = "all";
  state.query = "";

  /*
   * ลบ ?tag=... ออกจาก URL
   * เพื่อไม่ให้รีเฟรชแล้วกลับไปใช้ตัวกรองเดิม
   */
  updateTagQuery();

  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.classList.toggle(
      "is-active",
      chip.dataset.quick === "all"
    );
  });

  applyFilters();
  elements.search?.focus();
}


function inferCoatFromName(name) {
  const text = normalizeText(name);
  if (["sphynx", "donskoy", "peterbald"].some((item) => text.includes(item))) {
    return "hairless";
  }
  if (
    text.includes("longhair") ||
    ["somali", "birman", "ragdoll", "cymric", "himalayan", "maine coon", "persian", "siberian"]
      .some((item) => text.includes(item))
  ) {
    return "long";
  }
  return "short";
}

function normalizeCoat(value) {
  const text = normalizeText(value);
  if (text.includes("ไม่มีขน") || text.includes("hairless")) return "hairless";
  if (text.includes("หยิก") || text.includes("ลอน") || text.includes("wire")) return "curly";
  if (text.includes("ยาว") || text.includes("long")) return "long";
  if (text.includes("ปานกลาง") || text.includes("medium") || text.includes("กึ่งยาว")) return "medium";
  return "short";
}

function coatText(coat) {
  return ({
    short: "ขนสั้น",
    medium: "ขนปานกลาง",
    long: "ขนยาว",
    curly: "ขนหยิกหรือขนลอน",
    hairless: "ไม่มีขนหรือมีขนอ่อนมาก"
  })[coat] || "ไม่ระบุ";
}

function score(value, fallback = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(5, Math.max(1, Math.round(number)));
}

function getActivityGroup(value) {
  if (value <= 2) return "low";
  if (value >= 4) return "high";
  return "medium";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("th-TH")
    .trim();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}
