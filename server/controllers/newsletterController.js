"use strict";

const db = require("../config/db");
const {
  sendNewsletterWelcomeEmail,
} = require("../services/emailService");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
let tableReadyPromise = null;

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function ensureNewsletterTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        newsletter_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(254) NOT NULL,
        status ENUM('active', 'unsubscribed') NOT NULL DEFAULT 'active',
        subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (newsletter_id),
        UNIQUE KEY uq_newsletter_email (email)
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
    `).catch((error) => {
      tableReadyPromise = null;
      throw error;
    });
  }

  return tableReadyPromise;
}

async function subscribeNewsletter(req, res) {
  const email = normalizeEmail(req.body?.email);

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({
      success: false,
      message: "กรุณากรอกอีเมลให้ถูกต้อง",
    });
  }

  try {
    await ensureNewsletterTable();

    await db.query(
      `
        INSERT INTO newsletter_subscribers (
          email,
          status
        )
        VALUES (?, 'active')
        ON DUPLICATE KEY UPDATE
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
      `,
      [email]
    );

    let emailSent = false;

    try {
      await sendNewsletterWelcomeEmail({ to: email });
      emailSent = true;
    } catch (emailError) {
      console.error(
        "Newsletter confirmation email failed:",
        emailError?.message || emailError
      );
    }

    return res.status(200).json({
      success: true,
      emailSent,
      message: emailSent
        ? "สมัครรับข่าวสารและส่งอีเมลยืนยันเรียบร้อยแล้ว"
        : "บันทึกอีเมลสำหรับรับข่าวสารเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error(
      "Newsletter subscription failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "ไม่สามารถบันทึกอีเมลได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
}

module.exports = {
  subscribeNewsletter,
};
