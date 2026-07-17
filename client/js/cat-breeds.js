"use strict";

const API_BASE_URL = "http://localhost:3000/api";
const state = {
  breeds: [],
  filtered: [],
  quick: "all",
  favorites: new Set(loadFavorites())
};
const elements = {};

window.addEventListener("DOMContentLoaded", initCatBreedsPage);

function initCatBreedsPage() {
  cacheElements();
  setupHeader();
  setupFilters();
  setupGridActions();
  setupReveal();
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
      applyFilters();
    });
  });
}

function setupGridActions() {
  elements.grid?.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-favorite-id]");
    if (favoriteButton) {
      event.preventDefault();
      toggleFavorite(Number(favoriteButton.dataset.favoriteId));
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
  if (elements.heroTotal) {
    elements.heroTotal.textContent = state.breeds.length.toLocaleString("th-TH");
  }
}

function renderBreeds() {
  if (elements.count) {
    elements.count.textContent = state.filtered.length.toLocaleString("th-TH");
  }

  if (elements.empty) elements.empty.hidden = state.filtered.length !== 0;
  if (elements.grid) elements.grid.hidden = state.filtered.length === 0;
  if (!elements.grid) return;

  const placeholder = window.CatMatchBreedKnowledge?.placeholder || "";

  elements.grid.innerHTML = state.filtered.map((breed) => {
    const favorite = state.favorites.has(breed.id);
    const tags = buildTags(breed).slice(0, 3);
    const features = breed.features.slice(0, 2);
    const imageUrl = breed.image || placeholder;

    return `
      <article class="breed-card">
        <div class="breed-image ${breed.imageMatched ? "image-verified" : "image-pending"}">
          <img
            src="${escapeHTML(imageUrl)}"
            data-breed-id="${breed.id}"
            data-reference-image-id="${escapeHTML(breed.referenceImageId)}"
            data-image-stage="full"
            alt="ภาพอ้างอิงแมวสายพันธุ์ ${escapeHTML(breed.name)}"
            loading="lazy"
            onerror="window.CatMatchBreedImages.repairImageElement(this)">

          <button
            class="favorite-btn ${favorite ? "is-active" : ""}"
            type="button"
            data-favorite-id="${breed.id}"
            aria-pressed="${favorite}"
            aria-label="${favorite ? "นำออกจากรายการโปรด" : "บันทึกเป็นรายการโปรด"}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>
            </svg>
          </button>

          <span class="coat-badge">${escapeHTML(breed.coatLabel)}</span>
        </div>

        <div class="breed-body">
          <h3>${escapeHTML(breed.name)}</h3>
          <p class="breed-thai-name">${escapeHTML(breed.thaiName || "ชื่อสายพันธุ์สากล")}</p>

          <div class="trait-tags">
            ${tags.map((tag) => `<span class="trait-tag">${escapeHTML(tag)}</span>`).join("")}
          </div>

          ${features.length ? `
            <p class="card-observe-label">จุดสังเกต</p>
            <ul class="card-feature-list">
              ${features.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ul>
          ` : ""}

          <div class="mini-scores">
            ${miniScore("เป็นมิตร", breed.friendly)}
            ${miniScore("กิจกรรม", breed.activity)}
            ${miniScore("ดูแลง่าย", 6 - breed.grooming)}
          </div>

          <a
            class="detail-btn"
            href="./cat_detail.html?id=${encodeURIComponent(breed.id)}"
            data-detail-id="${breed.id}">
            เรียนรู้สายพันธุ์นี้ <span aria-hidden="true">→</span>
          </a>
        </div>
      </article>`;
  }).join("");
}

function applyFilters() {
  const query = normalizeText(elements.search?.value || "");
  const activityFilter = elements.activity?.value || "all";
  const coatFilter = elements.coat?.value || "all";
  const homeFilter = elements.home?.value || "all";

  state.filtered = state.breeds.filter((breed) => {
    const searchable = normalizeText([
      breed.name,
      breed.databaseName,
      breed.thaiName,
      breed.origin,
      breed.coatLabel,
      ...breed.features
    ].join(" "));

    const matchesSearch = !query || searchable.includes(query);
    const matchesActivity = activityFilter === "all"
      || getActivityGroup(breed.activity) === activityFilter;
    const matchesCoat = coatFilter === "all" || breed.coat === coatFilter;
    const matchesHome = homeFilter === "all" || (
      (homeFilter === "apartment" && breed.apartment >= 4) ||
      (homeFilter === "family" && breed.family >= 4 && breed.child >= 4) ||
      (homeFilter === "first-time" && breed.firstTime >= 4)
    );

    return matchesSearch
      && matchesActivity
      && matchesCoat
      && matchesHome
      && matchesQuickFilter(breed, state.quick);
  });

  sortFilteredBreeds();
  renderBreeds();
}

function matchesQuickFilter(breed, quick) {
  if (quick === "apartment") return breed.apartment >= 4;
  if (quick === "playful") return breed.playful >= 4;
  if (quick === "calm") return breed.activity <= 2 && breed.noise <= 2;
  if (quick === "easy-care") return breed.grooming <= 2;
  if (quick === "first-time") return breed.firstTime >= 4;
  return true;
}

function sortFilteredBreeds() {
  const sort = elements.sort?.value || "name-asc";

  state.filtered.sort((a, b) => {
    if (sort === "name-desc") return b.name.localeCompare(a.name, "en");
    if (sort === "friendly") {
      return b.friendly - a.friendly || a.name.localeCompare(b.name, "en");
    }
    if (sort === "easy-care") {
      return a.grooming - b.grooming || a.name.localeCompare(b.name, "en");
    }
    return a.name.localeCompare(b.name, "en");
  });
}

function miniScore(label, value) {
  return `
    <div class="mini-score">
      <span>${escapeHTML(label)}</span>
      <div class="mini-track"><div class="mini-fill" style="width:${value * 20}%"></div></div>
      <strong>${value}</strong>
    </div>`;
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);

  try {
    localStorage.setItem(
      "catmatch_favorite_breeds",
      JSON.stringify([...state.favorites])
    );
  } catch {
    // UI ยังตอบสนองได้แม้บันทึกลง localStorage ไม่สำเร็จ
  }

  renderBreeds();
}

function loadFavorites() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem("catmatch_favorite_breeds") || "[]"
    );
    return Array.isArray(parsed)
      ? parsed.map(Number).filter(Number.isFinite)
      : [];
  } catch {
    return [];
  }
}

function resetFilters() {
  if (elements.search) elements.search.value = "";
  if (elements.activity) elements.activity.value = "all";
  if (elements.coat) elements.coat.value = "all";
  if (elements.home) elements.home.value = "all";
  if (elements.sort) elements.sort.value = "name-asc";

  state.quick = "all";
  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.quick === "all");
  });

  applyFilters();
  elements.search?.focus();
}

function buildTags(breed) {
  const tags = [];
  if (breed.friendly >= 4) tags.push("เป็นมิตร");
  if (breed.affectionate >= 4) tags.push("ติดคน");
  if (breed.playful >= 4) tags.push("ขี้เล่น");
  if (breed.independence >= 4) tags.push("รักอิสระ");
  if (breed.apartment >= 4) tags.push("เหมาะกับคอนโด");
  if (breed.firstTime >= 4) tags.push("เหมาะกับมือใหม่");
  if (breed.grooming <= 2) tags.push("ดูแลง่าย");
  if (breed.activity <= 2) tags.push("รักสงบ");
  return tags.length ? [...new Set(tags)] : [breed.coatLabel];
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
