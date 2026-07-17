const express = require("express");

const {
  getAdminDashboardStats,
} = require("../controllers/dashboardController");

const {
  authenticateAdmin,
} = require("../middleware/adminAuth");

const router = express.Router();

router.get(
  "/admin/dashboard/stats",
  authenticateAdmin,
  getAdminDashboardStats
);

module.exports = router;