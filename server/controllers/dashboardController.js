const db = require("../config/db");

/**
 * GET /api/admin/dashboard/stats
 */
const getAdminDashboardStats = async (req, res) => {
  try {
    const [[userStats]] = await db.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(status = 'active') AS active_users,
        SUM(status = 'inactive') AS inactive_users
      FROM users
    `);

    const [[farmStats]] = await db.query(`
      SELECT
        COUNT(*) AS total_farms,
        SUM(status = 'pending') AS pending_farms,
        SUM(status = 'approved') AS approved_farms,
        SUM(status = 'rejected') AS rejected_farms,
        SUM(status = 'inactive') AS inactive_farms
      FROM farm
    `);

    const [[animalStats]] = await db.query(`
      SELECT
        COUNT(*) AS total_animals,
        SUM(status = 'available') AS available_animals,
        SUM(status = 'reserved') AS reserved_animals,
        SUM(status = 'adopted') AS adopted_animals,
        SUM(status = 'inactive') AS inactive_animals
      FROM animal
    `);

    const [[adoptionStats]] = await db.query(`
      SELECT
        COUNT(*) AS total_adoption_requests,
        SUM(status = 'pending') AS pending_requests,
        SUM(status = 'approved') AS approved_requests,
        SUM(status = 'rejected') AS rejected_requests,
        SUM(status = 'cancelled') AS cancelled_requests
      FROM adoption_request
    `);

    const [[assessmentStats]] = await db.query(`
      SELECT
        COUNT(*) AS total_assessments
      FROM assessment_result
    `);

    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: Number(userStats.total_users),
          active: Number(userStats.active_users || 0),
          inactive: Number(userStats.inactive_users || 0),
        },
        farms: {
          total: Number(farmStats.total_farms),
          pending: Number(farmStats.pending_farms || 0),
          approved: Number(farmStats.approved_farms || 0),
          rejected: Number(farmStats.rejected_farms || 0),
          inactive: Number(farmStats.inactive_farms || 0),
        },
        animals: {
          total: Number(animalStats.total_animals),
          available: Number(animalStats.available_animals || 0),
          reserved: Number(animalStats.reserved_animals || 0),
          adopted: Number(animalStats.adopted_animals || 0),
          inactive: Number(animalStats.inactive_animals || 0),
        },
        adoptions: {
          total: Number(adoptionStats.total_adoption_requests),
          pending: Number(adoptionStats.pending_requests || 0),
          approved: Number(adoptionStats.approved_requests || 0),
          rejected: Number(adoptionStats.rejected_requests || 0),
          cancelled: Number(adoptionStats.cancelled_requests || 0),
        },
        assessments: {
          total: Number(assessmentStats.total_assessments),
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลสถิติของผู้ดูแลได้",
      error: error.message,
    });
  }
};

module.exports = {
  getAdminDashboardStats,
};