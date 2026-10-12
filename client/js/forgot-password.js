"use strict";

const form = document.getElementById("forgotPasswordForm");
const emailInput = document.getElementById("resetEmail");
const submitButton = document.getElementById("forgotSubmit");
const submitLabel = submitButton?.querySelector(".submit-label");
const submitLoading = submitButton?.querySelector(".submit-loading");
const messageBox = document.getElementById("forgotMessage");
const emailError = document.getElementById("emailError");

/*
 * ขณะพัฒนา หน้าเว็บทำงานผ่าน Live Server และ Backend ทำงานที่พอร์ต 3000
 * ในอนาคตเมื่อนำ Backend ขึ้นออนไลน์ สามารถกำหนดค่า
 * window.CATMATCH_API_BASE_URL ก่อนโหลดไฟล์นี้ได้
 */
const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE_URL = String(
  window.CATMATCH_API_BASE_URL || (isLocalPage ? "http://localhost:3000" : "")
).replace(/\/+$/, "");

const PASSWORD_RESET_REQUEST_URL = API_BASE_URL
  ? `${API_BASE_URL}/api/auth/password-reset/request`
  : "";

function setMessage(message = "", success = false) {
  if (!messageBox) return;
  messageBox.hidden = !message;
  messageBox.textContent = message;
  messageBox.classList.toggle("is-success", success);
}

function setEmailError(message = "") {
  if (!emailInput || !emailError) return;
  emailError.textContent = message;
  emailInput.setAttribute("aria-invalid", message ? "true" : "false");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setLoading(loading) {
  if (!submitButton) return;
  submitButton.disabled = loading;
  submitButton.setAttribute("aria-busy", String(loading));
  if (submitLabel) submitLabel.hidden = loading;
  if (submitLoading) submitLoading.hidden = !loading;
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return {};
  }

  return response.json().catch(() => ({}));
}

async function requestPasswordReset(email) {
  if (!PASSWORD_RESET_REQUEST_URL) {
    throw new Error(
      "ยังไม่ได้กำหนด URL ของ Backend สำหรับเว็บไซต์ออนไลน์"
    );
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(PASSWORD_RESET_REQUEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });

    const result = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        result.message ||
          `Server ไม่สามารถส่งอีเมลได้ (HTTP ${response.status})`
      );
    }

    return result;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function friendlyRequestError(error) {
  if (error?.name === "AbortError") {
    return "Server ใช้เวลาตอบกลับนานเกินไป กรุณาลองใหม่อีกครั้ง";
  }

  if (error instanceof TypeError) {
    return "เชื่อมต่อ Server ไม่สำเร็จ กรุณาตรวจสอบว่า npm run dev กำลังทำงานที่พอร์ต 3000";
  }

  return error?.message || "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้";
}

emailInput?.addEventListener("input", () => {
  setEmailError();
  setMessage();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setEmailError();
  setMessage();

  const email = emailInput?.value.trim().toLowerCase() || "";

  if (!email) {
    setEmailError("กรุณากรอกอีเมล");
    emailInput?.focus();
    return;
  }

  if (!isValidEmail(email)) {
    setEmailError("รูปแบบอีเมลไม่ถูกต้อง");
    emailInput?.focus();
    return;
  }

  setLoading(true);

  try {
    const result = await requestPasswordReset(email);

    setMessage(
      result.message ||
        "หากอีเมลนี้มีบัญชี CatMatch เราได้ส่งลิงก์รีเซ็ตรหัสผ่านให้แล้ว กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์สแปม",
      true
    );

    form.reset();
  } catch (error) {
    console.error("Password reset request failed:", error);
    setMessage(friendlyRequestError(error));
  } finally {
    setLoading(false);
  }
});
