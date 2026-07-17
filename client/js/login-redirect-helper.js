/**
 * เรียกฟังก์ชันนี้หลัง Login สำเร็จ
 * ถ้ายังไม่เคยเลือกความสนใจ ระบบจะพาไปหน้า interests.html ก่อน
 */
function redirectAfterSuccessfulLogin() {
  const completed = localStorage.getItem("catmatch_interest_onboarding_done") === "true";
  window.location.href = completed ? "./index.html" : "./interests.html";
}

window.redirectAfterSuccessfulLogin = redirectAfterSuccessfulLogin;
