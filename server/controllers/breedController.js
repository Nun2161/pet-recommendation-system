"use strict";

const db = require("../config/db");
const { normalizeSpecies } = require("../utils/species");
const {
  ensureAssessmentSetup,
} = require("../services/assessmentSetupService");

const TRAIT_COLUMNS = [
  "friendly",
  "affectionate",
  "playful",
  "independence",
  "trainability",
  "protective",
  "adaptability",
  "sociability",
  "activity_level",
  "exercise_need",
  "outdoor_preference",
  "apartment_suitability",
  "family_friendly",
  "child_friendly",
  "first_time_owner_friendly",
  "grooming_need",
  "shedding_level",
  "noise_level",
  "heat_tolerance",
  "cold_tolerance",
];

const SELECT_COLUMNS = [
  "breed_id",
  "breed_name",
  ...TRAIT_COLUMNS,
  "description",
  "image_url",
  "status",
  "species",
];

function normalizeBreed(row) {
  const breed = {
    ...row,
    breed_id: Number(row.breed_id),
  };

  TRAIT_COLUMNS.forEach((column) => {
    breed[column] = Number(row[column]);
  });

  return breed;
}

/**
 * GET /api/breeds?species=cat|dog
 */
const getAllBreeds = async (req, res) => {
  try {
    await ensureAssessmentSetup();
    const species = normalizeSpecies(req.query.species ?? "cat");

    if (!species) {
      return res.status(400).json({
        success: false,
        message: "species ต้องเป็น cat หรือ dog",
      });
    }

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const parsedLimit = Number(req.query.limit);
    const parsedPage = Number(req.query.page);

    const limit =
      Number.isInteger(parsedLimit) &&
      parsedLimit > 0 &&
      parsedLimit <= 100
        ? parsedLimit
        : 20;

    const page =
      Number.isInteger(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    const offset = (page - 1) * limit;
    const conditions = [
      "status = 'active'",
      "species = ?",
    ];
    const params = [species];

    if (search) {
      conditions.push("breed_name LIKE ?");
      params.push(`%${search}%`);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM breed
       WHERE ${whereClause}`,
      params
    );

    const total = Number(countRows[0].total);

    const [rows] = await db.query(
      `SELECT ${SELECT_COLUMNS.join(", ")}
       FROM breed
       WHERE ${whereClause}
       ORDER BY breed_name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      success: true,
      species,
      total,
      page,
      limit,
      total_pages: total === 0 ? 0 : Math.ceil(total / limit),
      data: rows.map(normalizeBreed),
    });
  } catch (error) {
    console.error("Get all breeds error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลสายพันธุ์ได้",
    });
  }
};

/**
 * GET /api/breeds/:id?species=cat|dog
 */
const getBreedById = async (req, res) => {
  try {
    await ensureAssessmentSetup();
    const breedId = Number(req.params.id);
    const species = normalizeSpecies(req.query.species ?? "cat");

    if (!Number.isInteger(breedId) || breedId <= 0) {
      return res.status(400).json({
        success: false,
        message: "breed_id ไม่ถูกต้อง",
      });
    }

    if (!species) {
      return res.status(400).json({
        success: false,
        message: "species ต้องเป็น cat หรือ dog",
      });
    }

    const [rows] = await db.query(
      `SELECT ${SELECT_COLUMNS.join(", ")}
       FROM breed
       WHERE breed_id = ?
         AND species = ?
         AND status = 'active'
       LIMIT 1`,
      [breedId, species]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลสายพันธุ์นี้",
      });
    }

    return res.status(200).json({
      success: true,
      species,
      data: normalizeBreed(rows[0]),
    });
  } catch (error) {
    console.error("Get breed by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงรายละเอียดสายพันธุ์ได้",
    });
  }
};

module.exports = {
  getAllBreeds,
  getBreedById,
};
