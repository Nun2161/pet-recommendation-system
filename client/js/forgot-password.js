"use strict";

const API_BASE = "http://localhost:3000/api/auth/password-reset";
const form = document.getElementById("forgotPasswordForm");
const identifierInput = document.getElementById("resetIdentifier");
const phoneInput = document.getElementById("phoneLast4");
const recoveryInput = document.getElementById("recoveryCode");
const submitButton = document.getElementById("forgotSubmit");
const messageBox = document.getElementById("forgotMessage");
const referenceBox = document.getElementById("requestReference");
const requestCodeText = document.getElementById("requestCodeText");
const identifierError = document.getElementById("identifierError");
const phoneError = document.getElementById("phoneError");

function setMessage(message, success = false) {
  messageBox.hidden = !message;
  messageBox.textContent = message || "";
  messageBox.classList.toggle("is-success", success);
}

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 4);
  phoneError.textContent = "";
});
identifierInput.addEventListener("input", () => { identifierError.textContent = ""; });
recoveryInput.addEventListener("input", () => {
  recoveryInput.value = recoveryInput.value.toUpperCase().replace(/\s+/g, "").slice(0, 64);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  referenceBox.hidden = true;

  const identifier = identifierInput.value.trim();
  const phoneLast4 = phoneInput.value.trim();
  let valid = true;

  if (!identifier) {
    identifierError.textContent = "กรุณากรอกอีเมลหรือชื่อผู้ใช้งาน";
    valid = false;
  }
  if (!/^\d{4}$/.test(phoneLast4)) {
    phoneError.textContent = "กรุณากรอกตัวเลข 4 ตัว";
    valid = false;
  }
  if (!valid) return;

  submitButton.disabled = true;
  submitButton.textContent = "กำลังส่งคำขอ...";

  try {
    const response = await fetch(`${API_BASE}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        identifier,
        phone_last4: phoneLast4,
        recovery_code: recoveryInput.value.trim() || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || "ส่งคำขอไม่สำเร็จ");

    sessionStorage.setItem("catmatch_reset_request_code", data.request_code);
    requestCodeText.textContent = `${data.request_code.slice(0, 6)}••••••${data.request_code.slice(-6)}`;
    referenceBox.hidden = false;
    setMessage(data.message, true);
    form.reset();
  } catch (error) {
    setMessage(error.message || "ไม่สามารถส่งคำขอได้");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "ส่งคำขอเปลี่ยนรหัสผ่าน";
  }
});
