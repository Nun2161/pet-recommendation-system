"use strict";

const express = require("express");
const {
  firebaseSession,
} = require("../controllers/firebaseAuthController");
const {
  requestPasswordReset,
} = require("../controllers/firebasePasswordResetController");

const loginRateLimit =
  require("../middleware/loginRateLimit");
const passwordResetRateLimit =
  require("../middleware/firebasePasswordResetRateLimit");

const router = express.Router();

router.post(
  "/firebase/session",
  loginRateLimit,
  firebaseSession
);

router.post(
  "/password-reset/request",
  passwordResetRateLimit,
  requestPasswordReset
);

module.exports = router;