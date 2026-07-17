const db = require("../config/db");

const ALLOWED_INTERESTS = new Set(["assessment", "breeds", "farms"]);

const parseStoredInterests = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getOnboardingStatus = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT onboarding_completed, user_interests
        FROM users
        WHERE user_id = ?
        LIMIT 1
      `,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบบัญชีผู้ใช้งาน" });
    }

    const user = rows[0];
    return res.json({
      success: true,
      onboarding_completed: Boolean(Number(user.onboarding_completed)),
      needs_interest_onboarding: Number(user.onboarding_completed) === 0,
      interests: parseStoredInterests(user.user_interests),
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถตรวจสอบการตั้งค่าเริ่มต้นได้" });
  }
};

const completeInterestOnboarding = async (req, res) => {
  try {
    const rawInterests = Array.isArray(req.body?.interests) ? req.body.interests : [];
    const skipped = req.body?.skipped === true;
    const interests = [...new Set(rawInterests.map(String))].filter((item) => ALLOWED_INTERESTS.has(item));

    if (!skipped && interests.length === 0) {
      return res.status(400).json({
        success: false,
        message: "กรุณาเลือกอย่างน้อย 1 รายการ",
      });
    }

    await db.query(
      `
        UPDATE users
        SET user_interests = ?,
            onboarding_completed = 1,
            onboarding_completed_at = NOW(),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      [JSON.stringify(interests), req.user.user_id]
    );

    return res.json({
      success: true,
      message: skipped ? "ข้ามการตั้งค่าเรียบร้อยแล้ว" : "บันทึกความสนใจเรียบร้อยแล้ว",
      onboarding_completed: true,
      interests,
    });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return res.status(500).json({ success: false, message: "ไม่สามารถบันทึกความสนใจได้" });
  }
};

module.exports = {
  getOnboardingStatus,
  completeInterestOnboarding,
};
