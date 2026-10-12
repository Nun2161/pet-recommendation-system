"use strict";

const db = require("../config/db");

function normalizeBreedId(value) {
  const breedId = Number(value);

  return Number.isInteger(breedId) && breedId > 0
    ? breedId
    : 0;
}

async function selectFavoriteBreed(userId, breedId) {
  const [rows] = await db.query(
    `
      SELECT
        f.favorite_id,
        f.created_at AS favorited_at,

        b.breed_id,
        b.breed_name,
        b.friendly,
        b.affectionate,
        b.playful,
        b.independence,
        b.trainability,
        b.protective,
        b.adaptability,
        b.sociability,
        b.activity_level,
        b.exercise_need,
        b.outdoor_preference,
        b.apartment_suitability,
        b.family_friendly,
        b.child_friendly,
        b.first_time_owner_friendly,
        b.grooming_need,
        b.shedding_level,
        b.noise_level,
        b.heat_tolerance,
        b.cold_tolerance,
        b.description,
        b.image_url,
        b.status

      FROM favorites AS f

      INNER JOIN breed AS b
        ON b.breed_id = f.breed_id

      WHERE f.user_id = ?
        AND f.breed_id = ?
        AND b.status = 'active'

      LIMIT 1
    `,
    [userId, breedId]
  );

  return rows[0] || null;
}

async function getMyFavorites(req, res) {
  try {
    const userId = Number(req.user.user_id);

    const [rows] = await db.query(
      `
        SELECT
          f.favorite_id,
          f.created_at AS favorited_at,

          b.breed_id,
          b.breed_name,
          b.friendly,
          b.affectionate,
          b.playful,
          b.independence,
          b.trainability,
          b.protective,
          b.adaptability,
          b.sociability,
          b.activity_level,
          b.exercise_need,
          b.outdoor_preference,
          b.apartment_suitability,
          b.family_friendly,
          b.child_friendly,
          b.first_time_owner_friendly,
          b.grooming_need,
          b.shedding_level,
          b.noise_level,
          b.heat_tolerance,
          b.cold_tolerance,
          b.description,
          b.image_url,
          b.status

        FROM favorites AS f

        INNER JOIN breed AS b
          ON b.breed_id = f.breed_id

        WHERE f.user_id = ?
          AND b.status = 'active'

        ORDER BY f.created_at DESC
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error(
      "Get favorites error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถโหลดแมวที่ถูกใจได้"
    });
  }
}

async function addFavorite(req, res) {
  try {
    const userId = Number(req.user.user_id);
    const breedId = normalizeBreedId(
      req.body?.breed_id
    );

    if (!breedId) {
      return res.status(400).json({
        success: false,
        message: "รหัสสายพันธุ์ไม่ถูกต้อง"
      });
    }

    const [breeds] = await db.query(
      `
        SELECT breed_id
        FROM breed
        WHERE breed_id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [breedId]
    );

    if (!breeds.length) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสายพันธุ์แมวนี้"
      });
    }

    await db.query(
      `
        INSERT INTO favorites (
          user_id,
          breed_id
        )
        VALUES (?, ?)

        ON DUPLICATE KEY UPDATE
          breed_id = VALUES(breed_id)
      `,
      [userId, breedId]
    );

    const favorite =
      await selectFavoriteBreed(
        userId,
        breedId
      );

    return res.status(200).json({
      success: true,
      message: "เพิ่มในแมวที่ถูกใจแล้ว",
      data: favorite
    });
  } catch (error) {
    console.error(
      "Add favorite error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถบันทึกแมวที่ถูกใจได้"
    });
  }
}

async function removeFavorite(req, res) {
  try {
    const userId = Number(req.user.user_id);
    const breedId = normalizeBreedId(
      req.params.breedId
    );

    if (!breedId) {
      return res.status(400).json({
        success: false,
        message: "รหัสสายพันธุ์ไม่ถูกต้อง"
      });
    }

    await db.query(
      `
        DELETE FROM favorites
        WHERE user_id = ?
          AND breed_id = ?
      `,
      [userId, breedId]
    );

    return res.status(200).json({
      success: true,
      message: "นำออกจากแมวที่ถูกใจแล้ว"
    });
  } catch (error) {
    console.error(
      "Remove favorite error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถนำแมวออกจากรายการโปรดได้"
    });
  }
}

module.exports = {
  getMyFavorites,
  addFavorite,
  removeFavorite
};