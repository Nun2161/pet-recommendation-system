"use strict";

const db = require("../config/db");

const ALLOWED_INTERESTS = new Set(["assessment", "breeds", "farms"]);
const GOOGLE_PROVIDER = "google.com";

const normalizeFullName = (value) => String(value || "")
  .normalize("NFKC")
  .trim()
  .replace(/\s+/g, " ");
const normalizeUsername = (value) => String(value || "").trim();

const parseStoredInterests = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isGoogleProfileIncomplete = (user = {}) => {
  if (String(user.firebase_provider || "") !== GOOGLE_PROVIDER) return false;
  return [user.phone, user.country, user.province, user.district, user.address]
    .some((value) => !String(value || "").trim());
};

const formatProfile = (user = {}) => ({
  user_id: Number(user.user_id),
  name: user.name || "",
  username: user.username || "",
  email: String(user.email || "").trim().toLowerCase(),
  phone: user.phone || "",
  phone_country: user.phone_country || "TH",
  birth_date: user.birth_date || null,
  nickname: user.nickname || "",
  gender: user.gender || "prefer_not_to_say",
  contact_preference: user.contact_preference || "email",
  country: user.country || "",
  province: user.province || "",
  district: user.district || "",
  subdistrict: user.subdistrict || null,
  address: user.address || "",
  status: user.status || "active",
  firebase_uid: user.firebase_uid || "",
  firebase_provider: user.firebase_provider || "",
  onboarding_completed: Boolean(Number(user.onboarding_completed)),
  needs_profile_onboarding: isGoogleProfileIncomplete(user),
  needs_interest_onboarding: Number(user.onboarding_completed) === 0,
});

const selectUserProfile = async (userId, connection = db) => {
  const [rows] = await connection.query(
    `
      SELECT user_id, name, username, email, phone, phone_country,
             birth_date, nickname, gender, contact_preference,
             country, province, district, subdistrict, address,
             onboarding_completed, user_interests, status,
             firebase_uid, firebase_provider
      FROM users
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] || null;
};

const validateGoogleProfilePayload = (body = {}) => {
  const data = {
    name: normalizeFullName(body.name),
    username: normalizeUsername(body.username),
    phone: String(body.phone || "").trim(),
    phone_country: String(body.phone_country || "TH").trim().toUpperCase(),
    birth_date: body.birth_date || null,
    nickname: String(body.nickname || "").trim(),
    gender: String(body.gender || "").trim(),
    contact_preference: "email",
    country: String(body.country || "").trim(),
    province: String(body.province || "").trim(),
    district: String(body.district || "").trim(),
    subdistrict: body.subdistrict ? String(body.subdistrict).trim() : null,
    address: String(body.address || "").trim(),
    accepted_terms: body.accepted_terms === true,
  };

  const errors = {};

  if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)+$/.test(data.name)) {
    errors.name = "กรุณากรอกชื่อและนามสกุลเป็นภาษาอังกฤษ เช่น Kanda Jaiboon";
  } else if (data.name.length < 3 || data.name.length > 80) {
    errors.name = "ชื่อและนามสกุลต้องมีความยาว 3–80 ตัวอักษร";
  }

  if (!/^[A-Za-z][A-Za-z0-9_]{9}$/.test(data.username)) {
    errors.username = "ชื่อผู้ใช้งานต้องมี 10 ตัวพอดี ขึ้นต้นด้วยตัวอักษรอังกฤษ และใช้ได้เฉพาะตัวอักษร ตัวเลข หรือ _";
  }

  const allowedPhoneCountries = new Set(["TH", "LA", "KH", "MM", "VN", "MY", "SG", "ID", "PH", "CN", "JP", "KR", "IN", "AU", "GB", "US", "CA"]);
  if (!allowedPhoneCountries.has(data.phone_country)) errors.phone_country = "รหัสประเทศของหมายเลขโทรศัพท์ไม่ถูกต้อง";
  if (!/^\+[1-9]\d{7,14}$/.test(data.phone)) errors.phone = "เบอร์โทรศัพท์ต้องอยู่ในรูปแบบสากลและมี 8–15 หลัก";

  if (data.birth_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.birth_date)) {
      errors.birthDate = "รูปแบบวันเกิดไม่ถูกต้อง";
    } else {
      const [year, month, day] = data.birth_date.split("-").map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      const currentYear = new Date().getFullYear();
      const realDate = parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
      if (year >= 2400) errors.birthDate = "กรุณากรอกปี ค.ศ. เท่านั้น ไม่ใช้ปี พ.ศ.";
      else if (year < 1900 || year > currentYear || !realDate) errors.birthDate = "วันเกิดไม่ถูกต้อง";
    }
  }

  if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(data.nickname)) {
    errors.nickname = "กรุณากรอกชื่อเล่นเป็นภาษาอังกฤษ เช่น Olive";
  } else if (data.nickname.length < 2 || data.nickname.length > 30) {
    errors.nickname = "ชื่อเล่นต้องมีความยาว 2–30 ตัวอักษร";
  }

  if (!["female", "male", "nonbinary", "prefer_not_to_say"].includes(data.gender)) errors.gender = "กรุณาเลือกเพศ";
  if (!data.country || data.country.length > 100) errors.country = "กรุณาระบุประเทศ";
  if (!data.province || data.province.length > 100) errors.province = "กรุณาระบุจังหวัด รัฐ หรือภูมิภาค";
  if (!data.district || data.district.length > 100) errors.district = "กรุณาระบุอำเภอ เขต หรือเมือง";
  if (data.subdistrict && data.subdistrict.length > 100) errors.subdistrict = "ข้อมูลตำบล แขวง หรือพื้นที่ย่อยยาวเกินกำหนด";
  if (data.address.length < 5 || data.address.length > 500) errors.address = "กรุณากรอกรายละเอียดที่อยู่ 5–500 ตัวอักษร";
  if (!data.accepted_terms) errors.terms = "กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว";

  return { valid: Object.keys(errors).length === 0, data, errors };
};

const getGoogleProfileOnboarding = async (req, res) => {
  try {
    const user = await selectUserProfile(req.user.user_id);
    if (!user) return res.status(404).json({ success: false, message: "ไม่พบบัญชีผู้ใช้งาน" });
    if (String(user.firebase_provider || "") !== GOOGLE_PROVIDER) {
      return res.status(403).json({ success: false, message: "หน้านี้ใช้สำหรับบัญชีที่เข้าสู่ระบบด้วย Google ครั้งแรกเท่านั้น" });
    }

    const profile = formatProfile(user);
    return res.json({
      success: true,
      profile,
      needs_profile_onboarding: profile.needs_profile_onboarding,
      needs_interest_onboarding: profile.needs_interest_onboarding,
    });
  } catch (error) {
    console.error("Get Google profile onboarding error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลบัญชี Google ได้" });
  }
};

const checkGoogleProfileAvailability = async (req, res) => {
  try {
    const field = String(req.body?.field || "");
    const value = field === "name" ? normalizeFullName(req.body?.value).toLowerCase() : normalizeUsername(req.body?.value);
    const config = field === "name"
      ? { column: "name_normalized", duplicate: "มีผู้ใช้งานชื่อนี้แล้ว" }
      : field === "username"
        ? { column: "username", duplicate: "มีผู้ใช้งานชื่อผู้ใช้นี้แล้ว" }
        : null;

    if (!config) return res.status(400).json({ success: false, message: "ไม่รองรับข้อมูลที่ต้องการตรวจสอบ" });
    if (!value) return res.status(400).json({ success: false, message: "กรุณาระบุข้อมูลที่ต้องการตรวจสอบ" });

    const [rows] = await db.query(
      `SELECT user_id FROM users WHERE LOWER(${config.column}) = LOWER(?) AND user_id <> ? LIMIT 1`,
      [value, req.user.user_id]
    );
    const available = rows.length === 0;
    return res.json({ success: true, available, message: available ? "ข้อมูลนี้ยังใช้งานได้" : config.duplicate });
  } catch (error) {
    console.error("Check Google profile availability error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถตรวจสอบข้อมูลได้" });
  }
};

const completeGoogleProfileOnboarding = async (req, res) => {
  let connection;
  try {
    const validation = validateGoogleProfilePayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "ข้อมูลเพิ่มเติมไม่ถูกต้อง", errors: validation.errors });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    const user = await selectUserProfile(req.user.user_id, connection);
    if (!user) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "ไม่พบบัญชีผู้ใช้งาน" });
    }
    if (String(user.firebase_provider || "") !== GOOGLE_PROVIDER) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "บัญชีนี้ไม่ได้เข้าสู่ระบบด้วย Google" });
    }

    const data = validation.data;
    const [duplicates] = await connection.query(
      `
        SELECT user_id, name_normalized, username
        FROM users
        WHERE user_id <> ?
          AND (name_normalized = ? OR LOWER(username) = LOWER(?))
        FOR UPDATE
      `,
      [req.user.user_id, data.name.toLowerCase(), data.username]
    );
    const errors = {};
    if (duplicates.some((row) => row.name_normalized === data.name.toLowerCase())) errors.name = "มีผู้ใช้งานชื่อนี้แล้ว";
    if (duplicates.some((row) => String(row.username || "").toLowerCase() === data.username.toLowerCase())) errors.username = "มีผู้ใช้งานชื่อผู้ใช้นี้แล้ว";
    if (Object.keys(errors).length) {
      await connection.rollback();
      return res.status(409).json({ success: false, code: "DUPLICATE_USER_DATA", message: errors.name || errors.username, errors });
    }

    await connection.query(
      `
        UPDATE users
        SET name = ?, name_normalized = ?, username = ?, phone = ?, phone_country = ?,
            birth_date = ?, nickname = ?, gender = ?, contact_preference = 'email',
            country = ?, province = ?, district = ?, subdistrict = ?, address = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      [data.name, data.name.toLowerCase(), data.username, data.phone, data.phone_country,
        data.birth_date, data.nickname, data.gender, data.country, data.province,
        data.district, data.subdistrict, data.address, req.user.user_id]
    );

    const updated = await selectUserProfile(req.user.user_id, connection);
    await connection.commit();
    const profile = formatProfile(updated);
    return res.json({
      success: true,
      message: "บันทึกข้อมูลบัญชี Google เรียบร้อยแล้ว",
      profile,
      needs_profile_onboarding: false,
      needs_interest_onboarding: profile.needs_interest_onboarding,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) { console.error("Google onboarding rollback error:", rollbackError.message); }
    }
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "ชื่อหรือชื่อผู้ใช้งานนี้ถูกใช้แล้ว กรุณาเปลี่ยนข้อมูล", errors: { username: "ชื่อผู้ใช้งานนี้อาจถูกใช้แล้ว" } });
    }
    console.error("Complete Google profile onboarding error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถบันทึกข้อมูลเพิ่มเติมได้ กรุณาลองใหม่" });
  } finally {
    if (connection) connection.release();
  }
};

const getOnboardingStatus = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT onboarding_completed, user_interests FROM users WHERE user_id = ? LIMIT 1`,
      [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "ไม่พบบัญชีผู้ใช้งาน" });
    const user = rows[0];
    return res.json({
      success: true,
      onboarding_completed: Boolean(Number(user.onboarding_completed)),
      needs_interest_onboarding: Number(user.onboarding_completed) === 0,
      interests: parseStoredInterests(user.user_interests),
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถตรวจสอบการตั้งค่าเริ่มต้นได้" });
  }
};

const completeInterestOnboarding = async (req, res) => {
  try {
    const rawInterests = Array.isArray(req.body?.interests) ? req.body.interests : [];
    const skipped = req.body?.skipped === true;
    const interests = [...new Set(rawInterests.map(String))].filter((item) => ALLOWED_INTERESTS.has(item));
    if (!skipped && interests.length === 0) return res.status(400).json({ success: false, message: "กรุณาเลือกอย่างน้อย 1 รายการ" });

    await db.query(
      `UPDATE users SET user_interests = ?, onboarding_completed = 1, onboarding_completed_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [JSON.stringify(interests), req.user.user_id]
    );
    return res.json({
      success: true,
      message: skipped ? "ข้ามการตั้งค่าเรียบร้อยแล้ว" : "บันทึกความสนใจเรียบร้อยแล้ว",
      onboarding_completed: true,
      interests,
    });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถบันทึกความสนใจได้" });
  }
};

module.exports = {
  getGoogleProfileOnboarding,
  checkGoogleProfileAvailability,
  completeGoogleProfileOnboarding,
  getOnboardingStatus,
  completeInterestOnboarding,
};
