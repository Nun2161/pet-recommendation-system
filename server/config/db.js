const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

pool.getConnection((error, connection) => {
  if (error) {
    console.error("MySQL connection failed:", error.message);
    return;
  }

  console.log("MySQL Connected");
  connection.release();
});

/*
ทำให้ db.query() รองรับ await
*/
module.exports = pool.promise();