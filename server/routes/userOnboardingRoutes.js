"use strict";

const express = require("express");
const userAuth = require("../middleware/userAuth");
const {
  getGoogleProfileOnboarding,
  checkGoogleProfileAvailability,
  completeGoogleProfileOnboarding,
  getOnboardingStatus,
  completeInterestOnboarding,
} = require("../controllers/userOnboardingController");

const router = express.Router();

router.get("/onboarding/google-profile", userAuth, getGoogleProfileOnboarding);
router.post("/onboarding/google-profile/check-availability", userAuth, checkGoogleProfileAvailability);
router.post("/onboarding/google-profile", userAuth, completeGoogleProfileOnboarding);

router.get("/onboarding", userAuth, getOnboardingStatus);
router.post("/onboarding/interests", userAuth, completeInterestOnboarding);

module.exports = router;
