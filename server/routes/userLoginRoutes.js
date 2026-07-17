const express = require("express");
const { loginUser } = require("../controllers/userLoginController");
const loginRateLimit = require("../middleware/loginRateLimit");

const router = express.Router();

router.post("/login", loginRateLimit, loginUser);

module.exports = router;
