"use strict";

const nodemailer = require("nodemailer");

let transporter = null;

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} ยังไม่ได้ตั้งค่าใน server/.env`);
  }

  return value;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

function getEmailTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_APP_PASSWORD"),
    },
  });

  return transporter;
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const smtpUser = requireEnv("SMTP_USER");
  const safeResetUrl = escapeHtml(resetUrl);

  return getEmailTransporter().sendMail({
    from: `"CatMatch" <${smtpUser}>`,
    to,
    subject: "รีเซ็ตรหัสผ่านบัญชี CatMatch",

    text: [
      "สวัสดี",
      "",
      "เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี CatMatch ของคุณ",
      "",
      "เปิดลิงก์นี้เพื่อกำหนดรหัสผ่านใหม่:",
      resetUrl,
      "",
      "หากคุณไม่ได้ส่งคำขอนี้ สามารถละเว้นอีเมลฉบับนี้ได้",
      "",
      "ขอบคุณ",
      "ทีม CatMatch",
    ].join("\n"),

    html: `
      <!doctype html>
      <html lang="th">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width">
          <title>รีเซ็ตรหัสผ่าน CatMatch</title>
        </head>

        <body style="
          margin:0;
          padding:32px 16px;
          background:#fff8f6;
          font-family:Arial,'Noto Sans Thai',sans-serif;
          color:#343638;
        ">
          <div style="
            max-width:560px;
            margin:0 auto;
            overflow:hidden;
            border:1px solid #f0dce4;
            border-radius:24px;
            background:#ffffff;
            box-shadow:0 16px 45px rgba(121,81,98,.12);
          ">
            <div style="
              padding:26px 32px;
              background:linear-gradient(135deg,#f7cad8,#f8dda6);
            ">
              <div style="
                font-size:27px;
                font-weight:800;
                color:#9d526f;
              ">
                CatMatch
              </div>

              <div style="
                margin-top:4px;
                color:#765d66;
                font-size:14px;
              ">
                แมวที่ใช่ สำหรับคุณ
              </div>
            </div>

            <div style="padding:34px 32px 38px;">
              <div style="
                margin-bottom:10px;
                color:#bd6686;
                font-size:13px;
                font-weight:700;
                letter-spacing:.08em;
              ">
                ความปลอดภัยของบัญชี
              </div>

              <h1 style="
                margin:0 0 16px;
                font-size:25px;
                line-height:1.4;
                color:#343638;
              ">
                กำหนดรหัสผ่านใหม่
              </h1>

              <p style="
                margin:0 0 12px;
                color:#64686b;
                font-size:16px;
                line-height:1.8;
              ">
                เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี CatMatch ของคุณ
              </p>

              <p style="
                margin:0 0 26px;
                color:#64686b;
                font-size:16px;
                line-height:1.8;
              ">
                กดปุ่มด้านล่างเพื่อเปิดหน้ากำหนดรหัสผ่านใหม่
              </p>

              <div style="text-align:center;margin:30px 0;">
                <a
                  href="${safeResetUrl}"
                  style="
                    display:inline-block;
                    padding:14px 30px;
                    border-radius:999px;
                    background:#d77f9e;
                    color:#ffffff;
                    font-size:16px;
                    font-weight:700;
                    text-decoration:none;
                  "
                >
                  ตั้งรหัสผ่านใหม่
                </a>
              </div>

              <p style="
                margin:24px 0 0;
                padding-top:22px;
                border-top:1px solid #f1e4e9;
                color:#85888a;
                font-size:13px;
                line-height:1.7;
              ">
                หากคุณไม่ได้ส่งคำขอนี้ สามารถละเว้นอีเมลฉบับนี้ได้
                รหัสผ่านเดิมจะยังคงใช้งานได้
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

async function sendNewsletterWelcomeEmail({ to }) {
  const smtpUser = requireEnv("SMTP_USER");
  const safeEmail = escapeHtml(to);

  return getEmailTransporter().sendMail({
    from: `"CatMatch" <${smtpUser}>`,
    to,
    subject: "ยืนยันการสมัครรับข่าวสารจาก CatMatch",
    text: [
      "สมัครรับข่าวสารจาก CatMatch สำเร็จแล้ว",
      "",
      `อีเมลที่สมัคร: ${to}`,
      "",
      "เราจะใช้อีเมลนี้สำหรับส่งข่าวสารเกี่ยวกับแมว การดูแล และข้อมูลจาก CatMatch",
      "",
      "ขอบคุณ",
      "ทีม CatMatch",
    ].join("\n"),
    html: `
      <!doctype html>
      <html lang="th">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width">
          <title>สมัครรับข่าวสาร CatMatch</title>
        </head>
        <body style="margin:0;padding:32px 16px;background:#f7fbfd;font-family:Arial,'Noto Sans Thai',sans-serif;color:#334f64;">
          <div style="max-width:580px;margin:0 auto;overflow:hidden;border:1px solid #dceaf2;border-radius:26px;background:#ffffff;box-shadow:0 18px 48px rgba(62,94,116,.14);">
            <div style="padding:28px 34px;background:linear-gradient(135deg,#dff2ff,#ffe7ef);">
              <div style="font-size:28px;font-weight:800;color:#456f8d;">CatMatch</div>
              <div style="margin-top:4px;color:#6f7f8b;font-size:14px;">แมวที่ใช่ สำหรับคุณ</div>
            </div>
            <div style="padding:36px 34px 40px;">
              <div style="display:inline-block;margin-bottom:13px;padding:7px 12px;border-radius:999px;background:#eef8ff;color:#5d8dad;font-size:13px;font-weight:700;">สมัครรับข่าวสารสำเร็จ</div>
              <h1 style="margin:0 0 14px;color:#334f64;font-size:25px;line-height:1.45;">ยินดีต้อนรับสู่ข่าวสาร CatMatch</h1>
              <p style="margin:0 0 16px;color:#687b88;font-size:16px;line-height:1.8;">เราได้บันทึกอีเมลของคุณสำหรับรับข่าวสารเกี่ยวกับสายพันธุ์แมว การดูแล และข้อมูลที่เป็นประโยชน์จาก CatMatch แล้ว</p>
              <div style="margin:24px 0;padding:15px 17px;border:1px solid #e0edf4;border-radius:16px;background:#f8fcff;color:#4d6c80;font-size:15px;overflow-wrap:anywhere;">${safeEmail}</div>
              <p style="margin:24px 0 0;padding-top:22px;border-top:1px solid #edf1f4;color:#8a969e;font-size:13px;line-height:1.75;">อีเมลฉบับนี้เป็นการยืนยันการสมัครเท่านั้น การส่งข่าวสารจริงจะเริ่มเมื่อผู้ดูแลระบบเผยแพร่ข่าวสารจาก CatMatch</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

module.exports = {
  getEmailTransporter,
  sendPasswordResetEmail,
  sendNewsletterWelcomeEmail,
};