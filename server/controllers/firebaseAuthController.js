"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { getFirebaseAuth } = require("../config/firebaseAdmin");

const ROLE_CONFIG = {
  admin: {
    table: "admin",
    idColumn: "admin_id",
    select: `
      SELECT admin_id, name, email, status, created_at,
             firebase_uid, firebase_provider
      FROM admin
    `,
  },
  farm: {
    table: "farm",
    idColumn: "farm_id",
    select: `
      SELECT farm_id, farm_name, owner_name, email, phone, phone_country,
             country, province, district, subdistrict, address, description,
             website, facebook, line_contact, latitude, longitude, status,
             approved_at, created_at, firebase_uid, firebase_provider
      FROM farm
    `,
  },
  user: {
    table: "users",
    idColumn: "user_id",
    select: `
      SELECT user_id, name, username, email, phone, phone_country,
             birth_date, nickname, gender, contact_preference,
             country, province, district, subdistrict, address,
             status, onboarding_completed, auth_version, created_at,
             firebase_uid, firebase_provider
      FROM users
    `,
  },
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}
function normalizeFirebaseProvider(value) {
  const provider = String(value || "")
    .trim()
    .toLowerCase();

  if (
    provider === "google" ||
    provider === "google.com"
  ) {
    return "google.com";
  }

  if (
    provider === "password" ||
    provider === "email" ||
    provider === "email_password"
  ) {
    return "password";
  }

  return provider;
}

function throwProviderConflict(
  existingProvider,
  incomingProvider
) {
  const existing =
    normalizeFirebaseProvider(existingProvider);

  const incoming =
    normalizeFirebaseProvider(incomingProvider);

  let code = "AUTH_PROVIDER_CONFLICT";
  let message =
    "อีเมลนี้ถูกสมัครด้วยช่องทางเข้าสู่ระบบอื่นแล้ว";

  if (
    existing === "password" &&
    incoming === "google.com"
  ) {
    code = "EMAIL_REGISTERED_WITH_PASSWORD";
    message =
      "อีเมลนี้สมัครด้วยอีเมลและรหัสผ่านแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน";
  } else if (
    existing === "google.com" &&
    incoming === "password"
  ) {
    code = "EMAIL_REGISTERED_WITH_GOOGLE";
    message =
      "อีเมลนี้สมัครผ่าน Google แล้ว กรุณาเข้าสู่ระบบด้วย Google";
  }

  const error = new Error(message);
  error.statusCode = 409;
  error.code = code;

  throw error;
}

function assertProviderCompatibility(
  record,
  incomingProvider
) {
  const existingProvider =
    normalizeFirebaseProvider(
      record?.firebase_provider
    );

  const normalizedIncomingProvider =
    normalizeFirebaseProvider(
      incomingProvider
    );

  /*
   * บัญชีเก่าที่ยังไม่มี Provider สามารถเชื่อมได้
   */
  if (
    !existingProvider ||
    existingProvider === "unknown"
  ) {
    return;
  }

  if (
    !normalizedIncomingProvider ||
    normalizedIncomingProvider === "unknown"
  ) {
    return;
  }

  if (
    existingProvider !==
    normalizedIncomingProvider
  ) {
    throwProviderConflict(
      existingProvider,
      normalizedIncomingProvider
    );
  }
}
function createAppToken(role, record, firebaseUid) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET ยังไม่ได้ตั้งค่าใน server/.env");
  }

  const config = ROLE_CONFIG[role];
  const id = Number(record[config.idColumn]);

  return jwt.sign(
    {
      [config.idColumn]: id,
      email: normalizeEmail(record.email),
      role,
      firebase_uid: firebaseUid,
      auth_version: Number(record.auth_version || 0),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function throwDuplicateRoleAccount(identifier) {
  const error = new Error(
    `พบอีเมลหรือ Firebase UID ซ้ำมากกว่าหนึ่งบัญชี (${identifier}) กรุณาแก้ข้อมูลในฐานข้อมูลก่อน`
  );
  error.statusCode = 409;
  error.code = "DUPLICATE_ROLE_ACCOUNT";
  throw error;
}

async function findAccountByFirebaseUid(uid) {
  const matches = [];

  for (const role of ["admin", "farm", "user"]) {
    const config = ROLE_CONFIG[role];
    const [rows] = await db.query(
      `${config.select} WHERE firebase_uid = ? LIMIT 2`,
      [uid]
    );
    if (rows.length > 1) throwDuplicateRoleAccount(`${role}:${uid}`);
    if (rows.length > 0) matches.push({ role, record: rows[0] });
  }

  if (matches.length > 1) throwDuplicateRoleAccount(uid);
  return matches[0] || null;
}

async function findAccountByEmail(email) {
  const matches = [];

  for (const role of ["admin", "farm", "user"]) {
    const config = ROLE_CONFIG[role];
    const [rows] = await db.query(
      `${config.select} WHERE LOWER(email) = ? LIMIT 2`,
      [email]
    );
    if (rows.length > 1) throwDuplicateRoleAccount(`${role}:${email}`);
    if (rows.length > 0) matches.push({ role, record: rows[0] });
  }

  if (matches.length > 1) throwDuplicateRoleAccount(email);
  return matches[0] || null;
}

async function buildUniqueUsername(email, uid) {
  let base = String(email || "user")
    .split("@")[0]
    .replace(/[^A-Za-z0-9_]/g, "");

  if (!/^[A-Za-z]/.test(base)) base = `u${base}`;
  if (!base) base = "user";

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = crypto
      .createHash("sha256")
      .update(`${uid}:${attempt}`)
      .digest("hex")
      .slice(0, 4);
    const username = `${base.slice(0, 6)}${suffix}`.slice(0, 10).padEnd(10, "0");
    const [rows] = await db.query(
      "SELECT user_id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1",
      [username]
    );
    if (rows.length === 0) return username;
  }

  throw new Error("ไม่สามารถสร้างชื่อผู้ใช้งานอัตโนมัติได้");
}

function getGoogleDisplayNameBase(decoded) {
  const candidate = String(decoded.name || decoded.email?.split("@")[0] || "Google User")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);

  return candidate || "Google User";
}

async function buildUniqueGoogleDisplayName(decoded) {
  const base = getGoogleDisplayNameBase(decoded);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0
      ? ""
      : ` ${crypto.createHash("sha256").update(`${decoded.uid}:${attempt}`).digest("hex").slice(0, 4)}`;
    const candidate = `${base.slice(0, 80 - suffix.length)}${suffix}`;
    const [rows] = await db.query(
      "SELECT user_id FROM users WHERE name_normalized = ? LIMIT 1",
      [candidate.toLowerCase()]
    );
    if (rows.length === 0) return candidate;
  }

  throw new Error("ไม่สามารถสร้างชื่อโปรไฟล์ Google ที่ไม่ซ้ำได้");
}

async function createGoogleUser(decoded, provider) {
  const email = normalizeEmail(decoded.email);
  const name = await buildUniqueGoogleDisplayName(decoded);
  const username = await buildUniqueUsername(email, decoded.uid);
  const placeholderPassword = await bcrypt.hash(
    crypto.randomBytes(48).toString("base64url"),
    12
  );
  const nickname = name.split(" ")[0].slice(0, 30) || "Google";

  try {
    const [result] = await db.query(
      `
        INSERT INTO users (
          name,
          name_normalized,
          username,
          email,
          password,
          phone,
          phone_country,
          birth_date,
          nickname,
          gender,
          contact_preference,
          country,
          province,
          district,
          subdistrict,
          address,
          onboarding_completed,
          status,
          firebase_uid,
          firebase_provider
        )
        VALUES (?, ?, ?, ?, ?, NULL, 'TH', NULL, ?, 'prefer_not_to_say',
                'email', '', '', '', NULL, '', 0, 'active', ?, ?)
      `,
      [
        name,
        name.toLowerCase(),
        username,
        email,
        placeholderPassword,
        nickname,
        decoded.uid,
        provider,
      ]
    );

    return {
      user_id: Number(result.insertId),
      name,
      username,
      email,
      phone: null,
      status: "active",
      onboarding_completed: 0,
      auth_version: 0,
      firebase_uid: decoded.uid,
      firebase_provider: provider,
    };
  } catch (error) {
  if (error.code === "ER_DUP_ENTRY") {
    const existing =
      await findAccountByEmail(email);

    if (existing) {
      /*
       * ถ้าอีเมลเดิมเป็น Password
       * ห้าม Google นำบัญชีเดิมมาใช้
       */
      assertProviderCompatibility(
        existing.record,
        provider
      );

      if (existing.role === "user") {
        return existing.record;
      }
    }
  }

  throw error;
}

}
async function linkFirebaseAccount(
  role,
  record,
  uid,
  provider
) {
  const config = ROLE_CONFIG[role];

  const currentUid = String(
    record.firebase_uid || ""
  );

  const incomingProvider =
    normalizeFirebaseProvider(provider);

  const existingProvider =
    normalizeFirebaseProvider(
      record.firebase_provider
    );

  /*
   * ห้ามเปลี่ยนช่องทางเข้าสู่ระบบเดิม
   */
  assertProviderCompatibility(
    record,
    incomingProvider
  );

  if (
    currentUid &&
    currentUid !== uid
  ) {
    const error = new Error(
      "อีเมลนี้เชื่อมกับบัญชี Firebase อื่นแล้ว กรุณาติดต่อผู้ดูแลระบบ"
    );

    error.statusCode = 409;
    error.code = "FIREBASE_UID_CONFLICT";

    throw error;
  }

  /*
   * ถ้าบัญชีเดิมมี Provider อยู่แล้ว
   * ให้รักษาค่าเดิม ห้ามเขียนทับ
   */
  const providerToSave =
    existingProvider &&
    existingProvider !== "unknown"
      ? existingProvider
      : incomingProvider;

  await db.query(
    `
      UPDATE ${config.table}
      SET
        firebase_uid = ?,
        firebase_provider = ?
      WHERE ${config.idColumn} = ?
    `,
    [
      uid,
      providerToSave,
      record[config.idColumn],
    ]
  );

  record.firebase_uid = uid;
  record.firebase_provider =
    providerToSave;
}

function assertFirebaseIdentityMatchesRecord(record, decoded) {
  const recordUid = String(record?.firebase_uid || "").trim();
  const tokenUid = String(decoded?.uid || "").trim();
  const recordEmail = normalizeEmail(record?.email);
  const tokenEmail = normalizeEmail(decoded?.email);

  if (recordUid && tokenUid && recordUid !== tokenUid) {
    const error = new Error(
      "บัญชี CatMatch นี้เชื่อมกับ Google UID อื่น ระบบจึงไม่อนุญาตให้ใช้ข้อมูลร่วมกัน"
    );
    error.statusCode = 409;
    error.code = "FIREBASE_UID_CONFLICT";
    throw error;
  }

  // เมื่อค้นพบบัญชีด้วย UID แล้ว อีเมลต้องเป็นของตัวตนเดียวกันด้วย
  // หากฐานข้อมูลเคยผูก UID ผิด จะหยุดก่อนส่งโปรไฟล์ของคนอื่นกลับไป
  if (recordUid && recordEmail && tokenEmail && recordEmail !== tokenEmail) {
    const error = new Error(
      "บัญชี Google นี้ถูกผูกกับข้อมูล CatMatch คนละอีเมล กรุณาให้แอดมินตรวจสอบการเชื่อมบัญชี"
    );
    error.statusCode = 409;
    error.code = "FIREBASE_ACCOUNT_EMAIL_MISMATCH";
    throw error;
  }
}

function assertRoleCanLogin(role, record) {
  const status = String(record.status || "").toLowerCase();

  if (role === "admin" && status !== "active") {
    const error = new Error("บัญชีผู้ดูแลระบบไม่สามารถใช้งานได้");
    error.statusCode = 403;
    error.code = "ADMIN_INACTIVE";
    throw error;
  }

  if (role === "farm" && status !== "approved") {
    const error = new Error(
      status === "rejected"
        ? "คำขอเจ้าของฟาร์มไม่ได้รับการอนุมัติ กรุณาติดต่อผู้ดูแลระบบ"
        : "บัญชีเจ้าของฟาร์มกำลังรอแอดมินอนุมัติ"
    );
    error.statusCode = 403;
    error.code = status === "rejected" ? "FARM_REJECTED" : "FARM_PENDING";
    throw error;
  }

  if (role === "user" && status !== "active") {
    const error = new Error("บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
    error.statusCode = 403;
    error.code = "USER_INACTIVE";
    throw error;
  }
}


function needsGoogleProfileOnboarding(record = {}) {
  if (String(record.firebase_provider || "") !== "google.com") return false;
  return [record.phone, record.country, record.province, record.district, record.address]
    .some((value) => !String(value || "").trim());
}

function buildProfile(role, record) {
  if (role === "admin") {
    return {
      admin_id: Number(record.admin_id),
      name: record.name,
      email: normalizeEmail(record.email),
      status: record.status,
      created_at: record.created_at,
      firebase_uid: record.firebase_uid || "",
      firebase_provider: record.firebase_provider || "",
    };
  }

  if (role === "farm") {
    return {
      farm_id: Number(record.farm_id),
      farm_name: record.farm_name,
      owner_name: record.owner_name,
      email: normalizeEmail(record.email),
      phone: record.phone,
      phone_country: record.phone_country || "TH",
      country: record.country || "Thailand",
      province: record.province || "",
      district: record.district || "",
      subdistrict: record.subdistrict || "",
      address: record.address,
      description: record.description || "",
      website: record.website || "",
      facebook: record.facebook || "",
      line_contact: record.line_contact || "",
      latitude: record.latitude === null ? null : Number(record.latitude),
      longitude: record.longitude === null ? null : Number(record.longitude),
      status: record.status,
      approved_at: record.approved_at,
      created_at: record.created_at,
      firebase_uid: record.firebase_uid || "",
      firebase_provider: record.firebase_provider || "",
    };
  }

  const needsProfileOnboarding = needsGoogleProfileOnboarding(record);

  return {
    user_id: Number(record.user_id),
    name: record.name,
    username: record.username,
    email: normalizeEmail(record.email),
    phone: record.phone,
    phone_country: record.phone_country || "TH",
    birth_date: record.birth_date || null,
    nickname: record.nickname || "",
    gender: record.gender || "prefer_not_to_say",
    contact_preference: record.contact_preference || "email",
    country: record.country || "",
    province: record.province || "",
    district: record.district || "",
    subdistrict: record.subdistrict || null,
    address: record.address || "",
    status: record.status,
    firebase_uid: record.firebase_uid || "",
    firebase_provider: record.firebase_provider || "",
    onboarding_completed: Boolean(Number(record.onboarding_completed)),
    needs_profile_onboarding: needsProfileOnboarding,
    needs_interest_onboarding: !needsProfileOnboarding && Number(record.onboarding_completed) === 0,
  };
}

async function firebaseSession(req, res) {
  try {
    const idToken = String(req.body?.idToken || "").trim();
    const allowCreate = req.body?.allowCreate === true;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "ไม่พบ Firebase ID Token",
      });
    }

    const decoded = await getFirebaseAuth().verifyIdToken(idToken, true);
    const email = normalizeEmail(decoded.email);
   const provider =
  normalizeFirebaseProvider(
    decoded.firebase?.sign_in_provider ||
      "unknown"
  );

    if (!email) {
      return res.status(403).json({
        success: false,
        message: "บัญชี Firebase นี้ไม่มีอีเมลสำหรับเชื่อมกับ CatMatch",
      });
    }

   let account =
  await findAccountByFirebaseUid(
    decoded.uid
  );

const matchedByFirebaseUid =
  Boolean(account);

if (!account) {
  account =
    await findAccountByEmail(email);
}

/*
 * เจอบัญชีแล้วต้องตรวจ Provider ก่อนเชื่อม UID
 */
if (account) {
  assertProviderCompatibility(
    account.record,
    provider
  );
}

    if (
      account &&
      !matchedByFirebaseUid &&
      !account.record.firebase_uid &&
      decoded.email_verified !== true
    ) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_VERIFICATION_REQUIRED_FOR_LINKING",
        message: "ต้องยืนยันอีเมลใน Firebase ก่อนเชื่อมกับบัญชี CatMatch เดิม",
      });
    }

    if (!account) {
      if (provider !== "google.com" || !allowCreate) {
        return res.status(404).json({
          success: false,
          code: "PROFILE_NOT_FOUND",
          message: "ไม่พบข้อมูลบัญชีใน CatMatch กรุณาสมัครสมาชิกก่อน",
        });
      }

      if (decoded.email_verified !== true) {
        return res.status(403).json({
          success: false,
          code: "GOOGLE_EMAIL_NOT_VERIFIED",
          message: "บัญชี Google นี้ยังไม่ได้ยืนยันอีเมล",
        });
      }

      account = {
        role: "user",
        record: await createGoogleUser(decoded, provider),
      };
    }

    const { role, record } = account;
    assertFirebaseIdentityMatchesRecord(record, decoded);
    await linkFirebaseAccount(role, record, decoded.uid, provider);
    assertRoleCanLogin(role, record);

    const token = createAppToken(role, record, decoded.uid);
    const profile = buildProfile(role, record);
    const needsProfileOnboarding =
      role === "user" ? Boolean(profile.needs_profile_onboarding) : false;
    const needsInterestOnboarding =
      role === "user" ? Boolean(profile.needs_interest_onboarding) : false;

    return res.status(200).json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      role,
      firebase_uid: decoded.uid,
      [role]: profile,
      user: role === "user" ? profile : undefined,
      needs_profile_onboarding: needsProfileOnboarding,
      needs_interest_onboarding: needsInterestOnboarding,
    });
  } catch (error) {
    console.error("Firebase session error:", error);

    const firebaseCode = String(error.code || "");
    const invalidFirebaseToken = [
      "auth/id-token-expired",
      "auth/id-token-revoked",
      "auth/argument-error",
    ].includes(firebaseCode);

    const status = Number(error.statusCode) || (invalidFirebaseToken ? 401 : 500);
    const message = invalidFirebaseToken
      ? "เซสชัน Firebase ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่"
      : error.message || "ไม่สามารถเข้าสู่ระบบด้วย Firebase ได้";

    return res.status(status).json({
      success: false,
      code: error.code || firebaseCode || "FIREBASE_SESSION_ERROR",
      message,
    });
  }
}

module.exports = { firebaseSession };
