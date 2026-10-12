"use strict";

const db = require("../config/db");
const { normalizeSpecies } = require("../utils/species");
const {
  ensureAssessmentSetup,
} = require("../services/assessmentSetupService");

function buildHistory(rows, fallbackSpecies = "cat") {
  const historyMap = new Map();

  for (const row of rows) {
    const resultId = Number(row.result_id);
    const species = row.species === "dog" ? "dog" : fallbackSpecies;

    if (!historyMap.has(resultId)) {
      historyMap.set(resultId, {
        result_id: resultId,
        species,
        answered_count: Number(row.answered_count),
        created_at: row.created_at,
        recommendations: [],
      });
    }

    if (row.history_id !== null && row.history_id !== undefined) {
      historyMap.get(resultId).recommendations.push({
        history_id: Number(row.history_id),
        rank_order: Number(row.rank_order),
        match_score: Number(row.match_score),
        breed_id: Number(row.breed_id),
        breed_name: row.breed_name,
        description: row.description,
        image_url: row.image_url,
        species,
      });
    }
  }

  return Array.from(historyMap.values());
}

/**
 * GET /api/history?species=cat|dog
 * ประวัติแมวเดิมจะถูกมองเป็น cat เสมอ จึงไม่หายหลังเพิ่มระบบสุนัข
 */
const getMyHistory = async (req, res) => {
  try {
    const userId = Number(req.user.user_id);
    const rawSpecies = req.query.species;
    const species = rawSpecies === undefined || rawSpecies === ""
      ? null
      : normalizeSpecies(rawSpecies, null);

    if (rawSpecies !== undefined && rawSpecies !== "" && !species) {
      return res.status(400).json({
        success: false,
        message: "species ต้องเป็น cat หรือ dog",
      });
    }

    await ensureAssessmentSetup();

    let rows;

    try {
      const conditions = ["ar.user_id = ?"];
      const params = [userId];

      if (species) {
        conditions.push(
          "COALESCE(NULLIF(ar.species, ''), 'cat') = ?"
        );
        params.push(species);
      }

      [rows] = await db.query(
        `
          SELECT
            ar.result_id,
            COALESCE(NULLIF(ar.species, ''), 'cat') AS species,
            ar.answered_count,
            ar.created_at,
            rh.history_id,
            rh.rank_order,
            rh.match_score,
            b.breed_id,
            b.breed_name,
            b.description,
            b.image_url
          FROM assessment_result AS ar
          LEFT JOIN recommendation_history AS rh
            ON ar.result_id = rh.result_id
           AND COALESCE(NULLIF(rh.species, ''), 'cat') =
               COALESCE(NULLIF(ar.species, ''), 'cat')
          LEFT JOIN breed AS b
            ON rh.breed_id = b.breed_id
           AND COALESCE(NULLIF(b.species, ''), 'cat') =
               COALESCE(NULLIF(ar.species, ''), 'cat')
          WHERE ${conditions.join(" AND ")}
          ORDER BY ar.result_id DESC, rh.rank_order ASC
        `,
        params
      );
    } catch (error) {
      if (error?.code !== "ER_BAD_FIELD_ERROR") {
        throw error;
      }

      // โครงสร้างฐานข้อมูลเดิมไม่มี species: ข้อมูลทั้งหมดเป็นประวัติแมว
      if (species === "dog") {
        rows = [];
      } else {
        [rows] = await db.query(
          `
            SELECT
              ar.result_id,
              'cat' AS species,
              ar.answered_count,
              ar.created_at,
              rh.history_id,
              rh.rank_order,
              rh.match_score,
              b.breed_id,
              b.breed_name,
              b.description,
              b.image_url
            FROM assessment_result AS ar
            LEFT JOIN recommendation_history AS rh
              ON ar.result_id = rh.result_id
            LEFT JOIN breed AS b
              ON rh.breed_id = b.breed_id
            WHERE ar.user_id = ?
            ORDER BY ar.result_id DESC, rh.rank_order ASC
          `,
          [userId]
        );
      }
    }

    const history = buildHistory(rows, species || "cat");

    return res.status(200).json({
      success: true,
      user: req.user,
      species_filter: species,
      total_results: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Get history error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงประวัติผลการแนะนำได้",
      error: error.message,
    });
  }
};

module.exports = {
  getMyHistory,
};
