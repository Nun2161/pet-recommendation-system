const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const createFarmToken = (farm) => {
  return jwt.sign(
    {
      farm_id: Number(farm.farm_id),
      email: farm.email,
      role: "farm",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const loginFarm = async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    if (
      !cleanEmail ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          farm_id,
          farm_name,
          owner_name,
          email,
          password,
          phone,
          address,
          latitude,
          longitude,
          status,
          approved_at,
          created_at
        FROM farm
        WHERE email = ?
        LIMIT 1
      `,
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const farm = rows[0];

    if (farm.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "บัญชีฟาร์มยังไม่ได้รับการอนุมัติ",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      farm.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const token = createFarmToken(farm);

    return res.status(200).json({
      success: true,
      message: "เข้าสู่ระบบฟาร์มสำเร็จ",
      token,
      farm: {
        farm_id: Number(farm.farm_id),
        farm_name: farm.farm_name,
        owner_name: farm.owner_name,
        email: farm.email,
        phone: farm.phone,
        address: farm.address,
        latitude:
          farm.latitude === null
            ? null
            : Number(farm.latitude),
        longitude:
          farm.longitude === null
            ? null
            : Number(farm.longitude),
        status: farm.status,
        approved_at: farm.approved_at,
        created_at: farm.created_at,
      },
    });
  } catch (error) {
    console.error("Farm login error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถเข้าสู่ระบบฟาร์มได้",
      error: error.message,
    });
  }
};

module.exports = {
  loginFarm,
};