"use strict";

const db = require("../config/db");

let setupPromise = null;

async function createShelterTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shelter_center (
      shelter_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      shelter_name VARCHAR(180) NOT NULL,
      description TEXT NULL,
      phone VARCHAR(40) NULL,
      email VARCHAR(180) NULL,
      facebook_url VARCHAR(1000) NULL,
      line_contact VARCHAR(255) NULL,
      address TEXT NULL,
      province VARCHAR(120) NULL,
      latitude DECIMAL(10, 7) NULL,
      longitude DECIMAL(10, 7) NULL,
      contact_hours VARCHAR(255) NULL,
      verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_by INT NULL,
      updated_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (shelter_id),
      INDEX idx_shelter_center_status (status),
      INDEX idx_shelter_center_verification (verification_status),
      INDEX idx_shelter_center_province (province)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS shelter_animal (
      shelter_animal_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      shelter_id INT UNSIGNED NOT NULL,
      species VARCHAR(10) NOT NULL,
      name VARCHAR(150) NOT NULL,
      gender VARCHAR(20) NOT NULL DEFAULT 'unknown',
      estimated_age VARCHAR(120) NULL,
      size VARCHAR(20) NOT NULL DEFAULT 'medium',
      weight VARCHAR(80) NULL,
      province VARCHAR(120) NULL,
      cover_image_url VARCHAR(2000) NULL,
      traits_json TEXT NULL,
      health_detail TEXT NULL,
      vaccination_status VARCHAR(255) NULL,
      sterilization_status VARCHAR(255) NULL,
      personality TEXT NULL,
      background_story TEXT NULL,
      suitable_home TEXT NULL,
      adoption_status VARCHAR(30) NOT NULL DEFAULT 'available',
      is_urgent TINYINT(1) NOT NULL DEFAULT 0,
      published_by INT NULL,
      updated_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (shelter_animal_id),
      INDEX idx_shelter_animal_shelter (shelter_id),
      INDEX idx_shelter_animal_species_status (species, adoption_status),
      INDEX idx_shelter_animal_urgent (is_urgent),
      FOREIGN KEY (shelter_id)
        REFERENCES shelter_center (shelter_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_stray_listing (
      listing_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      species VARCHAR(10) NOT NULL,
      name VARCHAR(150) NOT NULL,
      gender VARCHAR(20) NOT NULL DEFAULT 'unknown',
      estimated_age VARCHAR(120) NULL,
      size VARCHAR(20) NOT NULL DEFAULT 'medium',
      weight VARCHAR(80) NULL,
      province VARCHAR(120) NOT NULL,
      location_text VARCHAR(1000) NOT NULL,
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      contact_name VARCHAR(150) NOT NULL,
      contact_phone VARCHAR(40) NULL,
      contact_social_url VARCHAR(1000) NULL,
      contact_line VARCHAR(255) NULL,
      allow_web_contact TINYINT(1) NOT NULL DEFAULT 1,
      cover_image_url VARCHAR(2000) NOT NULL,
      traits_json TEXT NULL,
      health_detail TEXT NULL,
      vaccination_status VARCHAR(255) NULL,
      sterilization_status VARCHAR(255) NULL,
      personality TEXT NULL,
      background_story TEXT NULL,
      suitable_home TEXT NULL,
      is_urgent TINYINT(1) NOT NULL DEFAULT 0,
      approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      rejection_reason TEXT NULL,
      adoption_status VARCHAR(30) NOT NULL DEFAULT 'available',
      reviewed_by INT NULL,
      reviewed_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (listing_id),
      INDEX idx_user_stray_owner (user_id),
      INDEX idx_user_stray_public (species, approval_status, adoption_status),
      INDEX idx_user_stray_review (approval_status, created_at),
      INDEX idx_user_stray_location (province),
      INDEX idx_user_stray_urgent (is_urgent)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  return true;
}

async function ensureShelterSetup(options = {}) {
  if (setupPromise && !options.force) {
    return setupPromise;
  }

  setupPromise = createShelterTables()
    .then(() => true)
    .catch((error) => {
      console.error("Shelter setup error:", error);
      setupPromise = null;
      return false;
    });

  return setupPromise;
}

module.exports = {
  ensureShelterSetup,
};
