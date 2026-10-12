"use strict";

const fs = require("fs");
const path = require("path");
const {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function resolveServiceAccountPath(rawValue) {
  const raw = String(rawValue || "").trim().replace(/^['"]|['"]$/g, "");
  if (!raw) return "";

  const normalized = raw.replace(/[\\/]+/g, path.sep);
  const filename = raw.split(/[\\/]/).filter(Boolean).pop() || "firebase-service-account.json";

  const candidates = unique([
    raw,
    normalized,
    path.resolve(process.cwd(), normalized),
    path.resolve(__dirname, "..", normalized),
    path.resolve(__dirname, "..", "secrets", filename),
  ]);

  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch (_error) {
      return false;
    }
  }) || "";
}

function credentialFromServiceAccountFile(rawPath) {
  const resolvedPath = resolveServiceAccountPath(rawPath);
  if (!resolvedPath) return null;

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    return cert(serviceAccount);
  } catch (error) {
    throw new Error(
      `อ่าน Firebase service account ไม่สำเร็จ (${path.basename(resolvedPath)}): ${error.message}`
    );
  }
}

function buildCredential() {
  const credentialPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  if (credentialPath) {
    const fileCredential = credentialFromServiceAccountFile(credentialPath);
    if (fileCredential) return fileCredential;
  }

  const serviceAccountJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (serviceAccountJson) {
    try {
      return cert(JSON.parse(serviceAccountJson));
    } catch (_error) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON ไม่ใช่ JSON ที่ถูกต้อง");
    }
  }

  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  // รองรับเครื่องหรือบริการที่ตั้งค่า Application Default Credentials ไว้จริง
  if (!credentialPath) {
    try {
      return applicationDefault();
    } catch (_error) {
      // ส่งข้อความที่เข้าใจง่ายด้านล่าง
    }
  }

  throw new Error(
    "Firebase Admin ยังไม่ได้ตั้งค่าหรือหาไฟล์ service account ไม่พบ กรุณาตรวจสอบ server/secrets/firebase-service-account.json และค่า GOOGLE_APPLICATION_CREDENTIALS ใน server/.env"
  );
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) return getApp();
  return initializeApp({ credential: buildCredential() });
}

function getFirebaseAuth() {
  return getAuth(initializeFirebaseAdmin());
}

module.exports = {
  initializeFirebaseAdmin,
  getFirebaseAuth,
  resolveServiceAccountPath,
};
