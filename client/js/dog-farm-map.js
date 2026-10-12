"use strict";

(() => {
  const API_ORIGIN = window.CATMATCH_API_BASE_URL;
  const API_BASE = `${API_ORIGIN}/api`;
  const THAILAND_CENTER = [13.0, 101.0];
  const THAILAND_BOUNDS = [
    [5.5, 97.2],
    [20.7, 105.8],
  ];
  const params = new URLSearchParams(window.location.search);
  const initialBreedId = Number(params.get("breed_id"));
  const initialBreedName = params.get("breed_name") || "";
  const initialFarmId = Number(params.get("farm_id"));
  const resultId = Number(params.get("result_id"));
  const source = params.get("source") || (resultId ? "result" : "index");
  const browseMode = source === "index" || !resultId;
  let activeBreedId = Number.isInteger(initialBreedId) && initialBreedId > 0 ? initialBreedId : null;
  let activeBreedName = initialBreedName || "";
  let breedOptions = [];

  const farmList = document.getElementById("farmList");
  const farmCount = document.getElementById("farmCount");
  const farmLoading = document.getElementById("farmLoading");
  const farmError = document.getElementById("farmError");
  const breedSummary = document.getElementById("breedSummary");
  const pageTitle = document.getElementById("farmMapTitle");
  const breedPicker = document.getElementById("breedPicker");
  const breedSelect = document.getElementById("breedSelect");
  const breedPickerHint = document.getElementById("breedPickerHint");
  const farmNameSearch = document.getElementById("farmNameSearch");
  const locateButton = document.getElementById("locateButton");
  const locationMessage = document.getElementById("locationMessage");
  const distanceFilter = document.getElementById("distanceFilter");
  const farmMapElement = document.getElementById("farmMap");
  const backToResult = document.getElementById("backToResult");
  const animalDetailModal = document.getElementById("animalDetailModal");
  const animalDetailClose = document.getElementById("animalDetailClose");
  const animalDetailBackdrop = document.getElementById("animalDetailBackdrop");
  const animalDetailImage = document.getElementById("animalDetailImage");
  const animalDetailImageFallback = document.getElementById("animalDetailImageFallback");
  const animalDetailName = document.getElementById("animalDetailName");
  const animalDetailBreed = document.getElementById("animalDetailBreed");
  const animalDetailMeta = document.getElementById("animalDetailMeta");
  const animalDetailDescription = document.getElementById("animalDetailDescription");
  const animalDetailFarm = document.getElementById("animalDetailFarm");
  const animalDetailPhone = document.getElementById("animalDetailPhone");
  const animalDetailChat = document.getElementById("animalDetailChat");
  const animalDetailMap = document.getElementById("animalDetailMap");
  const farmProfileModal = document.getElementById("farmProfileModal");
  const farmProfileBackdrop = document.getElementById("farmProfileBackdrop");
  const farmProfileClose = document.getElementById("farmProfileClose");
  const farmProfileBody = document.getElementById("farmProfileBody");

  let map = null;
  let markerLayer = null;
  let userMarker = null;
  let farms = [];
  let selectedFarmId = null;
  let userLocation = readStoredLocation();
  let lastAnimalDetailTrigger = null;
  let farmNameSearchTimer = null;
  let farmNameSearchRequest = 0;
  const markers = new Map();
  const profileFarmCache = new Map();

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readJSON(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch (_error) {
      return null;
    }
  }

  function readStoredLocation() {
    const profile =
      readJSON(sessionStorage, "catmatch_user") ||
      readJSON(sessionStorage, "user") ||
      readJSON(localStorage, "catmatch_user") ||
      readJSON(localStorage, "user") ||
      {};

    const latitude = Number(profile.latitude);
    const longitude = Number(profile.longitude);

    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude, source: "profile" }
      : null;
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRadians = (degree) => degree * Math.PI / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const first = Math.sin(dLat / 2) ** 2;
    const second = Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(first + second), Math.sqrt(1 - first - second));
  }

  function normaliseFarmRows(rows) {
    const grouped = new Map();

    rows.forEach((row) => {
      const id = Number(row.farm_id);
      if (!id) return;

      if (!grouped.has(id)) {
        grouped.set(id, {
          farm_id: id,
          farm_name: row.farm_name || "ฟาร์มสุนัข",
          phone: row.phone || "",
          phone_country: row.phone_country || "",
          country: row.country || "",
          province: row.province || "",
          district: row.district || "",
          subdistrict: row.subdistrict || "",
          address: row.address || "",
          website: row.website || "",
          facebook: row.facebook || "",
          line_contact: row.line_contact || "",
          profile_image: row.profile_image || "",
          farm_description: row.farm_description || row.description || "",
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          animals: [],
          animalIds: new Set(),
          breeds: new Set(),
          has_related_match: false,
        });
      }

      const farm = grouped.get(id);
      const animalId = Number(row.animal_id);
      if (animalId && !farm.animalIds.has(animalId)) {
        farm.animalIds.add(animalId);
        farm.animals.push({
          animal_id: animalId,
          animal_name: row.animal_name || "สุนัขในฟาร์ม",
          breed_name: row.breed_name || activeBreedName,
          age_months: row.age_months == null ? null : Number(row.age_months),
          gender: row.gender || "",
          color: row.color || "",
          description: row.description || "",
          image_url: row.image_url || "",
          match_type: row.match_type || "exact",
        });
      }
      if (row.breed_name) farm.breeds.add(row.breed_name);
      if (row.match_type === "related") farm.has_related_match = true;
    });

    return Array.from(grouped.values()).map((farm) => ({
      ...farm,
      available_count: farm.animals.length,
      breed_names: Array.from(farm.breeds),
      has_coordinates: Number.isFinite(farm.latitude) && Number.isFinite(farm.longitude),
      distance_km: null,
    }));
  }

  function updateDistances() {
    farms = farms.map((farm) => ({
      ...farm,
      distance_km: userLocation && farm.has_coordinates
        ? haversineDistance(userLocation.latitude, userLocation.longitude, farm.latitude, farm.longitude)
        : null,
    }));

    farms.sort((first, second) => {
      if (first.distance_km === null && second.distance_km === null) return first.farm_name.localeCompare(second.farm_name, "th");
      if (first.distance_km === null) return 1;
      if (second.distance_km === null) return -1;
      return first.distance_km - second.distance_km;
    });
  }

  function formatAddress(farm) {
    return [farm.address, farm.subdistrict, farm.district, farm.province]
      .filter(Boolean)
      .join(" ") || "ยังไม่ได้ระบุที่อยู่";
  }

  function externalUrl(value) {
    if (!value) return "";
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  function phoneHref(farm) {
    const number = `${farm.phone_country || ""}${farm.phone || ""}`.replace(/[^+\d]/g, "");
    return number ? `tel:${number}` : "";
  }

  function normaliseSearchText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("th")
      .replace(/[\s._()\-–—/\\]+/g, "")
      .trim();
  }

  function filteredFarms() {
    const limit = distanceFilter?.value || "all";
    const query = normaliseSearchText(farmNameSearch?.value);

    return farms.filter((farm) => {
      const farmName = normaliseSearchText(farm.farm_name);
      const matchesName = !query || farmName.includes(query);
      const matchesDistance = limit === "all" || !userLocation ||
        (farm.distance_km !== null && farm.distance_km <= Number(limit));
      return matchesName && matchesDistance;
    });
  }

  function resolveAnimalImage(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (url.startsWith("/uploads/")) return `${API_ORIGIN}${url}`;
    if (/^https?:\/\//i.test(url) || url.startsWith("data:image/")) return url;
    return url;
  }

  function animalGenderLabel(value) {
    const gender = String(value || "").toLowerCase();
    if (gender === "male") return "เพศผู้";
    if (gender === "female") return "เพศเมีย";
    return "";
  }

  function animalAgeLabel(value) {
    const months = Number(value);
    if (!Number.isFinite(months) || months < 0) return "";
    if (months < 12) return `${months} เดือน`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths ? `${years} ปี ${remainingMonths} เดือน` : `${years} ปี`;
  }

  function animalDetailKey(farmId, animalId) {
    return `${Number(farmId)}:${Number(animalId)}`;
  }

  function findAnimalDetail(farmId, animalId) {
    const farm = farms.find((item) => Number(item.farm_id) === Number(farmId)) || profileFarmCache.get(Number(farmId));
    if (!farm) return null;
    const animal = (farm.animals || []).find((item) => Number(item.animal_id) === Number(animalId));
    return animal ? { farm, animal } : null;
  }

  function closeAnimalDetail() {
    if (!animalDetailModal) return;
    animalDetailModal.hidden = true;
    animalDetailModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-open-animal-modal");
    lastAnimalDetailTrigger?.focus?.();
    lastAnimalDetailTrigger = null;
  }

  function openAnimalDetail(farmId, animalId, trigger = null) {
    const detail = findAnimalDetail(farmId, animalId);
    if (!detail || !animalDetailModal) return;

    const { farm, animal } = detail;
    const imageUrl = resolveAnimalImage(animal.image_url);
    const metaItems = [
      animalAgeLabel(animal.age_months),
      animalGenderLabel(animal.gender),
      animal.color ? `สี ${animal.color}` : "",
      "พร้อมติดต่อ",
    ].filter(Boolean);

    lastAnimalDetailTrigger = trigger || document.activeElement;
    animalDetailName.textContent = animal.animal_name || "สุนัขในฟาร์ม";
    animalDetailBreed.textContent = animal.breed_name || activeBreedName;
    animalDetailFarm.textContent = `ฟาร์ม ${farm.farm_name}`;
    animalDetailDescription.textContent = animal.description || "ฟาร์มยังไม่ได้เพิ่มรายละเอียดเพิ่มเติมของสุนัขตัวนี้";
    animalDetailMeta.innerHTML = metaItems.map((item) => `<span>${escapeHTML(item)}</span>`).join("");

    if (imageUrl) {
      animalDetailImage.src = imageUrl;
      animalDetailImage.alt = animal.animal_name || "รูปสุนัข";
      animalDetailImage.hidden = false;
      animalDetailImageFallback.hidden = true;
    } else {
      animalDetailImage.removeAttribute("src");
      animalDetailImage.alt = "";
      animalDetailImage.hidden = true;
      animalDetailImageFallback.hidden = false;
    }

    const telephone = phoneHref(farm);
    animalDetailPhone.hidden = !telephone;
    if (telephone) animalDetailPhone.href = telephone;

    if (animalDetailChat) {
      const chatParams = new URLSearchParams({
        start: "farm",
        farm_id: String(farm.farm_id),
        animal_id: String(animal.animal_id),
        species: "dog",
      });
      animalDetailChat.href = `./chat.html?${chatParams.toString()}`;
    }

    animalDetailMap.hidden = !farm.has_coordinates;
    animalDetailMap.dataset.farmId = String(farm.farm_id);

    animalDetailModal.hidden = false;
    animalDetailModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-open-animal-modal");
    window.setTimeout(() => animalDetailClose?.focus(), 0);
  }

  function setupAnimalDetailModal() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest(".js-animal-detail");
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      if (trigger.closest(".farm-profile-modal")) closeFarmProfile();
      openAnimalDetail(trigger.dataset.farmId, trigger.dataset.animalId, trigger);
    });

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest(".js-show-all-cats");
      if (!trigger) return;
      event.preventDefault();
      const farmId = Number(trigger.dataset.farmId);
      focusFarm(farmId);
      const card = farmList.querySelector(`[data-farm-id="${farmId}"]`);
      const details = card?.querySelector(".farm-card__animal-more");
      if (details) details.open = true;
      card?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    animalDetailClose?.addEventListener("click", closeAnimalDetail);
    animalDetailBackdrop?.addEventListener("click", closeAnimalDetail);
    animalDetailModal?.addEventListener("click", (event) => {
      if (event.target.closest("[data-animal-modal-close]")) closeAnimalDetail();
    });
    animalDetailImage?.addEventListener("error", () => {
      animalDetailImage.hidden = true;
      animalDetailImageFallback.hidden = false;
    });
    animalDetailMap?.addEventListener("click", () => {
      const farmId = Number(animalDetailMap.dataset.farmId);
      closeAnimalDetail();
      window.setTimeout(() => focusFarm(farmId), 0);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && animalDetailModal && !animalDetailModal.hidden) {
        closeAnimalDetail();
      }
    });
  }

  function animalCardTemplate(farm, animal) {
    const imageUrl = resolveAnimalImage(animal.image_url);
    const details = [
      animal.breed_name,
      animalAgeLabel(animal.age_months),
      animalGenderLabel(animal.gender),
    ].filter(Boolean).join(" · ");

    return `
      <button
        class="farm-animal js-animal-detail"
        type="button"
        data-farm-id="${farm.farm_id}"
        data-animal-id="${animal.animal_id}"
        aria-label="ดูรายละเอียด ${escapeHTML(animal.animal_name)}"
      >
        <div class="farm-animal__media">
          ${imageUrl
            ? `<img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(animal.animal_name)}" loading="lazy" onerror="this.closest('.farm-animal__media').classList.add('has-error');this.remove();">`
            : ""}
          <span class="farm-animal__fallback" aria-hidden="true">🐱</span>
        </div>
        <div class="farm-animal__body">
          <strong>${escapeHTML(animal.animal_name)}</strong>
          <small>${escapeHTML(details || "พร้อมติดต่อ")}</small>
          <em>ดูรายละเอียด →</em>
        </div>
      </button>
    `;
  }

  function animalGalleryTemplate(farm) {
    const animals = Array.isArray(farm.animals) ? farm.animals : [];
    if (!animals.length) return "";

    const visibleAnimals = animals.slice(0, 2);
    const hiddenAnimals = animals.slice(2);

    return `
      <div class="farm-card__animal-heading">
        <strong>สุนัขพร้อมติดต่อ</strong>
        <span>${animals.length} ตัว</span>
      </div>
      <div class="farm-card__animals" aria-label="สุนัขพร้อมติดต่อในฟาร์ม">
        ${visibleAnimals.map((animal) => animalCardTemplate(farm, animal)).join("")}
      </div>
      ${hiddenAnimals.length ? `
        <details class="farm-card__animal-more">
          <summary>
            <span class="farm-card__animal-more-label" data-open-label="ย่อรายการ" data-closed-label="ดูสุนัขทั้งหมด">ดูสุนัขทั้งหมด</span>
            <span class="farm-card__animal-more-count">+${hiddenAnimals.length}</span>
            <span class="farm-card__animal-more-icon" aria-hidden="true">⌄</span>
          </summary>
          <div class="farm-card__animals farm-card__animals--expanded" aria-label="สุนัขเพิ่มเติมในฟาร์ม">
            ${hiddenAnimals.map((animal) => animalCardTemplate(farm, animal)).join("")}
          </div>
        </details>
      ` : ""}
    `;
  }

  function resolveFarmImage(value) {
    return resolveAnimalImage(value);
  }

  function closeFarmProfile() {
    if (!farmProfileModal) return;
    farmProfileModal.hidden = true;
    farmProfileModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-open-farm-profile");
  }

  async function openFarmProfile(farmId) {
    if (!farmProfileModal || !farmProfileBody) return;
    farmProfileModal.hidden = false;
    farmProfileModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-open-farm-profile");
    farmProfileBody.innerHTML = '<div class="farm-profile-loading">กำลังโหลดโปรไฟล์ฟาร์ม...</div>';

    try {
      const response = await fetch(`${API_BASE}/farms/${encodeURIComponent(farmId)}?species=dog&t=${Date.now()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || "โหลดโปรไฟล์ฟาร์มไม่สำเร็จ");

      const rawFarm = payload.data || {};
      const animals = Array.isArray(rawFarm.animals)
        ? rawFarm.animals.filter((animal) => String(animal.status || "").trim().toLowerCase() === "available")
        : [];
      const farm = {
        ...rawFarm,
        farm_id: Number(rawFarm.farm_id),
        latitude: Number(rawFarm.latitude),
        longitude: Number(rawFarm.longitude),
        has_coordinates: Number.isFinite(Number(rawFarm.latitude)) && Number.isFinite(Number(rawFarm.longitude)),
        animals,
        available_count: animals.length,
        breed_names: Array.from(new Set(animals.map((animal) => animal.breed_name).filter(Boolean))),
        distance_km: null,
      };
      profileFarmCache.set(farm.farm_id, farm);

      const image = resolveFarmImage(farm.profile_image);
      const address = [farm.address, farm.subdistrict, farm.district, farm.province].filter(Boolean).join(" ") || "ยังไม่ได้ระบุที่อยู่";
      const telephone = phoneHref(farm);
      const directions = farm.has_coordinates
        ? `https://www.google.com/maps/dir/?api=1&destination=${farm.latitude},${farm.longitude}`
        : "";

      const cats = animals.length
        ? animals.map((animal) => {
            const animalImage = resolveAnimalImage(animal.image_url);
            return `
              <button type="button" class="farm-profile-cat js-animal-detail" data-farm-id="${farm.farm_id}" data-animal-id="${animal.animal_id}">
                <div class="farm-profile-cat__photo">
                  ${animalImage ? `<img src="${escapeHTML(animalImage)}" alt="${escapeHTML(animal.animal_name || "สุนัข")}" onerror="this.remove();this.parentElement.classList.add('is-fallback')">` : ""}
                  <span aria-hidden="true">🐱</span>
                </div>
                <strong>${escapeHTML(animal.animal_name || "สุนัขในฟาร์ม")}</strong>
                <small>${escapeHTML(animal.breed_name || "")}</small>
                <em>ดูรายละเอียด →</em>
              </button>`;
          }).join("")
        : '<p class="farm-profile-empty">ยังไม่มีสุนัขที่พร้อมติดต่อ</p>';

      farmProfileBody.innerHTML = `
        <div class="farm-profile-hero">
          <div class="farm-profile-photo${image ? "" : " is-fallback"}">
            ${image ? `<img src="${escapeHTML(image)}" alt="รูปโปรไฟล์ ${escapeHTML(farm.farm_name || "ฟาร์ม")}" onerror="this.remove();this.parentElement.classList.add('is-fallback')">` : ""}
            <span aria-hidden="true">🐾</span>
          </div>
          <div class="farm-profile-hero__copy">
            <p class="farm-profile-eyebrow">VERIFIED FARM PROFILE</p>
            <h2 id="farmProfileTitle">${escapeHTML(farm.farm_name || "ฟาร์มสุนัข")}</h2>
            <span class="farm-profile-verified">✓ ฟาร์มผ่านการยืนยัน</span>
            <p class="farm-profile-address">${escapeHTML(address)}</p>
          </div>
        </div>

        <section class="farm-profile-section">
          <h3>เกี่ยวกับฟาร์ม</h3>
          <p>${escapeHTML(farm.description || "ฟาร์มยังไม่ได้เพิ่มรายละเอียดเพิ่มเติม")}</p>
        </section>

        <section class="farm-profile-section">
          <div class="farm-profile-section-head">
            <h3>สุนัขพร้อมติดต่อ</h3>
            <span>${animals.length} ตัว</span>
          </div>
          <div class="farm-profile-cats">${cats}</div>
        </section>

        ${farm.has_coordinates ? `
        <section class="farm-profile-section farm-profile-location-section">
          <div class="farm-profile-section-head">
            <h3>ตำแหน่งฟาร์ม</h3>
            <span>พิกัด ${farm.latitude.toFixed(6)}, ${farm.longitude.toFixed(6)}</span>
          </div>
          <p>กดปุ่มด้านล่างเพื่อกลับไปยังแผนที่และเปิดหมุดของฟาร์มนี้โดยตรง</p>
        </section>` : ""}

        <div class="farm-profile-actions">
          <a href="./chat.html?start=farm&amp;farm_id=${encodeURIComponent(farm.farm_id)}&amp;species=dog${activeBreedName ? `&amp;breed_name=${encodeURIComponent(activeBreedName)}` : ""}">💬 แชทกับฟาร์ม</a>
          ${telephone ? `<a href="${escapeHTML(telephone)}">☎ โทรหาฟาร์ม</a>` : ""}
          ${farm.facebook ? `<a href="${escapeHTML(externalUrl(farm.facebook))}" target="_blank" rel="noopener">Facebook</a>` : ""}
          ${farm.website ? `<a href="${escapeHTML(externalUrl(farm.website))}" target="_blank" rel="noopener">เว็บไซต์</a>` : ""}
          ${farm.has_coordinates ? `<button type="button" class="js-focus-farm-location" data-farm-id="${farm.farm_id}">⌖ ดูหมุดบนแผนที่</button>` : ""}
          ${directions ? `<a href="${escapeHTML(directions)}" target="_blank" rel="noopener">⌖ นำทางด้วย Google Maps</a>` : ""}
        </div>`;

      const focusLocationButton = farmProfileBody.querySelector(".js-focus-farm-location");
      focusLocationButton?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        focusFarmFromProfile(Number(focusLocationButton.dataset.farmId));
      });
    } catch (error) {
      farmProfileBody.innerHTML = `<div class="farm-profile-error">${escapeHTML(error.message || "ไม่สามารถโหลดโปรไฟล์ฟาร์มได้")}</div>`;
    }
  }

  function setupFarmProfileModal() {
    document.addEventListener("click", (event) => {
      const locationTrigger = event.target.closest(".js-focus-farm-location");
      if (locationTrigger) {
        event.preventDefault();
        event.stopPropagation();
        const targetFarmId = Number(locationTrigger.dataset.farmId);
        focusFarmFromProfile(targetFarmId);
        return;
      }

      const trigger = event.target.closest(".js-farm-profile");
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      void openFarmProfile(trigger.dataset.farmId);
    });
    farmProfileClose?.addEventListener("click", closeFarmProfile);
    farmProfileBackdrop?.addEventListener("click", closeFarmProfile);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && farmProfileModal && !farmProfileModal.hidden) closeFarmProfile();
    });
  }

  function popupAnimalsTemplate(farm) {
    const allAnimals = Array.isArray(farm.animals) ? farm.animals : [];
    const animals = allAnimals.slice(0, 2);
    if (!animals.length) return "";
    const directions = farm.has_coordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${farm.latitude},${farm.longitude}`
      : "";
    return `
      <div class="popup-animal-list">
        ${animals.map((animal) => {
          const imageUrl = resolveAnimalImage(animal.image_url);
          return `
            <button class="popup-animal-item js-animal-detail" type="button" data-farm-id="${farm.farm_id}" data-animal-id="${animal.animal_id}" aria-label="ดูรายละเอียด ${escapeHTML(animal.animal_name)}">
              <div class="popup-animal-image">${imageUrl ? `<img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(animal.animal_name)}" loading="lazy">` : "<span>🐱</span>"}</div>
              <div><strong>${escapeHTML(animal.animal_name)}</strong><small>${escapeHTML(animal.breed_name || activeBreedName)}</small></div>
            </button>`;
        }).join("")}
      </div>
      <div class="popup-actions">
        ${allAnimals.length > 2 ? `<button type="button" class="popup-action js-show-all-cats" data-farm-id="${farm.farm_id}">ดูสุนัขทั้งหมด ${allAnimals.length} ตัว</button>` : ""}
        <button type="button" class="popup-action js-farm-profile" data-farm-id="${farm.farm_id}">ดูโปรไฟล์ฟาร์ม</button>
        ${directions ? `<a class="popup-action" href="${directions}" target="_blank" rel="noopener">นำทาง</a>` : ""}
      </div>
    `;
  }

  function formatUpdatedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  }

  function cardTemplate(farm, index) {
    const distance = farm.distance_km === null
      ? "ยังไม่ทราบระยะทาง"
      : `${farm.distance_km.toFixed(farm.distance_km < 10 ? 1 : 0)} กม.`;
    const telephone = phoneHref(farm);
    const directions = farm.has_coordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${farm.latitude},${farm.longitude}`
      : "";
    const breedText = (farm.breed_names || []).join(", ") || activeBreedName;
    const updatedAt = formatUpdatedAt(farm.updated_at || farm.animal_updated_at);
    const activeClass = Number(selectedFarmId) === Number(farm.farm_id) ? " is-active" : "";

    return `
      <article class="farm-card${activeClass}" data-farm-id="${farm.farm_id}" tabindex="0" aria-label="ฟาร์ม ${escapeHTML(farm.farm_name)}">
        <div class="farm-card__top">
          <div class="farm-card__identity">
            <span class="farm-card__verified">✓ ฟาร์มผ่านการยืนยัน</span>
            <h2>${escapeHTML(farm.farm_name)}</h2>
          </div>
          <span class="farm-card__rank">${index === 0 && userLocation ? "ใกล้ที่สุด" : `ลำดับ ${index + 1}`}</span>
        </div>
        <p class="farm-card__address">${escapeHTML(formatAddress(farm))}</p>
        <div class="farm-card__meta" aria-label="ข้อมูลสำคัญ">
          <span class="is-distance">⌖ ${escapeHTML(distance)}</span>
          <span>🐱 ${farm.available_count} ตัว</span>
        </div>
        <p class="farm-card__breed"><strong>${escapeHTML(breedText)}</strong>${farm.has_related_match ? " · สายพันธุ์ใกล้เคียง" : ""}</p>
        ${animalGalleryTemplate(farm)}
        <p class="farm-card__location-note">ตำแหน่งบนแผนที่เป็นข้อมูลโดยประมาณ${updatedAt ? ` · อัปเดต ${escapeHTML(updatedAt)}` : ""}</p>
        <div class="farm-card__actions">
          <button class="farm-card__primary js-farm-profile" type="button" data-farm-id="${farm.farm_id}">ดูรายละเอียดฟาร์ม</button>
          <div class="farm-card__secondary" aria-label="ช่องทางติดต่อ">
            ${telephone ? `<a href="${telephone}" aria-label="โทรหาฟาร์ม" title="โทรหาฟาร์ม">☎ <span>โทร</span></a>` : ""}
            ${farm.facebook ? `<a href="${escapeHTML(externalUrl(farm.facebook))}" target="_blank" rel="noopener" aria-label="เปิด Facebook" title="Facebook">f <span>Facebook</span></a>` : ""}
            ${directions ? `<a href="${directions}" target="_blank" rel="noopener" aria-label="นำทางไปฟาร์ม" title="นำทาง">⌖ <span>นำทาง</span></a>` : ""}
          </div>
        </div>
      </article>`;
  }

  function renderFarmList() {
    const visible = filteredFarms();
    farmCount.textContent = `${visible.length} แห่ง`;

    if (!visible.length) {
      const hasNameQuery = Boolean(String(farmNameSearch?.value || "").trim());
      farmList.innerHTML = `<div class="farm-list-status">${hasNameQuery
        ? "ไม่พบชื่อฟาร์มที่ค้นหา ลองตรวจสอบคำค้นหาหรือเปลี่ยนสายพันธุ์"
        : "ไม่พบฟาร์มในระยะทางที่เลือก ลองเปลี่ยนตัวกรองเป็น ‘ทุกระยะทาง’"}</div>`;
      renderMarkers([]);
      return;
    }

    farmList.innerHTML = visible.map(cardTemplate).join("");

    farmList.querySelectorAll(".farm-card__animal-more").forEach((details) => {
      const label = details.querySelector(".farm-card__animal-more-label");
      const syncLabel = () => { if (label) label.textContent = details.open ? label.dataset.openLabel : label.dataset.closedLabel; };
      details.addEventListener("toggle", syncLabel);
      syncLabel();
    });

    farmList.querySelectorAll(".js-focus-farm").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        focusFarm(Number(button.dataset.farmId));
      });
    });

    farmList.querySelectorAll(".farm-card").forEach((card) => {
      const activate = () => focusFarm(Number(card.dataset.farmId));
      card.addEventListener("click", (event) => {
        if (event.target.closest("a, button, .js-animal-detail, details, summary")) return;
        activate();
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });

    renderMarkers(visible);
  }

  function createMap() {
    if (!window.L || !window.CatMatchThailandMap) {
      if (farmMapElement) {
        farmMapElement.innerHTML =
          '<div class="farm-list-status is-error">' +
          'ไม่สามารถโหลดแผนที่ได้ กรุณาตรวจสอบอินเทอร์เน็ต' +
          '</div>';
      }
      return;
    }

    const thailandBounds = window.CatMatchThailandMap.BOUNDS;

    map = L.map("farmMap", {
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: thailandBounds,
      maxBoundsViscosity: 1,
    });

    window.CatMatchThailandMap.addThailandLayer(map, {
      minZoom: 5,
      maxZoom: 18,
      borderColor: "#73aeda",
      borderWeight: 2,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">' +
        'OpenStreetMap</a>',
    });

    markerLayer = L.layerGroup().addTo(map);
    map.fitBounds(thailandBounds, { padding: [18, 18], animate: false });

    requestAnimationFrame(() => map?.invalidateSize());
    window.setTimeout(() => {
      map?.invalidateSize();
      if (map && !farms.length && !userLocation) {
        map.fitBounds(thailandBounds, { padding: [18, 18], animate: false });
      }
    }, 250);

    window.addEventListener("resize", () => map?.invalidateSize(), {
      passive: true,
    });
  }

  function farmIcon(isNearest) {
    return L.divIcon({
      className: "catmatch-farm-pin",
      html: `<div class="farm-pin-shape${isNearest ? " is-nearest" : ""}"><span>🐾</span></div>`,
      iconSize: isNearest ? [50, 50] : [42, 42],
      iconAnchor: isNearest ? [25, 47] : [21, 40],
      popupAnchor: [0, -38],
    });
  }

  function userIcon() {
    return L.divIcon({
      className: "catmatch-user-pin",
      html: '<div class="user-pin-shape"></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }

  function farmPopupTemplate(farm) {
    const distance = farm.distance_km === null || farm.distance_km === undefined
      ? ""
      : `<br>${Number(farm.distance_km).toFixed(1)} กม. จากคุณ`;
    return `
      <div class="popup-farm-name">${escapeHTML(farm.farm_name)}</div>
      <p class="popup-farm-meta">✓ ผ่านการยืนยัน<br>มีสุนัขพร้อมติดต่อ ${Number(farm.available_count || farm.animals?.length || 0)} ตัว${distance}</p>
      ${popupAnimalsTemplate(farm)}
    `;
  }

  function addFarmMarker(farm, isNearest = false) {
    if (!map || !markerLayer || !farm?.has_coordinates) return null;
    const farmId = Number(farm.farm_id);
    if (!farmId) return null;

    const existingMarker = markers.get(farmId);
    if (existingMarker) return existingMarker;

    const marker = L.marker([farm.latitude, farm.longitude], { icon: farmIcon(isNearest) })
      .bindPopup(farmPopupTemplate(farm), { className: "catmatch-popup" })
      .on("click", () => highlightCard(farmId))
      .addTo(markerLayer);
    markers.set(farmId, marker);
    return marker;
  }

  function renderMarkers(visibleFarms) {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    markers.clear();
    const bounds = [];

    if (userLocation) {
      userMarker = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon(), zIndexOffset: 1000 })
        .bindTooltip("ตำแหน่งของคุณ", { direction: "top" })
        .addTo(markerLayer);
      bounds.push([userLocation.latitude, userLocation.longitude]);
    }

    visibleFarms.filter((farm) => farm.has_coordinates).forEach((farm, index) => {
      addFarmMarker(farm, index === 0 && Boolean(userLocation));
      bounds.push([farm.latitude, farm.longitude]);
    });

    if (bounds.length === 1) map.setView(bounds[0], userLocation ? 11 : 8);
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [58, 58], maxZoom: 13 });
  }

  function highlightCard(farmId) {
    selectedFarmId = Number(farmId);
    farmList.querySelectorAll(".farm-card").forEach((card) => {
      card.classList.toggle("is-active", Number(card.dataset.farmId) === Number(farmId));
    });
    const selected = farmList.querySelector(`[data-farm-id="${Number(farmId)}"]`);
    selected?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function findFarmById(farmId) {
    const targetId = Number(farmId);
    return farms.find((farm) => Number(farm.farm_id) === targetId)
      || profileFarmCache.get(targetId)
      || null;
  }

  function focusFarm(farmId) {
    const targetId = Number(farmId);
    const farm = findFarmById(targetId);
    if (!map || !farm?.has_coordinates) return false;

    highlightCard(targetId);
    const marker = markers.get(targetId) || addFarmMarker(farm, false);
    if (!marker) return false;

    map.invalidateSize();
    const position = marker.getLatLng();
    if (typeof map.flyTo === "function") {
      map.flyTo(position, 15, { animate: true, duration: 0.9 });
    } else {
      map.setView(position, 15, { animate: true });
    }

    window.setTimeout(() => {
      map.invalidateSize();
      marker.openPopup();
      highlightCard(targetId);
    }, 360);
    return true;
  }

  function focusFarmFromProfile(farmId) {
    const targetId = Number(farmId);
    closeFarmProfile();
    window.setTimeout(() => {
      const focused = focusFarm(targetId);
      if (!focused) {
        setLocationMessage("ไม่พบพิกัดของฟาร์มนี้ กรุณาให้ฟาร์มบันทึกตำแหน่งก่อน", "error");
      }
    }, 180);
  }

  function setLocationMessage(text, type = "") {
    locationMessage.textContent = text;
    locationMessage.className = `location-message${type ? ` is-${type}` : ""}`;
  }

  function focusUserLocation() {
    if (!userLocation) return;

    const latitude = userLocation.latitude;
    const longitude = userLocation.longitude;

    if (map) {
      map.flyTo([latitude, longitude], 15, {
        animate: true,
        duration: 1.15,
      });

      if (userMarker) {
        userMarker.openTooltip();
      }
      return;
    }

    const fallbackFrame = farmMapElement?.querySelector(".farm-map-iframe");
    if (fallbackFrame) {
      const latitudePadding = 0.08;
      const longitudePadding = 0.1;
      const bbox = [
        longitude - longitudePadding,
        latitude - latitudePadding,
        longitude + longitudePadding,
        latitude + latitudePadding,
      ].join(",");

      fallbackFrame.src =
        `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}` +
        `&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
    }
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationMessage("เบราว์เซอร์นี้ไม่รองรับการค้นหาตำแหน่ง", "error");
      return;
    }

    locateButton.disabled = true;
    locateButton.innerHTML = "กำลังค้นหาตำแหน่ง...";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "browser",
        };
        locateButton.disabled = false;
        locateButton.innerHTML = '<span aria-hidden="true">✓</span> พบตำแหน่งของฉันแล้ว';
        setLocationMessage("พบตำแหน่งของคุณแล้ว และเลื่อนแผนที่ไปยังจุดที่คุณอยู่", "success");
        updateDistances();
        renderFarmList();
        focusUserLocation();
      },
      () => {
        locateButton.disabled = false;
        locateButton.innerHTML = '<span aria-hidden="true">⌖</span> ลองใช้ตำแหน่งอีกครั้ง';
        setLocationMessage("ไม่สามารถเข้าถึงตำแหน่งได้ คุณยังดูฟาร์มทั้งหมดบนแผนที่ได้", "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  function renderFarmSkeletons() {
    farmList.innerHTML = Array.from({ length: 3 }, () => `
      <article class="farm-card farm-card--skeleton" aria-hidden="true">
        <div class="skeleton-line is-short"></div>
        <div class="skeleton-line is-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-pills"><i></i><i></i></div>
        <div class="skeleton-cats"><i></i><i></i></div>
      </article>`).join("");
  }

  function fallbackBreeds() {
    return (Array.isArray(window.DOGMATCH_DOG_BREEDS) ? window.DOGMATCH_DOG_BREEDS : [])
      .map((breed) => ({
        breed_id: Number(breed.breed_id),
        breed_name: String(breed.breed_name || "").trim(),
        thai_name: String(breed.thai_name || "").trim(),
      }))
      .filter((breed) => breed.breed_id > 0 && breed.breed_name);
  }

  function breedDisplayName(breed) {
    if (!breed) return "";
    return breed.thai_name
      ? `${breed.thai_name} (${breed.breed_name})`
      : breed.breed_name;
  }

  function mergeBreedNames(rows) {
    const localRows = fallbackBreeds();
    const localById = new Map(localRows.map((breed) => [Number(breed.breed_id), breed]));
    const localByName = new Map(
      localRows.map((breed) => [
        String(breed.breed_name || "").trim().toLowerCase(),
        breed
      ])
    );

    return rows.map((breed) => {
      const remoteName = String(
        breed.breed_name || breed.name || ""
      ).trim();
      const local =
        localByName.get(remoteName.toLowerCase()) ||
        localById.get(Number(breed.breed_id)) ||
        {};

      return {
        breed_id: Number(breed.breed_id || local.breed_id || 0),
        breed_name: String(remoteName || local.breed_name || "").trim(),
        thai_name: String(
          breed.thai_name ||
          breed.breed_name_th ||
          breed.thai_breed_name ||
          local.thai_name ||
          ""
        ).trim(),
      };
    }).filter((breed) => breed.breed_id > 0 && breed.breed_name);
  }

  function renderBreedOptions() {
    if (!breedSelect) return;
    const options = ['<option value="">เลือกสายพันธุ์สุนัข</option>'];
    for (const breed of breedOptions) {
      options.push(`<option value="${breed.breed_id}">${escapeHTML(breedDisplayName(breed))}</option>`);
    }
    breedSelect.innerHTML = options.join("");
    breedSelect.value = activeBreedId ? String(activeBreedId) : "";
  }

  async function loadBreedOptions() {
    let rows = [];
    try {
      const response = await fetch(`${API_BASE}/breeds?species=dog&limit=100&page=1&t=${Date.now()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.success !== false && Array.isArray(payload.data)) rows = payload.data;
    } catch (_error) {
      // ใช้ข้อมูลสายพันธุ์ที่มากับหน้าเว็บเป็นทางสำรอง
    }
    breedOptions = mergeBreedNames(rows.length ? rows : fallbackBreeds())
      .sort((first, second) => breedDisplayName(first).localeCompare(breedDisplayName(second), "th"));

    if (activeBreedId) {
      const selected = breedOptions.find((breed) => breed.breed_id === activeBreedId);
      if (selected) activeBreedName = selected.breed_name;
    }
    renderBreedOptions();
  }

  function showBreedSelectionState() {
    farms = [];
    farmLoading.hidden = true;
    farmError.hidden = true;
    farmCount.textContent = "0 แห่ง";
    farmList.innerHTML = `
      <div class="farm-list-status breed-empty-state">
        <span class="breed-empty-state__icon" aria-hidden="true">🐕</span>
        <strong>เลือกสายพันธุ์สุนัขก่อน</strong>
        <p>ระบบจะแสดงสุนัขสายพันธุ์นั้นจากทุกฟาร์มที่ผ่านการยืนยันทั่วประเทศไทย</p>
      </div>`;
    breedSummary.textContent = "เลือกสายพันธุ์สุนัขเพื่อดูสุนัขที่พร้อมติดต่อจากฟาร์มทั่วประเทศไทย";
    if (pageTitle) pageTitle.textContent = "ค้นหาฟาร์มสุนัขทั่วประเทศ";
    document.title = "ค้นหาฟาร์มสุนัขทั่วประเทศ — DogMatch";
    markerLayer?.clearLayers();
  }

  function updateBreedUrl() {
    const next = new URL(window.location.href);
    next.searchParams.set("source", browseMode ? "index" : "result");
    if (activeBreedId) {
      next.searchParams.set("breed_id", String(activeBreedId));
      next.searchParams.set("breed_name", activeBreedName);
    } else {
      next.searchParams.delete("breed_id");
      next.searchParams.delete("breed_name");
    }
    window.history.replaceState({}, "", next);
  }

  async function selectBreed(breedId) {
    const selected = breedOptions.find((breed) => breed.breed_id === Number(breedId));
    activeBreedId = selected?.breed_id || null;
    activeBreedName = selected?.breed_name || "";
    if (breedPickerHint) {
      breedPickerHint.textContent = selected
        ? `กำลังแสดง ${breedDisplayName(selected)} จากฟาร์มทั่วประเทศ`
        : "เลือกได้ทุกสายพันธุ์ โดยไม่ผูกกับผลแบบประเมิน";
    }
    updateBreedUrl();
    await loadFarms();
  }


  async function searchAllFarmsByName() {
    const query = String(farmNameSearch?.value || "").trim();
    if (!browseMode || activeBreedId || !query) {
      await loadFarms();
      return;
    }

    const requestId = ++farmNameSearchRequest;
    renderFarmSkeletons();
    farmLoading.hidden = false;
    farmError.hidden = true;
    breedSummary.textContent = `กำลังค้นหาฟาร์มชื่อ “${query}” จากฟาร์มที่ผ่านการยืนยันทั่วประเทศ`;
    if (pageTitle) pageTitle.textContent = "ค้นหาฟาร์มตามชื่อ";

    try {
      const endpoint = `${API_BASE}/farms?species=dog&include_animals=1&search=${encodeURIComponent(query)}&t=${Date.now()}`;
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || "ค้นหาฟาร์มไม่สำเร็จ");
      if (requestId !== farmNameSearchRequest) return;

      farms = normaliseFarmRows(Array.isArray(payload.data) ? payload.data : []);
      updateDistances();
      farmLoading.hidden = true;
      renderFarmList();
      breedSummary.textContent = farms.length
        ? `ผลการค้นหาฟาร์มชื่อ “${query}” ทั่วประเทศไทย`
        : `ไม่พบฟาร์มชื่อ “${query}”`;
    } catch (error) {
      if (requestId !== farmNameSearchRequest) return;
      farmLoading.hidden = true;
      farmError.hidden = false;
      farmError.textContent = error.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
      farmList.innerHTML = "";
      farmCount.textContent = "0 แห่ง";
      renderMarkers([]);
    }
  }

  async function focusInitialFarmFromQuery() {
    if (!initialFarmId) return false;

    let farm = findFarmById(initialFarmId);
    if (!farm) {
      try {
        const response = await fetch(
          `${API_BASE}/farms/${encodeURIComponent(initialFarmId)}?species=dog&t=${Date.now()}`,
          { cache: "no-store", headers: { Accept: "application/json" } }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          throw new Error(payload.message || "โหลดตำแหน่งฟาร์มไม่สำเร็จ");
        }

        const rawFarm = payload.data || {};
        const latitude = Number(rawFarm.latitude);
        const longitude = Number(rawFarm.longitude);
        farm = {
          ...rawFarm,
          farm_id: Number(rawFarm.farm_id || initialFarmId),
          latitude,
          longitude,
          has_coordinates: Number.isFinite(latitude) && Number.isFinite(longitude),
          animals: Array.isArray(rawFarm.animals) ? rawFarm.animals : [],
          available_count: Array.isArray(rawFarm.animals) ? rawFarm.animals.length : 0,
          distance_km: null,
        };
        profileFarmCache.set(Number(farm.farm_id), farm);
      } catch (error) {
        setLocationMessage(error.message || "ไม่สามารถเปิดหมุดฟาร์มนี้ได้", "error");
        return false;
      }
    }

    if (!farm?.has_coordinates) {
      setLocationMessage("ฟาร์มนี้ยังไม่ได้บันทึกพิกัดบนแผนที่", "error");
      return false;
    }

    const focused = focusFarm(Number(farm.farm_id));
    if (focused) {
      setLocationMessage(`กำลังแสดงตำแหน่งของ ${farm.farm_name || "ฟาร์มที่เลือก"}`, "success");
    }
    return focused;
  }

  async function loadFarms() {
    farmError.hidden = true;
    if (!activeBreedId) {
      showBreedSelectionState();
      return;
    }

    renderFarmSkeletons();
    farmLoading.hidden = false;
    const selectedLabel = activeBreedName || "สายพันธุ์ที่เลือก";
    breedSummary.textContent = browseMode
      ? `แสดงสุนัข ${selectedLabel} จากฟาร์มที่ผ่านการยืนยันทั่วประเทศไทย`
      : `แสดงฟาร์มที่มี ${selectedLabel} พร้อมติดต่อ`;
    if (pageTitle) pageTitle.textContent = browseMode ? `${selectedLabel} จากฟาร์มทั่วประเทศ` : "ฟาร์มสุนัขใกล้คุณ";
    document.title = browseMode
      ? `${selectedLabel} จากฟาร์มทั่วประเทศ — DogMatch`
      : `ฟาร์มที่มี ${selectedLabel} — DogMatch`;

    try {
      const endpoint = `${API_BASE}/breeds/${encodeURIComponent(activeBreedId)}/farms?species=dog&breed_name=${encodeURIComponent(selectedLabel)}&include_related=0&t=${Date.now()}`;
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || "โหลดข้อมูลฟาร์มไม่สำเร็จ");

      farms = normaliseFarmRows(Array.isArray(payload.data) ? payload.data : []);
      updateDistances();
      farmLoading.hidden = true;

      if (!farms.length) {
        farmError.hidden = false;
        farmError.textContent = `ยังไม่มีสุนัข ${selectedLabel} ที่พร้อมติดต่อในฟาร์มที่ผ่านการยืนยัน`;
        farmCount.textContent = "0 แห่ง";
        farmList.innerHTML = "";
        markerLayer?.clearLayers();
        return;
      }

      renderFarmList();
      if (browseMode && !userLocation) {
        setLocationMessage("กำลังแสดงทุกฟาร์มทั่วประเทศไทย เปิดตำแหน่งเมื่อต้องการเรียงจากใกล้ที่สุด", "success");
      } else if (userLocation) {
        setLocationMessage("เรียงฟาร์มจากตำแหน่งที่บันทึกไว้ในบัญชีของคุณแล้ว", "success");
      }
    } catch (error) {
      farmLoading.hidden = true;
      farmError.hidden = false;
      farmError.textContent = error.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
    }
  }

  function getStoredToken() {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of ["catmatch_token", "userToken", "token"]) {
        const value = storage.getItem(key);
        if (value) return value;
      }
    }
    return "";
  }

  function getStoredUser() {
    return readJSON(localStorage, "catmatch_user") ||
      readJSON(sessionStorage, "catmatch_user") ||
      readJSON(localStorage, "user") ||
      readJSON(sessionStorage, "user") || null;
  }

  function clearAuthentication() {
    const keys = ["catmatch_token", "userToken", "token", "catmatch_user", "user"];
    for (const storage of [localStorage, sessionStorage]) keys.forEach((key) => storage.removeItem(key));
  }

  function setupAuthNavigation() {
    const guestActions = document.getElementById("guestNavActions");
    const userActions = document.getElementById("userNavActions");
    const menuTrigger = document.getElementById("userMenuTrigger");
    const menuPanel = document.getElementById("userMenuPanel");
    const logoutButton = document.getElementById("logoutButton");
    const accountSettingsButton = document.getElementById("accountSettingsButton");
    const user = getStoredUser();
    const loggedIn = Boolean(getStoredToken() && user);

    if (!guestActions || !userActions) return;
    guestActions.hidden = loggedIn;
    userActions.hidden = !loggedIn;
    if (!loggedIn || !menuTrigger || !menuPanel) return;

    const displayName = String(user.username || user.name || user.full_name || "ผู้ใช้งาน").trim().split(/\s+/)[0];
    const initial = displayName.charAt(0).toUpperCase() || "U";
    const values = {
      userDisplayName: displayName,
      userMenuName: displayName,
      userMenuEmail: String(user.email || ""),
      userAvatar: initial,
      userMenuAvatar: initial,
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    document.body.appendChild(menuPanel);
    const closeMenu = () => {
      menuTrigger.setAttribute("aria-expanded", "false");
      menuPanel.classList.remove("is-open");
      menuPanel.hidden = true;
    };
    const positionMenu = () => {
      if (menuPanel.hidden) return;
      const rect = menuTrigger.getBoundingClientRect();
      const width = Math.min(310, window.innerWidth - 24);
      menuPanel.style.width = `${width}px`;
      menuPanel.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      menuPanel.style.top = `${Math.min(rect.bottom + 10, window.innerHeight - 20)}px`;
    };
    menuTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menuTrigger.getAttribute("aria-expanded") === "true") closeMenu();
      else {
        menuPanel.hidden = false;
        menuPanel.classList.add("is-open");
        menuTrigger.setAttribute("aria-expanded", "true");
        positionMenu();
      }
    });
    menuPanel.addEventListener("click", (event) => event.stopPropagation());
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (event) => event.key === "Escape" && closeMenu());
    window.addEventListener("resize", positionMenu, { passive: true });
    window.addEventListener("scroll", positionMenu, { passive: true });
    accountSettingsButton?.addEventListener("click", () => window.location.href = "./settings.html");
    logoutButton?.addEventListener("click", () => {
      clearAuthentication();
      window.location.replace("./dog-index.html");
    });
  }

  function setupNavigation() {
    if (resultId) {
      backToResult.href = `./dog-result.html?result_id=${resultId}&history=1`;
      backToResult.textContent = "← กลับไปหน้าผลลัพธ์";
    } else {
      backToResult.href = "./dog-index.html";
      backToResult.textContent = "← กลับหน้าแรก";
    }
    if (breedPicker) breedPicker.hidden = !browseMode;
    setupAuthNavigation();

    const header = document.getElementById("siteHeader");
    const menuToggle = document.getElementById("menuToggle");
    menuToggle?.addEventListener("click", () => {
      const open = header?.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(Boolean(open)));
    });

    const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 16);
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();
  }

  async function initializePage() {
    createMap();
    setupNavigation();
    setupAnimalDetailModal();
    setupFarmProfileModal();
    locateButton?.addEventListener("click", locateUser);
    distanceFilter?.addEventListener("change", renderFarmList);
    breedSelect?.addEventListener("change", (event) => void selectBreed(event.target.value));
    farmNameSearch?.addEventListener("input", () => {
      selectedFarmId = null;
      window.clearTimeout(farmNameSearchTimer);
      const query = String(farmNameSearch.value || "").trim();
      if (browseMode && !activeBreedId) {
        farmNameSearchTimer = window.setTimeout(() => void searchAllFarmsByName(), query ? 250 : 0);
        return;
      }
      renderFarmList();
    });
    await loadBreedOptions();
    if (browseMode && breedPickerHint) {
      breedPickerHint.textContent = activeBreedId
        ? `เลือกสายพันธุ์อื่นได้ทุกเมื่อ โดยไม่ผูกกับผลแบบประเมิน`
        : "เลือกได้ทุกสายพันธุ์ โดยไม่ผูกกับผลแบบประเมิน";
    }
    await loadFarms();
    if (initialFarmId) {
      window.setTimeout(() => {
        void focusInitialFarmFromQuery();
      }, 120);
    }
  }

  void initializePage();
})();
