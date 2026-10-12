"use strict";

(() => {
  const API_BASE = window.CATMATCH_API_URL;
  const localRows = Array.isArray(window.DOGMATCH_DOG_BREEDS) ? window.DOGMATCH_DOG_BREEDS : [];
  const fallback = window.DOGMATCH_DOG_FALLBACK || "";

  const TAG_RULES = [
    { key: "friendly-high", label: "เข้ากับคนง่าย", match: (row) => row.friendly >= 4 },
    { key: "friendly-low", label: "ต้องใช้เวลาทำความคุ้นเคย", match: (row) => row.friendly <= 2 },
    { key: "affectionate-high", label: "ชอบปฏิสัมพันธ์", match: (row) => row.affectionate >= 4 },
    { key: "playful-high", label: "ชอบเล่น", match: (row) => row.playful >= 4 },
    { key: "independent-high", label: "มีความเป็นอิสระ", match: (row) => row.independence >= 4 },
    { key: "trainable-high", label: "ฝึกได้ดี", match: (row) => row.trainability >= 4 },
    { key: "training-patience", label: "ต้องฝึกอย่างสม่ำเสมอ", match: (row) => row.trainability <= 2 },
    { key: "protective-high", label: "มีแนวโน้มปกป้อง", match: (row) => row.protective >= 4 },
    { key: "adaptable-high", label: "ปรับตัวเก่ง", match: (row) => row.adaptability >= 4 },
    { key: "social-high", label: "เข้าสังคมได้ดี", match: (row) => row.sociability >= 4 },
    { key: "active-high", label: "ชอบกิจกรรม", match: (row) => row.activity_level >= 4 },
    { key: "calm-low", label: "ค่อนข้างสงบ", match: (row) => row.activity_level <= 2 },
    { key: "exercise-high", label: "ต้องออกกำลังกายมาก", match: (row) => row.exercise_need >= 4 },
    { key: "exercise-low", label: "ออกกำลังกายไม่มาก", match: (row) => row.exercise_need <= 2 },
    { key: "outdoor-high", label: "ชอบพื้นที่กลางแจ้ง", match: (row) => row.outdoor_preference >= 4 },
    { key: "apartment-high", label: "เหมาะกับพื้นที่จำกัด", match: (row) => row.apartment_suitability >= 4 },
    { key: "family-high", label: "เหมาะกับครอบครัว", match: (row) => row.family_friendly >= 4 },
    { key: "child-high", label: "เข้ากับเด็กได้ดี", match: (row) => row.child_friendly >= 4 },
    { key: "beginner-high", label: "เหมาะกับผู้เลี้ยงครั้งแรก", match: (row) => row.first_time_owner_friendly >= 4 },
    { key: "grooming-low", label: "ดูแลขนไม่ซับซ้อน", match: (row) => row.grooming_need <= 2 },
    { key: "grooming-high", label: "ต้องดูแลขนสม่ำเสมอ", match: (row) => row.grooming_need >= 4 },
    { key: "shedding-low", label: "ผลัดขนน้อย", match: (row) => row.shedding_level <= 2 },
    { key: "shedding-high", label: "ผลัดขนมาก", match: (row) => row.shedding_level >= 4 },
    { key: "quiet-low", label: "ค่อนข้างเงียบ", match: (row) => row.noise_level <= 2 },
    { key: "vocal-high", label: "ชอบส่งเสียง", match: (row) => row.noise_level >= 4 },
    { key: "heat-high", label: "ทนร้อนได้ดี", match: (row) => row.heat_tolerance >= 4 },
    { key: "cold-high", label: "ทนหนาวได้ดี", match: (row) => row.cold_tolerance >= 4 },
  ];

  const validTagKeys = new Set(TAG_RULES.map((rule) => rule.key));
  const requestedTag = new URLSearchParams(window.location.search).get("tag") || "";
  const CARD_TAG_LIMIT = 3;
  const CARD_TAG_GROUPS = [
    ["apartment-high", "family-high", "child-high", "beginner-high"],
    ["friendly-high", "affectionate-high", "playful-high", "trainable-high", "independent-high", "social-high", "adaptable-high", "protective-high"],
    ["active-high", "calm-low", "exercise-high", "exercise-low", "grooming-low", "grooming-high", "shedding-low", "shedding-high", "quiet-low", "vocal-high", "outdoor-high", "heat-high", "cold-high"],
  ];

  const state = {
    rows: [],
    filtered: [],
    favorites: new Set(),
    expandedTags: new Set(),
    activeTag: validTagKeys.has(requestedTag) ? requestedTag : "",
  };

  const escapeHTML = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const number = (value, defaultValue = 3) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  };

  const getToken = () =>
    window.DogMatchShared?.getToken?.() ||
    sessionStorage.getItem("catmatch_token") ||
    localStorage.getItem("catmatch_token") ||
    sessionStorage.getItem("userToken") ||
    localStorage.getItem("userToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    "";
  const DOG_FAVORITES_STORAGE_PREFIX = "dogmatch_favorite_dogs_v1";
  const DOG_FAVORITES_SHARED_KEY = "dogmatch_favorite_dogs_v2";
  const DOG_FAVORITE_RECORDS_SHARED_KEY = "dogmatch_favorite_dog_records_v2";

  function readStoredJSON(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch (_error) {
      return null;
    }
  }

  function collectStoredDogUsers() {
    const users = [];
    [sessionStorage, localStorage].forEach((storage) => {
      ["catmatch_user", "user"].forEach((key) => {
        const value = readStoredJSON(storage, key);
        if (value && typeof value === "object") users.push(value);
      });
    });
    return users;
  }

  function getStoredUser() {
    return collectStoredDogUsers()[0] || null;
  }

  function dogFavoriteStorageKeys() {
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

  function readDogFavoriteIds() {
    const merged = new Set();
    const keys = new Set(dogFavoriteStorageKeys());
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
    });
    return [...merged].sort((first, second) => first - second);
  }

  function writeDogFavoriteIds(ids) {
    const normalized = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
      .sort((first, second) => first - second);
    const value = JSON.stringify(normalized);
    dogFavoriteStorageKeys().forEach((key) => {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
    });
  }

  function persistDogFavoriteRecord(breedId, isFavorite) {
    let records = {};
    try { records = JSON.parse(localStorage.getItem(DOG_FAVORITE_RECORDS_SHARED_KEY) || "{}") || {}; }
    catch (_error) {}
    if (!isFavorite) {
      delete records[String(breedId)];
    } else {
      const breed = state.rows.find((item) => Number(item.breed_id) === breedId) || {};
      records[String(breedId)] = {
        breed_id: breedId,
        breed_name: String(breed.breed_name || `สุนัขสายพันธุ์ ${breedId}`),
        thai_name: String(breed.thai_name || ""),
        image_url: String(breed.image_url || fallback || ""),
        description: String(breed.description || ""),
        favorited_at: new Date().toISOString()
      };
    }
    const value = JSON.stringify(records);
    localStorage.setItem(DOG_FAVORITE_RECORDS_SHARED_KEY, value);
    sessionStorage.setItem(DOG_FAVORITE_RECORDS_SHARED_KEY, value);
  }

  function normalize(row, index = 0) {
    return {
      ...row,
      breed_id: Number(row.breed_id || row.id || row.source_order || index + 1),
      breed_name: String(row.breed_name || row.name || `สายพันธุ์ ${index + 1}`).trim(),
      thai_name: String(row.thai_name || row.breed_name_th || row.thai_breed_name || "").trim(),
      origin: String(row.origin || "ไม่ระบุ").trim(),
      historic_role: String(row.historic_role || "").trim(),
      image_url: String(row.image_url || row.image || fallback),
      description: String(row.description || `ข้อมูลพื้นฐานและประวัติการพัฒนาของ ${row.breed_name || "สายพันธุ์นี้"}`),
      friendly: number(row.friendly),
      affectionate: number(row.affectionate),
      playful: number(row.playful),
      independence: number(row.independence),
      trainability: number(row.trainability),
      protective: number(row.protective),
      adaptability: number(row.adaptability),
      sociability: number(row.sociability),
      activity_level: number(row.activity_level),
      exercise_need: number(row.exercise_need),
      outdoor_preference: number(row.outdoor_preference),
      apartment_suitability: number(row.apartment_suitability),
      family_friendly: number(row.family_friendly),
      child_friendly: number(row.child_friendly),
      first_time_owner_friendly: number(row.first_time_owner_friendly),
      grooming_need: number(row.grooming_need),
      shedding_level: number(row.shedding_level),
      noise_level: number(row.noise_level),
      heat_tolerance: number(row.heat_tolerance),
      cold_tolerance: number(row.cold_tolerance),
    };
  }

  function getTags(row) {
    return TAG_RULES.filter((rule) => rule.match(row)).map(({ key, label }) => ({ key, label }));
  }

  function getCompactTags(tags) {
    if (tags.length <= CARD_TAG_LIMIT) return tags;

    const byKey = new Map(tags.map((tag) => [tag.key, tag]));
    const selected = [];

    CARD_TAG_GROUPS.forEach((group) => {
      if (selected.length >= CARD_TAG_LIMIT) return;
      const key = group.find((candidate) => byKey.has(candidate) && !selected.some((tag) => tag.key === candidate));
      if (key) selected.push(byKey.get(key));
    });

    tags.forEach((tag) => {
      if (selected.length < CARD_TAG_LIMIT && !selected.some((item) => item.key === tag.key)) selected.push(tag);
    });

    if (state.activeTag && byKey.has(state.activeTag) && !selected.some((tag) => tag.key === state.activeTag)) {
      selected[selected.length - 1] = byKey.get(state.activeTag);
    }

    return selected.slice(0, CARD_TAG_LIMIT);
  }

  function hasTag(row, tagKey) {
    if (!tagKey) return true;
    const rule = TAG_RULES.find((item) => item.key === tagKey);
    return Boolean(rule?.match(row));
  }

  function getTagLabel(tagKey) {
    return TAG_RULES.find((item) => item.key === tagKey)?.label || "";
  }

  async function loadRows() {
    const normalizedLocalRows = localRows.map(normalize);
    let remoteRows = [];

    try {
      const response = await fetch(`${API_BASE}/breeds?species=dog&limit=100`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(payload.data)) remoteRows = payload.data;
    } catch (_error) {
      // ใช้ข้อมูลสุนัขทั้งหมดในโปรเจกต์เป็น fallback
    }

    const remoteByName = new Map(
      remoteRows.map((row) => [
        String(row.breed_name || row.name || "").trim().toLowerCase(),
        row
      ])
    );
    const localNames = new Set();

    const rows = normalizedLocalRows.map((local, index) => {
      const key = String(local.breed_name || "").trim().toLowerCase();
      localNames.add(key);
      const remote = remoteByName.get(key) || {};

      return normalize({
        ...local,
        ...remote,
        /* ใช้รหัสและเนื้อหาภาพจากชุดข้อมูลในโปรเจกต์เป็นหลัก เพื่อไม่ให้รายการเดิมหาย */
        breed_id: local.breed_id,
        breed_name: local.breed_name || remote.breed_name || remote.name || "",
        thai_name: local.thai_name || remote.thai_name || remote.breed_name_th || "",
        origin: local.origin || remote.origin || "ไม่ระบุ",
        historic_role: local.historic_role || remote.historic_role || "",
        image_url: local.image_url || remote.image_url || remote.image || fallback,
        description: local.description || remote.description || ""
      }, index);
    });

    remoteRows.forEach((remote, index) => {
      const key = String(remote.breed_name || remote.name || "").trim().toLowerCase();
      if (!key || localNames.has(key)) return;
      rows.push(normalize(remote, normalizedLocalRows.length + index));
    });

    state.rows = rows;
    updateHeroSummary();
  }

  async function loadFavorites() {
    state.favorites = new Set(readDogFavoriteIds());
  }

  function updateHeroSummary() {
    const total = state.rows.length;
    const beginner = state.rows.filter((row) => row.first_time_owner_friendly >= 4).length;
    const apartment = state.rows.filter((row) => row.apartment_suitability >= 4).length;
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = Number(value).toLocaleString("th-TH");
    };
    set("heroBreedTotal", total);
    set("heroBeginnerTotal", beginner);
    set("heroApartmentTotal", apartment);
  }

  function activityGroup(score) {
    if (score <= 2) return "low";
    if (score >= 4) return "high";
    return "medium";
  }

  function summarize(row) {
    const role = String(row.historic_role || "").trim();
    if (role) return role.length > 64 ? `${role.slice(0, 61).trim()}…` : role;

    if (row.origin && row.origin !== "ไม่ระบุ") {
      return `สายพันธุ์จาก${row.origin}`;
    }

    return "ข้อมูลลักษณะสายพันธุ์และการเลี้ยงแบบกระชับ";
  }

  function updateTagQuery() {
    const url = new URL(window.location.href);
    if (state.activeTag) url.searchParams.set("tag", state.activeTag);
    else url.searchParams.delete("tag");
    window.history.replaceState({}, "", url);
  }

  function renderActiveTag() {
    const panel = document.getElementById("dogActiveTagFilter");
    const label = document.getElementById("dogActiveTagLabel");
    if (!panel || !label) return;

    if (!state.activeTag) {
      panel.hidden = true;
      label.textContent = "";
      return;
    }

    panel.hidden = false;
    label.textContent = getTagLabel(state.activeTag);
  }

  function applyFilters() {
    const query = String(document.getElementById("dogBreedSearch")?.value || "").trim().toLowerCase();
    const activity = document.getElementById("dogActivityFilter")?.value || "all";
    const home = document.getElementById("dogHomeFilter")?.value || "all";

    state.filtered = state.rows.filter((row) => {
      const searchableName = `${row.breed_name} ${row.thai_name}`.toLowerCase();
      const matchesQuery = !query || searchableName.includes(query);
      const matchesActivity = activity === "all" || activityGroup(row.activity_level) === activity;
      const matchesHome = home === "all" ||
        (home === "apartment" && row.apartment_suitability >= 4) ||
        (home === "family" && row.family_friendly >= 4) ||
        (home === "first-time" && row.first_time_owner_friendly >= 4);
      const matchesTag = hasTag(row, state.activeTag);
      return matchesQuery && matchesActivity && matchesHome && matchesTag;
    });

    state.filtered.sort((a, b) => a.breed_name.localeCompare(b.breed_name, "en"));
    renderActiveTag();
    render();
  }

  function render() {
    const grid = document.getElementById("dogBreedGrid");
    const count = document.getElementById("dogBreedCount");
    const empty = document.getElementById("dogBreedEmpty");

    if (count) count.textContent = state.filtered.length.toLocaleString("th-TH");
    if (empty) empty.hidden = state.filtered.length !== 0;
    if (!grid) return;

    grid.hidden = state.filtered.length === 0;
    grid.innerHTML = state.filtered.map((row) => {
      const favorite = state.favorites.has(row.breed_id);
      const tags = getTags(row);
      const tagsExpanded = state.expandedTags.has(row.breed_id);
      const visibleTags = tagsExpanded ? tags : getCompactTags(tags);
      const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);

      return `
        <article class="breed-card dog-breed-card reveal is-visible">
          <div class="breed-card__media dog-breed-image">
            <img src="${escapeHTML(row.image_url || fallback)}" data-fallback="${escapeHTML(fallback)}" alt="สุนัขสายพันธุ์ ${escapeHTML(row.breed_name)}${row.thai_name ? ` (${escapeHTML(row.thai_name)})` : ""}" loading="lazy" referrerpolicy="no-referrer">
            <button class="icon-button favorite-button ${favorite ? "is-active" : ""}" type="button" data-favorite="${row.breed_id}" aria-pressed="${favorite}" aria-label="${favorite ? "นำออกจาก" : "เพิ่มใน"}รายการโปรด">${favorite ? "♥" : "♡"}</button>
          </div>
          <div class="breed-card__body dog-breed-body">
            <h3>${escapeHTML(row.breed_name)}</h3>
            ${row.thai_name ? `<p class="dog-breed-thai-name">${escapeHTML(row.thai_name)}</p>` : ""}
            <p class="dog-breed-summary">${escapeHTML(summarize(row))}</p>
            <div class="dog-traits ${tagsExpanded ? "is-expanded" : ""}" aria-label="แท็กของ ${escapeHTML(row.breed_name)}">
              ${visibleTags.map((tag) => `
                <button
                  class="dog-trait-tag ${state.activeTag === tag.key ? "is-active" : ""}"
                  type="button"
                  data-tag-key="${escapeHTML(tag.key)}"
                  aria-pressed="${state.activeTag === tag.key}"
                  title="แสดงสุนัขทั้งหมดที่มีแท็ก ${escapeHTML(tag.label)}"
                >${escapeHTML(tag.label)}</button>`).join("")}
              ${tags.length > CARD_TAG_LIMIT ? `
                <button
                  class="dog-tag-more"
                  type="button"
                  data-tag-more="${row.breed_id}"
                  aria-expanded="${tagsExpanded}"
                  title="${tagsExpanded ? "ย่อรายการแท็ก" : `ดูแท็กเพิ่มเติมอีก ${hiddenTagCount} รายการ`}"
                >${tagsExpanded ? "ย่อแท็ก" : `+อีก ${hiddenTagCount}`}</button>` : ""}
            </div>
            <a class="button button-primary" href="./dog-detail.html?id=${encodeURIComponent(row.breed_id)}&species=dog">ดูรายละเอียดสายพันธุ์</a>
          </div>
        </article>`;
    }).join("");

    grid.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => {
      if (img.dataset.fallback && img.src !== img.dataset.fallback) img.src = img.dataset.fallback;
    }, { once: true }));
  }

  function selectTag(tagKey) {
    if (!validTagKeys.has(tagKey)) return;

    state.activeTag = tagKey;

    const search = document.getElementById("dogBreedSearch");
    const activity = document.getElementById("dogActivityFilter");
    const home = document.getElementById("dogHomeFilter");
    if (search) search.value = "";
    if (activity) activity.value = "all";
    if (home) home.value = "all";

    updateTagQuery();
    applyFilters();
    document.getElementById("dogActiveTagFilter")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function clearTag() {
    state.activeTag = "";
    updateTagQuery();
    applyFilters();
  }

  async function toggleFavorite(id) {
    const breedId = Number(id);
    const token = getToken();
    const user = getStoredUser();

    if (!token || !user) {
      window.alert("กรุณาเข้าสู่ระบบก่อนบันทึกสุนัขที่ถูกใจ");
      window.location.href = "./login.html?return=dog-breeds&species=dog";
      return;
    }

    if (!Number.isInteger(breedId) || breedId <= 0) return;

    if (state.favorites.has(breedId)) {
      state.favorites.delete(breedId);
    } else {
      state.favorites.add(breedId);
    }

    writeDogFavoriteIds([...state.favorites]);
    persistDogFavoriteRecord(breedId, state.favorites.has(breedId));
    render();
  }

  function bindReset() {
    const reset = () => {
      const search = document.getElementById("dogBreedSearch");
      const activity = document.getElementById("dogActivityFilter");
      const home = document.getElementById("dogHomeFilter");
      if (search) search.value = "";
      if (activity) activity.value = "all";
      if (home) home.value = "all";
      state.activeTag = "";
      updateTagQuery();
      applyFilters();
    };

    document.getElementById("dogResetFilters")?.addEventListener("click", reset);
    document.getElementById("dogEmptyReset")?.addEventListener("click", reset);
    document.getElementById("dogClearTagFilter")?.addEventListener("click", clearTag);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([loadRows(), loadFavorites()]);

    ["dogBreedSearch", "dogActivityFilter", "dogHomeFilter"].forEach((id) => {
      const el = document.getElementById(id);
      el?.addEventListener(el.tagName === "INPUT" ? "input" : "change", applyFilters);
    });

    bindReset();

    document.getElementById("dogBreedGrid")?.addEventListener("click", (event) => {
      const moreButton = event.target.closest("[data-tag-more]");
      if (moreButton) {
        event.preventDefault();
        const breedId = Number(moreButton.dataset.tagMore);
        if (state.expandedTags.has(breedId)) state.expandedTags.delete(breedId);
        else state.expandedTags.add(breedId);
        render();
        return;
      }

      const tagButton = event.target.closest("[data-tag-key]");
      if (tagButton) {
        event.preventDefault();
        selectTag(String(tagButton.dataset.tagKey || ""));
        return;
      }

      const favoriteButton = event.target.closest("[data-favorite]");
      if (!favoriteButton) return;
      event.preventDefault();
      void toggleFavorite(favoriteButton.dataset.favorite);
    });

    applyFilters();
  });
})();
