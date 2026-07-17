"use strict";

const API_BASE = "http://localhost:3000/api/auth/password-reset";
const form = document.getElementById("statusForm");
const codeInput = document.getElementById("statusRequestCode");
const submitButton = document.getElementById("statusSubmit");
const errorBox = document.getElementById("statusError");
const badge = document.getElementById("statusBadge");
const title = document.getElementById("statusTitle");
const message = document.getElementById("statusMessage");

const statusLabels = {
  pending: ["รอตรวจสอบ", "คำขอกำลังรอผู้ดูแลระบบ", "ผู้ดูแลระบบยังไม่ได้ดำเนินการ กรุณาตรวจสอบอีกครั้งภายหลัง"],
  approved: ["อนุมัติแล้ว", "คำขอได้รับการอนุมัติ", "กำลังเปิดหน้าตั้งรหัสผ่านใหม่"],
  token_issued: ["ออก Token แล้ว", "Reset Token ถูกออกไปแล้ว", "หากคุณปิดหน้าตั้งรหัสผ่าน กรุณาส่งคำขอใหม่"],
  rejected: ["ไม่อนุมัติ", "คำขอไม่ได้รับการอนุมัติ", "กรุณาตรวจสอบข้อมูลและส่งคำขอใหม่"],
  completed: ["เสร็จสิ้น", "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว", "เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที"],
  expired: ["หมดอายุ", "คำขอหมดอายุแล้ว", "กรุณาส่งคำขอใหม่"],
  cancelled: ["ยกเลิก", "คำขอนี้ถูกยกเลิก", "กรุณาใช้คำขอล่าสุด"],
};

function renderStatus(status, detail) {
  const values = statusLabels[status] || ["ไม่ทราบสถานะ", "ไม่สามารถตรวจสอบสถานะ", detail || "กรุณาลองใหม่"];
  badge.textContent = values[0];
  title.textContent = values[1];
  message.textContent = detail || values[2];
}

async function checkStatus(requestCode) {
  if (!requestCode) {
    errorBox.textContent = "กรุณากรอกหมายเลขคำขอ";
    return;
  }
  errorBox.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "กำลังตรวจสอบ...";

  try {
    const response = await fetch(`${API_BASE}/requests/${encodeURIComponent(requestCode)}/status`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || "ตรวจสอบสถานะไม่สำเร็จ");

    renderStatus(data.status, data.message);

    if (data.status === "approved" && data.reset_token) {
      sessionStorage.setItem("catmatch_reset_token", data.reset_token);
      sessionStorage.removeItem("catmatch_reset_request_code");
      window.setTimeout(() => window.location.replace("./reset-password.html"), 700);
    }
  } catch (error) {
    errorBox.textContent = error.message || "ไม่สามารถตรวจสอบสถานะได้";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "ตรวจสอบอีกครั้ง";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = codeInput.value.trim();
  sessionStorage.setItem("catmatch_reset_request_code", code);
  checkStatus(code);
});

const storedCode = sessionStorage.getItem("catmatch_reset_request_code") || "";
if (storedCode) {
  codeInput.value = storedCode;
  checkStatus(storedCode);
} else {
  renderStatus("pending", "กรอกหมายเลขคำขอเพื่อเริ่มตรวจสอบสถานะ");
}
