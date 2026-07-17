const express = require("express");

const {
  getAllFarms,
  getFarmById,
  getFarmsByBreed,
} = require("../controllers/farmController");

const router = express.Router();

router.get("/farms", getAllFarms);
router.get("/farms/:id", getFarmById);
router.get(
  "/breeds/:breedId/farms",
  getFarmsByBreed
);

module.exports = router;