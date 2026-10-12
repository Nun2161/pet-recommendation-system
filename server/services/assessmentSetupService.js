"use strict";

const {
  runDogAssessmentMigration,
} = require("../scripts/migrateDogAssessment");

let setupReady = false;
let setupPromise = null;
let lastFailureAt = 0;
const RETRY_DELAY_MS = 3000;

/**
 * เตรียมตารางแบบประเมินแบบปลอดภัย:
 * - ข้อมูลเดิมทั้งหมดถูกกำหนดเป็น cat
 * - ไม่ลบประวัติแมวเดิม
 * - เพิ่มและอัปเดตข้อมูลแบบประเมินสุนัขแบบ idempotent
 */
async function ensureAssessmentSetup(options = {}) {
  if (setupReady) return true;
  if (setupPromise) return setupPromise;

  const force = options.force === true;
  if (!force && Date.now() - lastFailureAt < RETRY_DELAY_MS) {
    return false;
  }

  setupPromise = runDogAssessmentMigration({ closePool: false })
    .then(() => {
      setupReady = true;
      return true;
    })
    .catch((error) => {
      lastFailureAt = Date.now();
      console.error(
        "Assessment database setup warning:",
        error.message
      );
      return false;
    })
    .finally(() => {
      setupPromise = null;
    });

  return setupPromise;
}

module.exports = {
  ensureAssessmentSetup,
};
