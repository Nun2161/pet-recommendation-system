"use strict";

const API_URL = "http://localhost:3000/api/auth/password-reset/reset";
const form = document.getElementById("resetPasswordForm");
const passwordInput = document.getElementById("newPassword");
const confirmInput = document.getElementById("confirmNewPassword");
const submitButton = document.getElementById("resetPasswordSubmit");
const errorBox = document.getElementById("resetPasswordError");
const messageBox = document.getElementById("resetPasswordMessage");
const token = sessionStorage.getItem("catmatch_reset_token") || "";

function updateRules() {
  const value = passwordInput.value;
  const checks = {
    length: value.length === 10,
    case: /[a-z]/.test(value) && /[A-Z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };
  document.querySelectorAll(".password-rule").forEach((item) => {
    item.classList.toggle("is-valid", Boolean(checks[item.dataset.rule]));
  });
}

function showMessage(text, success = false) {
  messageBox.hidden = !text;
  messageBox.textContent = text || "";
  messageBox.classList.toggle("is-success", success);
}

passwordInput.addEventListener("input", () => {
  passwordInput.value = passwordInput.value.slice(0, 10);
  errorBox.textContent = "";
  updateRules();
});
confirmInput.addEventListener("input", () => {
  confirmInput.value = confirmInput.value.slice(0, 10);
  errorBox.textContent = "";
});

document.querySelectorAll(".reset-password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "ซ่อน" : "แสดง";
    button.setAttribute("aria-label", show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน");
  });
});

if (!token) {
  showMessage("ไม่พบ Reset Token หรือ Token ถูกเปิดไปแล้ว กรุณากลับไปตรวจสอบสถานะคำขอ");
  submitButton.disabled = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");
  errorBox.textContent = "";

  if (passwordInput.value.length !== 10) {
    errorBox.textContent = "รหัสผ่านต้องมี 10 ตัวพอดี";
    return;
  }
  if (passwordInput.value !== confirmInput.value) {
    errorBox.textContent = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "กำลังบันทึก...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        reset_token: token,
        new_password: passwordInput.value,
        confirm_password: confirmInput.value,
      }),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");

    sessionStorage.removeItem("catmatch_reset_token");
    sessionStorage.removeItem("catmatch_reset_request_code");
    form.reset();
    updateRules();
    showMessage(data.message, true);
    submitButton.textContent = "เปิดหน้าเข้าสู่ระบบ";
    submitButton.disabled = false;
    submitButton.type = "button";
    submitButton.onclick = () => window.location.replace("./login.html");
  } catch (error) {
    showMessage(error.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
    submitButton.disabled = false;
    submitButton.textContent = "บันทึกรหัสผ่านใหม่";
  }
});
