const db = require("../config/db");

/**
 * GET /api/farm/animals
 */
const getMyAnimals = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);

    const [rows] = await db.query(
      `
        SELECT
          a.animal_id,
          a.farm_id,
          a.breed_id,
          a.animal_name,
          a.age_months,
          a.gender,
          a.color,
          a.description,
          a.status,
          a.image_url,
          a.created_at,
          a.updated_at,
          b.breed_name
        FROM animal AS a
        INNER JOIN breed AS b
          ON b.breed_id = a.breed_id
        WHERE a.farm_id = ?
        ORDER BY a.animal_id DESC
      `,
      [farmId]
    );

    const animals = rows.map((animal) => ({
      ...animal,
      animal_id: Number(animal.animal_id),
      farm_id: Number(animal.farm_id),
      breed_id: Number(animal.breed_id),
      age_months:
        animal.age_months === null
          ? null
          : Number(animal.age_months),
    }));

    return res.status(200).json({
      success: true,
      total: animals.length,
      data: animals,
    });
  } catch (error) {
    console.error("Get farm animals error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลสัตว์ของฟาร์มได้",
      error: error.message,
    });
  }
};

/**
 * POST /api/farm/animals
 */
const createAnimal = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);

    const {
      breed_id,
      animal_name,
      age_months = null,
      gender = null,
      color = null,
      description = null,
      status = "available",
      image_url = null,
    } = req.body;

    const breedId = Number(breed_id);
    const cleanName =
      typeof animal_name === "string"
        ? animal_name.trim()
        : "";

    if (!Number.isInteger(breedId) || breedId <= 0) {
      return res.status(400).json({
        success: false,
        message: "breed_id ไม่ถูกต้อง",
      });
    }

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกชื่อสัตว์",
      });
    }

    const allowedStatuses = ["available", "adopted"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status ต้องเป็น available หรือ adopted",
      });
    }

    const [breedRows] = await db.query(
      `
        SELECT breed_id
        FROM breed
        WHERE breed_id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [breedId]
    );

    if (breedRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสายพันธุ์นี้",
      });
    }

    const [insertResult] = await db.query(
      `
        INSERT INTO animal (
          farm_id,
          breed_id,
          animal_name,
          age_months,
          gender,
          color,
          description,
          status,
          image_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        farmId,
        breedId,
        cleanName,
        age_months === null ? null : Number(age_months),
        gender || null,
        color || null,
        description || null,
        status,
        image_url || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "เพิ่มข้อมูลสัตว์สำเร็จ",
      animal_id: Number(insertResult.insertId),
    });
  } catch (error) {
    console.error("Create animal error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถเพิ่มข้อมูลสัตว์ได้",
      error: error.message,
    });
  }
};

/**
 * PUT /api/farm/animals/:id
 */
const updateAnimal = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);
    const animalId = Number(req.params.id);

    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "animal_id ไม่ถูกต้อง",
      });
    }

    const {
      breed_id,
      animal_name,
      age_months = null,
      gender = null,
      color = null,
      description = null,
      image_url = null,
    } = req.body;

    const breedId = Number(breed_id);
    const cleanName =
      typeof animal_name === "string"
        ? animal_name.trim()
        : "";

    if (!Number.isInteger(breedId) || breedId <= 0) {
      return res.status(400).json({
        success: false,
        message: "breed_id ไม่ถูกต้อง",
      });
    }

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกชื่อสัตว์",
      });
    }

    const [animalRows] = await db.query(
      `
        SELECT animal_id
        FROM animal
        WHERE animal_id = ?
          AND farm_id = ?
        LIMIT 1
      `,
      [animalId, farmId]
    );

    if (animalRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสัตว์นี้ในฟาร์มของคุณ",
      });
    }

    const [breedRows] = await db.query(
      `
        SELECT breed_id
        FROM breed
        WHERE breed_id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [breedId]
    );

    if (breedRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสายพันธุ์นี้",
      });
    }

    await db.query(
      `
        UPDATE animal
        SET
          breed_id = ?,
          animal_name = ?,
          age_months = ?,
          gender = ?,
          color = ?,
          description = ?,
          image_url = ?
        WHERE animal_id = ?
          AND farm_id = ?
      `,
      [
        breedId,
        cleanName,
        age_months === null ? null : Number(age_months),
        gender || null,
        color || null,
        description || null,
        image_url || null,
        animalId,
        farmId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "แก้ไขข้อมูลสัตว์สำเร็จ",
    });
  } catch (error) {
    console.error("Update animal error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถแก้ไขข้อมูลสัตว์ได้",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/farm/animals/:id/status
 */
const updateAnimalStatus = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);
    const animalId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = ["available", "adopted"];

    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "animal_id ไม่ถูกต้อง",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status ต้องเป็น available หรือ adopted",
      });
    }

    const [result] = await db.query(
      `
        UPDATE animal
        SET status = ?
        WHERE animal_id = ?
          AND farm_id = ?
      `,
      [status, animalId, farmId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสัตว์นี้ในฟาร์มของคุณ",
      });
    }

    return res.status(200).json({
      success: true,
      message: "เปลี่ยนสถานะสัตว์สำเร็จ",
    });
  } catch (error) {
    console.error("Update animal status error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถเปลี่ยนสถานะสัตว์ได้",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/farm/animals/:id
 */
const deleteAnimal = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);
    const animalId = Number(req.params.id);

    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "animal_id ไม่ถูกต้อง",
      });
    }

    const [result] = await db.query(
      `
        DELETE FROM animal
        WHERE animal_id = ?
          AND farm_id = ?
      `,
      [animalId, farmId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสัตว์นี้ในฟาร์มของคุณ",
      });
    }

    return res.status(200).json({
      success: true,
      message: "ลบข้อมูลสัตว์สำเร็จ",
    });
  } catch (error) {
    console.error("Delete animal error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถลบข้อมูลสัตว์ได้",
      error: error.message,
    });
  }
};

module.exports = {
  getMyAnimals,
  createAnimal,
  updateAnimal,
  updateAnimalStatus,
  deleteAnimal,
};