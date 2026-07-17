const rateLimit = require("express-rate-limit");

const createJsonLimiter = ({ windowMs, limit, message }) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      return res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

const registrationLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "ส่งคำขอสมัครสมาชิกบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่",
});

const availabilityLimiter = createJsonLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 40,
  message: "ตรวจสอบข้อมูลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
});

module.exports = {
  registrationLimiter,
  availabilityLimiter,
};
