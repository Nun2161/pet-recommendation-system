"use strict";

const db = require("../config/db");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PROFILE_IMAGE_DIRECTORY = path.join(
  __dirname,
  "..",
  "uploads",
  "farm-profile-images"
);
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

let ensureColumnPromise = null;

async function ensureProfileImageColumn() {
  if (!ensureColumnPromise) {
    ensureColumnPromise = (async () => {
      const [columns] = await db.query(
        `
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'farm'
            AND COLUMN_NAME = 'profile_image'
          LIMIT 1
        `
      );
      if (!columns.length) {
        await db.query(
          `ALTER TABLE farm ADD COLUMN profile_image VARCHAR(500) NULL AFTER certificate_file`
        );
      }
    })().catch((error) => {
      ensureColumnPromise = null;
      throw error;
    });
  }
  return ensureColumnPromise;
}

function parseProfileImageData(imageData) {
  const value = String(imageData || "").trim();
  const match = value.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/
  );
  if (!match) {
    const error = new Error("รูปโปรไฟล์ต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
    error.statusCode = 400;
    throw error;
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length) {
    const error = new Error("ไฟล์รูปโปรไฟล์ไม่ถูกต้อง");
    error.statusCode = 400;
    throw error;
  }
  if (buffer.length > MAX_PROFILE_IMAGE_SIZE) {
    const error = new Error("รูปโปรไฟล์มีขนาดใหญ่เกิน 5 MB");
    error.statusCode = 413;
    throw error;
  }

  const validSignature =
    (mimeType === "image/jpeg" &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff) ||
    (mimeType === "image/png" &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mimeType === "image/webp" &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP");

  if (!validSignature) {
    const error = new Error("เนื้อหาไฟล์รูปโปรไฟล์ไม่ถูกต้อง");
    error.statusCode = 400;
    throw error;
  }

  return {
    buffer,
    extension: IMAGE_EXTENSIONS.get(mimeType),
  };
}

async function saveProfileImage(imageData) {
  const image = parseProfileImageData(imageData);
  await fs.mkdir(PROFILE_IMAGE_DIRECTORY, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}.${image.extension}`;
  const absolutePath = path.join(PROFILE_IMAGE_DIRECTORY, filename);
  await fs.writeFile(absolutePath, image.buffer, { flag: "wx" });
  return {
    absolutePath,
    publicPath: `/uploads/farm-profile-images/${filename}`,
  };
}

function profileImageAbsolutePath(publicPath) {
  const value = String(publicPath || "");
  if (!value.startsWith("/uploads/farm-profile-images/")) return "";
  return path.join(PROFILE_IMAGE_DIRECTORY, path.basename(value));
}

async function removeImageQuietly(absolutePath) {
  if (!absolutePath) return;
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Farm profile image cleanup error:", error.message);
    }
  }
}

async function selectFarmProfile(farmId) {
  await ensureProfileImageColumn();
  const [rows] = await db.query(
    `
      SELECT
        farm_id,
        farm_name,
        owner_name,
        email,
        phone,
        phone_country,
        country,
        province,
        district,
        subdistrict,
        address,
        description,
        website,
        facebook,
        line_contact,
        latitude,
        longitude,
        status,
        approved_at,
        profile_image
      FROM farm
      WHERE farm_id = ?
      LIMIT 1
    `,
    [farmId]
  );
  return rows[0] || null;
}

const getMyFarmProfile = async (req, res) => {
  try {
    const farm = await selectFarmProfile(Number(req.farm.farm_id));
    if (!farm) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลฟาร์ม" });
    }
    return res.status(200).json({ success: true, data: farm });
  } catch (error) {
    console.error("Get farm profile error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถโหลดโปรไฟล์ฟาร์มได้",
      error: error.message,
    });
  }
};

const updateMyFarmProfileImage = async (req, res) => {
  let newImagePath = "";
  try {
    const farmId = Number(req.farm.farm_id);
    const imageData = String(req.body?.image_data || "");
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: "กรุณาเลือกรูปโปรไฟล์ฟาร์ม",
      });
    }

    const current = await selectFarmProfile(farmId);
    if (!current) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลฟาร์ม" });
    }

    const saved = await saveProfileImage(imageData);
    newImagePath = saved.absolutePath;
    await db.query(
      `UPDATE farm SET profile_image = ?, updated_at = NOW() WHERE farm_id = ?`,
      [saved.publicPath, farmId]
    );

    await removeImageQuietly(profileImageAbsolutePath(current.profile_image));
    const updated = await selectFarmProfile(farmId);
    return res.status(200).json({
      success: true,
      message: "บันทึกรูปโปรไฟล์ฟาร์มสำเร็จ",
      data: updated,
    });
  } catch (error) {
    await removeImageQuietly(newImagePath);
    console.error("Update farm profile image error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "ไม่สามารถบันทึกรูปโปรไฟล์ฟาร์มได้",
      ...(error.statusCode ? {} : { error: error.message }),
    });
  }
};

const deleteMyFarmProfileImage = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);
    const current = await selectFarmProfile(farmId);
    if (!current) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลฟาร์ม" });
    }

    await db.query(
      `UPDATE farm SET profile_image = NULL, updated_at = NOW() WHERE farm_id = ?`,
      [farmId]
    );
    await removeImageQuietly(profileImageAbsolutePath(current.profile_image));

    const updated = await selectFarmProfile(farmId);
    return res.status(200).json({
      success: true,
      message: "ลบรูปโปรไฟล์ฟาร์มสำเร็จ",
      data: updated,
    });
  } catch (error) {
    console.error("Delete farm profile image error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถลบรูปโปรไฟล์ฟาร์มได้",
      error: error.message,
    });
  }
};


const updateMyFarmLocation = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const inThailand =
      Number.isFinite(latitude) && Number.isFinite(longitude) &&
      latitude >= 5.4 && latitude <= 20.7 &&
      longitude >= 97.2 && longitude <= 105.8;

    if (!inThailand) {
      return res.status(400).json({
        success: false,
        message: "กรุณาปักหมุดตำแหน่งฟาร์มภายในประเทศไทย",
      });
    }

    await db.query(
      `UPDATE farm SET latitude = ?, longitude = ?, updated_at = NOW() WHERE farm_id = ?`,
      [latitude, longitude, farmId]
    );
    const updated = await selectFarmProfile(farmId);
    return res.status(200).json({
      success: true,
      message: "บันทึกตำแหน่งฟาร์มสำเร็จ",
      data: updated,
    });
  } catch (error) {
    console.error("Update farm location error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถบันทึกตำแหน่งฟาร์มได้",
      error: error.message,
    });
  }
};

module.exports = {
  getMyFarmProfile,
  updateMyFarmLocation,
  updateMyFarmProfileImage,
  deleteMyFarmProfileImage,
};
