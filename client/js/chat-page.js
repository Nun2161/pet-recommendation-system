"use strict";

(() => {
  const CAT_LOGO = `
    <svg class="cute-cat-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M17 23 14 11l10 6c5-2 11-2 16 0l10-6-3 12c4 4 6 8 6 14 0 12-9 20-21 20S11 49 11 37c0-6 2-10 6-14Z"></path>
      <path d="M24 33c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1Zm18 0c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1Z"></path>
      <path d="M30 39c1.5 1 2.5 1 4 0M32 35v2M24 40l-7 1M40 40l7 1M23 45l-6 4M41 45l6 4"></path>
    </svg>`;

  const DOG_LOGO = `
    <svg class="cute-dog-icon dogmatch-round-dog" viewBox="0 0 64 64" aria-hidden="true">
      <path class="dog-logo-ear" d="M20.2 22.2C16.5 18.7 11.4 19.1 9.8 25.1c-2 7.5.6 14.8 6.3 18 2.6 1.5 5.2.5 6.6-2.1 1.5-2.9.7-6.8.2-10.2-.5-3.4-.7-6.3-2.7-8.6Z"></path>
      <path class="dog-logo-ear" d="M43.8 22.2c3.7-3.5 8.8-3.1 10.4 2.9 2 7.5-.6 14.8-6.3 18-2.6 1.5-5.2.5-6.6-2.1-1.5-2.9-.7-6.8-.2-10.2.5-3.4.7-6.3 2.7-8.6Z"></path>
      <path class="dog-logo-face" d="M32 12.5c-10.5 0-17.4 7.4-17.4 19 0 12.8 7 21.2 17.4 21.2s17.4-8.4 17.4-21.2c0-11.6-6.9-19-17.4-19Z"></path>
      <path class="dog-logo-ear-line" d="M18.9 23.8c-1.8 3.6-2.1 8.4-1.1 12.3"></path>
      <path class="dog-logo-ear-line" d="M45.1 23.8c1.8 3.6 2.1 8.4 1.1 12.3"></path>
      <circle class="dog-logo-eye" cx="27.4" cy="31.9" r="1.55"></circle>
      <circle class="dog-logo-eye" cx="36.6" cy="31.9" r="1.55"></circle>
      <circle class="dog-logo-cheek" cx="22.7" cy="37.8" r="2.35"></circle>
      <circle class="dog-logo-cheek" cx="41.3" cy="37.8" r="2.35"></circle>
      <path class="dog-logo-nose" d="M29.5 37.5c1.6-1.15 3.4-1.15 5 0-1 1.7-1.7 2.45-2.5 2.45s-1.5-.75-2.5-2.45Z"></path>
      <path class="dog-logo-mouth" d="M32 39.9v1.25"></path>
      <path class="dog-logo-mouth" d="M32 41.1c-1.2 2.8-4.4 4-6.8 1.2"></path>
      <path class="dog-logo-mouth" d="M32 41.1c1.2 2.8 4.4 4 6.8 1.2"></path>
    </svg>`;

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector("[data-chat-app]");
    if (!root) return;

    const params = new URLSearchParams(location.search);
    const species = document.documentElement.dataset.chatSpecies === "dog" || params.get("species") === "dog" ? "dog" : "cat";
    document.documentElement.dataset.chatSpecies = species;
    root.dataset.species = species;
    document.body.dataset.species = species;
    document.body.classList.toggle("chat-page--dog", species === "dog");
    document.body.classList.toggle("chat-page--cat", species === "cat");

    const brandLink = document.getElementById("chatBrandLink");
    const accountLink = document.getElementById("chatAccountLink");
    const farmLink = document.querySelector("[data-chat-farm-link]");
    const listingLink = document.querySelector("[data-chat-listing-link]");

    const homeHref = species === "dog" ? "./dog-index.html" : "./index.html";
    if (brandLink) brandLink.href = homeHref;
    if (accountLink) accountLink.href = `./account-info.html?species=${species}`;
    if (farmLink) farmLink.href = species === "dog" ? "./dog-farm-map.html?species=dog" : "./farm-map.html";
    if (listingLink) listingLink.href = species === "dog" ? "./dog-shelter-animals.html" : "./cat-shelter-animals.html";
    document.title = `ข้อความ — ${species === "dog" ? "DogMatch" : "CatMatch"}`;

    let startRequest = null;
    const start = params.get("start");
    if (start === "farm") {
      startRequest = {
        type: "user_farm",
        farm_id: Number(params.get("farm_id")),
        animal_id: Number(params.get("animal_id") || 0) || undefined,
        breed_name: String(params.get("breed_name") || "").trim() || undefined,
        species,
      };
    } else if (start === "listing") {
      startRequest = { type: "user_listing", listing_id: Number(params.get("listing_id")), species };
    } else if (start === "admin") {
      startRequest = { type: "user_admin", species };
    }

    const token = window.CatMatchChatApi?.getToken("user");
    if (!token) {
      sessionStorage.setItem("catmatch_login_notice", "กรุณาเข้าสู่ระบบก่อนใช้งานแชท");
      const next = `${location.pathname.split("/").pop()}${location.search}`;
      location.replace(`./login.html?next=${encodeURIComponent(next)}`);
      return;
    }

    const chat = window.CatMatchChatUI.create(root, { role: "user", startRequest });
    void chat.init();

    root.querySelector("[data-chat-mobile-back]")?.addEventListener("click", () => {
      root.classList.remove("is-mobile-active");
    });
  });
})();
