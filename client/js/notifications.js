"use strict";

const NOTIFICATIONS_API = `${window.CATMATCH_API_URL}/notifications`;

const AUTH_KEYS = [
  "catmatch_token",
  "userToken",
  "token",
  "catmatch_user",
  "user",
];

const notificationState = {
  items: [],
  filter: "all",
  loading: false,
};

const ui = {};

document.addEventListener(
  "DOMContentLoaded",
  initializeNotifications
);

function initializeNotifications() {
  cacheElements();

  if (!setupAccount()) {
    return;
  }

  setupMenus();
  setupActions();
  void loadNotifications();
}

function cacheElements() {
  ui.list =
    document.getElementById("notificationsList");

  ui.loading =
    document.getElementById("notificationsLoading");

  ui.error =
    document.getElementById("notificationsError");

  ui.errorMessage =
    document.getElementById(
      "notificationsErrorMessage"
    );

  ui.empty =
    document.getElementById("notificationsEmpty");

  ui.emptyTitle =
    document.getElementById(
      "notificationsEmptyTitle"
    );

  ui.emptyMessage =
    document.getElementById(
      "notificationsEmptyMessage"
    );

  ui.unreadCount =
    document.getElementById("unreadCount");

  ui.status =
    document.getElementById(
      "notificationsStatus"
    );

  ui.refresh =
    document.getElementById(
      "refreshNotifications"
    );

  ui.markAll =
    document.getElementById("markAllRead");

  ui.retry =
    document.getElementById(
      "retryNotifications"
    );

  ui.filters =
    Array.from(
      document.querySelectorAll(
        ".notification-filter"
      )
    );
}

function readStoredJSON(key) {
  for (
    const storage of [
      localStorage,
      sessionStorage,
    ]
  ) {
    const raw =
      storage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      // ข้ามค่าที่ไม่ใช่ JSON
    }
  }

  return null;
}

function getToken() {
  for (
    const storage of [
      localStorage,
      sessionStorage,
    ]
  ) {
    for (
      const key of [
        "catmatch_token",
        "userToken",
        "token",
      ]
    ) {
      const value =
        storage.getItem(key);

      if (value) {
        return value;
      }
    }
  }

  return "";
}

function getUser() {
  return (
    readStoredJSON("catmatch_user") ||
    readStoredJSON("user") ||
    null
  );
}

function clearAuth() {
  for (
    const storage of [
      localStorage,
      sessionStorage,
    ]
  ) {
    AUTH_KEYS.forEach(
      (key) => {
        storage.removeItem(key);
      }
    );
  }
}

function getDisplayName(user) {
  return String(
    user?.username ||
    user?.full_name ||
    user?.name ||
    "ผู้ใช้งาน"
  ).trim();
}

function setupAccount() {
  const token = getToken();

  if (!token) {
    window.location.replace(
      "./login.html?return=notifications"
    );

    return false;
  }

  const user = getUser();
  const name = getDisplayName(user);
  const email =
    String(user?.email || "").trim();

  const initial =
    name.charAt(0).toUpperCase() ||
    "U";

  const values = {
    userDisplayName: name,
    userMenuName: name,
    userMenuEmail: email,
    userAvatar: initial,
    userMenuAvatar: initial,
  };

  Object.entries(values).forEach(
    ([id, value]) => {
      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = value;
      }
    }
  );

  const actions =
    document.getElementById(
      "userNavActions"
    );

  if (actions) {
    actions.hidden = false;
  }

  document
    .getElementById("logoutButton")
    ?.addEventListener(
      "click",
      () => {
        clearAuth();

        window.location.replace(
          "./login.html"
        );
      }
    );

  return true;
}

function setupMenus() {
  const trigger =
    document.getElementById(
      "userMenuTrigger"
    );

  const panel =
    document.getElementById(
      "userMenuPanel"
    );

  trigger?.addEventListener(
    "click",
    () => {
      const open =
        trigger.getAttribute(
          "aria-expanded"
        ) === "true";

      trigger.setAttribute(
        "aria-expanded",
        String(!open)
      );

      if (panel) {
        panel.hidden = open;
      }
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        !trigger ||
        !panel ||
        panel.hidden ||
        trigger.contains(event.target) ||
        panel.contains(event.target)
      ) {
        return;
      }

      panel.hidden = true;

      trigger.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  );

  const menuToggle =
    document.getElementById(
      "menuToggle"
    );

  const mainNav =
    document.getElementById(
      "mainNav"
    );

  menuToggle?.addEventListener(
    "click",
    () => {
      const open =
        menuToggle.getAttribute(
          "aria-expanded"
        ) === "true";

      menuToggle.setAttribute(
        "aria-expanded",
        String(!open)
      );

      mainNav?.classList.toggle(
        "is-open",
        !open
      );
    }
  );
}

function setupActions() {
  ui.refresh?.addEventListener(
    "click",
    () => {
      void loadNotifications();
    }
  );

  ui.retry?.addEventListener(
    "click",
    () => {
      void loadNotifications();
    }
  );

  ui.markAll?.addEventListener(
    "click",
    () => {
      void markAllRead();
    }
  );

  ui.filters.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          notificationState.filter =
            button.dataset.filter ||
            "all";

          ui.filters.forEach(
            (item) => {
              item.classList.toggle(
                "is-active",
                item === button
              );
            }
          );

          renderNotifications();
        }
      );
    }
  );

  ui.list?.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-read-id]"
        );

      if (!button) {
        return;
      }

      const id =
        Number(button.dataset.readId);

      if (Number.isInteger(id)) {
        void markOneRead(id);
      }
    }
  );
}

async function requestAPI(
  endpoint = "",
  options = {}
) {
  const token = getToken();

  const response =
    await fetch(
      `${NOTIFICATIONS_API}${endpoint}`,
      {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization:
            `Bearer ${token}`,
          ...(options.headers || {}),
        },
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    clearAuth();

    window.location.replace(
      "./login.html?return=notifications"
    );

    throw new Error(
      "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `เกิดข้อผิดพลาด (${response.status})`
    );
  }

  return data;
}

async function loadNotifications() {
  if (notificationState.loading) {
    return;
  }

  setLoading(true);
  showError("");
  setStatus("");

  try {
    const result =
      await requestAPI();

    const rows =
      Array.isArray(result?.data)
        ? result.data
        : [];

    notificationState.items =
      rows.map(normalizeNotification);

    renderNotifications();

    setStatus(
      `โหลดแล้ว ${rows.length} รายการ`
    );
  } catch (error) {
    showError(
      error?.message ||
      "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
    );
  } finally {
    setLoading(false);
  }
}

async function markOneRead(id) {
  try {
    await requestAPI(
      `/${id}/read`,
      {
        method: "PATCH",
      }
    );

    const item =
      notificationState.items.find(
        (notification) =>
          notification.id === id
      );

    if (item) {
      item.isRead = true;
    }

    renderNotifications();
    setStatus(
      "ทำเครื่องหมายว่าอ่านแล้ว"
    );
  } catch (error) {
    setStatus(
      error?.message ||
      "อัปเดตสถานะไม่สำเร็จ",
      true
    );
  }
}

async function markAllRead() {
  const hasUnread =
    notificationState.items.some(
      (item) => !item.isRead
    );

  if (!hasUnread) {
    setStatus(
      "ไม่มีรายการที่ยังไม่ได้อ่าน"
    );

    return;
  }

  setControlsDisabled(true);

  try {
    await requestAPI(
      "/read-all",
      {
        method: "PATCH",
      }
    );

    notificationState.items.forEach(
      (item) => {
        item.isRead = true;
      }
    );

    renderNotifications();

    setStatus(
      "อ่านการแจ้งเตือนทั้งหมดแล้ว"
    );
  } catch (error) {
    setStatus(
      error?.message ||
      "อัปเดตสถานะไม่สำเร็จ",
      true
    );
  } finally {
    setControlsDisabled(false);
  }
}

function normalizeNotification(row) {
  return {
    id: Number(
      row?.notification_id ??
      row?.id
    ),

    type: String(
      row?.notification_type ??
      row?.type ??
      "general"
    ).toLowerCase(),

    title: String(
      row?.title ||
      "การแจ้งเตือน"
    ),

    message: String(
      row?.message || ""
    ),

    requestId:
      row?.related_request_id ??
      row?.request_id ??
      null,

    isRead:
      row?.is_read === true ||
      Number(row?.is_read) === 1,

    createdAt:
      row?.created_at ||
      row?.createdAt ||
      null,
  };
}

function notificationAllowedBySettings(item) {
  const settings = window.CatMatchSettings?.get?.() || {};
  const text = `${item.type} ${item.title} ${item.message}`.toLowerCase();
  const farm = item.requestId || /adoption|farm|ฟาร์ม|อุปการะ|อนุมัติ|ปฏิเสธ/.test(text);
  const recommendation = /recommend|breed|คำแนะนำ|สายพันธุ์|เหมาะกับคุณ/.test(text);
  const news = /news|update|announcement|ข่าวสาร|ประกาศ|ฟีเจอร์/.test(text);
  if (farm && settings.farmResponses === false) return false;
  if (recommendation && settings.recommendationUpdates === false) return false;
  if (news && settings.productUpdates === false) return false;
  return true;
}

function renderNotifications() {
  const unreadCount =
    notificationState.items.filter(
      (item) => !item.isRead
    ).length;

  ui.unreadCount.textContent =
    String(unreadCount);

  ui.markAll.disabled =
    unreadCount === 0 ||
    notificationState.loading;

  const allowedItems = notificationState.items.filter(notificationAllowedBySettings);

  const visible =
    notificationState.filter ===
      "unread"
      ? allowedItems
          .filter(
            (item) => !item.isRead
          )
      : allowedItems;

  ui.error.hidden = true;
  ui.empty.hidden = true;
  ui.list.hidden = true;

  if (visible.length === 0) {
    ui.empty.hidden = false;

    const onlyUnreadEmpty =
      notificationState.items.length > 0 &&
      notificationState.filter ===
        "unread";

    ui.emptyTitle.textContent =
      onlyUnreadEmpty
        ? "อ่านครบทั้งหมดแล้ว"
        : "ยังไม่มีการแจ้งเตือน";

    ui.emptyMessage.textContent =
      onlyUnreadEmpty
        ? "ตอนนี้ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน"
        : "เมื่อฟาร์มตอบกลับคำขออุปการะ รายการจะมาแสดงที่นี่";

    return;
  }

  ui.list.hidden = false;

  ui.list.innerHTML =
    visible
      .map(createCard)
      .join("");
}

function createCard(item) {
  const appearance =
    getAppearance(item);

  return `
    <article
      class="notification-card ${
        item.isRead
          ? ""
          : "is-unread"
      } ${appearance.className}"
    >
      <div
        class="notification-icon"
        aria-hidden="true"
      >
        ${appearance.icon}
      </div>

      <div class="notification-body">
        <h2>${escapeHTML(item.title)}</h2>
        <p>${escapeHTML(item.message)}</p>

        <div class="notification-meta">
          <time>
            ${formatDate(item.createdAt)}
          </time>

          ${
            item.isRead
              ? ""
              : '<span class="notification-unread">ยังไม่ได้อ่าน</span>'
          }
        </div>
      </div>

      <div class="notification-side">
        ${
          item.isRead
            ? ""
            : `
              <button
                class="notification-read-button"
                type="button"
                data-read-id="${item.id}"
              >
                อ่านแล้ว
              </button>
            `
        }

        ${
          item.requestId
            ? `
              <a
                class="notification-request-link"
                href="./adoption-requests.html?request_id=${encodeURIComponent(
                  item.requestId
                )}"
              >
                ดูคำขอ
              </a>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function getAppearance(item) {
  const text =
    `${item.type} ${item.title} ${item.message}`
      .toLowerCase();

  if (
    text.includes("approved") ||
    text.includes("อนุมัติ")
  ) {
    return {
      icon: "✓",
      className: "is-approved",
    };
  }

  if (
    text.includes("rejected") ||
    text.includes("ปฏิเสธ")
  ) {
    return {
      icon: "×",
      className: "is-rejected",
    };
  }

  return {
    icon: "◷",
    className: "is-general",
  };
}

function setLoading(loading) {
  notificationState.loading =
    loading;

  ui.loading.hidden = !loading;
  ui.refresh.disabled = loading;
  ui.markAll.disabled = loading;

  ui.filters.forEach(
    (button) => {
      button.disabled = loading;
    }
  );

  if (loading) {
    ui.error.hidden = true;
    ui.empty.hidden = true;
    ui.list.hidden = true;
  }
}

function setControlsDisabled(disabled) {
  ui.refresh.disabled = disabled;
  ui.markAll.disabled = disabled;

  ui.filters.forEach(
    (button) => {
      button.disabled = disabled;
    }
  );
}

function showError(message = "") {
  ui.error.hidden = !message;

  if (message) {
    ui.errorMessage.textContent =
      message;

    ui.list.hidden = true;
    ui.empty.hidden = true;
  }
}

function setStatus(
  message = "",
  isError = false
) {
  ui.status.textContent = message;

  ui.status.style.color =
    isError
      ? "#bd5c69"
      : "";
}

function formatDate(value) {
  if (!value) {
    return "ไม่ระบุเวลา";
  }

  const normalized =
    typeof value === "string" &&
    value.includes(" ") &&
    !value.includes("T")
      ? value.replace(" ", "T")
      : value;

  const date =
    new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
