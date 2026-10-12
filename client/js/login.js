"use strict";

const FIREBASE_SESSION_URL = `${window.CATMATCH_API_URL}/auth/firebase/session`;
const LOGIN_PASSWORD_LENGTH = 10;

const form = document.getElementById("loginForm");
const identifierInput = document.getElementById("loginIdentifier");
const passwordInput = document.getElementById("loginPassword");
const rememberInput = document.getElementById("rememberMe");
const submitButton = document.getElementById("loginSubmit");
const googleButton = document.getElementById("googleLogin");
const submitLabel = submitButton?.querySelector(".submit-label");
const submitLoading = submitButton?.querySelector(".submit-loading");
const googleLabel = googleButton?.querySelector(".google-label");
const googleLoading = googleButton?.querySelector(".google-loading");
const messageBox = document.getElementById("loginMessage");
const identifierError = document.getElementById("identifierError");
const passwordError = document.getElementById("passwordError");
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.querySelector(".main-nav");

const REMEMBERED_IDENTIFIER_KEY = "catmatch_remembered_identifier";
const LEGACY_REMEMBERED_EMAIL_KEY = "catmatch_remembered_email";

const AUTH_STORAGE_KEYS = [
  "token",
  "userToken",
  "catmatch_token",
  "catmatch_user",
  "user",
  "catmatch_role",
  "catmatch_auth_uid",
  "catmatch_auth_user_id",
  "catmatch_auth_email",
  "catmatch_farm_token",
  "farm_token",
  "farmToken",
  "catmatch_farm",
  "farm",
  "catmatch_admin_token",
  "admin_token",
  "adminToken",
  "catmatch_admin",
  "admin",
];

function setFieldError(input, errorElement, message = "") {
  if (!input || !errorElement) return;
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function setMessage(message = "", type = "error") {
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.hidden = !message;
  messageBox.classList.toggle("is-success", type === "success");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateIdentifier(value) {
  if (!value) return "กรุณากรอกอีเมล";
  return isValidEmail(value) ? "" : "รูปแบบอีเมลไม่ถูกต้อง";
}

function validateForm() {
  const identifier = identifierInput?.value.trim() || "";
  const password = passwordInput?.value || "";
  let valid = true;

  setFieldError(identifierInput, identifierError);
  setFieldError(passwordInput, passwordError);
  setMessage();

  const identifierMessage = validateIdentifier(identifier);
  if (identifierMessage) {
    setFieldError(identifierInput, identifierError, identifierMessage);
    valid = false;
  }
if (!password) {
  setFieldError(
    passwordInput,
    passwordError,
    "กรุณากรอกรหัสผ่าน"
  );

  valid = false;
} else if (
  password.length !==
  LOGIN_PASSWORD_LENGTH
) {
  setFieldError(
    passwordInput,
    passwordError,
    "รหัสผ่านต้องมี 10 ตัวพอดี"
  );

  valid = false;
}
  return valid;
}

function setLoading(loading) {
  if (!submitButton || !submitLabel || !submitLoading) return;
  submitButton.disabled = loading;
  submitButton.setAttribute("aria-busy", String(loading));
  submitLabel.hidden = loading;
  submitLoading.hidden = !loading;
  if (googleButton) googleButton.disabled = loading;
}

function setGoogleLoading(loading) {
  if (!googleButton) return;
  googleButton.disabled = loading;
  googleButton.setAttribute("aria-busy", String(loading));
  if (googleLabel) googleLabel.hidden = loading;
  if (googleLoading) googleLoading.hidden = !loading;
  if (submitButton) submitButton.disabled = loading;
}

function clearStoredAuthentication() {
  AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function saveAuthentication(data, firebaseUser = null) {
  const token = data?.token || data?.accessToken || data?.data?.token || data?.data?.accessToken;
  const role = data?.role || data?.data?.role || "user";
  const profile =
    data?.[role] ||
    data?.data?.[role] ||
    data?.user ||
    data?.data?.user ||
    data?.profile ||
    data?.data?.profile ||
    null;

  if (role === "user" && window.CatMatchUserSession) {
    const saved = window.CatMatchUserSession.save(data, firebaseUser);
    if (!saved) {
      const error = new Error("ไม่สามารถบันทึกเซสชันผู้ใช้ได้");
      error.code = "USER_SESSION_SAVE_FAILED";
      throw error;
    }
    return;
  }

  clearStoredAuthentication();

  // บัญชีฟาร์มและแอดมินยังใช้พื้นที่จัดเก็บเดิม แต่ต้องล้างข้อมูลบัญชีอื่นก่อนเสมอ
  const authStorages = [sessionStorage, localStorage];
  if (token) {
    authStorages.forEach((storage) => {
      storage.setItem("token", token);
      storage.setItem("catmatch_token", token);
      storage.setItem("catmatch_role", role);

      if (role === "user") {
        storage.setItem("userToken", token);
      } else if (role === "farm") {
        storage.setItem("catmatch_farm_token", token);
        storage.setItem("farm_token", token);
        storage.setItem("farmToken", token);
      } else if (role === "admin") {
        storage.setItem("catmatch_admin_token", token);
        storage.setItem("admin_token", token);
        storage.setItem("adminToken", token);
      }
    });
  }

  if (profile) {
    const profileJson = JSON.stringify(profile);

    authStorages.forEach((storage) => {
      if (role === "user") {
        storage.setItem("catmatch_user", profileJson);
        storage.setItem("user", profileJson);
      } else if (role === "farm") {
        storage.setItem("catmatch_farm", profileJson);
        storage.setItem("farm", profileJson);
      } else if (role === "admin") {
        storage.setItem("catmatch_admin", profileJson);
        storage.setItem("admin", profileJson);
      }
    });
  }
}



function getDefaultUserHome() {
  const params = new URLSearchParams(window.location.search);
  return params.get("species") === "dog" ? "./dog-index.html" : "./index.html";
}

function getRequestedReturnPage() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("return") || "";
  const allowed = { favorites:"favorites.html", settings:"settings.html", notifications:"notifications.html", "adoption-requests":"adoption-requests.html", "account-info":"account-info.html", "assessment-history":"assessment-history.html", assessment:"assessment.html", "cat-shelter-animals":"cat-shelter-animals.html", "cat-stray-listing":"cat-stray-listing.html", "dog-index":"dog-index.html", "dog-assessment":"dog-assessment.html?species=dog", "dog-assessment-history":"dog-assessment-history.html?species=dog", "dog-breeds":"dog-breeds.html", "dog-detail":"dog-detail.html", "dog-farm-map":"dog-farm-map.html?species=dog", "dog-shelter-animals":"dog-shelter-animals.html", "dog-stray-listing":"dog-stray-listing.html" };

  if (!allowed[value]) return "";

  const species = params.get("species") === "dog" ? "dog" : "cat";
  if (value === "favorites" && species === "dog") return "./favorites.html?species=dog";
  if (value === "assessment" && species === "dog") return "./dog-assessment.html?species=dog";
  if (value === "dog-detail") {
    const breedId = Number(params.get("id") || params.get("breed_id"));
    return Number.isInteger(breedId) && breedId > 0
      ? `./dog-detail.html?id=${breedId}`
      : "./dog-breeds.html";
  }
  return `./${allowed[value]}`;
}

function redirectAfterLogin(loginData) {
  const role = loginData?.role || loginData?.data?.role || "user";

  if (role === "admin") {
    window.location.href = "./admin.html";
    return;
  }

  if (role === "farm") {
    window.location.href = "./farm.html?welcome=approved";
    return;
  }

  const user = loginData?.user || loginData?.data?.user || {};
  const profileFlag =
    loginData?.needs_profile_onboarding ??
    loginData?.data?.needs_profile_onboarding ??
    user?.needs_profile_onboarding;
  const interestFlag =
    loginData?.needs_interest_onboarding ??
    loginData?.data?.needs_interest_onboarding ??
    user?.needs_interest_onboarding;

  const needsProfileOnboarding =
    profileFlag === true || Number(profileFlag) === 1;
  const needsInterestOnboarding = interestFlag !== undefined
    ? interestFlag === true || Number(interestFlag) === 1
    : Number(user?.onboarding_completed) === 0;

  if (needsProfileOnboarding) {
    window.location.href = "./google-onboarding.html";
    return;
  }

  const requestedPage = getRequestedReturnPage();
  window.location.href = needsInterestOnboarding ? "./interests.html" : (requestedPage || getDefaultUserHome());
}

function getFriendlyFirebaseError(error) {
  const code = String(error?.code || "");
  const messages = {
  "auth/invalid-email":
    "รูปแบบอีเมลไม่ถูกต้อง",

  "auth/missing-password":
    "กรุณากรอกรหัสผ่าน",

  "auth/invalid-credential":
    "อีเมลหรือรหัสผ่านไม่ถูกต้อง",

  "auth/user-disabled":
    "บัญชีนี้ถูกระงับการใช้งาน",

  "auth/too-many-requests":
    "มีการลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่",

  "auth/network-request-failed":
    "ไม่สามารถเชื่อมต่อ Firebase ได้ กรุณาตรวจสอบอินเทอร์เน็ต",

  "auth/popup-closed-by-user":
    "หน้าต่าง Google ถูกปิดก่อนเข้าสู่ระบบเสร็จ",

  "auth/popup-blocked":
    "เบราว์เซอร์บล็อกหน้าต่าง Google ระบบจะเปลี่ยนไปใช้หน้าเข้าสู่ระบบแบบ Redirect",

  "auth/operation-not-supported-in-this-environment":
    "เบราว์เซอร์นี้ไม่รองรับหน้าต่าง Google ระบบจะเปลี่ยนไปใช้หน้าเข้าสู่ระบบแบบ Redirect",

  "auth/web-storage-unsupported":
    "เบราว์เซอร์ปิดการใช้พื้นที่จัดเก็บ กรุณาอนุญาตคุกกี้และ Storage สำหรับเว็บไซต์นี้",

  "auth/cancelled-popup-request":
    "ยกเลิกคำขอ Google รายการก่อนหน้าแล้ว กรุณาลองอีกครั้ง",

  "auth/unauthorized-domain":
    "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase กรุณาเปิดหน้าเข้าสู่ระบบผ่าน http://localhost:5500",

  "auth/account-exists-with-different-credential":
    "อีเมลนี้ใช้วิธีเข้าสู่ระบบแบบอื่นอยู่แล้ว",

  "EMAIL_REGISTERED_WITH_PASSWORD":
    "อีเมลนี้สมัครด้วยอีเมลและรหัสผ่านแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน",

  "EMAIL_REGISTERED_WITH_GOOGLE":
    "อีเมลนี้สมัครผ่าน Google แล้ว กรุณาเข้าสู่ระบบด้วย Google",

  "AUTH_PROVIDER_CONFLICT":
    "อีเมลนี้ถูกสมัครด้วยช่องทางเข้าสู่ระบบอื่นแล้ว",

  "FIREBASE_UID_CONFLICT":
    "อีเมลนี้เชื่อมกับบัญชี Firebase อื่นแล้ว กรุณาติดต่อผู้ดูแลระบบ",

  "FIREBASE_ACCOUNT_EMAIL_MISMATCH":
    "ระบบพบว่า Google UID ถูกผูกกับบัญชี CatMatch คนละอีเมล จึงหยุดการเข้าสู่ระบบเพื่อไม่ให้ข้อมูลคนละบัญชีปนกัน กรุณาให้แอดมินตรวจสอบการเชื่อมบัญชี",

  "DUPLICATE_ROLE_ACCOUNT":
    "พบข้อมูลบัญชีซ้ำในฐานข้อมูล ระบบจึงหยุดการเข้าสู่ระบบเพื่อป้องกันการเปิดบัญชีผิดคน",

  "ACCOUNT_IDENTITY_MISMATCH":
    "บัญชี Google ไม่ตรงกับข้อมูล CatMatch ระบบล้างเซสชันเดิมแล้ว กรุณาเลือกบัญชี Google อีกครั้ง",

  "USER_SESSION_SAVE_FAILED":
    "ไม่สามารถแยกข้อมูลบัญชีผู้ใช้ได้ กรุณาเข้าสู่ระบบใหม่",

  "PROFILE_NOT_FOUND":
    "ไม่พบข้อมูลบัญชีใน CatMatch กรุณาสมัครสมาชิกก่อน",
};
  return messages[code] || error?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
}

function ensureFirebaseReady() {
  if (!window.catmatchFirebase?.configured) {
    throw new Error("ยังไม่ได้ตั้งค่า Firebase กรุณาตรวจสอบ client/js/firebase-config.js");
  }
}

async function createCatMatchSession(firebaseUser, allowCreate = false) {
  const idToken = await window.catmatchFirebase.getIdToken(firebaseUser, true);
  const response = await fetch(FIREBASE_SESSION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ idToken, allowCreate }),
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : {};

  if (!response.ok || data?.success === false) {
    const error = new Error(data?.message || "ไม่สามารถสร้างเซสชัน CatMatch ได้");
    error.code = data?.code || "CATMATCH_SESSION_FAILED";
    throw error;
  }

  return data;
}

async function completeLogin(credential, allowCreate = false) {
  const loginData = await createCatMatchSession(credential.user, allowCreate);

  if (allowCreate && credential?.user) {
    sessionStorage.setItem("catmatch_google_identity", JSON.stringify({
      displayName: credential.user.displayName || "",
      email: credential.user.email || "",
      photoURL: credential.user.photoURL || "",
    }));
  } else {
    sessionStorage.removeItem("catmatch_google_identity");
  }

  saveAuthentication(loginData, credential.user);
  setMessage("เข้าสู่ระบบสำเร็จ กำลังเปิดหน้าบัญชีของคุณ...", "success");
  window.setTimeout(() => redirectAfterLogin(loginData), 650);
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!validateForm()) return;

  const email = identifierInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const remember = Boolean(rememberInput?.checked);

  setLoading(true);

  try {
    ensureFirebaseReady();
    await window.catmatchFirebase.useSessionPersistence();
    const credential = await window.catmatchFirebase.emailLogin(email, password);
    await completeLogin(credential, false);

    if (remember) {
      localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, email);
    } else {
      localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
      localStorage.removeItem(LEGACY_REMEMBERED_EMAIL_KEY);
    }

    passwordInput.value = "";
  } catch (error) {
    await window.catmatchFirebase?.signOut?.().catch(() => {});
    const isNetworkError = error instanceof TypeError;
    setMessage(
      isNetworkError
        ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า Backend เปิดอยู่"
        : getFriendlyFirebaseError(error)
    );
  } finally {
    setLoading(false);
  }
}

function shouldFallbackToGoogleRedirect(error) {
  const code = String(error?.code || "");
  return [
    "auth/popup-blocked",
    "auth/operation-not-supported-in-this-environment",
    "auth/web-storage-unsupported",
  ].includes(code);
}

async function prepareGooglePersistence() {
  try {
    await window.catmatchFirebase.useSessionPersistence();
  } catch (error) {
    console.warn("Firebase persistence unavailable; continuing with Google sign-in.", error);
  }
}

async function startGoogleRedirectLogin() {
  sessionStorage.setItem("catmatch_google_redirect_pending", "1");
  setMessage("กำลังเปิดหน้าลงชื่อเข้าใช้ Google...", "success");
  await window.catmatchFirebase.googleLoginRedirect();
}

async function handleGoogleLogin() {
  setMessage();
  setFieldError(identifierInput, identifierError);
  setFieldError(passwordInput, passwordError);
  setGoogleLoading(true);

  try {
    ensureFirebaseReady();

    // เริ่ม Google Login ด้วยเซสชันว่างทุกครั้ง เพื่อไม่ให้บัญชีเดิมปนกับบัญชีที่กำลังเลือก
    if (window.CatMatchUserSession?.prepareAccountSwitch) {
      await window.CatMatchUserSession.prepareAccountSwitch();
    } else {
      clearStoredAuthentication();
      await window.catmatchFirebase?.signOut?.().catch(() => {});
    }

    await prepareGooglePersistence();

    // ไม่ตั้งเวลา timeout เพราะผู้ใช้อาจใช้เวลาเลือกบัญชี Google เกิน 20 วินาที
    const credential = await window.catmatchFirebase.googleLogin();
    await completeLogin(credential, true);
  } catch (error) {
    if (shouldFallbackToGoogleRedirect(error)) {
      try {
        await startGoogleRedirectLogin();
        return;
      } catch (redirectError) {
        error = redirectError;
      }
    }

    await window.catmatchFirebase?.signOut?.().catch(() => {});
    setMessage(getFriendlyFirebaseError(error));
  } finally {
    setGoogleLoading(false);
  }
}

async function completePendingGoogleRedirect() {
  if (!window.catmatchFirebase?.configured) return false;

  try {
    const credential = await window.catmatchFirebase.getRedirectResult();
    const pending = sessionStorage.getItem("catmatch_google_redirect_pending") === "1";

    if (!credential?.user) {
      if (pending) sessionStorage.removeItem("catmatch_google_redirect_pending");
      return false;
    }

    sessionStorage.removeItem("catmatch_google_redirect_pending");
    setGoogleLoading(true);
    await completeLogin(credential, true);
    return true;
  } catch (error) {
    sessionStorage.removeItem("catmatch_google_redirect_pending");
    await window.catmatchFirebase?.signOut?.().catch(() => {});
    setMessage(getFriendlyFirebaseError(error));
    return false;
  } finally {
    setGoogleLoading(false);
  }
}

identifierInput?.addEventListener("input", () => {
  setFieldError(identifierInput, identifierError);
  setMessage();
});

passwordInput?.addEventListener(
  "input",
  () => {
    if (
      passwordInput.value.length >
      LOGIN_PASSWORD_LENGTH
    ) {
      passwordInput.value =
        passwordInput.value.slice(
          0,
          LOGIN_PASSWORD_LENGTH
        );
    }

    setFieldError(
      passwordInput,
      passwordError
    );

    setMessage();
  }
);

form?.addEventListener("submit", handleSubmit);
googleButton?.addEventListener("click", handleGoogleLogin);

menuToggle?.addEventListener("click", () => {
  const open = mainNav?.classList.toggle("is-open") ?? false;
  menuToggle.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
});

window.addEventListener("scroll", () => {
  const shift = Math.min(window.scrollY * 0.045, 18);
  document.documentElement.style.setProperty("--login-scene-shift", `${shift}px`);
}, { passive: true });

function getExistingAuthToken() {
  return (
    localStorage.getItem("catmatch_token") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("catmatch_token") ||
    sessionStorage.getItem("userToken") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

function redirectExistingSession() {
  const role =
    sessionStorage.getItem("catmatch_role") ||
    localStorage.getItem("catmatch_role") ||
    "user";

  if (role === "admin") {
    window.location.replace("./admin.html");
  } else if (role === "farm") {
    window.location.replace("./farm.html");
  } else {
    window.location.replace(getRequestedReturnPage() || getDefaultUserHome());
  }
}

function isFreshLoginRequest() {
  const params = new URLSearchParams(window.location.search);
  return params.get("fresh") === "1" || params.get("force_login") === "1";
}

async function resetStaleSessionForFreshLogin() {
  clearStoredAuthentication();
  window.CatMatchUserSession?.clear?.({ clearAccountData: true });
  sessionStorage.removeItem("catmatch_google_redirect_pending");

  await Promise.race([
    Promise.allSettled([
      Promise.resolve(window.CatMatchUserSession?.clearRemoteAliases?.()),
      Promise.resolve(window.catmatchFirebase?.signOut?.()),
    ]),
    new Promise((resolve) => window.setTimeout(resolve, 700)),
  ]).catch(() => {});
}

async function initializeLoginSession() {
  if (isFreshLoginRequest()) {
    await resetStaleSessionForFreshLogin();
    return;
  }

  const existingToken = getExistingAuthToken();

  if (existingToken && window.CatMatchUserSession) {
    try {
      // ตรวจว่า JWT, โปรไฟล์ในเว็บ และ Firebase เป็นบัญชีเดียวกันก่อน Redirect
      const session = await window.CatMatchUserSession.ensure({ allowBridge: false });
      if (session.signedIn && session.token) {
        redirectExistingSession();
        return;
      }
    } catch (error) {
      console.warn("Stored account validation failed:", error);
      window.CatMatchUserSession.clear({ clearAccountData: true });
    }
  } else if (existingToken) {
    redirectExistingSession();
    return;
  }

  // เมื่อไม่มี JWT ห้ามกู้บัญชีจาก Firebase อัตโนมัติ เพราะอาจเป็นบัญชี Google เก่าของผู้ใช้คนอื่น
  await completePendingGoogleRedirect();
}

void initializeLoginSession();

const rememberedIdentifier =
  localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) ||
  localStorage.getItem(LEGACY_REMEMBERED_EMAIL_KEY);

if (rememberedIdentifier && identifierInput && rememberInput) {
  identifierInput.value = rememberedIdentifier;
  rememberInput.checked = true;
}
