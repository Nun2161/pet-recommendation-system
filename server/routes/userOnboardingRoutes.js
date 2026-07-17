const express = require("express");
const userAuth = require("../middleware/userAuth");
const {
  getOnboardingStatus,
  completeInterestOnboarding,
} = require("../controllers/userOnboardingController");

const router = express.Router();

router.get("/onboarding", userAuth, getOnboardingStatus);
router.post("/onboarding/interests", userAuth, completeInterestOnboarding);

module.exports = router;
