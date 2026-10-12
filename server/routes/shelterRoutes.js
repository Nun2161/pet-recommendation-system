"use strict";

const express = require("express");
const { listAnimals, getAnimal } = require("../controllers/shelterController");

const router = express.Router();
router.get("/animals", listAnimals);
router.get("/animals/:id", getAnimal);

module.exports = router;
