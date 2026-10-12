"use strict";

(() => {
  const readJSON = (storage, key) => {
    try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
  };
  const token = () =>
    sessionStorage.getItem("catmatch_token") || localStorage.getItem("catmatch_token") ||
    sessionStorage.getItem("userToken") || localStorage.getItem("userToken") ||
    sessionStorage.getItem("token") || localStorage.getItem("token") || "";
  const user = () =>
    readJSON(sessionStorage, "catmatch_user") || readJSON(localStorage, "catmatch_user") ||
    readJSON(sessionStorage, "user") || readJSON(localStorage, "user");

  function clearAuth() {
    [localStorage, sessionStorage].forEach((storage) => {
      ["catmatch_token", "userToken", "token", "catmatch_user", "user", "catmatch_role"].forEach((key) => storage.removeItem(key));
    });
  }

  function initAuth() {
    const signedIn = Boolean(token() && user());
    const guest = document.getElementById("guestNavActions");
    const signed = document.getElementById("userNavActions");
    if (guest) guest.hidden = signedIn;
    if (signed) signed.hidden = !signedIn;
    if (!signedIn) return;

    const record = user() || {};
    const displayName = String(record.username || record.full_name || record.name || "ผู้ใช้งาน").trim();
    const initial = (displayName[0] || "U").toUpperCase();
    const values = {
      userDisplayName: displayName,
      userMenuName: displayName,
      userMenuEmail: String(record.email || ""),
      userAvatar: initial,
      userMenuAvatar: initial,
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    const trigger = document.getElementById("userMenuTrigger");
    const panel = document.getElementById("userMenuPanel");
    const close = () => {
      if (!trigger || !panel) return;
      trigger.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      panel.classList.remove("is-open");
    };
    trigger?.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = trigger.getAttribute("aria-expanded") === "true";
      if (open) close();
      else if (panel) {
        panel.hidden = false;
        panel.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
    panel?.addEventListener("click", (event) => event.stopPropagation());
    document.addEventListener("click", close);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    document.getElementById("logoutButton")?.addEventListener("click", () => {
      clearAuth();
      window.location.replace("./dog-index.html");
    });
  }

  function initHeader() {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("menuToggle");
    const nav = document.querySelector(".main-nav");
    const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    toggle?.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav?.classList.toggle("is-open", !open);
      header?.classList.toggle("menu-open", !open);
    });
  }

  function initReveal() {
    const nodes = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    nodes.forEach((node) => observer.observe(node));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initAuth();
    initReveal();
  });

  window.DogMatchShared = { getToken: token, getUser: user, clearAuth };
})();
