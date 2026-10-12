"use strict";

(function showFarmRegistrationResult() {
  const nameElement = document.getElementById("successFarmName");
  if (!nameElement) return;

  try {
    const raw = sessionStorage.getItem("catmatch_farm_registration_result");
    const result = raw ? JSON.parse(raw) : null;
    if (result?.farm_name) nameElement.textContent = result.farm_name;
  } catch (_error) {
    // ใช้ข้อความเริ่มต้นเมื่ออ่านข้อมูลไม่ได้
  }
})();
