const bcrypt = require("bcryptjs");

const PASSWORD_LENGTH = 10;
const PASSWORD_HISTORY_LIMIT = 5;

/**
 * แปลงข้อความให้อยู่ในรูปแบบเดียวกันสำหรับตรวจข้อมูลส่วนตัว
 */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * ดึงข้อความก่อน @ จากอีเมล
 * เช่น monkhon@gmail.com จะได้ monkhon
 */
function getEmailPrefix(email) {
  return normalizeText(email).split("@")[0] || "";
}

/**
 * ตรวจนโยบายรหัสผ่านของ CatMatch
 *
 * เงื่อนไข:
 * - ต้องมี 10 ตัวพอดี
 * - มีตัวพิมพ์ใหญ่
 * - มีตัวพิมพ์เล็ก
 * - มีตัวเลข
 * - มีอักขระพิเศษ
 * - ห้ามมีช่องว่าง
 * - ห้ามมีชื่อ ชื่อผู้ใช้ นามสกุล หรือต้นอีเมล
 * - ห้ามมีคำที่คาดเดาง่าย
 * - ห้ามมีตัวอักษรเดิมติดกัน 3 ตัว
 */
function validatePassword(password, user = {}) {
  const value = String(password || "");
  const errors = [];

  if (!value) {
    errors.push("กรุณากรอกรหัสผ่าน");
  }

  if (value.length !== PASSWORD_LENGTH) {
    errors.push(`รหัสผ่านต้องมี ${PASSWORD_LENGTH} ตัวพอดี`);
  }

  if (!/^[\x21-\x7E]+$/.test(value)) {
    errors.push(
      "รหัสผ่านใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และอักขระพิเศษ"
    );
  }

  if (!/[a-z]/.test(value)) {
    errors.push("รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษพิมพ์เล็ก");
  }

  if (!/[A-Z]/.test(value)) {
    errors.push("รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษพิมพ์ใหญ่");
  }

  if (!/[0-9]/.test(value)) {
    errors.push("รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    errors.push("รหัสผ่านต้องมีอักขระพิเศษ เช่น @ # ! $");
  }

  if (/\s/.test(value)) {
    errors.push("รหัสผ่านห้ามมีช่องว่าง");
  }

  if (/(.)\1\1/.test(value)) {
    errors.push("รหัสผ่านห้ามมีตัวอักษรเดิมติดกันตั้งแต่ 3 ตัวขึ้นไป");
  }

  const normalizedPassword = normalizeText(value);

  const forbiddenPersonalValues = [
    user.username,
    user.first_name,
    user.firstname,
    user.firstName,
    user.last_name,
    user.lastname,
    user.lastName,
    user.name,
    user.full_name,
    user.fullName,
    getEmailPrefix(user.email),
  ]
    .map(normalizeText)
    .filter((item) => item.length >= 3);

  const containsPersonalData = forbiddenPersonalValues.some((item) =>
    normalizedPassword.includes(item)
  );

  if (containsPersonalData) {
    errors.push(
      "รหัสผ่านห้ามมีชื่อ ชื่อผู้ใช้ นามสกุล หรือส่วนหน้าของอีเมล"
    );
  }

  const weakPatterns = [
    "password",
    "pass123",
    "qwerty",
    "asdf",
    "admin",
    "user",
    "catmatch",
    "1234",
    "4321",
    "abcd",
  ];

  const containsWeakPattern = weakPatterns.some((pattern) =>
    normalizedPassword.includes(pattern)
  );

  if (containsWeakPattern) {
    errors.push("รหัสผ่านมีคำหรือลำดับที่คาดเดาง่ายเกินไป");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ตรวจว่ารหัสใหม่ตรงกับรหัสปัจจุบัน
 * หรือประวัติรหัสผ่านเดิมหรือไม่
 */
async function isPasswordReused(password, passwordHashes = []) {
  for (const passwordHash of passwordHashes) {
    if (!passwordHash) {
      continue;
    }

    try {
      const matched = await bcrypt.compare(password, passwordHash);

      if (matched) {
        return true;
      }
    } catch (error) {
      console.error("ตรวจสอบประวัติรหัสผ่านไม่สำเร็จ:", error);
    }
  }

  return false;
}

module.exports = {
  PASSWORD_LENGTH,
  PASSWORD_HISTORY_LIMIT,
  validatePassword,
  isPasswordReused,
};
