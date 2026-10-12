"use strict";

/* =========================================================
   CATMATCH ADMIN
   ========================================================= */

const ADMIN_API_URL = `${window.CATMATCH_API_URL}/admin`;

const TOKEN_KEYS = [
  "catmatch_admin_token",
  "admin_token",
  "adminToken",
  "catmatch_token",
  "token",
];

const PROFILE_KEYS = [
  "catmatch_admin",
  "admin",
  "catmatch_profile",
  "profile",
  "catmatch_user",
  "user",
];

const FARM_STATUS_LABELS = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธแล้ว",
  inactive: "ระงับใช้งาน",
};

const USER_STATUS_LABELS = {
  active: "เปิดใช้งาน",
  inactive: "ระงับใช้งาน",
};

const STATUS_CLASSES = {
  pending: "is-pending",
  approved: "is-approved",
  active: "is-completed",
  rejected: "is-rejected",
  inactive: "is-cancelled",
};

/* =========================================================
   STATE
   ========================================================= */

let users = [];
let farms = [];

let activeSection = "overview";
let activeFarmStatus = "all";
let activeUserStatus = "all";

/* =========================================================
   ELEMENTS
   ========================================================= */

const adminMessage =
  document.getElementById("adminMessage");

const adminDisplayName =
  document.getElementById("adminDisplayName");

const adminDisplayEmail =
  document.getElementById("adminDisplayEmail");

const logoutButton =
  document.getElementById("adminLogout");

const menuButtons = Array.from(
  document.querySelectorAll(
    "[data-admin-section]"
  )
);

const sectionPanels = Array.from(
  document.querySelectorAll(
    "[data-section-panel]"
  )
);

/* Dashboard */

const refreshDashboardButton =
  document.getElementById("refreshDashboard");

const viewAllFarmsButton =
  document.getElementById("viewAllFarms");

const totalUsersElement =
  document.getElementById("totalUsers");

const activeUsersElement =
  document.getElementById("activeUsers");

const totalFarmsElement =
  document.getElementById("totalFarms");

const pendingFarmsElement =
  document.getElementById("pendingFarms");

const overviewSkeleton =
  document.getElementById("overviewSkeleton");

const overviewEmpty =
  document.getElementById("overviewEmpty");

const overviewFarmList =
  document.getElementById("overviewFarmList");

/* Farms */

const refreshFarmsButton =
  document.getElementById("refreshFarms");

const farmFilterTabs = Array.from(
  document.querySelectorAll(
    "[data-farm-status]"
  )
);

const farmResultCount =
  document.getElementById("farmResultCount");

const farmSkeleton =
  document.getElementById("farmSkeleton");

const farmEmpty =
  document.getElementById("farmEmpty");

const farmList =
  document.getElementById("farmList");

/* Users */

const refreshUsersButton =
  document.getElementById("refreshUsers");

const userFilterTabs = Array.from(
  document.querySelectorAll(
    "[data-user-status]"
  )
);

const userResultCount =
  document.getElementById("userResultCount");

const userSkeleton =
  document.getElementById("userSkeleton");

const userEmpty =
  document.getElementById("userEmpty");

const userList =
  document.getElementById("userList");

/* =========================================================
   STORAGE
   ========================================================= */

function getStoredValue(keys) {
  for (const key of keys) {
    const sessionValue =
      sessionStorage.getItem(key);

    if (sessionValue) {
      return sessionValue;
    }

    const localValue =
      localStorage.getItem(key);

    if (localValue) {
      return localValue;
    }
  }

  return "";
}

function getAdminToken() {
  return getStoredValue(TOKEN_KEYS);
}

function getAdminProfile() {
  const rawProfile =
    getStoredValue(PROFILE_KEYS);

  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile);
  } catch (error) {
    console.warn(
      "อ่านข้อมูลผู้ดูแลระบบไม่สำเร็จ:",
      error
    );

    return null;
  }
}

function clearAdminSession() {
  const keys = new Set([
    ...TOKEN_KEYS,
    ...PROFILE_KEYS,
    "catmatch_role",
    "role",
  ]);

  keys.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}

function redirectToLogin(message = "") {
  if (message) {
    sessionStorage.setItem(
      "catmatch_login_notice",
      message
    );
  }

  window.location.replace("./login.html");
}

/* =========================================================
   PROFILE
   ========================================================= */

function setupAdminProfile() {
  const profile = getAdminProfile();

  if (!profile) {
    return;
  }

  const name =
    profile.name ||
    profile.admin_name ||
    profile.username ||
    "ผู้ดูแลระบบ";

  const email =
    profile.email ||
    "admin@catmatch.com";

  if (adminDisplayName) {
    adminDisplayName.textContent = name;
  }

  if (adminDisplayEmail) {
    adminDisplayEmail.textContent = email;
  }
}

/* =========================================================
   GENERAL UI
   ========================================================= */

function showMessage(
  message = "",
  type = "error"
) {
  if (!adminMessage) {
    return;
  }

  adminMessage.textContent = message;
  adminMessage.hidden = !message;

  adminMessage.classList.toggle(
    "is-success",
    type === "success"
  );
}

function formatDate(value) {
  if (!value) {
    return "ไม่ระบุ";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ไม่ระบุ";
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function normalizeText(value) {
  const text = String(value ?? "").trim();

  return text || "ไม่ระบุ";
}

function createStatusBadge(
  status,
  labels
) {
  const badge =
    document.createElement("span");

  badge.className = [
    "admin-status-badge",
    STATUS_CLASSES[status] || "",
  ]
    .filter(Boolean)
    .join(" ");

  badge.textContent =
    labels[status] ||
    normalizeText(status);

  return badge;
}

function appendDetailRow(
  container,
  label,
  value
) {
  const row =
    document.createElement("div");

  row.className =
    "admin-definition-row";

  const title =
    document.createElement("span");

  title.textContent = label;

  const content =
    document.createElement("strong");

  content.textContent =
    normalizeText(value);

  row.append(title, content);
  container.appendChild(row);
}

function setButtonLoading(
  button,
  loading,
  loadingText = "กำลังบันทึก..."
) {
  if (!button) {
    return;
  }

  if (loading) {
    button.dataset.originalText =
      button.textContent;

    button.textContent =
      loadingText;

    button.disabled = true;
    return;
  }

  button.textContent =
    button.dataset.originalText ||
    button.textContent;

  button.disabled = false;

  delete button.dataset.originalText;
}

/* =========================================================
   API
   ========================================================= */

async function readResponseJson(response) {
  const contentType =
    response.headers.get("content-type") || "";

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    return {};
  }

  return response.json();
}

async function adminApiRequest(
  path,
  options = {}
) {
  const token = getAdminToken();

  if (!token) {
    clearAdminSession();

    redirectToLogin(
      "กรุณาเข้าสู่ระบบผู้ดูแลระบบ"
    );

    throw new Error(
      "ADMIN_TOKEN_REQUIRED"
    );
  }

  const response = await fetch(
    `${ADMIN_API_URL}${path}`,
    {
      ...options,

      headers: {
        Accept: "application/json",

        Authorization:
          `Bearer ${token}`,

        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),

        ...(options.headers || {}),
      },
    }
  );

  const data =
    await readResponseJson(response);

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    clearAdminSession();

    redirectToLogin(
      data.message ||
      "เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่"
    );

    throw new Error(
      "ADMIN_SESSION_EXPIRED"
    );
  }

  if (
    !response.ok ||
    data.success === false
  ) {
    throw new Error(
      data.message ||
      "ไม่สามารถดำเนินการได้"
    );
  }

  return data;
}

async function openFarmCertificate(farmId, button) {
  const token = getAdminToken();

  if (!token) {
    clearAdminSession();
    redirectToLogin("กรุณาเข้าสู่ระบบผู้ดูแลระบบ");
    return;
  }

  const previewWindow = window.open("", "_blank");
  setButtonLoading(button, true);

  try {
    const response = await fetch(
      `${ADMIN_API_URL}/farms/${farmId}/certificate`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      previewWindow?.close();
      clearAdminSession();
      redirectToLogin("เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "ไม่สามารถเปิดไฟล์หลักฐานได้");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    if (previewWindow) {
      previewWindow.location.href = objectUrl;
    } else {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.click();
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    previewWindow?.close();
    showMessage(error.message);
  } finally {
    setButtonLoading(button, false);
  }
}

/* =========================================================
   SECTION MENU
   ========================================================= */

function showSection(sectionName) {
  activeSection = sectionName;

  menuButtons.forEach((button) => {
    const isActive =
      button.dataset.adminSection ===
      sectionName;

    button.classList.toggle(
      "is-active",
      isActive
    );
  });

  sectionPanels.forEach((panel) => {
    const isActive =
      panel.dataset.sectionPanel ===
      sectionName;

    panel.hidden = !isActive;

    panel.classList.toggle(
      "is-active",
      isActive
    );
  });

  showMessage();

  if (sectionName === "overview") {
    loadDashboard();
  }

  if (sectionName === "farms") {
    loadFarms();
  }

  if (sectionName === "users") {
    loadUsers();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

/* =========================================================
   LOAD DATA
   ========================================================= */

async function fetchUsers() {
  const data =
    await adminApiRequest(
      "/users",
      {
        method: "GET",
      }
    );

  users =
    Array.isArray(data.data)
      ? data.data
      : [];

  return users;
}

async function fetchFarms() {
  const data =
    await adminApiRequest(
      "/farms",
      {
        method: "GET",
      }
    );

  farms =
    Array.isArray(data.data)
      ? data.data
      : [];

  return farms;
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboardSummary() {
  const activeUserCount =
    users.filter(
      (user) =>
        user.status === "active"
    ).length;

  const pendingFarmCount =
    farms.filter(
      (farm) =>
        farm.status === "pending"
    ).length;

  if (totalUsersElement) {
    totalUsersElement.textContent =
      String(users.length);
  }

  if (activeUsersElement) {
    activeUsersElement.textContent =
      String(activeUserCount);
  }

  if (totalFarmsElement) {
    totalFarmsElement.textContent =
      String(farms.length);
  }

  if (pendingFarmsElement) {
    pendingFarmsElement.textContent =
      String(pendingFarmCount);
  }
}

function renderOverviewFarms() {
  if (
    !overviewFarmList ||
    !overviewEmpty
  ) {
    return;
  }

  const pendingItems =
    farms
      .filter(
        (farm) =>
          farm.status === "pending"
      )
      .slice(0, 5);

  overviewFarmList.replaceChildren();

  overviewEmpty.hidden =
    pendingItems.length > 0;

  pendingItems.forEach((farm) => {
    overviewFarmList.appendChild(
      createFarmCard(
        farm,
        true
      )
    );
  });
}

async function loadDashboard() {
  showMessage();

  if (overviewSkeleton) {
    overviewSkeleton.hidden = false;
  }

  if (overviewEmpty) {
    overviewEmpty.hidden = true;
  }

  overviewFarmList?.replaceChildren();

  refreshDashboardButton &&
    (refreshDashboardButton.disabled = true);

  try {
    await Promise.all([
      fetchUsers(),
      fetchFarms(),
    ]);

    renderDashboardSummary();
    renderOverviewFarms();
  } catch (error) {
    if (
      error.message !==
        "ADMIN_TOKEN_REQUIRED" &&
      error.message !==
        "ADMIN_SESSION_EXPIRED"
    ) {
      showMessage(
        error instanceof TypeError
          ? "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบว่า npm run dev เปิดอยู่"
          : error.message
      );
    }
  } finally {
    if (overviewSkeleton) {
      overviewSkeleton.hidden = true;
    }

    if (refreshDashboardButton) {
      refreshDashboardButton.disabled =
        false;
    }
  }
}

/* =========================================================
   FARM CARDS
   ========================================================= */

function createFarmCard(
  farm,
  compact = false
) {
  const card =
    document.createElement("article");

  card.className =
    "admin-request-card";

  const header =
    document.createElement("div");

  header.className =
    "admin-request-header";

  const identity =
    document.createElement("div");

  identity.className =
    "admin-request-identity";

  const number =
    document.createElement("span");

  number.className =
    "admin-request-number";

  number.textContent =
    `รหัสฟาร์ม #${farm.farm_id}`;

  const name =
    document.createElement("h3");

  name.textContent =
    normalizeText(farm.farm_name);

  const owner =
    document.createElement("p");

  owner.textContent =
    `เจ้าของฟาร์ม: ${
      normalizeText(farm.owner_name)
    }`;

  identity.append(
    number,
    name,
    owner
  );

  header.append(
    identity,
    createStatusBadge(
      farm.status,
      FARM_STATUS_LABELS
    )
  );

  const body =
    document.createElement("div");

  body.className =
    "admin-request-body";

  const details =
    document.createElement("div");

  details.className =
    "admin-request-details";

  appendDetailRow(
    details,
    "อีเมล",
    farm.email
  );

  appendDetailRow(
    details,
    "เบอร์โทร",
    farm.phone
  );

  appendDetailRow(
    details,
    "ที่อยู่",
    farm.address
  );

  const locationText = [
    farm.subdistrict,
    farm.district,
    farm.province,
    farm.country,
  ].filter(Boolean).join(" ");

  appendDetailRow(
    details,
    "พื้นที่",
    locationText
  );

  appendDetailRow(
    details,
    "เกี่ยวกับฟาร์ม",
    farm.description
  );

  appendDetailRow(
    details,
    "เว็บไซต์",
    farm.website
  );

  appendDetailRow(
    details,
    "Facebook",
    farm.facebook
  );

  appendDetailRow(
    details,
    "เบอร์โทรศัพท์ติดต่อ",
    farm.line_contact
  );

  appendDetailRow(
    details,
    "สมัครเมื่อ",
    formatDate(farm.created_at)
  );

  const certificate =
    document.createElement("div");

  certificate.className =
    "admin-verification-box";

  const certificateTitle =
    document.createElement("strong");

  certificateTitle.textContent =
    "เลขทะเบียนฟาร์มและใบรับรอง";

  const certificateRows =
    document.createElement("div");

  certificateRows.className =
    "admin-request-details";

  appendDetailRow(
    certificateRows,
    "เลขทะเบียนฟาร์ม",
    farm.certificate_no
  );

  appendDetailRow(
    certificateRows,
    "ใบรับรองฟาร์ม",
    farm.certificate_file
      ? "มีไฟล์แนบ"
      : "ไม่มีไฟล์แนบ"
  );

  if (farm.approved_at) {
    appendDetailRow(
      certificateRows,
      "อนุมัติเมื่อ",
      formatDate(
        farm.approved_at
      )
    );
  }

  if (farm.rejection_reason) {
    appendDetailRow(
      certificateRows,
      "เหตุผลที่ปฏิเสธ",
      farm.rejection_reason
    );
  }

  certificate.append(
    certificateTitle,
    certificateRows
  );

  if (farm.certificate_file) {
    const certificateButton =
      createActionButton(
        "เปิดใบรับรองฟาร์ม",
        "button button-secondary admin-certificate-button",
        () => openFarmCertificate(
          farm.farm_id,
          certificateButton
        )
      );

    certificate.appendChild(
      certificateButton
    );
  }

  body.append(
    details,
    certificate
  );

  card.append(
    header,
    body
  );

  const actions =
    createFarmActions(farm);

  if (actions) {
    card.appendChild(actions);
  }

  if (compact) {
    card.dataset.compact = "true";
  }

  return card;
}

function createFarmActions(farm) {
  const actions =
    document.createElement("div");

  actions.className =
    "admin-request-actions";

  if (farm.status === "pending") {
    const rejectButton =
      createActionButton(
        "ปฏิเสธ",
        "button button-secondary admin-reject-button",
        () => {
          changeFarmStatus(
            farm.farm_id,
            "rejected",
            rejectButton
          );
        }
      );

    const approveButton =
      createActionButton(
        "อนุมัติฟาร์ม",
        "button button-primary",
        () => {
          changeFarmStatus(
            farm.farm_id,
            "approved",
            approveButton
          );
        }
      );

    actions.append(
      rejectButton,
      approveButton
    );

    return actions;
  }

  if (farm.status === "approved") {
    const inactiveButton =
      createActionButton(
        "ระงับฟาร์ม",
        "button button-secondary admin-reject-button",
        () => {
          changeFarmStatus(
            farm.farm_id,
            "inactive",
            inactiveButton
          );
        }
      );

    actions.appendChild(
      inactiveButton
    );

    return actions;
  }

  if (
    farm.status === "rejected" ||
    farm.status === "inactive"
  ) {
    const approveButton =
      createActionButton(
        "เปิดใช้งานและอนุมัติ",
        "button button-primary",
        () => {
          changeFarmStatus(
            farm.farm_id,
            "approved",
            approveButton
          );
        }
      );

    actions.appendChild(
      approveButton
    );

    return actions;
  }

  return null;
}

function createActionButton(
  text,
  className,
  onClick
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className = className;
  button.textContent = text;

  button.addEventListener(
    "click",
    onClick
  );

  return button;
}

async function changeFarmStatus(
  farmId,
  newStatus,
  button
) {
  const statusText =
    FARM_STATUS_LABELS[newStatus] ||
    newStatus;

  let rejectionReason = "";

  if (newStatus === "rejected") {
    const input = await window.CatMatchDialog.prompt(
      "ระบุเหตุผลที่ปฏิเสธคำขอ อย่างน้อย 5 ตัวอักษร",
      { title: "เหตุผลที่ปฏิเสธฟาร์ม", confirmText: "บันทึกเหตุผล", placeholder: "กรอกเหตุผล 5–500 ตัวอักษร" }
    );

    if (input === null) return;

    rejectionReason = input.trim();
    if (rejectionReason.length < 5 || rejectionReason.length > 500) {
      showMessage("เหตุผลที่ปฏิเสธต้องมี 5–500 ตัวอักษร");
      return;
    }
  }

  const confirmed = await window.CatMatchDialog.confirm(
    `ต้องการเปลี่ยนสถานะฟาร์มเป็น “${statusText}” หรือไม่?`,
    { title: "ยืนยันสถานะฟาร์ม", confirmText: "ยืนยัน", danger: newStatus === "rejected" || newStatus === "inactive" }
  );

  if (!confirmed) {
    return;
  }

  setButtonLoading(
    button,
    true
  );

  showMessage();

  try {
    const data =
      await adminApiRequest(
        `/farms/${farmId}/status`,
        {
          method: "PATCH",

          body: JSON.stringify({
            status: newStatus,
            rejection_reason:
              newStatus === "rejected"
                ? rejectionReason
                : null,
          }),
        }
      );

    await Promise.all([
      fetchFarms(),
      fetchUsers(),
    ]);

    renderDashboardSummary();
    renderOverviewFarms();
    renderFarms();

    showMessage(
      data.message ||
      "อัปเดตสถานะฟาร์มสำเร็จ",
      "success"
    );
  } catch (error) {
    if (
      error.message !==
        "ADMIN_TOKEN_REQUIRED" &&
      error.message !==
        "ADMIN_SESSION_EXPIRED"
    ) {
      showMessage(error.message);
    }
  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   FARM LIST
   ========================================================= */

function getFilteredFarms() {
  if (
    activeFarmStatus === "all"
  ) {
    return farms;
  }

  return farms.filter(
    (farm) =>
      farm.status ===
      activeFarmStatus
  );
}

function renderFarms() {
  if (
    !farmList ||
    !farmEmpty
  ) {
    return;
  }

  const filteredFarms =
    getFilteredFarms();

  farmList.replaceChildren();

  farmEmpty.hidden =
    filteredFarms.length > 0;

  if (farmResultCount) {
    farmResultCount.textContent =
      `${filteredFarms.length} รายการ`;
  }

  filteredFarms.forEach((farm) => {
    farmList.appendChild(
      createFarmCard(farm)
    );
  });
}

async function loadFarms() {
  showMessage();

  if (farmSkeleton) {
    farmSkeleton.hidden = false;
  }

  if (farmEmpty) {
    farmEmpty.hidden = true;
  }

  farmList?.replaceChildren();

  if (refreshFarmsButton) {
    refreshFarmsButton.disabled = true;
  }

  try {
    await fetchFarms();

    renderFarms();
    renderDashboardSummary();
  } catch (error) {
    if (
      error.message !==
        "ADMIN_TOKEN_REQUIRED" &&
      error.message !==
        "ADMIN_SESSION_EXPIRED"
    ) {
      showMessage(
        error instanceof TypeError
          ? "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบว่า npm run dev เปิดอยู่"
          : error.message
      );
    }
  } finally {
    if (farmSkeleton) {
      farmSkeleton.hidden = true;
    }

    if (refreshFarmsButton) {
      refreshFarmsButton.disabled =
        false;
    }
  }
}

/* =========================================================
   USER CARDS
   ========================================================= */

function createUserCard(user) {
  const card =
    document.createElement("article");

  card.className =
    "admin-request-card";

  const header =
    document.createElement("div");

  header.className =
    "admin-request-header";

  const identity =
    document.createElement("div");

  identity.className =
    "admin-request-identity";

  const number =
    document.createElement("span");

  number.className =
    "admin-request-number";

  number.textContent =
    `รหัสผู้ใช้ #${user.user_id}`;

  const name =
    document.createElement("h3");

  name.textContent =
    normalizeText(user.name);

  const email =
    document.createElement("p");

  email.textContent =
    normalizeText(user.email);

  identity.append(
    number,
    name,
    email
  );

  header.append(
    identity,
    createStatusBadge(
      user.status,
      USER_STATUS_LABELS
    )
  );

  const details =
    document.createElement("div");

  details.className =
    "admin-request-details";

  appendDetailRow(
    details,
    "อีเมล",
    user.email
  );

  appendDetailRow(
    details,
    "เบอร์โทร",
    user.phone
  );

  appendDetailRow(
    details,
    "ที่อยู่",
    user.address
  );

  appendDetailRow(
    details,
    "สมัครเมื่อ",
    formatDate(user.created_at)
  );

  card.append(
    header,
    details
  );

  const actions =
    document.createElement("div");

  actions.className =
    "admin-request-actions";

  const nextStatus =
    user.status === "active"
      ? "inactive"
      : "active";

  const buttonText =
    nextStatus === "inactive"
      ? "ระงับบัญชี"
      : "เปิดใช้งานบัญชี";

  const buttonClass =
    nextStatus === "inactive"
      ? "button button-secondary admin-reject-button"
      : "button button-primary";

  const statusButton =
    createActionButton(
      buttonText,
      buttonClass,
      () => {
        changeUserStatus(
          user.user_id,
          nextStatus,
          statusButton
        );
      }
    );

  actions.appendChild(
    statusButton
  );

  card.appendChild(actions);

  return card;
}

async function changeUserStatus(
  userId,
  newStatus,
  button
) {
  const statusText =
    USER_STATUS_LABELS[newStatus] ||
    newStatus;

  const confirmed = await window.CatMatchDialog.confirm(
    `ต้องการเปลี่ยนสถานะผู้ใช้เป็น “${statusText}” หรือไม่?`,
    { title: "ยืนยันสถานะผู้ใช้งาน", confirmText: "ยืนยัน", danger: newStatus !== "active" }
  );

  if (!confirmed) {
    return;
  }

  setButtonLoading(
    button,
    true
  );

  showMessage();

  try {
    const data =
      await adminApiRequest(
        `/users/${userId}/status`,
        {
          method: "PATCH",

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

    await fetchUsers();

    renderUsers();
    renderDashboardSummary();

    showMessage(
      data.message ||
      "อัปเดตสถานะผู้ใช้สำเร็จ",
      "success"
    );
  } catch (error) {
    if (
      error.message !==
        "ADMIN_TOKEN_REQUIRED" &&
      error.message !==
        "ADMIN_SESSION_EXPIRED"
    ) {
      showMessage(error.message);
    }
  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   USER LIST
   ========================================================= */

function getFilteredUsers() {
  if (
    activeUserStatus === "all"
  ) {
    return users;
  }

  return users.filter(
    (user) =>
      user.status ===
      activeUserStatus
  );
}

function renderUsers() {
  if (
    !userList ||
    !userEmpty
  ) {
    return;
  }

  const filteredUsers =
    getFilteredUsers();

  userList.replaceChildren();

  userEmpty.hidden =
    filteredUsers.length > 0;

  if (userResultCount) {
    userResultCount.textContent =
      `${filteredUsers.length} รายการ`;
  }

  filteredUsers.forEach((user) => {
    userList.appendChild(
      createUserCard(user)
    );
  });
}

async function loadUsers() {
  showMessage();

  if (userSkeleton) {
    userSkeleton.hidden = false;
  }

  if (userEmpty) {
    userEmpty.hidden = true;
  }

  userList?.replaceChildren();

  if (refreshUsersButton) {
    refreshUsersButton.disabled = true;
  }

  try {
    await fetchUsers();

    renderUsers();
    renderDashboardSummary();
  } catch (error) {
    if (
      error.message !==
        "ADMIN_TOKEN_REQUIRED" &&
      error.message !==
        "ADMIN_SESSION_EXPIRED"
    ) {
      showMessage(
        error instanceof TypeError
          ? "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบว่า npm run dev เปิดอยู่"
          : error.message
      );
    }
  } finally {
    if (userSkeleton) {
      userSkeleton.hidden = true;
    }

    if (refreshUsersButton) {
      refreshUsersButton.disabled =
        false;
    }
  }
}

/* =========================================================
   EVENTS
   ========================================================= */

menuButtons.forEach((button) => {
  button.addEventListener(
    "click",
    () => {
      const sectionName =
        button.dataset.adminSection;

      if (sectionName) {
        showSection(sectionName);
      }
    }
  );
});

farmFilterTabs.forEach((tab) => {
  tab.addEventListener(
    "click",
    () => {
      activeFarmStatus =
        tab.dataset.farmStatus ||
        "all";

      farmFilterTabs.forEach(
        (item) => {
          item.classList.toggle(
            "is-active",
            item === tab
          );
        }
      );

      renderFarms();
    }
  );
});

userFilterTabs.forEach((tab) => {
  tab.addEventListener(
    "click",
    () => {
      activeUserStatus =
        tab.dataset.userStatus ||
        "all";

      userFilterTabs.forEach(
        (item) => {
          item.classList.toggle(
            "is-active",
            item === tab
          );
        }
      );

      renderUsers();
    }
  );
});

refreshDashboardButton?.addEventListener(
  "click",
  loadDashboard
);

refreshFarmsButton?.addEventListener(
  "click",
  loadFarms
);

refreshUsersButton?.addEventListener(
  "click",
  loadUsers
);

viewAllFarmsButton?.addEventListener(
  "click",
  () => {
    activeFarmStatus = "pending";

    farmFilterTabs.forEach((tab) => {
      tab.classList.toggle(
        "is-active",
        tab.dataset.farmStatus ===
          "pending"
      );
    });

    showSection("farms");
  }
);

logoutButton?.addEventListener(
  "click",
  () => {
    clearAdminSession();

    window.location.replace(
      "./login.html"
    );
  }
);

/* =========================================================
   START
   ========================================================= */

setupAdminProfile();

const role =
  getStoredValue([
    "catmatch_role",
    "role",
  ]);

if (!getAdminToken()) {
  clearAdminSession();

  redirectToLogin(
    "กรุณาเข้าสู่ระบบผู้ดูแลระบบ"
  );
} else if (
  role &&
  role !== "admin"
) {
  clearAdminSession();

  redirectToLogin(
    "บัญชีนี้ไม่มีสิทธิ์เข้าหน้าผู้ดูแลระบบ"
  );
} else {
  const requestedSection = new URLSearchParams(window.location.search).get("section");
  const allowedSections = new Set(["overview", "farms", "users"]);
  showSection(allowedSections.has(requestedSection) ? requestedSection : "overview");
}