"use strict";

const db = require("../config/db");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { ensureShelterSetup } = require("../services/shelterSetupService");
const { normalizeSpecies } = require("../utils/species");

function parseTraits(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function genderLabel(value) {
  return value === "male" ? "เพศผู้" : value === "female" ? "เพศเมีย" : "ไม่ระบุเพศ";
}
function sizeLabel(value) {
  return value === "small" ? "ขนาดเล็ก" : value === "large" ? "ขนาดใหญ่" : "ขนาดกลาง";
}

function publicShelterAnimal(row) {
  return {
    id: `s-${Number(row.shelter_animal_id)}`,
    numeric_id: Number(row.shelter_animal_id),
    source_type: "shelter",
    source_label: "สัตว์จากศูนย์พักพิง",
    source_note: "ข้อมูลจากศูนย์พักพิงที่ผ่านการตรวจสอบ",
    shelter_id: Number(row.shelter_id),
    species: row.species,
    name: row.name,
    gender: genderLabel(row.gender),
    gender_code: row.gender,
    age: row.estimated_age || "ไม่ระบุอายุ",
    size: sizeLabel(row.size),
    size_code: row.size,
    weight: row.weight || "",
    province: row.province || row.center_province || "ไม่ระบุจังหวัด",
    shelter: row.shelter_name,
    contact_name: row.shelter_name,
    verified: row.verification_status === "verified",
    admin_approved: true,
    urgent: Boolean(Number(row.is_urgent)),
    status: row.adoption_status,
    image: row.cover_image_url || "",
    traits: parseTraits(row.traits_json),
    health: row.health_detail || "รอยืนยันข้อมูลสุขภาพ",
    vaccination: row.vaccination_status || "รอยืนยันข้อมูลวัคซีน",
    sterilization: row.sterilization_status || "รอยืนยันข้อมูลการทำหมัน",
    personality: row.personality || "",
    story: row.background_story || "ยังไม่มีเรื่องราวเพิ่มเติม",
    suitable_home: row.suitable_home || "รอยืนยันข้อมูลบ้านที่เหมาะสม",
    phone: row.phone || "",
    email: row.email || "",
    social_url: row.facebook_url || "",
    line_contact: row.line_contact || "",
    address: row.address || "",
    location_text: row.address || "",
    latitude: row.center_latitude === null ? null : Number(row.center_latitude),
    longitude: row.center_longitude === null ? null : Number(row.center_longitude),
    allow_web_contact: true,
    contact_hours: row.contact_hours || "รอยืนยันเวลาติดต่อจากศูนย์พักพิง",
    created_at: row.created_at,
  };
}

function publicUserListing(row) {
  return {
    id: `u-${Number(row.listing_id)}`,
    numeric_id: Number(row.listing_id),
    owner_user_id: Number(row.user_id),
    source_type: "user",
    source_label: "ประกาศโดยผู้ใช้",
    source_note: "ประกาศช่วยหาบ้านโดยผู้ใช้ · ผ่านการตรวจสอบโดยแอดมินแล้ว",
    shelter_id: null,
    species: row.species,
    name: row.name,
    gender: genderLabel(row.gender),
    gender_code: row.gender,
    age: row.estimated_age || "ไม่ระบุอายุ",
    size: sizeLabel(row.size),
    size_code: row.size,
    weight: row.weight || "",
    province: row.province || "ไม่ระบุจังหวัด",
    shelter: "ผู้ใช้ช่วยหาบ้าน",
    contact_name: row.contact_name || row.account_name || "ผู้ลงประกาศ",
    verified: false,
    admin_approved: row.approval_status === "approved",
    urgent: Boolean(Number(row.is_urgent)),
    status: row.adoption_status,
    image: row.cover_image_url || "",
    traits: parseTraits(row.traits_json),
    health: row.health_detail || "ผู้ลงประกาศยังไม่ได้ระบุข้อมูลสุขภาพ",
    vaccination: row.vaccination_status || "ไม่ทราบข้อมูลวัคซีน",
    sterilization: row.sterilization_status || "ไม่ทราบข้อมูลการทำหมัน",
    personality: row.personality || "",
    story: row.background_story || "ยังไม่มีเรื่องราวเพิ่มเติม",
    suitable_home: row.suitable_home || "ผู้ลงประกาศยังไม่ได้ระบุบ้านที่เหมาะสม",
    phone: row.contact_phone || "",
    email: row.account_email || "",
    social_url: row.contact_social_url || "",
    line_contact: row.contact_line || "",
    address: row.location_text || "",
    location_text: row.location_text || "",
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    allow_web_contact: Boolean(Number(row.allow_web_contact)),
    contact_hours: "ติดต่อผู้ลงประกาศตามช่องทางที่ระบุ",
    created_at: row.created_at,
  };
}

async function getPublicShelterRows(species) {
  const [rows] = await db.query(
    `SELECT a.*, c.shelter_name, c.phone, c.email, c.facebook_url, c.line_contact,
            c.address, c.province AS center_province, c.latitude AS center_latitude,
            c.longitude AS center_longitude, c.contact_hours, c.verification_status
     FROM shelter_animal a
     INNER JOIN shelter_center c ON c.shelter_id = a.shelter_id
     WHERE a.species = ?
       AND a.adoption_status = 'available'
       AND c.status = 'active'
       AND c.verification_status = 'verified'`,
    [species]
  );
  return rows.map(publicShelterAnimal);
}

async function getPublicUserRows(species) {
  const [rows] = await db.query(
    `SELECT l.*, u.name AS account_name, u.email AS account_email
     FROM user_stray_listing l
     INNER JOIN users u ON u.user_id = l.user_id
     WHERE l.species = ?
       AND l.approval_status = 'approved'
       AND l.adoption_status = 'available'
       AND u.status = 'active'`,
    [species]
  );
  return rows.map(publicUserListing);
}

const USER_IMAGE_DIRECTORY = path.join(__dirname, "..", "uploads", "stray-listings");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const GENDERS = new Set(["male", "female", "unknown"]);
const SIZES = new Set(["small", "medium", "large"]);
const USER_ADOPTION_STATUSES = new Set(["available", "adopted"]);

function httpError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function cleanText(value, maxLength = 255) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function positiveId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw httpError("รหัสประกาศไม่ถูกต้อง");
  return id;
}

function requiredNumber(value, min, max, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw httpError(`${fieldName}ไม่ถูกต้อง`);
  }
  return parsed;
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback ? 1 : 0;
  return value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1" ? 1 : 0;
}

function parseInputTraits(value) {
  let source = value;
  if (typeof source === "string" && source.trim().startsWith("[")) {
    try { source = JSON.parse(source); } catch (_) { source = value; }
  }
  const rows = Array.isArray(source)
    ? source
    : String(source || "").split(/[,\n|]/);
  return [...new Set(rows.map((item) => cleanText(item, 60)).filter(Boolean))].slice(0, 8);
}

function parseImageData(value) {
  const imageData = String(value || "").trim();
  const match = imageData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw httpError("รูปต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
  const mimeType = match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length) throw httpError("ไฟล์รูปไม่ถูกต้อง");
  if (buffer.length > MAX_IMAGE_SIZE) throw httpError("รูปมีขนาดใหญ่เกิน 5 MB", 413);

  const isValid =
    (mimeType === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) ||
    (mimeType === "image/webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP");
  if (!isValid) throw httpError("เนื้อหาไฟล์รูปไม่ถูกต้อง");
  return { buffer, extension: IMAGE_EXTENSIONS.get(mimeType) };
}

async function saveUserImage(imageData) {
  const image = parseImageData(imageData);
  await fs.mkdir(USER_IMAGE_DIRECTORY, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}.${image.extension}`;
  const absolutePath = path.join(USER_IMAGE_DIRECTORY, filename);
  await fs.writeFile(absolutePath, image.buffer, { flag: "wx" });
  return { absolutePath, publicPath: `/uploads/stray-listings/${filename}` };
}

function localUserImagePath(publicPath) {
  const value = String(publicPath || "");
  return value.startsWith("/uploads/stray-listings/")
    ? path.join(USER_IMAGE_DIRECTORY, path.basename(value))
    : "";
}

async function removeImageQuietly(filePath) {
  if (!filePath) return;
  try { await fs.unlink(filePath); }
  catch (error) { if (error.code !== "ENOENT") console.error("Stray image cleanup error:", error.message); }
}

function normalizeMineRow(row) {
  return {
    ...row,
    listing_id: Number(row.listing_id),
    user_id: Number(row.user_id),
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    is_urgent: Boolean(Number(row.is_urgent)),
    allow_web_contact: Boolean(Number(row.allow_web_contact)),
    traits: parseTraits(row.traits_json),
  };
}

async function ensureReady() {
  if (!(await ensureShelterSetup())) throw httpError("ระบบประกาศสัตว์ยังไม่พร้อมใช้งาน", 503);
}

function buildUserListingPayload(body, existing = {}) {
  const species = normalizeSpecies(body.species ?? existing.species);
  if (!species) throw httpError("species ต้องเป็น cat หรือ dog");

  const name = cleanText(body.name ?? existing.name, 150);
  const province = cleanText(body.province ?? existing.province, 120);
  const locationText = cleanText(body.location_text ?? existing.location_text, 1000);
  const contactName = cleanText(body.contact_name ?? existing.contact_name, 150);
  const gender = cleanText(body.gender ?? existing.gender ?? "unknown", 20).toLowerCase();
  const size = cleanText(body.size ?? existing.size ?? "medium", 20).toLowerCase();

  if (!name) throw httpError("กรุณากรอกชื่อสัตว์");
  if (!province) throw httpError("กรุณากรอกจังหวัด");
  if (!locationText) throw httpError("กรุณาระบุสถานที่");
  if (!contactName) throw httpError("กรุณากรอกชื่อผู้ติดต่อ");
  if (!GENDERS.has(gender)) throw httpError("เพศไม่ถูกต้อง");
  if (!SIZES.has(size)) throw httpError("ขนาดไม่ถูกต้อง");
  if (body.contact_consent !== undefined && !booleanValue(body.contact_consent)) {
    throw httpError("กรุณายินยอมให้เผยแพร่ข้อมูลติดต่อสำหรับประกาศนี้");
  }

  return {
    species,
    name,
    gender,
    estimated_age: cleanText(body.estimated_age ?? existing.estimated_age, 120),
    size,
    weight: cleanText(body.weight ?? existing.weight, 80),
    province,
    location_text: locationText,
    latitude: requiredNumber(body.latitude ?? existing.latitude, -90, 90, "ละติจูด"),
    longitude: requiredNumber(body.longitude ?? existing.longitude, -180, 180, "ลองจิจูด"),
    contact_name: contactName,
    contact_phone: cleanText(body.contact_phone ?? existing.contact_phone, 40),
    contact_social_url: cleanText(body.contact_social_url ?? existing.contact_social_url, 1000),
    contact_line: cleanText(body.contact_line ?? existing.contact_line, 255),
    allow_web_contact: booleanValue(body.allow_web_contact, Boolean(Number(existing.allow_web_contact ?? 1))),
    cover_image_url: cleanText(body.cover_image_url ?? existing.cover_image_url, 2000),
    traits_json: JSON.stringify(parseInputTraits(body.traits ?? existing.traits_json)),
    health_detail: cleanText(body.health_detail ?? existing.health_detail, 4000),
    vaccination_status: cleanText(body.vaccination_status ?? existing.vaccination_status, 255),
    sterilization_status: cleanText(body.sterilization_status ?? existing.sterilization_status, 255),
    personality: cleanText(body.personality ?? existing.personality, 4000),
    background_story: cleanText(body.background_story ?? existing.background_story, 6000),
    suitable_home: cleanText(body.suitable_home ?? existing.suitable_home, 4000),
    is_urgent: booleanValue(body.is_urgent, Boolean(Number(existing.is_urgent))),
  };
}

async function listMine(req, res) {
  try {
    await ensureReady();
    const userId = Number(req.user.user_id);
    const [rows] = await db.query(
      `SELECT * FROM user_stray_listing WHERE user_id = ? ORDER BY listing_id DESC`,
      [userId]
    );
    return res.json({ success: true, total: rows.length, data: rows.map(normalizeMineRow) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถโหลดประกาศของคุณได้" });
  }
}

async function createListing(req, res) {
  let newImagePath = "";
  try {
    await ensureReady();
    const body = { ...(req.body || {}) };
    if (body.cover_image_data) {
      const saved = await saveUserImage(body.cover_image_data);
      newImagePath = saved.absolutePath;
      body.cover_image_url = saved.publicPath;
    }
    const payload = buildUserListingPayload(body);
    if (!payload.cover_image_url) throw httpError("กรุณาอัปโหลดรูปสัตว์");

    const columns = Object.keys(payload);
    const [result] = await db.query(
      `INSERT INTO user_stray_listing (user_id, ${columns.join(", ")}, approval_status, adoption_status)
       VALUES (?, ${columns.map(() => "?").join(", ")}, 'pending', 'available')`,
      [Number(req.user.user_id), ...columns.map((key) => payload[key])]
    );
    const [rows] = await db.query("SELECT * FROM user_stray_listing WHERE listing_id = ?", [result.insertId]);
    return res.status(201).json({ success: true, message: "ส่งประกาศให้แอดมินตรวจสอบแล้ว", data: normalizeMineRow(rows[0]) });
  } catch (error) {
    await removeImageQuietly(newImagePath);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถสร้างประกาศได้" });
  }
}

async function updateListing(req, res) {
  let newImagePath = "";
  let oldImagePath = "";
  try {
    await ensureReady();
    const listingId = positiveId(req.params.id);
    const userId = Number(req.user.user_id);
    const [rows] = await db.query(
      "SELECT * FROM user_stray_listing WHERE listing_id = ? AND user_id = ? LIMIT 1",
      [listingId, userId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "ไม่พบประกาศของคุณ" });
    const existing = rows[0];
    if (existing.approval_status === "approved") throw httpError("ประกาศที่อนุมัติแล้วแก้ไขไม่ได้ กรุณาปิดประกาศก่อน", 409);
    if (existing.adoption_status === "adopted") throw httpError("ประกาศที่ได้บ้านแล้วแก้ไขไม่ได้", 409);

    const body = { ...(req.body || {}), species: existing.species };
    if (body.cover_image_data) {
      const saved = await saveUserImage(body.cover_image_data);
      newImagePath = saved.absolutePath;
      body.cover_image_url = saved.publicPath;
      oldImagePath = localUserImagePath(existing.cover_image_url);
    }
    const payload = buildUserListingPayload(body, existing);
    if (!payload.cover_image_url) throw httpError("กรุณาอัปโหลดรูปสัตว์");
    const columns = Object.keys(payload);
    await db.query(
      `UPDATE user_stray_listing
       SET ${columns.map((key) => `${key} = ?`).join(", ")},
           approval_status = 'pending', rejection_reason = NULL,
           reviewed_by = NULL, reviewed_at = NULL
       WHERE listing_id = ? AND user_id = ?`,
      [...columns.map((key) => payload[key]), listingId, userId]
    );
    await removeImageQuietly(oldImagePath);
    const [updatedRows] = await db.query("SELECT * FROM user_stray_listing WHERE listing_id = ?", [listingId]);
    return res.json({ success: true, message: "บันทึกและส่งประกาศให้แอดมินตรวจสอบใหม่แล้ว", data: normalizeMineRow(updatedRows[0]) });
  } catch (error) {
    await removeImageQuietly(newImagePath);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถแก้ไขประกาศได้" });
  }
}

async function updateMyStatus(req, res) {
  try {
    await ensureReady();
    const listingId = positiveId(req.params.id);
    const status = cleanText(req.body?.adoption_status, 30).toLowerCase();
    if (!USER_ADOPTION_STATUSES.has(status)) throw httpError("สถานะประกาศไม่ถูกต้อง");
    const [result] = await db.query(
      `UPDATE user_stray_listing
       SET adoption_status = ?
       WHERE listing_id = ? AND user_id = ? AND approval_status = 'approved'`,
      [status, listingId, Number(req.user.user_id)]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "ไม่พบประกาศที่อนุมัติแล้วของคุณ" });
    return res.json({ success: true, message: status === "adopted" ? "บันทึกว่าสัตว์ได้บ้านแล้ว" : "เปิดประกาศอีกครั้งแล้ว" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถอัปเดตสถานะประกาศได้" });
  }
}

async function listAnimals(req, res) {
  try {
    const ready = await ensureShelterSetup();
    if (!ready) return res.status(503).json({ success: false, message: "ระบบช่วยหาบ้านยังไม่พร้อมใช้งาน" });
    const species = normalizeSpecies(req.query.species);
    if (!species) return res.status(400).json({ success: false, message: "species ต้องเป็น cat หรือ dog" });

    const [shelterRows, userRows] = await Promise.all([
      getPublicShelterRows(species),
      getPublicUserRows(species),
    ]);
    const rows = [...shelterRows, ...userRows].sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return res.json({ success: true, total: rows.length, data: rows });
  } catch (error) {
    console.error("Shelter public list error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลสัตว์ที่กำลังรอบ้านได้" });
  }
}

async function getAnimal(req, res) {
  try {
    const ready = await ensureShelterSetup();
    if (!ready) return res.status(503).json({ success: false, message: "ระบบช่วยหาบ้านยังไม่พร้อมใช้งาน" });
    const rawId = String(req.params.id || "").trim().toLowerCase();
    const userMatch = rawId.match(/^u-(\d+)$/);
    const shelterMatch = rawId.match(/^s-(\d+)$/);
    const legacyMatch = rawId.match(/^(\d+)$/);

    if (userMatch) {
      const [rows] = await db.query(
        `SELECT l.*, u.name AS account_name, u.email AS account_email
         FROM user_stray_listing l
         INNER JOIN users u ON u.user_id = l.user_id
         WHERE l.listing_id = ?
           AND l.approval_status = 'approved'
           AND l.adoption_status = 'available'
           AND u.status = 'active'
         LIMIT 1`,
        [Number(userMatch[1])]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลสัตว์" });
      return res.json({ success: true, data: publicUserListing(rows[0]) });
    }

    const shelterId = shelterMatch ? Number(shelterMatch[1]) : legacyMatch ? Number(legacyMatch[1]) : 0;
    if (!shelterId) return res.status(400).json({ success: false, message: "รหัสสัตว์ไม่ถูกต้อง" });
    const [rows] = await db.query(
      `SELECT a.*, c.shelter_name, c.phone, c.email, c.facebook_url, c.line_contact,
              c.address, c.province AS center_province, c.latitude AS center_latitude,
              c.longitude AS center_longitude, c.contact_hours, c.verification_status
       FROM shelter_animal a
       INNER JOIN shelter_center c ON c.shelter_id = a.shelter_id
       WHERE a.shelter_animal_id = ?
         AND a.adoption_status = 'available'
         AND c.status = 'active'
         AND c.verification_status = 'verified'
       LIMIT 1`,
      [shelterId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลสัตว์" });
    return res.json({ success: true, data: publicShelterAnimal(rows[0]) });
  } catch (error) {
    console.error("Shelter public detail error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถโหลดรายละเอียดสัตว์ได้" });
  }
}

module.exports = { listAnimals, getAnimal, listMine, createListing, updateListing, updateMyStatus };
