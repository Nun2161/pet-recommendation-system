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
  resetPassword,
  generateRecoveryCode,
} = require("../controllers/passwordResetController");

const router = express.Router();

router.post("/requests", passwordResetRequestLimiter, submitPasswordResetRequest);
router.get("/requests/:requestCode/status", passwordResetStatusLimiter, getPasswordResetStatus);
router.post("/reset", passwordResetSubmitLimiter, resetPassword);
router.post("/recovery-code", userAuth, generateRecoveryCode);

module.exports = router;
