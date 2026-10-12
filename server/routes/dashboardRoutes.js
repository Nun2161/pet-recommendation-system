const express = require("express");

const {
  getAdminDashboardStats,
} = require("../controllers/dashboardController");

const {
  authenticateAdmin,
} = require("../middleware/adminAuth");

const router = express.Router();

/*
 * สถิติสำหรับหน้าแรก
 * เปิดให้ผู้ใช้ทั่วไปอ่านได้ เพราะมีเฉพาะตัวเลขรวม
 */
router.get(
  "/dashboard/stats",
  getAdminDashboardStats
);

/*
 * สถิติสำหรับหน้าแอดมิน
 */
router.get(
  "/admin/dashboard/stats",
  authenticateAdmin,
  getAdminDashboardStats
);

module.exports = router;