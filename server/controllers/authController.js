const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

/**
 * สร้าง JWT Token
 */
const createToken = (user) => {
  return jwt.sign(
    {
      user_id: Number(user.user_id),
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

/**
 * POST /api/auth/register
 *
 * Body:
 * {
 *   "name": "Test User",
 *   "email": "test2@example.com",
 *   "password": "12345678",
 *   "phone": "0812345678",
 *   "address": "Bangkok"
 * }
 */
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone = null,
      address = null,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | 1. ตรวจข้อมูลที่จำเป็น
    |--------------------------------------------------------------------------
    */

    const cleanName =
      typeof name === "string" ? name.trim() : "";

    const cleanEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกชื่อ",
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมล",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. ตรวจรูปแบบอีเมล
    |--------------------------------------------------------------------------
    */

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "รูปแบบอีเมลไม่ถูกต้อง",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. ตรวจว่าอีเมลถูกใช้แล้วหรือยัง
    |--------------------------------------------------------------------------
    */

    const [existingUsers] = await db.query(
      `
        SELECT user_id
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. เข้ารหัสรหัสผ่าน
    |--------------------------------------------------------------------------
    */

    const saltRounds = 12;

    const hashedPassword = await bcrypt.hash(
      password,
      saltRounds
    );

    /*
    |--------------------------------------------------------------------------
    | 5. บันทึกผู้ใช้
    |--------------------------------------------------------------------------
    */

    const [insertResult] = await db.query(
      `
        INSERT INTO users (
          name,
          email,
          password,
          phone,
          address,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'active')
      `,
      [
        cleanName,
        cleanEmail,
        hashedPassword,
        phone || null,
        address || null,
      ]
    );

    const userId = Number(insertResult.insertId);

    /*
    |--------------------------------------------------------------------------
    | 6. สร้าง Token
    |--------------------------------------------------------------------------
    */

    const user = {
      user_id: userId,
      name: cleanName,
      email: cleanEmail,
      phone: phone || null,
      address: address || null,
      status: "active",
    };

    const token = createToken(user);

    /*
    |--------------------------------------------------------------------------
    | 7. ส่งผลกลับ
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      token,
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถสมัครสมาชิกได้",
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/login
 *
 * Body:
 * {
 *   "email": "test2@example.com",
 *   "password": "12345678"
 * }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    if (!cleanEmail || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 1. ค้นหาผู้ใช้
    |--------------------------------------------------------------------------
    */

    const [users] = await db.query(
      `
        SELECT
          user_id,
          name,
          email,
          password,
          phone,
          address,
          latitude,
          longitude,
          status,
          created_at
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const user = users[0];

    /*
    |--------------------------------------------------------------------------
    | 2. ตรวจสถานะบัญชี
    |--------------------------------------------------------------------------
    */

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "บัญชีนี้ไม่สามารถใช้งานได้",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. ตรวจรหัสผ่าน
    |--------------------------------------------------------------------------
    */

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. สร้าง Token
    |--------------------------------------------------------------------------
    */

    const token = createToken(user);

    /*
    |--------------------------------------------------------------------------
    | 5. ไม่ส่งรหัสผ่านกลับ
    |--------------------------------------------------------------------------
    */

    const safeUser = {
      user_id: Number(user.user_id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      latitude:
        user.latitude === null
          ? null
          : Number(user.latitude),
      longitude:
        user.longitude === null
          ? null
          : Number(user.longitude),
      status: user.status,
      created_at: user.created_at,
    };

    return res.status(200).json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถเข้าสู่ระบบได้",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
};