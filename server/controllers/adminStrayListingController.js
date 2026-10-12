"use strict";

const db = require("../config/db");
const { ensureShelterSetup } = require("../services/shelterSetupService");
const { normalizeSpecies } = require("../utils/species");

const APPROVAL_STATUSES = new Set(["pending", "approved", "rejected"]);
const ADOPTION_STATUSES = new Set(["available", "contacting", "reserved", "adopted", "unavailable"]);

function cleanText(value, maxLength = 255) {
  return String(value ?? "").trim().slice(0, maxLength);
}
function positiveId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error("รหัสประกาศไม่ถูกต้อง"), { statusCode: 400 });
  return id;
}
function parseTraits(value) {
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
}
function normalizeRow(row) {
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
async function ready() {
  const ok = await ensureShelterSetup();
  if (!ok) throw Object.assign(new Error("ระบบประกาศช่วยหาบ้านยังไม่พร้อมใช้งาน"), { statusCode: 503 });
}

async function getListings(req, res) {
  try {
    await ready();
    const species = req.query.species ? normalizeSpecies(req.query.species) : null;
    const approval = cleanText(req.query.approval, 20).toLowerCase();
    const search = cleanText(req.query.search, 100);
    if (req.query.species && !species) throw Object.assign(new Error("species ต้องเป็น cat หรือ dog"), { statusCode: 400 });
    if (approval && approval !== "all" && !APPROVAL_STATUSES.has(approval)) throw Object.assign(new Error("สถานะการอนุมัติไม่ถูกต้อง"), { statusCode: 400 });
    const conditions = [];
    const params = [];
    if (species) { conditions.push("l.species = ?"); params.push(species); }
    if (approval && approval !== "all") { conditions.push("l.approval_status = ?"); params.push(approval); }
    if (search) {
      conditions.push("(l.name LIKE ? OR l.province LIKE ? OR l.contact_name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)");
      params.push(...Array(5).fill(`%${search}%`));
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT l.*, u.name AS account_name, u.email AS account_email, u.phone AS account_phone,
              a.name AS reviewer_name
       FROM user_stray_listing l
       INNER JOIN users u ON u.user_id = l.user_id
       LEFT JOIN admin a ON a.admin_id = l.reviewed_by
       ${where}
       ORDER BY FIELD(l.approval_status, 'pending', 'rejected', 'approved'), l.listing_id DESC`,
      params
    );
    return res.json({ success: true, total: rows.length, data: rows.map(normalizeRow) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถโหลดประกาศช่วยหาบ้านได้", error: error.message });
  }
}

async function reviewListing(req, res) {
  try {
    await ready();
    const listingId = positiveId(req.params.id);
    const approval = cleanText(req.body?.approval_status, 20).toLowerCase();
    const reason = cleanText(req.body?.rejection_reason, 2000);
    if (!new Set(["approved", "rejected"]).has(approval)) throw Object.assign(new Error("กรุณาเลือกอนุมัติหรือไม่อนุมัติ"), { statusCode: 400 });
    if (approval === "rejected" && !reason) throw Object.assign(new Error("กรุณาระบุเหตุผลที่ไม่อนุมัติ"), { statusCode: 400 });
    const [result] = await db.query(
      `UPDATE user_stray_listing
       SET approval_status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE listing_id = ?`,
      [approval, approval === "rejected" ? reason : null, Number(req.admin.admin_id), listingId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
    return res.json({ success: true, message: approval === "approved" ? "อนุมัติประกาศและเผยแพร่แล้ว" : "ไม่อนุมัติประกาศแล้ว" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถตรวจสอบประกาศได้", error: error.message });
  }
}

async function updateListingStatus(req, res) {
  try {
    await ready();
    const listingId = positiveId(req.params.id);
    const status = cleanText(req.body?.adoption_status, 30).toLowerCase();
    if (!ADOPTION_STATUSES.has(status)) throw Object.assign(new Error("สถานะการหาบ้านไม่ถูกต้อง"), { statusCode: 400 });
    const [result] = await db.query("UPDATE user_stray_listing SET adoption_status = ? WHERE listing_id = ?", [status, listingId]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
    return res.json({ success: true, message: "อัปเดตสถานะประกาศแล้ว" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "ไม่สามารถอัปเดตสถานะได้", error: error.message });
  }
}

module.exports = { getListings, reviewListing, updateListingStatus };
