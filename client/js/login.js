"use strict";

const API_URL = "http://localhost:3000/api/auth/login";
const LOGIN_PASSWORD_LENGTH = 10;

const form = document.getElementById("loginForm");
const identifierInput = document.getElementById("loginIdentifier");
const passwordInput = document.getElementById("loginPassword");
const rememberInput = document.getElementById("rememberMe");
const submitButton = document.getElementById("loginSubmit");
const submitLabel = submitButton?.querySelector(".submit-label");
const submitLoading = submitButton?.querySelector(".submit-loading");
const messageBox = document.getElementById("loginMessage");
const identifierError = document.getElementById("identifierError");
const passwordError = document.getElementById("passwordError");
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.querySelector(".main-nav");

const REMEMBERED_IDENTIFIER_KEY = "catmatch_remembered_identifier";
const LEGACY_REMEMBERED_EMAIL_KEY = "catmatch_remembered_email";

// ล้างสถานะ Login ถาวรจากโค้ดรุ่นเก่า แต่ยังเก็บอีเมลที่ผู้ใช้เลือกให้จำไว้
["token", "userToken", "catmatch_token", "catmatch_user", "user"].forEach((key) => {
  localStorage.removeItem(key);
});

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

function isValidUsername(value) {
  return /^[A-Za-z][A-Za-z0-9_]{9}$/.test(value);
}

function validateIdentifier(value) {
  if (!value) return "กรุณากรอกอีเมลหรือชื่อผู้ใช้งาน";
  if (value.includes("@")) {
    return isValidEmail(value) ? "" : "รูปแบบอีเมลไม่ถูกต้อง";
  }
  return isValidUsername(value)
    ? ""
    : "ชื่อผู้ใช้งานต้องมี 10 ตัว และใช้ตัวอักษรอังกฤษ ตัวเลข หรือ _";
}

function validateForm() {
  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;
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
    setFieldError(passwordInput, passwordError, "กรุณากรอกรหัสผ่าน");
    valid = false;
  } else if (password.length !== LOGIN_PASSWORD_LENGTH) {
    setFieldError(passwordInput, passwordError, "รหัสผ่านต้องมี 10 ตัวพอดี");
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
}

const AUTH_STORAGE_KEYS = [
  "token",
  "userToken",
  "catmatch_token",
  "catmatch_user",
  "user"
];

function clearStoredAuthentication() {
  AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function saveAuthentication(data) {
  const token = data?.token || data?.accessToken || data?.data?.token || data?.data?.accessToken;
  const user = data?.user || data?.data?.user || data?.profile || data?.data?.profile || null;

  clearStoredAuthentication();

  // เก็บ Login เฉพาะแท็บปัจจุบัน ไม่ให้ค้างถาวรหลังปิดเบราว์เซอร์
  if (token) {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("userToken", token);
    sessionStorage.setItem("catmatch_token", token);
  }

  if (user) {
    const userJson = JSON.stringify(user);
    sessionStorage.setItem("catmatch_user", userJson);
    sessionStorage.setItem("user", userJson);
  }
}

function redirectAfterLogin(loginData) {
  const user = loginData?.user || loginData?.data?.user || {};
  const explicitFlag =
    loginData?.needs_interest_onboarding ??
    loginData?.data?.needs_interest_onboarding ??
    user?.needs_interest_onboarding;

  const needsOnboarding = explicitFlag !== undefined
    ? explicitFlag === true || Number(explicitFlag) === 1
    : Number(user?.onboarding_completed) === 0;

  window.location.href = needsOnboarding ? "./interests.html" : "./index.html";
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!validateForm()) return;

  const rawIdentifier = identifierInput.value.trim();
  const identifier = rawIdentifier.includes("@")
    ? rawIdentifier.toLowerCase()
    : rawIdentifier;
  const password = passwordInput.value;
  const remember = rememberInput.checked;

  setLoading(true);

  try {
    const payload = {
      identifier,
      password,
      // ส่งฟิลด์สำรองเพื่อรองรับ Backend รุ่นเดิมระหว่างเปลี่ยนระบบ
      email: identifier.includes("@") ? identifier : undefined,
      username: identifier.includes("@") ? undefined : identifier,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : {};

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "อีเมล ชื่อผู้ใช้งาน หรือรหัสผ่านไม่ถูกต้อง");
    }

    if (remember) {
      localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, identifier);
    } else {
      localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
      localStorage.removeItem(LEGACY_REMEMBERED_EMAIL_KEY);
    }

    saveAuthentication(data);
    passwordInput.value = "";
    setMessage("เข้าสู่ระบบสำเร็จ กำลังเปิดหน้าบัญชีของคุณ...", "success");
    window.setTimeout(() => redirectAfterLogin(data), 650);
  } catch (error) {
    const isNetworkError = error instanceof TypeError;
    setMessage(
      isNetworkError
        ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า Backend เปิดอยู่"
        : error.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่"
    );
  } finally {
    setLoading(false);
  }
}


identifierInput?.addEventListener("input", () => {
  setFieldError(identifierInput, identifierError);
  setMessage();
});

passwordInput?.addEventListener("input", () => {
  // ตัวกั้นล่องหน: ป้องกันค่าที่ถูกเติมจากสคริปต์หรือ Browser เกิน 10 ตัว
  if (passwordInput.value.length > LOGIN_PASSWORD_LENGTH) {
    passwordInput.value = passwordInput.value.slice(0, LOGIN_PASSWORD_LENGTH);
  }
  setFieldError(passwordInput, passwordError);
  setMessage();
});

form?.addEventListener("submit", handleSubmit);

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

// ผู้ใช้ที่เข้าสู่ระบบอยู่แล้วไม่ควรเห็นหน้า Login ซ้ำ
if (getExistingAuthToken()) {
  window.location.replace("./index.html");
}

const rememberedIdentifier =
  localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) ||
  localStorage.getItem(LEGACY_REMEMBERED_EMAIL_KEY);

if (rememberedIdentifier && identifierInput && rememberInput) {
  identifierInput.value = rememberedIdentifier;
  rememberInput.checked = true;
}
