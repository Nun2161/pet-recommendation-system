"use strict";

const db = require("../config/db");
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

module.exports = { listAnimals, getAnimal };
