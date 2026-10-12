const db = require("../config/db");
const { normalizeSpecies } = require("../utils/species");
const {
  ensureAssessmentSetup,
} = require("../services/assessmentSetupService");

const {
  calculateRecommendations,
} = require("../services/recommendationService");

const SCORE_COLUMNS = {
  friendly: "friendly_score",
  affectionate: "affectionate_score",
  playful: "playful_score",
  independence: "independence_score",
  trainability: "trainability_score",
  protective: "protective_score",
  adaptability: "adaptability_score",
  sociability: "sociability_score",
  activity_level: "activity_level_score",
  exercise_need: "exercise_need_score",
  outdoor_preference: "outdoor_preference_score",
  apartment_suitability: "apartment_suitability_score",
  family_friendly: "family_friendly_score",
  child_friendly: "child_friendly_score",
  first_time_owner_friendly: "first_time_owner_friendly_score",
  grooming_need: "grooming_need_score",
  shedding_level: "shedding_level_score",
  noise_level: "noise_level_score",
  heat_tolerance: "heat_tolerance_score",
  cold_tolerance: "cold_tolerance_score",
};

/**
 * GET /api/questions
 * ดึงคำถามพร้อมตัวเลือก
 */
const getQuestions = async (req, res) => {
  try {
    const species = normalizeSpecies(
      req.query.species ?? "cat"
    );

    if (!species) {
      return res.status(400).json({
        success: false,
        message: "species ต้องเป็น cat หรือ dog",
      });
    }

    const setupReady = await ensureAssessmentSetup();
    let rows = [];

    try {
      [rows] = await db.query(
        `
          SELECT
            q.question_id,
            q.question_text,
            q.category,
            q.question_order,
            o.option_id,
            o.option_text,
            o.score_value,
            o.option_order
          FROM assessment_question AS q
          LEFT JOIN answer_option AS o
            ON q.question_id = o.question_id
          WHERE q.status = 'active'
            AND COALESCE(NULLIF(q.species, ''), 'cat') = ?
          ORDER BY q.question_order ASC, o.option_order ASC
        `,
        [species]
      );
    } catch (error) {
      // ฐานข้อมูลรุ่นเก่าที่ยังไม่มี species ต้องยังใช้แบบประเมินแมว
      // และประวัติเดิมได้ ไม่ควรทำให้ระบบแมวเดิมหายไป
      if (species !== "cat" || error?.code !== "ER_BAD_FIELD_ERROR") {
        throw error;
      }

      [rows] = await db.query(`
        SELECT
          q.question_id,
          q.question_text,
          q.category,
          q.question_order,
          o.option_id,
          o.option_text,
          o.score_value,
          o.option_order
        FROM assessment_question AS q
        LEFT JOIN answer_option AS o
          ON q.question_id = o.question_id
        WHERE q.status = 'active'
        ORDER BY q.question_order ASC, o.option_order ASC
      `);
    }

    const questionMap = new Map();

    for (const row of rows) {
      if (!questionMap.has(row.question_id)) {
        questionMap.set(row.question_id, {
          question_id: Number(row.question_id),
          question_text: row.question_text,
          category: row.category,
          question_order: Number(row.question_order),
          options: [],
        });
      }

      if (row.option_id !== null) {
        questionMap.get(row.question_id).options.push({
          option_id: Number(row.option_id),
          option_text: row.option_text,
          score_value: Number(row.score_value),
          option_order: Number(row.option_order),
        });
      }
    }

    const questions = Array.from(questionMap.values());

    if (!questions.length) {
      return res.status(setupReady ? 404 : 503).json({
        success: false,
        message: setupReady
          ? `ยังไม่มีคำถาม${species === "dog" ? "สุนัข" : "แมว"}ที่เปิดใช้งาน`
          : "ฐานข้อมูลแบบประเมินยังเตรียมไม่สำเร็จ กรุณาตรวจว่า MySQL เปิดอยู่",
      });
    }

    return res.status(200).json({
      success: true,
      species,
      total_questions: questions.length,
      data: questions,
    });
  } catch (error) {
    console.error("Get questions error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลคำถามได้",
      error: error.message,
    });
  }
};

/**
 * POST /api/assessment/submit
 *
 * Body:
 * {
 *   "user_id": 1,
 *   "answers": [
 *     {
 *       "question_id": 1,
 *       "option_id": 3
 *     }
 *   ]
 * }
 */
const submitAssessment = async (req, res) => {
  let connection;

  try {
    await ensureAssessmentSetup({ force: true });

    const { user_id, answers } = req.body;
    const species = normalizeSpecies(
      req.body?.species ?? req.query?.species ?? "cat"
    );

    if (!species) {
      return res.status(400).json({
        success: false,
        message: "species ต้องเป็น cat หรือ dog",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 1. ตรวจข้อมูลเบื้องต้น
    |--------------------------------------------------------------------------
    */

    const parsedUserId = Number(user_id);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "user_id ไม่ถูกต้อง",
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "answers ต้องเป็น Array",
      });
    }

    if (answers.length !== 100) {
      return res.status(400).json({
        success: false,
        message: "ต้องตอบคำถามให้ครบ 100 ข้อ",
        answered_count: answers.length,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. ตรวจว่ามี question_id ซ้ำหรือไม่
    |--------------------------------------------------------------------------
    */

    const questionIds = answers.map((answer) =>
      Number(answer.question_id)
    );

    const uniqueQuestionIds = new Set(questionIds);

    if (uniqueQuestionIds.size !== 100) {
      return res.status(400).json({
        success: false,
        message: "พบคำถามซ้ำ หรือมีคำถามบางข้อหายไป",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. ตรวจรูปแบบ question_id และ option_id
    |--------------------------------------------------------------------------
    */

    for (const answer of answers) {
      const questionId = Number(answer.question_id);
      const optionId = Number(answer.option_id);

      if (
        !Number.isInteger(questionId) ||
        questionId <= 0 ||
        !Number.isInteger(optionId) ||
        optionId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "question_id หรือ option_id ไม่ถูกต้อง",
          invalid_answer: answer,
        });
      }
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    /*
    |--------------------------------------------------------------------------
    | 4. ตรวจว่าผู้ใช้มีจริง
    |--------------------------------------------------------------------------
    */

    const [userRows] = await connection.query(
      `
        SELECT user_id
        FROM users
        WHERE user_id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [parsedUserId]
    );

    if (userRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "ไม่พบผู้ใช้ หรือบัญชีผู้ใช้ไม่ active",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 5. ดึงข้อมูลตัวเลือกที่ผู้ใช้เลือก
    |--------------------------------------------------------------------------
    */

    const optionIds = answers.map((answer) =>
      Number(answer.option_id)
    );

    const optionPlaceholders = optionIds.map(() => "?").join(",");

    const [selectedOptions] = await connection.query(
      `
        SELECT
          o.option_id,
          o.question_id,
          o.score_value,
          q.category
        FROM answer_option AS o
        INNER JOIN assessment_question AS q
          ON q.question_id = o.question_id
        WHERE o.option_id IN (${optionPlaceholders})
          AND q.status = 'active'
          AND q.species = ?
      `,
      [...optionIds, species]
    );

    if (selectedOptions.length !== 100) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "มี option_id ที่ไม่ถูกต้อง หรือข้อมูลคำตอบไม่ครบ",
        valid_options_found: selectedOptions.length,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 6. ตรวจว่า option_id เป็นตัวเลือกของ question_id จริง
    |--------------------------------------------------------------------------
    */

    const optionMap = new Map();

    for (const option of selectedOptions) {
      optionMap.set(Number(option.option_id), option);
    }

    const validatedAnswers = [];

    for (const answer of answers) {
      const questionId = Number(answer.question_id);
      const optionId = Number(answer.option_id);
      const selectedOption = optionMap.get(optionId);

      if (
        !selectedOption ||
        Number(selectedOption.question_id) !== questionId
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "พบ option_id ที่ไม่ได้อยู่ใน question_id ที่ระบุ",
          invalid_answer: answer,
        });
      }

      validatedAnswers.push({
        question_id: questionId,
        option_id: optionId,
        score_value: Number(selectedOption.score_value),
        category: selectedOption.category,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 7. รวมคะแนนตามหมวด
    |--------------------------------------------------------------------------
    */

    const categoryTotals = {};

    for (const category of Object.keys(SCORE_COLUMNS)) {
      categoryTotals[category] = {
        total: 0,
        count: 0,
      };
    }

    for (const answer of validatedAnswers) {
      if (!categoryTotals[answer.category]) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: `พบ category ที่ระบบไม่รองรับ: ${answer.category}`,
        });
      }

      categoryTotals[answer.category].total +=
        answer.score_value;

      categoryTotals[answer.category].count += 1;
    }

    /*
    |--------------------------------------------------------------------------
    | 8. คำนวณค่าเฉลี่ยแต่ละหมวด
    |--------------------------------------------------------------------------
    */

    const categoryScores = {};

    for (const category of Object.keys(SCORE_COLUMNS)) {
      const { total, count } = categoryTotals[category];

      if (count !== 5) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: `หมวด ${category} ต้องมีคำตอบ 5 ข้อ`,
          current_count: count,
        });
      }

      categoryScores[category] = Number(
        (total / count).toFixed(2)
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 9. บันทึก assessment_result
    |--------------------------------------------------------------------------
    */

    const scoreColumnNames = Object.values(SCORE_COLUMNS);
    const categories = Object.keys(SCORE_COLUMNS);

    const resultColumns = [
      "user_id",
      "species",
      ...scoreColumnNames,
      "answered_count",
    ];

    const resultValues = [
      parsedUserId,
      species,
      ...categories.map(
        (category) => categoryScores[category]
      ),
      validatedAnswers.length,
    ];

    const resultPlaceholders = resultValues
      .map(() => "?")
      .join(",");

    const [resultInsert] = await connection.query(
      `
        INSERT INTO assessment_result (
          ${resultColumns.join(",")}
        )
        VALUES (${resultPlaceholders})
      `,
      resultValues
    );

    const resultId = resultInsert.insertId;

    /*
    |--------------------------------------------------------------------------
    | 10. บันทึกคำตอบ 100 ข้อลง user_answer
    |--------------------------------------------------------------------------
    */

    const userAnswerValues = validatedAnswers.map((answer) => [
      resultId,
      answer.question_id,
      answer.option_id,
      answer.score_value,
    ]);

    const userAnswerPlaceholders = userAnswerValues
      .map(() => "(?,?,?,?)")
      .join(",");

    const flattenedUserAnswerValues =
      userAnswerValues.flat();

    await connection.query(
      `
        INSERT INTO user_answer (
          result_id,
          question_id,
          option_id,
          awarded_score
        )
        VALUES ${userAnswerPlaceholders}
      `,
      flattenedUserAnswerValues
    );
    const recommendations = await calculateRecommendations(
      connection,
      resultId,
      parsedUserId,
      categoryScores,
      species
    );

    await connection.commit();

    /*
    |--------------------------------------------------------------------------
    | 11. ส่งผลลัพธ์กลับ
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message: "บันทึกและคำนวณผลแบบประเมินสำเร็จ",
      result_id: resultId,
      user_id: parsedUserId,
      species,
      answered_count: validatedAnswers.length,
      scores: categoryScores,
      recommendations,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError.message
        );
      }
    }

    console.error("Submit assessment error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถบันทึกผลแบบประเมินได้",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
const getRecommendations = async (req, res) => {
  try {
    await ensureAssessmentSetup();

    const resultId = Number(req.params.resultId);

    if (!Number.isInteger(resultId) || resultId <= 0) {
      return res.status(400).json({
        success: false,
        message: "result_id ไม่ถูกต้อง",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          rh.history_id,
          rh.result_id,
          rh.rank_order,
          rh.match_score,
          ar.species,
          b.breed_id,
          b.breed_name,
          b.description,
          b.image_url
        FROM recommendation_history AS rh
        INNER JOIN assessment_result AS ar
          ON ar.result_id = rh.result_id
        INNER JOIN breed AS b
          ON rh.breed_id = b.breed_id
         AND COALESCE(NULLIF(b.species, ''), 'cat') =
             COALESCE(NULLIF(ar.species, ''), 'cat')
        WHERE rh.result_id = ?
        ORDER BY rh.rank_order ASC
      `,
      [resultId]
    );

    const data = rows.map((row) => ({
      ...row,
      breed_id: Number(row.breed_id),
      history_id: Number(row.history_id),
      result_id: Number(row.result_id),
      rank_order: Number(row.rank_order),
      match_score: Number(row.match_score),
    }));

    return res.json({
      success: true,
      species: data[0]?.species || null,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงผลลัพธ์ได้",
    });
  }
};

module.exports = {
  getQuestions,
  submitAssessment,
  getRecommendations,
};