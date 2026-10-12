"use strict";

(() => {
  const API_BASE = window.CATMATCH_API_URL;
  const localBreeds = Array.isArray(window.DOGMATCH_DOG_BREEDS)
    ? window.DOGMATCH_DOG_BREEDS
    : [];
  const fallbackImage = window.DOGMATCH_DOG_FALLBACK || "";

  const HOMEPAGE_DOG_IDS = [1, 2, 3, 4];
  const HOMEPAGE_DOG_COUNT = 4;
  const HOMEPAGE_DOG_SLIDE_TIME = 5 * 1000;
  const HOMEPAGE_STATS_REFRESH_TIME = 10 * 1000;
  let homepageStatsTimer = null;
  let homepageStatsListenersBound = false;
  let homepageStatsLoading = false;
  let homepageDogPool = [];
  let homepageDogMatchScoreMap = new Map();
  let homepageDogSlideTimer = null;
  let homepageDogSlideCursor = HOMEPAGE_DOG_COUNT;
  let favoriteDogBreedIds = new Set();
  let favoriteDogRequestPending = new Set();

  const DOG_FAVORITES_STORAGE_PREFIX = "dogmatch_favorite_dogs_v1";
  const DOG_FAVORITES_SHARED_KEY = "dogmatch_favorite_dogs_v2";
  const DOG_FAVORITE_RECORDS_SHARED_KEY = "dogmatch_favorite_dog_records_v2";

  const readJSON = (storage, key) => {
    try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
  };
  const getToken = () =>
    sessionStorage.getItem("catmatch_token") ||
    localStorage.getItem("catmatch_token") ||
    sessionStorage.getItem("userToken") ||
    localStorage.getItem("userToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") || "";
  const getUser = () =>
    readJSON(sessionStorage, "catmatch_user") ||
    readJSON(localStorage, "catmatch_user") ||
    readJSON(sessionStorage, "user") ||
    readJSON(localStorage, "user");
  const escapeHTML = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function setupHeader() {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("menuToggle");
    const nav = document.querySelector(".main-nav");
    const update = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    toggle?.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav?.classList.toggle("is-open", !open);
      header?.classList.toggle("menu-open", !open);
    });
  }

  function setupAuth() {
    const token = getToken();
    const user = getUser();
    const loggedIn = Boolean(token && user);
    const guest = document.getElementById("guestNavActions");
    const signed = document.getElementById("userNavActions");
    if (guest) guest.hidden = loggedIn;
    if (signed) signed.hidden = !loggedIn;
    if (!loggedIn) return;

    const name = String(user.username || user.full_name || user.name || "ผู้ใช้งาน").trim();
    const email = String(user.email || "").trim();
    const initial = (name[0] || "U").toUpperCase();
    const values = {
      userDisplayName: name,
      userMenuName: name,
      userMenuEmail: email,
      userAvatar: initial,
      userMenuAvatar: initial,
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    const trigger = document.getElementById("userMenuTrigger");
    const panel = document.getElementById("userMenuPanel");
    if (!trigger || !panel) return;
    const close = () => {
      trigger.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      panel.classList.remove("is-open");
    };
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = trigger.getAttribute("aria-expanded") === "true";
      if (open) close();
      else {
        panel.hidden = false;
        panel.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
    panel.addEventListener("click", (event) => event.stopPropagation());
    document.addEventListener("click", close);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });

    document.getElementById("logoutButton")?.addEventListener("click", () => {
      [localStorage, sessionStorage].forEach((storage) => {
        ["catmatch_token", "userToken", "token", "catmatch_user", "user", "catmatch_role"].forEach((key) => storage.removeItem(key));
      });
      window.location.replace("./dog-index.html");
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
    }, { threshold: .08 });
    items.forEach((item) => observer.observe(item));
  }

  function collectStoredDogUsers() {
    const users = [];
    [sessionStorage, localStorage].forEach((storage) => {
      ["catmatch_user", "user"].forEach((key) => {
        const value = readJSON(storage, key);
        if (value && typeof value === "object") users.push(value);
      });
    });
    return users;
  }

  function getDogFavoriteStorageKeys() {
    const identifiers = collectStoredDogUsers()
      .flatMap((user) => [
        user.firebase_uid,
        user.uid,
        user.user_id,
        user.id,
        user.email,
        user.username
      ])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    const unique = [...new Set(identifiers)];
    return [
      DOG_FAVORITES_SHARED_KEY,
      ...unique.map((id) => `${DOG_FAVORITES_STORAGE_PREFIX}:${id}`),
      ...unique.map((id) => `${DOG_FAVORITES_SHARED_KEY}:${id}`)
    ];
  }

  function readStoredDogFavoriteIds() {
    const merged = new Set();
    const keys = new Set(getDogFavoriteStorageKeys());

    /* อ่านคีย์เก่าทั้งหมดด้วย เพื่อกู้รายการที่ผู้ใช้เคยกดไว้ก่อนแก้ระบบ */
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(`${DOG_FAVORITES_STORAGE_PREFIX}:`)) keys.add(key);
    }

    [localStorage, sessionStorage].forEach((storage) => {
      keys.forEach((key) => {
        try {
          const saved = JSON.parse(storage.getItem(key) || "[]");
          (Array.isArray(saved) ? saved : saved?.ids || [])
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
            .forEach((id) => merged.add(id));
        } catch (_error) {}
      });
    });
    return merged;
  }

  function loadDogFavoriteBreedIds() {
    favoriteDogBreedIds = readStoredDogFavoriteIds();
  }

  function persistDogFavoriteBreedIds() {
    const ids = [...favoriteDogBreedIds].sort((a, b) => a - b);
    const value = JSON.stringify(ids);
    getDogFavoriteStorageKeys().forEach((key) => {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
    });
  }

  function persistDogFavoriteRecord(breedId, isFavorite) {
    let records = {};
    try {
      records = JSON.parse(localStorage.getItem(DOG_FAVORITE_RECORDS_SHARED_KEY) || "{}") || {};
    } catch (_error) {}

    if (!isFavorite) {
      delete records[String(breedId)];
    } else {
      const breed = homepageDogPool.find((item) => Number(item.breed_id || item.source_order || 0) === breedId) || {};
      records[String(breedId)] = {
        breed_id: breedId,
        breed_name: String(breed.breed_name || breed.name || `สุนัขสายพันธุ์ ${breedId}`),
        thai_name: String(breed.thai_name || breed.breed_name_th || ""),
        image_url: String(breed.image_url || breed.image || fallbackImage || ""),
        description: String(breed.description || ""),
        favorited_at: new Date().toISOString()
      };
    }

    const value = JSON.stringify(records);
    localStorage.setItem(DOG_FAVORITE_RECORDS_SHARED_KEY, value);
    sessionStorage.setItem(DOG_FAVORITE_RECORDS_SHARED_KEY, value);
  }

  function updateDogFavoriteButtons() {
    document.querySelectorAll(".dog-favorite-button[data-breed-id]").forEach((button) => {
      const breedId = Number(button.dataset.breedId);
      const isFavorite = favoriteDogBreedIds.has(breedId);

      button.classList.toggle("is-active", isFavorite);
      button.setAttribute("aria-pressed", String(isFavorite));
      button.setAttribute(
        "aria-label",
        isFavorite ? "นำออกจากสุนัขที่ถูกใจ" : "บันทึกเป็นสุนัขที่ถูกใจ"
      );
      button.textContent = isFavorite ? "♥" : "♡";
    });
  }

  function setupDogFavoriteButtons() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".dog-favorite-button[data-breed-id]");
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      if (!getToken() || !getUser()) {
        window.location.href = "./login.html?return=dog-index&species=dog";
        return;
      }

      const breedId = Number(button.dataset.breedId);
      if (!Number.isInteger(breedId) || breedId <= 0 || favoriteDogRequestPending.has(breedId)) {
        return;
      }

      favoriteDogRequestPending.add(breedId);
      button.disabled = true;

      if (favoriteDogBreedIds.has(breedId)) {
        favoriteDogBreedIds.delete(breedId);
      } else {
        favoriteDogBreedIds.add(breedId);
      }

      persistDogFavoriteBreedIds();
      persistDogFavoriteRecord(breedId, favoriteDogBreedIds.has(breedId));
      updateDogFavoriteButtons();

      window.setTimeout(() => {
        favoriteDogRequestPending.delete(breedId);
        button.disabled = false;
      }, 120);
    });
  }

  function getRecommendationBreedId(item) {
    return Number(item?.breed_id || item?.breed?.breed_id || 0);
  }

  function getRecommendationScore(item) {
    const value = Number(item?.match_score ?? item?.score ?? item?.match_percentage);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
  }

  function createDogMatchScoreMap(recommendations) {
    const map = new Map();

    (Array.isArray(recommendations) ? recommendations : []).forEach((item) => {
      const breedId = getRecommendationBreedId(item);
      const score = getRecommendationScore(item);
      if (breedId > 0 && score !== null) map.set(breedId, score);
    });

    return map;
  }

  function readStoredDogRecommendations() {
    try {
      const stored = JSON.parse(sessionStorage.getItem("catmatch_assessment_result") || "null");
      if (!stored || String(stored.species || "").toLowerCase() !== "dog") return [];

      const rows = stored.recommendations || stored.data || [];
      return Array.isArray(rows) ? rows : [];
    } catch (_error) {
      return [];
    }
  }

  async function fetchLatestDogRecommendations() {
    if (!getToken() || !getUser()) return [];

    const storedRows = readStoredDogRecommendations();
    if (storedRows.length) return storedRows;

    try {
      const historyResponse = await fetch(`${API_BASE}/history?species=dog`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        cache: "no-store"
      });
      const historyPayload = await historyResponse.json().catch(() => ({}));
      if (!historyResponse.ok || historyPayload.success === false) return [];

      const historyRows = Array.isArray(historyPayload.data) ? historyPayload.data : [];
      const hasSpeciesField = historyRows.some((item) => item?.species || item?.pet_type);
      const dogRows = hasSpeciesField
        ? historyRows.filter((item) => String(item?.species || item?.pet_type || "").toLowerCase() === "dog")
        : historyRows;

      const latest = [...dogRows].sort((a, b) =>
        new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
      )[0];

      if (!latest) return [];
      if (Array.isArray(latest.recommendations) && latest.recommendations.length) {
        return latest.recommendations;
      }

      const resultId = Number(latest.result_id || 0);
      if (!resultId) return [];

      const response = await fetch(
        `${API_BASE}/recommendations/${resultId}?species=dog`,
        { cache: "no-store" }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) return [];

      const rows = payload.data || payload.recommendations || [];
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      console.warn("โหลดคะแนนสุนัขจากผลประเมินล่าสุดไม่สำเร็จ:", error.message);
      return [];
    }
  }

  function buildTags(breed) {
    const tags = [];
    if (Number(breed.friendly) >= 4) tags.push("เป็นมิตร");
    if (Number(breed.trainability) >= 4) tags.push("ฝึกได้ดี");
    if (Number(breed.apartment_suitability) >= 4) tags.push("เหมาะกับพื้นที่จำกัด");
    if (Number(breed.family_friendly) >= 4) tags.push("เหมาะกับครอบครัว");
    if (Number(breed.activity_level) >= 4) tags.push("ชอบกิจกรรม");
    if (Number(breed.first_time_owner_friendly) >= 4) tags.push("เหมาะกับผู้เลี้ยงครั้งแรก");
    return tags.length ? tags.slice(0, 3) : ["เรียนรู้ลักษณะนิสัย"];
  }

  function mergeDogBreedRows(remoteRows) {
    const normalizedLocalRows = localBreeds.filter((breed) =>
      Number(breed.breed_id || breed.source_order || 0) > 0
    );
    const remoteByName = new Map(
      (Array.isArray(remoteRows) ? remoteRows : []).map((breed) => [
        String(breed.breed_name || breed.name || "").trim().toLowerCase(),
        breed
      ])
    );
    const localNames = new Set();

    const merged = normalizedLocalRows.map((local) => {
      const key = String(local.breed_name || local.name || "").trim().toLowerCase();
      localNames.add(key);
      const remote = remoteByName.get(key) || {};
      return {
        ...local,
        ...remote,
        breed_id: Number(local.breed_id || local.source_order || remote.breed_id || 0),
        breed_name: local.breed_name || remote.breed_name || remote.name || "",
        thai_name: local.thai_name || local.breed_name_th || remote.thai_name || remote.breed_name_th || "",
        image_url: local.image_url || local.image || remote.image_url || remote.image || fallbackImage,
        description: local.description || remote.description || "",
        origin: local.origin || remote.origin || "",
        historic_role: local.historic_role || remote.historic_role || ""
      };
    });

    (Array.isArray(remoteRows) ? remoteRows : []).forEach((remote) => {
      const key = String(remote.breed_name || remote.name || "").trim().toLowerCase();
      if (!key || localNames.has(key)) return;
      merged.push({
        ...remote,
        breed_id: Number(remote.breed_id || remote.id || remote.source_order || 0),
        breed_name: remote.breed_name || remote.name || "",
        thai_name: remote.thai_name || remote.breed_name_th || "",
        image_url: remote.image_url || remote.image || fallbackImage,
        description: remote.description || ""
      });
    });

    return merged.filter((breed) => Number(breed.breed_id || breed.source_order || 0) > 0);
  }

  function getFeaturedHomepageDogs() {
    const byId = new Map(homepageDogPool.map((breed) => [
      Number(breed.breed_id || breed.source_order || 0),
      breed
    ]));
    const featured = HOMEPAGE_DOG_IDS.map((id) => byId.get(id)).filter(Boolean);
    const rows = featured.length === HOMEPAGE_DOG_IDS.length
      ? featured
      : homepageDogPool.slice(0, HOMEPAGE_DOG_IDS.length);

    return rows.map((breed) => ({
      ...breed,
      match_score: homepageDogMatchScoreMap.get(
        Number(breed.breed_id || breed.source_order || 0)
      ) ?? null
    }));
  }

  function getNextHomepageDogs() {
    if (!homepageDogPool.length) return [];

    const count = Math.min(
      HOMEPAGE_DOG_COUNT,
      homepageDogPool.length
    );

    const rows = Array.from(
      { length: count },
      (_, index) =>
        homepageDogPool[
          (homepageDogSlideCursor + index) %
            homepageDogPool.length
        ]
    );

    homepageDogSlideCursor =
      (homepageDogSlideCursor + count) %
      homepageDogPool.length;

    return rows.map((breed) => ({
      ...breed,
      match_score:
        homepageDogMatchScoreMap.get(
          Number(
            breed.breed_id ||
            breed.source_order ||
            0
          )
        ) ?? null
    }));
  }

  async function rotateHomepageDogs() {
    const grid =
      document.getElementById("breedGrid");

    if (!grid || !homepageDogPool.length) {
      return;
    }

    grid.classList.add(
      "is-changing-breeds"
    );

    await new Promise((resolve) => {
      window.setTimeout(resolve, 220);
    });

    renderHomepageDogs(
      getNextHomepageDogs()
    );

    grid.classList.remove(
      "is-changing-breeds"
    );
    grid.classList.add(
      "is-entering-breeds"
    );

    window.setTimeout(() => {
      grid.classList.remove(
        "is-entering-breeds"
      );
    }, 520);
  }

  function startHomepageDogAutoSlide() {
    if (homepageDogSlideTimer) {
      window.clearInterval(
        homepageDogSlideTimer
      );
    }

    if (
      homepageDogPool.length <=
      HOMEPAGE_DOG_COUNT
    ) {
      return;
    }

    homepageDogSlideTimer =
      window.setInterval(() => {
        void rotateHomepageDogs();
      }, HOMEPAGE_DOG_SLIDE_TIME);
  }

  function renderHomepageDogs(rows) {
    const grid = document.getElementById("breedGrid");
    if (!grid) return;

    grid.innerHTML = rows.map((breed) => {
      const id = Number(breed.breed_id || breed.source_order || 0);
      const image = breed.image_url || fallbackImage;
      const score = Number(breed.match_score);
      const hasScore = breed.match_score !== null && breed.match_score !== undefined &&
        breed.match_score !== "" && Number.isFinite(score);
      const isFavorite = favoriteDogBreedIds.has(id);

      return `
        <article class="card breed-card reveal is-visible">
          <div class="breed-card-image">
            <img src="${escapeHTML(image)}" data-fallback-src="${escapeHTML(fallbackImage)}" alt="สุนัขสายพันธุ์ ${escapeHTML(breed.breed_name)}" loading="lazy">
            <button
              class="icon-button favorite-button dog-favorite-button ${isFavorite ? "is-active" : ""}"
              type="button"
              data-breed-id="${id}"
              aria-pressed="${String(isFavorite)}"
              aria-label="${isFavorite ? "นำออกจากสุนัขที่ถูกใจ" : "บันทึกเป็นสุนัขที่ถูกใจ"}"
            >${isFavorite ? "♥" : "♡"}</button>
          </div>
          <div class="breed-card-body">
            <h3>${escapeHTML(breed.breed_name)}</h3>
            <div class="trait-tags homepage-trait-tags">
              ${buildTags(breed).map((tag) => `<span class="trait-tag homepage-trait-tag">${escapeHTML(tag)}</span>`).join("")}
            </div>
            <div class="match-block dog-match-block">
              ${hasScore ? `
                <div class="match-row">
                  <span>ความเหมาะสม</span>
                  <strong>${score.toFixed(0)}%</strong>
                </div>
                <div class="match-track" role="progressbar" aria-label="ความเหมาะสม ${score.toFixed(0)} เปอร์เซ็นต์" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score.toFixed(0)}">
                  <div class="match-fill" style="width:${Math.max(0, Math.min(100, score))}%"></div>
                </div>
              ` : `
                <div class="match-placeholder">
                  ทำแบบประเมินเพื่อดูเปอร์เซ็นต์ความเหมาะสม
                </div>
              `}
            </div>
            <div class="breed-card-footer">
              <span>ดูข้อมูลสายพันธุ์</span>
              <a class="text-link" href="./dog-detail.html?id=${encodeURIComponent(id)}&species=dog">รายละเอียด →</a>
            </div>
          </div>
        </article>`;
    }).join("");

    updateDogFavoriteButtons();

    grid.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => {
      if (img.dataset.fallbackSrc && img.src !== img.dataset.fallbackSrc) img.src = img.dataset.fallbackSrc;
    }, { once: true }));
  }

  async function loadBreeds() {
    let remoteRows = [];
    try {
      const response = await fetch(`${API_BASE}/breeds?species=dog&limit=100`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(payload.data)) remoteRows = payload.data;
    } catch (_error) {
      // ใช้ข้อมูลสุนัขทั้งหมดในโปรเจกต์เมื่อ Backend ยังไม่เปิด
    }

    homepageDogPool = mergeDogBreedRows(remoteRows);
    loadDogFavoriteBreedIds();
    homepageDogMatchScoreMap = createDogMatchScoreMap(
      await fetchLatestDogRecommendations()
    );

    renderHomepageDogs(getFeaturedHomepageDogs());

    homepageDogSlideCursor =
      homepageDogPool.length >
      HOMEPAGE_DOG_COUNT
        ? HOMEPAGE_DOG_COUNT
        : 0;

    startHomepageDogAutoSlide();

    return homepageDogPool;
  }

  async function loadCurrentAccountAssessmentCount(species) {
    /*
     * หน้าแรกเป็นหน้าสาธารณะ จึงห้ามเรียก ensure() ที่อาจกู้บัญชี Google เก่า
     * ขึ้นมาเองในขณะที่แถบหัวเว็บยังแสดงว่าไม่ได้เข้าสู่ระบบ
     */
    const token = getToken();
    const user = getUser();
    const role = String(
      sessionStorage.getItem("catmatch_role") ||
      localStorage.getItem("catmatch_role") ||
      "user"
    ).toLowerCase();

    if (!token || !user || role !== "user") return 0;

    const url = `${API_BASE}/history?species=${encodeURIComponent(species)}`;
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

  async function loadStats(breeds = homepageDogPool) {
    if (homepageStatsLoading) return;
    homepageStatsLoading = true;

    const setStat = (name, value) => {
      const el = document.querySelector(`[data-stat="${name}"]`);
      if (el) el.textContent = Number(value || 0).toLocaleString("th-TH");
    };

    const breedCount = Array.isArray(localBreeds) && localBreeds.length
      ? localBreeds.length
      : Array.isArray(breeds)
        ? breeds.length
        : 0;

    setStat("farms", 0);
    setStat("breeds", breedCount);
    setStat("available", 0);
    setStat("assessments", 0);

    try {
      const [farmResult, shelterResult, assessmentResult] = await Promise.allSettled([
        fetch(`${API_BASE}/farms?species=dog&include_animals=1`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }).then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload.success === false) {
            throw new Error(payload.message || "โหลดข้อมูลฟาร์มไม่สำเร็จ");
          }
          return Array.isArray(payload.data) ? payload.data : [];
        }),
        fetch(`${API_BASE}/shelters/animals?species=dog`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }).then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload.success === false) {
            throw new Error(payload.message || "โหลดข้อมูลสุนัขที่พร้อมหาบ้านไม่สำเร็จ");
          }
          return Array.isArray(payload.data) ? payload.data : [];
        }),
        loadCurrentAccountAssessmentCount("dog"),
      ]);

      if (farmResult.status === "fulfilled") {
        const farmIds = farmResult.value
          .map((row) => Number(row.farm_id))
          .filter((id) => Number.isInteger(id) && id > 0);
        setStat("farms", new Set(farmIds).size);
      } else {
        console.warn("โหลดจำนวนฟาร์มสุนัขไม่สำเร็จ:", farmResult.reason?.message || farmResult.reason);
      }

      if (shelterResult.status === "fulfilled") {
        const availableRows = shelterResult.value.filter(
          (row) => String(row.status || "available").toLowerCase() === "available"
        );
        setStat("available", availableRows.length);
      } else {
        console.warn("โหลดจำนวนสุนัขที่พร้อมหาบ้านไม่สำเร็จ:", shelterResult.reason?.message || shelterResult.reason);
      }

      if (assessmentResult.status === "fulfilled") {
        setStat("assessments", assessmentResult.value);
      } else {
        console.warn("โหลดผลแบบประเมินของบัญชีปัจจุบันไม่สำเร็จ:", assessmentResult.reason?.message || assessmentResult.reason);
        setStat("assessments", 0);
      }
    } finally {
      homepageStatsLoading = false;
    }
  }

  function startStatsUpdates() {
    if (homepageStatsTimer) window.clearInterval(homepageStatsTimer);
    homepageStatsTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadStats(homepageDogPool);
    }, HOMEPAGE_STATS_REFRESH_TIME);

    if (homepageStatsListenersBound) return;
    homepageStatsListenersBound = true;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void loadStats(homepageDogPool);
    });
    window.addEventListener("pageshow", () => void loadStats(homepageDogPool));
    window.addEventListener("catmatch:user-session", () => void loadStats(homepageDogPool));
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
        void loadStats(homepageDogPool);
      }
    });
  }

  function setupNewsletter() {
    const form = document.querySelector(".newsletter-form");
    const input = document.getElementById("newsletterEmail");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = String(input?.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        window.alert("กรุณากรอกอีเมลให้ถูกต้อง");
        input?.focus();
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) throw new Error(payload.message || "สมัครรับข่าวสารไม่สำเร็จ");
        form.reset();
        window.alert("สมัครรับข่าวสารเรียบร้อยแล้ว");
      } catch (error) { window.alert(error.message || "ไม่สามารถเชื่อมต่อระบบได้"); }
    });
  }

  function setupMapCard() {
    const card = document.querySelector("[data-farm-map-card]");
    const open = () => { window.location.href = "./dog-farm-map.html?species=dog"; };
    card?.addEventListener("click", (event) => { if (!event.target.closest("a,button")) open(); });
    card?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    setupHeader();
    setupAuth();
    setupReveal();
    setupDogFavoriteButtons();
    setupNewsletter();
    setupMapCard();
    const breeds = await loadBreeds();
    await loadStats(breeds);
    startStatsUpdates();
  });
})();
