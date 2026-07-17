(() => {
  "use strict";

  /**
   * Hybrid image resolver
   * 1) ใช้รูปที่ผูกกับ breed_id ใน CatMatchBreedKnowledge ก่อน
   *    เพื่อแยก Longhair / Shorthair / Wirehair ให้ถูกตัว
   * 2) ใช้ TheCatAPI เป็น fallback เฉพาะกรณีที่ข้อมูลในเครื่องไม่มีรูป
   * 3) มี cache และระบบซ่อมรูปเมื่อ URL แรกโหลดไม่ได้
   */

  const BREEDS_URL = "https://api.thecatapi.com/v1/breeds";
  const IMAGE_INFO_URL = "https://api.thecatapi.com/v1/images/";
  const CACHE_KEY = "catmatch_thecatapi_breeds_v2";
  const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  const API_ALIASES = new Map(Object.entries({
    "havana": "Havana Brown",
    "khaomanee": "Khao Manee",
    "norwegian forest": "Norwegian Forest Cat",
    "pixiebob": "Pixie-bob",
    "scottish": "Scottish Fold"
  }));

  let catalogPromise = null;
  const exactImageCache = new Map();

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function idOf(value) {
    const id = Number(value?.breed_id ?? value?.id ?? value);
    return Number.isInteger(id) && id > 0 ? id : 0;
  }

  function findLocalBreedByName(name) {
    const target = normalize(name);
    if (!target) return null;

    const rows = Array.isArray(window.CATMATCH_CAT_BREEDS)
      ? window.CATMATCH_CAT_BREEDS
      : [];

    return rows.find((row) => {
      const rowName = row?.breed_name ?? row?.name ?? "";
      return normalize(rowName) === target;
    }) || null;
  }

  function resolveKnowledge(value) {
    const knowledge = window.CatMatchBreedKnowledge;
    if (!knowledge?.get) return null;

    let id = idOf(value);
    if (!id && typeof value === "string") {
      id = idOf(findLocalBreedByName(value));
    }

    if (!id) return null;

    const item = knowledge.get(id);
    if (!item || (!item.image && !item.thumbnail)) return null;

    const raw = Array.isArray(window.CATMATCH_CAT_BREEDS)
      ? window.CATMATCH_CAT_BREEDS.find((row) => idOf(row) === id)
      : null;

    return {
      id,
      requestedName: typeof value === "string"
        ? value
        : String(value?.breed_name ?? value?.name ?? ""),
      matchedName: String(item.officialName || raw?.breed_name || raw?.name || ""),
      imageUrl: String(item.image || item.thumbnail || ""),
      thumbnail: String(item.thumbnail || item.image || ""),
      sourceUrl: String(item.sourceUrl || ""),
      referenceImageId: "",
      metadata: {
        origin: item.origin || raw?.origin || "ไม่ระบุ",
        life_span: raw?.life_span || "",
        temperament: raw?.temperament || ""
      },
      matched: true,
      source: "knowledge"
    };
  }

  function readCatalogCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (
        !cached ||
        !Array.isArray(cached.rows) ||
        !Number.isFinite(cached.savedAt) ||
        Date.now() - cached.savedAt > CACHE_MAX_AGE
      ) {
        return null;
      }
      return cached.rows;
    } catch {
      return null;
    }
  }

  function saveCatalogCache(rows) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        rows
      }));
    } catch {
      // หน้าเว็บยังทำงานต่อได้แม้ localStorage ใช้ไม่ได้
    }
  }

  async function fetchCatalogRows() {
    const cached = readCatalogCache();
    if (cached) return cached;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch(BREEDS_URL, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      if (!response.ok) throw new Error(`TheCatAPI ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error("Invalid breed catalog");
      saveCatalogCache(rows);
      return rows;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetchCatalogRows()
        .then((rows) => {
          const byName = new Map();
          rows.forEach((row) => byName.set(normalize(row.name), row));
          return { rows, byName };
        })
        .catch((error) => {
          catalogPromise = null;
          throw error;
        });
    }
    return catalogPromise;
  }

  function candidateImageUrl(referenceImageId) {
    return referenceImageId
      ? `https://cdn2.thecatapi.com/images/${encodeURIComponent(referenceImageId)}.jpg`
      : "";
  }

  async function matchFromApi(name) {
    const requestedName = String(name || "").trim();
    if (!requestedName) return null;

    const catalog = await getCatalog();
    const requestedKey = normalize(requestedName);
    const aliasName = API_ALIASES.get(requestedKey) || requestedName;
    const row = catalog.byName.get(normalize(aliasName));

    if (!row) return null;

    return {
      id: 0,
      requestedName,
      matchedName: String(row.name || ""),
      imageUrl: candidateImageUrl(row.reference_image_id),
      thumbnail: candidateImageUrl(row.reference_image_id),
      sourceUrl: "https://thecatapi.com/",
      referenceImageId: String(row.reference_image_id || ""),
      metadata: row,
      matched: Boolean(row.reference_image_id),
      source: "thecatapi"
    };
  }

  async function matchBreed(nameOrBreed) {
    const knowledgeMatch = resolveKnowledge(nameOrBreed);
    if (knowledgeMatch) return knowledgeMatch;

    const requestedName = typeof nameOrBreed === "string"
      ? nameOrBreed
      : String(nameOrBreed?.breed_name ?? nameOrBreed?.name ?? "");

    try {
      const apiMatch = await matchFromApi(requestedName);
      if (apiMatch) return apiMatch;
    } catch (error) {
      console.info("ไม่สามารถใช้คลังรูปสำรอง TheCatAPI:", error?.message || error);
    }

    return {
      id: idOf(nameOrBreed),
      requestedName,
      matchedName: "",
      imageUrl: "",
      thumbnail: "",
      sourceUrl: "",
      referenceImageId: "",
      metadata: null,
      matched: false,
      source: "none"
    };
  }

  async function getExactImageUrl(referenceImageId) {
    if (!referenceImageId) return "";
    if (exactImageCache.has(referenceImageId)) {
      return exactImageCache.get(referenceImageId);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(
        `${IMAGE_INFO_URL}${encodeURIComponent(referenceImageId)}`,
        { signal: controller.signal, headers: { Accept: "application/json" } }
      );
      if (!response.ok) return "";
      const payload = await response.json();
      const url = String(payload?.url || "");
      if (url) exactImageCache.set(referenceImageId, url);
      return url;
    } catch {
      return "";
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function repairImageElement(imageElement) {
    if (!imageElement || imageElement.dataset.repairing === "true") return;
    imageElement.dataset.repairing = "true";

    const breedId = idOf(imageElement.dataset.breedId);
    const knowledge = window.CatMatchBreedKnowledge;

    if (breedId && knowledge?.handleImageError) {
      knowledge.handleImageError(imageElement, breedId);
      imageElement.dataset.repairing = "false";
      return;
    }

    const referenceImageId = String(imageElement.dataset.referenceImageId || "");
    const exactUrl = await getExactImageUrl(referenceImageId);

    if (exactUrl && imageElement.src !== exactUrl) {
      imageElement.onerror = () => {
        imageElement.hidden = true;
        imageElement.closest(".breed-image, .detail-image-frame")
          ?.classList.add("image-unavailable");
      };
      imageElement.src = exactUrl;
      imageElement.dataset.repairing = "false";
      return;
    }

    imageElement.hidden = true;
    imageElement.closest(".breed-image, .detail-image-frame")
      ?.classList.add("image-unavailable");
  }

  window.CatMatchBreedImages = {
    getCatalog,
    matchBreed,
    repairImageElement,
    normalize
  };
})();
