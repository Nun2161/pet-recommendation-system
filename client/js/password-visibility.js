"use strict";

(() => {
  const EYE_SVG = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.8 12s3.4-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.4 5.2-9.2 5.2S2.8 12 2.8 12Z"></path>
      <circle cx="12" cy="12" r="2.7"></circle>
      <path class="password-eye-slash" d="M4 4l16 16"></path>
    </svg>`;

  function resolveInput(button) {
    const targetId = button.getAttribute("aria-controls") || button.dataset.passwordTarget;
    if (targetId) return document.getElementById(targetId);
    return button.parentElement?.querySelector('input[type="password"], input[data-password-field]') || null;
  }

  function prepareButton(button, input) {
    if (!button || !input || button.dataset.passwordReady === "true") return;

    button.dataset.passwordReady = "true";
    button.classList.add("password-visibility-toggle");
    button.setAttribute("type", "button");
    button.setAttribute("aria-controls", input.id);
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "แสดงรหัสผ่าน");
    button.title = "แสดงรหัสผ่าน";
    button.innerHTML = EYE_SVG;

    const shell = input.parentElement;
    shell?.classList.add("password-visibility-shell");

    // Ensure there is only one eye control per password field.
    shell?.querySelectorAll("button").forEach((otherButton) => {
      const isPasswordButton =
        otherButton !== button &&
        (otherButton.matches(".password-toggle, .password-toggle-icon, [data-password-toggle]") ||
          otherButton.getAttribute("aria-controls") === input.id);
      if (isPasswordButton) otherButton.remove();
    });

    button.addEventListener("click", () => {
      const showPassword = input.type === "password";
      input.type = showPassword ? "text" : "password";
      button.classList.toggle("is-visible", showPassword);
      button.setAttribute("aria-pressed", String(showPassword));
      button.setAttribute("aria-label", showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน");
      button.title = showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน";
      input.focus({ preventScroll: true });
    });
  }

  function createButton(input) {
    if (!input.id) input.id = `password-${crypto.randomUUID?.() || Date.now()}`;
    const button = document.createElement("button");
    button.dataset.passwordToggle = "true";
    input.insertAdjacentElement("afterend", button);
    return button;
  }

  function initializePasswordField(input) {
    input.dataset.passwordField = "true";
    const shell = input.parentElement;
    const candidates = shell?.querySelectorAll(
      `[data-password-toggle], .password-toggle, .password-toggle-icon, button[aria-controls="${CSS.escape(input.id)}"]`
    );
    const button = candidates?.[0] || createButton(input);
    prepareButton(button, input);
  }

  function initializeAll() {
    document
      .querySelectorAll('input[type="password"], input[data-password-field]')
      .forEach(initializePasswordField);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAll, { once: true });
  } else {
    initializeAll();
  }

  window.CatMatchPasswordVisibility = { refresh: initializeAll };
})();
