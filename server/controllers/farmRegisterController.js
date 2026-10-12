"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const db = require("../config/db");
const { getFirebaseAuth } = require("../config/firebaseAdmin");
const {
  normalizeEmail,
  validateFarmRegistrationPayload,
} = require("../utils/farmRegistrationValidation");

const UPLOAD_DIRECTORY = path.join(__dirname, "..", "uploads", "farm-certificates");

function readBearerToken(req) {
  const authorization = String(req.headers?.authorization || "").trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function verifyFarmFirebaseAccount(req, expectedEmail) {
  const idToken = readBearerToken(req);

  if (!idToken) {
    const error = new Error("ไม่พบ Firebase ID Token สำหรับลงทะเบียนฟาร์ม");
    error.statusCode = 401;
    error.code = "FIREBASE_TOKEN_REQUIRED";
    throw error;
  }

  const decoded = await getFirebaseAuth().verifyIdToken(idToken, true);
  const firebaseEmail = normalizeEmail(decoded.email);
  const provider = String(decoded.firebase?.sign_in_provider || "unknown");

  if (!firebaseEmail || firebaseEmail !== expectedEmail) {
    const error = new Error("อีเมลใน Firebase ไม่ตรงกับข้อมูลลงทะเบียนฟาร์ม");
    error.statusCode = 403;
    error.code = "FIREBASE_EMAIL_MISMATCH";
    throw error;
  }

  if (provider !== "password") {
    const error = new Error("การลงทะเบียนฟาร์มรองรับอีเมลและรหัสผ่านเท่านั้น");
    error.statusCode = 400;
    error.code = "INVALID_FARM_REGISTRATION_PROVIDER";
    throw error;
  }

  return {
    uid: decoded.uid,
    provider: "password",
  };
}

async function findEmailAcrossRoles(connection, email) {
  const checks = [
    ["users", "ผู้ใช้งานทั่วไป"],
    ["farm", "เจ้าของฟาร์ม"],
    ["admin", "ผู้ดูแลระบบ"],
  ];

  for (const [table, roleLabel] of checks) {
    const [rows] = await connection.query(
      `SELECT email FROM ${table} WHERE LOWER(email) = ? LIMIT 1 FOR UPDATE`,
      [email]
    );

    if (rows.length) {
      return roleLabel;
    }
  }

  return null;
}

async function findFirebaseUidAcrossRoles(connection, firebaseUid) {
  for (const table of ["users", "farm", "admin"]) {
    const [rows] = await connection.query(
      `SELECT firebase_uid FROM ${table} WHERE firebase_uid = ? LIMIT 1 FOR UPDATE`,
      [firebaseUid]
    );

    if (rows.length) return table;
  }

  return null;
}

async function saveCertificateFile(certificate) {
  await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });

  const filename = `${Date.now()}-${crypto.randomUUID()}.${certificate.extension}`;
  const absolutePath = path.join(UPLOAD_DIRECTORY, filename);
  await fs.writeFile(absolutePath, certificate.buffer, { flag: "wx" });

  return {
    absolutePath,
    databasePath: `uploads/farm-certificates/${filename}`,
  };
}

async function removeFileQuietly(absolutePath) {
  if (!absolutePath) return;
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Farm certificate cleanup error:", error.message);
    }
  }
}

async function registerFarm(req, res) {
  let connection;
  let savedCertificatePath = "";
  let transactionStarted = false;

  try {
    const validation = validateFarmRegistrationPayload(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: "FARM_VALIDATION_ERROR",
        message: "ข้อมูลลงทะเบียนฟาร์มไม่ถูกต้อง",
        errors: validation.errors,
      });
    }

    const data = validation.data;
    const firebaseAccount = await verifyFarmFirebaseAccount(req, data.email);

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [existingFarmRows] = await connection.query(
      `
        SELECT
          farm_id, farm_name, owner_name, email, status, firebase_uid
        FROM farm
        WHERE LOWER(email) = ?
        LIMIT 1
        FOR UPDATE
      `,
      [data.email]
    );

    if (existingFarmRows.length) {
      const existingFarm = existingFarmRows[0];

      if (
        String(existingFarm.firebase_uid || "") ===
        String(firebaseAccount.uid || "")
      ) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(200).json({
          success: true,
          already_submitted: true,
          message:
            existingFarm.status === "approved"
              ? "บัญชีฟาร์มนี้ได้รับการอนุมัติแล้ว สามารถเข้าสู่ระบบได้"
              : "ระบบได้รับคำขอลงทะเบียนฟาร์มนี้แล้ว กรุณารอผู้ดูแลระบบตรวจสอบ",
          farm: {
            farm_id: Number(existingFarm.farm_id),
            farm_name: existingFarm.farm_name,
            owner_name: existingFarm.owner_name,
            email: existingFarm.email,
            status: existingFarm.status,
          },
        });
      }

      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_REGISTERED",
        message: "อีเมลนี้มีบัญชีเจ้าของฟาร์มอยู่แล้ว กรุณาใช้อีเมลอื่น",
        errors: {
          email: "อีเมลนี้มีบัญชีเจ้าของฟาร์มอยู่แล้ว",
        },
      });
    }

    const existingRole = await findEmailAcrossRoles(connection, data.email);
    if (existingRole) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_REGISTERED",
        message: `อีเมลนี้มีบัญชี${existingRole}อยู่แล้ว กรุณาใช้อีเมลอื่น`,
        errors: {
          email: `อีเมลนี้มีบัญชี${existingRole}อยู่แล้ว`,
        },
      });
    }

    const existingUidTable = await findFirebaseUidAcrossRoles(connection, firebaseAccount.uid);
    if (existingUidTable) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        code: "FIREBASE_UID_ALREADY_LINKED",
        message: "บัญชี Firebase นี้เชื่อมกับบัญชี CatMatch อื่นแล้ว",
      });
    }

    const [farmNameRows] = await connection.query(
      `SELECT farm_id FROM farm WHERE LOWER(farm_name) = LOWER(?) LIMIT 1 FOR UPDATE`,
      [data.farm_name]
    );

    if (farmNameRows.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        code: "FARM_NAME_ALREADY_USED",
        message: "ชื่อฟาร์มนี้มีอยู่ในระบบแล้ว",
        errors: {
          farm_name: "ชื่อฟาร์มนี้มีอยู่ในระบบแล้ว",
        },
      });
    }

    const certificateFile = await saveCertificateFile(validation.certificate);
    savedCertificatePath = certificateFile.absolutePath;

    const passwordHash = await bcrypt.hash(data.password, 12);

    const [result] = await connection.query(
      `
        INSERT INTO farm (
          farm_name,
          owner_name,
          email,
          password,
          phone,
          phone_country,
          country,
          province,
          district,
          subdistrict,
          address,
          description,
          website,
          facebook,
          line_contact,
          latitude,
          longitude,
          certificate_no,
          certificate_file,
          status,
          rejection_reason,
          approved_by,
          approved_at,
          firebase_uid,
          firebase_provider
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          'pending', NULL, NULL, NULL, ?, ?
        )
      `,
      [
        data.farm_name,
        data.owner_name,
        data.email,
        passwordHash,
        data.phone,
        data.phone_country,
        data.country,
        data.province,
        data.district,
        data.subdistrict,
        data.address,
        data.description,
        data.website || null,
        data.facebook || null,
        data.line_contact || null,
        data.latitude,
        data.longitude,
        data.certificate_no,
        certificateFile.databasePath,
        firebaseAccount.uid,
        firebaseAccount.provider,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "ส่งคำขอลงทะเบียนฟาร์มสำเร็จ กรุณารอผู้ดูแลระบบตรวจสอบ",
      farm: {
        farm_id: Number(result.insertId),
        farm_name: data.farm_name,
        owner_name: data.owner_name,
        email: data.email,
        status: "pending",
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Farm registration rollback error:", rollbackError.message);
      }
    }

    await removeFileQuietly(savedCertificatePath);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || "FARM_REGISTRATION_ERROR",
        message: error.message,
      });
    }

    if (String(error.code || "").startsWith("auth/")) {
      return res.status(401).json({
        success: false,
        code: error.code,
        message: "Firebase ID Token ไม่ถูกต้องหรือหมดอายุ กรุณาลองลงทะเบียนใหม่",
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      const message = String(error.sqlMessage || error.message || "").toLowerCase();
      const errors = {};

      if (message.includes("email")) errors.email = "อีเมลนี้มีบัญชีอยู่แล้ว";
      if (message.includes("firebase_uid")) errors.email = "บัญชี Firebase นี้ถูกใช้งานแล้ว";

      return res.status(409).json({
        success: false,
        code: "DUPLICATE_FARM_DATA",
        message: Object.values(errors)[0] || "ข้อมูลฟาร์มนี้มีอยู่ในระบบแล้ว",
        errors,
      });
    }

    console.error("Farm registration error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถลงทะเบียนฟาร์มได้ กรุณาลองใหม่อีกครั้ง",
    });
  } finally {
    if (connection) connection.release();
  }
}

async function getMyFarmRegistrationStatus(req, res) {
  try {
    const requestedEmail = normalizeEmail(req.query?.email);
    const idToken = readBearerToken(req);
    let firebaseUid = "";
    let firebaseEmail = "";

    if (idToken) {
      try {
        const decoded = await getFirebaseAuth().verifyIdToken(idToken);
        firebaseUid = String(decoded.uid || "").trim();
        firebaseEmail = normalizeEmail(decoded.email);
      } catch (_error) {
        // หน้า pending ยังตรวจด้วยอีเมลจากผลสมัครได้
      }
    }

    const lookupEmail = requestedEmail || firebaseEmail;
    if (!lookupEmail && !firebaseUid) {
      return res.status(400).json({
        success: false,
        code: "FARM_STATUS_IDENTITY_REQUIRED",
        message: "ไม่พบข้อมูลบัญชีสำหรับตรวจสอบสถานะฟาร์ม",
      });
    }

    let rows = [];
    if (lookupEmail) {
      [rows] = await db.query(
        `SELECT farm_id, farm_name, owner_name, email, status,
                rejection_reason, approved_at, firebase_uid
         FROM farm
         WHERE LOWER(TRIM(email)) = ?
         ORDER BY
           CASE WHEN LOWER(TRIM(status)) IN ('approved','active','verified','accepted') THEN 0 ELSE 1 END,
           CASE WHEN approved_at IS NOT NULL THEN 0 ELSE 1 END,
           farm_id DESC
         LIMIT 1`,
        [lookupEmail]
      );
    }

    if (!rows.length && firebaseUid) {
      [rows] = await db.query(
        `SELECT farm_id, farm_name, owner_name, email, status,
                rejection_reason, approved_at, firebase_uid
         FROM farm
         WHERE firebase_uid = ?
         ORDER BY
           CASE WHEN LOWER(TRIM(status)) IN ('approved','active','verified','accepted') THEN 0 ELSE 1 END,
           CASE WHEN approved_at IS NOT NULL THEN 0 ELSE 1 END,
           farm_id DESC
         LIMIT 1`,
        [firebaseUid]
      );
    }

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: "FARM_REGISTRATION_NOT_FOUND",
        message: "ยังไม่พบคำขอลงทะเบียนฟาร์มของบัญชีนี้",
      });
    }

    const farm = rows[0];
    const rawStatus = String(farm.status || "pending").trim().toLowerCase();
    const status = farm.approved_at || ['approved','active','verified','accepted'].includes(rawStatus)
      ? 'approved'
      : rawStatus;

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    return res.status(200).json({
      success: true,
      farm: {
        farm_id: Number(farm.farm_id),
        farm_name: farm.farm_name,
        owner_name: farm.owner_name,
        email: farm.email,
        status,
        rejection_reason: farm.rejection_reason || null,
        approved_at: farm.approved_at || null,
      },
    });
  } catch (error) {
    console.error("Farm registration status error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถตรวจสอบสถานะคำขอฟาร์มได้",
      error: error.message,
    });
  }
}

async function checkFarmAvailability(req, res) {
  try {
    const field = String(req.body?.field || "").trim();
    const rawValue = String(req.body?.value || "").trim();

    if (!rawValue) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุข้อมูลที่ต้องการตรวจสอบ",
      });
    }

    if (field === "email") {
      const email = normalizeEmail(rawValue);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: "รูปแบบอีเมลไม่ถูกต้อง",
        });
      }

      for (const table of ["users", "farm", "admin"]) {
        const [rows] = await db.query(
          `SELECT email FROM ${table} WHERE LOWER(email) = ? LIMIT 1`,
          [email]
        );
        if (rows.length) {
          return res.status(200).json({
            success: true,
            field,
            available: false,
            message: "อีเมลนี้มีบัญชีใน CatMatch อยู่แล้ว",
          });
        }
      }

      return res.status(200).json({
        success: true,
        field,
        available: true,
        message: "อีเมลนี้สามารถใช้ลงทะเบียนได้",
      });
    }

    if (field === "farm_name") {
      const [rows] = await db.query(
        `SELECT farm_id FROM farm WHERE LOWER(farm_name) = LOWER(?) LIMIT 1`,
        [rawValue]
      );

      return res.status(200).json({
        success: true,
        field,
        available: rows.length === 0,
        message: rows.length ? "ชื่อฟาร์มนี้มีอยู่ในระบบแล้ว" : "ชื่อฟาร์มนี้สามารถใช้ได้",
      });
    }

    return res.status(400).json({
      success: false,
      message: "รองรับการตรวจสอบเฉพาะ email และ farm_name",
    });
  } catch (error) {
    console.error("Farm availability error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถตรวจสอบข้อมูลฟาร์มได้",
    });
  }
}

module.exports = {
  registerFarm,
  checkFarmAvailability,
  getMyFarmRegistrationStatus,
};
