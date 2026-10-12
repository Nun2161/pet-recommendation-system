const express = require("express");
const userAuth = require("../middleware/userAuth");
const {
  passwordResetRequestLimiter,
  passwordResetStatusLimiter,
  passwordResetSubmitLimiter,
} = require("../middleware/passwordResetRateLimit");
const {
  submitPasswordResetRequest,
  getPasswordResetStatus,
  getPasswordResetInfo,
  resetPassword,
  generateRecoveryCode,
} = require("../controllers/passwordResetController");

const router = express.Router();

router.post(
  "/request",
  passwordResetRequestLimiter,
  submitPasswordResetRequest
);
router.get("/requests/:requestCode/status", passwordResetStatusLimiter, getPasswordResetStatus);
router.get(
  "/reset-info",
  passwordResetStatusLimiter,
  getPasswordResetInfo
);
router.post("/reset", passwordResetSubmitLimiter, resetPassword);
router.post("/recovery-code", userAuth, generateRecoveryCode);

module.exports = router;
