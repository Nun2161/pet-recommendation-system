const express = require("express");

const {
  loginAdmin,
} = require("../controllers/adminAuthController");

const router = express.Router();

router.post("/login", loginAdmin);

module.exports = router;