"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  subscribeNewsletter,
} = require("../controllers/newsletterController");

const router = express.Router();

const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "ส่งคำขอหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",
  },
});

router.post(
  "/subscribe",
  newsletterLimiter,
  subscribeNewsletter
);

module.exports = router;
