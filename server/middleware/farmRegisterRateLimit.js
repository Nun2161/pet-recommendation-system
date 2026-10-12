"use strict";

const rateLimit = require("express-rate-limit");

/**
 * ระหว่างพัฒนาในเครื่อง ไม่จำกัดจำนวนครั้ง เพื่อให้ทดสอบฟอร์มได้ต่อเนื่อง
 * เมื่อขึ้น Production ระบบยังใช้ Rate Limit ตามเดิม
 */
function isLocalDevelopmentRequest(req) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const hostname = String(req.hostname || "")
    .trim()
    .toLowerCase();

  const remoteAddress = String(
    req.ip || req.socket?.remoteAddress || ""
  ).toLowerCase();

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

function createJsonLimiter({
  windowMs,
  limit,
  message,
  skip,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: typeof skip === "function" ? skip : undefined,
    handler: (_req, res) => {
      return res.status(429).json({
        success: false,
        message,
      });
    },
  });
}

const farmRegistrationLimiter = createJsonLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  skip: isLocalDevelopmentRequest,
  message:
    "ส่งคำขอลงทะเบียนฟาร์มบ่อยเกินไป กรุณารอ 1 ชั่วโมงแล้วลองใหม่",
});

const farmAvailabilityLimiter = createJsonLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 40,
  skip: isLocalDevelopmentRequest,
  message:
    "ตรวจสอบข้อมูลฟาร์มบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
});

module.exports = {
  farmRegistrationLimiter,
  farmAvailabilityLimiter,
};
