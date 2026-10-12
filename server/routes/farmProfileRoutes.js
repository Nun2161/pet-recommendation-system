"use strict";

const express = require("express");
const {
  getMyFarmProfile,
  updateMyFarmLocation,
  updateMyFarmProfileImage,
  deleteMyFarmProfileImage,
} = require("../controllers/farmProfileController");
const { authenticateFarm } = require("../middleware/farmAuth");

const router = express.Router();

router.get("/profile", authenticateFarm, getMyFarmProfile);
router.put("/profile/location", authenticateFarm, updateMyFarmLocation);
router.put("/profile/image", authenticateFarm, updateMyFarmProfileImage);
router.delete("/profile/image", authenticateFarm, deleteMyFarmProfileImage);

module.exports = router;
