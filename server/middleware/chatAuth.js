"use strict";

const jwt = require("jsonwebtoken");
const db = require("../config/db");

function extractToken(req) {
  const authorization = String(req.headers.authorization || "").trim();
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return String(req.query?.token || "").trim();
}

async function resolveActorFromToken(token) {
  if (!token || !process.env.JWT_SECRET) {
    const error = new Error("กรุณาเข้าสู่ระบบ");
    error.status = 401;
    throw error;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const role = String(decoded.role || "user").toLowerCase();

  if (role === "user") {
    const id = Number(decoded.user_id);
    const [rows] = await db.query(
      `SELECT user_id, name, nickname, username, email, status
       FROM users WHERE user_id = ? LIMIT 1`,
      [id]
    );
    const record = rows[0];
    if (!record || String(record.status || "active").toLowerCase() !== "active") {
      const error = new Error("บัญชีผู้ใช้ไม่สามารถใช้งานแชทได้");
      error.status = 403;
      throw error;
    }
    return {
      type: "user",
      id,
      name: record.nickname || record.name || record.username || record.email || "ผู้ใช้",
      email: record.email || "",
    };
  }

  if (role === "farm") {
    const id = Number(decoded.farm_id);
    const [rows] = await db.query(
      `SELECT farm_id, farm_name, owner_name, email, status
       FROM farm WHERE farm_id = ? LIMIT 1`,
      [id]
    );
    const record = rows[0];
    if (!record || String(record.status || "").toLowerCase() !== "approved") {
      const error = new Error("บัญชีฟาร์มไม่สามารถใช้งานแชทได้");
      error.status = 403;
      throw error;
    }
    return {
      type: "farm",
      id,
      name: record.farm_name || record.owner_name || "ฟาร์ม",
      email: record.email || "",
    };
  }

  if (role === "admin") {
    const id = Number(decoded.admin_id);
    const [rows] = await db.query(
      `SELECT admin_id, name, email, status
       FROM admin WHERE admin_id = ? LIMIT 1`,
      [id]
    );
    const record = rows[0];
    if (!record || String(record.status || "active").toLowerCase() !== "active") {
      const error = new Error("บัญชีผู้ดูแลไม่สามารถใช้งานแชทได้");
      error.status = 403;
      throw error;
    }
    return {
      type: "admin",
      id,
      name: record.name || "ผู้ดูแลระบบ",
      email: record.email || "",
    };
  }

  const error = new Error("บัญชีนี้ไม่รองรับระบบแชท");
  error.status = 403;
  throw error;
}

async function authenticateChat(req, res, next) {
  try {
    req.chatActor = await resolveActorFromToken(extractToken(req));
    return next();
  } catch (error) {
    return res.status(error.status || 401).json({
      success: false,
      message: error.name === "TokenExpiredError"
        ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
        : (error.message || "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง"),
    });
  }
}

module.exports = {
  authenticateChat,
  extractToken,
  resolveActorFromToken,
};
