const REGISTER_DRAFT_KEY = "catmatch_register_draft_v1";

document.querySelectorAll("[data-return-register]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const cameFromRegister = document.referrer.includes("register.html");

    if (cameFromRegister && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });
});
