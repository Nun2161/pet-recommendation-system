const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authenticateAdmin = async (req, res, next) => {
  try {
    const authorization = String(
      req.headers.authorization || ""
    ).trim();

    const [scheme, token] = authorization.split(/\s+/);

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "กรุณาเข้าสู่ระบบผู้ดูแลระบบ",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "ระบบยืนยันตัวตนยังตั้งค่าไม่สมบูรณ์",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ",
      });
    }

    const adminId = Number(decoded.admin_id);

    if (!Number.isInteger(adminId) || adminId <= 0) {
      return res.status(401).json({
        success: false,
        message: "ข้อมูลเข้าสู่ระบบผู้ดูแลไม่ถูกต้อง",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          admin_id,
          name,
          email,
          status
        FROM admin
        WHERE admin_id = ?
        LIMIT 1
      `,
      [adminId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบผู้ดูแลระบบ",
      });
    }

    const admin = rows[0];

    if (admin.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "บัญชีผู้ดูแลไม่สามารถใช้งานได้",
      });
    }

    req.admin = {
      admin_id: Number(admin.admin_id),
      name: admin.name,
      email: admin.email,
      role: "admin",
    };

    return next();
  } catch (error) {
    console.error(
      "Admin authentication error:",
      error.message
    );

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token ของผู้ดูแลไม่ถูกต้อง",
      });
    }

    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ผู้ดูแล",
    });
  }
};

module.exports = {
  authenticateAdmin,
};
