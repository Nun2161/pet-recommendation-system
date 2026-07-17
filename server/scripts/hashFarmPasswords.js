require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("../config/db");

const hashFarmPasswords = async () => {
  try {
    const [farms] = await db.query(`
      SELECT farm_id, email, password
      FROM farm
    `);

    for (const farm of farms) {
      const currentPassword = String(farm.password || "");

      // ถ้าเป็น bcrypt อยู่แล้ว ไม่ต้องเข้ารหัสซ้ำ
      if (
        currentPassword.startsWith("$2a$") ||
        currentPassword.startsWith("$2b$") ||
        currentPassword.startsWith("$2y$")
      ) {
        console.log(
          `ข้าม ${farm.email}: รหัสผ่านเข้ารหัสแล้ว`
        );
        continue;
      }

      const hashedPassword = await bcrypt.hash(
        currentPassword,
        12
      );

      await db.query(
        `
          UPDATE farm
          SET password = ?
          WHERE farm_id = ?
        `,
        [hashedPassword, farm.farm_id]
      );

      console.log(
        `เข้ารหัสรหัสผ่านของ ${farm.email} สำเร็จ`
      );
    }

    console.log("เข้ารหัสรหัสผ่านฟาร์มทั้งหมดเสร็จแล้ว");
    process.exit(0);
  } catch (error) {
    console.error(
      "Hash farm passwords error:",
      error
    );

    process.exit(1);
  }
};

hashFarmPasswords();