"use strict";

const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  charset: "utf8mb4",
  connectTimeout: 10000,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

pool.getConnection((error, connection) => {
  if (error) {
    console.error(
      "MySQL connection failed:",
      error.code,
      error.message
    );

    return;
  }

  console.log("MySQL Connected");
  connection.release();
});

module.exports = pool.promise();