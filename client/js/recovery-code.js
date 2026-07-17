"use strict";

const API_URL = "http://localhost:3000/api/auth/password-reset/recovery-code";
const button = document.getElementById("generateRecoveryCode");
const result = document.getElementById("recoveryResult");
const value = document.getElementById("recoveryCodeValue");
const message = document.getElementById("recoveryMessage");

function getToken() {
  return sessionStorage.getItem("catmatch_token") ||
    sessionStorage.getItem("userToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("catmatch_token") || "";
}

function showMessage(text) {
  message.hidden = !text;
  message.textContent = text || "";
}

button.addEventListener("click", async () => {
  const token = getToken();
  if (!token) {
    showMessage("กรุณาเข้าสู่ระบบก่อนสร้าง Recovery Code");
    return;
  }
  if (!window.confirm("การสร้าง Recovery Code ใหม่จะทำให้รหัสเดิมใช้ไม่ได้ ยืนยันหรือไม่?")) return;

  button.disabled = true;
  button.textContent = "กำลังสร้าง...";
  showMessage("");
  result.hidden = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || "สร้าง Recovery Code ไม่สำเร็จ");
    value.textContent = data.recovery_code;
    result.hidden = false;
  } catch (error) {
    showMessage(error.message || "ไม่สามารถสร้าง Recovery Code ได้");
  } finally {
    button.disabled = false;
    button.textContent = "สร้าง Recovery Code ใหม่";
  }
});
