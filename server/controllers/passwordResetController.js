const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

const REQUEST_CODE_BYTES = 18;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_MINUTES = 15;
const REQUEST_GENERIC_MESSAGE =
  "หากข้อมูลตรงกับบัญชี ระบบได้รับคำขอแล้ว กรุณาเก็บหมายเลขคำขอไว้เพื่อตรวจสอบสถานะ";

const normalizeIdentifier = (value) => String(value || "").trim().toLowerCase();
const normalizeRecoveryCode = (value) =>
  String(value || "").trim().toUpperCase().replace(/\s+/g, "");
const digitsOnly = (value) => String(value || "").replace(/\D/g, "");
const hashCapability = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");
const randomCapability = (bytes) => crypto.randomBytes(bytes).toString("base64url");

const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email || "").split("@");
  if (!domain) return "ไม่ระบุ";
  const shown = local.slice(0, 2);
  return `${shown}${"*".repeat(Math.max(3, local.length - shown.length))}@${domain}`;
};

const maskPhone = (phone) => {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return "ไม่ระบุ";
  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
};

const commonPasswords = new Set([
  "Password1!",
  "Password@1",
  "Qwerty123!",
  "Admin1234!",
  "Catmatch1!",
]);

const getForbiddenPasswordTerms = (user) => {
  const terms = new Set();
  const add = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized.length >= 3) terms.add(normalized);
  };

  String(user?.name || "")
    .split(/[^A-Za-z]+/)
    .filter(Boolean)
    .forEach(add);

  add(user?.username);
  const usernamePrefix = String(user?.username || "").match(/^[A-Za-z]+/)?.[0];
  add(usernamePrefix);

  const emailLocal = String(user?.email || "").split("@")[0];
  add(emailLocal);

  return [...terms];
};

const validateNewPassword = (password, confirmPassword, user) => {
  const errors = [];
  const value = String(password || "");

  if (value !== String(confirmPassword || "")) {
    errors.push("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
  }
  if (value.length !== 10) errors.push("รหัสผ่านต้องมี 10 ตัวพอดี");
  if (!/^[\x21-\x7E]+$/.test(value)) {
    errors.push("รหัสผ่านต้องใช้อักษรอังกฤษ ตัวเลข และสัญลักษณ์โดยไม่มีช่องว่าง");
  }
  if (!/[a-z]/.test(value)) errors.push("ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว");
  if (!/[A-Z]/.test(value)) errors.push("ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว");
  if (!/[0-9]/.test(value)) errors.push("ต้องมีตัวเลขอย่างน้อย 1 ตัว");
  if (!/[^A-Za-z0-9]/.test(value)) errors.push("ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว");

  const lower = value.toLowerCase();
  const matchedTerm = getForbiddenPasswordTerms(user).find((term) => lower.includes(term));
  if (matchedTerm) errors.push("ห้ามใช้ชื่อ ชื่อผู้ใช้งาน หรือส่วนของอีเมลในรหัสผ่าน");
  if (commonPasswords.has(value)) errors.push("รหัสผ่านนี้เดาง่ายเกินไป กรุณาใช้รหัสอื่น");
  if (/(.)\1{3,}/.test(value)) errors.push("ห้ามใช้อักขระเดิมซ้ำติดกันหลายครั้ง");

  return [...new Set(errors)];
};

const submitPasswordResetRequest = async (req, res) => {
  const publicRequestCode = randomCapability(REQUEST_CODE_BYTES);

  try {
    const identifier = normalizeIdentifier(req.body?.identifier);
    const phoneLast4 = digitsOnly(req.body?.phone_last4);
    const recoveryCode = normalizeRecoveryCode(req.body?.recovery_code);

    if (!identifier || phoneLast4.length !== 4 || recoveryCode.length > 64) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมลหรือชื่อผู้ใช้งาน และเบอร์โทร 4 ตัวท้ายให้ถูกต้อง",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          user_id,
          name,
          username,
          email,
          phone,
          status,
          recovery_code_hash
        FROM users
        WHERE LOWER(email) = ? OR LOWER(username) = ?
        LIMIT 1
      `,
      [identifier, identifier]
    );

    const user = rows[0];
    let verified = Boolean(user && String(user.status || "active").toLowerCase() === "active");

    if (verified) {
      verified = digitsOnly(user.phone).slice(-4) === phoneLast4;
    }

    let recoveryVerified = false;
    if (verified && recoveryCode) {
      recoveryVerified = Boolean(
        user.recovery_code_hash &&
        await bcrypt.compare(recoveryCode, user.recovery_code_hash)
      );
      verified = recoveryVerified;
    }

    if (verified) {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        await connection.query(
          `
            UPDATE password_reset_requests
            SET status = 'cancelled', updated_at = NOW()
            WHERE user_id = ? AND status IN ('pending', 'approved')
          `,
          [user.user_id]
        );

        await connection.query(
          `
            INSERT INTO password_reset_requests (
              user_id,
              request_code_hash,
              phone_verified,
              recovery_code_supplied,
              recovery_code_verified,
              status
            ) VALUES (?, ?, 1, ?, ?, 'pending')
          `,
          [
            user.user_id,
            hashCapability(publicRequestCode),
            recoveryCode ? 1 : 0,
            recoveryVerified ? 1 : 0,
          ]
        );

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    // ตอบเหมือนกันทั้งกรณีบัญชีมี/ไม่มี เพื่อไม่เปิดเผยว่าบัญชีใดมีอยู่จริง
    return res.status(202).json({
      success: true,
      message: REQUEST_GENERIC_MESSAGE,
      request_code: publicRequestCode,
    });
  } catch (error) {
    console.error("Submit password reset request error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
};

const getPasswordResetStatus = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");

    const requestCode = String(req.params?.requestCode || "").trim();
    if (requestCode.length < 20 || requestCode.length > 80) {
      return res.status(400).json({ success: false, message: "หมายเลขคำขอไม่ถูกต้อง" });
    }

    const [rows] = await db.query(
      `
        SELECT
          request_id,
          user_id,
          status,
          approved_at,
          approval_expires_at,
          token_issued_at,
          reset_token_expires_at,
          token_used_at,
          rejection_reason,
          created_at
        FROM password_reset_requests
        WHERE request_code_hash = ?
        LIMIT 1
      `,
      [hashCapability(requestCode)]
    );

    const request = rows[0];

    // ไม่เปิดเผยว่าหมายเลขคำขอปลอมหรือข้อมูลผู้ใช้ไม่ตรง
    if (!request) {
      return res.status(200).json({
        success: true,
        status: "pending",
        message: "คำขอกำลังรอผู้ดูแลระบบตรวจสอบ",
      });
    }

    if (request.status === "approved") {
      const approvalExpired =
        request.approval_expires_at && new Date(request.approval_expires_at).getTime() <= Date.now();

      if (approvalExpired) {
        await db.query(
          `UPDATE password_reset_requests SET status = 'expired' WHERE request_id = ? AND status = 'approved'`,
          [request.request_id]
        );
        return res.status(200).json({
          success: true,
          status: "expired",
          message: "การอนุมัติหมดอายุ กรุณาส่งคำขอใหม่",
        });
      }

      if (request.token_issued_at) {
        return res.status(200).json({
          success: true,
          status: "token_issued",
          message: "Reset Token ถูกออกไปแล้ว หากปิดหน้าตั้งรหัสผ่าน กรุณาส่งคำขอใหม่",
        });
      }

      const resetToken = randomCapability(RESET_TOKEN_BYTES);
      const resetTokenHash = hashCapability(resetToken);

      const [updateResult] = await db.query(
        `
          UPDATE password_reset_requests
          SET
            reset_token_hash = ?,
            token_issued_at = NOW(),
            reset_token_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
          WHERE request_id = ?
            AND status = 'approved'
            AND token_issued_at IS NULL
        `,
        [resetTokenHash, RESET_TOKEN_MINUTES, request.request_id]
      );

      if (updateResult.affectedRows !== 1) {
        return res.status(409).json({
          success: false,
          message: "สถานะคำขอเปลี่ยนแปลง กรุณาตรวจสอบอีกครั้ง",
        });
      }

      return res.status(200).json({
        success: true,
        status: "approved",
        message: "คำขอได้รับการอนุมัติแล้ว",
        reset_token: resetToken,
        expires_in_minutes: RESET_TOKEN_MINUTES,
      });
    }

    const messages = {
      pending: "คำขอกำลังรอผู้ดูแลระบบตรวจสอบ",
      rejected: "คำขอไม่ได้รับการอนุมัติ กรุณาตรวจสอบข้อมูลและส่งคำขอใหม่",
      completed: "คำขอนี้ใช้เปลี่ยนรหัสผ่านเรียบร้อยแล้ว",
      expired: "คำขอนี้หมดอายุแล้ว กรุณาส่งคำขอใหม่",
      cancelled: "คำขอนี้ถูกยกเลิกแล้ว กรุณาใช้คำขอล่าสุด",
    };

    return res.status(200).json({
      success: true,
      status: request.status,
      message: messages[request.status] || "ไม่สามารถตรวจสอบสถานะได้",
    });
  } catch (error) {
    console.error("Get password reset status error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถตรวจสอบสถานะได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
};

const resetPassword = async (req, res) => {
  let connection;

  try {
    res.set("Cache-Control", "no-store");
    const resetToken = String(req.body?.reset_token || "").trim();
    const newPassword = String(req.body?.new_password || "");
    const confirmPassword = String(req.body?.confirm_password || "");

    if (resetToken.length < 30 || resetToken.length > 100) {
      return res.status(400).json({ success: false, message: "Reset Token ไม่ถูกต้อง" });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
        SELECT
          pr.request_id,
          pr.user_id,
          pr.status,
          pr.reset_token_expires_at,
          pr.token_used_at,
          u.name,
          u.username,
          u.email
        FROM password_reset_requests pr
        INNER JOIN users u ON u.user_id = pr.user_id
        WHERE pr.reset_token_hash = ?
        LIMIT 1
        FOR UPDATE
      `,
      [hashCapability(resetToken)]
    );

    const request = rows[0];
    const invalid =
      !request ||
      request.status !== "approved" ||
      request.token_used_at ||
      !request.reset_token_expires_at ||
      new Date(request.reset_token_expires_at).getTime() <= Date.now();

    if (invalid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Reset Token ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว",
      });
    }

    const passwordErrors = validateNewPassword(newPassword, confirmPassword, request);
    if (passwordErrors.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        code: "PASSWORD_POLICY_ERROR",
        message: passwordErrors[0],
        errors: passwordErrors,
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await connection.query(
      `
        UPDATE users
        SET
          password = ?,
          password_changed_at = NOW(),
          auth_version = auth_version + 1,
          updated_at = NOW()
        WHERE user_id = ?
      `,
      [passwordHash, request.user_id]
    );

    await connection.query(
      `
        UPDATE password_reset_requests
        SET
          status = 'completed',
          token_used_at = NOW(),
          completed_at = NOW(),
          reset_token_hash = NULL
        WHERE request_id = ?
      `,
      [request.request_id]
    );

    await connection.query(
      `
        UPDATE password_reset_requests
        SET status = 'cancelled', reset_token_hash = NULL
        WHERE user_id = ?
          AND request_id <> ?
          AND status IN ('pending', 'approved')
      `,
      [request.user_id, request.request_id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
    });
  } finally {
    if (connection) connection.release();
  }
};

const generateRecoveryCode = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const randomPart = Array.from(crypto.randomBytes(12), (byte) => alphabet[byte % alphabet.length]).join("");
    const recoveryCode = `CM-${randomPart.slice(0, 4)}-${randomPart.slice(4, 8)}-${randomPart.slice(8, 12)}`;
    const recoveryCodeHash = await bcrypt.hash(recoveryCode, 12);

    await db.query(
      `
        UPDATE users
        SET recovery_code_hash = ?, recovery_code_updated_at = NOW()
        WHERE user_id = ?
      `,
      [recoveryCodeHash, req.user.user_id]
    );

    return res.status(200).json({
      success: true,
      message: "สร้าง Recovery Code แล้ว กรุณาเก็บไว้ในที่ปลอดภัย เพราะระบบจะแสดงเพียงครั้งเดียว",
      recovery_code: recoveryCode,
    });
  } catch (error) {
    console.error("Generate recovery code error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถสร้าง Recovery Code ได้" });
  }
};

module.exports = {
  submitPasswordResetRequest,
  getPasswordResetStatus,
  resetPassword,
  generateRecoveryCode,
  maskEmail,
  maskPhone,
};
