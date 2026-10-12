"use strict";

const db = require("../config/db");
const { normalizeSpecies } = require("../utils/species");

/**
 * GET /api/farms?species=cat|dog
 * ดึงฟาร์มที่ผ่านการอนุมัติ โดยกรองสัตว์ตามประเภทเมื่อขอ include_animals=1
 */
const getAllFarms = async (req, res) => {
  try {
    const species = normalizeSpecies(req.query.species);
    if (!species) {
      return res.status(400).json({ success: false, message: "species ต้องเป็น cat หรือ dog" });
    }

    const search = String(req.query.search || "").trim();
    const includeAnimals = String(req.query.include_animals || "") === "1";

    if (includeAnimals) {
      const searchPattern = `%${search}%`;
      const [rows] = await db.query(`
        SELECT
          f.farm_id,
          f.farm_name,
          f.owner_name,
          f.email,
          f.phone,
          f.phone_country,
          f.country,
          f.province,
          f.district,
          f.subdistrict,
          f.address,
          f.description AS farm_description,
          f.website,
          f.facebook,
          f.line_contact,
          f.latitude,
          f.longitude,
          f.status,
          f.approved_at,
          f.created_at,
          f.profile_image,
          a.animal_id,
          a.animal_name,
          a.age_months,
          a.gender,
          a.color,
          a.description,
          a.image_url,
          a.status AS animal_status,
          b.breed_id,
          b.breed_name,
          b.species,
          'exact' AS match_type
        FROM farm f
        INNER JOIN animal a
          ON a.farm_id = f.farm_id
          AND LOWER(TRIM(a.status)) = 'available'
        INNER JOIN breed b
          ON a.breed_id = b.breed_id
          AND b.species = ?
        WHERE LOWER(TRIM(f.status)) = 'approved'
          AND (? = '' OR f.farm_name LIKE ?)
        ORDER BY f.farm_name ASC, a.animal_id DESC
      `, [species, search, searchPattern]);

      return res.status(200).json({ success: true, species, total: rows.length, data: rows });
    }

    const [rows] = await db.query(`
      SELECT
        farm_id, farm_name, owner_name, email, phone, phone_country,
        country, province, district, subdistrict, address, description,
        website, facebook, line_contact, latitude, longitude, status,
        approved_at, created_at, profile_image
      FROM farm
      WHERE status = 'approved'
      ORDER BY farm_name ASC
    `);

    return res.status(200).json({ success: true, species, total: rows.length, data: rows });
  } catch (error) {
    console.error("Get all farms error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลฟาร์มได้" });
  }
};

/**
 * GET /api/farms/:id?species=cat|dog
 */
const getFarmById = async (req, res) => {
  try {
    const { id } = req.params;
    const species = normalizeSpecies(req.query.species);
    if (!species) {
      return res.status(400).json({ success: false, message: "species ต้องเป็น cat หรือ dog" });
    }

    const [farmRows] = await db.query(
      `SELECT
        farm_id, farm_name, owner_name, email, phone, phone_country,
        country, province, district, subdistrict, address, description,
        website, facebook, line_contact, latitude, longitude, status,
        approved_at, created_at, profile_image
       FROM farm
       WHERE farm_id = ? AND LOWER(TRIM(status)) = 'approved'
       LIMIT 1`,
      [id]
    );

    if (farmRows.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลฟาร์ม" });
    }

    const [animalRows] = await db.query(
      `SELECT
        a.animal_id,
        a.animal_name,
        a.age_months,
        a.gender,
        a.color,
        a.description,
        a.status,
        a.image_url,
        b.breed_id,
        b.breed_name,
        b.species
       FROM animal a
       INNER JOIN breed b ON a.breed_id = b.breed_id
       WHERE a.farm_id = ?
         AND b.species = ?
       ORDER BY a.animal_id ASC`,
      [id, species]
    );

    return res.status(200).json({
      success: true,
      species,
      data: { ...farmRows[0], animals: animalRows },
    });
  } catch (error) {
    console.error("Get farm by ID error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถโหลดรายละเอียดฟาร์มได้" });
  }
};

/**
 * GET /api/breeds/:breedId/farms?species=cat|dog
 */
const getFarmsByBreed = async (req, res) => {
  try {
    const breedId = Number(req.params.breedId);
    const requestedName = String(req.query.breed_name || "").trim();
    const species = normalizeSpecies(req.query.species);

    if (!species) {
      return res.status(400).json({ success: false, message: "species ต้องเป็น cat หรือ dog" });
    }
    if (!Number.isInteger(breedId) || breedId <= 0) {
      return res.status(400).json({ success: false, message: "breed_id ไม่ถูกต้อง" });
    }

    const [requestedRows] = await db.query(
      `SELECT breed_id, breed_name, species
       FROM breed
       WHERE breed_id = ? AND species = ?
       LIMIT 1`,
      [breedId, species]
    );

    if (!requestedRows.length) {
      return res.status(404).json({ success: false, message: "ไม่พบสายพันธุ์ของประเภทสัตว์ที่เลือก" });
    }

    const canonicalName = requestedRows[0].breed_name || requestedName;
    const [rows] = await db.query(
      `SELECT
        f.farm_id,
        f.farm_name,
        f.owner_name,
        f.phone,
        f.phone_country,
        f.country,
        f.province,
        f.district,
        f.subdistrict,
        f.address,
        f.website,
        f.facebook,
        f.line_contact,
        f.latitude,
        f.longitude,
        f.profile_image,
        a.animal_id,
        a.animal_name,
        a.age_months,
        a.gender,
        a.color,
        a.description,
        a.image_url,
        a.status AS animal_status,
        b.breed_id,
        b.breed_name,
        b.species,
        'exact' AS match_type
       FROM animal a
       INNER JOIN farm f ON a.farm_id = f.farm_id
       INNER JOIN breed b ON a.breed_id = b.breed_id
       WHERE a.breed_id = ?
         AND b.species = ?
         AND LOWER(TRIM(a.status)) = 'available'
         AND LOWER(TRIM(f.status)) = 'approved'
       ORDER BY f.farm_name ASC, a.animal_id DESC`,
      [breedId, species]
    );

    return res.json({
      success: true,
      species,
      total: rows.length,
      requested_breed: canonicalName || requestedName || null,
      include_related: false,
      includes_related_breeds: false,
      data: rows,
    });
  } catch (error) {
    console.error("Get farms by breed error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถโหลดฟาร์มที่มีสายพันธุ์นี้ได้" });
  }
};

module.exports = { getAllFarms, getFarmById, getFarmsByBreed };
