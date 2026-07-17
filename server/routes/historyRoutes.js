const express = require("express");

const {
  getMyHistory,
} = require("../controllers/historyController");

const {
  authenticateUser,
} = require("../middleware/auth");

const router = express.Router();

/*
GET /api/history
ต้องส่ง JWT Token
*/
router.get("/", authenticateUser, getMyHistory);

module.exports = router;