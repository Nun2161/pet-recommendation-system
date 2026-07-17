require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("../config/db");

const createAdmin = async () => {
  try {
    const email = "admin@example.com";
    const password = "12345678";

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
      [
        "System Admin",
        email,
        hashedPassword,
      ]
    );

    console.log("สร้าง Admin สำเร็จ");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    process.exit(0);
  } catch (error) {
    console.error("Create admin error:", error);
    process.exit(1);
  }
};

createAdmin();