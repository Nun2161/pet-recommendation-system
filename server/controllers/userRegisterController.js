const bcrypt = require("bcryptjs");
const db = require("../config/db");

const {
  normalizeFullName,
  normalizeEmail,
  normalizeUsername,
  validateRegistrationPayload,
} = require("../utils/registrationValidation");

const DUPLICATE_MESSAGES = {
  name: "มีผู้ใช้งานชื่อนี้แล้ว",
  username: "มีผู้ใช้งานชื่อผู้ใช้นี้แล้ว",
  email: "มีผู้ใช้งานอีเมลนี้แล้ว",
};

const buildDuplicateErrors = (rows, values) => {
  const errors = {};

  for (const row of rows) {
    if (row.name_normalized === values.name_normalized) {
      errors.name = DUPLICATE_MESSAGES.name;
    }
    if (String(row.username || "").toLowerCase() === values.username.toLowerCase()) {
      errors.username = DUPLICATE_MESSAGES.username;
    }
    if (String(row.email || "").toLowerCase() === values.email) {
      errors.email = DUPLICATE_MESSAGES.email;
    }
  }

  return errors;
};

const duplicateResponse = (res, errors) => {
  const message = errors.name || errors.username || errors.email || "ข้อมูลนี้ถูกใช้งานแล้ว";

  return res.status(409).json({
    success: false,
    code: "DUPLICATE_USER_DATA",
    message,
    errors,
  });
};

const registerUser = async (req, res) => {
  let connection;

  try {
    const validation = validateRegistrationPayload(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "ข้อมูลสมัครสมาชิกไม่ถูกต้อง",
        errors: validation.errors,
      });
    }

    const data = validation.data;
    const nameNormalized = data.name.toLowerCase();

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [duplicateRows] = await connection.query(
      `
        SELECT
          name_normalized,
          username,
          email
        FROM users
        WHERE name_normalized = ?
           OR username = ?
           OR email = ?
        FOR UPDATE
      `,
      [nameNormalized, data.username, data.email]
    );

    const duplicateErrors = buildDuplicateErrors(duplicateRows, {
      name_normalized: nameNormalized,
      username: data.username,
      email: data.email,
    });

    if (Object.keys(duplicateErrors).length > 0) {
      await connection.rollback();
      return duplicateResponse(res, duplicateErrors);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

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
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active')
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
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Registration rollback error:", rollbackError.message);
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      const message = String(error.sqlMessage || error.message || "");
      const errors = {};

      if (message.includes("uq_users_name_normalized")) {
        errors.name = DUPLICATE_MESSAGES.name;
      } else if (message.includes("uq_users_username")) {
        errors.username = DUPLICATE_MESSAGES.username;
      } else if (message.includes("email")) {
        errors.email = DUPLICATE_MESSAGES.email;
      }

      return duplicateResponse(res, errors);
    }

    console.error("User registration error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง",
    });
  } finally {
    if (connection) connection.release();
  }
};

const checkAvailability = async (req, res) => {
  try {
    const field = String(req.body?.field || "");
    const rawValue = req.body?.value;

    const allowedFields = {
      name: {
        column: "name_normalized",
        normalize: (value) => normalizeFullName(value).toLowerCase(),
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
        message: "ไม่รองรับฟิลด์ที่ต้องการตรวจสอบ",
      });
    }

    const value = config.normalize(rawValue);
    if (!value) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุข้อมูลที่ต้องการตรวจสอบ",
      });
    }

    const [rows] = await db.query(
      `SELECT user_id FROM users WHERE ${config.column} = ? LIMIT 1`,
      [value]
    );

    const available = rows.length === 0;

    return res.status(200).json({
      success: true,
      field,
      available,
      message: available ? "ข้อมูลนี้ยังใช้งานได้" : DUPLICATE_MESSAGES[field],
    });
  } catch (error) {
    console.error("Check registration availability error:", error);

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถตรวจสอบข้อมูลได้",
    });
  }
};

module.exports = {
  registerUser,
  checkAvailability,
};
