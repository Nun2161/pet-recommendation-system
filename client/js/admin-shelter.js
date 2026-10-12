"use strict";

(() => {
  const API_BASE = String(window.CATMATCH_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
  const API_ROOT = `${API_BASE}/admin`;
  const TOKEN_KEYS = [
    "catmatch_admin_token",
    "admin_token",
    "adminToken",
    "catmatch_token",
    "token",
  ];

  const CENTER_VERIFICATION_LABELS = {
    pending: "รอตรวจสอบ",
    verified: "ตรวจสอบแล้ว",
    rejected: "ไม่ผ่านการตรวจสอบ",
  };
  const CENTER_STATUS_LABELS = { active: "เปิดใช้งาน", inactive: "ปิดใช้งาน" };
  const ANIMAL_STATUS_LABELS = {
    available: "กำลังรอบ้าน",
    contacting: "อยู่ระหว่างพูดคุย",
    visit_scheduled: "นัดเยี่ยมแล้ว",
    reserved: "อยู่ระหว่างพิจารณา",
    adopted: "ได้บ้านแล้ว",
    unavailable: "ปิดประกาศ",
  };
  const GENDER_LABELS = { male: "เพศผู้", female: "เพศเมีย", unknown: "ไม่ระบุเพศ" };
  const SIZE_LABELS = { small: "ขนาดเล็ก", medium: "ขนาดกลาง", large: "ขนาดใหญ่" };
  const THAI_PROVINCES = [
    "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
  ];

  let shelters = [];
  let animals = [];
  let activeAnimalSpecies = "dog";
  let shelterSearchTimer = null;
  let animalSearchTimer = null;

  const $ = (id) => document.getElementById(id);
  const elements = {
    message: $("adminMessage"),
    refreshShelters: $("refreshShelters"),
    addShelter: $("addShelter"),
    shelterSearch: $("shelterSearch"),
    shelterVerificationFilter: $("shelterVerificationFilter"),
    shelterStatusFilter: $("shelterStatusFilter"),
    shelterResultCount: $("shelterResultCount"),
    shelterSkeleton: $("shelterSkeleton"),
    shelterEmpty: $("shelterEmpty"),
    shelterList: $("shelterList"),
    summaryShelterTotal: $("summaryShelterTotal"),
    summaryShelterVerified: $("summaryShelterVerified"),
    summaryAnimalAvailable: $("summaryAnimalAvailable"),

    shelterDialog: $("shelterEditorDialog"),
    shelterDialogTitle: $("shelterDialogTitle"),
    shelterDialogClose: $("shelterDialogClose"),
    shelterCancel: $("shelterCancel"),
    shelterForm: $("shelterForm"),
    shelterId: $("shelterId"),
    shelterName: $("shelterName"),
    shelterProvince: $("shelterProvince"),
    shelterPhone: $("shelterPhone"),
    shelterEmail: $("shelterEmail"),
    shelterFacebook: $("shelterFacebook"),
    shelterLine: $("shelterLine"),
    shelterContactHours: $("shelterContactHours"),
    shelterVerification: $("shelterVerification"),
    shelterEditorStatus: $("shelterEditorStatus"),
    shelterAddress: $("shelterAddress"),
    shelterDescription: $("shelterDescription"),
    shelterSave: $("shelterSave"),

    refreshAnimals: $("refreshShelterAnimals"),
    addAnimal: $("addShelterAnimal"),
    animalSpeciesButtons: Array.from(document.querySelectorAll("[data-shelter-animal-species]")),
    animalSearch: $("shelterAnimalSearch"),
    animalStatus: $("shelterAnimalStatus"),
    animalPanelKicker: $("shelterAnimalPanelKicker"),
    animalPanelTitle: $("shelterAnimalPanelTitle"),
    animalResultCount: $("shelterAnimalResultCount"),
    animalSkeleton: $("shelterAnimalSkeleton"),
    animalEmpty: $("shelterAnimalEmpty"),
    animalList: $("shelterAnimalList"),

    animalDialog: $("shelterAnimalEditorDialog"),
    animalDialogTitle: $("shelterAnimalDialogTitle"),
    animalDialogClose: $("shelterAnimalDialogClose"),
    animalCancel: $("shelterAnimalCancel"),
    animalForm: $("shelterAnimalForm"),
    animalId: $("shelterAnimalId"),
    animalShelterId: $("animalShelterId"),
    animalSpecies: $("animalSpecies"),
    animalName: $("animalName"),
    animalGender: $("animalGender"),
    animalAgeValue: $("animalAgeValue"),
    animalAgeUnit: $("animalAgeUnit"),
    animalSize: $("animalSize"),
    animalWeight: $("animalWeight"),
    animalProvince: $("animalProvince"),
    provinceOptions: $("thaiProvinceOptions"),
    animalImageFile: $("animalImageFile"),
    animalCurrentImageUrl: $("animalCurrentImageUrl"),
    animalImagePreview: $("animalImagePreview"),
    animalImagePlaceholder: $("animalImagePlaceholder"),
    animalImageName: $("animalImageName"),
    animalTraits: $("animalTraits"),
    animalVaccination: $("animalVaccination"),
    animalSterilization: $("animalSterilization"),
    animalHealth: $("animalHealth"),
    animalPersonality: $("animalPersonality"),
    animalStory: $("animalStory"),
    animalSuitableHome: $("animalSuitableHome"),
    animalAdoptionStatus: $("animalAdoptionStatus"),
    animalUrgent: $("animalUrgent"),
    animalSave: $("shelterAnimalSave"),
  };

  function getToken() {
    for (const key of TOKEN_KEYS) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (value) return value;
    }
    return "";
  }

  function resolveImageUrl(value) {
    const imageUrl = String(value || "").trim();
    if (!imageUrl) return "";
    if (/^(?:data:|blob:|https?:\/\/|\/\/)/i.test(imageUrl)) return imageUrl;

    try {
      const apiUrl = new URL(API_BASE, window.location.href);
      return new URL(imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`, apiUrl.origin).href;
    } catch (_) {
      return imageUrl;
    }
  }

  function populateProvinceOptions() {
    if (!elements.provinceOptions || elements.provinceOptions.childElementCount) return;
    elements.provinceOptions.innerHTML = THAI_PROVINCES
      .map((province) => `<option value="${escapeHTML(province)}"></option>`)
      .join("");
  }

  function parseAge(value) {
    const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*(เดือน|ปี)/);
    return {
      value: match ? match[1] : "",
      unit: match && match[2] === "ปี" ? "year" : "month",
    };
  }

  function formatAge() {
    const value = String(elements.animalAgeValue?.value || "").trim();
    if (!value) return "";
    return `${value} ${elements.animalAgeUnit?.value === "year" ? "ปี" : "เดือน"}`;
  }

  function parseWeight(value) {
    const match = String(value || "").replace(",", ".").match(/\d+(?:\.\d+)?/);
    return match ? match[0] : "";
  }

  function formatWeight() {
    const value = String(elements.animalWeight?.value || "").trim();
    return value ? `${value} กก.` : "";
  }

  function setSelectValue(select, value) {
    if (!select) return;
    select.querySelectorAll('option[data-existing-value="true"]').forEach((option) => option.remove());
    const normalized = String(value || "").trim();
    if (!normalized) {
      select.value = "";
      return;
    }
    if (!Array.from(select.options).some((option) => option.value === normalized)) {
      const option = document.createElement("option");
      option.value = normalized;
      option.textContent = normalized;
      option.dataset.existingValue = "true";
      select.append(option);
    }
    select.value = normalized;
  }

  function updateAnimalImagePreview(source = "", label = "") {
    const image = elements.animalImagePreview;
    const placeholder = elements.animalImagePlaceholder;
    if (!image || !placeholder) return;
    image.onerror = null;
    const resolved = source ? resolveImageUrl(source) : "";
    if (!resolved) {
      image.hidden = true;
      image.removeAttribute("src");
      image.removeAttribute("tabindex");
      image.removeAttribute("role");
      image.removeAttribute("title");
      placeholder.hidden = false;
      if (elements.animalImageName) elements.animalImageName.textContent = "ยังไม่ได้เลือกรูป";
      return;
    }
    image.src = resolved;
    image.hidden = false;
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.title = "คลิกเพื่อดูรูปขนาดใหญ่";
    placeholder.hidden = true;
    if (elements.animalImageName) elements.animalImageName.textContent = label || "คลิกที่รูปเพื่อดูรูปขนาดใหญ่";
    image.onerror = () => {
      image.hidden = true;
      image.removeAttribute("tabindex");
      image.removeAttribute("role");
      image.removeAttribute("title");
      placeholder.hidden = false;
      if (elements.animalImageName) elements.animalImageName.textContent = "ไม่สามารถแสดงรูปเดิมได้ กรุณาเลือกรูปใหม่";
    };
  }


  function ensureAnimalImageViewer() {
    let dialog = document.getElementById("adminShelterImageViewer");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "adminShelterImageViewer";
    dialog.className = "admin-shelter-image-viewer";
    dialog.setAttribute("aria-label", "ดูรูปสัตว์ขนาดใหญ่");
    dialog.innerHTML = `
      <div class="admin-shelter-image-viewer__panel">
        <button class="admin-shelter-image-viewer__close" type="button" aria-label="ปิดรูป">×</button>
        <img class="admin-shelter-image-viewer__image" alt="รูปสัตว์ขนาดใหญ่">
        <p class="admin-shelter-image-viewer__hint">คลิกด้านนอกหรือกด × เพื่อปิด</p>
      </div>`;
    document.body.append(dialog);

    const closeButton = dialog.querySelector(".admin-shelter-image-viewer__close");
    closeButton?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      const viewerImage = dialog.querySelector(".admin-shelter-image-viewer__image");
      viewerImage?.removeAttribute("src");
    });
    return dialog;
  }

  function openAnimalImageViewer(event) {
    const image = elements.animalImagePreview;
    if (!image || image.hidden || !image.currentSrc && !image.src) return;
    event?.preventDefault();
    event?.stopPropagation();

    const dialog = ensureAnimalImageViewer();
    const viewerImage = dialog.querySelector(".admin-shelter-image-viewer__image");
    if (!viewerImage) return;
    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.alt || "รูปสัตว์ขนาดใหญ่";

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function previewSelectedAnimalImage() {
    const file = elements.animalImageFile?.files?.[0];
    if (!file) {
      updateAnimalImagePreview(elements.animalCurrentImageUrl?.value || "");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showMessage("รูปต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
      elements.animalImageFile.value = "";
      updateAnimalImagePreview(elements.animalCurrentImageUrl?.value || "");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage("รูปมีขนาดใหญ่เกิน 5 MB");
      elements.animalImageFile.value = "";
      updateAnimalImagePreview(elements.animalCurrentImageUrl?.value || "");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => updateAnimalImagePreview(String(reader.result || ""), file.name));
    reader.addEventListener("error", () => showMessage("ไม่สามารถแสดงตัวอย่างรูปได้"));
    reader.readAsDataURL(file);
  }

  function showMessage(message = "", type = "error") {
    if (!elements.message) return;
    elements.message.textContent = message;
    elements.message.hidden = !message;
    elements.message.classList.toggle("is-success", type === "success");
  }

  function setLoading(button, loading, loadingText = "กำลังบันทึก...") {
    if (!button) return;
    if (loading) {
      button.dataset.beforeLoading = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
      return;
    }
    button.textContent = button.dataset.beforeLoading || button.textContent;
    button.disabled = false;
    delete button.dataset.beforeLoading;
  }

  async function api(path, options = {}) {
    const token = getToken();
    if (!token) {
      window.location.replace("./login.html");
      throw new Error("กรุณาเข้าสู่ระบบผู้ดูแลระบบ");
    }
    const response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      window.location.replace("./login.html");
      throw new Error(data.message || "เซสชันผู้ดูแลหมดอายุ");
    }
    if (!response.ok || data.success === false) {
      throw new Error(data.message || "ไม่สามารถดำเนินการได้");
    }
    return data;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function badge(text, className = "") {
    return `<span class="admin-shelter-badge ${className}">${escapeHTML(text)}</span>`;
  }

  function formatDate(value) {
    if (!value) return "ไม่ระบุ";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ไม่ระบุ";
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function openDialog(dialog, open) {
    if (!dialog) return;
    if (open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  async function confirmAction(message, title = "ยืนยันการเปลี่ยนแปลง") {
    if (window.CatMatchDialog?.confirm) {
      return window.CatMatchDialog.confirm(message, { title, confirmText: "ยืนยัน" });
    }
    return window.confirm(message);
  }

  async function loadSummary() {
    try {
      const data = await api("/shelter-summary");
      const summary = data.data || {};
      if (elements.summaryShelterTotal) elements.summaryShelterTotal.textContent = summary.total_centers || 0;
      if (elements.summaryShelterVerified) elements.summaryShelterVerified.textContent = summary.verified_centers || 0;
      if (elements.summaryAnimalAvailable) elements.summaryAnimalAvailable.textContent = summary.available_animals || 0;
    } catch (error) {
      console.warn(error.message);
    }
  }

  function renderShelters() {
    if (!elements.shelterList || !elements.shelterEmpty) return;
    elements.shelterResultCount.textContent = `${shelters.length} ศูนย์`;
    elements.shelterEmpty.hidden = shelters.length > 0;
    elements.shelterList.innerHTML = shelters.map((item) => {
      const verifiedClass = item.verification_status === "verified"
        ? "is-verified"
        : item.verification_status === "rejected" ? "is-rejected" : "is-pending";
      return `
        <article class="admin-shelter-card">
          <div class="admin-shelter-card__main">
            <div class="admin-shelter-card__title">
              <div class="admin-shelter-card__icon" aria-hidden="true">⌂</div>
              <div>
                <div class="admin-shelter-card__badges">
                  ${badge(CENTER_VERIFICATION_LABELS[item.verification_status] || item.verification_status, verifiedClass)}
                  ${badge(CENTER_STATUS_LABELS[item.status] || item.status, item.status === "active" ? "is-active" : "is-inactive")}
                </div>
                <h3>${escapeHTML(item.shelter_name)}</h3>
                <p>${escapeHTML(item.province || "ไม่ระบุจังหวัด")} · ${escapeHTML(item.phone || "ยังไม่มีเบอร์โทร")}</p>
              </div>
            </div>
            <div class="admin-shelter-card__details">
              <div><span>อีเมล</span><strong>${escapeHTML(item.email || "ไม่ระบุ")}</strong></div>
              <div><span>เวลาติดต่อ</span><strong>${escapeHTML(item.contact_hours || "ไม่ระบุ")}</strong></div>
              <div><span>อัปเดตล่าสุด</span><strong>${escapeHTML(formatDate(item.updated_at))}</strong></div>
            </div>
          </div>
          <div class="admin-shelter-card__actions">
            <button class="button button-secondary button-small" type="button" data-edit-shelter="${item.shelter_id}">แก้ไขข้อมูล</button>
            <button class="button button-primary button-small" type="button" data-toggle-shelter="${item.shelter_id}">${item.status === "active" ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
          </div>
        </article>`;
    }).join("");
  }

  async function loadShelters() {
    showMessage();
    if (elements.shelterSkeleton) elements.shelterSkeleton.hidden = false;
    if (elements.shelterEmpty) elements.shelterEmpty.hidden = true;
    if (elements.refreshShelters) elements.refreshShelters.disabled = true;
    try {
      const search = encodeURIComponent(elements.shelterSearch?.value.trim() || "");
      const verification = encodeURIComponent(elements.shelterVerificationFilter?.value || "all");
      const status = encodeURIComponent(elements.shelterStatusFilter?.value || "all");
      const data = await api(`/shelters?search=${search}&verification=${verification}&status=${status}`);
      shelters = Array.isArray(data.data) ? data.data : [];
      renderShelters();
      populateShelterOptions();
      await loadSummary();
    } catch (error) {
      showMessage(error instanceof TypeError ? "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาเปิด npm run dev" : error.message);
    } finally {
      if (elements.shelterSkeleton) elements.shelterSkeleton.hidden = true;
      if (elements.refreshShelters) elements.refreshShelters.disabled = false;
    }
  }

  function openShelterEditor(item = null) {
    elements.shelterForm?.reset();
    elements.shelterId.value = item?.shelter_id || "";
    elements.shelterName.value = item?.shelter_name || "";
    elements.shelterProvince.value = item?.province || "";
    elements.shelterPhone.value = item?.phone || "";
    elements.shelterEmail.value = item?.email || "";
    elements.shelterFacebook.value = item?.facebook_url || "";
    elements.shelterLine.value = item?.line_contact || "";
    elements.shelterContactHours.value = item?.contact_hours || "";
    elements.shelterVerification.value = item?.verification_status || "pending";
    elements.shelterEditorStatus.value = item?.status || "active";
    elements.shelterAddress.value = item?.address || "";
    elements.shelterDescription.value = item?.description || "";
    elements.shelterDialogTitle.textContent = item ? `แก้ไข ${item.shelter_name}` : "เพิ่มศูนย์พักพิง";
    openDialog(elements.shelterDialog, true);
    setTimeout(() => elements.shelterName?.focus(), 60);
  }

  function shelterPayload() {
    return {
      shelter_name: elements.shelterName.value.trim(),
      province: elements.shelterProvince.value.trim(),
      phone: elements.shelterPhone.value.trim(),
      email: elements.shelterEmail.value.trim(),
      facebook_url: elements.shelterFacebook.value.trim(),
      line_contact: elements.shelterLine.value.trim(),
      contact_hours: elements.shelterContactHours.value.trim(),
      verification_status: elements.shelterVerification.value,
      status: elements.shelterEditorStatus.value,
      address: elements.shelterAddress.value.trim(),
      description: elements.shelterDescription.value.trim(),
    };
  }

  async function saveShelter(event) {
    event.preventDefault();
    if (!elements.shelterForm.reportValidity()) return;
    const id = Number(elements.shelterId.value);
    const editing = Number.isInteger(id) && id > 0;
    setLoading(elements.shelterSave, true);
    try {
      const data = await api(editing ? `/shelters/${id}` : "/shelters", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(shelterPayload()),
      });
      openDialog(elements.shelterDialog, false);
      await loadShelters();
      showMessage(data.message || "บันทึกข้อมูลศูนย์พักพิงสำเร็จ", "success");
    } catch (error) {
      showMessage(error.message);
    } finally {
      setLoading(elements.shelterSave, false);
    }
  }

  async function toggleShelter(id) {
    const item = shelters.find((row) => Number(row.shelter_id) === Number(id));
    if (!item) return;
    const next = item.status === "active" ? "inactive" : "active";
    if (!(await confirmAction(`ต้องการ${next === "active" ? "เปิด" : "ปิด"}ใช้งานศูนย์ “${item.shelter_name}” หรือไม่?`))) return;
    try {
      await api(`/shelters/${item.shelter_id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await loadShelters();
      showMessage("อัปเดตสถานะศูนย์พักพิงสำเร็จ", "success");
    } catch (error) {
      showMessage(error.message);
    }
  }

  function populateShelterOptions() {
    if (!elements.animalShelterId) return;
    const selected = elements.animalShelterId.value;
    elements.animalShelterId.innerHTML = '<option value="">เลือกศูนย์พักพิง</option>' + shelters
      .filter((item) => item.status === "active")
      .map((item) => `<option value="${item.shelter_id}">${escapeHTML(item.shelter_name)}${item.verification_status === "verified" ? " ✓" : ""}</option>`)
      .join("");
    if ([...elements.animalShelterId.options].some((option) => option.value === selected)) {
      elements.animalShelterId.value = selected;
    }
  }

  function updateAnimalSpeciesUi() {
    const dog = activeAnimalSpecies === "dog";
    elements.animalSpeciesButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.shelterAnimalSpecies === activeAnimalSpecies);
    });
    if (elements.animalPanelKicker) elements.animalPanelKicker.textContent = dog ? "DOG SHELTER ANIMALS" : "CAT SHELTER ANIMALS";
    if (elements.animalPanelTitle) elements.animalPanelTitle.textContent = dog ? "สุนัขที่กำลังหาบ้าน" : "แมวที่กำลังหาบ้าน";
  }

  function renderAnimals() {
    if (!elements.animalList || !elements.animalEmpty) return;
    elements.animalResultCount.textContent = `${animals.length} ตัว`;
    elements.animalEmpty.hidden = animals.length > 0;
    elements.animalList.innerHTML = animals.map((item) => {
      const traits = (item.traits || []).slice(0, 4).map((trait) => `<span>${escapeHTML(trait)}</span>`).join("");
      return `
        <article class="admin-shelter-animal-card">
          <div class="admin-shelter-animal-card__image">
            ${item.cover_image_url ? `<img src="${escapeHTML(resolveImageUrl(item.cover_image_url))}" alt="${escapeHTML(item.name)}" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="admin-shelter-animal-card__fallback" hidden>${item.species === "dog" ? "🐶" : "🐱"}</span>` : `<span>${item.species === "dog" ? "🐶" : "🐱"}</span>`}
            ${item.is_urgent ? '<b>ต้องการบ้านด่วน</b>' : ""}
          </div>
          <div class="admin-shelter-animal-card__content">
            <div class="admin-shelter-card__badges">
              ${badge(item.species === "dog" ? "สุนัข" : "แมว", item.species === "dog" ? "is-dog" : "is-cat")}
              ${badge(ANIMAL_STATUS_LABELS[item.adoption_status] || item.adoption_status, `is-${item.adoption_status}`)}
            </div>
            <h3>${escapeHTML(item.name)}</h3>
            <p>${escapeHTML(GENDER_LABELS[item.gender] || item.gender)} · ${escapeHTML(item.estimated_age || "ไม่ระบุอายุ")} · ${escapeHTML(SIZE_LABELS[item.size] || item.size)}</p>
            <small>${escapeHTML(item.shelter_name || "ไม่ระบุศูนย์")} · ${escapeHTML(item.province || "ไม่ระบุจังหวัด")}</small>
            <div class="admin-shelter-traits">${traits}</div>
          </div>
          <div class="admin-shelter-animal-card__actions">
            <button class="button button-secondary button-small" type="button" data-edit-shelter-animal="${item.shelter_animal_id}">แก้ไข</button>
            <button class="button button-primary button-small" type="button" data-animal-status="${item.shelter_animal_id}">${item.adoption_status === "available" ? "ปิดประกาศ" : "เปิดรอบ้าน"}</button>
          </div>
        </article>`;
    }).join("");
  }

  async function loadAnimals() {
    showMessage();
    if (elements.animalSkeleton) elements.animalSkeleton.hidden = false;
    if (elements.animalEmpty) elements.animalEmpty.hidden = true;
    if (elements.refreshAnimals) elements.refreshAnimals.disabled = true;
    try {
      if (!shelters.length) {
        const shelterData = await api("/shelters?status=all&verification=all&search=");
        shelters = Array.isArray(shelterData.data) ? shelterData.data : [];
        populateShelterOptions();
      }
      const search = encodeURIComponent(elements.animalSearch?.value.trim() || "");
      const status = encodeURIComponent(elements.animalStatus?.value || "all");
      const data = await api(`/shelter-animals?species=${activeAnimalSpecies}&status=${status}&search=${search}`);
      animals = Array.isArray(data.data) ? data.data : [];
      renderAnimals();
      await loadSummary();
    } catch (error) {
      showMessage(error instanceof TypeError ? "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาเปิด npm run dev" : error.message);
    } finally {
      if (elements.animalSkeleton) elements.animalSkeleton.hidden = true;
      if (elements.refreshAnimals) elements.refreshAnimals.disabled = false;
    }
  }

  function openAnimalEditor(item = null) {
    elements.animalForm?.reset();
    populateShelterOptions();
    const species = item?.species || activeAnimalSpecies;
    elements.animalId.value = item?.shelter_animal_id || "";
    elements.animalShelterId.value = item?.shelter_id || "";
    elements.animalSpecies.value = species;
    elements.animalName.value = item?.name || "";
    elements.animalGender.value = item?.gender || "unknown";
    const age = parseAge(item?.estimated_age);
    elements.animalAgeValue.value = age.value;
    elements.animalAgeUnit.value = age.unit;
    elements.animalSize.value = item?.size || "medium";
    elements.animalWeight.value = parseWeight(item?.weight);
    elements.animalProvince.value = item?.province || "";
    elements.animalCurrentImageUrl.value = item?.cover_image_url || "";
    updateAnimalImagePreview(item?.cover_image_url || "", item?.cover_image_url ? "รูปปัจจุบัน — คลิกเพื่อเปลี่ยนรูป" : "");
    elements.animalTraits.value = (item?.traits || []).join(", ");
    setSelectValue(elements.animalVaccination, item?.vaccination_status || "");
    setSelectValue(elements.animalSterilization, item?.sterilization_status || "");
    elements.animalHealth.value = item?.health_detail || "";
    elements.animalPersonality.value = item?.personality || "";
    elements.animalStory.value = item?.background_story || "";
    elements.animalSuitableHome.value = item?.suitable_home || "";
    elements.animalAdoptionStatus.value = item?.adoption_status || "available";
    elements.animalUrgent.checked = Boolean(item?.is_urgent);
    elements.animalDialogTitle.textContent = item ? `แก้ไข ${item.name}` : `เพิ่ม${species === "dog" ? "สุนัข" : "แมว"}รอรับเลี้ยง`;
    openDialog(elements.animalDialog, true);
    setTimeout(() => elements.animalName?.focus(), 60);
  }

  async function readAnimalImageData() {
    const file = elements.animalImageFile?.files?.[0];
    if (!file) return "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("รูปต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("รูปมีขนาดใหญ่เกิน 5 MB");
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.addEventListener("error", () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้")));
      reader.readAsDataURL(file);
    });
  }

  function animalPayload() {
    return {
      shelter_id: Number(elements.animalShelterId.value),
      species: elements.animalSpecies.value,
      name: elements.animalName.value.trim(),
      gender: elements.animalGender.value,
      estimated_age: formatAge(),
      size: elements.animalSize.value,
      weight: formatWeight(),
      province: elements.animalProvince.value.trim(),
      cover_image_url: elements.animalCurrentImageUrl.value.trim(),
      traits: elements.animalTraits.value.split(",").map((value) => value.trim()).filter(Boolean),
      vaccination_status: elements.animalVaccination.value.trim(),
      sterilization_status: elements.animalSterilization.value.trim(),
      health_detail: elements.animalHealth.value.trim(),
      personality: elements.animalPersonality.value.trim(),
      background_story: elements.animalStory.value.trim(),
      suitable_home: elements.animalSuitableHome.value.trim(),
      adoption_status: elements.animalAdoptionStatus.value,
      is_urgent: elements.animalUrgent.checked,
    };
  }

  async function saveAnimal(event) {
    event.preventDefault();
    if (!elements.animalForm.reportValidity()) return;
    const id = Number(elements.animalId.value);
    const editing = Number.isInteger(id) && id > 0;
    setLoading(elements.animalSave, true);
    try {
      const payload = animalPayload();
      payload.cover_image_data = await readAnimalImageData();
      if (!editing && !payload.cover_image_data && !payload.cover_image_url) {
        throw new Error("กรุณาคลิกเลือกรูปสัตว์");
      }
      const data = await api(editing ? `/shelter-animals/${id}` : "/shelter-animals", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      activeAnimalSpecies = elements.animalSpecies.value === "cat" ? "cat" : "dog";
      updateAnimalSpeciesUi();
      openDialog(elements.animalDialog, false);
      await loadAnimals();
      showMessage(data.message || "บันทึกข้อมูลสัตว์สำเร็จ", "success");
    } catch (error) {
      showMessage(error.message);
    } finally {
      setLoading(elements.animalSave, false);
    }
  }

  async function toggleAnimalStatus(id) {
    const item = animals.find((row) => Number(row.shelter_animal_id) === Number(id));
    if (!item) return;
    const next = item.adoption_status === "available" ? "unavailable" : "available";
    if (!(await confirmAction(`ต้องการ${next === "available" ? "เปิดประกาศ" : "ปิดประกาศ"} “${item.name}” หรือไม่?`))) return;
    try {
      await api(`/shelter-animals/${item.shelter_animal_id}`, {
        method: "PATCH",
        body: JSON.stringify({ adoption_status: next }),
      });
      await loadAnimals();
      showMessage("อัปเดตสถานะสัตว์สำเร็จ", "success");
    } catch (error) {
      showMessage(error.message);
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-admin-section="shelters"]').forEach((button) => button.addEventListener("click", loadShelters));
    document.querySelectorAll('[data-admin-section="shelter-animals"]').forEach((button) => button.addEventListener("click", loadAnimals));

    elements.refreshShelters?.addEventListener("click", loadShelters);
    elements.addShelter?.addEventListener("click", () => openShelterEditor());
    elements.shelterForm?.addEventListener("submit", saveShelter);
    elements.shelterDialogClose?.addEventListener("click", () => openDialog(elements.shelterDialog, false));
    elements.shelterCancel?.addEventListener("click", () => openDialog(elements.shelterDialog, false));
    elements.shelterSearch?.addEventListener("input", () => {
      clearTimeout(shelterSearchTimer);
      shelterSearchTimer = setTimeout(loadShelters, 260);
    });
    elements.shelterVerificationFilter?.addEventListener("change", loadShelters);
    elements.shelterStatusFilter?.addEventListener("change", loadShelters);
    elements.shelterList?.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit-shelter]");
      const toggle = event.target.closest("[data-toggle-shelter]");
      if (edit) openShelterEditor(shelters.find((item) => Number(item.shelter_id) === Number(edit.dataset.editShelter)));
      if (toggle) toggleShelter(toggle.dataset.toggleShelter);
    });

    elements.refreshAnimals?.addEventListener("click", loadAnimals);
    elements.addAnimal?.addEventListener("click", () => openAnimalEditor());
    elements.animalForm?.addEventListener("submit", saveAnimal);
    elements.animalImageFile?.addEventListener("change", previewSelectedAnimalImage);
    elements.animalImagePreview?.addEventListener("click", openAnimalImageViewer);
    elements.animalImagePreview?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") openAnimalImageViewer(event);
    });
    elements.animalDialogClose?.addEventListener("click", () => openDialog(elements.animalDialog, false));
    elements.animalCancel?.addEventListener("click", () => openDialog(elements.animalDialog, false));
    elements.animalSpeciesButtons.forEach((button) => button.addEventListener("click", () => {
      activeAnimalSpecies = button.dataset.shelterAnimalSpecies === "cat" ? "cat" : "dog";
      updateAnimalSpeciesUi();
      loadAnimals();
    }));
    elements.animalSearch?.addEventListener("input", () => {
      clearTimeout(animalSearchTimer);
      animalSearchTimer = setTimeout(loadAnimals, 260);
    });
    elements.animalStatus?.addEventListener("change", loadAnimals);
    elements.animalList?.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit-shelter-animal]");
      const toggle = event.target.closest("[data-animal-status]");
      if (edit) openAnimalEditor(animals.find((item) => Number(item.shelter_animal_id) === Number(edit.dataset.editShelterAnimal)));
      if (toggle) toggleAnimalStatus(toggle.dataset.animalStatus);
    });

    [elements.shelterDialog, elements.animalDialog].forEach((dialog) => dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) openDialog(dialog, false);
    }));
  }

  populateProvinceOptions();
  updateAnimalSpeciesUi();
  bindEvents();

  const requested = new URLSearchParams(location.search).get("section");
  if (requested === "shelters" || requested === "shelter-animals") {
    document.querySelector(`[data-admin-section="${requested}"]`)?.click();
  }
})();
