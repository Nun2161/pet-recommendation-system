const rateLimit = require("express-rate-limit");

const jsonHandler = (req, res) => {
  return res.status(429).json({
    success: false,
    message: "มีการทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
  });
};

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler,
});

const passwordResetStatusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler,
});

const passwordResetSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler,
});

module.exports = {
  passwordResetRequestLimiter,
  passwordResetStatusLimiter,
  passwordResetSubmitLimiter,
};
