"use strict";

const express = require("express");
const {
  registerFarm,
  checkFarmAvailability,
  getMyFarmRegistrationStatus,
} = require("../controllers/farmRegisterController");
const {
  farmRegistrationLimiter,
  farmAvailabilityLimiter,
} = require("../middleware/farmRegisterRateLimit");

const router = express.Router();

router.get("/status", getMyFarmRegistrationStatus);
router.post("/", farmRegistrationLimiter, registerFarm);
router.post("/check-availability", farmAvailabilityLimiter, checkFarmAvailability);

module.exports = router;
