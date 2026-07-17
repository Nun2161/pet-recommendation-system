const BREED_COLUMNS = {
  friendly: "friendly",
  affectionate: "affectionate",
  playful: "playful",
  independence: "independence",
  trainability: "trainability",
  protective: "protective",
  adaptability: "adaptability",
  sociability: "sociability",
  activity_level: "activity_level",
  exercise_need: "exercise_need",
  outdoor_preference: "outdoor_preference",
  apartment_suitability: "apartment_suitability",
  family_friendly: "family_friendly",
  child_friendly: "child_friendly",
  first_time_owner_friendly: "first_time_owner_friendly",
  grooming_need: "grooming_need",
  shedding_level: "shedding_level",
  noise_level: "noise_level",
  heat_tolerance: "heat_tolerance",
  cold_tolerance: "cold_tolerance",
};

const WEIGHT_COLUMNS = {
  friendly: "friendly_weight",
  affectionate: "affectionate_weight",
  playful: "playful_weight",
  independence: "independence_weight",
  trainability: "trainability_weight",
  protective: "protective_weight",
  adaptability: "adaptability_weight",
  sociability: "sociability_weight",
  activity_level: "activity_level_weight",
  exercise_need: "exercise_need_weight",
  outdoor_preference: "outdoor_preference_weight",
  apartment_suitability: "apartment_suitability_weight",
  family_friendly: "family_friendly_weight",
  child_friendly: "child_friendly_weight",
  first_time_owner_friendly: "first_time_owner_friendly_weight",
  grooming_need: "grooming_need_weight",
  shedding_level: "shedding_level_weight",
  noise_level: "noise_level_weight",
  heat_tolerance: "heat_tolerance_weight",
  cold_tolerance: "cold_tolerance_weight",
};

/**
 * คำนวณสายพันธุ์แมวที่เหมาะสม Top 3
 *
 * @param {object} connection MySQL connection ใน transaction
 * @param {number} resultId รหัสผลแบบประเมิน
 * @param {number} userId รหัสผู้ใช้
 * @param {object} categoryScores คะแนนผู้ใช้ครบ 20 ด้าน
 * @returns {Promise<Array>} รายการสายพันธุ์ Top 3
 */
const calculateRecommendations = async (
  connection,
  resultId,
  userId,
  categoryScores
) => {
  /*
  |--------------------------------------------------------------------------
  | 1. ดึงค่าน้ำหนักล่าสุด
  |--------------------------------------------------------------------------
  */

  const [weightRows] = await connection.query(`
    SELECT *
    FROM weight_criteria
    ORDER BY weight_id DESC
    LIMIT 1
  `);

  if (weightRows.length === 0) {
    throw new Error(
      "ไม่พบข้อมูลค่าน้ำหนักในตาราง weight_criteria"
    );
  }

  const weights = weightRows[0];
  const categories = Object.keys(BREED_COLUMNS);

  /*
  |--------------------------------------------------------------------------
  | 2. ตรวจและรวมค่าน้ำหนัก
  |--------------------------------------------------------------------------
  */

  let totalWeight = 0;

  for (const category of categories) {
    const weightColumn = WEIGHT_COLUMNS[category];
    const weightValue = Number(weights[weightColumn]);

    if (!Number.isFinite(weightValue) || weightValue < 0) {
      throw new Error(
        `ค่าน้ำหนัก ${weightColumn} ไม่ถูกต้อง`
      );
    }

    totalWeight += weightValue;
  }

  if (totalWeight <= 0) {
    throw new Error("ผลรวมค่าน้ำหนักต้องมากกว่า 0");
  }

  /*
  |--------------------------------------------------------------------------
  | 3. ดึงสายพันธุ์แมวที่ active
  |--------------------------------------------------------------------------
  */

  const [breeds] = await connection.query(`
    SELECT
      breed_id,
      breed_name,
      friendly,
      affectionate,
      playful,
      independence,
      trainability,
      protective,
      adaptability,
      sociability,
      activity_level,
      exercise_need,
      outdoor_preference,
      apartment_suitability,
      family_friendly,
      child_friendly,
      first_time_owner_friendly,
      grooming_need,
      shedding_level,
      noise_level,
      heat_tolerance,
      cold_tolerance,
      description,
      image_url
    FROM breed
    WHERE status = 'active'
  `);

  if (breeds.length === 0) {
    throw new Error("ไม่พบข้อมูลสายพันธุ์แมวที่ active");
  }

  /*
  |--------------------------------------------------------------------------
  | 4. คำนวณ Match Score ทุกสายพันธุ์
  |--------------------------------------------------------------------------
  */

  const breedResults = breeds.map((breed) => {
    let weightedScore = 0;
    const traitMatches = {};

    for (const category of categories) {
      const breedColumn = BREED_COLUMNS[category];
      const weightColumn = WEIGHT_COLUMNS[category];

      const userScore = Number(categoryScores[category]);
      const breedScore = Number(breed[breedColumn]);
      const rawWeight = Number(weights[weightColumn]);

      if (!Number.isFinite(userScore)) {
        throw new Error(
          `คะแนนผู้ใช้หมวด ${category} ไม่ถูกต้อง`
        );
      }

      if (!Number.isFinite(breedScore)) {
        throw new Error(
          `คะแนน ${breedColumn} ของ ${breed.breed_name} ไม่ถูกต้อง`
        );
      }

      const normalizedWeight = rawWeight / totalWeight;

      const difference = Math.abs(
        userScore - breedScore
      );

      /*
      คะแนนอยู่ช่วง 1–5
      ส่วนต่างสูงสุดคือ 4
      */
      const similarity = Math.max(
        0,
        1 - difference / 4
      );

      weightedScore += similarity * normalizedWeight;

      traitMatches[category] = {
        user_score: userScore,
        breed_score: breedScore,
        similarity_percent: Number(
          (similarity * 100).toFixed(2)
        ),
        weight: Number(
          normalizedWeight.toFixed(4)
        ),
      };
    }

    return {
      breed_id: Number(breed.breed_id),
      breed_name: breed.breed_name,
      match_score: Number(
        (weightedScore * 100).toFixed(2)
      ),
      description: breed.description,
      image_url: breed.image_url,
      trait_matches: traitMatches,
    };
  });

  /*
  |--------------------------------------------------------------------------
  | 5. เรียงคะแนนและเลือก Top 3
  |--------------------------------------------------------------------------
  */

  breedResults.sort((firstBreed, secondBreed) => {
    if (
      secondBreed.match_score !==
      firstBreed.match_score
    ) {
      return (
        secondBreed.match_score -
        firstBreed.match_score
      );
    }

    return firstBreed.breed_id - secondBreed.breed_id;
  });

  const topThree = breedResults
    .slice(0, 3)
    .map((breed, index) => ({
      ...breed,
      rank_order: index + 1,
    }));

  /*
  |--------------------------------------------------------------------------
  | 6. บันทึก Top 3
  |--------------------------------------------------------------------------
  */

  const recommendationValues = topThree.map(
    (breed) => [
      userId,
      resultId,
      breed.breed_id,
      breed.match_score,
      breed.rank_order,
    ]
  );

  const placeholders = recommendationValues
    .map(() => "(?,?,?,?,?)")
    .join(",");

  await connection.query(
    `
      INSERT INTO recommendation_history (
        user_id,
        result_id,
        breed_id,
        match_score,
        rank_order
      )
      VALUES ${placeholders}
    `,
    recommendationValues.flat()
  );

  return topThree;
};

module.exports = {
  calculateRecommendations,
};