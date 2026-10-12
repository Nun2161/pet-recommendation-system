"use strict";

(function initializeFarmRegistration() {
  console.info("[CatMatch Farm] flow v17 loaded");
  const FARM_FLOW_VERSION = "16";
  console.info(`[CatMatch Farm] flow v${FARM_FLOW_VERSION} loaded`);
  document.documentElement.dataset.farmFlowVersion = FARM_FLOW_VERSION;
  const form = document.getElementById("farmRegisterForm");
  if (!form) return;

  const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const API_BASE_URL = String(
    window.CATMATCH_API_BASE_URL || (isLocalPage ? "http://localhost:3000" : "")
  ).replace(/\/+$/, "");

  const REGISTER_URL = API_BASE_URL
    ? `${API_BASE_URL}/api/auth/farm-register`
    : "/api/auth/farm-register";
  const AVAILABILITY_URL = `${REGISTER_URL}/check-availability`;
  const STATUS_URL = `${REGISTER_URL}/status`;
  const THAILAND_LOCATION_URLS = [
    "https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province_with_district_and_sub_district.json",
    "https://cdn.jsdelivr.net/gh/kongvut/thai-province-data@master/api/latest/province_with_district_and_sub_district.json",
  ];
  const LOCATION_CACHE_KEYS = [
    "catmatch_thailand_locations_v3",
    "catmatch_thailand_locations_v1",
  ];
  const FARM_DRAFT_KEY = "catmatch_farm_register_draft_v1";
  const pageParams = new URLSearchParams(window.location.search);
  const shouldRestoreDraft = pageParams.get("restore") === "1";
  const shouldStartFresh =
    pageParams.get("fresh") === "1" || !shouldRestoreDraft;
  const MAX_CERTIFICATE_SIZE = 3 * 1024 * 1024;
  const ALLOWED_CERTIFICATE_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]);

  const steps = Array.from(document.querySelectorAll(".farm-form-step"));
  const indicators = Array.from(document.querySelectorAll(".farm-step-indicator"));
  const progress = document.getElementById("farmStepperProgress");
  const backButton = document.getElementById("farmBackButton");
  const nextButton = document.getElementById("farmNextButton");
  const submitButton = document.getElementById("farmSubmitButton");
  const submitLabel = submitButton?.querySelector(".farm-submit-label");
  const submitLoading = submitButton?.querySelector(".farm-submit-loading");
  const statusBox = document.getElementById("farmFormStatus");
  const emailInput = document.getElementById("farmEmail");
  const farmNameInput = document.getElementById("farmName");
  const phoneInput = document.getElementById("phone");
  const phoneCountrySelect = document.getElementById("phoneCountry");
  const dialCodeElement = document.getElementById("farmDialCode");
  const passwordInput = document.getElementById("farmPassword");
  const confirmPasswordInput = document.getElementById("farmConfirmPassword");
  const descriptionInput = document.getElementById("farmDescription");
  const descriptionCount = document.getElementById("descriptionCount");
  const certificateInput = document.getElementById("certificateFile");
  const uploadZone = document.getElementById("farmUploadZone");
  const filePreview = document.getElementById("farmFilePreview");
  const fileNameElement = document.getElementById("farmFileName");
  const fileSizeElement = document.getElementById("farmFileSize");
  const fileTypeElement = document.getElementById("farmFileType");
  const removeFileButton = document.getElementById("removeCertificateFile");
  const provinceSelect = document.getElementById("province");
  const districtSelect = document.getElementById("district");
  const subdistrictSelect = document.getElementById("subdistrict");
  const locationLoading = document.getElementById("farmLocationLoading");
  const termsInput = document.getElementById("farmTerms");
  const successModal = document.getElementById("farmSuccessModal");
  const legalLinks = Array.from(document.querySelectorAll("[data-farm-legal-link]"));

  const fieldElementMap = {
    owner_name: document.getElementById("ownerName"),
    email: emailInput,
    phone: phoneInput,
    phone_country: phoneCountrySelect,
    password: passwordInput,
    confirm_password: confirmPasswordInput,
    farm_name: farmNameInput,
    description: descriptionInput,
    website: document.getElementById("website"),
    facebook: document.getElementById("facebook"),
    line_contact: document.getElementById("lineContact"),
    certificate_no: document.getElementById("certificateNo"),
    certificate_file: certificateInput,
    country: document.getElementById("country"),
    province: provinceSelect,
    district: districtSelect,
    subdistrict: subdistrictSelect,
    address: document.getElementById("farmAddress"),
    latitude: document.getElementById("latitude"),
    longitude: document.getElementById("longitude"),
    terms: termsInput,
  };

  const availabilityState = {
    email: null,
    farm_name: null,
  };
  const availabilityTimers = new Map();

  let currentStep = 1;
  let highestStep = 1;
  let certificateData = "";
  let thailandLocations = [];

  function showStatus(message = "", type = "error") {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.hidden = !message;
    statusBox.classList.toggle("is-success", type === "success");
    if (message) statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function getDraftPayload() {
    const values = {};
    Object.entries(fieldElementMap).forEach(([name, field]) => {
      if (!field || ["password", "confirm_password", "certificate_file"].includes(name)) return;
      values[name] = field.type === "checkbox" ? field.checked : field.value;
    });
    return { values, step: currentStep, highestStep, savedAt: Date.now() };
  }

  function saveFarmDraft() {
    try { sessionStorage.setItem(FARM_DRAFT_KEY, JSON.stringify(getDraftPayload())); } catch (_error) {}
  }

  async function restoreFarmDraft() {
    let draft;
    try { draft = JSON.parse(sessionStorage.getItem(FARM_DRAFT_KEY) || "null"); } catch (_error) { draft = null; }
    if (!draft?.values) return 1;
    const delayed = {};
    Object.entries(draft.values).forEach(([name, value]) => {
      const field = fieldElementMap[name];
      if (!field) return;
      if (["province", "district", "subdistrict"].includes(name)) { delayed[name] = value; return; }
      if (field.type === "checkbox") field.checked = Boolean(value);
      else field.value = value ?? "";
    });
    updateDialCode();
    formatPhoneInput();
    if (descriptionCount && descriptionInput) descriptionCount.textContent = `${descriptionInput.value.length.toLocaleString("th-TH")} / 2,000`;
    updatePasswordRules();
    await loadThailandLocations();
    if (delayed.province) {
      provinceSelect.value = delayed.province;
      handleProvinceChange();
      if (delayed.district) {
        districtSelect.value = delayed.district;
        handleDistrictChange();
        if (delayed.subdistrict) subdistrictSelect.value = delayed.subdistrict;
      }
    }
    highestStep = Math.max(1, Math.min(3, Number(draft.highestStep) || 1));
    const queryStep = Number(pageParams.get("step"));
    return Math.max(1, Math.min(3, queryStep || Number(draft.step) || 1));
  }

  function clearFarmDraft() {
    try {
      sessionStorage.removeItem(FARM_DRAFT_KEY);
    } catch (_error) {}
  }

  function resetFreshRegistrationForm() {
    clearFarmDraft();
    form.reset();

    certificateData = "";
    currentStep = 1;
    highestStep = 1;

    if (phoneCountrySelect) {
      phoneCountrySelect.value = "TH";
    }

    if (certificateInput) {
      certificateInput.value = "";
    }

    if (filePreview) {
      filePreview.hidden = true;
    }

    if (uploadZone) {
      uploadZone.hidden = false;
      uploadZone.classList.remove("is-dragover");
    }

    if (descriptionCount && descriptionInput) {
      descriptionCount.textContent = "0 / 2,000";
    }

    clearAllErrors();
    clearStatus();
    updateDialCode();
    updatePasswordRules();
  }

  function currentFarmFlowSpecies() {
    const params = new URLSearchParams(window.location.search);
    const explicit = String(params.get("species") || "").toLowerCase();
    if (explicit === "dog" || explicit === "cat") return explicit;
    return document.documentElement.dataset.authSpecies === "dog" ? "dog" : "cat";
  }

  function persistFarmRegistrationResult(farm = {}) {
    const result = {
      farm_id: Number(farm.farm_id) || null,
      farm_name: String(farm.farm_name || farmNameInput?.value || "ฟาร์มของคุณ"),
      email: String(farm.email || emailInput?.value || ""),
      status: String(farm.status || "pending"),
      rejection_reason: farm.rejection_reason || null,
      species: currentFarmFlowSpecies(),
      submitted_at: Date.now(),
    };

    try {
      const serialized = JSON.stringify(result);
      sessionStorage.setItem("catmatch_farm_registration_result", serialized);
      localStorage.setItem("catmatch_farm_registration_result", serialized);
    } catch (error) {
      console.warn("เก็บสถานะคำขอฟาร์มไม่สำเร็จ:", error);
    }

    return result;
  }

  function navigateToFarmStatus(farm = {}) {
    const result = persistFarmRegistrationResult(farm);
    clearFarmDraft();

    const isApproved = result.status === "approved";
    const target = new URL(
      isApproved ? "./farm.html" : "./farm-pending.html",
      window.location.href
    );

    target.searchParams.set(
      isApproved ? "welcome" : "farm_request",
      isApproved ? "approved" : "submitted"
    );
    if (result.farm_id) target.searchParams.set("farm_id", String(result.farm_id));
    target.searchParams.set("farm_name", result.farm_name);
    target.searchParams.set("email", result.email);
    target.searchParams.set("status", result.status);
    target.searchParams.set("species", result.species || currentFarmFlowSpecies());
    target.searchParams.set("t", String(Date.now()));

    document.body.dataset.farmRegistrationSuccess = "true";

    /*
     * ใช้ href โดยตรงและมีปุ่มสำรองบน Modal
     * หากส่วนขยายเบราว์เซอร์หรือ Live Server ขัดขวางการเปลี่ยนหน้า
     */
    try {
      window.location.href = target.href;
    } catch (navigationError) {
      console.error("Farm navigation error:", navigationError);
    }

    window.setTimeout(() => {
      showFarmSuccess(result);
      const fallbackLink = document.getElementById("farmSuccessLoginButton");
      if (fallbackLink) {
        fallbackLink.href = target.href;
        fallbackLink.innerHTML = isApproved
          ? 'เปิดหน้าจัดการฟาร์ม <span aria-hidden="true">→</span>'
          : 'เปิดหน้าสถานะคำขอ <span aria-hidden="true">→</span>';
      }
    }, 500);
  }

  async function fetchMyFarmStatus(idToken, { silent = true } = {}) {
    if (!idToken) return null;

    try {
      const response = await fetch(STATUS_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));
      if (response.status === 404) return null;
      if (!response.ok || result.success === false) {
        if (!silent) showStatus(result.message || "ตรวจสอบสถานะคำขอฟาร์มไม่สำเร็จ");
        return null;
      }

      return result.farm || null;
    } catch (error) {
      if (!silent) showStatus("เชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบสถานะไม่ได้");
      return null;
    }
  }

  function showFarmSuccess(farm = {}) {
    if (!successModal) {
      throw new Error("ไม่พบหน้าต่างยืนยันการลงทะเบียนฟาร์ม");
    }

    const successName = document.getElementById("farmSuccessName");
    const successEmail = document.getElementById("farmSuccessEmail");
    const loginButton = document.getElementById("farmSuccessLoginButton");

    if (successName) {
      successName.textContent = String(farm.farm_name || "ฟาร์มของคุณ");
    }

    if (successEmail) {
      successEmail.textContent = String(farm.email || "");
    }

    successModal.hidden = false;
    successModal.removeAttribute("hidden");
    successModal.classList.remove("is-celebrating");
    void successModal.offsetWidth;
    successModal.classList.add("is-celebrating");
    document.body.style.overflow = "hidden";

    window.setTimeout(() => loginButton?.focus(), 120);
  }

  function clearStatus() {
    showStatus("");
  }

  function getErrorElement(fieldName) {
    return document.querySelector(`[data-error-for="${fieldName}"]`);
  }

  function getVisualShell(field) {
    if (!field) return null;
    if (field === certificateInput) return uploadZone;
    if (field.tagName === "SELECT") return field.closest(".farm-select-shell");
    if (field.tagName === "TEXTAREA" || field.classList.contains("farm-plain-input")) return field;
    if (field.type === "checkbox") return field.closest(".farm-consent");
    return field.closest(".farm-input-shell") || field;
  }

  function setFieldError(fieldName, message = "") {
    const field = fieldElementMap[fieldName];
    const errorElement = getErrorElement(fieldName);
    const visual = getVisualShell(field);

    if (errorElement) errorElement.textContent = message;
    if (visual) {
      visual.classList.toggle("is-invalid", Boolean(message));
      if (message) visual.classList.remove("is-valid");
    }
    if (field && field.type !== "file") {
      field.setAttribute("aria-invalid", message ? "true" : "false");
    }
  }

  function markFieldValid(fieldName) {
    const field = fieldElementMap[fieldName];
    const visual = getVisualShell(field);
    if (visual) {
      visual.classList.remove("is-invalid");
      visual.classList.add("is-valid");
    }
    if (field && field.type !== "file") field.setAttribute("aria-invalid", "false");
    const errorElement = getErrorElement(fieldName);
    if (errorElement) errorElement.textContent = "";
  }

  function clearFieldError(fieldName) {
    const field = fieldElementMap[fieldName];
    const errorElement = getErrorElement(fieldName);
    const visual = getVisualShell(field);
    if (errorElement) errorElement.textContent = "";
    if (visual) visual.classList.remove("is-invalid");
    if (field && field.type !== "file") field.setAttribute("aria-invalid", "false");
  }

  function clearAllErrors() {
    Object.keys(fieldElementMap).forEach(clearFieldError);
  }

  function goToStep(stepNumber) {
    const target = Math.min(3, Math.max(1, Number(stepNumber) || 1));
    currentStep = target;
    highestStep = Math.max(highestStep, target);

    steps.forEach((step) => {
      step.classList.toggle("is-active", Number(step.dataset.step) === target);
    });

    indicators.forEach((indicator) => {
      const step = Number(indicator.dataset.stepTarget);
      indicator.classList.toggle("is-active", step === target);
      indicator.classList.toggle("is-complete", step < target);
      indicator.disabled = step > highestStep;
      if (step === target) indicator.setAttribute("aria-current", "step");
      else indicator.removeAttribute("aria-current");
    });

    if (progress) progress.style.width = `${((target - 1) / 2) * 66.68}%`;
    saveFarmDraft();
    if (backButton) backButton.hidden = target === 1;
    if (nextButton) nextButton.hidden = target === 3;
    if (submitButton) submitButton.hidden = target !== 3;

    clearStatus();
    document.querySelector(".farm-register-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function normalizeOwnerName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function getSelectedDialCode() {
    return phoneCountrySelect?.selectedOptions?.[0]?.dataset?.code || "+66";
  }

  function updateDialCode() {
    if (dialCodeElement) dialCodeElement.textContent = getSelectedDialCode();
  }

  function toE164Phone() {
    let digits = String(phoneInput?.value || "").replace(/\D/g, "");
    if (!digits) return "";
    digits = digits.replace(/^0+/, "");
    const dialDigits = getSelectedDialCode().replace(/\D/g, "");
    if (digits.startsWith(dialDigits)) digits = digits.slice(dialDigits.length);
    return `+${dialDigits}${digits}`;
  }

  function formatPhoneInput() {
    if (!phoneInput) return;

    // รูปแบบเดียวกับหน้าสมัครสมาชิก: เลขภายในประเทศ 9 หลัก
    // เช่น 0812345678 จะแสดงเป็น 81 234 5678 และระบบเติม +66 ให้เอง
    const digits = phoneInput.value
      .replace(/\D/g, "")
      .replace(/^0+/, "")
      .slice(0, 9);

    const parts = [];
    if (digits.length > 0) parts.push(digits.slice(0, 2));
    if (digits.length > 2) parts.push(digits.slice(2, 5));
    if (digits.length > 5) parts.push(digits.slice(5, 9));
    phoneInput.value = parts.join(" ");
  }

  function normalizePasswordTerm(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function passwordUsesPersonalData(value) {
    const normalizedPassword = normalizePasswordTerm(value);
    if (!normalizedPassword) return false;
    const emailLocal = String(emailInput?.value || "").split("@")[0];
    const candidates = [fieldElementMap.owner_name?.value, emailLocal, farmNameInput?.value]
      .flatMap((item) => String(item || "").toLowerCase().split(/[^a-z0-9]+/))
      .map(normalizePasswordTerm)
      .filter((item) => item.length >= 3);
    return candidates.some((item) => normalizedPassword.includes(item));
  }

  function getPasswordRules(value) {
    return {
      length: value.length === 10,
      letters: /[a-z]/.test(value) && /[A-Z]/.test(value),
      numberSpecial: /\d/.test(value) && /[^A-Za-z0-9]/.test(value) && !/\s/.test(value),
      safe: Boolean(value) && !passwordUsesPersonalData(value),
    };
  }

  function updatePasswordRules() {
    const value = passwordInput?.value || "";
    const rules = getPasswordRules(value);
    const passed = Object.values(rules).filter(Boolean).length;
    const ratio = passed / Object.keys(rules).length;
    const panel = document.getElementById("farmPasswordRules");
    const track = panel?.querySelector(".strength-track span");
    const label = panel?.querySelector(".strength-row strong");

    Object.entries(rules).forEach(([name, valid]) => {
      const chip = panel?.querySelector(`[data-rule="${name}"]`);
      chip?.classList.toggle("is-valid", valid);
      chip?.classList.toggle("is-invalid", Boolean(value) && !valid);
    });

    if (track) {
      track.style.width = `${ratio * 100}%`;
      track.style.background = passed === 4 ? "#6a9e8f" : ratio >= 0.5 ? "#d7a85f" : "#d7736b";
    }
    if (label) {
      label.textContent = !value ? "ยังไม่ได้กรอก" : passed === 4 ? "ปลอดภัย พร้อมใช้งาน" : `ผ่าน ${passed} จาก 4 เงื่อนไข`;
      label.style.color = passed === 4 ? "#4d7c6f" : ratio >= 0.5 ? "#9b722f" : "#bf625f";
    }
  }

  function validateUrlField(fieldName) {
    const field = fieldElementMap[fieldName];
    const value = String(field?.value || "").trim();
    if (!value) {
      setFieldError(fieldName, fieldName === "website" ? "กรุณากรอกเว็บไซต์ของฟาร์ม" : "กรุณากรอกลิงก์ Facebook ของฟาร์ม");
      return false;
    }
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid");
      markFieldValid(fieldName);
      return true;
    } catch (_error) {
      setFieldError(fieldName, `${fieldName === "website" ? "เว็บไซต์" : "ลิงก์ Facebook"} ต้องขึ้นต้นด้วย http:// หรือ https://`);
      return false;
    }
  }

  function validateStepOne() {
    let valid = true;
    const ownerName = normalizeOwnerName(fieldElementMap.owner_name?.value);
    const email = String(emailInput?.value || "").trim().toLowerCase();
    const password = passwordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";
    const phone = toE164Phone();

    if (ownerName.length < 3 || !/^[A-Za-z][A-Za-z .'-]*$/.test(ownerName)) {
      setFieldError("owner_name", "กรุณากรอกชื่อ–นามสกุลด้วยตัวอักษรภาษาอังกฤษเท่านั้น");
      valid = false;
    } else markFieldValid("owner_name");

    const nationalPhoneDigits = String(phoneInput?.value || "").replace(/\D/g, "");
    if (nationalPhoneDigits.length !== 9) {
      setFieldError("phone", "กรุณากรอกเบอร์โทรศัพท์ 9 หลัก เช่น 0812345678");
      valid = false;
    } else if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      setFieldError("phone", "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง");
      valid = false;
    } else markFieldValid("phone");

    if (!isValidEmail(email)) {
      setFieldError("email", "รูปแบบอีเมลไม่ถูกต้อง");
      valid = false;
    } else if (availabilityState.email === false) {
      setFieldError("email", "อีเมลนี้มีบัญชีใน CatMatch อยู่แล้ว");
      valid = false;
    } else markFieldValid("email");

    const rules = getPasswordRules(password);
    if (!Object.values(rules).every(Boolean)) {
      setFieldError("password", "รหัสผ่านต้องมี 10 ตัวพอดี พร้อมพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และสัญลักษณ์");
      valid = false;
    } else markFieldValid("password");

    if (!confirmPassword || confirmPassword !== password) {
      setFieldError("confirm_password", "รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      valid = false;
    } else markFieldValid("confirm_password");

    return valid;
  }

  function validateStepTwo() {
    let valid = true;
    const farmName = String(farmNameInput?.value || "").trim();
    const description = String(descriptionInput?.value || "").trim();
    const linePhone = String(fieldElementMap.line_contact?.value || "").replace(/\D/g, "");
    const certificateNo = String(fieldElementMap.certificate_no?.value || "").trim();

    if (farmName.length < 2) {
      setFieldError("farm_name", "กรุณากรอกชื่อฟาร์มอย่างน้อย 2 ตัวอักษร");
      valid = false;
    } else if (availabilityState.farm_name === false) {
      setFieldError("farm_name", "ชื่อฟาร์มนี้มีอยู่ในระบบแล้ว");
      valid = false;
    } else markFieldValid("farm_name");

    if (description.length < 10) {
      setFieldError("description", "กรุณาแนะนำฟาร์มอย่างน้อย 10 ตัวอักษร");
      valid = false;
    } else markFieldValid("description");

    if (!validateUrlField("website")) valid = false;
    if (!validateUrlField("facebook")) valid = false;

    if (!/^0\d{9}$/.test(linePhone)) {
      setFieldError("line_contact", "กรุณากรอกเบอร์โทรศัพท์ติดต่อ 10 หลัก เช่น 0812345678");
      valid = false;
    } else {
      fieldElementMap.line_contact.value = linePhone;
      markFieldValid("line_contact");
    }

    if (certificateNo.length < 3) {
      setFieldError("certificate_no", "กรุณากรอกเลขทะเบียนฟาร์มอย่างน้อย 3 ตัวอักษร");
      valid = false;
    } else markFieldValid("certificate_no");

    if (!certificateData) {
      setFieldError("certificate_file", "กรุณาแนบใบรับรองฟาร์ม PDF, JPG หรือ PNG");
      valid = false;
    } else markFieldValid("certificate_file");

    return valid;
  }

  function validateStepThree() {
    let valid = true;
    const province = provinceSelect?.value || "";
    const district = districtSelect?.value || "";
    const address = String(fieldElementMap.address?.value || "").trim();
    const latitude = fieldElementMap.latitude?.value;
    const longitude = fieldElementMap.longitude?.value;

    if (!province) {
      setFieldError("province", "กรุณาเลือกจังหวัด");
      valid = false;
    } else markFieldValid("province");

    if (!district) {
      setFieldError("district", "กรุณาเลือกอำเภอหรือเขต");
      valid = false;
    } else markFieldValid("district");

    if (address.length < 5) {
      setFieldError("address", "กรุณากรอกรายละเอียดที่อยู่อย่างน้อย 5 ตัวอักษร");
      valid = false;
    } else markFieldValid("address");

    if (latitude !== "" && (Number(latitude) < -90 || Number(latitude) > 90)) {
      setFieldError("latitude", "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90");
      valid = false;
    } else clearFieldError("latitude");

    if (longitude !== "" && (Number(longitude) < -180 || Number(longitude) > 180)) {
      setFieldError("longitude", "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180");
      valid = false;
    } else clearFieldError("longitude");

    if (!termsInput?.checked) {
      setFieldError("terms", "กรุณายืนยันข้อมูลและยอมรับข้อกำหนดก่อนส่งคำขอ");
      valid = false;
    } else clearFieldError("terms");

    return valid;
  }

  function validateCurrentStep() {
    if (currentStep === 1) return validateStepOne();
    if (currentStep === 2) return validateStepTwo();
    return validateStepThree();
  }

  async function checkAvailability(fieldName, value, { silent = false } = {}) {
    const indicator = fieldName === "email"
      ? document.getElementById("emailAvailability")
      : document.getElementById("farmNameAvailability");

    if (indicator) indicator.textContent = "…";

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 7000);
      const response = await fetch(AVAILABILITY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: fieldName, value }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "ไม่สามารถตรวจสอบข้อมูลได้");

      availabilityState[fieldName] = Boolean(result.available);
      if (indicator) indicator.textContent = result.available ? "✓" : "✕";

      if (!result.available) {
        setFieldError(fieldName, result.message || "ข้อมูลนี้มีอยู่ในระบบแล้ว");
        return false;
      }

      markFieldValid(fieldName);
      return true;
    } catch (error) {
      availabilityState[fieldName] = null;
      if (indicator) indicator.textContent = "";
      if (!silent) {
        showStatus(error.name === "AbortError" ? "การตรวจสอบข้อมูลใช้เวลานานเกินไป" : error.message);
      }
      return true;
    }
  }

  function setupAvailabilityField(fieldName, input, localValidator) {
    if (!input) return;

    const run = async (silent = true) => {
      const value = input.value.trim();
      if (!localValidator(value)) return true;
      return checkAvailability(fieldName, value, { silent });
    };

    input.addEventListener("input", () => {
      availabilityState[fieldName] = null;
      clearFieldError(fieldName);
      const indicator = fieldName === "email"
        ? document.getElementById("emailAvailability")
        : document.getElementById("farmNameAvailability");
      if (indicator) indicator.textContent = "";
      window.clearTimeout(availabilityTimers.get(fieldName));
      availabilityTimers.set(fieldName, window.setTimeout(() => void run(true), 650));
    });

    input.addEventListener("blur", () => {
      window.clearTimeout(availabilityTimers.get(fieldName));
      void run(true);
    });
  }

  async function verifyStepAvailability() {
    if (currentStep === 1 && isValidEmail(emailInput?.value)) {
      return checkAvailability("email", emailInput.value.trim().toLowerCase());
    }
    if (currentStep === 2 && String(farmNameInput?.value || "").trim().length >= 2) {
      return checkAvailability("farm_name", farmNameInput.value.trim());
    }
    return true;
  }

  function getProvinceDistricts(province) {
    if (!province) return [];
    if (Array.isArray(province.districts)) return province.districts;
    if (Array.isArray(province.district)) return province.district;
    if (Array.isArray(province.amphure)) return province.amphure;
    return [];
  }

  function getDistrictSubdistricts(district) {
    if (!district) return [];
    if (Array.isArray(district.sub_districts)) return district.sub_districts;
    if (Array.isArray(district.subdistricts)) return district.subdistricts;
    if (Array.isArray(district.tambons)) return district.tambons;
    if (Array.isArray(district.tambon)) return district.tambon;
    return [];
  }

  function locationName(item) {
    return String(item?.name_th || item?.name_en || item?.name || "").trim();
  }

  function readLocationCache() {
    for (const cacheKey of LOCATION_CACHE_KEYS) {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (Array.isArray(cached) && cached.length) return cached;
      } catch (_error) {
        // ลอง cache key ถัดไป
      }
    }
    return null;
  }

  function writeLocationCache(data) {
    for (const cacheKey of LOCATION_CACHE_KEYS) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (_error) {
        // Cache is optional.
      }
    }
  }

  async function fetchThailandLocations(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "force-cache",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!Array.isArray(result) || !result.length) {
        throw new Error("ข้อมูลพื้นที่ไม่ถูกต้อง");
      }
      return result;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function populateSelect(select, items, placeholder) {
    if (!select) return;
    select.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = placeholder;
    select.appendChild(emptyOption);

    items.forEach((item, index) => {
      const name = locationName(item);
      if (!name) return;
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      option.dataset.index = String(index);
      select.appendChild(option);
    });

    select.disabled = items.length === 0;
  }

  async function loadThailandLocations() {
    const cached = readLocationCache();
    if (cached?.length) {
      thailandLocations = cached;
      populateSelect(provinceSelect, thailandLocations, "เลือกจังหวัด");
      if (locationLoading) locationLoading.hidden = true;
      return;
    }

    let lastError = null;
    for (const url of THAILAND_LOCATION_URLS) {
      try {
        const result = await fetchThailandLocations(url);
        thailandLocations = result;
        writeLocationCache(result);
        populateSelect(provinceSelect, thailandLocations, "เลือกจังหวัด");
        if (locationLoading) locationLoading.hidden = true;
        return;
      } catch (error) {
        lastError = error;
        console.warn("Thailand location source unavailable:", url, error);
      }
    }

    console.error("Load Thailand locations error:", lastError);
    if (locationLoading) {
      locationLoading.hidden = false;
      locationLoading.innerHTML = `
        <span>โหลดรายชื่อพื้นที่ไม่สำเร็จ</span>
        <button type="button" id="retryFarmLocations">ลองโหลดอีกครั้ง</button>
      `;
      document.getElementById("retryFarmLocations")?.addEventListener("click", async () => {
        locationLoading.innerHTML = `
          <span class="farm-location-skeleton"></span>
          <span>กำลังเตรียมรายชื่อจังหวัด อำเภอ และตำบล...</span>
        `;
        await loadThailandLocations();
      }, { once: true });
    }
    provinceSelect.disabled = true;
  }

  function handleProvinceChange() {
    const index = Number(provinceSelect?.selectedOptions?.[0]?.dataset.index);
    const province = Number.isInteger(index) ? thailandLocations[index] : null;
    const districts = getProvinceDistricts(province);
    populateSelect(districtSelect, districts, "เลือกอำเภอหรือเขต");
    populateSelect(subdistrictSelect, [], "เลือกตำบลหรือแขวง");
    clearFieldError("province");
  }

  function handleDistrictChange() {
    const provinceIndex = Number(provinceSelect?.selectedOptions?.[0]?.dataset.index);
    const districtIndex = Number(districtSelect?.selectedOptions?.[0]?.dataset.index);
    const province = Number.isInteger(provinceIndex) ? thailandLocations[provinceIndex] : null;
    const district = Number.isInteger(districtIndex) ? getProvinceDistricts(province)[districtIndex] : null;
    populateSelect(subdistrictSelect, getDistrictSubdistricts(district), "เลือกตำบลหรือแขวง");
    clearFieldError("district");
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์หลักฐานได้"));
      reader.readAsDataURL(file);
    });
  }

  async function acceptCertificateFile(file) {
    clearFieldError("certificate_file");

    if (!file) {
      certificateData = "";
      if (filePreview) filePreview.hidden = true;
      return false;
    }

    if (!ALLOWED_CERTIFICATE_TYPES.has(file.type)) {
      setFieldError("certificate_file", "ไฟล์หลักฐานต้องเป็น PDF, JPG หรือ PNG");
      certificateInput.value = "";
      return false;
    }

    if (file.size > MAX_CERTIFICATE_SIZE) {
      setFieldError("certificate_file", "ไฟล์หลักฐานต้องมีขนาดไม่เกิน 3 MB");
      certificateInput.value = "";
      return false;
    }

    try {
      certificateData = await readFileAsDataUrl(file);
      if (fileNameElement) fileNameElement.textContent = file.name;
      if (fileSizeElement) fileSizeElement.textContent = formatBytes(file.size);
      if (fileTypeElement) fileTypeElement.textContent = file.type === "application/pdf" ? "PDF" : file.type === "image/png" ? "PNG" : "JPG";
      if (filePreview) filePreview.hidden = false;
      markFieldValid("certificate_file");
      return true;
    } catch (error) {
      certificateData = "";
      setFieldError("certificate_file", error.message);
      return false;
    }
  }

  function removeCertificate() {
    certificateData = "";
    if (certificateInput) certificateInput.value = "";
    if (filePreview) filePreview.hidden = true;
    clearFieldError("certificate_file");
  }

  function setLoading(loading) {
    if (!submitButton) return;
    submitButton.disabled = loading;
    submitButton.setAttribute("aria-busy", String(loading));
    if (submitLabel) submitLabel.hidden = loading;
    if (submitLoading) submitLoading.hidden = !loading;
    if (backButton) backButton.disabled = loading;
  }

  function getFirebaseErrorMessage(error) {
    const messages = {
      "auth/email-already-in-use": "อีเมลนี้มีบัญชี Firebase อยู่แล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบด้วยช่องทางเดิม",
      "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
      "auth/weak-password": "รหัสผ่านไม่ผ่านเงื่อนไขของ Firebase",
      "auth/network-request-failed": "ไม่สามารถเชื่อมต่อ Firebase ได้ กรุณาตรวจสอบอินเทอร์เน็ต",
      "auth/too-many-requests": "มีการส่งคำขอหลายครั้งเกินไป กรุณารอสักครู่",
      "auth/operation-not-allowed": "Firebase ยังไม่ได้เปิดใช้งาน Email/Password",
    };
    return messages[String(error?.code || "")] || error?.message || "ไม่สามารถสร้างบัญชี Firebase ได้";
  }

  function applyServerFieldErrors(errors) {
    if (!errors || typeof errors !== "object") return;
    Object.entries(errors).forEach(([name, message]) => setFieldError(name, String(message)));

    const names = new Set(Object.keys(errors));
    const stepOne = ["owner_name", "email", "phone", "phone_country", "password", "confirm_password"];
    const stepTwo = ["farm_name", "description", "website", "facebook", "line_contact", "certificate_no", "certificate_file"];

    if (stepOne.some((name) => names.has(name))) goToStep(1);
    else if (stepTwo.some((name) => names.has(name))) goToStep(2);
    else goToStep(3);
  }

  async function deleteOrphanFirebaseAccount(credential) {
    if (!credential?.user) return;
    try {
      await credential.user.delete();
    } catch (error) {
      console.warn("ลบบัญชี Firebase ที่สร้างไม่สำเร็จ:", error.code || error.message);
      await window.catmatchFirebase?.signOut?.().catch(() => {});
    }
  }

  async function submitFarmRegistration(event) {
    event.preventDefault();
    clearStatus();
    clearAllErrors();

    if (!validateStepOne()) {
      goToStep(1);
      showStatus("กรุณาตรวจข้อมูลบัญชีเจ้าของฟาร์ม");
      return;
    }
    if (!validateStepTwo()) {
      goToStep(2);
      showStatus("กรุณาตรวจข้อมูลฟาร์มและไฟล์หลักฐาน");
      return;
    }
    if (!validateStepThree()) {
      goToStep(3);
      showStatus("กรุณาตรวจข้อมูลที่อยู่และการยืนยันข้อมูล");
      return;
    }

    if (!window.catmatchFirebase?.configured) {
      showStatus("ยังไม่ได้ตั้งค่า Firebase กรุณาตรวจสอบ client/js/firebase-config.js");
      return;
    }

    setLoading(true);
    let credential = null;
    let backendCompleted = false;

    const payload = {
      owner_name: normalizeOwnerName(fieldElementMap.owner_name.value),
      email: emailInput.value.trim().toLowerCase(),
      password: passwordInput.value,
      phone: toE164Phone(),
      phone_country: phoneCountrySelect?.value || "TH",
      farm_name: farmNameInput.value.trim(),
      description: descriptionInput.value.trim(),
      website: fieldElementMap.website.value.trim(),
      facebook: fieldElementMap.facebook.value.trim(),
      line_contact: fieldElementMap.line_contact.value.trim(),
      certificate_no: fieldElementMap.certificate_no.value.trim(),
      certificate_data: certificateData,
      country: "Thailand",
      province: provinceSelect.value,
      district: districtSelect.value,
      subdistrict: subdistrictSelect.value || null,
      address: fieldElementMap.address.value.trim(),
      latitude: fieldElementMap.latitude.value || null,
      longitude: fieldElementMap.longitude.value || null,
    };

    try {
      await window.catmatchFirebase.useSessionPersistence();

      try {
        credential = await window.catmatchFirebase.createEmailAccount(
          payload.email,
          payload.password
        );
      } catch (firebaseCreateError) {
        /*
         * กรณีกดส่งครั้งก่อนแล้ว Firebase สร้างบัญชีสำเร็จ แต่หน้าเว็บยังไม่ทันเปลี่ยนหน้า
         * ให้เข้าสู่ระบบบัญชีเดิมด้วยรหัสผ่านที่กรอก แล้วส่งคำขอแบบ idempotent ต่อได้
         */
        if (String(firebaseCreateError?.code || "") !== "auth/email-already-in-use") {
          throw firebaseCreateError;
        }

        credential = await window.catmatchFirebase.emailLogin(
          payload.email,
          payload.password
        );
      }

      const idToken = await window.catmatchFirebase.getIdToken(credential.user, true);

      /*
       * หากคำขอถูกบันทึกไปแล้วจากการกดครั้งก่อน
       * ให้เปิดหน้าสถานะทันที ไม่ส่งคำขอซ้ำและไม่ติด Rate Limit
       */
      const existingFarm = await fetchMyFarmStatus(idToken);
      if (existingFarm) {
        backendCompleted = true;
        navigateToFarmStatus(existingFarm);
        return;
      }

      const response = await fetch(REGISTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        if (result.errors) applyServerFieldErrors(result.errors);
        if (response.status === 404) throw new Error("ไม่พบ API ลงทะเบียนฟาร์ม กรุณาตรวจสอบ farmRegisterRoutes และ app.js");
        if (response.status === 413) throw new Error("ไฟล์หลักฐานมีขนาดใหญ่เกินกำหนด");
        throw new Error(result.message || "ไม่สามารถลงทะเบียนฟาร์มได้");
      }

      backendCompleted = true;

      const registeredFarm = {
        ...(result.farm || {}),
        farm_name: result.farm?.farm_name || payload.farm_name,
        email: result.farm?.email || payload.email,
        status: result.farm?.status || "pending",
      };

      showStatus(
        "ส่งคำขอเรียบร้อยแล้ว กำลังเปิดหน้าสถานะการอนุมัติ...",
        "success"
      );
      navigateToFarmStatus(registeredFarm);
      return;
    } catch (error) {
      /*
       * ตรวจซ้ำอีกครั้งก่อนแจ้ง Error เพราะ Backend อาจบันทึกสำเร็จแล้ว
       * แต่การตอบกลับถูกตัดหรือเบราว์เซอร์มองเป็น Network Error
       */
      if (credential?.user) {
        try {
          const recoveryToken = await window.catmatchFirebase.getIdToken(
            credential.user,
            true
          );
          const recoveredFarm = await fetchMyFarmStatus(recoveryToken);
          if (recoveredFarm) {
            backendCompleted = true;
            navigateToFarmStatus(recoveredFarm);
            return;
          }
        } catch (_recoveryError) {}
      }

      if (credential && !backendCompleted) {
        await deleteOrphanFirebaseAccount(credential);
      }

      const message =
        error instanceof TypeError || error.message === "Failed to fetch"
          ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาเปิด Backend ด้วย npm run dev"
          : getFirebaseErrorMessage(error);
      showStatus(message);
      console.error("Farm registration failed:", error);
    } finally {
      if (!backendCompleted) {
        setLoading(false);
      }
    }
  }

  nextButton?.addEventListener("click", async () => {
    clearStatus();
    if (!validateCurrentStep()) {
      showStatus("กรุณากรอกข้อมูลที่จำเป็นให้ครบก่อนดำเนินการต่อ");
      document.querySelector(".is-invalid input, .is-invalid select, textarea.is-invalid")?.focus();
      return;
    }

    const available = await verifyStepAvailability();
    if (!available) {
      showStatus("พบข้อมูลที่มีอยู่ในระบบแล้ว กรุณาแก้ไขก่อนดำเนินการต่อ");
      return;
    }

    goToStep(currentStep + 1);
  });

  backButton?.addEventListener("click", () => goToStep(currentStep - 1));
  indicators.forEach((indicator) => {
    indicator.addEventListener("click", () => {
      const target = Number(indicator.dataset.stepTarget);
      if (target <= highestStep) goToStep(target);
    });
  });

  function blockPasswordTransfer(event, message) {
    event.preventDefault();
    setFieldError("confirm_password", message);
    showStatus(message);
  }

  passwordInput?.addEventListener("copy", (event) => blockPasswordTransfer(event, "ไม่อนุญาตให้คัดลอกรหัสผ่าน กรุณาพิมพ์ยืนยันรหัสผ่านด้วยตนเอง"));
  passwordInput?.addEventListener("cut", (event) => blockPasswordTransfer(event, "ไม่อนุญาตให้ตัดรหัสผ่าน กรุณาพิมพ์ยืนยันรหัสผ่านด้วยตนเอง"));
  confirmPasswordInput?.addEventListener("paste", (event) => blockPasswordTransfer(event, "ไม่อนุญาตให้วางรหัสผ่านในช่องยืนยัน กรุณาพิมพ์ด้วยตนเอง"));
  confirmPasswordInput?.addEventListener("drop", (event) => blockPasswordTransfer(event, "ไม่อนุญาตให้ลากรหัสผ่านมาวางในช่องยืนยัน กรุณาพิมพ์ด้วยตนเอง"));

  phoneInput?.addEventListener("input", () => {
    formatPhoneInput();
    clearFieldError("phone");
    saveFarmDraft();
  });
  phoneCountrySelect?.addEventListener("change", () => {
    updateDialCode();
    clearFieldError("phone");
    clearFieldError("phone_country");
    saveFarmDraft();
  });
  passwordInput?.addEventListener("input", () => {
    updatePasswordRules();
    clearFieldError("password");
  });
  confirmPasswordInput?.addEventListener("input", () => clearFieldError("confirm_password"));
  descriptionInput?.addEventListener("input", () => {
    if (descriptionCount) descriptionCount.textContent = `${descriptionInput.value.length.toLocaleString("th-TH")} / 2,000`;
    clearFieldError("description");
    saveFarmDraft();
  });

  setupAvailabilityField("email", emailInput, isValidEmail);
  setupAvailabilityField("farm_name", farmNameInput, (value) => value.length >= 2);

  certificateInput?.addEventListener("change", () => void acceptCertificateFile(certificateInput.files?.[0]));
  removeFileButton?.addEventListener("click", removeCertificate);

  uploadZone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadZone.classList.add("is-dragover");
  });
  uploadZone?.addEventListener("dragleave", () => uploadZone.classList.remove("is-dragover"));
  uploadZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadZone.classList.remove("is-dragover");
    const file = event.dataTransfer?.files?.[0];
    if (file) void acceptCertificateFile(file);
  });

  provinceSelect?.addEventListener("change", handleProvinceChange);
  districtSelect?.addEventListener("change", handleDistrictChange);
  subdistrictSelect?.addEventListener("change", () => clearFieldError("subdistrict"));
  termsInput?.addEventListener("change", () => { clearFieldError("terms"); saveFarmDraft(); });
  fieldElementMap.line_contact?.addEventListener("input", () => {
    fieldElementMap.line_contact.value = fieldElementMap.line_contact.value.replace(/\D/g, "").slice(0, 10);
    clearFieldError("line_contact");
    saveFarmDraft();
  });
  legalLinks.forEach((link) => link.addEventListener("click", saveFarmDraft));

  Object.entries(fieldElementMap).forEach(([name, field]) => {
    if (!field || ["email", "farm_name", "phone", "password", "confirm_password", "certificate_file", "terms"].includes(name)) return;
    field.addEventListener("input", () => { clearFieldError(name); saveFarmDraft(); });
    field.addEventListener("change", () => { clearFieldError(name); saveFarmDraft(); });
  });

  form.addEventListener("submit", submitFarmRegistration);

  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.querySelector(".main-nav");
  menuToggle?.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    mainNav?.classList.toggle("is-open", !expanded);
  });

  function recoverExistingFarmSession() {
    const auth = window.catmatchFirebase?.auth;
    if (!auth?.onAuthStateChanged) return;

    let handled = false;
    auth.onAuthStateChanged(async (user) => {
      if (handled || !user) return;

      try {
        const idToken = await window.catmatchFirebase.getIdToken(user, true);
        const farm = await fetchMyFarmStatus(idToken);
        if (!farm) return;

        handled = true;
        showStatus("พบคำขอลงทะเบียนเดิม กำลังเปิดหน้าสถานะ...", "success");
        navigateToFarmStatus(farm);
      } catch (_error) {}
    });
  }

  updateDialCode();
  updatePasswordRules();
  recoverExistingFarmSession();

  (async () => {
    /*
     * เปิดหน้าลงทะเบียนตามปกติหรือรีเฟรชหน้า = เริ่มฟอร์มใหม่
     * คืนค่าร่างเฉพาะตอนย้อนกลับจากข้อกำหนด/นโยบายด้วย restore=1
     */
    if (shouldStartFresh) {
      resetFreshRegistrationForm();
    }

    await loadThailandLocations();

    const restoredStep = shouldRestoreDraft
      ? await restoreFarmDraft()
      : 1;

    goToStep(restoredStep);
  })();

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || !shouldStartFresh) return;

    resetFreshRegistrationForm();
    void loadThailandLocations();
    goToStep(1);
  });
})();
