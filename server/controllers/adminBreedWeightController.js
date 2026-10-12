"use strict";

const db = require("../config/db");
const { normalizeSpecies } = require("../utils/species");

const BREED_TRAITS = [
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

const WEIGHT_COLUMNS = BREED_TRAITS.map(
  (trait) => `${trait}_weight`
);

const BREED_SELECT_COLUMNS = [
  "breed_id",
  "breed_name",
  ...BREED_TRAITS,
  "description",
  "image_url",
  "status",
  "species",
];

const ALLOWED_BREED_STATUSES = new Set([
  "active",
  "inactive",
]);

function toPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0
    ? number
    : null;
}

function cleanText(value, maxLength = 255) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function parseTraitScore(value, fieldName) {
  const score = Number(value);

  if (
    !Number.isFinite(score) ||
    score < 1 ||
    score > 5
  ) {
    const error = new Error(
      `${fieldName} ต้องเป็นตัวเลขตั้งแต่ 1 ถึง 5`
    );
    error.statusCode = 400;
    throw error;
  }

  return Number(score.toFixed(2));
}

function parseWeight(value, fieldName) {
  const weight = Number(value);

  if (
    !Number.isFinite(weight) ||
    weight < 0 ||
    weight > 100
  ) {
    const error = new Error(
      `${fieldName} ต้องเป็นตัวเลขตั้งแต่ 0 ถึง 100`
    );
    error.statusCode = 400;
    throw error;
  }

  return Number(weight.toFixed(2));
}

function normalizeBreedRow(row) {
  const normalized = {
    ...row,
    breed_id: Number(row.breed_id),
  };

  BREED_TRAITS.forEach((trait) => {
    normalized[trait] = Number(row[trait]);
  });

  return normalized;
}

async function findBreedById(breedId, species = null) {
  const speciesClause = species ? " AND species = ?" : "";
  const params = species ? [breedId, species] : [breedId];

  const [rows] = await db.query(
    `SELECT ${BREED_SELECT_COLUMNS.join(", ")}
     FROM breed
     WHERE breed_id = ?
     ${speciesClause}
     LIMIT 1`,
    params
  );

  return rows.length
    ? normalizeBreedRow(rows[0])
    : null;
}

async function ensureBreedNameAvailable(
  breedName,
  species,
  excludedBreedId = null
) {
  const params = [breedName, species];
  let excludedClause = "";

  if (excludedBreedId) {
    excludedClause = " AND breed_id <> ?";
    params.push(excludedBreedId);
  }

  const [rows] = await db.query(
    `SELECT breed_id
     FROM breed
     WHERE LOWER(TRIM(breed_name)) = LOWER(TRIM(?))
       AND species = ?
     ${excludedClause}
     LIMIT 1`,
    params
  );

  if (rows.length) {
    const error = new Error(
      "มีสายพันธุ์ชื่อนี้อยู่ในระบบแล้ว"
    );
    error.statusCode = 409;
    throw error;
  }
}

function buildBreedPayload(body, existing = null) {
  const breedName = cleanText(
    body.breed_name ?? existing?.breed_name,
    150
  );

  if (!breedName) {
    const error = new Error("กรุณากรอกชื่อสายพันธุ์");
    error.statusCode = 400;
    throw error;
  }

  const status = cleanText(
    body.status ?? existing?.status ?? "active",
    20
  ).toLowerCase();

  if (!ALLOWED_BREED_STATUSES.has(status)) {
    const error = new Error(
      "สถานะสายพันธุ์ต้องเป็น active หรือ inactive"
    );
    error.statusCode = 400;
    throw error;
  }

  const species = normalizeSpecies(
    body.species ?? existing?.species
  );

  if (!species) {
    const error = new Error("species ต้องเป็น cat หรือ dog");
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    breed_name: breedName,
    species,
    description: cleanText(
      body.description ?? existing?.description,
      6000
    ),
    image_url: cleanText(
      body.image_url ?? existing?.image_url,
      2000
    ),
    status,
  };

  BREED_TRAITS.forEach((trait) => {
    const sourceValue =
      body[trait] ?? existing?.[trait] ?? 3;

    payload[trait] = parseTraitScore(
      sourceValue,
      trait
    );
  });

  return payload;
}

/**
 * GET /api/admin/breeds
 */
const getBreedsForAdmin = async (req, res) => {
  try {
    const species = normalizeSpecies(req.query.species);

    if (!species) {
      return res.status(400).json({
        success: false,
        message: "species ต้องเป็น cat หรือ dog",
      });
    }

    const search = cleanText(req.query.search, 100);
    const requestedStatus = cleanText(
      req.query.status,
      20
    ).toLowerCase();

    const conditions = ["species = ?"];
    const params = [species];

    if (search) {
      conditions.push("breed_name LIKE ?");
      params.push(`%${search}%`);
    }

    if (
      requestedStatus &&
      requestedStatus !== "all"
    ) {
      if (!ALLOWED_BREED_STATUSES.has(requestedStatus)) {
        return res.status(400).json({
          success: false,
          message: "ตัวกรองสถานะสายพันธุ์ไม่ถูกต้อง",
        });
      }

      conditions.push("status = ?");
      params.push(requestedStatus);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await db.query(
      `SELECT ${BREED_SELECT_COLUMNS.join(", ")}
       FROM breed
       ${whereClause}
       ORDER BY breed_name ASC`,
      params
    );

    const breeds = rows.map(normalizeBreedRow);

    return res.status(200).json({
      success: true,
      total: breeds.length,
      data: breeds,
    });
  } catch (error) {
    console.error("Admin get breeds error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลสายพันธุ์ได้",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/breeds
 */
const createBreedByAdmin = async (req, res) => {
  try {
    const payload = buildBreedPayload(req.body || {});

    await ensureBreedNameAvailable(
      payload.breed_name,
      payload.species
    );

    const columns = [
      "breed_name",
      "species",
      ...BREED_TRAITS,
      "description",
      "image_url",
      "status",
    ];

    const values = columns.map(
      (column) => payload[column]
    );

    const placeholders = columns
      .map(() => "?")
      .join(", ");

    const [result] = await db.query(
      `INSERT INTO breed (${columns.join(", ")})
       VALUES (${placeholders})`,
      values
    );

    const createdBreed = await findBreedById(
      Number(result.insertId)
    );

    return res.status(201).json({
      success: true,
      message: "เพิ่มสายพันธุ์สำเร็จ",
      data: createdBreed,
    });
  } catch (error) {
    console.error("Admin create breed error:", error);

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.statusCode
            ? error.message
            : "ไม่สามารถเพิ่มสายพันธุ์ได้",
        error: error.message,
      });
  }
};

/**
 * PATCH /api/admin/breeds/:id
 */
const updateBreedByAdmin = async (req, res) => {
  try {
    const breedId = toPositiveInteger(req.params.id);

    if (!breedId) {
      return res.status(400).json({
        success: false,
        message: "breed_id ไม่ถูกต้อง",
      });
    }

    const existing = await findBreedById(breedId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสายพันธุ์ที่ต้องการแก้ไข",
      });
    }

    const payload = buildBreedPayload(
      req.body || {},
      existing
    );

    await ensureBreedNameAvailable(
      payload.breed_name,
      payload.species,
      breedId
    );

    const columns = [
      "breed_name",
      "species",
      ...BREED_TRAITS,
      "description",
      "image_url",
      "status",
    ];

    const setClause = columns
      .map((column) => `${column} = ?`)
      .join(", ");

    const values = columns.map(
      (column) => payload[column]
    );

    await db.query(
      `UPDATE breed
       SET ${setClause}
       WHERE breed_id = ?`,
      [...values, breedId]
    );

    const updatedBreed = await findBreedById(breedId);

    return res.status(200).json({
      success: true,
      message: "บันทึกข้อมูลสายพันธุ์สำเร็จ",
      data: updatedBreed,
    });
  } catch (error) {
    console.error("Admin update breed error:", error);

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.statusCode
            ? error.message
            : "ไม่สามารถแก้ไขสายพันธุ์ได้",
        error: error.message,
      });
  }
};

async function getWeightTableColumns() {
  const [rows] = await db.query(
    "SHOW COLUMNS FROM weight_criteria"
  );

  return new Set(
    rows.map((row) => String(row.Field))
  );
}

function normalizeWeights(row) {
  const rawWeights = {};
  let total = 0;

  WEIGHT_COLUMNS.forEach((column) => {
    const value = Number(row?.[column] ?? 0);
    rawWeights[column] = Number.isFinite(value)
      ? value
      : 0;
    total += rawWeights[column];
  });

  const equalWeight = 100 / WEIGHT_COLUMNS.length;
  const normalizedWeights = {};

  WEIGHT_COLUMNS.forEach((column) => {
    normalizedWeights[column] = Number(
      (
        total > 0
          ? (rawWeights[column] / total) * 100
          : equalWeight
      ).toFixed(2)
    );
  });

  return {
    raw_weights: rawWeights,
    normalized_weights: normalizedWeights,
    raw_total: Number(total.toFixed(4)),
  };
}

/**
 * GET /api/admin/weights
 */
const getLatestWeightsForAdmin = async (req, res) => {
  try {
    const species = normalizeSpecies(req.query.species);

    if (!species) {
      return res.status(400).json({
        success: false,
        message: "species ต้องเป็น cat หรือ dog",
      });
    }

    const [rows] = await db.query(
      `SELECT *
       FROM weight_criteria
       WHERE species = ?
       ORDER BY weight_id DESC
       LIMIT 1`,
      [species]
    );

    if (!rows.length) {
      const equalWeight = Number(
        (100 / WEIGHT_COLUMNS.length).toFixed(2)
      );
      const normalizedWeights = {};

      WEIGHT_COLUMNS.forEach((column) => {
        normalizedWeights[column] = equalWeight;
      });

      return res.status(200).json({
        success: true,
        data: {
          weight_id: null,
          species,
          normalized_weights: normalizedWeights,
          raw_weights: {},
          raw_total: 0,
          updated_by: null,
          updated_at: null,
        },
      });
    }

    const row = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        weight_id: Number(row.weight_id),
        species,
        ...normalizeWeights(row),
        updated_by:
          row.updated_by === null ||
          row.updated_by === undefined
            ? null
            : Number(row.updated_by),
        updated_at: row.updated_at || null,
      },
    });
  } catch (error) {
    console.error("Admin get weights error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงค่าน้ำหนักได้",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/weights
 */
const createWeightsByAdmin = async (req, res) => {
  try {
    const species = normalizeSpecies(
      req.body?.species ?? req.query?.species
    );

    if (!species) {
      return res.status(400).json({
        success: false,
        message: "species ต้องเป็น cat หรือ dog",
      });
    }

    const inputWeights = req.body?.weights;

    if (
      !inputWeights ||
      typeof inputWeights !== "object" ||
      Array.isArray(inputWeights)
    ) {
      return res.status(400).json({
        success: false,
        message: "รูปแบบค่าน้ำหนักไม่ถูกต้อง",
      });
    }

    const parsedWeights = {};
    let total = 0;

    WEIGHT_COLUMNS.forEach((column) => {
      const value = parseWeight(
        inputWeights[column],
        column
      );

      parsedWeights[column] = value;
      total += value;
    });

    if (Math.abs(total - 100) > 0.05) {
      return res.status(400).json({
        success: false,
        message:
          `ผลรวมค่าน้ำหนักต้องเท่ากับ 100% (ปัจจุบัน ${total.toFixed(2)}%)`,
      });
    }

    const availableColumns =
      await getWeightTableColumns();

    const missingColumns = WEIGHT_COLUMNS.filter(
      (column) => !availableColumns.has(column)
    );

    if (missingColumns.length) {
      console.error(
        "Missing weight columns:",
        missingColumns
      );

      return res.status(500).json({
        success: false,
        message:
          "โครงสร้างตาราง weight_criteria ยังไม่ครบสำหรับเกณฑ์ทั้ง 20 ด้าน",
      });
    }

    const insertColumns = [...WEIGHT_COLUMNS, "species"];
    const insertValues = [
      ...WEIGHT_COLUMNS.map(
        (column) => parsedWeights[column]
      ),
      species,
    ];
    const placeholders = [
      ...WEIGHT_COLUMNS.map(() => "?"),
      "?",
    ];

    if (availableColumns.has("updated_by")) {
      insertColumns.push("updated_by");
      insertValues.push(Number(req.admin.admin_id));
      placeholders.push("?");
    }

    if (availableColumns.has("updated_at")) {
      insertColumns.push("updated_at");
      placeholders.push("NOW()");
    }

    const [result] = await db.query(
      `INSERT INTO weight_criteria
       (${insertColumns.join(", ")})
       VALUES (${placeholders.join(", ")})`,
      insertValues
    );

    return res.status(201).json({
      success: true,
      message:
        "บันทึกค่าน้ำหนักสำเร็จ และจะใช้กับการประเมินครั้งถัดไป",
      data: {
        weight_id: Number(result.insertId),
        species,
        normalized_weights: parsedWeights,
        raw_total: Number(total.toFixed(2)),
        updated_by: Number(req.admin.admin_id),
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin create weights error:", error);

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.statusCode
            ? error.message
            : "ไม่สามารถบันทึกค่าน้ำหนักได้",
        error: error.message,
      });
  }
};

module.exports = {
  getBreedsForAdmin,
  createBreedByAdmin,
  updateBreedByAdmin,
  getLatestWeightsForAdmin,
  createWeightsByAdmin,
};
