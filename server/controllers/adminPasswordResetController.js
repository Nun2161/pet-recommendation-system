const db = require("../config/db");

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email || "").split("@");
  if (!domain) return "ไม่ระบุ";
  return `${local.slice(0, 2)}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
};

const maskPhone = (phone) => {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return "ไม่ระบุ";
  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
};

const allowedStatuses = new Set([
  "pending",
  "approved",
  "rejected",
  "completed",
  "expired",
  "cancelled",
]);

const listPasswordResetRequests = async (req, res) => {
  try {
    const requestedStatus = String(req.query?.status || "pending").toLowerCase();
    const status = allowedStatuses.has(requestedStatus) ? requestedStatus : "pending";
    const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 100);

    const [rows] = await db.query(
      `
        SELECT
          pr.request_id,
          pr.status,
          pr.phone_verified,
          pr.recovery_code_supplied,
          pr.recovery_code_verified,
          pr.approved_by,
          pr.approved_at,
          pr.approval_expires_at,
          pr.rejection_reason,
          pr.created_at,
          pr.updated_at,
          u.user_id,
          u.name,
          u.username,
          u.email,
          u.phone,
          u.status AS user_status
        FROM password_reset_requests pr
        INNER JOIN users u ON u.user_id = pr.user_id
        WHERE pr.status = ?
        ORDER BY pr.created_at ASC
        LIMIT ?
      `,
      [status, limit]
    );

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows.map((row) => ({
        request_id: row.request_id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        approval_expires_at: row.approval_expires_at,
        rejection_reason: row.rejection_reason,
        verification: {
          phone_last4_matched: Boolean(Number(row.phone_verified)),
          recovery_code_supplied: Boolean(Number(row.recovery_code_supplied)),
          recovery_code_matched: Boolean(Number(row.recovery_code_verified)),
        },
        user: {
          user_id: row.user_id,
          name: row.name,
          username: row.username,
          email_masked: maskEmail(row.email),
          phone_masked: maskPhone(row.phone),
          status: row.user_status,
        },
      })),
    });
  } catch (error) {
    console.error("List password reset requests error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถโหลดคำขอเปลี่ยนรหัสผ่านได้",
    });
  }
};

const approvePasswordResetRequest = async (req, res) => {
  try {
    const requestId = Number(req.params?.requestId);
    const adminId = Number(req.admin?.admin_id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "request_id ไม่ถูกต้อง",
      });
    }

    if (!Number.isInteger(adminId) || adminId <= 0) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ดูแลระบบ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    const [result] = await db.query(
      `
        UPDATE password_reset_requests
        SET
          status = 'approved',
          approved_by = ?,
          approved_at = NOW(),
          approval_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE),
          rejection_reason = NULL,
          rejected_at = NULL,
          reset_token_hash = NULL,
          token_issued_at = NULL,
          reset_token_expires_at = NULL,
          token_used_at = NULL
        WHERE request_id = ?
          AND status = 'pending'
      `,
      [adminId, requestId]
    );

    if (result.affectedRows !== 1) {
      return res.status(409).json({
        success: false,
        message:
          "คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ หรือถูกดำเนินการแล้ว",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "อนุมัติคำขอแล้ว ผู้ใช้สามารถรับ Reset Token ได้ภายใน 30 นาที",
      request_id: requestId,
      status: "approved",
    });
  } catch (error) {
    console.error(
      "Approve password reset request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถอนุมัติคำขอได้",
    });
  }
};
const rejectPasswordResetRequest = async (req, res) => {
  try {
    const requestId = Number(req.params?.requestId);
    const reason = String(req.body?.reason || "ข้อมูลไม่เพียงพอสำหรับการยืนยันตัวตน")
      .trim()
      .slice(0, 255);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, message: "request_id ไม่ถูกต้อง" });
    }

    const [result] = await db.query(
  `
    UPDATE password_reset_requests
    SET
      status = 'rejected',
      rejected_at = NOW(),
      rejection_reason = ?,
      approved_by = NULL,
      approved_at = NULL,
      approval_expires_at = NULL,
      reset_token_hash = NULL,
      token_issued_at = NULL,
      reset_token_expires_at = NULL,
      token_used_at = NULL
    WHERE request_id = ?
      AND status = 'pending'
  `,
  [reason, requestId]
);

    if (result.affectedRows !== 1) {
      return res.status(409).json({
        success: false,
        message: "คำขอนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ หรือถูกดำเนินการแล้ว",
      });
    }

    return res.status(200).json({
      success: true,
      message: "ปฏิเสธคำขอแล้ว",
      request_id: requestId,
      status: "rejected",
    });
  } catch (error) {
    console.error("Reject password reset request error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถปฏิเสธคำขอได้" });
  }
};

module.exports = {
  listPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
};
