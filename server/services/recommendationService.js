"use strict";

const { normalizeSpecies } = require("../utils/species");

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

const WEIGHT_COLUMNS = Object.fromEntries(
  Object.keys(BREED_COLUMNS).map((category) => [
    category,
    `${category}_weight`,
  ])
);

/**
 * คำนวณสายพันธุ์ที่เหมาะสม Top 3 โดยแยกข้อมูล cat/dog
 */
const calculateRecommendations = async (
  connection,
  resultId,
  userId,
  categoryScores,
  requestedSpecies = "cat"
) => {
  const species = normalizeSpecies(requestedSpecies);

  if (!species) {
    throw new Error("species ต้องเป็น cat หรือ dog");
  }

  const [weightRows] = await connection.query(
    `
      SELECT *
      FROM weight_criteria
      WHERE species = ?
      ORDER BY weight_id DESC
      LIMIT 1
    `,
    [species]
  );

  if (weightRows.length === 0) {
    throw new Error(
      `ไม่พบข้อมูลค่าน้ำหนักสำหรับ ${species}`
    );
  }

  const weights = weightRows[0];
  const categories = Object.keys(BREED_COLUMNS);
  let totalWeight = 0;

  for (const category of categories) {
    const weightColumn = WEIGHT_COLUMNS[category];
    const weightValue = Number(weights[weightColumn]);

    if (!Number.isFinite(weightValue) || weightValue < 0) {
      throw new Error(`ค่าน้ำหนัก ${weightColumn} ไม่ถูกต้อง`);
    }

    totalWeight += weightValue;
  }

  if (totalWeight <= 0) {
    throw new Error("ผลรวมค่าน้ำหนักต้องมากกว่า 0");
  }

  const [breeds] = await connection.query(
    `
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
        image_url,
        species
      FROM breed
      WHERE status = 'active'
        AND species = ?
    `,
    [species]
  );

  if (breeds.length === 0) {
    throw new Error(
      `ไม่พบข้อมูลสายพันธุ์ ${species} ที่ active`
    );
  }

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
        throw new Error(`คะแนนผู้ใช้หมวด ${category} ไม่ถูกต้อง`);
      }

      if (!Number.isFinite(breedScore)) {
        throw new Error(
          `คะแนน ${breedColumn} ของ ${breed.breed_name} ไม่ถูกต้อง`
        );
      }

      const normalizedWeight = rawWeight / totalWeight;
      const difference = Math.abs(userScore - breedScore);
      const similarity = Math.max(0, 1 - difference / 4);

      weightedScore += similarity * normalizedWeight;

      traitMatches[category] = {
        user_score: userScore,
        breed_score: breedScore,
        similarity_percent: Number(
          (similarity * 100).toFixed(2)
        ),
        weight: Number(normalizedWeight.toFixed(4)),
      };
    }

    return {
      breed_id: Number(breed.breed_id),
      breed_name: breed.breed_name,
      species,
      match_score: Number((weightedScore * 100).toFixed(2)),
      description: breed.description,
      image_url: breed.image_url,
      trait_matches: traitMatches,
    };
  });

  breedResults.sort((firstBreed, secondBreed) => {
    if (secondBreed.match_score !== firstBreed.match_score) {
      return secondBreed.match_score - firstBreed.match_score;
    }

    return firstBreed.breed_id - secondBreed.breed_id;
  });

  const topThree = breedResults
    .slice(0, 3)
    .map((breed, index) => ({
      ...breed,
      rank_order: index + 1,
    }));

  const recommendationValues = topThree.map((breed) => [
    userId,
    resultId,
    breed.breed_id,
    breed.match_score,
    breed.rank_order,
    species,
  ]);

  const placeholders = recommendationValues
    .map(() => "(?,?,?,?,?,?)")
    .join(",");

  await connection.query(
    `
      INSERT INTO recommendation_history (
        user_id,
        result_id,
        breed_id,
        match_score,
        rank_order,
        species
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
