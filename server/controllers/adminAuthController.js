const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const createAdminToken = (admin) => {
  return jwt.sign(
    {
      admin_id: Number(admin.admin_id),
      email: admin.email,
      role: "admin",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

/**
 * POST /api/admin/auth/login
 *
 * Body:
 * {
 *   "email": "admin@example.com",
 *   "password": "12345678"
 * }
 */
const loginAdmin = async (req, res) => {
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
          admin_id,
          name,
          email,
          password,
          status,
          created_at
        FROM admin
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

    const admin = rows[0];

    if (admin.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "บัญชีผู้ดูแลระบบไม่สามารถใช้งานได้",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      admin.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const token = createAdminToken(admin);

    return res.status(200).json({
      success: true,
      message: "เข้าสู่ระบบผู้ดูแลสำเร็จ",
      token,
      admin: {
        admin_id: Number(admin.admin_id),
        name: admin.name,
        email: admin.email,
        status: admin.status,
        created_at: admin.created_at,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถเข้าสู่ระบบผู้ดูแลได้",
      error: error.message,
    });
  }
};

module.exports = {
  loginAdmin,
};