"use strict";

(() => {
  const API_BASE = String(window.CATMATCH_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
  const FIREBASE_SESSION_URL = `${API_BASE}/auth/firebase/session`;
  const species = document.body.dataset.species === "dog" ? "dog" : "cat";
  const speciesLabel = species === "dog" ? "สุนัข" : "แมว";
  const homeUrl = species === "dog" ? "./dog-index.html" : "./index.html";
  const loginUrl = species === "dog"
    ? "./login.html?species=dog&return=dog-stray-listing"
    : "./login.html?species=cat&portal=cat&fresh=1&return=cat-stray-listing";
  const registerUrl = species === "dog"
    ? "./register.html?species=dog&fresh=1&return=dog-stray-listing"
    : "./register.html?species=cat&portal=cat&fresh=1&return=cat-stray-listing";

  const TOKEN_KEYS = ["catmatch_token", "userToken", "token"];
  const THAI_PROVINCES = [
    "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
  ];
  const APPROVAL_LABELS = { pending: "รอแอดมินตรวจสอบ", approved: "อนุมัติแล้ว", rejected: "ไม่ผ่านการอนุมัติ" };
  const ADOPTION_LABELS = { available: "กำลังรอบ้าน", contacting: "อยู่ระหว่างพูดคุย", reserved: "อยู่ระหว่างพิจารณา", adopted: "ได้บ้านแล้ว", unavailable: "ปิดประกาศ" };
  const SUBMISSION_DIALOG_STORAGE_KEY = `catmatch_pending_submission_dialog_${species}`;

  const $ = (id) => document.getElementById(id);
  const els = {
    app: $("strayListingApp"), auth: $("strayAuthRequired"), form: $("strayListingForm"), message: $("strayMessage"),
    listingId: $("strayListingId"), imageFile: $("strayImageFile"), imagePreview: $("strayImagePreview"), imagePlaceholder: $("strayImagePlaceholder"), imageFileName: $("strayImageFileName"), imageZoomHint: $("strayImageZoomHint"), currentImage: $("strayCurrentImage"),
    name: $("strayName"), gender: $("strayGender"), ageValue: $("strayAgeValue"), ageUnit: $("strayAgeUnit"), size: $("straySize"), weight: $("strayWeight"), province: $("strayProvince"),
    locationText: $("strayLocationText"), latitude: $("strayLatitude"), longitude: $("strayLongitude"), locate: $("strayLocateMe"),
    traits: $("strayTraits"), vaccination: $("strayVaccination"), sterilization: $("straySterilization"), health: $("strayHealth"), personality: $("strayPersonality"), story: $("strayStory"), suitableHome: $("straySuitableHome"),
    contactName: $("strayContactName"), contactPhone: $("strayContactPhone"), contactSocial: $("strayContactSocial"), contactLine: $("strayContactLine"), webContact: $("strayWebContact"), urgent: $("strayUrgent"), consent: $("strayContactConsent"), submit: $("straySubmit"), cancelEdit: $("strayCancelEdit"), mine: $("strayMineList"), mineCount: $("strayMineCount")
  };

  let map = null;
  let marker = null;
  let listings = [];
  let sessionRefreshPromise = null;

  function getToken() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of TOKEN_KEYS) {
        const value = storage.getItem(key);
        if (value) return value;
      }
    }
    return "";
  }
  function getStoredUser() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of ["catmatch_user", "user"]) {
        try { const value = JSON.parse(storage.getItem(key) || "null"); if (value) return value; } catch (_) {}
      }
    }
    return {};
  }

  function clearStoredUserSession() {
    const keys = ["catmatch_token", "userToken", "token", "catmatch_role", "catmatch_user", "user"];
    for (const storage of [sessionStorage, localStorage]) {
      keys.forEach((key) => storage.removeItem(key));
    }
  }

  function saveCatMatchSession(data) {
    const token = data?.token || data?.accessToken || data?.data?.token || data?.data?.accessToken;
    const role = data?.role || data?.data?.role || "user";
    const profile =
      data?.user ||
      data?.data?.user ||
      data?.profile ||
      data?.data?.profile ||
      data?.[role] ||
      data?.data?.[role] ||
      null;

    if (!token || role !== "user") return false;

    clearStoredUserSession();
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("catmatch_token", token);
    sessionStorage.setItem("userToken", token);
    sessionStorage.setItem("catmatch_role", "user");

    if (profile) {
      const profileJson = JSON.stringify(profile);
      sessionStorage.setItem("catmatch_user", profileJson);
      sessionStorage.setItem("user", profileJson);
    }
    return true;
  }

  function waitForFirebaseUser(timeoutMs = 8000) {
    const auth = window.catmatchFirebase?.auth;
    if (!auth) return Promise.resolve(null);
    if (auth.currentUser) return Promise.resolve(auth.currentUser);

    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      let unsubscribe = () => {};
      const finish = (user) => {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        unsubscribe();
        resolve(user || null);
      };

      unsubscribe = auth.onAuthStateChanged(
        (user) => finish(user),
        () => finish(null)
      );
      if (settled) {
        unsubscribe();
      } else {
        timer = window.setTimeout(() => finish(auth.currentUser), timeoutMs);
      }
    });
  }

  async function restoreBackendSession({ force = false } = {}) {
    if (!force && getToken()) return true;
    if (sessionRefreshPromise) return sessionRefreshPromise;

    sessionRefreshPromise = (async () => {
      const bridge = window.catmatchFirebase;
      if (!bridge?.configured || !bridge.auth || typeof bridge.getIdToken !== "function") return false;

      const firebaseUser = bridge.auth.currentUser || await waitForFirebaseUser();
      if (!firebaseUser) return false;

      const idToken = await bridge.getIdToken(firebaseUser, force);
      const allowCreate = Array.isArray(firebaseUser.providerData)
        && firebaseUser.providerData.some((provider) => provider?.providerId === "google.com");

      const response = await fetch(FIREBASE_SESSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ idToken, allowCreate }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        const error = new Error(data?.message || "ไม่สามารถกู้คืนเซสชันเข้าสู่ระบบได้");
        error.status = response.status;
        error.code = data?.code || "SESSION_RESTORE_FAILED";
        throw error;
      }

      return saveCatMatchSession(data);
    })().finally(() => {
      sessionRefreshPromise = null;
    });

    return sessionRefreshPromise;
  }
  function escapeHTML(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function resolveImageUrl(value) {
    const imageUrl = String(value || "").trim();
    if (!imageUrl) return "";
    if (/^(?:data:|blob:|https?:\/\/|\/\/)/i.test(imageUrl)) return imageUrl;
    try { return new URL(imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`, new URL(API_BASE).origin).href; } catch (_) { return imageUrl; }
  }
  function showMessage(message = "", type = "error") {
    if (!els.message) return;
    els.message.textContent = message;
    els.message.hidden = !message;
    els.message.classList.toggle("is-success", type === "success");
    if (message) els.message.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearPendingSubmissionDialog() {
    try { sessionStorage.removeItem(SUBMISSION_DIALOG_STORAGE_KEY); } catch (_) {}
  }

  function rememberPendingSubmissionDialog(data) {
    try {
      sessionStorage.setItem(SUBMISSION_DIALOG_STORAGE_KEY, JSON.stringify({
        editing: Boolean(data?.editing),
        animalName: String(data?.animalName || ""),
        savedAt: Date.now(),
      }));
    } catch (_) {}
  }

  function ensureSubmissionDialog() {
    let dialog = $("straySubmissionDialog");
    if (dialog) return dialog;

    const listingsUrl = `./adoption-requests.html?tab=listings&species=${species}`;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="stray-submit-dialog" id="straySubmissionDialog" role="dialog" aria-modal="true" aria-labelledby="straySubmissionTitle" aria-describedby="straySubmissionMessage" hidden>
        <div class="stray-submit-dialog__card" role="document">
          <button class="stray-submit-dialog__close" type="button" data-close-submission-dialog aria-label="ปิดข้อความ">×</button>
          <div class="stray-submit-dialog__icon" aria-hidden="true">✓</div>
          <p class="eyebrow">SUBMISSION SENT</p>
          <h2 id="straySubmissionTitle">ส่งคำขอเผยแพร่ประกาศแล้ว</h2>
          <p id="straySubmissionMessage">ระบบส่งประกาศของคุณไปให้แอดมินตรวจสอบเรียบร้อยแล้ว</p>
          <div class="stray-submit-dialog__status"><span aria-hidden="true"></span>รอแอดมินตรวจสอบ</div>
          <ol class="stray-submit-dialog__steps" aria-label="ขั้นตอนหลังส่งประกาศ">
            <li class="is-complete"><b>1</b><span><strong>ส่งข้อมูลสำเร็จ</strong><small>ระบบบันทึกประกาศของคุณแล้ว</small></span></li>
            <li class="is-current"><b>2</b><span><strong>แอดมินตรวจสอบ</strong><small>ตรวจสอบข้อมูล รูปภาพ และช่องทางติดต่อ</small></span></li>
            <li><b>3</b><span><strong>เผยแพร่หลังอนุมัติ</strong><small>ประกาศจะแสดงในหน้า${speciesLabel}ที่กำลังรอบ้าน</small></span></li>
          </ol>
          <p class="stray-submit-dialog__note">คุณติดตามสถานะ แก้ไขข้อมูล หรือดูเหตุผลกรณีไม่ผ่านการอนุมัติได้จากหน้า “ประกาศของฉัน”</p>
          <div class="stray-submit-dialog__actions">
            <a class="button button-primary" href="${listingsUrl}" data-complete-submission-dialog>ดูสถานะประกาศของฉัน</a>
            <button class="button button-secondary" type="button" data-close-submission-dialog>ปิดและลงประกาศเพิ่ม</button>
          </div>
        </div>
      </div>`);

    dialog = $("straySubmissionDialog");
    const closeDialog = () => {
      dialog.classList.remove("is-open");
      dialog.hidden = true;
      document.body.classList.remove("has-stray-submit-dialog");
      clearPendingSubmissionDialog();
    };

    dialog.querySelectorAll("[data-close-submission-dialog]").forEach((button) => {
      button.addEventListener("click", closeDialog);
    });
    dialog.querySelectorAll("[data-complete-submission-dialog]").forEach((link) => {
      link.addEventListener("click", () => {
        clearPendingSubmissionDialog();
        document.body.classList.remove("has-stray-submit-dialog");
      });
    });

    // Do not attach backdrop-click or Escape handlers. This overlay can only be
    // dismissed by the explicit buttons above.
    return dialog;
  }

  function showSubmissionDialog({ editing = false, animalName = "" } = {}, { persist = true } = {}) {
    const dialog = ensureSubmissionDialog();
    const title = $("straySubmissionTitle");
    const message = $("straySubmissionMessage");
    const safeName = String(animalName || "").trim();

    if (title) {
      title.textContent = editing
        ? "ส่งข้อมูลแก้ไขให้แอดมินตรวจสอบแล้ว"
        : "ส่งคำขอเผยแพร่ประกาศแล้ว";
    }
    if (message) {
      message.textContent = editing
        ? `ระบบส่งข้อมูลแก้ไข${safeName ? `ของ “${safeName}”` : ""} ไปให้แอดมินตรวจสอบใหม่แล้ว ระหว่างนี้ประกาศจะอยู่ในสถานะรอตรวจสอบ`
        : `ระบบส่งประกาศ${safeName ? `ของ “${safeName}”` : ""} ไปให้แอดมินตรวจสอบเรียบร้อยแล้ว ประกาศจะยังไม่แสดงในหน้ากำลังรอบ้านจนกว่าจะได้รับอนุมัติ`;
    }

    if (persist) rememberPendingSubmissionDialog({ editing, animalName: safeName });
    dialog.hidden = false;
    document.body.classList.add("has-stray-submit-dialog");
    window.requestAnimationFrame(() => {
      dialog.classList.add("is-open");
      dialog.querySelector("[data-close-submission-dialog]")?.focus({ preventScroll: true });
    });
  }

  function restorePendingSubmissionDialog() {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(SUBMISSION_DIALOG_STORAGE_KEY) || "null"); } catch (_) {}
    if (!pending) return;
    showSubmissionDialog({
      editing: Boolean(pending.editing),
      animalName: String(pending.animalName || ""),
    }, { persist: false });
  }
  async function api(path, options = {}, allowSessionRetry = true) {
    let token = getToken();
    if (!token) {
      const restored = await restoreBackendSession().catch(() => false);
      if (restored) token = getToken();
    }
    if (!token) throw new Error("กรุณาเข้าสู่ระบบ");

    const response = await fetch(`${API_BASE}/stray-listings${path}`, {
      ...options,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && allowSessionRetry) {
      clearStoredUserSession();
      const restored = await restoreBackendSession({ force: true }).catch(() => false);
      if (restored) return api(path, options, false);
    }

    if (!response.ok || data.success === false) {
      const error = new Error(data.message || "ไม่สามารถดำเนินการได้");
      error.status = response.status;
      error.code = data.code || "";
      throw error;
    }
    return data;
  }
  function populateProvinces() {
    const list = $("strayProvinceOptions");
    if (list) list.innerHTML = THAI_PROVINCES.map((p) => `<option value="${p}"></option>`).join("");
  }
  function isInsideThailand(lat, lng) {
    const helper = window.CatMatchThailandMap;
    const ring = helper?.GEOJSON?.geometry?.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 3) {
      return lat >= 5.55 && lat <= 20.55 && lng >= 97.25 && lng <= 105.72;
    }
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const intersects = ((yi > lat) !== (yj > lat))
        && (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function setLocation(lat, lng, zoom = 16) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    if (!isInsideThailand(latitude, longitude)) {
      showMessage("กรุณาปักหมุดภายในประเทศไทย");
      if (marker && map) map.removeLayer(marker);
      marker = null;
      els.latitude.value = "";
      els.longitude.value = "";
      return false;
    }
    els.latitude.value = latitude.toFixed(7);
    els.longitude.value = longitude.toFixed(7);
    if (!map || !window.L) return true;
    if (!marker) marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
    else marker.setLatLng([latitude, longitude]);
    marker.off("dragend").on("dragend", () => {
      const point = marker.getLatLng();
      if (!setLocation(point.lat, point.lng, map.getZoom())) {
        const currentLat = Number(els.latitude.value);
        const currentLng = Number(els.longitude.value);
        if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) marker?.setLatLng([currentLat, currentLng]);
      }
    });
    map.setView([latitude, longitude], zoom);
    return true;
  }
  function initMap() {
    const helper = window.CatMatchThailandMap;
    if (!window.L || !helper || !$("strayLocationMap")) return;
    map = L.map("strayLocationMap", {
      scrollWheelZoom: false,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: helper.BOUNDS,
      maxBoundsViscosity: 1,
    });
    helper.addThailandLayer(map, {
      minZoom: 5,
      maxZoom: 18,
      borderColor: species === "dog" ? "#d8c4b6" : "#73aeda",
      borderWeight: 2,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    map.fitBounds(helper.BOUNDS, { padding: [12, 12], animate: false });
    map.on("click", (event) => setLocation(event.latlng.lat, event.latlng.lng, Math.max(map.getZoom(), 8)));
    requestAnimationFrame(() => map?.invalidateSize());
    setTimeout(() => {
      map?.invalidateSize();
      if (!marker) map?.fitBounds(helper.BOUNDS, { padding: [12, 12], animate: false });
    }, 180);
  }
  function previewImage(source = "") {
    const resolved = resolveImageUrl(source);
    if (!resolved) {
      els.imagePreview.hidden = true;
      els.imagePreview.removeAttribute("src");
      els.imagePlaceholder.hidden = false;
      if (els.imageZoomHint) els.imageZoomHint.hidden = true;
      return;
    }
    els.imagePreview.src = resolved;
    els.imagePreview.hidden = false;
    els.imagePlaceholder.hidden = true;
    if (els.imageZoomHint) els.imageZoomHint.hidden = false;
  }

  function ensureImageDialog() {
    let dialog = $("strayImageDialog");
    if (dialog) return dialog;
    document.body.insertAdjacentHTML("beforeend", `
      <dialog class="stray-image-dialog" id="strayImageDialog" aria-labelledby="strayImageDialogTitle">
        <div class="stray-image-dialog__card">
          <div class="stray-image-dialog__header">
            <div><p class="eyebrow">IMAGE PREVIEW</p><h2 id="strayImageDialogTitle">ดูรูป${speciesLabel}ขนาดใหญ่</h2></div>
            <button class="stray-image-dialog__close" type="button" data-close-image-dialog aria-label="ปิดรูปขนาดใหญ่">×</button>
          </div>
          <img id="strayImageDialogPreview" alt="รูป${speciesLabel}ขนาดใหญ่">
          <p>ตรวจสอบว่ารูปชัด เห็นตัว${speciesLabel}ครบ และไม่มีข้อมูลส่วนบุคคลที่ไม่ต้องการเผยแพร่</p>
        </div>
      </dialog>`);
    dialog = $("strayImageDialog");
    dialog.querySelector("[data-close-image-dialog]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function openImageDialog(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const source = els.imagePreview?.getAttribute("src");
    if (!source || els.imagePreview.hidden) return;
    const dialog = ensureImageDialog();
    const preview = $("strayImageDialogPreview");
    if (preview) preview.src = source;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  function readImageData() {
    const file = els.imageFile.files?.[0];
    if (!file) return Promise.resolve("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return Promise.reject(new Error("รูปต้องเป็นไฟล์ JPG, PNG หรือ WEBP"));
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error("รูปมีขนาดใหญ่เกิน 5 MB"));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.addEventListener("error", () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้")));
      reader.readAsDataURL(file);
    });
  }
  function formatAge() {
    const value = String(els.ageValue.value || "").trim();
    return value ? `${value} ${els.ageUnit.value === "year" ? "ปี" : "เดือน"}` : "";
  }
  function parseAge(value) {
    const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*(เดือน|ปี)/);
    return { value: match ? match[1] : "", unit: match?.[2] === "ปี" ? "year" : "month" };
  }
  function payload() {
    return {
      species, name: els.name.value.trim(), gender: els.gender.value, estimated_age: formatAge(), size: els.size.value,
      weight: els.weight.value ? `${els.weight.value} กก.` : "", province: els.province.value.trim(), location_text: els.locationText.value.trim(),
      latitude: els.latitude.value, longitude: els.longitude.value, traits: els.traits.value.split(",").map((v) => v.trim()).filter(Boolean),
      vaccination_status: els.vaccination.value, sterilization_status: els.sterilization.value, health_detail: els.health.value.trim(), personality: els.personality.value.trim(), background_story: els.story.value.trim(), suitable_home: els.suitableHome.value.trim(),
      contact_name: els.contactName.value.trim(), contact_phone: els.contactPhone.value.trim(), contact_social_url: els.contactSocial.value.trim(), contact_line: els.contactLine.value.trim(), allow_web_contact: els.webContact.checked,
      is_urgent: els.urgent.checked, contact_consent: els.consent.checked, cover_image_url: els.currentImage.value.trim(),
    };
  }
  function resetForm() {
    els.form.reset();
    els.listingId.value = "";
    els.currentImage.value = "";
    previewImage();
    clearAllFieldErrors();
    if (els.imageFileName) els.imageFileName.textContent = "ยังไม่ได้เลือกรูป";
    const user = getStoredUser();
    els.contactName.value = user.name || "";
    els.contactPhone.value = user.phone || "";
    els.webContact.checked = true;
    els.cancelEdit.hidden = true;
    els.submit.textContent = "ส่งให้แอดมินตรวจสอบ";
    if (marker && map) map.removeLayer(marker);
    marker = null;
    if (map && window.CatMatchThailandMap) {
      map.fitBounds(window.CatMatchThailandMap.BOUNDS, { padding: [12, 12], animate: false });
    }
  }
  function editListing(item) {
    els.listingId.value = item.listing_id;
    els.name.value = item.name || "";
    els.gender.value = item.gender || "unknown";
    const age = parseAge(item.estimated_age);
    els.ageValue.value = age.value;
    els.ageUnit.value = age.unit;
    els.size.value = item.size || "medium";
    els.weight.value = String(item.weight || "").match(/\d+(?:\.\d+)?/)?.[0] || "";
    els.province.value = item.province || "";
    els.locationText.value = item.location_text || "";
    els.latitude.value = item.latitude ?? "";
    els.longitude.value = item.longitude ?? "";
    els.currentImage.value = item.cover_image_url || "";
    previewImage(item.cover_image_url);
    if (els.imageFileName) els.imageFileName.textContent = item.cover_image_url ? "รูปปัจจุบันของประกาศ" : "ยังไม่ได้เลือกรูป";
    els.traits.value = (item.traits || []).join(", ");
    els.vaccination.value = item.vaccination_status || "";
    els.sterilization.value = item.sterilization_status || "";
    els.health.value = item.health_detail || "";
    els.personality.value = item.personality || "";
    els.story.value = item.background_story || "";
    els.suitableHome.value = item.suitable_home || "";
    els.contactName.value = item.contact_name || "";
    els.contactPhone.value = item.contact_phone || "";
    els.contactSocial.value = item.contact_social_url || "";
    els.contactLine.value = item.contact_line || "";
    els.webContact.checked = Boolean(item.allow_web_contact);
    els.urgent.checked = Boolean(item.is_urgent);
    els.consent.checked = true;
    els.cancelEdit.hidden = false;
    els.submit.textContent = "บันทึกและส่งตรวจสอบใหม่";
    if (item.latitude !== null && item.longitude !== null) setLocation(item.latitude, item.longitude);
    els.form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function renderMine() {
    if (els.mineCount) els.mineCount.textContent = `${listings.length} ประกาศ`;
    if (!els.mine) return;
    if (!listings.length) {
      els.mine.innerHTML = `<div class="stray-empty"><strong>ยังไม่มีประกาศของคุณ</strong><p>กรอกข้อมูลด้านบนเพื่อส่งให้แอดมินตรวจสอบ</p></div>`;
      return;
    }
    els.mine.innerHTML = listings.map((item) => {
      const canEdit = item.approval_status !== "approved" && item.adoption_status !== "adopted";
      const statusAction = item.approval_status === "approved"
        ? `<button type="button" data-stray-status="${item.listing_id}" data-next-status="${item.adoption_status === "adopted" ? "available" : "adopted"}">${item.adoption_status === "adopted" ? "เปิดประกาศอีกครั้ง" : "บันทึกว่าได้บ้านแล้ว"}</button>` : "";
      return `<article class="stray-mine-card">
        <img src="${escapeHTML(resolveImageUrl(item.cover_image_url))}" alt="${speciesLabel}ชื่อ ${escapeHTML(item.name)}">
        <div><span class="stray-approval is-${escapeHTML(item.approval_status)}">${escapeHTML(APPROVAL_LABELS[item.approval_status] || item.approval_status)}</span><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.province)} · ${escapeHTML(ADOPTION_LABELS[item.adoption_status] || item.adoption_status)}</p>${item.rejection_reason ? `<small>เหตุผล: ${escapeHTML(item.rejection_reason)}</small>` : ""}</div>
        <div class="stray-mine-actions">${canEdit ? `<button type="button" data-stray-edit="${item.listing_id}">แก้ไข</button>` : ""}${statusAction}</div>
      </article>`;
    }).join("");
  }
  async function loadMine() {
    try { const data = await api("/mine"); listings = Array.isArray(data.data) ? data.data : []; renderMine(); }
    catch (error) { showMessage(error.message); }
  }
  function validationContainer(control) {
    if (!control) return null;
    if (control === els.latitude || control === els.longitude) return control.closest(".stray-field");
    return control.closest(".stray-check, .stray-field");
  }

  function clearFieldError(control) {
    const container = validationContainer(control);
    if (!container) return;
    container.classList.remove("is-invalid");
    control.removeAttribute("aria-invalid");
    const error = container.querySelector(`[data-validation-for="${control.id}"]`);
    if (error) error.remove();
  }

  function setFieldError(control, message) {
    const container = validationContainer(control);
    if (!container || !control) return;
    clearFieldError(control);
    container.classList.add("is-invalid");
    control.setAttribute("aria-invalid", "true");
    const error = document.createElement("p");
    error.className = "stray-field-error";
    error.dataset.validationFor = control.id;
    error.id = `${control.id}Error`;
    error.textContent = message;
    container.appendChild(error);
    control.setAttribute("aria-describedby", error.id);
  }

  function clearAllFieldErrors() {
    els.form?.querySelectorAll(".stray-field-error").forEach((node) => node.remove());
    els.form?.querySelectorAll(".is-invalid").forEach((node) => node.classList.remove("is-invalid"));
    els.form?.querySelectorAll('[aria-invalid="true"]').forEach((node) => {
      node.removeAttribute("aria-invalid");
      node.removeAttribute("aria-describedby");
    });
  }

  function validateForm() {
    clearAllFieldErrors();
    const errors = [];
    const add = (control, message) => {
      setFieldError(control, message);
      errors.push({ control, container: validationContainer(control) });
    };
    const editing = Number(els.listingId.value) > 0;
    const hasImage = Boolean(els.imageFile.files?.[0] || els.currentImage.value.trim());

    if (!editing && !hasImage) add(els.imageFile, `กรุณาเลือกรูป${speciesLabel}ก่อนส่งประกาศ`);
    if (!els.name.value.trim()) add(els.name, `กรุณากรอกชื่อหรือชื่อเรียกของ${speciesLabel}`);
    if (!els.province.value.trim()) add(els.province, "กรุณากรอกจังหวัด");
    if (!els.locationText.value.trim()) add(els.locationText, "กรุณาระบุรายละเอียดสถานที่พบสัตว์");
    if (!els.latitude.value || !els.longitude.value) add(els.latitude, "กรุณาคลิกปักหมุดสถานที่บนแผนที่");
    if (!els.contactName.value.trim()) add(els.contactName, "กรุณากรอกชื่อผู้ติดต่อ");
    if (els.contactSocial.value && !els.contactSocial.validity.valid) add(els.contactSocial, "กรุณากรอกลิงก์โซเชียลให้ถูกต้อง เช่น https://...");
    if (els.ageValue.value && !els.ageValue.validity.valid) add(els.ageValue, "กรุณากรอกอายุเป็นตัวเลขที่อยู่ในช่วงที่กำหนด");
    if (els.weight.value && !els.weight.validity.valid) add(els.weight, "กรุณากรอกน้ำหนักให้ถูกต้อง");
    if (!els.consent.checked) add(els.consent, "กรุณายืนยันว่าข้อมูลเป็นจริงและยินยอมก่อนส่งประกาศ");

    if (!errors.length) return true;
    showMessage(`กรุณาตรวจสอบข้อมูลที่ยังไม่ครบ ${errors.length} จุด ระบบทำเครื่องหมายสีแดงไว้ให้แล้ว`);
    const first = errors[0];
    first.container?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => first.control?.focus({ preventScroll: true }), 250);
    return false;
  }

  function bindValidationCleanup() {
    const controls = [els.imageFile, els.name, els.province, els.locationText, els.latitude, els.longitude, els.contactName, els.contactSocial, els.ageValue, els.weight, els.consent];
    controls.forEach((control) => {
      if (!control) return;
      const eventName = control.type === "checkbox" || control.type === "file" ? "change" : "input";
      control.addEventListener(eventName, () => clearFieldError(control));
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!validateForm()) return;
    els.submit.disabled = true;
    try {
      const body = payload();
      const submittedName = body.name;
      body.cover_image_data = await readImageData();
      const id = Number(els.listingId.value);
      const editing = Number.isInteger(id) && id > 0;
      if (!editing && !body.cover_image_data) throw new Error("กรุณาเลือกรูปสัตว์");
      const data = await api(editing ? `/${id}` : "/", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) });
      showMessage(data.message || (editing ? "ส่งข้อมูลแก้ไขให้แอดมินตรวจสอบแล้ว" : "ส่งคำขอเผยแพร่ประกาศแล้ว"), "success");
      resetForm();
      await loadMine();
      showSubmissionDialog({ editing, animalName: submittedName });
    } catch (error) { showMessage(error.message); }
    finally { els.submit.disabled = false; }
  }
  async function updateStatus(id, status) {
    try {
      const data = await api(`/${id}/status`, { method: "PATCH", body: JSON.stringify({ adoption_status: status }) });
      showMessage(data.message, "success");
      await loadMine();
    } catch (error) { showMessage(error.message); }
  }

  async function init() {
    document.querySelectorAll("[data-species-label]").forEach((node) => { node.textContent = speciesLabel; });
    document.querySelectorAll("[data-home-link]").forEach((node) => { node.href = homeUrl; });
    document.querySelectorAll("[data-login-link]").forEach((node) => { node.href = loginUrl; });
    document.querySelectorAll("[data-register-link]").forEach((node) => { node.href = registerUrl; });

    els.auth.hidden = true;
    els.app.hidden = true;
    document.body.classList.add("is-checking-session");

    let tokenReady = Boolean(getToken());
    let firebaseUser = null;
    let sessionRestoreError = null;
    let signedIn = tokenReady;

    if (window.CatMatchUserSession?.ensure) {
      const session = await window.CatMatchUserSession.ensure();
      signedIn = Boolean(session?.signedIn);
      tokenReady = Boolean(session?.token || getToken());
      firebaseUser = session?.firebaseUser || null;
    } else if (!tokenReady) {
      firebaseUser = await waitForFirebaseUser();
      if (firebaseUser) {
        tokenReady = await restoreBackendSession().catch((error) => {
          sessionRestoreError = error;
          console.warn("Unable to restore CatMatch session:", error);
          return false;
        });
        signedIn = tokenReady || Boolean(firebaseUser);
      }
    }
    document.body.classList.remove("is-checking-session");
    if (!signedIn) {
      els.auth.hidden = false;
      els.app.hidden = true;
      return;
    }

    // Firebase ยังล็อกอินอยู่จึงต้องแสดงแบบฟอร์ม ไม่แสดงกล่องให้ล็อกอินซ้ำ
    els.auth.hidden = true;
    els.app.hidden = false;
    populateProvinces();
    initMap();
    resetForm();
    bindValidationCleanup();
    ensureImageDialog();
    els.imagePreview?.addEventListener("click", openImageDialog);
    els.imagePreview?.addEventListener("keydown", (event) => {
      if (["Enter", " "].includes(event.key)) openImageDialog(event);
    });
    if (!tokenReady && sessionRestoreError) {
      showMessage("เข้าสู่ระบบแล้ว แต่ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาเปิด Backend แล้วรีเฟรชหน้านี้");
    }
    els.form.addEventListener("submit", submit);
    els.cancelEdit.addEventListener("click", resetForm);
    els.imageFile.addEventListener("change", () => {
      const file = els.imageFile.files?.[0];
      clearFieldError(els.imageFile);
      if (!file) {
        if (els.imageFileName) els.imageFileName.textContent = els.currentImage.value ? "รูปปัจจุบันของประกาศ" : "ยังไม่ได้เลือกรูป";
        previewImage(els.currentImage.value);
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
        setFieldError(els.imageFile, "รูปต้องเป็น JPG, PNG หรือ WEBP และมีขนาดไม่เกิน 5 MB");
        showMessage("กรุณาเลือกรูปใหม่: รองรับเฉพาะ JPG, PNG หรือ WEBP ไม่เกิน 5 MB");
        els.imageFile.value = "";
        if (els.imageFileName) els.imageFileName.textContent = els.currentImage.value ? "รูปปัจจุบันของประกาศ" : "ยังไม่ได้เลือกรูป";
        previewImage(els.currentImage.value);
        return;
      }
      if (els.imageFileName) els.imageFileName.textContent = file.name;
      const reader = new FileReader();
      reader.addEventListener("load", () => previewImage(reader.result));
      reader.readAsDataURL(file);
    });
    els.locate.addEventListener("click", () => {
      if (!navigator.geolocation) return showMessage("เบราว์เซอร์นี้ไม่รองรับการค้นหาตำแหน่ง");
      els.locate.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (position) => { setLocation(position.coords.latitude, position.coords.longitude); els.locate.disabled = false; },
        () => { showMessage("ไม่สามารถอ่านตำแหน่งได้ กรุณาคลิกปักหมุดบนแผนที่"); els.locate.disabled = false; },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
    els.mine?.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-stray-edit]");
      const status = event.target.closest("[data-stray-status]");
      if (edit) editListing(listings.find((item) => Number(item.listing_id) === Number(edit.dataset.strayEdit)));
      if (status) updateStatus(status.dataset.strayStatus, status.dataset.nextStatus);
    });
    await loadMine();
    const requestedEditId = Number(new URLSearchParams(window.location.search).get("edit"));
    if (requestedEditId > 0) {
      const target = listings.find((item) => Number(item.listing_id) === requestedEditId && item.species === species);
      if (target) editListing(target);
      else showMessage("ไม่พบประกาศที่ต้องการแก้ไข หรือประกาศนี้เป็นสัตว์อีกประเภทหนึ่ง");
    }
    restorePendingSubmissionDialog();
  }

  init().catch((error) => {
    console.error("Stray listing initialization failed:", error);
    document.body.classList.remove("is-checking-session");
    if (els.app) els.app.hidden = true;
    if (els.auth) els.auth.hidden = false;
  });
})();
