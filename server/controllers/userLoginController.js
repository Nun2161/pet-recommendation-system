const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const normalizeIdentifier = (value) => String(value || "").trim();

const loginUser = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(
      req.body?.identifier || req.body?.email || req.body?.username
    );
    const password = String(req.body?.password || "");

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมลหรือชื่อผู้ใช้งานและรหัสผ่าน",
      });
    }

    if (password.length !== 10) {
      return res.status(401).json({
        success: false,
        message: "อีเมล ชื่อผู้ใช้งาน หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const normalizedIdentifier = identifier.toLowerCase();

    const [rows] = await db.query(
      `
        SELECT
          user_id,
          name,
          username,
          email,
          password,
          phone,
          status,
          created_at,
          updated_at,
          onboarding_completed,
          auth_version
        FROM users
        WHERE LOWER(email) = ?
           OR LOWER(username) = ?
        LIMIT 1
      `,
      [normalizedIdentifier, normalizedIdentifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "อีเมล ชื่อผู้ใช้งาน หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const user = rows[0];

    if (String(user.status || "active").toLowerCase() !== "active") {
      return res.status(403).json({
        success: false,
        message: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "อีเมล ชื่อผู้ใช้งาน หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from .env");
      return res.status(500).json({
        success: false,
        message: "ระบบเข้าสู่ระบบยังตั้งค่าไม่สมบูรณ์",
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        role: "user",
        auth_version: Number(user.auth_version || 0),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        onboarding_completed: Boolean(Number(user.onboarding_completed)),
        needs_interest_onboarding: Number(user.onboarding_completed) === 0,
      },
      needs_interest_onboarding: Number(user.onboarding_completed) === 0,
    });
  } catch (error) {
    console.error("User login error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
};

module.exports = { loginUser };
