const db = require("../config/db");

/**
 * GET /api/farm/adoptions
 * ฟาร์มดูคำขออุปการะที่ส่งเข้ามา
 */
const getFarmAdoptionRequests = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);

    const [rows] = await db.query(
      `
        SELECT
          ar.request_id,
          ar.status,
          ar.request_date,
          ar.updated_at,

          u.user_id,
          u.name AS user_name,
          u.email AS user_email,
          u.phone AS user_phone,
          u.address AS user_address,

          a.animal_id,
          a.animal_name,
          a.age_months,
          a.gender,
          a.color,
          a.status AS animal_status,
          a.image_url,

          b.breed_id,
          b.breed_name

        FROM adoption_request AS ar

        INNER JOIN users AS u
          ON u.user_id = ar.user_id

        INNER JOIN animal AS a
          ON a.animal_id = ar.animal_id

        INNER JOIN breed AS b
          ON b.breed_id = a.breed_id

        WHERE a.farm_id = ?
          AND ar.managed_by = ?

        ORDER BY
          ar.request_date DESC,
          ar.request_id DESC
      `,
      [farmId, farmId]
    );

    const requests = rows.map((row) => ({
      ...row,
      request_id: Number(row.request_id),
      user_id: Number(row.user_id),
      animal_id: Number(row.animal_id),
      breed_id: Number(row.breed_id),
      age_months:
        row.age_months === null
          ? null
          : Number(row.age_months),
    }));

    return res.status(200).json({
      success: true,
      total: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get farm adoption requests error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงคำขออุปการะของฟาร์มได้",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/farm/adoptions/:id/status
 *
 * Body:
 * {
 *   "status": "approved"
 * }
 *
 * รองรับ approved และ rejected
 */
const updateFarmAdoptionStatus = async (req, res) => {
  let connection;

  try {
    const farmId = Number(req.farm.farm_id);
    const requestId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "request_id ไม่ถูกต้อง",
      });
    }

    const allowedStatuses = ["approved", "rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status ต้องเป็น approved หรือ rejected",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [requestRows] = await connection.query(
      `
        SELECT
          ar.request_id,
          ar.user_id,
          ar.animal_id,
          ar.status,
          ar.managed_by,
          a.farm_id,
          a.status AS animal_status
        FROM adoption_request AS ar
        INNER JOIN animal AS a
          ON a.animal_id = ar.animal_id
        WHERE ar.request_id = ?
          AND ar.managed_by = ?
          AND a.farm_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [requestId, farmId, farmId]
    );

    if (requestRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "ไม่พบคำขออุปการะนี้ในฟาร์มของคุณ",
      });
    }

    const adoptionRequest = requestRows[0];

    if (adoptionRequest.status !== "pending") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "คำขอนี้ได้รับการจัดการแล้ว",
        current_status: adoptionRequest.status,
      });
    }

    if (
      status === "approved" &&
      adoptionRequest.animal_status !== "available"
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "สัตว์ตัวนี้ไม่พร้อมสำหรับการอนุมัติ",
        animal_status: adoptionRequest.animal_status,
      });
    }

    await connection.query(
      `
        UPDATE adoption_request
        SET status = ?
        WHERE request_id = ?
          AND managed_by = ?
      `,
      [status, requestId, farmId]
    );

    if (status === "approved") {
      await connection.query(
        `
          UPDATE animal
          SET status = 'adopted'
          WHERE animal_id = ?
            AND farm_id = ?
        `,
        [adoptionRequest.animal_id, farmId]
      );

      await connection.query(
        `
          UPDATE adoption_request
          SET status = 'rejected'
          WHERE animal_id = ?
            AND request_id <> ?
            AND status = 'pending'
        `,
        [
          adoptionRequest.animal_id,
          requestId,
        ]
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "อนุมัติคำขออุปการะสำเร็จ"
          : "ปฏิเสธคำขออุปการะสำเร็จ",
      request_id: requestId,
      status,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback farm adoption error:",
          rollbackError.message
        );
      }
    }

    console.error("Update farm adoption status error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถอัปเดตสถานะคำขออุปการะได้",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  getFarmAdoptionRequests,
  updateFarmAdoptionStatus,
};