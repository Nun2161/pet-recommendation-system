const express = require("express");

const {
  getAllBreeds,
  getBreedById,
} = require("../controllers/breedController");

const router = express.Router();

/*
GET /api/breeds
*/
router.get("/", getAllBreeds);

/*
GET /api/breeds/:id
*/
router.get("/:id", getBreedById);

module.exports = router;