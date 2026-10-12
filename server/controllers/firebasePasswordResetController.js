"use strict";

const {
  submitPasswordResetRequest,
} = require("./passwordResetController");

const { getFirebaseAuth } = require("../config/firebaseAdmin");
const {
  sendPasswordResetEmail,
} = require("../services/emailService");

const GENERIC_SUCCESS_MESSAGE =
  "หากอีเมลนี้มีบัญชี CatMatch เราได้ส่งลิงก์รีเซ็ตรหัสผ่านให้แล้ว กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์สแปม";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} ยังไม่ได้ตั้งค่าใน server/.env`);
  }

  return value;
}

function createCatMatchResetUrl(firebaseResetLink) {
  const firebaseUrl = new URL(firebaseResetLink);
  const actionCode = firebaseUrl.searchParams.get("oobCode");

  if (!actionCode) {
    throw new Error("Firebase ไม่ได้ส่ง oobCode กลับมา");
  }

  const customUrl = new URL(requireEnv("PASSWORD_RESET_PAGE_URL"));

  customUrl.searchParams.set("mode", "resetPassword");
  customUrl.searchParams.set("oobCode", actionCode);
  customUrl.searchParams.set("lang", "th");

  const apiKey = firebaseUrl.searchParams.get("apiKey");
  const continueUrl = firebaseUrl.searchParams.get("continueUrl");

  if (apiKey) {
    customUrl.searchParams.set("apiKey", apiKey);
  }

  if (continueUrl) {
    customUrl.searchParams.set("continueUrl", continueUrl);
  }

  return customUrl.toString();
}

async function requestPasswordReset(req, res) {
  return submitPasswordResetRequest(req, res);
}



module.exports = {
  requestPasswordReset,
};