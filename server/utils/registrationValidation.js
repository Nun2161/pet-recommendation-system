const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "password123!",
  "qwerty",
  "qwerty123",
  "qwerty123!",
  "admin123",
  "admin123!",
  "welcome123",
  "welcome123!",
  "letmein123",
  "catmatch123",
  "catmatch123!",
  "1234567890",
  "abcd1234",
]);

const normalizeFullName = (value) => {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeEmail = (value) => {
  return String(value || "").trim().toLowerCase();
};

const normalizeUsername = (value) => {
  return String(value || "").trim();
};

const collapseRepeatedCharacters = (value) => {
  return String(value || "").replace(/(.)\1+/g, "$1");
};

const buildPersonalPasswordTokens = ({ name, username, email }) => {
  const tokens = new Set();
  const addToken = (token, includePrefixes = false) => {
    const cleaned = String(token || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleaned.length < 3) return;
    tokens.add(cleaned);
    if (includePrefixes && cleaned.length >= 4) {
      for (let length = 4; length <= cleaned.length; length += 1) tokens.add(cleaned.slice(0, length));
    }
  };

  normalizeFullName(name).toLowerCase().split(/[\s'-]+/).forEach((token) => addToken(token));
  const normalizedUsername = normalizeUsername(username).toLowerCase();
  normalizedUsername.split(/[^a-z0-9]+/).forEach((token) => addToken(token, true));
  (normalizedUsername.match(/[a-z]{3,}/g) || []).forEach((token) => addToken(token, true));
  const emailLocal = normalizeEmail(email).split("@")[0] || "";
  emailLocal.split(/[^a-z0-9]+/).forEach((token) => addToken(token));
  (emailLocal.match(/[a-z]{3,}/g) || []).forEach((token) => addToken(token));
  return [...tokens];
};

const validatePassword = ({ password, name, username, email }) => {
  const value = String(password || "");
  const errors = [];

  if (value.length !== 10) {
    errors.push("รหัสผ่านต้องมี 10 ตัวพอดี");
  }

  if (!/[a-z]/.test(value)) {
    errors.push("รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว");
  }

  if (!/[A-Z]/.test(value)) {
    errors.push("รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว");
  }

  if (!/\d/.test(value)) {
    errors.push("รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    errors.push("รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว");
  }

  if (!/^[\x21-\x7E]+$/.test(value)) {
    errors.push("รหัสผ่านต้องใช้ตัวอักษรภาษาอังกฤษเท่านั้นและห้ามมีช่องว่าง");
  }

  const lowerPassword = value.toLowerCase();
  const comparablePassword = lowerPassword.replace(/[^a-z0-9]/g, "");
  const collapsedPassword = collapseRepeatedCharacters(comparablePassword);
  const personalTokens = buildPersonalPasswordTokens({ name, username, email });
  const containsPersonalData = personalTokens.some((token) => {
    const collapsedToken = collapseRepeatedCharacters(token);
    return comparablePassword.includes(token) || collapsedPassword.includes(collapsedToken);
  });

  if (containsPersonalData) {
    errors.push("ห้ามใช้ชื่อหรือส่วนหนึ่งของชื่อผู้ใช้งานในรหัสผ่าน แม้เปลี่ยนตัวพิมพ์เล็ก–ใหญ่");
  }

  const blocklistValue = lowerPassword.replace(/[^a-z0-9]/g, "");
  if (
    COMMON_PASSWORDS.has(lowerPassword) ||
    COMMON_PASSWORDS.has(blocklistValue) ||
    /(.)\1{3,}/.test(value) ||
    /(123456|abcdef|qwerty|asdfgh|zxcvbn)/i.test(value)
  ) {
    errors.push("รหัสผ่านนี้เดาง่ายเกินไป กรุณาเปลี่ยนเป็นรหัสผ่านอื่น");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const validateRegistrationPayload = (body = {}) => {
  const data = {
    name: normalizeFullName(body.name),
    username: normalizeUsername(body.username),
    email: normalizeEmail(body.email),
    password: String(body.password || ""),
    phone: String(body.phone || "").trim(),
    phone_country: String(body.phone_country || "TH").trim().toUpperCase(),
    birth_date: body.birth_date || null,
    nickname: String(body.nickname || "").trim(),
    gender: String(body.gender || "").trim(),
    contact_preference: String(body.contact_preference || "email").trim(),
    country: String(body.country || "").trim(),
    province: String(body.province || "").trim(),
    district: String(body.district || "").trim(),
    subdistrict: body.subdistrict ? String(body.subdistrict).trim() : null,
    address: String(body.address || "").trim(),
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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 191) {
    errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  }

  const passwordResult = validatePassword(data);
  if (!passwordResult.valid) {
    errors.password = passwordResult.errors[0];
  }

  const allowedPhoneCountries = new Set(["TH", "LA", "KH", "MM", "VN", "MY", "SG", "ID", "PH", "CN", "JP", "KR", "IN", "AU", "GB", "US", "CA"]);
  if (!allowedPhoneCountries.has(data.phone_country)) {
    errors.phone_country = "รหัสประเทศของหมายเลขโทรศัพท์ไม่ถูกต้อง";
  }

  if (!/^\+[1-9]\d{7,14}$/.test(data.phone)) {
    errors.phone = "เบอร์โทรศัพท์ต้องอยู่ในรูปแบบสากลและมี 8–15 หลัก";
  }

  if (data.birth_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.birth_date)) {
      errors.birthDate = "รูปแบบวันเกิดไม่ถูกต้อง";
    } else {
      const [year, month, day] = data.birth_date.split("-").map(Number);
      const currentYear = new Date().getFullYear();
      const parsed = new Date(Date.UTC(year, month - 1, day));
      const isRealDate = parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;

      if (year >= 2400) {
        errors.birthDate = "กรุณากรอกปี ค.ศ. เท่านั้น ไม่ใช้ปี พ.ศ.";
      } else if (year < 1900 || year > currentYear || !isRealDate) {
        errors.birthDate = "วันเกิดไม่ถูกต้อง";
      }
    }
  }

  if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(data.nickname)) {
    errors.nickname = "กรุณากรอกชื่อเล่นเป็นภาษาอังกฤษ เช่น Olive";
  } else if (data.nickname.length < 2 || data.nickname.length > 30) {
    errors.nickname = "ชื่อเล่นต้องมีความยาว 2–30 ตัวอักษร";
  }

  if (!["female", "male", "nonbinary", "prefer_not_to_say"].includes(data.gender)) {
    errors.gender = "กรุณาเลือกเพศ";
  }

  if (!["email", "phone"].includes(data.contact_preference)) {
    errors.contact_preference = "ช่องทางติดต่อที่เลือกไม่ถูกต้อง";
  }

  if (!data.country || data.country.length > 100) {
    errors.country = "กรุณาระบุประเทศ";
  }

  if (!data.province || data.province.length > 100) {
    errors.province = "กรุณาระบุจังหวัด";
  }

  if (!data.district || data.district.length > 100) {
    errors.district = "กรุณาระบุอำเภอหรือเขต";
  }

  if (data.subdistrict && data.subdistrict.length > 100) {
    errors.subdistrict = "ข้อมูลตำบลหรือแขวงยาวเกินกำหนด";
  }

  if (data.address.length < 5 || data.address.length > 500) {
    errors.address = "กรุณากรอกรายละเอียดที่อยู่ 5–500 ตัวอักษร";
  }

  return {
    valid: Object.keys(errors).length === 0,
    data,
    errors,
  };
};

module.exports = {
  normalizeFullName,
  normalizeEmail,
  normalizeUsername,
  validatePassword,
  validateRegistrationPayload,
};
