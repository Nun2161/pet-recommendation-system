const db = require("../config/db");

/*
POST /api/adoptions

Body
{
    "animal_id":2
}
*/

const createAdoptionRequest = async (req, res) => {
  try {

    const { animal_id } = req.body;
    const user_id = Number(req.user.user_id);

    if (!animal_id) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุ animal_id"
      });
    }

    // ตรวจสอบว่าสัตว์มีอยู่จริง
    const [animals] = await db.query(
      `
      SELECT
      animal_id,
      farm_id,
      status
      FROM animal
      WHERE animal_id=?
      `,
      [animal_id]
    );

    if (animals.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสัตว์"
      });
    }

    const animal = animals[0];

    if (animal.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "สัตว์ตัวนี้ไม่พร้อมอุปการะ"
      });
    }

    // ตรวจสอบว่าผู้ใช้เคยส่งคำขอแล้วหรือยัง
    const [exists] = await db.query(
      `
      SELECT request_id
      FROM adoption_request
      WHERE
      user_id=?
      AND animal_id=?
      AND status='pending'
      `,
      [user_id, animal_id]
    );

    if (exists.length > 0) {
      return res.status(400).json({
        success: false,
        message: "คุณส่งคำขอแล้ว"
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO adoption_request
      (
        user_id,
        animal_id,
        managed_by,
        status
      )
      VALUES
      (?,?,?,'pending')
      `,
      [
        user_id,
        animal_id,
        animal.farm_id
      ]
    );

    return res.status(201).json({
      success: true,
      message: "ส่งคำขออุปการะสำเร็จ",
      request_id: result.insertId
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};

/*
GET /api/adoptions/my
*/

const getMyAdoptionRequests = async (req, res) => {

  try {

    const user_id = Number(req.user.user_id);

    const [rows] = await db.query(
      `
      SELECT

      ar.request_id,
      ar.status,
      ar.request_date,
      ar.updated_at,

      a.animal_id,
      a.animal_name,
      a.age_months,
      a.gender,
      a.color,
      a.image_url,

      b.breed_id,
      b.breed_name,

      f.farm_id,
      f.farm_name,
      f.phone,
      f.address

      FROM adoption_request ar

      INNER JOIN animal a
      ON ar.animal_id=a.animal_id

      INNER JOIN breed b
      ON a.breed_id=b.breed_id

      INNER JOIN farm f
      ON a.farm_id=f.farm_id

      WHERE ar.user_id=?

      ORDER BY ar.request_date DESC
      `,
      [user_id]
    );

    return res.json({
      success: true,
      total: rows.length,
      data: rows
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};

module.exports = {
  createAdoptionRequest,
  getMyAdoptionRequests
};