"use strict";

const express = require("express");

const {
  getMyFavorites,
  addFavorite,
  removeFavorite
} = require(
  "../controllers/favoriteController"
);

const {
  authenticateUser
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticateUser);

/*
 * GET /api/favorites
 * ดูรายการโปรดของบัญชีที่ล็อกอิน
 */
router.get(
  "/",
  getMyFavorites
);

/*
 * POST /api/favorites
 * Body: { breed_id: 1 }
 */
router.post(
  "/",
  addFavorite
);

/*
 * DELETE /api/favorites/:breedId
 */
router.delete(
  "/:breedId",
  removeFavorite
);

module.exports = router;