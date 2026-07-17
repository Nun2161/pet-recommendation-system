const db = require("../config/db");

/**
 * GET /api/history
 * ดูประวัติแบบประเมินของผู้ใช้ที่ล็อกอิน
 */
const getMyHistory = async (req, res) => {
  try {
    const userId = Number(req.user.user_id);

    const [rows] = await db.query(
      `
        SELECT
          ar.result_id,
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

        ORDER BY
          ar.result_id DESC,
          rh.rank_order ASC
      `,
      [userId]
    );

    const historyMap = new Map();

    for (const row of rows) {
      const resultId = Number(row.result_id);

      if (!historyMap.has(resultId)) {
        historyMap.set(resultId, {
          result_id: resultId,
          answered_count: Number(row.answered_count),
          created_at: row.created_at,
          recommendations: [],
        });
      }

      if (row.history_id !== null) {
        historyMap.get(resultId).recommendations.push({
          history_id: Number(row.history_id),
          rank_order: Number(row.rank_order),
          match_score: Number(row.match_score),
          breed_id: Number(row.breed_id),
          breed_name: row.breed_name,
          description: row.description,
          image_url: row.image_url,
        });
      }
    }

    const history = Array.from(historyMap.values());

    return res.status(200).json({
      success: true,
      user: req.user,
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