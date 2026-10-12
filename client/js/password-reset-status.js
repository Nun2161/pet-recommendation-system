"use strict";

const API_BASE = `${window.CATMATCH_API_URL}/auth/password-reset`;

const form =
  document.getElementById("statusForm");

const codeInput =
  document.getElementById("statusRequestCode");

const submitButton =
  document.getElementById("statusSubmit");

const errorBox =
  document.getElementById("statusError");

const badge =
  document.getElementById("statusBadge");

const title =
  document.getElementById("statusTitle");

const message =
  document.getElementById("statusMessage");

const statusLabels = {
  pending: [
    "รอตรวจสอบ",
    "คำขอกำลังรอผู้ดูแลระบบ",
    "ผู้ดูแลระบบยังไม่ได้ดำเนินการ กรุณาตรวจสอบอีกครั้งภายหลัง",
  ],

  approved: [
    "อนุมัติแล้ว",
    "คำขอได้รับการอนุมัติ",
    "กำลังเปิดหน้าตั้งรหัสผ่านใหม่",
  ],

  token_issued: [
    "ออก Token แล้ว",
    "Reset Token ถูกออกไปแล้ว",
    "หากปิดหน้าตั้งรหัสผ่าน กรุณาส่งคำขอใหม่",
  ],

  rejected: [
    "ไม่อนุมัติ",
    "คำขอไม่ได้รับการอนุมัติ",
    "กรุณาตรวจสอบข้อมูลและส่งคำขอใหม่",
  ],

  completed: [
    "เสร็จสิ้น",
    "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว",
    "เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที",
  ],

  expired: [
    "หมดอายุ",
    "คำขอหมดอายุแล้ว",
    "กรุณาส่งคำขอใหม่",
  ],

  cancelled: [
    "ยกเลิก",
    "คำขอนี้ถูกยกเลิก",
    "กรุณาใช้คำขอล่าสุด",
  ],
};

function renderStatus(status, detail) {
  const values =
    statusLabels[status] || [
      "ไม่ทราบสถานะ",
      "ไม่สามารถตรวจสอบสถานะ",
      detail || "กรุณาลองใหม่",
    ];

  if (badge) {
    badge.textContent = values[0];
    badge.dataset.status = status || "unknown";
  }

  if (title) {
    title.textContent = values[1];
  }

  if (message) {
    message.textContent =
      detail || values[2];
  }
}

function setLoading(loading) {
  if (!submitButton) return;

  submitButton.disabled = loading;
  submitButton.textContent =
    loading
      ? "กำลังตรวจสอบ..."
      : "ตรวจสอบอีกครั้ง";
}

function setError(errorMessage = "") {
  if (!errorBox) return;

  errorBox.textContent = errorMessage;
  errorBox.hidden = !errorMessage;
}

function openResetPasswordPage(resetToken) {
  const token =
    String(resetToken || "").trim();

  if (
    token.length < 30 ||
    token.length > 100
  ) {
    setError(
      "Reset Token ที่ได้รับไม่ถูกต้อง กรุณาตรวจสอบสถานะอีกครั้ง"
    );

    return;
  }

  /*
   * ไม่เก็บ Reset Token ใน localStorage
   * หรือ sessionStorage
   */
  sessionStorage.removeItem(
    "catmatch_reset_token"
  );

  sessionStorage.removeItem(
    "catmatch_reset_request_code"
  );

  const resetUrl =
    `./reset-password.html?reset_token=${encodeURIComponent(
      token
    )}`;

  window.setTimeout(() => {
    window.location.replace(resetUrl);
  }, 700);
}

async function checkStatus(requestCode) {
  const normalizedCode =
    String(requestCode || "").trim();

  if (!normalizedCode) {
    setError(
      "กรุณากรอกหมายเลขคำขอ"
    );

    codeInput?.focus();
    return;
  }

  setError();
  setLoading(true);

  try {
    const url =
      `${API_BASE}/requests/` +
      `${encodeURIComponent(normalizedCode)}/status`;

    const response = await fetch(url, {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
    });

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (
      !response.ok ||
      data.success === false
    ) {
      throw new Error(
        data.message ||
        "ตรวจสอบสถานะไม่สำเร็จ"
      );
    }

    renderStatus(
      data.status,
      data.message
    );

    if (
      data.status === "approved" &&
      data.reset_token
    ) {
      openResetPasswordPage(
        data.reset_token
      );

      return;
    }

    if (
      data.status === "token_issued"
    ) {
      sessionStorage.removeItem(
        "catmatch_reset_request_code"
      );
    }

    if (
      [
        "completed",
        "expired",
        "cancelled",
        "rejected",
      ].includes(data.status)
    ) {
      sessionStorage.removeItem(
        "catmatch_reset_request_code"
      );
    }
  } catch (error) {
    console.error(
      "Password reset status error:",
      error
    );

    setError(
      error?.message ||
      "ไม่สามารถตรวจสอบสถานะได้"
    );
  } finally {
    setLoading(false);
  }
}

form?.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const code =
      codeInput?.value.trim() || "";

    if (!code) {
      setError(
        "กรุณากรอกหมายเลขคำขอ"
      );

      codeInput?.focus();
      return;
    }

    sessionStorage.setItem(
      "catmatch_reset_request_code",
      code
    );

    checkStatus(code);
  }
);

const storedCode =
  sessionStorage.getItem(
    "catmatch_reset_request_code"
  ) || "";

if (storedCode) {
  if (codeInput) {
    codeInput.value = storedCode;
  }

  checkStatus(storedCode);
} else {
  renderStatus(
    "pending",
    "กรอกหมายเลขคำขอเพื่อเริ่มตรวจสอบสถานะ"
  );

  setLoading(false);
}