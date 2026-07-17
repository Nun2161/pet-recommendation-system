const db = require("../config/db");

/**
 * GET /api/farms
 * ดึงฟาร์มทั้งหมด
 */
const getAllFarms = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        farm_id,
        farm_name,
        owner_name,
        email,
        phone,
        address,
        latitude,
        longitude,
        status,
        approved_at,
        created_at
      FROM farm
      WHERE status = 'approved'
      ORDER BY farm_name ASC
    `);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows,
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }
};

/**
 * GET /api/farms/:id
 * ดูรายละเอียดฟาร์ม
 */
const getFarmById = async (req, res) => {
  try {

    const { id } = req.params;

    const [farmRows] = await db.query(
      `
      SELECT
        farm_id,
        farm_name,
        owner_name,
        email,
        phone,
        address,
        latitude,
        longitude,
        status,
        approved_at,
        created_at
      FROM farm
      WHERE farm_id = ?
      LIMIT 1
      `,
      [id]
    );

    if (farmRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลฟาร์ม",
      });
    }

    const [animalRows] = await db.query(
      `
      SELECT
        a.animal_id,
        a.animal_name,
        a.age_months,
        a.gender,
        a.color,
        a.description,
        a.status,
        a.image_url,
        b.breed_id,
        b.breed_name
      FROM animal a
      INNER JOIN breed b
        ON a.breed_id = b.breed_id
      WHERE a.farm_id = ?
      ORDER BY a.animal_id ASC
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...farmRows[0],
        animals: animalRows,
      },
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }
};

/**
 * GET /api/breeds/:breedId/farms
 * ฟาร์มที่มีสายพันธุ์นี้
 */
const getFarmsByBreed = async (req, res) => {
  try {

    const { breedId } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        f.farm_id,
        f.farm_name,
        f.owner_name,
        f.phone,
        f.address,
        f.latitude,
        f.longitude,
        a.animal_name,
        b.breed_name
      FROM animal a
      INNER JOIN farm f
        ON a.farm_id = f.farm_id
      INNER JOIN breed b
        ON a.breed_id = b.breed_id
      WHERE
        a.breed_id = ?
        AND a.status = 'available'
        AND f.status = 'approved'
      `,
      [breedId]
    );

    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }
};

module.exports = {
  getAllFarms,
  getFarmById,
  getFarmsByBreed,
};