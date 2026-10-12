"use strict";

const db = require("../config/db");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ANIMAL_IMAGE_DIRECTORY = path.join(
  __dirname,
  "..",
  "uploads",
  "animal-images"
);
const MAX_ANIMAL_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function parseAnimalImageData(imageData) {
  const value = String(imageData || "").trim();
  const match = value.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/
  );
  if (!match) {
    const error = new Error("รูปภาพต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
    error.statusCode = 400;
    throw error;
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length) {
    const error = new Error("ไฟล์รูปภาพไม่ถูกต้อง");
    error.statusCode = 400;
    throw error;
  }
  if (buffer.length > MAX_ANIMAL_IMAGE_SIZE) {
    const error = new Error("รูปภาพมีขนาดใหญ่เกิน 5 MB");
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
    const error = new Error("เนื้อหาไฟล์รูปภาพไม่ถูกต้อง");
    error.statusCode = 400;
    throw error;
  }

  return {
    buffer,
    extension: IMAGE_EXTENSIONS.get(mimeType),
  };
}

async function saveAnimalImage(imageData) {
  const image = parseAnimalImageData(imageData);
  await fs.mkdir(ANIMAL_IMAGE_DIRECTORY, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}.${image.extension}`;
  const absolutePath = path.join(ANIMAL_IMAGE_DIRECTORY, filename);
  await fs.writeFile(absolutePath, image.buffer, { flag: "wx" });
  return {
    absolutePath,
    publicPath: `/uploads/animal-images/${filename}`,
  };
}

function animalImageAbsolutePath(publicPath) {
  const value = String(publicPath || "");
  if (!value.startsWith("/uploads/animal-images/")) return "";
  return path.join(ANIMAL_IMAGE_DIRECTORY, path.basename(value));
}

async function removeAnimalImageQuietly(absolutePath) {
  if (!absolutePath) return;
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Animal image cleanup error:", error.message);
    }
  }
}

async function validateBreed(breedId) {
  const [rows] = await db.query(
    `SELECT breed_id FROM breed WHERE breed_id = ? AND status = 'active' LIMIT 1`,
    [breedId]
  );
  return rows.length > 0;
}

const getMyAnimals = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);
    const [rows] = await db.query(
      `
        SELECT
          a.animal_id,
          a.farm_id,
          a.breed_id,
          a.animal_name,
          a.age_months,
          a.gender,
          a.color,
          a.description,
          a.status,
          a.image_url,
          a.created_at,
          a.updated_at,
          b.breed_name
        FROM animal AS a
        INNER JOIN breed AS b ON b.breed_id = a.breed_id
        WHERE a.farm_id = ?
        ORDER BY a.animal_id DESC
      `,
      [farmId]
    );

    const animals = rows.map((animal) => ({
      ...animal,
      animal_id: Number(animal.animal_id),
      farm_id: Number(animal.farm_id),
      breed_id: Number(animal.breed_id),
      age_months:
        animal.age_months === null ? null : Number(animal.age_months),
    }));

    return res.status(200).json({
      success: true,
      total: animals.length,
      data: animals,
    });
  } catch (error) {
    console.error("Get farm animals error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลสัตว์ของฟาร์มได้",
      error: error.message,
    });
  }
};

const createAnimal = async (req, res) => {
  let savedImagePath = "";
  try {
    const farmId = Number(req.farm.farm_id);
    const {
      breed_id,
      animal_name,
      age_months = null,
      gender = null,
      color = null,
      description = null,
      status = "available",
      image_data = "",
      image_url = null,
    } = req.body || {};

    const breedId = Number(breed_id);
    const cleanName = String(animal_name || "").trim();
    if (!Number.isInteger(breedId) || breedId <= 0) {
      return res.status(400).json({ success: false, message: "breed_id ไม่ถูกต้อง" });
    }
    if (!cleanName) {
      return res.status(400).json({ success: false, message: "กรุณากรอกชื่อสัตว์" });
    }
    if (!["available", "adopted"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status ต้องเป็น available หรือ adopted",
      });
    }
    if (!image_data && !image_url) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกรูปภาพแมว" });
    }
    if (!(await validateBreed(breedId))) {
      return res.status(404).json({ success: false, message: "ไม่พบสายพันธุ์นี้" });
    }

    let storedImageUrl = image_url || null;
    if (image_data) {
      const savedImage = await saveAnimalImage(image_data);
      savedImagePath = savedImage.absolutePath;
      storedImageUrl = savedImage.publicPath;
    }

    const [insertResult] = await db.query(
      `
        INSERT INTO animal (
          farm_id, breed_id, animal_name, age_months, gender,
          color, description, status, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        farmId,
        breedId,
        cleanName,
        age_months === null || age_months === "" ? null : Number(age_months),
        gender || null,
        color || null,
        description || null,
        status,
        storedImageUrl,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "เพิ่มข้อมูลสัตว์และรูปภาพสำเร็จ",
      animal_id: Number(insertResult.insertId),
      image_url: storedImageUrl,
    });
  } catch (error) {
    await removeAnimalImageQuietly(savedImagePath);
    console.error("Create animal error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "ไม่สามารถเพิ่มข้อมูลสัตว์ได้",
      ...(error.statusCode ? {} : { error: error.message }),
    });
  }
};

const updateAnimal = async (req, res) => {
  let newImagePath = "";
  try {
    const farmId = Number(req.farm.farm_id);
    const animalId = Number(req.params.id);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ success: false, message: "animal_id ไม่ถูกต้อง" });
    }

    const {
      breed_id,
      animal_name,
      age_months = null,
      gender = null,
      color = null,
      description = null,
      image_data = "",
      image_url,
    } = req.body || {};

    const breedId = Number(breed_id);
    const cleanName = String(animal_name || "").trim();
    if (!Number.isInteger(breedId) || breedId <= 0) {
      return res.status(400).json({ success: false, message: "breed_id ไม่ถูกต้อง" });
    }
    if (!cleanName) {
      return res.status(400).json({ success: false, message: "กรุณากรอกชื่อสัตว์" });
    }

    const [animalRows] = await db.query(
      `SELECT animal_id, image_url FROM animal WHERE animal_id = ? AND farm_id = ? LIMIT 1`,
      [animalId, farmId]
    );
    if (!animalRows.length) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสัตว์นี้ในฟาร์มของคุณ",
      });
    }
    if (!(await validateBreed(breedId))) {
      return res.status(404).json({ success: false, message: "ไม่พบสายพันธุ์นี้" });
    }

    const oldImageUrl = animalRows[0].image_url || null;
    let storedImageUrl = image_url === undefined ? oldImageUrl : image_url || null;

    if (image_data) {
      const savedImage = await saveAnimalImage(image_data);
      newImagePath = savedImage.absolutePath;
      storedImageUrl = savedImage.publicPath;
    }

    if (!storedImageUrl) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกรูปภาพแมว" });
    }

    await db.query(
      `
        UPDATE animal
        SET breed_id = ?, animal_name = ?, age_months = ?, gender = ?,
            color = ?, description = ?, image_url = ?
        WHERE animal_id = ? AND farm_id = ?
      `,
      [
        breedId,
        cleanName,
        age_months === null || age_months === "" ? null : Number(age_months),
        gender || null,
        color || null,
        description || null,
        storedImageUrl,
        animalId,
        farmId,
      ]
    );

    if (image_data && oldImageUrl && oldImageUrl !== storedImageUrl) {
      await removeAnimalImageQuietly(animalImageAbsolutePath(oldImageUrl));
    }

    return res.status(200).json({
      success: true,
      message: "แก้ไขข้อมูลสัตว์สำเร็จ",
      image_url: storedImageUrl,
    });
  } catch (error) {
    await removeAnimalImageQuietly(newImagePath);
    console.error("Update animal error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "ไม่สามารถแก้ไขข้อมูลสัตว์ได้",
      ...(error.statusCode ? {} : { error: error.message }),
    });
  }
};

const updateAnimalStatus = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);
    const animalId = Number(req.params.id);
    const { status } = req.body || {};
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ success: false, message: "animal_id ไม่ถูกต้อง" });
    }
    if (!["available", "adopted"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status ต้องเป็น available หรือ adopted",
      });
    }

    const [result] = await db.query(
      `UPDATE animal SET status = ? WHERE animal_id = ? AND farm_id = ?`,
      [status, animalId, farmId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสัตว์นี้ในฟาร์มของคุณ",
      });
    }
    return res.status(200).json({
      success: true,
      message: "เปลี่ยนสถานะสัตว์สำเร็จ",
    });
  } catch (error) {
    console.error("Update animal status error:", error);
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถเปลี่ยนสถานะสัตว์ได้",
      error: error.message,
    });
  }
};

const deleteAnimal = async (req, res) => {
  try {
    const farmId = Number(req.farm.farm_id);
    const animalId = Number(req.params.id);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ success: false, message: "animal_id ไม่ถูกต้อง" });
    }

    const [rows] = await db.query(
      `SELECT image_url FROM animal WHERE animal_id = ? AND farm_id = ? LIMIT 1`,
      [animalId, farmId]
    );
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสัตว์นี้ในฟาร์มของคุณ",
      });
    }

    const [result] = await db.query(
      `DELETE FROM animal WHERE animal_id = ? AND farm_id = ?`,
      [animalId, farmId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสัตว์นี้ในฟาร์มของคุณ",
      });
    }

    await removeAnimalImageQuietly(animalImageAbsolutePath(rows[0].image_url));
    return res.status(200).json({
      success: true,
      message: "ลบข้อมูลสัตว์สำเร็จ",
    });
  } catch (error) {
    console.error("Delete animal error:", error);
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "ไม่สามารถลบแมวที่มีประวัติคำขออุปการะได้ กรุณาเปลี่ยนสถานะแทน",
      });
    }
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถลบข้อมูลสัตว์ได้",
      error: error.message,
    });
  }
};

module.exports = {
  getMyAnimals,
  createAnimal,
  updateAnimal,
  updateAnimalStatus,
  deleteAnimal,
};
