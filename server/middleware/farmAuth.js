const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authenticateFarm = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "กรุณาเข้าสู่ระบบฟาร์ม",
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

    if (
      decoded.role !== "farm" ||
      !decoded.farm_id
    ) {
      return res.status(401).json({
        success: false,
        message: "Token ของฟาร์มไม่ถูกต้อง",
      });
    }

    const farmId = Number(decoded.farm_id);

    if (!Number.isInteger(farmId) || farmId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Token ของฟาร์มไม่ถูกต้อง",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          farm_id,
          farm_name,
          owner_name,
          email,
          status
        FROM farm
        WHERE farm_id = ?
        LIMIT 1
      `,
      [farmId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบข้อมูลฟาร์ม",
      });
    }

    const farm = rows[0];

    if (farm.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "บัญชีฟาร์มไม่สามารถใช้งานได้",
      });
    }

    req.farm = {
      farm_id: Number(farm.farm_id),
      farm_name: farm.farm_name,
      owner_name: farm.owner_name,
      email: farm.email,
    };

    next();
  } catch (error) {
    console.error(
      "Farm authentication error:",
      error.message
    );

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token ของฟาร์มไม่ถูกต้อง",
    });
  }
};

module.exports = {
  authenticateFarm,
};