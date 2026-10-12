"use strict";

const db = require("../config/db");

/**
 * GET /api/notifications
 * โหลดการแจ้งเตือนของผู้ใช้ที่เข้าสู่ระบบ
 */
const getNotifications = async (req, res) => {
  try {
    const userId = Number(req.user.user_id);

    const [rows] = await db.query(
      `
        SELECT
          notification_id,
          notification_type,
          title,
          message,
          related_request_id,
          is_read,
          read_at,
          created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY
          is_read ASC,
          created_at DESC,
          notification_id DESC
      `,
      [userId]
    );

    const notifications = rows.map((row) => ({
      ...row,

      notification_id:
        Number(row.notification_id),

      related_request_id:
        row.related_request_id === null
          ? null
          : Number(row.related_request_id),

      is_read:
        Boolean(row.is_read),
    }));

    const unreadCount =
      notifications.filter(
        (notification) =>
          !notification.is_read
      ).length;

    return res.status(200).json({
      success: true,
      total: notifications.length,
      unread_count: unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถโหลดการแจ้งเตือนได้",
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * ทำเครื่องหมายว่าอ่านแล้วหนึ่งรายการ
 */
const markNotificationAsRead = async (
  req,
  res
) => {
  try {
    const userId =
      Number(req.user.user_id);

    const notificationId =
      Number(req.params.id);

    if (
      !Number.isInteger(notificationId) ||
      notificationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "notification_id ไม่ถูกต้อง",
      });
    }

    const [result] = await db.query(
      `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = COALESCE(
            read_at,
            NOW()
          )
        WHERE notification_id = ?
          AND user_id = ?
      `,
      [
        notificationId,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message:
          "ไม่พบการแจ้งเตือนนี้",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "อ่านการแจ้งเตือนแล้ว",
      notification_id:
        notificationId,
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถอัปเดตการแจ้งเตือนได้",
    });
  }
};

/**
 * PATCH /api/notifications/read-all
 * ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
 */
const markAllNotificationsAsRead = async (
  req,
  res
) => {
  try {
    const userId =
      Number(req.user.user_id);

    const [result] = await db.query(
      `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = COALESCE(
            read_at,
            NOW()
          )
        WHERE user_id = ?
          AND is_read = 0
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message:
        "อ่านการแจ้งเตือนทั้งหมดแล้ว",
      updated_count:
        Number(result.affectedRows),
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถอัปเดตการแจ้งเตือนได้",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};