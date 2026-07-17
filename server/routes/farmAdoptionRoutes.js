const express = require("express");

const {
  getFarmAdoptionRequests,
  updateFarmAdoptionStatus,
} = require("../controllers/farmAdoptionController");

const {
  authenticateFarm,
} = require("../middleware/farmAuth");

const router = express.Router();

/*
GET /api/farm/adoptions
*/
router.get(
  "/adoptions",
  authenticateFarm,
  getFarmAdoptionRequests
);

/*
PATCH /api/farm/adoptions/:id/status
*/
router.patch(
  "/adoptions/:id/status",
  authenticateFarm,
  updateFarmAdoptionStatus
);

module.exports = router;