"use strict";

const API_URL = "http://localhost:3000/api/admin/password-resets";
const listElement = document.getElementById("adminResetList");
const messageBox = document.getElementById("adminResetMessage");
const refreshButton = document.getElementById("adminRefresh");

function getAdminToken() {
  const keys = ["catmatch_admin_token", "admin_token", "adminToken", "token"];
  for (const key of keys) {
    const value = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (value) return value;
  }
  return "";
}

function setMessage(message, success = false) {
  messageBox.hidden = !message;
  messageBox.textContent = message || "";
  messageBox.classList.toggle("is-success", success);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function createRequestCard(item) {
  const article = document.createElement("article");
  article.className = "admin-reset-item";
  article.innerHTML = `
    <div class="admin-reset-grid">
      <div><small>ผู้ใช้งาน</small><strong>${item.user.name}</strong></div>
      <div><small>ชื่อผู้ใช้</small><strong>${item.user.username}</strong></div>
      <div><small>อีเมล</small><strong>${item.user.email_masked}</strong></div>
      <div><small>โทรศัพท์</small><strong>${item.user.phone_masked}</strong></div>
      <div><small>เบอร์ 4 ตัวท้าย</small><strong>${item.verification.phone_last4_matched ? "ตรงกัน" : "ไม่ตรงกัน"}</strong></div>
      <div><small>Recovery Code</small><strong>${item.verification.recovery_code_supplied ? (item.verification.recovery_code_matched ? "ตรงกัน" : "ไม่ตรงกัน") : "ไม่ได้ใช้"}</strong></div>
      <div><small>สถานะบัญชี</small><strong>${item.user.status}</strong></div>
      <div><small>ส่งคำขอเมื่อ</small><strong>${formatDate(item.created_at)}</strong></div>
    </div>
    <div class="admin-reset-actions">
      <button class="admin-approve" type="button">อนุมัติ</button>
      <button class="admin-reject" type="button">ปฏิเสธ</button>
    </div>
  `;

  article.querySelector(".admin-approve").addEventListener("click", () => approveRequest(item.request_id));
  article.querySelector(".admin-reject").addEventListener("click", () => rejectRequest(item.request_id));
  return article;
}

async function requestAdminApi(path = "", options = {}) {
  const token = getAdminToken();
  if (!token) throw new Error("ไม่พบ Admin Token กรุณาเข้าสู่ระบบผู้ดูแลก่อน");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok || data.success === false) throw new Error(data.message || "ดำเนินการไม่สำเร็จ");
  return data;
}

async function loadRequests() {
  refreshButton.disabled = true;
  setMessage("");
  listElement.innerHTML = "<div class='admin-reset-item'>กำลังโหลดข้อมูล...</div>";

  try {
    const data = await requestAdminApi("?status=pending");
    listElement.innerHTML = "";
    if (!data.data.length) {
      listElement.innerHTML = "<div class='admin-reset-item'>ไม่มีคำขอที่รอตรวจสอบ</div>";
      return;
    }
    data.data.forEach((item) => listElement.appendChild(createRequestCard(item)));
  } catch (error) {
    listElement.innerHTML = "";
    setMessage(error.message);
  } finally {
    refreshButton.disabled = false;
  }
}

async function approveRequest(requestId) {
  if (!window.confirm("ยืนยันการอนุมัติคำขอนี้หรือไม่?")) return;
  try {
    const data = await requestAdminApi(`/${requestId}/approve`, { method: "PATCH" });
    setMessage(data.message, true);
    await loadRequests();
  } catch (error) {
    setMessage(error.message);
  }
}

async function rejectRequest(requestId) {
  const reason = window.prompt("ระบุเหตุผลที่ปฏิเสธ", "ข้อมูลไม่เพียงพอสำหรับการยืนยันตัวตน");
  if (reason === null) return;
  try {
    const data = await requestAdminApi(`/${requestId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
    setMessage(data.message, true);
    await loadRequests();
  } catch (error) {
    setMessage(error.message);
  }
}

refreshButton.addEventListener("click", loadRequests);
loadRequests();
