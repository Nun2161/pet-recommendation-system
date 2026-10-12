"use strict";

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const db = require("../config/db");
const { ensureChatSetup } = require("../services/chatSetupService");
const realtime = require("../services/chatRealtimeService");

const MESSAGE_TYPES = new Set(["text", "image", "video"]);
const IMAGE_MIMES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const VIDEO_MIMES = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;
const MAX_TEXT_LENGTH = 4000;

function actorKey(actor) {
  return `${actor.type}:${actor.id}`;
}

function normalizeSpecies(value) {
  const species = String(value || "").trim().toLowerCase();
  return species === "dog" ? "dog" : species === "cat" ? "cat" : null;
}

function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function cleanUrl(value) {
  const url = String(value || "").trim();
  if (!url) return null;
  if (/^(https?:\/\/|\/uploads\/)/i.test(url)) return url.slice(0, 2000);
  return null;
}

function safeFileName(value) {
  return String(value || "ไฟล์")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .trim()
    .slice(0, 120) || "ไฟล์";
}

async function requireSetup() {
  const ready = await ensureChatSetup();
  if (!ready) {
    const error = new Error("ฐานข้อมูลแชทยังไม่พร้อม กรุณาเปิด MySQL แล้วลองใหม่");
    error.status = 503;
    throw error;
  }
}

async function getConversationParticipants(conversationId) {
  const [rows] = await db.query(
    `SELECT participant_type AS type, participant_id AS id, last_read_message_id
     FROM chat_participant
     WHERE conversation_id = ?`,
    [conversationId]
  );
  return rows.map((row) => ({
    type: row.type,
    id: Number(row.id),
    last_read_message_id: Number(row.last_read_message_id || 0),
  }));
}

async function assertParticipant(conversationId, actor) {
  const [rows] = await db.query(
    `SELECT last_read_message_id
     FROM chat_participant
     WHERE conversation_id = ? AND participant_type = ? AND participant_id = ?
     LIMIT 1`,
    [conversationId, actor.type, actor.id]
  );
  if (!rows.length) {
    const error = new Error("คุณไม่มีสิทธิ์เปิดบทสนทนานี้");
    error.status = 403;
    throw error;
  }
  return rows[0];
}

async function getChatProfileAvatar(type, id) {
  const [rows] = await db.query(
    `SELECT avatar_url FROM chat_profile
     WHERE participant_type = ? AND participant_id = ? LIMIT 1`,
    [type, id]
  );
  return String(rows[0]?.avatar_url || "").trim();
}

async function getActorProfile(type, id) {
  const chatAvatar = await getChatProfileAvatar(type, id);

  if (type === "user") {
    const [rows] = await db.query(
      `SELECT user_id AS id,
              COALESCE(NULLIF(nickname, ''), NULLIF(name, ''), NULLIF(username, ''), email, 'ผู้ใช้') AS name,
              email
       FROM users WHERE user_id = ? LIMIT 1`,
      [id]
    );
    return { ...(rows[0] || { id, name: "ผู้ใช้", email: "" }), avatar_url: chatAvatar };
  }

  if (type === "farm") {
    const [rows] = await db.query(
      `SELECT farm_id AS id, COALESCE(NULLIF(farm_name, ''), NULLIF(owner_name, ''), 'ฟาร์ม') AS name,
              email, profile_image AS avatar_url
       FROM farm WHERE farm_id = ? LIMIT 1`,
      [id]
    );
    const profile = rows[0] || { id, name: "ฟาร์ม", email: "" };
    profile.avatar_url = chatAvatar || profile.avatar_url || "";
    return profile;
  }

  const [rows] = await db.query(
    `SELECT admin_id AS id, COALESCE(NULLIF(name, ''), 'ผู้ดูแลระบบ') AS name, email
     FROM admin WHERE admin_id = ? LIMIT 1`,
    [id]
  );
  return { ...(rows[0] || { id, name: "ผู้ดูแลระบบ", email: "" }), avatar_url: chatAvatar };
}

async function hydrateConversationSubject(conversation) {
  if (!conversation || conversation.conversation_type !== "user_listing") return conversation;
  const listingId = Number(conversation.subject_id || 0);
  if (!Number.isInteger(listingId) || listingId <= 0) return conversation;

  try {
    const [rows] = await db.query(
      `SELECT listing_id, species, name, cover_image_url
       FROM user_stray_listing WHERE listing_id = ? LIMIT 1`,
      [listingId]
    );
    const listing = rows[0];
    if (!listing) return conversation;

    const species = normalizeSpecies(listing.species) || conversation.subject_species || null;
    const title = `สนใจ${listing.name || "สัตว์ในประกาศ"}`;
    const subtitle = "ติดต่อจากประกาศช่วยหาบ้าน";
    const imageUrl = cleanUrl(listing.cover_image_url) || null;

    const changed =
      String(conversation.subject_species || "") !== String(species || "") ||
      String(conversation.subject_title || "") !== title ||
      String(conversation.subject_subtitle || "") !== subtitle ||
      String(conversation.subject_image_url || "") !== String(imageUrl || "");

    conversation.subject_species = species;
    conversation.subject_title = title;
    conversation.subject_subtitle = subtitle;
    conversation.subject_image_url = imageUrl;

    if (changed) {
      void db.query(
        `UPDATE chat_conversation
         SET subject_species = ?, subject_title = ?, subject_subtitle = ?, subject_image_url = ?
         WHERE conversation_id = ?`,
        [species, title, subtitle, imageUrl, conversation.conversation_id]
      ).catch((error) => {
        console.warn("Chat listing context update warning:", error.message);
      });
    }
  } catch (error) {
    console.warn("Chat listing context load warning:", error.message);
  }
  return conversation;
}

async function serializeMessage(row, currentActor = null) {
  const sender = await getActorProfile(row.sender_type, Number(row.sender_id));
  return {
    message_id: Number(row.message_id),
    conversation_id: Number(row.conversation_id),
    sender: {
      type: row.sender_type,
      id: Number(row.sender_id),
      name: sender.name,
      avatar_url: sender.avatar_url || "",
    },
    is_mine: Boolean(
      currentActor && row.sender_type === currentActor.type && Number(row.sender_id) === Number(currentActor.id)
    ),
    message_type: row.message_type,
    text: row.text_content || "",
    media_url: row.media_url || "",
    media_name: row.media_name || "",
    media_mime: row.media_mime || "",
    media_size: Number(row.media_size || 0),
    created_at: row.created_at,
  };
}

async function getConversationSummary(conversationId, actor) {
  await assertParticipant(conversationId, actor);
  const [conversationRows] = await db.query(
    `SELECT c.*,
            (SELECT MAX(m.message_id) FROM chat_message m
             WHERE m.conversation_id = c.conversation_id AND m.deleted_at IS NULL) AS latest_message_id
     FROM chat_conversation c
     WHERE c.conversation_id = ? LIMIT 1`,
    [conversationId]
  );
  const conversation = conversationRows[0];
  if (!conversation) return null;
  await hydrateConversationSubject(conversation);

  const participants = await getConversationParticipants(conversationId);
  const counterpart = participants.find((item) => actorKey(item) !== actorKey(actor)) || null;
  const counterpartProfile = counterpart
    ? await getActorProfile(counterpart.type, counterpart.id)
    : { name: "บทสนทนา", email: "" };

  const [lastRows] = await db.query(
    `SELECT * FROM chat_message
     WHERE conversation_id = ? AND deleted_at IS NULL
     ORDER BY message_id DESC LIMIT 1`,
    [conversationId]
  );
  const lastMessage = lastRows[0] ? await serializeMessage(lastRows[0], actor) : null;

  const selfParticipant = participants.find((item) => actorKey(item) === actorKey(actor));
  const otherReadThrough = counterpart?.last_read_message_id || 0;
  const [unreadRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM chat_message
     WHERE conversation_id = ?
       AND deleted_at IS NULL
       AND message_id > ?
       AND NOT (sender_type = ? AND sender_id = ?)`,
    [conversationId, selfParticipant?.last_read_message_id || 0, actor.type, actor.id]
  );

  let lastSeenAt = null;
  if (counterpart) {
    const [presenceRows] = await db.query(
      `SELECT last_seen_at FROM chat_presence
       WHERE participant_type = ? AND participant_id = ? LIMIT 1`,
      [counterpart.type, counterpart.id]
    );
    lastSeenAt = presenceRows[0]?.last_seen_at || null;
  }

  return {
    conversation_id: Number(conversation.conversation_id),
    conversation_type: conversation.conversation_type,
    subject_id: conversation.subject_id ? Number(conversation.subject_id) : null,
    subject_species: conversation.subject_species || null,
    subject_title: conversation.subject_title || "",
    subject_subtitle: conversation.subject_subtitle || "",
    subject_image_url: conversation.subject_image_url || "",
    created_at: conversation.created_at,
    updated_at: conversation.last_message_at || conversation.updated_at,
    counterpart: counterpart ? {
      type: counterpart.type,
      id: counterpart.id,
      name: counterpartProfile.name,
      avatar_url: counterpartProfile.avatar_url || "",
      online: realtime.isOnline(counterpart),
      last_seen_at: lastSeenAt,
    } : null,
    unread_count: Number(unreadRows[0]?.total || 0),
    my_last_read_message_id: Number(selfParticipant?.last_read_message_id || 0),
    other_last_read_message_id: Number(otherReadThrough),
    latest_message_id: Number(conversation.latest_message_id || 0),
    last_message: lastMessage,
  };
}

async function findOrCreateConversation({
  key, type, subjectId, species, title, subtitle = null, imageUrl = null, participants,
}) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO chat_conversation
         (conversation_key, conversation_type, subject_id, subject_species, subject_title,
          subject_subtitle, subject_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         subject_title = VALUES(subject_title),
         subject_subtitle = VALUES(subject_subtitle),
         subject_image_url = VALUES(subject_image_url),
         subject_species = COALESCE(VALUES(subject_species), subject_species),
         updated_at = updated_at`,
      [
        key, type, subjectId || null, species || null, title || null,
        subtitle || null, cleanUrl(imageUrl),
      ]
    );
    const [rows] = await connection.query(
      `SELECT conversation_id FROM chat_conversation WHERE conversation_key = ? LIMIT 1`,
      [key]
    );
    const conversationId = Number(rows[0].conversation_id);
    for (const participant of participants) {
      await connection.query(
        `INSERT IGNORE INTO chat_participant
           (conversation_id, participant_type, participant_id)
         VALUES (?, ?, ?)`,
        [conversationId, participant.type, participant.id]
      );
    }
    await connection.commit();
    return conversationId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createConversation(req, res) {
  try {
    await requireSetup();
    const actor = req.chatActor;
    if (actor.type !== "user") {
      return res.status(403).json({ success: false, message: "เฉพาะผู้ใช้เท่านั้นที่เริ่มบทสนทนาใหม่ได้" });
    }

    const type = String(req.body.type || "").trim();
    const species = normalizeSpecies(req.body.species);
    let conversationId;

    if (type === "user_farm") {
      const farmId = Number(req.body.farm_id);
      if (!Number.isInteger(farmId) || farmId <= 0) {
        return res.status(400).json({ success: false, message: "ไม่พบฟาร์มที่ต้องการติดต่อ" });
      }
      const [rows] = await db.query(
        `SELECT farm_id, farm_name FROM farm
         WHERE farm_id = ? AND LOWER(TRIM(status)) = 'approved' LIMIT 1`,
        [farmId]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: "ไม่พบฟาร์มที่เปิดใช้งาน" });

      const animalId = Number(req.body.animal_id || 0);
      let subjectTitle = rows[0].farm_name || "ติดต่อฟาร์ม";
      let subjectSubtitle = "ติดต่อสอบถามข้อมูลจากฟาร์ม";
      let subjectImageUrl = null;
      let subjectId = farmId;

      if (Number.isInteger(animalId) && animalId > 0) {
        const [animalRows] = await db.query(
          `SELECT a.animal_id, a.animal_name, a.image_url, b.breed_name
           FROM animal a
           LEFT JOIN breed b ON b.breed_id = a.breed_id
           WHERE a.animal_id = ? AND a.farm_id = ?
             AND LOWER(TRIM(a.status)) = 'available'
           LIMIT 1`,
          [animalId, farmId]
        );
        const animal = animalRows[0];
        if (animal) {
          subjectTitle = `สนใจ${animal.animal_name || "สัตว์ในฟาร์ม"}`;
          subjectSubtitle = [
            animal.breed_name ? `สายพันธุ์ ${animal.breed_name}` : "",
            `จาก ${rows[0].farm_name || "ฟาร์ม"}`,
          ].filter(Boolean).join(" · ");
          subjectImageUrl = animal.image_url || null;
        }
      } else {
        const requestedBreed = cleanText(req.body.breed_name, 120);
        if (requestedBreed) {
          subjectTitle = `สนใจสายพันธุ์ ${requestedBreed}`;
          subjectSubtitle = `สอบถามข้อมูลจาก ${rows[0].farm_name || "ฟาร์ม"}`;
        }
      }

      conversationId = await findOrCreateConversation({
        key: `user_farm:${actor.id}:${farmId}`,
        type,
        subjectId,
        species,
        title: subjectTitle,
        subtitle: subjectSubtitle,
        imageUrl: subjectImageUrl,
        participants: [actor, { type: "farm", id: farmId }],
      });
    } else if (type === "user_listing") {
      const listingId = Number(req.body.listing_id);
      if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({ success: false, message: "ไม่พบประกาศที่ต้องการติดต่อ" });
      }
      const [rows] = await db.query(
        `SELECT listing_id, user_id, species, name, allow_web_contact, approval_status,
                cover_image_url
         FROM user_stray_listing WHERE listing_id = ? LIMIT 1`,
        [listingId]
      );
      const listing = rows[0];
      if (!listing || String(listing.approval_status).toLowerCase() !== "approved") {
        return res.status(404).json({ success: false, message: "ประกาศนี้ยังไม่พร้อมให้ติดต่อ" });
      }
      if (!Number(listing.allow_web_contact)) {
        return res.status(403).json({ success: false, message: "ผู้ลงประกาศไม่ได้เปิดรับการติดต่อผ่านแชท" });
      }
      const ownerId = Number(listing.user_id);
      if (ownerId === actor.id) {
        return res.status(400).json({ success: false, message: "ไม่สามารถเปิดแชทกับประกาศของตัวเองได้" });
      }
      conversationId = await findOrCreateConversation({
        key: `user_listing:${actor.id}:${listingId}`,
        type,
        subjectId: listingId,
        species: normalizeSpecies(listing.species) || species,
        title: `สนใจ${listing.name || "สัตว์ในประกาศ"}`,
        subtitle: "ติดต่อจากประกาศช่วยหาบ้าน",
        imageUrl: listing.cover_image_url || null,
        participants: [actor, { type: "user", id: ownerId }],
      });
    } else if (type === "user_admin") {
      const [rows] = await db.query(
        `SELECT admin_id, name FROM admin
         WHERE LOWER(TRIM(status)) = 'active'
         ORDER BY admin_id ASC LIMIT 1`
      );
      if (!rows.length) {
        return res.status(503).json({ success: false, message: "ขณะนี้ยังไม่มีผู้ดูแลระบบที่พร้อมรับข้อความ" });
      }
      const adminId = Number(rows[0].admin_id);
      conversationId = await findOrCreateConversation({
        key: `user_admin:${actor.id}:${adminId}`,
        type,
        subjectId: adminId,
        species,
        title: "ติดต่อผู้ดูแลระบบ",
        subtitle: species === "dog" ? "ฝ่ายดูแล DogMatch" : "ฝ่ายดูแล CatMatch",
        participants: [actor, { type: "admin", id: adminId }],
      });
    } else {
      return res.status(400).json({ success: false, message: "ประเภทบทสนทนาไม่ถูกต้อง" });
    }

    const conversation = await getConversationSummary(conversationId, actor);
    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    console.error("Create chat conversation error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "ไม่สามารถเริ่มบทสนทนาได้" });
  }
}

async function listConversations(req, res) {
  try {
    await requireSetup();
    const actor = req.chatActor;
    const [rows] = await db.query(
      `SELECT conversation_id FROM chat_participant
       WHERE participant_type = ? AND participant_id = ?`,
      [actor.type, actor.id]
    );
    const conversations = [];
    for (const row of rows) {
      const summary = await getConversationSummary(Number(row.conversation_id), actor);
      // ผู้ดูแลจะเห็นห้องสนทนาหลังผู้ใช้ส่งข้อความแรกแล้วเท่านั้น
      if (summary && !(actor.type === "admin" && summary.latest_message_id === 0)) {
        conversations.push(summary);
      }
    }
    conversations.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    const totalUnread = conversations.reduce((sum, item) => sum + item.unread_count, 0);
    return res.json({ success: true, total: conversations.length, unread_count: totalUnread, data: conversations });
  } catch (error) {
    console.error("List chat conversations error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "ไม่สามารถโหลดบทสนทนาได้" });
  }
}

async function listMessages(req, res) {
  try {
    await requireSetup();
    const actor = req.chatActor;
    const conversationId = Number(req.params.id);
    await assertParticipant(conversationId, actor);
    const before = Number(req.query.before || 0);
    const limit = Math.min(Math.max(Number(req.query.limit || 60), 1), 100);
    const params = [conversationId];
    let beforeClause = "";
    if (Number.isInteger(before) && before > 0) {
      beforeClause = "AND message_id < ?";
      params.push(before);
    }
    params.push(limit);
    const [rows] = await db.query(
      `SELECT * FROM chat_message
       WHERE conversation_id = ? AND deleted_at IS NULL ${beforeClause}
       ORDER BY message_id DESC LIMIT ?`,
      params
    );
    const data = [];
    for (const row of rows.reverse()) data.push(await serializeMessage(row, actor));
    const summary = await getConversationSummary(conversationId, actor);
    return res.json({ success: true, data, conversation: summary, has_more: rows.length === limit });
  } catch (error) {
    console.error("List chat messages error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "ไม่สามารถโหลดข้อความได้" });
  }
}

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64") };
}

async function saveMedia(type, dataUrl, originalName) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    const error = new Error("ไฟล์แนบไม่ถูกต้อง");
    error.status = 400;
    throw error;
  }
  const mimeMap = type === "image" ? IMAGE_MIMES : VIDEO_MIMES;
  const maxSize = type === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  const extension = mimeMap.get(parsed.mime);
  if (!extension) {
    const error = new Error(type === "image"
      ? "รองรับรูป JPG, PNG หรือ WEBP เท่านั้น"
      : "รองรับวิดีโอ MP4, WEBM หรือ MOV เท่านั้น");
    error.status = 400;
    throw error;
  }
  if (!parsed.buffer.length || parsed.buffer.length > maxSize) {
    const error = new Error(type === "image"
      ? "รูปภาพต้องมีขนาดไม่เกิน 5 MB"
      : "วิดีโอต้องมีขนาดไม่เกิน 20 MB");
    error.status = 413;
    throw error;
  }
  const now = new Date();
  const relativeDir = path.join("chat", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  const absoluteDir = path.join(__dirname, "..", "uploads", relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(absoluteDir, fileName), parsed.buffer, { flag: "wx" });
  return {
    url: `/uploads/${relativeDir.replace(/\\/g, "/")}/${fileName}`,
    name: safeFileName(originalName || fileName),
    mime: parsed.mime,
    size: parsed.buffer.length,
  };
}

async function sendMessage(req, res) {
  try {
    await requireSetup();
    const actor = req.chatActor;
    const conversationId = Number(req.params.id);
    await assertParticipant(conversationId, actor);
    const messageType = String(req.body.message_type || "text").toLowerCase();
    if (!MESSAGE_TYPES.has(messageType)) {
      return res.status(400).json({ success: false, message: "ประเภทข้อความไม่ถูกต้อง" });
    }
    const text = cleanText(req.body.text);
    let media = { url: null, name: null, mime: null, size: null };
    if (messageType === "text" && !text) {
      return res.status(400).json({ success: false, message: "กรุณาพิมพ์ข้อความ" });
    }
    if (messageType === "image" || messageType === "video") {
      media = await saveMedia(messageType, req.body.media_data_url, req.body.media_name);
    }

    const [result] = await db.query(
      `INSERT INTO chat_message
         (conversation_id, sender_type, sender_id, message_type, text_content,
          media_url, media_name, media_mime, media_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        actor.type,
        actor.id,
        messageType,
        text || null,
        media.url,
        media.name,
        media.mime,
        media.size,
      ]
    );
    await db.query(
      `UPDATE chat_conversation
       SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ?`,
      [conversationId]
    );
    const senderProfile = await getActorProfile(actor.type, actor.id);
    const message = {
      message_id: Number(result.insertId),
      conversation_id: conversationId,
      sender: {
        type: actor.type,
        id: actor.id,
        name: senderProfile.name || actor.name || "ผู้ใช้",
        avatar_url: senderProfile.avatar_url || "",
      },
      is_mine: true,
      message_type: messageType,
      text,
      media_url: media.url || "",
      media_name: media.name || "",
      media_mime: media.mime || "",
      media_size: Number(media.size || 0),
      created_at: new Date().toISOString(),
    };

    // ตอบกลับหน้าจอทันทีหลังบันทึกสำเร็จ ไม่รอ query เสริม/การกระจาย realtime
    // เพื่อไม่ให้ปุ่มส่งค้างเมื่อมีหลายแท็บเปิด EventSource พร้อมกัน
    res.status(201).json({ success: true, data: message });

    setImmediate(async () => {
      try {
        const participants = await getConversationParticipants(conversationId);
        realtime.publishToActors(participants, "message:new", { conversation_id: conversationId, message });
      } catch (error) {
        console.warn("Publish chat message warning:", error.message);
      }
    });
    return undefined;
  } catch (error) {
    console.error("Send chat message error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "ไม่สามารถส่งข้อความได้" });
  }
}

async function saveProfileAvatar(req, res) {
  try {
    await requireSetup();
    const actor = req.chatActor;
    const raw = String(req.body.avatar_url || "").trim();
    const currentAvatarUrl = await getChatProfileAvatar(actor.type, actor.id);
    let avatarUrl = "";

    if (raw) {
      if (/^data:image\//i.test(raw)) {
        const parsed = parseDataUrl(raw);
        const extension = parsed ? IMAGE_MIMES.get(parsed.mime) : null;
        if (!parsed || !extension) {
          return res.status(400).json({ success: false, message: "รองรับรูปโปรไฟล์ JPG, PNG หรือ WEBP เท่านั้น" });
        }
        if (!parsed.buffer.length || parsed.buffer.length > MAX_IMAGE_SIZE) {
          return res.status(413).json({ success: false, message: "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB" });
        }

        const relativeDir = path.join("chat-avatars", actor.type);
        const absoluteDir = path.join(__dirname, "..", "uploads", relativeDir);
        await fs.mkdir(absoluteDir, { recursive: true });

        // ใช้ชื่อไฟล์จาก hash ของรูป เพื่อให้รูปเดิมสร้างไฟล์เพียงครั้งเดียว
        const digest = crypto.createHash("sha256").update(parsed.buffer).digest("hex").slice(0, 32);
        const fileName = `${actor.id}-${digest}.${extension}`;
        const absolutePath = path.join(absoluteDir, fileName);
        try {
          await fs.writeFile(absolutePath, parsed.buffer, { flag: "wx" });
        } catch (error) {
          if (error?.code !== "EEXIST") throw error;
        }
        avatarUrl = `/uploads/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
      } else if (/^https?:\/\//i.test(raw) || raw.startsWith("/uploads/")) {
        avatarUrl = raw.slice(0, 2000);
      } else {
        return res.status(400).json({ success: false, message: "ที่อยู่รูปโปรไฟล์ไม่ถูกต้อง" });
      }
    }

    // รูปไม่เปลี่ยน: ไม่แตะฐานข้อมูล ไม่กระจาย event และไม่สร้างไฟล์ใหม่
    if (avatarUrl === currentAvatarUrl) {
      return res.json({ success: true, avatar_url: avatarUrl, unchanged: true });
    }

    await db.query(
      `INSERT INTO chat_profile (participant_type, participant_id, avatar_url)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE avatar_url = VALUES(avatar_url), updated_at = CURRENT_TIMESTAMP`,
      [actor.type, actor.id, avatarUrl || null]
    );

    const [conversationRows] = await db.query(
      `SELECT conversation_id FROM chat_participant
       WHERE participant_type = ? AND participant_id = ?`,
      [actor.type, actor.id]
    );
    for (const row of conversationRows) {
      const participants = await getConversationParticipants(Number(row.conversation_id));
      realtime.publishToActors(participants, "profile:updated", {
        actor: { type: actor.type, id: actor.id, name: actor.name },
        avatar_url: avatarUrl,
      });
    }

    return res.json({ success: true, avatar_url: avatarUrl, unchanged: false });
  } catch (error) {
    console.error("Save chat profile avatar error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "ไม่สามารถบันทึกรูปโปรไฟล์สำหรับแชทได้" });
  }
}

async function markRead(req, res) {
  try {
    await requireSetup();
    const actor = req.chatActor;
    const conversationId = Number(req.params.id);
    await assertParticipant(conversationId, actor);
    const [rows] = await db.query(
      `SELECT MAX(message_id) AS message_id FROM chat_message
       WHERE conversation_id = ? AND deleted_at IS NULL`,
      [conversationId]
    );
    const messageId = Number(rows[0]?.message_id || 0);
    await db.query(
      `UPDATE chat_participant SET last_read_message_id = ?
       WHERE conversation_id = ? AND participant_type = ? AND participant_id = ?`,
      [messageId || null, conversationId, actor.type, actor.id]
    );
    const participants = await getConversationParticipants(conversationId);
    realtime.publishToActors(participants, "conversation:read", {
      conversation_id: conversationId,
      reader: { type: actor.type, id: actor.id },
      last_read_message_id: messageId,
      read_at: new Date().toISOString(),
    });
    return res.json({ success: true, last_read_message_id: messageId });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "ไม่สามารถอัปเดตสถานะอ่านแล้วได้" });
  }
}

async function sendTyping(req, res) {
  try {
    await requireSetup();
    const actor = req.chatActor;
    const conversationId = Number(req.params.id);
    await assertParticipant(conversationId, actor);
    const participants = await getConversationParticipants(conversationId);
    realtime.publishToActors(participants, "typing", {
      conversation_id: conversationId,
      actor: { type: actor.type, id: actor.id, name: actor.name },
      typing: Boolean(req.body.typing),
    }, { exclude: actor });
    return res.json({ success: true });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "ไม่สามารถอัปเดตสถานะกำลังพิมพ์ได้" });
  }
}

async function stream(req, res) {
  try {
    await requireSetup();
    const actor = req.chatActor;
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    realtime.connect(actor, res);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.status || 500).json({ success: false, message: error.message || "ไม่สามารถเชื่อมต่อแชทเรียลไทม์ได้" });
    }
    res.end();
  }
}

module.exports = {
  createConversation,
  listConversations,
  listMessages,
  sendMessage,
  saveProfileAvatar,
  markRead,
  sendTyping,
  stream,
};
