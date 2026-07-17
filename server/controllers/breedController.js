const db = require("../config/db");

/**
 * GET /api/breeds
 *
 * Query ที่รองรับ:
 * ?search=British
 * ?limit=20
 * ?page=1
 */
const getAllBreeds = async (req, res) => {
  try {
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

    const conditions = ["status = 'active'"];
    const params = [];

    if (search) {
      conditions.push("breed_name LIKE ?");
      params.push(`%${search}%`);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM breed
        WHERE ${whereClause}
      `,
      params
    );

    const total = Number(countRows[0].total);

    const [rows] = await db.query(
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
          status
        FROM breed
        WHERE ${whereClause}
        ORDER BY breed_name ASC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const breeds = rows.map((breed) => ({
      ...breed,

      breed_id: Number(breed.breed_id),

      friendly: Number(breed.friendly),
      affectionate: Number(breed.affectionate),
      playful: Number(breed.playful),
      independence: Number(breed.independence),
      trainability: Number(breed.trainability),
      protective: Number(breed.protective),
      adaptability: Number(breed.adaptability),
      sociability: Number(breed.sociability),
      activity_level: Number(breed.activity_level),
      exercise_need: Number(breed.exercise_need),
      outdoor_preference: Number(
        breed.outdoor_preference
      ),
      apartment_suitability: Number(
        breed.apartment_suitability
      ),
      family_friendly: Number(
        breed.family_friendly
      ),
      child_friendly: Number(
        breed.child_friendly
      ),
      first_time_owner_friendly: Number(
        breed.first_time_owner_friendly
      ),
      grooming_need: Number(breed.grooming_need),
      shedding_level: Number(breed.shedding_level),
      noise_level: Number(breed.noise_level),
      heat_tolerance: Number(breed.heat_tolerance),
      cold_tolerance: Number(breed.cold_tolerance),
    }));

    const totalPages =
      total === 0 ? 0 : Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      total_pages: totalPages,
      data: breeds,
    });
  } catch (error) {
    console.error("Get all breeds error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลสายพันธุ์ได้",
      error: error.message,
    });
  }
};

/**
 * GET /api/breeds/:id
 */
const getBreedById = async (req, res) => {
  try {
    const breedId = Number(req.params.id);

    if (!Number.isInteger(breedId) || breedId <= 0) {
      return res.status(400).json({
        success: false,
        message: "breed_id ไม่ถูกต้อง",
      });
    }

    const [rows] = await db.query(
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
          status
        FROM breed
        WHERE breed_id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [breedId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลสายพันธุ์นี้",
      });
    }

    const row = rows[0];

    const breed = {
      ...row,

      breed_id: Number(row.breed_id),

      friendly: Number(row.friendly),
      affectionate: Number(row.affectionate),
      playful: Number(row.playful),
      independence: Number(row.independence),
      trainability: Number(row.trainability),
      protective: Number(row.protective),
      adaptability: Number(row.adaptability),
      sociability: Number(row.sociability),
      activity_level: Number(row.activity_level),
      exercise_need: Number(row.exercise_need),
      outdoor_preference: Number(
        row.outdoor_preference
      ),
      apartment_suitability: Number(
        row.apartment_suitability
      ),
      family_friendly: Number(
        row.family_friendly
      ),
      child_friendly: Number(row.child_friendly),
      first_time_owner_friendly: Number(
        row.first_time_owner_friendly
      ),
      grooming_need: Number(row.grooming_need),
      shedding_level: Number(row.shedding_level),
      noise_level: Number(row.noise_level),
      heat_tolerance: Number(row.heat_tolerance),
      cold_tolerance: Number(row.cold_tolerance),
    };

    return res.status(200).json({
      success: true,
      data: breed,
    });
  } catch (error) {
    console.error("Get breed by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงรายละเอียดสายพันธุ์ได้",
      error: error.message,
    });
  }
};

module.exports = {
  getAllBreeds,
  getBreedById,
};