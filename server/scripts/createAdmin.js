require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("../config/db");

const createAdmin = async () => {
  try {
    const email = "admin@example.com";
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      throw new Error(
        "กรุณากำหนด ADMIN_PASSWORD ใน Environment ก่อน"
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.query(
      `
        INSERT INTO admin (
          name,
          email,
          password,
          status
        )
        VALUES (?, ?, ?, 'active')
      `,
      ["System Admin", email, hashedPassword]
    );

    console.log("สร้าง Admin สำเร็จ");
    console.log(`Email: ${email}`);

    process.exit(0);
  } catch (error) {
    console.error("Create admin error:", error.message);
    process.exitCode = 1;
  }
};

createAdmin();
