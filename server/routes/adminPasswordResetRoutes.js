const express = require("express");

const {
  authenticateAdmin,
} = require("../middleware/adminAuth");

const {
  listPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
} = require("../controllers/adminPasswordResetController");

const router = express.Router();

// ทุกเส้นทางด้านล่างต้องผ่านการตรวจสอบสิทธิ์ผู้ดูแลระบบ
router.use(authenticateAdmin);

// GET /api/admin/password-resets?status=pending
router.get("/", listPasswordResetRequests);

// PATCH /api/admin/password-resets/:requestId/approve
router.patch(
  "/:requestId/approve",
  approvePasswordResetRequest
);

// PATCH /api/admin/password-resets/:requestId/reject
router.patch(
  "/:requestId/reject",
  rejectPasswordResetRequest
);

module.exports = router;
