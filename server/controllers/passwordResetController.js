const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const db = require("../config/db");
const { getFirebaseAuth } = require("../config/firebaseAdmin");

const {
  sendPasswordResetEmail: sendStyledPasswordResetEmail,
} = require("../services/emailService");

const PASSWORD_HISTORY_LIMIT = 5;
const REQUEST_CODE_BYTES = 18;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_MINUTES = 15;
const FIREBASE_WEB_API_KEY = String(
  process.env.FIREBASE_WEB_API_KEY || ""
).trim();
const SMTP_USER = String(
  process.env.SMTP_USER || ""
).trim();

const SMTP_APP_PASSWORD = String(
  process.env.SMTP_APP_PASSWORD || ""
)
  .replace(/\s+/g, "")
  .trim();

const PASSWORD_RESET_PAGE_URL = String(
  process.env.PASSWORD_RESET_PAGE_URL ||
    "http://127.0.0.1:5500/client/pages/reset-password.html"
).trim();

const mailTransporter =
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_APP_PASSWORD,
    },
  });
  const sendPasswordResetEmail = async (
  email,
  resetToken
) => {
  const resetUrl =
    `${PASSWORD_RESET_PAGE_URL}` +
    `?reset_token=${encodeURIComponent(resetToken)}`;

  await sendStyledPasswordResetEmail({
    to: email,
    resetUrl,
  });
};
const isCurrentFirebasePassword = async (
  email,
  password
) => {
  if (!FIREBASE_WEB_API_KEY) {
    throw new Error(
      "ไม่พบ FIREBASE_WEB_API_KEY ใน server/.env"
    );
  }

  if (typeof fetch !== "function") {
    throw new Error(
      "Node.js ต้องเป็นเวอร์ชัน 18 ขึ้นไปเพื่อใช้ fetch"
    );
  }

  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/" +
      "accounts:signInWithPassword?key=" +
      encodeURIComponent(
        FIREBASE_WEB_API_KEY
      ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: String(email || "").trim(),
        password: String(password || ""),
        returnSecureToken: true,
      }),
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (response.ok) {
    return true;
  }

  const firebaseError = String(
    data?.error?.message || ""
  );

  const passwordNotMatched = [
    "INVALID_LOGIN_CREDENTIALS",
    "INVALID_PASSWORD",
    "EMAIL_NOT_FOUND",
  ];

  if (
    passwordNotMatched.includes(firebaseError)
  ) {
    return false;
  }

  throw new Error(
    "Firebase password check failed: " +
      (firebaseError || response.status)
  );
};

const REQUEST_GENERIC_MESSAGE =
  "หากข้อมูลตรงกับบัญชี ระบบได้รับคำขอแล้ว กรุณาเก็บหมายเลขคำขอไว้เพื่อตรวจสอบสถานะ";

const normalizeIdentifier = (value) =>
  String(value || "").trim().toLowerCase();

const normalizeRecoveryCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const digitsOnly = (value) =>
  String(value || "").replace(/\D/g, "");

const hashCapability = (value) =>
  crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");

const randomCapability = (bytes) =>
  crypto.randomBytes(bytes).toString("base64url");

const maskEmail = (email) => {
  const [local = "", domain = ""] =
    String(email || "").split("@");

  if (!domain) return "ไม่ระบุ";

  const shown = local.slice(0, 2);

  return `${shown}${"*".repeat(
    Math.max(3, local.length - shown.length)
  )}@${domain}`;
};

const maskPhone = (phone) => {
  const digits = digitsOnly(phone);

  if (digits.length < 4) return "ไม่ระบุ";

  return `${"*".repeat(
    Math.max(4, digits.length - 4)
  )}${digits.slice(-4)}`;
};

const commonPasswords = new Set([
  "password1!",
  "password@1",
  "qwerty123!",
  "admin1234!",
  "catmatch1!",
]);
const getForbiddenPasswordTerms = (user) => {
  const terms = new Set();

  const add = (value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (normalized.length >= 3) {
      terms.add(normalized);
    }
  };

  const addParts = (value) => {
    const raw = String(value || "")
      .trim()
      .toLowerCase();

    raw
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .forEach((part) => {
        add(part);

        /*
         * แยกตัวอักษรกับตัวเลขด้วย
         * เช่น menisa2161 จะได้ menisa และ 2161
         */
        part
          .split(/(?<=\D)(?=\d)|(?<=\d)(?=\D)/)
          .filter(Boolean)
          .forEach(add);
      });

    add(raw);
  };

  addParts(user?.name);
  addParts(user?.username);

  const email = String(user?.email || "")
    .trim()
    .toLowerCase();

  const [emailLocal = "", emailDomain = ""] =
    email.split("@");

  addParts(emailLocal);

  /*
   * ตรวจโดเมนเฉพาะโดเมนส่วนตัว
   * ไม่เอาคำทั่วไปอย่าง gmail มาห้าม
   */
  const domainName =
    emailDomain.split(".")[0];

  const ignoredDomains = new Set([
    "gmail",
    "googlemail",
    "outlook",
    "hotmail",
    "live",
    "yahoo",
    "icloud",
  ]);

  if (
    domainName &&
    !ignoredDomains.has(domainName)
  ) {
    addParts(domainName);
  }

  return [...terms];
};
const validateNewPassword = (
  password,
  confirmPassword,
  user
) => {
  const errors = [];
  const value = String(password || "");

  if (value !== String(confirmPassword || "")) {
    errors.push(
      "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน"
    );
  }

  if (value.length !== 10) {
    errors.push("รหัสผ่านต้องมี 10 ตัวพอดี");
  }

  if (!/^[\x21-\x7E]+$/.test(value)) {
    errors.push(
      "รหัสผ่านต้องใช้อักษรอังกฤษ ตัวเลข และสัญลักษณ์โดยไม่มีช่องว่าง"
    );
  }

  if (!/[a-z]/.test(value)) {
    errors.push(
      "ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว"
    );
  }

  if (!/[A-Z]/.test(value)) {
    errors.push(
      "ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว"
    );
  }

  if (!/[0-9]/.test(value)) {
    errors.push(
      "ต้องมีตัวเลขอย่างน้อย 1 ตัว"
    );
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    errors.push(
      "ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว"
    );
  }

  const lower = value.toLowerCase();

  const matchedTerm =
    getForbiddenPasswordTerms(user).find(
      (term) => lower.includes(term)
    );

  if (matchedTerm) {
    errors.push(
      "ห้ามใช้ชื่อ ชื่อผู้ใช้งาน หรือส่วนของอีเมลในรหัสผ่าน"
    );
  }

 if (
  commonPasswords.has(
    value.toLowerCase()
  )
) {
    errors.push(
      "รหัสผ่านนี้เดาง่ายเกินไป กรุณาใช้รหัสอื่น"
    );
  }

  if (/(.)\1{3,}/.test(value)) {
    errors.push(
      "ห้ามใช้อักขระเดิมซ้ำติดกันหลายครั้ง"
    );
  }

  return [...new Set(errors)];
};

const buildSimilarPasswordCandidates = (
  newPassword
) => {
  const value =
    String(newPassword || "");

  const candidates = new Set();

  /*
   * ตรวจการเติมอักขระด้านหน้า/ด้านหลัง
   * 1–2 ตัว เช่น:
   * Nunmns21@  -> Nunmns21@1
   * Nunmns21@  -> 1Nunmns21@
   */
  if (value.length > 1) {
    candidates.add(
      value.slice(0, -1)
    );

    candidates.add(
      value.slice(1)
    );
  }

  if (value.length > 2) {
    candidates.add(
      value.slice(0, -2)
    );

    candidates.add(
      value.slice(2)
    );
  }

  candidates.delete(value);
  candidates.delete("");

  return [...candidates];
};

const checkPasswordHistory = async (
  newPassword,
  currentPasswordHash,
  historyRows = []
) => {
  const passwordHashes = [
    currentPasswordHash,
    ...historyRows.map(
      (row) => row.password_hash
    ),
  ].filter(Boolean);

  /*
   * ตรวจรหัสที่ซ้ำแบบตรงกันทั้งหมด
   * กับรหัสปัจจุบันและย้อนหลัง 5 ครั้ง
   */
  for (
    const passwordHash
    of passwordHashes
  ) {
    const matched =
      await bcrypt.compare(
        newPassword,
        passwordHash
      );

    if (matched) {
      return "reused";
    }
  }

  /*
   * ตรวจความคล้ายกับรหัสปัจจุบัน
   * โดยจับการเติมอักขระหน้า/หลัง 1–2 ตัว
   *
   * ไม่ตรวจทุกความเป็นไปได้กับทุก Hash
   * เพราะ bcrypt มีต้นทุนสูงมาก
   */
const similarCandidates =
  buildSimilarPasswordCandidates(
    newPassword
  );

for (
  const passwordHash
  of passwordHashes
) {
  for (
    const candidate
    of similarCandidates
  ) {
    const matched =
      await bcrypt.compare(
        candidate,
        passwordHash
      );

    if (matched) {
      return "similar";
    }
  }
}
  return null;
};

const submitPasswordResetRequest = async (
  req,
  res
) => {
  const genericMessage =
    "หากอีเมลนี้มีบัญชี CatMatch ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์สแปม";

  let connection;

  try {
    const email = String(
      req.body?.email || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมล",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          user_id,
          email,
          status,
          firebase_uid,
          firebase_provider
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
      `,
      [email]
    );

    const user = rows[0];

    /*
     * ตอบข้อความเหมือนกันเสมอ
     * เพื่อไม่เปิดเผยว่าอีเมลใดมีบัญชีในระบบ
     */
    if (
      !user ||
      String(
        user.status || "active"
      ).toLowerCase() !== "active"
    ) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const provider = String(
      user.firebase_provider || ""
    )
      .trim()
      .toLowerCase();

    /*
     * บัญชีที่สมัครด้วย Google ไม่มีรหัสผ่าน
     */
    if (
      provider === "google" ||
      provider === "google.com"
    ) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const resetToken =
      randomCapability(RESET_TOKEN_BYTES);

    const resetTokenHash =
      hashCapability(resetToken);

    const internalRequestCode =
      randomCapability(REQUEST_CODE_BYTES);

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE password_reset_requests
        SET
          status = 'cancelled',
          reset_token_hash = NULL,
          updated_at = NOW()
        WHERE user_id = ?
          AND token_used_at IS NULL
          AND status IN (
            'pending',
            'approved'
          )
      `,
      [user.user_id]
    );

    const [insertResult] =
      await connection.query(
        `
          INSERT INTO password_reset_requests (
            user_id,
            request_code_hash,
            phone_verified,
            recovery_code_supplied,
            recovery_code_verified,
            status,
            reset_token_hash,
            token_issued_at,
            reset_token_expires_at
          )
          VALUES (
            ?,
            ?,
            0,
            0,
            0,
            'approved',
            ?,
            NOW(),
            DATE_ADD(
              NOW(),
              INTERVAL ? MINUTE
            )
          )
        `,
        [
          user.user_id,
          hashCapability(internalRequestCode),
          resetTokenHash,
          RESET_TOKEN_MINUTES,
        ]
      );

    await connection.commit();

    try {
      await sendPasswordResetEmail(
        user.email,
        resetToken
      );
    } catch (emailError) {
      await db.query(
        `
          UPDATE password_reset_requests
          SET
            status = 'cancelled',
            reset_token_hash = NULL,
            updated_at = NOW()
          WHERE request_id = ?
        `,
        [insertResult.insertId]
      );

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // ป้องกัน Error ซ้อน
      }
    }

    console.error(
      "Submit password reset request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
const getPasswordResetStatus = async (
  req,
  res
) => {
  try {
    res.set("Cache-Control", "no-store");
    res.set(
      "Referrer-Policy",
      "no-referrer"
    );

    const requestCode = String(
      req.params?.requestCode || ""
    ).trim();

    if (
      requestCode.length < 20 ||
      requestCode.length > 80
    ) {
      return res.status(400).json({
        success: false,
        message:
          "หมายเลขคำขอไม่ถูกต้อง",
      });
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

    if (!request) {
      return res.status(200).json({
        success: true,
        status: "pending",
        message:
          "คำขอกำลังรอผู้ดูแลระบบตรวจสอบ",
      });
    }

    if (request.status === "approved") {
      const approvalExpired =
        request.approval_expires_at &&
        new Date(
          request.approval_expires_at
        ).getTime() <= Date.now();

      if (approvalExpired) {
        await db.query(
          `
            UPDATE password_reset_requests
            SET status = 'expired'
            WHERE request_id = ?
              AND status = 'approved'
          `,
          [request.request_id]
        );

        return res.status(200).json({
          success: true,
          status: "expired",
          message:
            "การอนุมัติหมดอายุ กรุณาส่งคำขอใหม่",
        });
      }

      if (request.token_issued_at) {
        return res.status(200).json({
          success: true,
          status: "token_issued",
          message:
            "Reset Token ถูกออกไปแล้ว หากปิดหน้าตั้งรหัสผ่าน กรุณาส่งคำขอใหม่",
        });
      }

      const resetToken =
        randomCapability(RESET_TOKEN_BYTES);

      const resetTokenHash =
        hashCapability(resetToken);

      const [updateResult] =
        await db.query(
          `
            UPDATE password_reset_requests
            SET
              reset_token_hash = ?,
              token_issued_at = NOW(),
              reset_token_expires_at =
                DATE_ADD(
                  NOW(),
                  INTERVAL ? MINUTE
                )
            WHERE request_id = ?
              AND status = 'approved'
              AND token_issued_at IS NULL
          `,
          [
            resetTokenHash,
            RESET_TOKEN_MINUTES,
            request.request_id,
          ]
        );

      if (updateResult.affectedRows !== 1) {
        return res.status(409).json({
          success: false,
          message:
            "สถานะคำขอเปลี่ยนแปลง กรุณาตรวจสอบอีกครั้ง",
        });
      }

      return res.status(200).json({
        success: true,
        status: "approved",
        message:
          "คำขอได้รับการอนุมัติแล้ว",
        reset_token: resetToken,
        expires_in_minutes:
          RESET_TOKEN_MINUTES,
      });
    }

    const messages = {
      pending:
        "คำขอกำลังรอผู้ดูแลระบบตรวจสอบ",

      rejected:
        "คำขอไม่ได้รับการอนุมัติ กรุณาตรวจสอบข้อมูลและส่งคำขอใหม่",

      completed:
        "คำขอนี้ใช้เปลี่ยนรหัสผ่านเรียบร้อยแล้ว",

      expired:
        "คำขอนี้หมดอายุแล้ว กรุณาส่งคำขอใหม่",

      cancelled:
        "คำขอนี้ถูกยกเลิกแล้ว กรุณาใช้คำขอล่าสุด",
    };

    return res.status(200).json({
      success: true,
      status: request.status,
      message:
        messages[request.status] ||
        "ไม่สามารถตรวจสอบสถานะได้",
    });
  } catch (error) {
    console.error(
      "Get password reset status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถตรวจสอบสถานะได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
};
const getPasswordResetInfo = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");

    const resetToken = String(
      req.query?.reset_token || ""
    ).trim();

    if (
      resetToken.length < 30 ||
      resetToken.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reset Token ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          pr.status,
          pr.reset_token_expires_at,
          pr.token_used_at,
          u.username
        FROM password_reset_requests pr
        INNER JOIN users u
          ON u.user_id = pr.user_id
        WHERE pr.reset_token_hash = ?
        LIMIT 1
      `,
      [hashCapability(resetToken)]
    );

    const request = rows[0];

    const invalid =
      !request ||
      request.status !== "approved" ||
      request.token_used_at ||
      !request.reset_token_expires_at ||
      new Date(
        request.reset_token_expires_at
      ).getTime() <= Date.now();

    if (invalid) {
      return res.status(400).json({
        success: false,
        message:
          "Reset Token ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว",
      });
    }

    return res.status(200).json({
      success: true,
      username:
        String(request.username || "").trim() ||
        "ผู้ใช้ CatMatch",
    });
  } catch (error) {
    console.error(
      "Get password reset info error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถตรวจสอบข้อมูลบัญชีได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
};
const resetPassword = async (req, res) => {
  let connection;

  try {
    res.set("Cache-Control", "no-store");
    res.set(
  "X-CatMatch-Reset-Version",
  "firebase-check-v2"
);

console.log(
  ">>> ใช้งาน passwordResetController firebase-check-v2 <<<"
);

    const resetToken = String(
      req.body?.reset_token || ""
    ).trim();

    const newPassword = String(
      req.body?.new_password || ""
    );

    const confirmPassword = String(
      req.body?.confirm_password || ""
    );

    if (
      resetToken.length < 30 ||
      resetToken.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reset Token ไม่ถูกต้อง",
      });
    }

    connection =
      await db.getConnection();

    await connection.beginTransaction();

    const [rows] =
      await connection.query(
        `
          SELECT
            pr.request_id,
            pr.user_id,
            pr.status,
            pr.reset_token_expires_at,
            pr.token_used_at,
            u.name,
            u.username,
            u.email,
            u.password,
            u.firebase_uid,
            u.firebase_provider
          FROM password_reset_requests pr
          INNER JOIN users u
            ON u.user_id = pr.user_id
          WHERE pr.reset_token_hash = ?
          LIMIT 1
          FOR UPDATE
        `,
        [hashCapability(resetToken)]
      );

    const request = rows[0];

    const invalid =
  !request ||
  request.token_used_at ||
  !request.reset_token_expires_at ||
  new Date(request.reset_token_expires_at).getTime() <= Date.now();

    if (invalid) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Reset Token ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว",
      });
    }

    const passwordErrors =
      validateNewPassword(
        newPassword,
        confirmPassword,
        request
      );

    if (passwordErrors.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        code: "PASSWORD_POLICY_ERROR",
        message: passwordErrors[0],
        errors: passwordErrors,
      });
    }

    const provider = String(
      request.firebase_provider || ""
    )
      .trim()
      .toLowerCase();

    if (
      provider === "google" ||
      provider === "google.com"
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        code:
          "GOOGLE_ACCOUNT_HAS_NO_PASSWORD",
        message:
          "บัญชีนี้สมัครผ่าน Google กรุณาเข้าสู่ระบบด้วย Google",
      });
    }

    if (!request.firebase_uid) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        code:
          "FIREBASE_ACCOUNT_NOT_LINKED",
        message:
          "บัญชีนี้ยังไม่ได้เชื่อมกับ Firebase กรุณาติดต่อผู้ดูแลระบบ",
      });
    }
const firebaseUser =
  await getFirebaseAuth().getUser(
    request.firebase_uid
  );

const firebaseEmail =
  String(
    firebaseUser.email ||
    request.email ||
    ""
  ).trim();

if (!firebaseEmail) {
  await connection.rollback();

  return res.status(409).json({
    success: false,
    code: "FIREBASE_EMAIL_NOT_FOUND",
    message:
      "ไม่พบอีเมลของบัญชีใน Firebase กรุณาติดต่อผู้ดูแลระบบ",
  });
}

const sameAsCurrentDatabasePassword =
  Boolean(
    request.password &&
    await bcrypt.compare(
      newPassword,
      request.password
    )
  );

const sameAsCurrentFirebasePassword =
  await isCurrentFirebasePassword(
    firebaseEmail,
    newPassword
  );

console.log(
  "Password reuse check:",
  {
    user_id: request.user_id,
    firebase_uid: request.firebase_uid,
    database_email: request.email,
    firebase_email: firebaseEmail,
    has_database_password:
      Boolean(request.password),
    database_password_matched:
      sameAsCurrentDatabasePassword,
    firebase_password_matched:
      sameAsCurrentFirebasePassword,
  }
);

if (
  sameAsCurrentDatabasePassword ||
  sameAsCurrentFirebasePassword
) {
  await connection.rollback();

  return res.status(409).json({
    success: false,
    code: "PASSWORD_REUSED",
    message:
      "รหัสผ่านใหม่ซ้ำกับรหัสผ่านปัจจุบัน กรุณาตั้งรหัสผ่านใหม่ที่แตกต่างจากเดิม",
    errors: {
      new_password:
        "ห้ามใช้รหัสผ่านเดียวกับรหัสผ่านปัจจุบัน",
    },
  });
}
    const [passwordHistoryRows] =
      await connection.query(
        `
          SELECT password_hash
          FROM password_history
          WHERE user_id = ?
          ORDER BY
            created_at DESC,
            history_id DESC
          LIMIT ?
        `,
        [
          request.user_id,
          PASSWORD_HISTORY_LIMIT,
        ]
      );

   const passwordHistoryStatus =
  await checkPasswordHistory(
    newPassword,
    request.password,
    passwordHistoryRows
  );

if (
  passwordHistoryStatus === "reused"
) {
  await connection.rollback();

  return res.status(409).json({
    success: false,
    code: "PASSWORD_REUSED",
    message:
      "รหัสผ่านนี้เคยถูกใช้งานแล้ว กรุณาตั้งรหัสใหม่ที่ไม่ซ้ำกับรหัสปัจจุบันหรือรหัสย้อนหลัง 5 ครั้ง",
    errors: {
      new_password:
        "ห้ามใช้รหัสผ่านซ้ำกับรหัสปัจจุบันหรือรหัสย้อนหลัง 5 ครั้ง",
    },
  });
}

if (
  passwordHistoryStatus === "similar"
) {
  await connection.rollback();

  return res.status(409).json({
    success: false,
    code: "PASSWORD_SIMILAR",
    message:
      "รหัสผ่านใหม่นี้คล้ายกับรหัสผ่านที่เคยใช้มากเกินไป กรุณาเปลี่ยนตัวอักษร ตัวเลข และสัญลักษณ์ให้แตกต่างจากเดิมมากขึ้น",
    errors: {
      new_password:
        "ห้ามเติมอักขระด้านหน้าหรือด้านหลังรหัสเดิมเพียง 1–2 ตัว",
    },
  });
}

const passwordHash =
  await bcrypt.hash(
    newPassword,
    12
  );

if (request.password) {
  await connection.query(
    `
      INSERT INTO password_history (
        user_id,
        password_hash
      )
      VALUES (?, ?)
    `,
    [
      request.user_id,
      request.password,
    ]
  );
}

await connection.query(
  `
    DELETE FROM password_history
    WHERE user_id = ?
      AND history_id NOT IN (
        SELECT history_id
        FROM (
          SELECT history_id
          FROM password_history
          WHERE user_id = ?
          ORDER BY
            created_at DESC,
            history_id DESC
          LIMIT ?
        ) AS latest_password_history
      )
  `,
  [
    request.user_id,
    request.user_id,
    PASSWORD_HISTORY_LIMIT,
  ]
);

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
  [
    passwordHash,
    request.user_id,
  ]
);

    await getFirebaseAuth().updateUser(
      request.firebase_uid,
      {
        password: newPassword,
      }
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
        SET
          status = 'cancelled',
          reset_token_hash = NULL
        WHERE user_id = ?
          AND request_id <> ?
          AND status IN (
            'pending',
            'approved'
          )
      `,
      [
        request.user_id,
        request.request_id,
      ]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message:
        "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // ป้องกัน Error ซ้อนขณะ Rollback
      }
    }

    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const generateRecoveryCode = async (
  req,
  res
) => {
  try {
    res.set("Cache-Control", "no-store");

    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    const randomPart = Array.from(
      crypto.randomBytes(12),
      (byte) =>
        alphabet[
          byte % alphabet.length
        ]
    ).join("");

    const recoveryCode =
      `CM-${randomPart.slice(0, 4)}` +
      `-${randomPart.slice(4, 8)}` +
      `-${randomPart.slice(8, 12)}`;

    const recoveryCodeHash =
      await bcrypt.hash(
        recoveryCode,
        12
      );

    await db.query(
      `
        UPDATE users
        SET
          recovery_code_hash = ?,
          recovery_code_updated_at = NOW()
        WHERE user_id = ?
      `,
      [
        recoveryCodeHash,
        req.user.user_id,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "สร้าง Recovery Code แล้ว กรุณาเก็บไว้ในที่ปลอดภัย เพราะระบบจะแสดงเพียงครั้งเดียว",
      recovery_code: recoveryCode,
    });
  } catch (error) {
    console.error(
      "Generate recovery code error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถสร้าง Recovery Code ได้",
    });
  }
};

module.exports = {
  submitPasswordResetRequest,
  getPasswordResetStatus,
  getPasswordResetInfo,
  resetPassword,
  generateRecoveryCode,
  maskEmail,
  maskPhone,
};