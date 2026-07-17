"use strict";

const API_BASE = "http://localhost:3000/api/auth";
const form = document.getElementById("interestsForm");
const errorBox = document.getElementById("interestError");
const skipButton = document.getElementById("skipInterests");
const submitButton = form?.querySelector('button[type="submit"]');

function getToken() {
  return (
    sessionStorage.getItem("catmatch_token") ||
    sessionStorage.getItem("userToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("catmatch_token") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function setError(message = "") {
  if (errorBox) errorBox.textContent = message;
}

function setLoading(loading) {
  if (submitButton) submitButton.disabled = loading;
  if (skipButton) skipButton.disabled = loading;
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  if (!token) {
    window.location.replace("./login.html");
    throw new Error("กรุณาเข้าสู่ระบบ");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    ["catmatch_token", "userToken", "token", "catmatch_user", "user"].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
    window.location.replace("./login.html");
    throw new Error(data.message || "กรุณาเข้าสู่ระบบใหม่");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }

  return data;
}

function applySavedInterests(interests = []) {
  document.querySelectorAll('input[name="interests"]').forEach((input) => {
    input.checked = interests.includes(input.value);
  });
}

async function loadOnboardingStatus() {
  setLoading(true);
  try {
    const data = await apiRequest("/onboarding", { method: "GET" });

    // หน้านี้เปิดได้เฉพาะครั้งแรกเท่านั้น
    if (data.onboarding_completed || data.needs_interest_onboarding === false) {
      window.location.replace("./index.html");
      return;
    }

    applySavedInterests(data.interests || []);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}

async function completeOnboarding(interests, skipped = false) {
  setError();
  setLoading(true);

  try {
    await apiRequest("/onboarding/interests", {
      method: "POST",
      body: JSON.stringify({ interests, skipped }),
    });

    // เก็บไว้ใช้แสดงในโปรไฟล์เท่านั้น ไม่ใช้ตัดสินว่าจะเปิดหน้านี้อีกหรือไม่
    localStorage.setItem("catmatch_user_interests", JSON.stringify(interests));
    window.location.replace("./index.html");
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = [...document.querySelectorAll('input[name="interests"]:checked')]
    .map((input) => input.value);

  if (selected.length === 0) {
    setError("กรุณาเลือกอย่างน้อย 1 รายการ");
    return;
  }

  completeOnboarding(selected, false);
});

skipButton?.addEventListener("click", () => {
  completeOnboarding([], true);
});

document.querySelectorAll('input[name="interests"]').forEach((input) => {
  input.addEventListener("change", () => setError());
});

loadOnboardingStatus();
