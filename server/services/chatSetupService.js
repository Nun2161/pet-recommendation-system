"use strict";

const db = require("../config/db");

let setupPromise = null;
let setupReady = false;

async function ensureColumn(tableName, columnName, definition) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  if (!rows.length) {
    await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
}

async function createChatTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_conversation (
      conversation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      conversation_key VARCHAR(190) NOT NULL,
      conversation_type VARCHAR(30) NOT NULL,
      subject_id BIGINT UNSIGNED NULL,
      subject_species VARCHAR(10) NULL,
      subject_title VARCHAR(180) NULL,
      subject_subtitle VARCHAR(255) NULL,
      subject_image_url VARCHAR(2000) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_message_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (conversation_id),
      UNIQUE KEY uq_chat_conversation_key (conversation_key),
      INDEX idx_chat_conversation_updated (last_message_at, updated_at),
      INDEX idx_chat_conversation_subject (conversation_type, subject_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureColumn("chat_conversation", "subject_subtitle", "VARCHAR(255) NULL AFTER subject_title");
  await ensureColumn("chat_conversation", "subject_image_url", "VARCHAR(2000) NULL AFTER subject_subtitle");

  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_participant (
      conversation_id BIGINT UNSIGNED NOT NULL,
      participant_type VARCHAR(10) NOT NULL,
      participant_id BIGINT UNSIGNED NOT NULL,
      last_read_message_id BIGINT UNSIGNED NULL,
      joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id, participant_type, participant_id),
      INDEX idx_chat_participant_actor (participant_type, participant_id),
      CONSTRAINT fk_chat_participant_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES chat_conversation (conversation_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_message (
      message_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      conversation_id BIGINT UNSIGNED NOT NULL,
      sender_type VARCHAR(10) NOT NULL,
      sender_id BIGINT UNSIGNED NOT NULL,
      message_type VARCHAR(10) NOT NULL DEFAULT 'text',
      text_content TEXT NULL,
      media_url VARCHAR(2000) NULL,
      media_name VARCHAR(255) NULL,
      media_mime VARCHAR(120) NULL,
      media_size INT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (message_id),
      INDEX idx_chat_message_conversation (conversation_id, message_id),
      INDEX idx_chat_message_sender (sender_type, sender_id),
      CONSTRAINT fk_chat_message_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES chat_conversation (conversation_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_presence (
      participant_type VARCHAR(10) NOT NULL,
      participant_id BIGINT UNSIGNED NOT NULL,
      last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (participant_type, participant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_profile (
      participant_type VARCHAR(10) NOT NULL,
      participant_id BIGINT UNSIGNED NOT NULL,
      avatar_url VARCHAR(2000) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (participant_type, participant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  setupReady = true;
  return true;
}

async function ensureChatSetup(options = {}) {
  if (setupReady && !options.force) return true;
  if (setupPromise) return setupPromise;

  setupPromise = createChatTables()
    .catch((error) => {
      setupReady = false;
      console.error("Chat database setup error:", error.message);
      return false;
    })
    .finally(() => {
      setupPromise = null;
    });

  return setupPromise;
}

module.exports = {
  ensureChatSetup,
};
