const express = require("express");

const {
  registerUser,
  checkAvailability,
} = require("../controllers/userRegisterController");

const {
  registrationLimiter,
  availabilityLimiter,
} = require("../middleware/registerRateLimit");

const router = express.Router();

router.post("/register", registrationLimiter, registerUser);
router.post("/check-availability", availabilityLimiter, checkAvailability);

module.exports = router;
