const express = require("express");

const {
  getMyAnimals,
  createAnimal,
  updateAnimal,
  updateAnimalStatus,
  deleteAnimal,
} = require("../controllers/farmAnimalController");

const {
  authenticateFarm,
} = require("../middleware/farmAuth");

const router = express.Router();

/*
GET /api/farm/animals
*/
router.get(
  "/animals",
  authenticateFarm,
  getMyAnimals
);

/*
POST /api/farm/animals
*/
router.post(
  "/animals",
  authenticateFarm,
  createAnimal
);

/*
PUT /api/farm/animals/:id
*/
router.put(
  "/animals/:id",
  authenticateFarm,
  updateAnimal
);

/*
PATCH /api/farm/animals/:id/status
*/
router.patch(
  "/animals/:id/status",
  authenticateFarm,
  updateAnimalStatus
);

/*
DELETE /api/farm/animals/:id
*/
router.delete(
  "/animals/:id",
  authenticateFarm,
  deleteAnimal
);

module.exports = router;