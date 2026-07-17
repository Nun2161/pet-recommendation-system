const express = require("express");

const {
  createAdoptionRequest,
  getMyAdoptionRequests
} = require("../controllers/adoptionController");

const {
  authenticateUser
} = require("../middleware/auth");

const router = express.Router();

router.post(
  "/",
  authenticateUser,
  createAdoptionRequest
);

router.get(
  "/my",
  authenticateUser,
  getMyAdoptionRequests
);

module.exports = router;