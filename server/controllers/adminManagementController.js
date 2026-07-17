const db = require("../config/db");

/**
 * GET /api/admin/users
 */
const getAllUsersForAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        user_id,
        name,
        email,
        phone,
        address,
        latitude,
        longitude,
        status,
        created_at,
        updated_at
      FROM users
      ORDER BY user_id DESC
    `);

    const users = rows.map((user) => ({
      ...user,
      user_id: Number(user.user_id),
      latitude:
        user.latitude === null
          ? null
          : Number(user.latitude),
      longitude:
        user.longitude === null
          ? null
          : Number(user.longitude),
    }));

    return res.status(200).json({
      success: true,
      total: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Admin get users error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลผู้ใช้ได้",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/users/:id/status
 *
 * Body:
 * {
 *   "status": "inactive"
 * }
 */
const updateUserStatusByAdmin = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "user_id ไม่ถูกต้อง",
      });
    }

    const allowedStatuses = ["active", "inactive"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status ต้องเป็น active หรือ inactive",
      });
    }

    const [result] = await db.query(
      `
        UPDATE users
        SET status = ?
        WHERE user_id = ?
      `,
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบผู้ใช้",
      });
    }

    return res.status(200).json({
      success: true,
      message: "อัปเดตสถานะผู้ใช้สำเร็จ",
      user_id: userId,
      status,
    });
  } catch (error) {
    console.error("Admin update user status error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถอัปเดตสถานะผู้ใช้ได้",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/farms
 */
const getAllFarmsForAdmin = async (req, res) => {
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
        certificate_no,
        certificate_file,
        status,
        approved_by,
        approved_at,
        created_at,
        updated_at
      FROM farm
      ORDER BY farm_id DESC
    `);

    const farms = rows.map((farm) => ({
      ...farm,
      farm_id: Number(farm.farm_id),
      approved_by:
        farm.approved_by === null
          ? null
          : Number(farm.approved_by),
      latitude:
        farm.latitude === null
          ? null
          : Number(farm.latitude),
      longitude:
        farm.longitude === null
          ? null
          : Number(farm.longitude),
    }));

    return res.status(200).json({
      success: true,
      total: farms.length,
      data: farms,
    });
  } catch (error) {
    console.error("Admin get farms error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลฟาร์มได้",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/farms/:id/status
 *
 * Body:
 * {
 *   "status": "approved"
 * }
 */
const updateFarmStatusByAdmin = async (req, res) => {
  try {
    const farmId = Number(req.params.id);
    const adminId = Number(req.admin.admin_id);
    const { status } = req.body;

    if (!Number.isInteger(farmId) || farmId <= 0) {
      return res.status(400).json({
        success: false,
        message: "farm_id ไม่ถูกต้อง",
      });
    }

    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
      "inactive",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "status ต้องเป็น pending, approved, rejected หรือ inactive",
      });
    }

    const approvedBy =
      status === "approved" ? adminId : null;

    const approvedAt =
      status === "approved" ? new Date() : null;

    const [result] = await db.query(
      `
        UPDATE farm
        SET
          status = ?,
          approved_by = ?,
          approved_at = ?
        WHERE farm_id = ?
      `,
      [
        status,
        approvedBy,
        approvedAt,
        farmId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบฟาร์ม",
      });
    }

    return res.status(200).json({
      success: true,
      message: "อัปเดตสถานะฟาร์มสำเร็จ",
      farm_id: farmId,
      status,
      approved_by: approvedBy,
      approved_at: approvedAt,
    });
  } catch (error) {
    console.error("Admin update farm status error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถอัปเดตสถานะฟาร์มได้",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsersForAdmin,
  updateUserStatusByAdmin,
  getAllFarmsForAdmin,
  updateFarmStatusByAdmin,
};