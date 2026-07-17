const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authenticateUser = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    const token = authorizationHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบ Token",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = Number(decoded.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Token ไม่ถูกต้อง",
      });
    }

    const [users] = await db.query(
      `
        SELECT
          user_id,
          name,
          email,
          status
        FROM users
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบผู้ใช้",
      });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "บัญชีนี้ไม่สามารถใช้งานได้",
      });
    }

    req.user = {
      user_id: Number(user.user_id),
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token ไม่ถูกต้อง",
    });
  }
};

module.exports = {
  authenticateUser,
};