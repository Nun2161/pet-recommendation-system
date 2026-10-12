"use strict";

const express = require("express");
const userAuth =
  require("../middleware/userAuth");

const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require(
  "../controllers/notificationController"
);

const router = express.Router();

router.use(userAuth);

router.get(
  "/",
  getNotifications
);

router.patch(
  "/read-all",
  markAllNotificationsAsRead
);

router.patch(
  "/:id/read",
  markNotificationAsRead
);

module.exports = router;