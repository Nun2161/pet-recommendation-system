"use strict";

const db = require("../config/db");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { ensureShelterSetup } = require("../services/shelterSetupService");
const { normalizeSpecies } = require("../utils/species");

const CENTER_STATUSES = new Set(["active", "inactive"]);
const VERIFICATION_STATUSES = new Set(["pending", "verified", "rejected"]);
const ANIMAL_STATUSES = new Set([
  "available",
  "contacting",
  "visit_scheduled",
  "reserved",
  "adopted",
  "unavailable",
]);
const GENDERS = new Set(["male", "female", "unknown"]);
const SIZES = new Set(["small", "medium", "large"]);

const SHELTER_IMAGE_DIRECTORY = path.join(__dirname, "..", "uploads", "shelter-animals");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function parseImageData(imageData) {
  const value = String(imageData || "").trim();
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw Object.assign(new Error("รูปต้องเป็นไฟล์ JPG, PNG หรือ WEBP"), { statusCode: 400 });
  const mimeType = match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_SIZE) {
    throw Object.assign(new Error(buffer.length ? "รูปมีขนาดใหญ่เกิน 5 MB" : "ไฟล์รูปไม่ถูกต้อง"), { statusCode: buffer.length ? 413 : 400 });
  }
  const valid =
    (mimeType === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) ||
    (mimeType === "image/webp" && buffer.subarray(0,4).toString("ascii") === "RIFF" && buffer.subarray(8,12).toString("ascii") === "WEBP");
  if (!valid) throw Object.assign(new Error("เนื้อหาไฟล์รูปไม่ถูกต้อง"), { statusCode: 400 });
  return { buffer, extension: IMAGE_EXTENSIONS.get(mimeType) };
}

async function saveShelterImage(imageData) {
  const image = parseImageData(imageData);
  await fs.mkdir(SHELTER_IMAGE_DIRECTORY, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}.${image.extension}`;
  const absolutePath = path.join(SHELTER_IMAGE_DIRECTORY, filename);
  await fs.writeFile(absolutePath, image.buffer, { flag: "wx" });
  return { absolutePath, publicPath: `/uploads/shelter-animals/${filename}` };
}

function localImagePath(publicPath) {
  const value = String(publicPath || "");
  if (!value.startsWith("/uploads/shelter-animals/")) return "";
  return path.join(SHELTER_IMAGE_DIRECTORY, path.basename(value));
}

async function removeImageQuietly(absolutePath) {
  if (!absolutePath) return;
  try { await fs.unlink(absolutePath); } catch (error) {
    if (error.code !== "ENOENT") console.error("Shelter image cleanup error:", error.message);
  }
}

function cleanText(value, maxLength = 255) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function optionalNumber(value, min, max, fieldName) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    const error = new Error(`${fieldName} ไม่ถูกต้อง`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function positiveId(value, fieldName = "รหัส") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`${fieldName}ไม่ถูกต้อง`);
    error.statusCode = 400;
    throw error;
  }
  return id;
}

function parseTraits(value) {
  let source = value;
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try { source = JSON.parse(value); } catch (_) { source = value; }
  }
  const values = Array.isArray(source)
    ? source
    : String(source ?? "")
        .split(/[,\n|]/)
        .map((item) => item.trim())
        .filter(Boolean);

  return [...new Set(values)]
    .map((item) => cleanText(item, 60))
    .filter(Boolean)
    .slice(0, 8);
}

function parseStoredTraits(value) {
  if (!value) return [];
  try {
    const result = JSON.parse(value);
    return Array.isArray(result) ? result : [];
  } catch (_) {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeCenter(row) {
  return {
    ...row,
    shelter_id: Number(row.shelter_id),
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
  };
}

function normalizeAnimal(row) {
  return {
    ...row,
    shelter_animal_id: Number(row.shelter_animal_id),
    shelter_id: Number(row.shelter_id),
    is_urgent: Boolean(Number(row.is_urgent)),
    traits: parseStoredTraits(row.traits_json),
  };
}

async function ready() {
  const ok = await ensureShelterSetup();
  if (!ok) {
    const error = new Error("ฐานข้อมูลศูนย์พักพิงยังไม่พร้อมใช้งาน");
    error.statusCode = 503;
    throw error;
  }
}

async function getShelterSummary(req, res) {
  try {
    await ready();
    const [[centerRows], [animalRows]] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) AS total_centers,
          SUM(verification_status = 'verified' AND status = 'active') AS verified_centers
        FROM shelter_center
      `),
      db.query(`
        SELECT
          COUNT(*) AS total_animals,
          SUM(species = 'dog') AS dog_animals,
          SUM(species = 'cat') AS cat_animals,
          SUM(adoption_status = 'available') AS available_animals,
          SUM(adoption_status = 'adopted') AS adopted_animals
        FROM shelter_animal
      `),
    ]);

    return res.json({
      success: true,
      data: {
        total_centers: Number(centerRows[0]?.total_centers || 0),
        verified_centers: Number(centerRows[0]?.verified_centers || 0),
        total_animals: Number(animalRows[0]?.total_animals || 0),
        dog_animals: Number(animalRows[0]?.dog_animals || 0),
        cat_animals: Number(animalRows[0]?.cat_animals || 0),
        available_animals: Number(animalRows[0]?.available_animals || 0),
        adopted_animals: Number(animalRows[0]?.adopted_animals || 0),
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "ไม่สามารถดึงภาพรวมศูนย์พักพิงได้",
      error: error.message,
    });
  }
}

async function getShelters(req, res) {
  try {
    await ready();
    const search = cleanText(req.query.search, 100);
    const status = cleanText(req.query.status, 20).toLowerCase();
    const verification = cleanText(req.query.verification, 20).toLowerCase();
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push("(shelter_name LIKE ? OR province LIKE ? OR phone LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status && status !== "all") {
      if (!CENTER_STATUSES.has(status)) throw Object.assign(new Error("ตัวกรองสถานะศูนย์ไม่ถูกต้อง"), { statusCode: 400 });
      conditions.push("status = ?");
      params.push(status);
    }
    if (verification && verification !== "all") {
      if (!VERIFICATION_STATUSES.has(verification)) throw Object.assign(new Error("ตัวกรองการตรวจสอบไม่ถูกต้อง"), { statusCode: 400 });
      conditions.push("verification_status = ?");
      params.push(verification);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT * FROM shelter_center ${where} ORDER BY shelter_id DESC`,
      params
    );

    return res.json({ success: true, total: rows.length, data: rows.map(normalizeCenter) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "ไม่สามารถดึงข้อมูลศูนย์พักพิงได้",
      error: error.message,
    });
  }
}

function buildCenterPayload(body, existing = {}) {
  const shelterName = cleanText(body.shelter_name ?? existing.shelter_name, 180);
  if (!shelterName) throw Object.assign(new Error("กรุณากรอกชื่อศูนย์พักพิง"), { statusCode: 400 });

  const status = cleanText(body.status ?? existing.status ?? "active", 20).toLowerCase();
  const verificationStatus = cleanText(
    body.verification_status ?? existing.verification_status ?? "pending",
    20
  ).toLowerCase();
  if (!CENTER_STATUSES.has(status)) throw Object.assign(new Error("สถานะศูนย์ไม่ถูกต้อง"), { statusCode: 400 });
  if (!VERIFICATION_STATUSES.has(verificationStatus)) throw Object.assign(new Error("สถานะการตรวจสอบไม่ถูกต้อง"), { statusCode: 400 });

  return {
    shelter_name: shelterName,
    description: cleanText(body.description ?? existing.description, 6000),
    phone: cleanText(body.phone ?? existing.phone, 40),
    email: cleanText(body.email ?? existing.email, 180).toLowerCase(),
    facebook_url: cleanText(body.facebook_url ?? existing.facebook_url, 1000),
    line_contact: cleanText(body.line_contact ?? existing.line_contact, 255),
    address: cleanText(body.address ?? existing.address, 3000),
    province: cleanText(body.province ?? existing.province, 120),
    latitude: optionalNumber(body.latitude ?? existing.latitude, -90, 90, "ละติจูด"),
    longitude: optionalNumber(body.longitude ?? existing.longitude, -180, 180, "ลองจิจูด"),
    contact_hours: cleanText(body.contact_hours ?? existing.contact_hours, 255),
    verification_status: verificationStatus,
    status,
  };
}

async function createShelter(req, res) {
  try {
    await ready();
    const payload = buildCenterPayload(req.body || {});
    const adminId = Number(req.admin.admin_id);
    const columns = Object.keys(payload);
    const [result] = await db.query(
      `INSERT INTO shelter_center (${columns.join(", ")}, created_by, updated_by)
       VALUES (${columns.map(() => "?").join(", ")}, ?, ?)`,
      [...columns.map((key) => payload[key]), adminId, adminId]
    );
    const [rows] = await db.query("SELECT * FROM shelter_center WHERE shelter_id = ?", [result.insertId]);
    return res.status(201).json({ success: true, message: "เพิ่มศูนย์พักพิงสำเร็จ", data: normalizeCenter(rows[0]) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถเพิ่มศูนย์พักพิงได้", error: error.message });
  }
}

async function updateShelter(req, res) {
  try {
    await ready();
    const shelterId = positiveId(req.params.id, "shelter_id ");
    const [rows] = await db.query("SELECT * FROM shelter_center WHERE shelter_id = ? LIMIT 1", [shelterId]);
    if (!rows.length) return res.status(404).json({ success: false, message: "ไม่พบศูนย์พักพิง" });
    const payload = buildCenterPayload(req.body || {}, rows[0]);
    const columns = Object.keys(payload);
    await db.query(
      `UPDATE shelter_center SET ${columns.map((key) => `${key} = ?`).join(", ")}, updated_by = ? WHERE shelter_id = ?`,
      [...columns.map((key) => payload[key]), Number(req.admin.admin_id), shelterId]
    );
    const [updatedRows] = await db.query("SELECT * FROM shelter_center WHERE shelter_id = ?", [shelterId]);
    return res.json({ success: true, message: "บันทึกข้อมูลศูนย์พักพิงสำเร็จ", data: normalizeCenter(updatedRows[0]) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถแก้ไขศูนย์พักพิงได้", error: error.message });
  }
}

async function getShelterAnimals(req, res) {
  try {
    await ready();
    const species = req.query.species ? normalizeSpecies(req.query.species) : null;
    const status = cleanText(req.query.status, 30).toLowerCase();
    const search = cleanText(req.query.search, 100);
    if (req.query.species && !species) throw Object.assign(new Error("species ต้องเป็น cat หรือ dog"), { statusCode: 400 });
    if (status && status !== "all" && !ANIMAL_STATUSES.has(status)) throw Object.assign(new Error("ตัวกรองสถานะสัตว์ไม่ถูกต้อง"), { statusCode: 400 });

    const conditions = [];
    const params = [];
    if (species) { conditions.push("a.species = ?"); params.push(species); }
    if (status && status !== "all") { conditions.push("a.adoption_status = ?"); params.push(status); }
    if (search) {
      conditions.push("(a.name LIKE ? OR c.shelter_name LIKE ? OR a.province LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT a.*, c.shelter_name, c.phone, c.email, c.facebook_url, c.line_contact,
              c.contact_hours, c.verification_status, c.status AS shelter_status
       FROM shelter_animal a
       INNER JOIN shelter_center c ON c.shelter_id = a.shelter_id
       ${where}
       ORDER BY a.shelter_animal_id DESC`,
      params
    );
    return res.json({ success: true, total: rows.length, data: rows.map(normalizeAnimal) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถดึงข้อมูลสัตว์รอรับเลี้ยงได้", error: error.message });
  }
}

function buildAnimalPayload(body, existing = {}) {
  const shelterId = positiveId(body.shelter_id ?? existing.shelter_id, "shelter_id ");
  const species = normalizeSpecies(body.species ?? existing.species);
  if (!species) throw Object.assign(new Error("species ต้องเป็น cat หรือ dog"), { statusCode: 400 });
  const name = cleanText(body.name ?? existing.name, 150);
  if (!name) throw Object.assign(new Error("กรุณากรอกชื่อสัตว์"), { statusCode: 400 });

  const gender = cleanText(body.gender ?? existing.gender ?? "unknown", 20).toLowerCase();
  const size = cleanText(body.size ?? existing.size ?? "medium", 20).toLowerCase();
  const adoptionStatus = cleanText(body.adoption_status ?? existing.adoption_status ?? "available", 30).toLowerCase();
  if (!GENDERS.has(gender)) throw Object.assign(new Error("เพศไม่ถูกต้อง"), { statusCode: 400 });
  if (!SIZES.has(size)) throw Object.assign(new Error("ขนาดไม่ถูกต้อง"), { statusCode: 400 });
  if (!ANIMAL_STATUSES.has(adoptionStatus)) throw Object.assign(new Error("สถานะสัตว์ไม่ถูกต้อง"), { statusCode: 400 });

  const traits = parseTraits(body.traits ?? existing.traits_json);
  return {
    shelter_id: shelterId,
    species,
    name,
    gender,
    estimated_age: cleanText(body.estimated_age ?? existing.estimated_age, 120),
    size,
    weight: cleanText(body.weight ?? existing.weight, 80),
    province: cleanText(body.province ?? existing.province, 120),
    cover_image_url: cleanText(body.cover_image_url ?? existing.cover_image_url, 2000),
    traits_json: JSON.stringify(traits),
    health_detail: cleanText(body.health_detail ?? existing.health_detail, 4000),
    vaccination_status: cleanText(body.vaccination_status ?? existing.vaccination_status, 255),
    sterilization_status: cleanText(body.sterilization_status ?? existing.sterilization_status, 255),
    personality: cleanText(body.personality ?? existing.personality, 4000),
    background_story: cleanText(body.background_story ?? existing.background_story, 6000),
    suitable_home: cleanText(body.suitable_home ?? existing.suitable_home, 4000),
    adoption_status: adoptionStatus,
    is_urgent: body.is_urgent === undefined
      ? Number(existing.is_urgent || 0)
      : (body.is_urgent === true || body.is_urgent === 1 || String(body.is_urgent) === "1" ? 1 : 0),
  };
}

async function ensureCenterExists(shelterId) {
  const [rows] = await db.query("SELECT shelter_id FROM shelter_center WHERE shelter_id = ? LIMIT 1", [shelterId]);
  if (!rows.length) throw Object.assign(new Error("ไม่พบศูนย์พักพิงที่เลือก"), { statusCode: 404 });
}

async function createShelterAnimal(req, res) {
  let savedImagePath = "";
  try {
    await ready();
    const body = { ...(req.body || {}) };
    if (body.cover_image_data) {
      const saved = await saveShelterImage(body.cover_image_data);
      savedImagePath = saved.absolutePath;
      body.cover_image_url = saved.publicPath;
    }
    const payload = buildAnimalPayload(body);
    if (!payload.cover_image_url) throw Object.assign(new Error("กรุณาอัปโหลดรูปสัตว์"), { statusCode: 400 });
    await ensureCenterExists(payload.shelter_id);
    const adminId = Number(req.admin.admin_id);
    const columns = Object.keys(payload);
    const [result] = await db.query(
      `INSERT INTO shelter_animal (${columns.join(", ")}, published_by, updated_by)
       VALUES (${columns.map(() => "?").join(", ")}, ?, ?)`,
      [...columns.map((key) => payload[key]), adminId, adminId]
    );
    const [rows] = await db.query(
      `SELECT a.*, c.shelter_name, c.phone, c.email, c.facebook_url, c.line_contact,
              c.contact_hours, c.verification_status, c.status AS shelter_status
       FROM shelter_animal a INNER JOIN shelter_center c ON c.shelter_id = a.shelter_id
       WHERE a.shelter_animal_id = ?`,
      [result.insertId]
    );
    return res.status(201).json({ success: true, message: "เพิ่มสัตว์รอรับเลี้ยงสำเร็จ", data: normalizeAnimal(rows[0]) });
  } catch (error) {
    await removeImageQuietly(savedImagePath);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถเพิ่มสัตว์รอรับเลี้ยงได้", error: error.message });
  }
}

async function updateShelterAnimal(req, res) {
  let newImagePath = "";
  let oldImagePath = "";
  try {
    await ready();
    const animalId = positiveId(req.params.id, "shelter_animal_id ");
    const [rows] = await db.query("SELECT * FROM shelter_animal WHERE shelter_animal_id = ? LIMIT 1", [animalId]);
    if (!rows.length) return res.status(404).json({ success: false, message: "ไม่พบสัตว์ที่ต้องการแก้ไข" });
    const body = { ...(req.body || {}) };
    if (body.cover_image_data) {
      const saved = await saveShelterImage(body.cover_image_data);
      newImagePath = saved.absolutePath;
      body.cover_image_url = saved.publicPath;
      oldImagePath = localImagePath(rows[0].cover_image_url);
    }
    const payload = buildAnimalPayload(body, rows[0]);
    if (!payload.cover_image_url) throw Object.assign(new Error("กรุณาอัปโหลดรูปสัตว์"), { statusCode: 400 });
    await ensureCenterExists(payload.shelter_id);
    const columns = Object.keys(payload);
    await db.query(
      `UPDATE shelter_animal SET ${columns.map((key) => `${key} = ?`).join(", ")}, updated_by = ? WHERE shelter_animal_id = ?`,
      [...columns.map((key) => payload[key]), Number(req.admin.admin_id), animalId]
    );
    await removeImageQuietly(oldImagePath);
    const [updatedRows] = await db.query(
      `SELECT a.*, c.shelter_name, c.phone, c.email, c.facebook_url, c.line_contact,
              c.contact_hours, c.verification_status, c.status AS shelter_status
       FROM shelter_animal a INNER JOIN shelter_center c ON c.shelter_id = a.shelter_id
       WHERE a.shelter_animal_id = ?`,
      [animalId]
    );
    return res.json({ success: true, message: "บันทึกข้อมูลสัตว์รอรับเลี้ยงสำเร็จ", data: normalizeAnimal(updatedRows[0]) });
  } catch (error) {
    await removeImageQuietly(newImagePath);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถแก้ไขสัตว์รอรับเลี้ยงได้", error: error.message });
  }
}

module.exports = {
  getShelterSummary,
  getShelters,
  createShelter,
  updateShelter,
  getShelterAnimals,
  createShelterAnimal,
  updateShelterAnimal,
};
