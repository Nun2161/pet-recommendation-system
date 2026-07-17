const express = require("express");

const {
  getAllUsersForAdmin,
  updateUserStatusByAdmin,
  getAllFarmsForAdmin,
  updateFarmStatusByAdmin,
} = require("../controllers/adminManagementController");

const {
  authenticateAdmin,
} = require("../middleware/adminAuth");

const router = express.Router();

router.get(
  "/users",
  authenticateAdmin,
  getAllUsersForAdmin
);

router.patch(
  "/users/:id/status",
  authenticateAdmin,
  updateUserStatusByAdmin
);

router.get(
  "/farms",
  authenticateAdmin,
  getAllFarmsForAdmin
);

router.patch(
  "/farms/:id/status",
  authenticateAdmin,
  updateFarmStatusByAdmin
);

module.exports = router;