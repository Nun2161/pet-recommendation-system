const jwt = require("jsonwebtoken");
const db = require("../config/db");

const userAuth = async (req, res, next) => {
  try {
    const authorization = String(req.headers.authorization || "");
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "ระบบยืนยันตัวตนยังตั้งค่าไม่สมบูรณ์",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.user_id || decoded?.role !== "user") {
      return res.status(401).json({
        success: false,
        message: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง",
      });
    }

    const [rows] = await db.query(
      `SELECT user_id, status, auth_version FROM users WHERE user_id = ? LIMIT 1`,
      [decoded.user_id]
    );
    const user = rows[0];

    if (!user || String(user.status || "active").toLowerCase() !== "active") {
      return res.status(401).json({
        success: false,
        message: "บัญชีนี้ไม่สามารถใช้งานได้",
      });
    }

    if (Number(decoded.auth_version || 0) !== Number(user.auth_version || 0)) {
      return res.status(401).json({
        success: false,
        message: "เซสชันนี้ถูกยกเลิก กรุณาเข้าสู่ระบบใหม่",
      });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error?.name === "TokenExpiredError"
        ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
        : "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง",
    });
  }
};

module.exports = userAuth;
