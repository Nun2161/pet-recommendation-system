const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { getFirebaseAuth } = require("../config/firebaseAdmin");

const {
  normalizeFullName,
  normalizeEmail,
  normalizeUsername,
  validateRegistrationPayload,
} = require("../utils/registrationValidation");

const {
  validatePassword,
} = require("../utils/passwordPolicy");

const DUPLICATE_MESSAGES = {
  name: "มีผู้ใช้งานชื่อนี้แล้ว",
  username: "มีผู้ใช้งานชื่อผู้ใช้นี้แล้ว",
  email: "มีผู้ใช้งานอีเมลนี้แล้ว",
};

/**
 * แปลงชื่อ Provider ให้เป็นรูปแบบเดียวกัน
 */
const normalizeProvider = (provider) => {
  const value = String(provider || "")
    .trim()
    .toLowerCase();

  if (value === "google" || value === "google.com") {
    return "google";
  }

  if (
    value === "password" ||
    value === "email" ||
    value === "email_password"
  ) {
    return "password";
  }

  return value || "unknown";
};

/**
 * ข้อความแจ้งเตือนเมื่ออีเมลถูกใช้แล้ว
 */
const getDuplicateEmailMessage = (provider) => {
  const normalizedProvider = normalizeProvider(provider);

  if (normalizedProvider === "google") {
    return (
      "อีเมลนี้สมัครสมาชิกผ่าน Google แล้ว " +
      "กรุณาเลือกเข้าสู่ระบบด้วย Google"
    );
  }

  if (normalizedProvider === "password") {
    return (
      "อีเมลนี้สมัครด้วยอีเมลและรหัสผ่านแล้ว " +
      "กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน"
    );
  }

  return DUPLICATE_MESSAGES.email;
};

const readBearerToken = (req) => {
  const authorization = String(
    req.headers?.authorization || ""
  ).trim();

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match ? match[1].trim() : "";
};

/**
 * ตรวจว่า Firebase Account ที่ส่งมาสมัคร:
 * - มี Token จริง
 * - อีเมลตรงกับแบบฟอร์ม
 * - สมัครผ่าน Email/Password เท่านั้น
 */
const verifyRegistrationFirebaseUser = async (
  req,
  expectedEmail
) => {
  const idToken = readBearerToken(req);

  if (!idToken) {
    const error = new Error(
      "ไม่พบ Firebase ID Token สำหรับสมัครสมาชิก"
    );

    error.statusCode = 401;
    error.code = "FIREBASE_TOKEN_REQUIRED";

    throw error;
  }

  const decoded = await getFirebaseAuth().verifyIdToken(
    idToken,
    true
  );

  const firebaseEmail = String(decoded.email || "")
    .trim()
    .toLowerCase();

  const provider = String(
    decoded.firebase?.sign_in_provider || "unknown"
  );

  if (
    !firebaseEmail ||
    firebaseEmail !== expectedEmail
  ) {
    const error = new Error(
      "อีเมลใน Firebase ไม่ตรงกับข้อมูลสมัครสมาชิก"
    );

    error.statusCode = 403;
    error.code = "FIREBASE_EMAIL_MISMATCH";

    throw error;
  }

  if (provider !== "password") {
    const error = new Error(
      "แบบฟอร์มนี้รองรับการสมัครด้วยอีเมลและรหัสผ่านเท่านั้น"
    );

    error.statusCode = 400;
    error.code = "INVALID_REGISTRATION_PROVIDER";

    throw error;
  }

  return {
    uid: decoded.uid,
    provider: "password",
  };
};

/**
 * ตรวจข้อมูลซ้ำจากผลลัพธ์ฐานข้อมูล
 */
const buildDuplicateErrors = (rows, values) => {
  const errors = {};

  for (const row of rows) {
    if (
      row.name_normalized ===
      values.name_normalized
    ) {
      errors.name = DUPLICATE_MESSAGES.name;
    }

    if (
      String(row.username || "").toLowerCase() ===
      values.username.toLowerCase()
    ) {
      errors.username =
        DUPLICATE_MESSAGES.username;
    }

    if (
      String(row.email || "").toLowerCase() ===
      values.email
    ) {
      errors.email = getDuplicateEmailMessage(
        row.firebase_provider
      );
    }
  }

  return errors;
};

const duplicateResponse = (res, errors) => {
  const message =
    errors.name ||
    errors.username ||
    errors.email ||
    "ข้อมูลนี้ถูกใช้งานแล้ว";

  return res.status(409).json({
    success: false,
    code: "DUPLICATE_USER_DATA",
    message,
    errors,
  });
};

/**
 * สมัครสมาชิกด้วย Email/Password
 */
const registerUser = async (req, res) => {
  let connection;

  try {
    /*
     * ตรวจข้อมูลแบบฟอร์มทั่วไปก่อน
     */
    const validation =
      validateRegistrationPayload(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "ข้อมูลสมัครสมาชิกไม่ถูกต้อง",
        errors: validation.errors,
      });
    }

    const data = validation.data;

    /*
     * ห้าม trim รหัสผ่าน เพราะช่องว่างต้องถือว่า
     * เป็นส่วนหนึ่งของค่าที่ผู้ใช้ส่งมา และ Policy
     * จะเป็นตัวปฏิเสธเอง
     */
    const password = String(
      req.body?.password || ""
    );

    /*
     * ตรวจนโยบายรหัสผ่าน
     * - ต้องมี 10 ตัวพอดี
     * - พิมพ์ใหญ่/เล็ก
     * - ตัวเลข
     * - อักขระพิเศษ
     * - ห้ามมีชื่อ ชื่อผู้ใช้ หรือต้นอีเมล
     */
    const passwordValidation =
      validatePassword(password, {
        username: data.username,
        name: data.name,
        full_name: data.name,
        nickname: data.nickname,
        email: data.email,
      });

    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        code: "WEAK_PASSWORD",
        message:
          passwordValidation.errors[0] ||
          "รหัสผ่านไม่ผ่านเงื่อนไขความปลอดภัย",
        errors: {
          password:
            passwordValidation.errors[0] ||
            "รหัสผ่านไม่ผ่านเงื่อนไข",
        },
        password_errors:
          passwordValidation.errors,
      });
    }

    const nameNormalized =
      data.name.toLowerCase();

    /*
     * ตรวจว่า Token มาจาก Email/Password จริง
     */
    const firebaseAccount =
      await verifyRegistrationFirebaseUser(
        req,
        data.email
      );

    connection = await db.getConnection();

    await connection.beginTransaction();

    /*
     * ล็อกข้อมูลระหว่างตรวจ เพื่อป้องกันการสมัครซ้อน
     * พร้อมกันด้วยข้อมูลเดียวกัน
     */
    const [duplicateRows] =
      await connection.query(
        `
          SELECT
            name_normalized,
            username,
            email,
            firebase_provider
          FROM users
          WHERE name_normalized = ?
             OR username = ?
             OR email = ?
          FOR UPDATE
        `,
        [
          nameNormalized,
          data.username,
          data.email,
        ]
      );

    const duplicateErrors =
      buildDuplicateErrors(duplicateRows, {
        name_normalized: nameNormalized,
        username: data.username,
        email: data.email,
      });

    if (
      Object.keys(duplicateErrors).length > 0
    ) {
      await connection.rollback();

      return duplicateResponse(
        res,
        duplicateErrors
      );
    }

    /*
     * เข้ารหัสรหัสผ่านจริงด้วย bcrypt
     * ห้ามบันทึกรหัสผ่านแบบข้อความธรรมดา
     */
    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const [result] = await connection.query(
      `
        INSERT INTO users (
          name,
          name_normalized,
          username,
          email,
          password,
          phone,
          phone_country,
          birth_date,
          nickname,
          gender,
          contact_preference,
          country,
          province,
          district,
          subdistrict,
          address,
          onboarding_completed,
          status,
          firebase_uid,
          firebase_provider
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?
        )
      `,
      [
        data.name,
        nameNormalized,
        data.username,
        data.email,
        passwordHash,
        data.phone,
        data.phone_country,
        data.birth_date,
        data.nickname,
        data.gender,
        data.contact_preference,
        data.country,
        data.province,
        data.district,
        data.subdistrict,
        data.address,
        firebaseAccount.uid,
        firebaseAccount.provider,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      user: {
        user_id: Number(result.insertId),
        name: data.name,
        username: data.username,
        email: data.email,
        status: "active",
        firebase_provider:
          firebaseAccount.provider,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Registration rollback error:",
          rollbackError.message
        );
      }
    }

    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({
          success: false,
          code:
            error.code ||
            "FIREBASE_REGISTRATION_ERROR",
          message: error.message,
        });
    }

    if (
      String(error.code || "").startsWith(
        "auth/"
      )
    ) {
      return res.status(401).json({
        success: false,
        code: error.code,
        message:
          "Firebase ID Token ไม่ถูกต้องหรือหมดอายุ กรุณาลองสมัครใหม่",
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      const sqlMessage = String(
        error.sqlMessage ||
          error.message ||
          ""
      );

      const errors = {};

      if (
        sqlMessage.includes(
          "uq_users_name_normalized"
        )
      ) {
        errors.name =
          DUPLICATE_MESSAGES.name;
      } else if (
        sqlMessage.includes(
          "uq_users_username"
        )
      ) {
        errors.username =
          DUPLICATE_MESSAGES.username;
      } else if (
        sqlMessage
          .toLowerCase()
          .includes("email")
      ) {
        errors.email =
          DUPLICATE_MESSAGES.email;
      }

      return duplicateResponse(res, errors);
    }

    console.error(
      "User registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * ตรวจชื่อ ชื่อผู้ใช้ หรืออีเมลระหว่างกรอกแบบฟอร์ม
 */
const checkAvailability = async (
  req,
  res
) => {
  try {
    const field = String(
      req.body?.field || ""
    );

    const rawValue = req.body?.value;

    const allowedFields = {
      name: {
        column: "name_normalized",
        normalize: (value) =>
          normalizeFullName(
            value
          ).toLowerCase(),
      },

      username: {
        column: "username",
        normalize: normalizeUsername,
      },

      email: {
        column: "email",
        normalize: normalizeEmail,
      },
    };

    const config = allowedFields[field];

    if (!config) {
      return res.status(400).json({
        success: false,
        message:
          "ไม่รองรับฟิลด์ที่ต้องการตรวจสอบ",
      });
    }

    const value =
      config.normalize(rawValue);

    if (!value) {
      return res.status(400).json({
        success: false,
        message:
          "กรุณาระบุข้อมูลที่ต้องการตรวจสอบ",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          user_id,
          firebase_provider
        FROM users
        WHERE ${config.column} = ?
        LIMIT 1
      `,
      [value]
    );

    const available =
      rows.length === 0;

    let message =
      "ข้อมูลนี้ยังใช้งานได้";

    if (!available) {
      if (field === "email") {
        message =
          getDuplicateEmailMessage(
            rows[0].firebase_provider
          );
      } else {
        message =
          DUPLICATE_MESSAGES[field];
      }
    }

    return res.status(200).json({
      success: true,
      field,
      available,
      message,
      provider:
        field === "email" &&
        !available
          ? normalizeProvider(
              rows[0].firebase_provider
            )
          : null,
    });
  } catch (error) {
    console.error(
      "Check registration availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถตรวจสอบข้อมูลได้",
    });
  }
};

module.exports = {
  registerUser,
  checkAvailability,
};