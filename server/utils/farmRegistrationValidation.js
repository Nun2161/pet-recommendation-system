"use strict";

const { validatePassword } = require("./passwordPolicy");

const MAX_CERTIFICATE_BYTES = 3 * 1024 * 1024;
const ALLOWED_CERTIFICATE_TYPES = Object.freeze({
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
});

function cleanText(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizeEmail(value) {
  return cleanText(value, 191).toLowerCase();
}

function normalizeOptionalUrl(value) {
  const text = cleanText(value, 255);
  if (!text) return "";

  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch (_error) {
    return null;
  }
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function hasPdfMagic(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function hasPngMagic(buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte);
}

function hasJpegMagic(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function parseCertificateData(value) {
  const raw = String(value || "");
  const match = raw.match(/^data:(application\/pdf|image\/png|image\/jpeg);base64,([A-Za-z0-9+/=\r\n]+)$/);

  if (!match) {
    return {
      valid: false,
      message: "ไฟล์หลักฐานต้องเป็น PDF, JPG หรือ PNG",
    };
  }

  const mimeType = match[1];
  const extension = ALLOWED_CERTIFICATE_TYPES[mimeType];
  let buffer;

  try {
    buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
  } catch (_error) {
    return {
      valid: false,
      message: "ไม่สามารถอ่านไฟล์หลักฐานได้",
    };
  }

  if (!buffer.length) {
    return {
      valid: false,
      message: "ไฟล์หลักฐานว่างเปล่า",
    };
  }

  if (buffer.length > MAX_CERTIFICATE_BYTES) {
    return {
      valid: false,
      message: "ไฟล์หลักฐานต้องมีขนาดไม่เกิน 3 MB",
    };
  }

  const magicValid =
    (mimeType === "application/pdf" && hasPdfMagic(buffer)) ||
    (mimeType === "image/png" && hasPngMagic(buffer)) ||
    (mimeType === "image/jpeg" && hasJpegMagic(buffer));

  if (!magicValid) {
    return {
      valid: false,
      message: "ชนิดไฟล์หลักฐานไม่ตรงกับเนื้อหาไฟล์",
    };
  }

  return {
    valid: true,
    file: {
      buffer,
      mimeType,
      extension,
      size: buffer.length,
    },
  };
}

function validateFarmRegistrationPayload(body = {}) {
  const data = {
    owner_name: cleanText(body.owner_name, 100),
    email: normalizeEmail(body.email),
    password: String(body.password || ""),
    phone: cleanText(body.phone, 20),
    phone_country: cleanText(body.phone_country || "TH", 10).toUpperCase(),
    farm_name: cleanText(body.farm_name, 150),
    description: cleanText(body.description, 2000),
    website: normalizeOptionalUrl(body.website),
    facebook: normalizeOptionalUrl(body.facebook),
    line_contact: cleanText(body.line_contact, 100),
    certificate_no: cleanText(body.certificate_no, 100),
    country: cleanText(body.country || "Thailand", 100),
    province: cleanText(body.province, 150),
    district: cleanText(body.district, 150),
    subdistrict: cleanText(body.subdistrict, 150) || null,
    address: cleanText(body.address, 500),
    latitude: numberOrNull(body.latitude),
    longitude: numberOrNull(body.longitude),
  };

  const errors = {};

  if (data.owner_name.length < 2 || data.owner_name.length > 100) {
    errors.owner_name = "กรุณากรอกชื่อเจ้าของฟาร์ม 2–100 ตัวอักษร";
  } else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(data.owner_name)) {
    errors.owner_name = "กรุณากรอกชื่อ–นามสกุลเจ้าของฟาร์มด้วยตัวอักษรภาษาอังกฤษเท่านั้น";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 191) {
    errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  }

  const passwordValidation = validatePassword(data.password, {
    name: data.owner_name,
    full_name: data.owner_name,
    email: data.email,
  });

  if (!passwordValidation.valid) {
    errors.password = passwordValidation.errors[0] || "รหัสผ่านไม่ผ่านเงื่อนไข";
  }

  if (!/^\+[1-9]\d{7,14}$/.test(data.phone)) {
    errors.phone = "เบอร์โทรศัพท์ต้องอยู่ในรูปแบบสากล เช่น +66912345678";
  }

  if (!/^[A-Z]{2,3}$/.test(data.phone_country)) {
    errors.phone_country = "รหัสประเทศของหมายเลขโทรศัพท์ไม่ถูกต้อง";
  }

  if (data.farm_name.length < 2 || data.farm_name.length > 150) {
    errors.farm_name = "กรุณากรอกชื่อฟาร์ม 2–150 ตัวอักษร";
  }

  if (data.description.length < 10 || data.description.length > 2000) {
    errors.description = "กรุณาแนะนำฟาร์มอย่างน้อย 10 ตัวอักษร และไม่เกิน 2,000 ตัวอักษร";
  }

  if (!data.website) {
    errors.website = data.website === null ? "เว็บไซต์ต้องขึ้นต้นด้วย http:// หรือ https://" : "กรุณากรอกเว็บไซต์ของฟาร์ม";
  }

  if (!data.facebook) {
    errors.facebook = data.facebook === null ? "ลิงก์ Facebook ต้องขึ้นต้นด้วย http:// หรือ https://" : "กรุณากรอกลิงก์ Facebook ของฟาร์ม";
  }

  if (!/^0\d{9}$/.test(data.line_contact)) {
    errors.line_contact = "กรุณากรอกเบอร์โทรศัพท์ LINE 10 หลัก เช่น 0812345678";
  }

  if (data.certificate_no.length < 3 || data.certificate_no.length > 100) {
    errors.certificate_no = "กรุณากรอกเลขทะเบียนฟาร์ม 3–100 ตัวอักษร";
  }

  if (!data.country) errors.country = "กรุณาระบุประเทศ";
  if (!data.province) errors.province = "กรุณาเลือกจังหวัด";
  if (!data.district) errors.district = "กรุณาเลือกอำเภอหรือเขต";

  if (data.address.length < 5 || data.address.length > 500) {
    errors.address = "กรุณากรอกรายละเอียดที่อยู่ 5–500 ตัวอักษร";
  }

  if (Number.isNaN(data.latitude) || (data.latitude !== null && (data.latitude < -90 || data.latitude > 90))) {
    errors.latitude = "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90";
  }

  if (Number.isNaN(data.longitude) || (data.longitude !== null && (data.longitude < -180 || data.longitude > 180))) {
    errors.longitude = "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180";
  }

  const certificate = parseCertificateData(body.certificate_data);
  if (!certificate.valid) {
    errors.certificate_file = certificate.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    data,
    errors,
    certificate: certificate.valid ? certificate.file : null,
  };
}

module.exports = {
  MAX_CERTIFICATE_BYTES,
  normalizeEmail,
  validateFarmRegistrationPayload,
};
