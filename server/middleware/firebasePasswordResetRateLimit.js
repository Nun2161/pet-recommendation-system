"use strict";

const { rateLimit } = require("express-rate-limit");

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "ส่งคำขอหลายครั้งเกินไป กรุณารอประมาณ 15 นาทีแล้วลองใหม่",
  },
});