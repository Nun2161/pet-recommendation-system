const express = require("express");

const {
  loginFarm,
} = require("../controllers/farmAuthController");

const router = express.Router();

router.post("/login", loginFarm);

module.exports = router;
