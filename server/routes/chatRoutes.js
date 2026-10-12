"use strict";

const express = require("express");
const { authenticateChat } = require("../middleware/chatAuth");
const controller = require("../controllers/chatController");

const router = express.Router();

router.get("/stream", authenticateChat, controller.stream);
router.get("/conversations", authenticateChat, controller.listConversations);
router.post("/conversations", authenticateChat, controller.createConversation);
router.post("/profile/avatar", authenticateChat, controller.saveProfileAvatar);
router.get("/conversations/:id/messages", authenticateChat, controller.listMessages);
router.post("/conversations/:id/messages", authenticateChat, controller.sendMessage);
router.post("/conversations/:id/read", authenticateChat, controller.markRead);
router.post("/conversations/:id/typing", authenticateChat, controller.sendTyping);

module.exports = router;
