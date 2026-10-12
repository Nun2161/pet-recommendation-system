"use strict";

const PROFILE_ENDPOINT = `${window.CATMATCH_API_URL}/auth/onboarding/google-profile`;
const PROFILE_REQUEST_TIMEOUT_MS = 8000;

const AUTH_KEYS = [
  "catmatch_token",
  "userToken",
  "token",
  "catmatch_user",
  "user",
  "catmatch_role",
  "catmatch_auth_uid",
  "catmatch_auth_user_id",
  "catmatch_auth_email",
];

const accountState = {
  profile: null,
  editing: false,
};

const fields = [
  "name",
  "username",
  "nickname",
  "birthDate",
  "gender",
  "phoneCountry",
  "phone",
  "country",
  "province",
  "district",
  "subdistrict",
  "address",
];

document.addEventListener("DOMContentLoaded", initializeAccountPage);

async function initializeAccountPage() {
  if (window.CatMatchUserSession?.ensure) {
    await window.CatMatchUserSession.ensure().catch((error) => {
      console.warn("Account session validation failed:", error);
    });
  }

  const token = getToken();

  if (!token) {
    window.location.replace("./login.html?return=account-info");
    return;
  }

  setupAccountNavigation();
  setupMenus();
  setupFormActions();
  setupProfileImage();

  // แสดงข้อมูลจากเซสชันของบัญชีปัจจุบันทันที ไม่ปล่อยให้หน้าค้างที่ Skeleton
  // ระหว่างรอข้อมูลล่าสุดจาก Backend
  const storedProfile = getStoredUser();
  if (storedProfile) {
    accountState.profile = storedProfile;
    renderProfile(storedProfile);
    setEditing(false);
    setLoading(false);
  }

  void loadProfile({ preserveVisibleProfile: Boolean(storedProfile) });
}

function readStoredJSON(key) {
  for (const storage of [sessionStorage, localStorage]) {
    const raw = storage.getItem(key);
    if (!raw) continue;

    try {
      return JSON.parse(raw);
    } catch (_error) {
      // ข้ามค่าที่ไม่ใช่ JSON
    }
  }

  return null;
}

function getToken() {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of ["catmatch_token", "userToken", "token"]) {
      const token = storage.getItem(key);
      if (token) return token;
    }
  }

  return "";
}

function getStoredUser() {
  const records = [];
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of ["catmatch_user", "user"]) {
      try {
        const value = JSON.parse(storage.getItem(key) || "null");
        if (value && typeof value === "object") records.push(value);
      } catch (_error) {
        // ข้ามข้อมูลที่อ่านไม่ได้
      }
    }
  }
  if (!records.length) return null;

  const activeUid = readStoredString(["catmatch_auth_uid"]);
  const activeEmail = readStoredString(["catmatch_auth_email"]).toLowerCase();
  const matching = records.filter((record) => {
    const uid = String(record?.firebase_uid || record?.uid || "").trim();
    const email = String(record?.email || "").trim().toLowerCase();
    let comparable = false;
    if (activeUid && uid) {
      comparable = true;
      if (activeUid !== uid) return false;
    }
    if (activeEmail && email) {
      comparable = true;
      if (activeEmail !== email) return false;
    }
    return comparable;
  });
  if (!matching.length) return records[0];

  const merged = Object.assign({}, ...matching.slice().reverse());
  const googlePhotoRecord = matching.find((record) =>
    String(record?.google_photo_uid || "").trim() === activeUid &&
    /^https?:\/\//i.test(String(record?.google_photo_url || "").trim())
  );
  if (googlePhotoRecord) {
    merged.google_photo_uid = googlePhotoRecord.google_photo_uid;
    merged.google_photo_url = googlePhotoRecord.google_photo_url;
  }
  return merged;
}

function clearAuth() {
  for (const storage of [sessionStorage, localStorage]) {
    AUTH_KEYS.forEach((key) => storage.removeItem(key));
  }
}

function getDisplayName(user) {
  return String(
    user?.username ||
    user?.full_name ||
    user?.name ||
    "ผู้ใช้งาน"
  ).trim();
}

function setupAccountNavigation() {
  const user = getStoredUser();
  const name = getDisplayName(user);
  const email = String(user?.email || "").trim();
  const initial = name.charAt(0).toUpperCase() || "U";

  const values = {
    userDisplayName: name,
    userMenuName: name,
    userMenuEmail: email,
    userAvatar: initial,
    userMenuAvatar: initial,
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  const actions = document.getElementById("userNavActions");
  if (actions) actions.hidden = false;

  document.getElementById("logoutButton")?.addEventListener("click", async (event) => {
    event.preventDefault();
    if (window.CatMatchUserSession?.logout) {
      await window.CatMatchUserSession.logout({ redirectTo: "./login.html" });
      return;
    }
    clearAuth();
    await window.catmatchFirebase?.signOut?.().catch(() => {});
    window.location.replace("./login.html");
  });

  document.getElementById("accountSettingsButton")?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = "./settings.html";
  });
}


const LEGACY_PROFILE_IMAGE_STORAGE_KEY = "catmatch_profile_image";
const PROFILE_IMAGE_OWNER_KEY = "catmatch_profile_image_owner";
const PROFILE_IMAGE_INDEX_KEY = "catmatch_profile_image_index_v3";
const LEGACY_PROFILE_IMAGE_INDEX_KEY = "catmatch_profile_image_index_v2";
const SCOPED_PROFILE_OWNER_PREFIX = "catmatch_profile_image_owner_v3:";

function readStoredString(keys = []) {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of keys) {
      const value = String(storage.getItem(key) || "").trim();
      if (value) return value;
    }
  }
  return "";
}

function decodeJwtPayload(token = "") {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return {};
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return JSON.parse(json) || {};
  } catch (_error) {
    return {};
  }
}

function getActiveAccountRecord(user = null) {
  return {
    ...(getStoredUser() || {}),
    ...(accountState.profile || {}),
    ...(user || {}),
  };
}

function getAccountIdentityAliases(user = null) {
  const record = getActiveAccountRecord(user);
  const tokenPayload = decodeJwtPayload(getToken());
  const aliases = [];

  const uids = [
    readStoredString(["catmatch_auth_uid"]),
    record?.firebase_uid,
    record?.uid,
    tokenPayload?.firebase_uid,
  ];
  const userIds = [
    readStoredString(["catmatch_auth_user_id"]),
    record?.user_id,
    record?.id,
    tokenPayload?.user_id,
  ];
  const emails = [
    readStoredString(["catmatch_auth_email"]),
    record?.email,
    tokenPayload?.email,
  ];

  uids.forEach((value) => {
    const uid = String(value || "").trim();
    if (uid) aliases.push(uid);
  });

  userIds.forEach((value) => {
    const userId = Number(value || 0);
    if (Number.isInteger(userId) && userId > 0) aliases.push(`user:${userId}`);
  });

  emails.forEach((value) => {
    const email = String(value || "").trim().toLowerCase();
    if (email) aliases.push(`email:${email}`);
  });

  return [...new Set(aliases)];
}

function getAccountIdentity(user = getStoredUser() || accountState.profile || {}) {
  return getAccountIdentityAliases(user)[0] || "";
}

function getProfileImageStorageKey() {
  const identity = getAccountIdentity();
  return identity ? `${LEGACY_PROFILE_IMAGE_STORAGE_KEY}:${identity}` : "";
}

function readProfileImageIndexFrom(key) {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const value = JSON.parse(storage.getItem(key) || "{}");
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch (_error) {}
  }
  return {};
}

function readProfileImageIndex() {
  return readProfileImageIndexFrom(PROFILE_IMAGE_INDEX_KEY);
}

function readLegacyProfileImageIndex() {
  return readProfileImageIndexFrom(LEGACY_PROFILE_IMAGE_INDEX_KEY);
}

function writeProfileImageIndex(index) {
  try {
    localStorage.setItem(PROFILE_IMAGE_INDEX_KEY, JSON.stringify(index || {}));
  } catch (_error) {}
}

function readScopedProfileOwner(identity) {
  if (!identity) return "";
  for (const storage of [sessionStorage, localStorage]) {
    const owner = String(storage.getItem(`${SCOPED_PROFILE_OWNER_PREFIX}${identity}`) || "").trim();
    if (owner) return owner;
  }
  return "";
}

function writeScopedProfileOwner(identity, owner) {
  if (!identity || !owner) return;
  try {
    localStorage.setItem(`${SCOPED_PROFILE_OWNER_PREFIX}${identity}`, owner);
  } catch (_error) {
    try { sessionStorage.setItem(`${SCOPED_PROFILE_OWNER_PREFIX}${identity}`, owner); } catch (_sessionError) {}
  }
}

function readLegacyProfileOwner() {
  return String(
    localStorage.getItem(PROFILE_IMAGE_OWNER_KEY) ||
    sessionStorage.getItem(PROFILE_IMAGE_OWNER_KEY) ||
    ""
  ).trim();
}

function registerProfileImageAliases(canonicalIdentity) {
  if (!canonicalIdentity) return;
  const index = readProfileImageIndex();
  getAccountIdentityAliases().forEach((alias) => {
    index[alias] = canonicalIdentity;
  });
  writeProfileImageIndex(index);
}

function getProfileImageCandidateIdentities() {
  const aliases = getAccountIdentityAliases();
  const index = readProfileImageIndex();
  const legacyIndex = readLegacyProfileImageIndex();
  return [...new Set([
    ...aliases,
    ...aliases.map((alias) => index[alias]).filter(Boolean),
    ...aliases.map((alias) => legacyIndex[alias]).filter(Boolean),
  ])];
}

function readStoredProfileImage() {
  const aliases = getAccountIdentityAliases();
  const canonicalIdentity = aliases[0] || "";
  if (!canonicalIdentity) return "";

  const index = readProfileImageIndex();
  const legacyOwner = readLegacyProfileOwner();
  let indexChanged = false;

  for (const identity of getProfileImageCandidateIdentities()) {
    const key = `${LEGACY_PROFILE_IMAGE_STORAGE_KEY}:${identity}`;
    let imageData = "";
    for (const storage of [sessionStorage, localStorage]) {
      imageData = storage.getItem(key) || "";
      if (imageData) break;
    }
    if (!imageData) continue;

    const owner = readScopedProfileOwner(identity) || legacyOwner;
    if (!owner || !aliases.includes(owner)) {
      aliases.forEach((alias) => {
        if (index[alias] === identity) {
          delete index[alias];
          indexChanged = true;
        }
      });
      continue;
    }

    const canonicalKey = `${LEGACY_PROFILE_IMAGE_STORAGE_KEY}:${canonicalIdentity}`;
    if (key !== canonicalKey) {
      try { localStorage.setItem(canonicalKey, imageData); } catch (_error) {}
    }
    writeScopedProfileOwner(canonicalIdentity, canonicalIdentity);
    registerProfileImageAliases(canonicalIdentity);
    if (indexChanged) writeProfileImageIndex(index);
    return imageData;
  }

  if (indexChanged) writeProfileImageIndex(index);

  const legacyImage = localStorage.getItem(LEGACY_PROFILE_IMAGE_STORAGE_KEY)
    || sessionStorage.getItem(LEGACY_PROFILE_IMAGE_STORAGE_KEY)
    || "";
  if (legacyImage && legacyOwner && aliases.includes(legacyOwner)) {
    try {
      localStorage.setItem(`${LEGACY_PROFILE_IMAGE_STORAGE_KEY}:${canonicalIdentity}`, legacyImage);
      writeScopedProfileOwner(canonicalIdentity, canonicalIdentity);
      registerProfileImageAliases(canonicalIdentity);
    } catch (_error) {}
    return legacyImage;
  }

  // รูปที่มากับข้อมูลบัญชีต้องเป็นข้อมูลของเซสชันปัจจุบันเท่านั้น
  const accountRecord = getActiveAccountRecord();
  const accountCustomImage = String(accountRecord.profile_image || "").trim();
  if (/^(data:|blob:|https?:)/i.test(accountCustomImage)) return accountCustomImage;

  const firebaseUser = window.catmatchFirebase?.auth?.currentUser || null;
  if (firebaseUser?.uid && aliases.includes(firebaseUser.uid)) {
    const googleProvider = Array.isArray(firebaseUser.providerData)
      ? firebaseUser.providerData.find((provider) => provider?.providerId === "google.com")
      : null;
    const fallback = String(googleProvider?.photoURL || firebaseUser.photoURL || "").trim();
    return /^https?:\/\//i.test(fallback) ? fallback : "";
  }

  const googlePhotoOwner = String(accountRecord.google_photo_uid || "").trim();
  const googlePhoto = String(accountRecord.google_photo_url || "").trim();
  if (googlePhotoOwner && aliases.includes(googlePhotoOwner) && /^https?:\/\//i.test(googlePhoto)) {
    return googlePhoto;
  }
  return "";
}

function removeStoredProfileImageForCurrentAccount() {
  const aliases = getAccountIdentityAliases();
  const index = readProfileImageIndex();
  const identities = getProfileImageCandidateIdentities();
  const legacyOwner = readLegacyProfileOwner();

  for (const identity of identities) {
    const owner = readScopedProfileOwner(identity) || legacyOwner;
    if (!owner || !aliases.includes(owner)) continue;
    for (const storage of [sessionStorage, localStorage]) {
      storage.removeItem(`${LEGACY_PROFILE_IMAGE_STORAGE_KEY}:${identity}`);
      storage.removeItem(`${SCOPED_PROFILE_OWNER_PREFIX}${identity}`);
    }
  }

  aliases.forEach((alias) => delete index[alias]);
  writeProfileImageIndex(index);

  if (legacyOwner && aliases.includes(legacyOwner)) {
    localStorage.removeItem(LEGACY_PROFILE_IMAGE_STORAGE_KEY);
    localStorage.removeItem(PROFILE_IMAGE_OWNER_KEY);
    sessionStorage.removeItem(LEGACY_PROFILE_IMAGE_STORAGE_KEY);
    sessionStorage.removeItem(PROFILE_IMAGE_OWNER_KEY);
  }
}

function setupProfileImage() {
  const input =
    document.getElementById(
      "profileImageInput"
    );

  const removeButton =
    document.getElementById(
      "removeProfileImage"
    );

  renderStoredProfileImage();

  input?.addEventListener(
    "change",
    () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type)
      ) {
        showFormStatus(
          "รองรับเฉพาะไฟล์ JPG, PNG และ WEBP",
          true
        );

        input.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showFormStatus(
          "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB",
          true
        );

        input.value = "";
        return;
      }

      const reader = new FileReader();

      reader.addEventListener(
        "load",
        () => {
          const imageData =
            String(reader.result || "");

          const storageKey = getProfileImageStorageKey();
          const identity = getAccountIdentity();
          if (!storageKey || !identity) {
            showFormStatus("ไม่พบตัวตนของบัญชี กรุณาเข้าสู่ระบบใหม่", true);
            return;
          }
          localStorage.setItem(storageKey, imageData);
          writeScopedProfileOwner(identity, identity);
          registerProfileImageAliases(identity);
          localStorage.setItem(PROFILE_IMAGE_OWNER_KEY, identity);
          localStorage.removeItem(LEGACY_PROFILE_IMAGE_STORAGE_KEY);
          sessionStorage.removeItem(LEGACY_PROFILE_IMAGE_STORAGE_KEY);

          renderStoredProfileImage();
          window.dispatchEvent(new Event("catmatch:profile-image-updated"));
          void window.CatMatchUserSession?.bridgeLocalAliases?.({ pushCurrent: true });

          showFormStatus(
            "เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว"
          );
        }
      );

      reader.readAsDataURL(file);
    }
  );

  removeButton?.addEventListener(
    "click",
    () => {
      removeStoredProfileImageForCurrentAccount();

      input.value = "";
      renderStoredProfileImage();
      window.dispatchEvent(new Event("catmatch:profile-image-updated"));

      showFormStatus(
        "ลบรูปโปรไฟล์เรียบร้อยแล้ว"
      );
    }
  );
}

function renderStoredProfileImage() {
  const imageData = readStoredProfileImage();

  const displayName =
    document.getElementById(
      "accountCardName"
    )?.textContent ||
    getDisplayName(getStoredUser());

  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  const avatarIds = [
    "accountLargeAvatar",
    "userAvatar",
    "userMenuAvatar",
  ];

  avatarIds.forEach(
    (id) => {
      const avatar =
        document.getElementById(id);

      if (!avatar) {
        return;
      }

      if (imageData) {
        const image =
          document.createElement("img");

        image.src = imageData;
        image.alt = "";
        avatar.replaceChildren(image);
      } else {
        avatar.textContent = initial;
      }
    }
  );

  const removeButton =
    document.getElementById(
      "removeProfileImage"
    );

  if (removeButton) {
    removeButton.hidden = !imageData;
  }
}


function setupMenus() {
  const trigger = document.getElementById("userMenuTrigger");
  const panel = document.getElementById("userMenuPanel");
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  trigger?.addEventListener("click", () => {
    const open = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!open));
    if (panel) panel.hidden = open;
  });

  document.addEventListener("click", (event) => {
    if (
      !trigger ||
      !panel ||
      panel.hidden ||
      trigger.contains(event.target) ||
      panel.contains(event.target)
    ) {
      return;
    }

    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  });

  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    mainNav?.classList.toggle("is-open", !open);
  });
}

function setupFormActions() {
  document.getElementById("editProfileButton")?.addEventListener("click", () => {
    setEditing(true);
  });

  document.getElementById("cancelEditButton")?.addEventListener("click", () => {
    renderProfile(accountState.profile);
    setEditing(false);
    clearFieldErrors();
    showFormStatus("");
  });

  document.getElementById("retryProfileButton")?.addEventListener("click", () => {
    void loadProfile();
  });

  document.getElementById("accountForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveProfile();
  });
}

async function apiRequest(options = {}) {
  const { timeoutMs = PROFILE_REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(PROFILE_ENDPOINT, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${getToken()}`,
        ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(fetchOptions.headers || {}),
      },
    });
  } catch (error) {
    const requestError = new Error(
      error?.name === "AbortError"
        ? "การโหลดข้อมูลบัญชีใช้เวลานานเกินไป"
        : "ไม่สามารถเชื่อมต่อเพื่อโหลดข้อมูลบัญชีล่าสุดได้"
    );
    requestError.status = 0;
    throw requestError;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403 && data?.code) {
    if (response.status === 401) {
      clearAuth();
      window.location.replace("./login.html?return=account-info");
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
      `เกิดข้อผิดพลาด (${response.status})`
    );

    error.errors = data?.errors || null;
    error.status = response.status;
    throw error;
  }

  return data;
}

async function loadProfile({ preserveVisibleProfile = false } = {}) {
  const stored = getStoredUser();

  if (!preserveVisibleProfile && !stored && !accountState.profile) {
    setLoading(true);
  } else {
    setLoading(false);
  }
  showError("");

  try {
    const result = await apiRequest({ method: "GET" });
    accountState.profile = {
      ...(stored || {}),
      ...(result.profile || {}),
    };
    renderProfile(accountState.profile);
    saveStoredProfile(accountState.profile);
    setEditing(false);
    showFormStatus("");
  } catch (error) {
    const fallbackProfile = accountState.profile || stored;

    if (fallbackProfile) {
      accountState.profile = fallbackProfile;
      renderProfile(fallbackProfile);
      setEditing(false);

      if (error.status === 403) {
        const editButton = document.getElementById("editProfileButton");
        if (editButton) editButton.disabled = true;
        showFormStatus("บัญชีประเภทนี้แสดงข้อมูลพื้นฐานได้ แต่ยังแก้ไขผ่านหน้านี้ไม่ได้");
      } else {
        showFormStatus("กำลังแสดงข้อมูลของบัญชีที่เข้าสู่ระบบอยู่");
      }
    } else {
      showError(error?.message || "ไม่สามารถโหลดข้อมูลบัญชีได้");
    }
  } finally {
    setLoading(false);
  }
}

function renderProfile(profile = {}) {
  const stored = getStoredUser() || {};
  const mergedProfile = {
    ...stored,
    ...profile,
    firebase_uid: profile.firebase_uid || stored.firebase_uid || readStoredString(["catmatch_auth_uid"]),
    user_id: profile.user_id || stored.user_id || Number(readStoredString(["catmatch_auth_user_id"]) || 0) || undefined,
    email: profile.email || stored.email || readStoredString(["catmatch_auth_email"]),
    photo_url: profile.photo_url || stored.photo_url || "",
    google_photo_url: profile.google_photo_url || stored.google_photo_url || "",
    google_photo_uid:
      profile.google_photo_uid ||
      stored.google_photo_uid ||
      profile.firebase_uid ||
      stored.firebase_uid ||
      readStoredString(["catmatch_auth_uid"]),
  };
  accountState.profile = mergedProfile;
  profile = mergedProfile;

  const displayName = String(
    profile.username ||
    profile.name ||
    "ผู้ใช้งาน"
  ).trim();

  const email = String(profile.email || "").trim();
  const initial = displayName.charAt(0).toUpperCase() || "U";

  setText("accountLargeAvatar", initial);
  setText("accountCardName", displayName);
  setText("accountCardEmail", email || "ยังไม่มีอีเมล");
  setText("accountCardUsername", profile.username || "—");
  setText(
    "accountProvider",
    profile.firebase_provider === "google.com"
      ? "Google"
      : profile.firebase_provider || "อีเมลและรหัสผ่าน"
  );

  const statusBadge = document.getElementById("accountStatusBadge");
  if (statusBadge) {
    const active = String(profile.status || "active") === "active";
    statusBadge.textContent = active
      ? "บัญชีใช้งานปกติ"
      : "บัญชีถูกระงับ";
    statusBadge.classList.toggle("is-inactive", !active);
  }

  setValue("name", profile.name || "");
  setValue("username", profile.username || "");
  setValue("email", email);
  setValue("nickname", profile.nickname || "");
  setValue("birthDate", isoToDisplay(profile.birth_date));
  setValue("gender", profile.gender || "prefer_not_to_say");
  setValue("phoneCountry", profile.phone_country || "TH");
  setValue("phone", profile.phone || "");
  setValue("country", profile.country || "");
  setValue("province", profile.province || "");
  setValue("district", profile.district || "");
  setValue("subdistrict", profile.subdistrict || "");
  setValue("address", profile.address || "");

  const navValues = {
    userDisplayName: displayName,
    userMenuName: displayName,
    userMenuEmail: email,
    userAvatar: initial,
    userMenuAvatar: initial,
  };

  Object.entries(navValues).forEach(([id, value]) => setText(id, value));

  document.getElementById("accountForm").hidden = false;
  renderStoredProfileImage();
}

function setEditing(editing) {
  accountState.editing = editing;

  fields.forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.disabled = !editing;
  });

  // อีเมลไม่อนุญาตให้แก้ไข
  const emailField = document.getElementById("email");
  if (emailField) emailField.disabled = true;

  document.getElementById("accountFormActions").hidden = !editing;
  document.getElementById("editProfileButton").hidden = editing;
}

async function saveProfile() {
  clearFieldErrors();
  showFormStatus("กำลังบันทึกข้อมูล...");

  const payload = {
    name: valueOf("name"),
    username: valueOf("username"),
    email: valueOf("email"),
    nickname: valueOf("nickname"),
    birth_date: displayToIso(valueOf("birthDate")),
    gender: valueOf("gender"),
    phone_country: valueOf("phoneCountry"),
    phone: normalizePhone(valueOf("phone")),
    country: valueOf("country"),
    province: valueOf("province"),
    district: valueOf("district"),
    subdistrict: valueOf("subdistrict") || null,
    address: valueOf("address"),
    accepted_terms: true,
  };

  const saveButton = document.getElementById("saveProfileButton");
  if (saveButton) saveButton.disabled = true;

  try {
    const result = await apiRequest({
      method: "POST",
      body: JSON.stringify(payload),
    });

    accountState.profile = result.profile || payload;
    renderProfile(accountState.profile);
    saveStoredProfile(accountState.profile);
    setEditing(false);
    showFormStatus("บันทึกข้อมูลบัญชีเรียบร้อยแล้ว");
  } catch (error) {
    if (error.errors) {
      Object.entries(error.errors).forEach(([field, message]) => {
        showFieldError(field, String(message));
      });
    }

    showFormStatus(
      error?.message || "บันทึกข้อมูลไม่สำเร็จ",
      true
    );
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

function saveStoredProfile(profile) {
  for (const storage of [sessionStorage, localStorage]) {
    if (storage.getItem("catmatch_user")) {
      storage.setItem("catmatch_user", JSON.stringify(profile));
    }

    if (storage.getItem("user")) {
      storage.setItem("user", JSON.stringify(profile));
    }
  }
}

function normalizePhone(value) {
  const trimmed = String(value || "").trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  return digits.startsWith("+")
    ? `+${digits.slice(1).replace(/\D/g, "")}`
    : digits.replace(/\D/g, "");
}

function isoToDisplay(value) {
  const match = String(value || "")
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match
    ? `${match[3]}/${match[2]}/${match[1]}`
    : "";
}

function displayToIso(value) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  return match
    ? `${match[3]}-${match[2]}-${match[1]}`
    : raw;
}

function clearFieldErrors() {
  document.querySelectorAll(".field-error").forEach((element) => {
    element.textContent = "";
  });
}

function showFieldError(field, message) {
  const normalized = field === "birth_date"
    ? "birthDate"
    : field === "phone_country"
      ? "phone"
      : field;

  const box = document.querySelector(
    `[data-error-for="${normalized}"]`
  );

  if (box) box.textContent = message;
}

function setLoading(loading) {
  document.getElementById("accountLoading").hidden = !loading;

  if (loading) {
    document.getElementById("accountForm").hidden = true;
    document.getElementById("accountError").hidden = true;
  }
}

function showError(message = "") {
  const box = document.getElementById("accountError");
  const messageBox = document.getElementById("accountErrorMessage");

  box.hidden = !message;

  if (message) {
    messageBox.textContent = message;
    document.getElementById("accountForm").hidden = true;
  }
}

function showFormStatus(message = "", isError = false) {
  const element = document.getElementById("accountFormStatus");
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#c15e70" : "";
}

function valueOf(id) {
  return String(document.getElementById(id)?.value || "").trim();
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}
