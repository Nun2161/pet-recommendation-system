const rateLimit = require("express-rate-limit");

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "เข้าสู่ระบบผิดพลาดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่",
  },
});

module.exports = loginRateLimit;
