"use strict";

const FARM_API_BASE = String(
  window.CATMATCH_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

let farmAnimals = [];
let farmBreeds = [];
let farmRequests = [];
let farmProfile = {};
let requestFilter = "all";
let editingAnimalId = null;
let animalImageData = "";
let existingAnimalImageUrl = "";
let farmProfileImageData = "";
let farmLocationMap = null;
let farmLocationMarker = null;
let pendingFarmLocation = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector),
];

function getFarmToken() {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of [
      "catmatch_farm_token",
      "farm_token",
      "farmToken",
    ]) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  }
  return "";
}

function getStoredFarmProfile() {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of ["catmatch_farm", "farm"]) {
      try {
        const raw = storage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch (_error) {}
    }
  }
  return {};
}

function saveFarmProfile(profile) {
  const value = JSON.stringify(profile || {});
  for (const storage of [sessionStorage, localStorage]) {
    try {
      storage.setItem("catmatch_farm", value);
      storage.setItem("farm", value);
    } catch (_error) {}
  }
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${getFarmToken()}`,
  };
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function breedDisplayName(name, species = "cat") {
  const english = String(name || "").trim();
  if (!english) return "";
  const rows = species === "dog"
    ? (window.DOGMATCH_DOG_BREEDS || [])
    : (window.CATMATCH_CAT_BREEDS || []);
  const matched = rows.find((row) => String(row?.breed_name || "").trim().toLowerCase() === english.toLowerCase());
  const thai = String(matched?.thai_name || "").trim();
  return thai && thai.toLowerCase() !== english.toLowerCase()
    ? `${thai} (${english})`
    : english;
}

function statusLabel(value) {
  if (value === "available") return "พร้อมติดต่อ";
  if (value === "adopted") return "ปิดการติดต่อ";
  if (value === "approved") return "อนุมัติแล้ว";
  if (value === "rejected") return "ปฏิเสธแล้ว";
  return "รอดำเนินการ";
}

function formatFarmAccountDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function resolveUploadedImageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("/uploads/")) return `${FARM_API_BASE}${url}`;
  return url;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("รูปภาพต้องเป็นไฟล์ JPG, PNG หรือ WEBP เท่านั้น");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("รูปภาพมีขนาดใหญ่เกิน 5 MB");
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${FARM_API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  const result = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    clearFarmSession();
    window.location.replace("./login.html?role=farm&return=farm");
    throw new Error(result.message || "กรุณาเข้าสู่ระบบใหม่");
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "ไม่สามารถทำรายการได้");
  }

  return result;
}

function showPanel(name) {
  $$('[data-panel-content]').forEach((panel) => {
    const active = panel.dataset.panelContent === name;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  $$(".farm-nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindNavigation() {
  $$('[data-panel]').forEach((button) => {
    button.addEventListener("click", () => showPanel(button.dataset.panel));
  });

  $$('[data-open-panel]').forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.openPanel === "add-animal") resetAnimalForm();
      showPanel(button.dataset.openPanel);
    });
  });
}

function renderAvatar(target, profile) {
  if (!target) return;
  const name = profile.farm_name || "ฟาร์มของคุณ";
  const imageUrl = resolveUploadedImageUrl(profile.profile_image);

  if (imageUrl) {
    target.innerHTML = `<img src="${escapeHTML(imageUrl)}" alt="รูปโปรไฟล์ ${escapeHTML(name)}">`;
    target.classList.add("has-image");
  } else {
    target.textContent = name.trim().charAt(0).toUpperCase() || "F";
    target.classList.remove("has-image");
  }
}

function applyProfile(profile = farmProfile) {
  const p = profile || {};
  const name = p.farm_name || "ฟาร์มของคุณ";

  [
    "farmSidebarName",
    "overviewFarmName",
    "profileFarmName",
    "welcomeFarmName",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = name;
  });

  renderAvatar($("#farmAvatar"), p);
  renderAvatar($("#profileAvatar"), p);
  renderAvatar($("#settingsFarmAvatar"), p);

  if ($("#farmSidebarEmail")) $("#farmSidebarEmail").textContent = p.email || "";
  if ($("#settingsFarmOwnerName")) $("#settingsFarmOwnerName").textContent = p.owner_name || "เจ้าของฟาร์ม";
  if ($("#settingsFarmEmail")) $("#settingsFarmEmail").textContent = p.email || "—";
  if ($("#settingsFarmName")) $("#settingsFarmName").textContent = name;
  if ($("#settingsFarmId")) $("#settingsFarmId").textContent = p.farm_id ? `#${p.farm_id}` : "—";
  if ($("#settingsFarmStatus")) $("#settingsFarmStatus").textContent = p.status === "approved" ? "✓ ฟาร์มที่ได้รับอนุมัติ" : statusLabel(p.status);
  if ($("#settingsFarmApprovedAt")) $("#settingsFarmApprovedAt").textContent = formatFarmAccountDate(p.approved_at || p.updated_at || p.created_at);
  if ($("#profileEmail")) $("#profileEmail").textContent = p.email || "—";
  if ($("#profileOwnerName")) {
    $("#profileOwnerName").textContent = p.owner_name
      ? `เจ้าของฟาร์ม: ${p.owner_name}`
      : "";
  }
  if ($("#profilePhone")) $("#profilePhone").textContent = p.phone || "—";
  if ($("#profileAddress")) $("#profileAddress").textContent = p.address || "—";
  if ($("#removeFarmProfileImage")) {
    $("#removeFarmProfileImage").hidden = !p.profile_image;
  }
  syncFarmLocationFromProfile(p);
}

async function loadFarmProfile() {
  try {
    const result = await api("/api/farm/profile");
    farmProfile = result.data || getStoredFarmProfile();
    saveFarmProfile(farmProfile);
  } catch (_error) {
    farmProfile = getStoredFarmProfile();
  }
  applyProfile();
}

function clearAnimalImage() {
  animalImageData = "";
  existingAnimalImageUrl = "";
  const input = $("#animalImageInput");
  const preview = $("#animalImagePreview");
  const previewShell = $("#animalImagePreviewShell");
  const empty = $("#animalImageEmpty");
  const actions = $("#animalImageSelectedActions");
  const zone = $("#animalImageUpload");
  if (input) input.value = "";
  if (preview) preview.src = "";
  if (previewShell) previewShell.hidden = true;
  if (empty) empty.hidden = false;
  if (actions) actions.hidden = true;
  zone?.classList.remove("has-image");
}

function showAnimalImage(url, isExisting = false) {
  const preview = $("#animalImagePreview");
  const previewShell = $("#animalImagePreviewShell");
  const empty = $("#animalImageEmpty");
  const actions = $("#animalImageSelectedActions");
  const zone = $("#animalImageUpload");
  if (!preview) return;
  preview.src = isExisting ? resolveUploadedImageUrl(url) : url;
  if (previewShell) previewShell.hidden = false;
  if (empty) empty.hidden = true;
  if (actions) actions.hidden = false;
  zone?.classList.add("has-image");
}

async function acceptAnimalImage(file) {
  const message = $("#animalFormMessage");
  try {
    validateImageFile(file);
    animalImageData = await readFileAsDataUrl(file);
    existingAnimalImageUrl = "";
    showAnimalImage(animalImageData);
    if (message) message.textContent = "";
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

function bindAnimalImageUpload() {
  const zone = $("#animalImageUpload");
  const input = $("#animalImageInput");
  const remove = $("#removeAnimalImage");
  const change = $("#changeAnimalImage");
  if (!zone || !input) return;

  zone.addEventListener("click", (event) => {
    if (zone.classList.contains("has-image")) return;
    if (event.target === remove || event.target === change) return;
    input.click();
  });
  zone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener("change", () => {
    void acceptAnimalImage(input.files?.[0]);
  });
  change?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  });
  remove?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearAnimalImage();
  });

  ["dragenter", "dragover"].forEach((type) => {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.remove("is-dragover");
    });
  });
  zone.addEventListener("drop", (event) => {
    void acceptAnimalImage(event.dataTransfer?.files?.[0]);
  });
}

function renderBreedOptions(species = "cat", selectedBreedId = "") {
  const select = $("#breedSelect");
  if (!select) return;
  const wanted = species === "dog" ? "dog" : "cat";
  const rows = farmBreeds.filter((breed) => String(breed.species || "cat").toLowerCase() === wanted);
  select.innerHTML = '<option value="">เลือกสายพันธุ์</option>';
  rows.forEach((breed) => {
    const option = document.createElement("option");
    option.value = String(breed.breed_id);
    option.textContent = breedDisplayName(breed.breed_name, wanted);
    option.dataset.species = wanted;
    if (String(breed.breed_id) === String(selectedBreedId || "")) option.selected = true;
    select.append(option);
  });
}

function resetAnimalForm() {
  const form = $("#animalForm");
  if (!form) return;
  editingAnimalId = null;
  form.reset();
  if (form.elements.species) form.elements.species.value = "cat";
  renderBreedOptions("cat");
  clearAnimalImage();
  $("#editingAnimalId").value = "";
  $("#animalFormTitle").textContent = "เพิ่มข้อมูลสัตว์";
  $("#animalFormEyebrow").textContent = "ADD AN ANIMAL";
  $("#animalFormDescription").textContent =
    "ข้อมูลนี้จะแสดงให้ผู้ใช้เห็นหลังบันทึก";
  $("#animalSubmitButton").textContent = "บันทึกข้อมูลสัตว์";
  const message = $("#animalFormMessage");
  if (message) {
    message.textContent = "";
    message.classList.remove("is-success");
  }
}

function startEditAnimal(id) {
  const animal = farmAnimals.find((item) => Number(item.animal_id) === Number(id));
  const form = $("#animalForm");
  if (!animal || !form) return;

  editingAnimalId = Number(animal.animal_id);
  $("#editingAnimalId").value = String(editingAnimalId);
  form.elements.animal_name.value = animal.animal_name || "";
  const animalSpecies = String(animal.species || "cat").toLowerCase() === "dog" ? "dog" : "cat";
  if (form.elements.species) form.elements.species.value = animalSpecies;
  renderBreedOptions(animalSpecies, animal.breed_id);
  form.elements.age_months.value = animal.age_months ?? "";
  form.elements.gender.value = animal.gender || "";
  form.elements.color.value = animal.color || "";
  form.elements.description.value = animal.description || "";

  animalImageData = "";
  existingAnimalImageUrl = animal.image_url || "";
  if (existingAnimalImageUrl) showAnimalImage(existingAnimalImageUrl, true);
  else clearAnimalImage();

  $("#animalFormTitle").textContent = `แก้ไขข้อมูล ${animal.animal_name}`;
  $("#animalFormEyebrow").textContent = "EDIT ANIMAL";
  $("#animalFormDescription").textContent =
    "แก้ไขรายละเอียดหรือเลือกรูปภาพใหม่ แล้วกดบันทึกการแก้ไข";
  $("#animalSubmitButton").textContent = "บันทึกการแก้ไข";
  $("#animalFormMessage").textContent = "";
  showPanel("add-animal");
}

async function loadAnimals() {
  const list = $("#animalList");
  if (list) list.innerHTML = '<div class="dashboard-empty">กำลังโหลดข้อมูลสัตว์...</div>';
  try {
    const result = await api("/api/farm/animals");
    farmAnimals = Array.isArray(result.data) ? result.data : [];
    renderAnimals();
    renderOverview();
    updateStatsAndSetup();
  } catch (error) {
    if (list) list.innerHTML = `<div class="dashboard-empty">${escapeHTML(error.message)}</div>`;
  }
}

async function loadRequests() {
  const list = $("#requestList");
  if (list) list.innerHTML = '<div class="dashboard-empty">กำลังโหลดคำขอ...</div>';
  try {
    const result = await api("/api/farm/adoptions");
    farmRequests = Array.isArray(result.data) ? result.data : [];
    renderRequests();
    renderOverview();
    updateStatsAndSetup();
  } catch (error) {
    if (list) list.innerHTML = `<div class="dashboard-empty">${escapeHTML(error.message)}</div>`;
  }
}

async function loadBreeds() {
  try {
    const [cats, dogs] = await Promise.all([
      fetch(`${FARM_API_BASE}/api/breeds?species=cat&limit=100`).then((r) => r.json()),
      fetch(`${FARM_API_BASE}/api/breeds?species=dog&limit=100`).then((r) => r.json()),
    ]);
    farmBreeds = [
      ...(Array.isArray(cats.data) ? cats.data : []),
      ...(Array.isArray(dogs.data) ? dogs.data : []),
    ];
    const species = $("#animalSpeciesSelect")?.value || "cat";
    renderBreedOptions(species);
  } catch (_error) {
    farmBreeds = [];
    renderBreedOptions("cat");
  }
}

function setSetupStep(element, complete, number, locked = false) {
  if (!element) return;
  element.classList.toggle("is-complete", complete);
  element.classList.toggle("is-locked", locked && !complete);
  element.disabled = locked && !complete;
  const numberElement = element.querySelector(".setup-step-number");
  if (numberElement) numberElement.textContent = complete ? "✓" : String(number);
  const action = element.querySelector("b");
  if (action) action.textContent = complete ? "เสร็จแล้ว" : number === 2 ? "เริ่มทำ →" : "เปิดดู →";
}

function updateStatsAndSetup() {
  const available = farmAnimals.filter((animal) => animal.status === "available").length;
  const hasAnimal = farmAnimals.length > 0;
  const completed = 1 + (hasAnimal ? 1 : 0);

  if ($("#totalAnimals")) $("#totalAnimals").textContent = farmAnimals.length.toLocaleString("th-TH");
  if ($("#availableAnimals")) $("#availableAnimals").textContent = available.toLocaleString("th-TH");
  if ($("#navAnimalCount")) $("#navAnimalCount").textContent = farmAnimals.length;

  setSetupStep($("#setupStep1"), true, 1);
  setSetupStep($("#setupStep2"), hasAnimal, 2);

  const progress = $("#setupProgressBar");
  const progressText = $("#setupProgressText");
  if (progress) progress.style.width = `${(completed / 2) * 100}%`;
  if (progressText) progressText.textContent = `${completed} / 2`;

  const guide = $("#farmGettingStarted");
  if (guide) {
    if (completed === 2) {
      guide.classList.add("is-finished");
      window.setTimeout(() => {
        guide.hidden = true;
      }, 450);
    } else {
      guide.hidden = false;
      guide.classList.remove("is-finished");
    }
  }
}

function animalCard(animal) {
  const imageUrl = resolveUploadedImageUrl(animal.image_url);
  const species = String(animal.species || "cat").toLowerCase() === "dog" ? "dog" : "cat";
  const speciesLabel = species === "dog" ? "สุนัข" : "แมว";
  const image = imageUrl
    ? `<img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(animal.animal_name)}">`
    : `<div class="no-image">${species === "dog" ? "🐶" : "🐱"}</div>`;

  return `
    <article class="animal-card" data-name="${escapeHTML(
      `${animal.animal_name} ${animal.breed_name}`.toLowerCase()
    )}" data-status="${escapeHTML(animal.status)}" data-species="${species}">
      <div class="animal-card-media">${image}</div>
      <div class="animal-card-body">
        <span class="animal-status ${escapeHTML(animal.status)}">${statusLabel(animal.status)}</span>
        <h3>${escapeHTML(animal.animal_name)}</h3>
        <div class="animal-meta">
          <span>${speciesLabel}</span>
          <span>${escapeHTML(breedDisplayName(animal.breed_name, species))}</span>
          ${animal.age_months != null ? `<span>${Number(animal.age_months)} เดือน</span>` : ""}
          ${animal.gender ? `<span>${animal.gender === "male" ? "เพศผู้" : "เพศเมีย"}</span>` : ""}
        </div>
        <div class="animal-card-actions primary-row">
          <button data-toggle-animal="${animal.animal_id}" data-next-status="${
            animal.status === "available" ? "adopted" : "available"
          }" type="button">${
            animal.status === "available"
              ? "ปิดการติดต่อ"
              : "เปิดให้ติดต่ออีกครั้ง"
          }</button>
        </div>
        <div class="animal-card-actions manage-row">
          <button class="edit-animal" data-edit-animal="${animal.animal_id}" type="button">แก้ไข</button>
          <button class="delete-animal" data-delete-animal="${animal.animal_id}" type="button">ลบ</button>
        </div>
      </div>
    </article>`;
}

function renderAnimals() {
  const list = $("#animalList");
  if (!list) return;
  const query = ($("#animalSearch")?.value || "").trim().toLowerCase();
  const status = $("#animalStatusFilter")?.value || "all";
  const species = $("#animalSpeciesFilter")?.value || "all";
  const items = farmAnimals.filter((animal) => {
    const animalSpecies = String(animal.species || "cat").toLowerCase();
    const searchable = `${animal.animal_name} ${animal.breed_name}`.toLowerCase();
    return (!query || searchable.includes(query)) &&
      (species === "all" || animalSpecies === species) &&
      (status === "all" || animal.status === status);
  });

  list.innerHTML = items.length
    ? items.map(animalCard).join("")
    : '<div class="dashboard-empty">ยังไม่พบสัตว์ตามเงื่อนไขนี้</div>';

  $$('[data-toggle-animal]', list).forEach((button) => {
    button.addEventListener("click", () => {
      void toggleAnimalStatus(button.dataset.toggleAnimal, button.dataset.nextStatus);
    });
  });
  $$('[data-edit-animal]', list).forEach((button) => {
    button.addEventListener("click", () => startEditAnimal(button.dataset.editAnimal));
  });
  $$('[data-delete-animal]', list).forEach((button) => {
    button.addEventListener("click", () => void deleteAnimal(button.dataset.deleteAnimal));
  });
}

function requestCard(request) {
  const imageUrl = resolveUploadedImageUrl(request.image_url);
  const image = imageUrl
    ? `<img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(request.animal_name)}">`
    : '<div class="request-image-placeholder">♡</div>';
  const actions = request.status === "pending"
    ? `<div class="request-actions"><button class="approve" data-request-action="approved" data-request-id="${request.request_id}" type="button">อนุมัติ</button><button class="reject" data-request-action="rejected" data-request-id="${request.request_id}" type="button">ปฏิเสธ</button></div>`
    : `<span class="animal-status ${escapeHTML(request.status)}">${statusLabel(request.status)}</span>`;

  return `<article class="request-card">${image}<div><h3>${escapeHTML(request.user_name)} สนใจ ${escapeHTML(request.animal_name)}</h3><p>${escapeHTML(request.breed_name)} · ${escapeHTML(request.user_email || "")} ${request.user_phone ? `· ${escapeHTML(request.user_phone)}` : ""}</p><small>ส่งคำขอ ${new Date(request.request_date).toLocaleString("th-TH")}</small></div>${actions}</article>`;
}

function renderRequests() {
  const list = $("#requestList");
  if (!list) return;
  const items = farmRequests.filter(
    (request) => requestFilter === "all" || request.status === requestFilter
  );
  list.innerHTML = items.length
    ? items.map(requestCard).join("")
    : '<div class="dashboard-empty">ยังไม่มีคำขอในสถานะนี้</div>';
  $$('[data-request-action]', list).forEach((button) => {
    button.addEventListener("click", () => {
      void updateRequest(button.dataset.requestId, button.dataset.requestAction);
    });
  });
}

function renderOverview() {
  const animals = $("#overviewAnimals");
  const requests = $("#overviewRequests");

  if (animals) {
    animals.innerHTML = farmAnimals.length
      ? farmAnimals.slice(0, 3).map((animal) => {
          const imageUrl = resolveUploadedImageUrl(animal.image_url);
          const species = String(animal.species || "cat").toLowerCase() === "dog" ? "dog" : "cat";
          return `<div class="mini-row">${imageUrl ? `<img src="${escapeHTML(imageUrl)}" alt="">` : `<span class="mini-placeholder">${species === "dog" ? "🐶" : "🐱"}</span>`}<div><strong>${escapeHTML(animal.animal_name)}</strong><small>${species === "dog" ? "สุนัข" : "แมว"} · ${escapeHTML(breedDisplayName(animal.breed_name, species))} · ${statusLabel(animal.status)}</small></div></div>`;
        }).join("")
      : '<div class="empty-mini">ยังไม่มีข้อมูลสัตว์ กด “เพิ่มสัตว์ตัวแรก” เพื่อเริ่มต้น</div>';
  }

  if (requests) {
    const pending = farmRequests.filter((request) => request.status === "pending").slice(0, 3);
    requests.innerHTML = pending.length
      ? pending.map((request) => `<div class="mini-row"><span class="mini-placeholder">♡</span><div><strong>${escapeHTML(request.user_name)}</strong><small>สนใจ ${escapeHTML(request.animal_name)}</small></div></div>`).join("")
      : '<div class="empty-mini">ยังไม่มีคำขอใหม่</div>';
  }
}

async function toggleAnimalStatus(id, status) {
  try {
    await api(`/api/farm/animals/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadAnimals();
  } catch (error) {
    await window.CatMatchDialog.alert(error.message, { title: "ไม่สามารถดำเนินการได้", icon: "!" });
  }
}

async function deleteAnimal(id) {
  const animal = farmAnimals.find((item) => Number(item.animal_id) === Number(id));
  if (!animal) return;
  const confirmed = await window.CatMatchDialog.confirm(`ต้องการลบข้อมูล “${animal.animal_name}” ออกจากฟาร์มหรือไม่?`, { title: "ยืนยันการลบข้อมูลสัตว์", confirmText: "ลบข้อมูล", danger: true, icon: "×" });
  if (!confirmed) return;

  try {
    await api(`/api/farm/animals/${id}`, { method: "DELETE" });
    await loadAnimals();
  } catch (error) {
    await window.CatMatchDialog.alert(error.message, { title: "ไม่สามารถดำเนินการได้", icon: "!" });
  }
}

async function updateRequest(id, status) {
  const word = status === "approved" ? "อนุมัติ" : "ปฏิเสธ";
  const confirmed = await window.CatMatchDialog.confirm(`ต้องการ${word}คำขออุปการะนี้หรือไม่?`, { title: `${word}คำขออุปการะ`, confirmText: word, danger: status !== "approved", icon: status === "approved" ? "✓" : "×" });
  if (!confirmed) return;
  try {
    await api(`/api/farm/adoptions/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await Promise.all([loadRequests(), loadAnimals()]);
  } catch (error) {
    await window.CatMatchDialog.alert(error.message, { title: "ไม่สามารถดำเนินการได้", icon: "!" });
  }
}

function bindAnimalForm() {
  const form = $("#animalForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("#animalFormMessage");

    if (!animalImageData && !existingAnimalImageUrl) {
      message.textContent = "กรุณาเลือกรูปภาพสัตว์ก่อนบันทึก";
      $("#animalImageUpload")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (!["image_file", "animal_id"].includes(key)) data[key] = value;
    }
    data.breed_id = Number(data.breed_id);
    data.age_months = data.age_months === "" ? null : Number(data.age_months);
    data.status = farmAnimals.find((item) => Number(item.animal_id) === editingAnimalId)?.status || "available";
    if (animalImageData) data.image_data = animalImageData;
    else if (existingAnimalImageUrl) data.image_url = existingAnimalImageUrl;

    const isEditing = Number.isInteger(editingAnimalId);
    const endpoint = isEditing
      ? `/api/farm/animals/${editingAnimalId}`
      : "/api/farm/animals";

    try {
      message.textContent = isEditing
        ? "กำลังบันทึกการแก้ไข..."
        : "กำลังอัปโหลดรูปและบันทึกข้อมูล...";
      message.classList.remove("is-success");
      await api(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      message.textContent = isEditing
        ? "แก้ไขข้อมูลสัตว์สำเร็จ"
        : "เพิ่มข้อมูลสัตว์และรูปภาพสำเร็จ";
      message.classList.add("is-success");
      await loadAnimals();
      window.setTimeout(() => {
        resetAnimalForm();
        showPanel("animals");
      }, 450);
    } catch (error) {
      message.textContent = error.message;
    }
  });

  $("#animalCancelButton")?.addEventListener("click", resetAnimalForm);
}

function bindFilters() {
  $("#animalSearch")?.addEventListener("input", renderAnimals);
  $("#animalSpeciesFilter")?.addEventListener("change", renderAnimals);
  $("#animalStatusFilter")?.addEventListener("change", renderAnimals);
  $("#animalSpeciesSelect")?.addEventListener("change", (event) => {
    renderBreedOptions(event.target.value);
  });
  $$('[data-request-filter]').forEach((button) => {
    button.addEventListener("click", () => {
      requestFilter = button.dataset.requestFilter;
      $$('[data-request-filter]').forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderRequests();
    });
  });
  $("#refreshRequests")?.addEventListener("click", loadRequests);
}

function bindFarmProfileImage() {
  const choose = $("#chooseFarmProfileImage");
  const select = $("#selectFarmProfileImage");
  const input = $("#farmProfileImageInput");
  const save = $("#saveFarmProfileImage");
  const remove = $("#removeFarmProfileImage");
  const message = $("#farmProfileImageMessage");
  const editor = $("#farmProfileImageEditor");
  const closeEditor = $("#closeFarmProfileImageEditor");
  const viewButton = $("#viewFarmProfileImage");
  const viewer = $("#farmProfileImageViewer");
  const viewerImage = $("#farmProfileImageViewerImage");
  const closeViewer = $("#closeFarmProfileImageViewer");
  const closeViewerBackdrop = $("#closeFarmProfileImageViewerBackdrop");

  const openEditor = () => {
    if (!editor) return;
    editor.hidden = false;
    editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const closeImageEditor = ({ restore = true } = {}) => {
    if (editor) editor.hidden = true;
    if (restore) {
      farmProfileImageData = "";
      if (input) input.value = "";
      if (save) save.disabled = true;
      if (message) {
        message.textContent = "";
        message.classList.remove("is-success");
      }
      applyProfile();
    }
  };

  const openViewer = () => {
    const imageUrl = farmProfileImageData || resolveUploadedImageUrl(farmProfile?.profile_image);
    if (!imageUrl) {
      openEditor();
      input?.click();
      return;
    }
    if (viewerImage) viewerImage.src = imageUrl;
    if (viewer) viewer.hidden = false;
    document.body.style.overflow = "hidden";
  };

  const closeImageViewer = () => {
    if (viewer) viewer.hidden = true;
    if (viewerImage) viewerImage.src = "";
    document.body.style.overflow = "";
  };

  choose?.addEventListener("click", openEditor);
  select?.addEventListener("click", () => input?.click());
  closeEditor?.addEventListener("click", () => closeImageEditor());
  viewButton?.addEventListener("click", openViewer);
  closeViewer?.addEventListener("click", closeImageViewer);
  closeViewerBackdrop?.addEventListener("click", closeImageViewer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && viewer && !viewer.hidden) closeImageViewer();
  });

  input?.addEventListener("change", async () => {
    try {
      const file = input.files?.[0];
      validateImageFile(file);
      farmProfileImageData = await readFileAsDataUrl(file);
      renderAvatar($("#profileAvatar"), {
        ...farmProfile,
        profile_image: farmProfileImageData,
      });
      if (save) save.disabled = false;
      if (message) {
        message.textContent = "เลือกรูปแล้ว กดบันทึกรูปโปรไฟล์";
        message.classList.remove("is-success");
      }
    } catch (error) {
      farmProfileImageData = "";
      if (save) save.disabled = true;
      if (message) message.textContent = error.message;
    }
  });

  save?.addEventListener("click", async () => {
    if (!farmProfileImageData) return;
    try {
      save.disabled = true;
      if (message) message.textContent = "กำลังบันทึกรูปโปรไฟล์...";
      const result = await api("/api/farm/profile/image", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data: farmProfileImageData }),
      });
      farmProfile = result.data || farmProfile;
      farmProfileImageData = "";
      saveFarmProfile(farmProfile);
      applyProfile();
      if (message) {
        message.textContent = "บันทึกรูปโปรไฟล์ฟาร์มสำเร็จ";
        message.classList.add("is-success");
      }
      window.setTimeout(() => closeImageEditor({ restore: false }), 650);
    } catch (error) {
      save.disabled = false;
      if (message) message.textContent = error.message;
    }
  });

  remove?.addEventListener("click", async () => {
    const confirmed = await window.CatMatchDialog.confirm("ต้องการลบรูปโปรไฟล์ฟาร์มหรือไม่?", { title: "ลบรูปโปรไฟล์", confirmText: "ลบรูป", danger: true, icon: "×" });
    if (!confirmed) return;
    try {
      const result = await api("/api/farm/profile/image", { method: "DELETE" });
      farmProfile = result.data || { ...farmProfile, profile_image: null };
      farmProfileImageData = "";
      if (input) input.value = "";
      saveFarmProfile(farmProfile);
      applyProfile();
      if (save) save.disabled = true;
      if (message) {
        message.textContent = "ลบรูปโปรไฟล์แล้ว";
        message.classList.add("is-success");
      }
      window.setTimeout(() => closeImageEditor({ restore: false }), 500);
    } catch (error) {
      if (message) message.textContent = error.message;
    }
  });
}


function isThailandCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  const geometry = window.CatMatchThailandMap?.GEOJSON?.geometry;
  const rings = geometry?.type === "Polygon"
    ? geometry.coordinates
    : geometry?.type === "MultiPolygon"
      ? geometry.coordinates.flat()
      : [];

  if (!rings.length) {
    return lat >= 5.4 && lat <= 20.7 && lng >= 97.2 && lng <= 105.8;
  }

  return rings.some((ring) => {
    let inside = false;
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
      const [x1, y1] = ring[index];
      const [x2, y2] = ring[previous];
      const crosses = (y1 > lat) !== (y2 > lat) &&
        lng < ((x2 - x1) * (lat - y1)) / ((y2 - y1) || Number.EPSILON) + x1;
      if (crosses) inside = !inside;
    }
    return inside;
  });
}

function setDashboardFarmLocationStatus(text, type = "") {
  const element = $("#dashboardFarmLocationStatus");
  if (!element) return;
  element.textContent = text;
  element.className = type ? `is-${type}` : "";
}

function createFarmLocationIcon() {
  if (!window.L) return undefined;
  return L.divIcon({
    className: "farm-location-pin-shell",
    html: '<span class="farm-location-pin"><span></span></span>',
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    tooltipAnchor: [0, -34],
  });
}

function updateDashboardFarmLocation(latitude, longitude, focus = false) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!isThailandCoordinate(lat, lng)) {
    setDashboardFarmLocationStatus("กรุณาปักหมุดภายในประเทศไทย", "error");
    return;
  }
  pendingFarmLocation = { latitude: lat, longitude: lng };
  if ($("#dashboardFarmLatitude")) $("#dashboardFarmLatitude").value = lat.toFixed(6);
  if ($("#dashboardFarmLongitude")) $("#dashboardFarmLongitude").value = lng.toFixed(6);
  if (farmLocationMap) {
    if (!farmLocationMarker) {
      farmLocationMarker = L.marker([lat, lng], { draggable: true, icon: createFarmLocationIcon() }).addTo(farmLocationMap);
      farmLocationMarker.bindTooltip("ตำแหน่งฟาร์มของคุณ", { direction: "top" });
      farmLocationMarker.on("dragend", () => {
        const point = farmLocationMarker.getLatLng();
        updateDashboardFarmLocation(point.lat, point.lng, false);
      });
    } else {
      farmLocationMarker.setLatLng([lat, lng]);
    }
    farmLocationMarker.openTooltip();
    if (focus) farmLocationMap.flyTo([lat, lng], 16, { animate: true, duration: 1 });
  }
  setDashboardFarmLocationStatus(`ตำแหน่งที่เลือก ${lat.toFixed(5)}, ${lng.toFixed(5)}`, "success");
  if ($("#saveDashboardFarmLocation")) $("#saveDashboardFarmLocation").disabled = false;
}

function syncFarmLocationFromProfile(profile = farmProfile) {
  const lat = Number(profile?.latitude);
  const lng = Number(profile?.longitude);
  if (isThailandCoordinate(lat, lng)) {
    updateDashboardFarmLocation(lat, lng, false);
    setDashboardFarmLocationStatus("ตำแหน่งฟาร์มที่บันทึกไว้", "success");
    if ($("#saveDashboardFarmLocation")) $("#saveDashboardFarmLocation").disabled = true;
  }
}

function bindFarmLocationEditor() {
  const mapElement = $("#dashboardFarmLocationMap");
  if (!mapElement || !window.L || !window.CatMatchThailandMap) {
    if (mapElement) {
      mapElement.innerHTML = '<div class="dashboard-map-error">ไม่สามารถโหลดแผนที่ประเทศไทยได้ กรุณารีเฟรชหน้าอีกครั้ง</div>';
    }
    return;
  }

  const thailandBounds = window.CatMatchThailandMap.BOUNDS;
  farmLocationMap = L.map(mapElement, {
    zoomControl: true,
    scrollWheelZoom: true,
    minZoom: 5,
    maxZoom: 18,
    maxBounds: thailandBounds,
    maxBoundsViscosity: 1,
  });

  window.CatMatchThailandMap.addThailandLayer(farmLocationMap, {
    minZoom: 5,
    maxZoom: 18,
    borderColor: "#73aeda",
    borderWeight: 2,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });

  farmLocationMap.fitBounds(thailandBounds, { padding: [18, 18], animate: false });
  farmLocationMap.on("click", (event) => updateDashboardFarmLocation(event.latlng.lat, event.latlng.lng));
  syncFarmLocationFromProfile();
  window.setTimeout(() => farmLocationMap?.invalidateSize(), 150);
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (!farmLocationMap || mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) return;
      farmLocationMap.invalidateSize();
      if (farmLocationMarker) farmLocationMap.panTo(farmLocationMarker.getLatLng());
    }).observe(mapElement);
  }
  document.querySelector('[data-panel="profile"]')?.addEventListener("click", () => {
    window.setTimeout(() => farmLocationMap?.invalidateSize(), 120);
  });

  $("#useDashboardFarmLocation")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setDashboardFarmLocationStatus("เบราว์เซอร์นี้ไม่รองรับตำแหน่ง", "error");
      return;
    }
    const button = $("#useDashboardFarmLocation");
    button.disabled = true;
    button.textContent = "กำลังค้นหาตำแหน่ง...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        button.disabled = false;
        button.textContent = "✓ ใช้ตำแหน่งปัจจุบันแล้ว";
        updateDashboardFarmLocation(position.coords.latitude, position.coords.longitude, true);
      },
      () => {
        button.disabled = false;
        button.textContent = "⌖ ลองใช้ตำแหน่งอีกครั้ง";
        setDashboardFarmLocationStatus("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาคลิกบนแผนที่", "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  });

  $("#saveDashboardFarmLocation")?.addEventListener("click", async () => {
    if (!pendingFarmLocation) return;
    const button = $("#saveDashboardFarmLocation");
    button.disabled = true;
    button.textContent = "กำลังบันทึก...";
    try {
      const result = await api("/api/farm/profile/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingFarmLocation),
      });
      farmProfile = result.data || { ...farmProfile, ...pendingFarmLocation };
      saveFarmProfile(farmProfile);
      applyProfile();
      setDashboardFarmLocationStatus("บันทึกตำแหน่งฟาร์มแล้ว ผู้ใช้จะเห็นหมุดบนแผนที่", "success");
    } catch (error) {
      button.disabled = false;
      setDashboardFarmLocationStatus(error.message, "error");
    } finally {
      button.textContent = "บันทึกตำแหน่งฟาร์ม";
    }
  });
}

function bindLogout() {
  const logout = () => {
    clearFarmSession();
    window.location.replace("./login.html?role=farm&return=farm");
  };
  $("#farmLogout")?.addEventListener("click", logout);
  $("#farmSettingsLogout")?.addEventListener("click", logout);
}

function showWelcome() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("welcome") !== "approved") return;
  const modal = $("#farmWelcomeModal");
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = "";
    history.replaceState({}, "", location.pathname);
  };
  $("#startFarmDashboard")?.addEventListener("click", close);
  $(".farm-welcome-backdrop")?.addEventListener("click", close);
}

async function initializeFarmDashboard() {
  if (!getFarmToken()) {
    window.location.replace("./login.html?role=farm&return=farm");
    return;
  }

  farmProfile = getStoredFarmProfile();
  applyProfile();
  bindNavigation();
  bindAnimalImageUpload();
  bindAnimalForm();
  bindFilters();
  bindFarmProfileImage();
  bindFarmLocationEditor();
  bindLogout();
  showWelcome();

  const requestedPanel = new URLSearchParams(window.location.search).get("panel");
  if (["overview", "animals", "add-animal", "chat", "profile", "settings"].includes(requestedPanel)) {
    showPanel(requestedPanel);
  }

  await loadFarmProfile();
  await loadBreeds();
  await loadAnimals();
}

document.addEventListener("DOMContentLoaded", initializeFarmDashboard);
