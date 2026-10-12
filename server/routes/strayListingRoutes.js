"use strict";

const express = require("express");
const userAuth = require("../middleware/userAuth");
const { listMine, createListing, updateListing, updateMyStatus } = require("../controllers/strayListingController");

const router = express.Router();
router.get("/mine", userAuth, listMine);
router.post("/", userAuth, createListing);
router.patch("/:id/status", userAuth, updateMyStatus);
router.patch("/:id", userAuth, updateListing);

module.exports = router;
