"use strict";

(() => {
  const pageName = window.location.pathname.split("/").pop()?.toLowerCase() || "";
  const params = new URLSearchParams(window.location.search);
  const referrer = String(document.referrer || "");

  const dogOnlyPages = new Set([
    "dog-assessment.html",
    "dog-assessment-history.html"
  ]);
  const accountPages = new Set([
    "adoption-requests.html",
    "notifications.html",
    "favorites.html",
    "account-info.html",
    "settings.html"
  ]);
  const authPages = new Set([
    "login.html",
    "register.html",
    "farm-register.html",
    "forgot-password.html",
    "reset-password.html",
    "password-reset-status.html"
  ]);

  const returnTarget = String(params.get("return") || "").toLowerCase();
  let rememberedDog = false;
  try {
    rememberedDog = sessionStorage.getItem("catmatch_auth_species") === "dog";
  } catch (_) {}

  const dogContext =
    dogOnlyPages.has(pageName) ||
    params.get("species") === "dog" ||
    returnTarget.startsWith("dog") ||
    /(?:\/dog-[^/?#]+\.html|[?&]species=dog)/i.test(referrer) ||
    (authPages.has(pageName) && rememberedDog);

  if (!dogContext) return;

  document.documentElement.dataset.dogSnow = "true";
  try { sessionStorage.setItem("catmatch_auth_species", "dog"); } catch (_) {}

  const FLAKES = [
    [9,8,.57,14,3.6,-1,-33],[15,10,.69,16,4.2,-2,41],[21,12,.81,18,4.8,-3,-49],
    [27,14,.45,20,5.4,-4,57],[33,6,.57,22,3,-5,-65],[39,8,.69,24,3.6,-6,25],
    [45,10,.81,12,4.2,-7,-33],[51,12,.45,14,4.8,-8,41],[57,14,.57,16,5.4,-9,-49],
    [63,6,.69,18,3,-10,57],[69,8,.81,20,3.6,-11,-65],[75,10,.45,22,4.2,-12,25],
    [81,12,.57,24,4.8,0,-33],[87,14,.69,12,5.4,-1,41],[93,6,.81,14,3,-2,-49],
    [1,8,.45,16,3.6,-3,57],[7,10,.57,18,4.2,-4,-65],[13,12,.69,20,4.8,-5,25]
  ];

  function ensureSnow() {
    let scene = document.querySelector("body > .dog-snow-scene");
    if (!scene) {
      scene = document.createElement("div");
      scene.className = "dog-snow-scene";
      scene.setAttribute("aria-hidden", "true");
      document.body.prepend(scene);
    }
    scene.classList.remove("dog-auth-snow-scene");
    scene.replaceChildren();
    FLAKES.forEach(([left,size,opacity,duration,sway,delay,drift]) => {
      const flake = document.createElement("span");
      flake.className = "dog-snowflake";
      flake.style.cssText = `--left:${left}%;--size:${size}px;--opacity:${opacity};--duration:${duration}s;--sway:${sway}s;--delay:${delay}s;--drift:${drift}px`;
      scene.appendChild(flake);
    });
  }

  const DOG_LOGO = `
  <svg aria-label="โลโก้สุนัขหน้ากลมของ DogMatch" class="cute-dog-icon dogmatch-round-dog" role="img" viewBox="0 0 64 64">
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

  function addDogQuery(href) {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return href;
      url.searchParams.set("species", "dog");
      return `./${url.pathname.split("/").pop()}${url.search}${url.hash}`;
    } catch (_) { return href; }
  }

  function applyDogAuthHeader() {
    if (!authPages.has(pageName)) return;
    document.documentElement.dataset.authSpecies = "dog";
    document.body.classList.add("dog-auth-context");

    const brand = document.querySelector(".site-header .brand");
    if (brand) {
      brand.href = "./dog-index.html";
      brand.setAttribute("aria-label", "DogMatch หน้าแรก");
      const logo = brand.querySelector(".brand-logo");
      if (logo) logo.innerHTML = DOG_LOGO;
      const title = brand.querySelector(".brand-text strong");
      const subtitle = brand.querySelector(".brand-text small");
      if (title) title.textContent = "DogMatch";
      if (subtitle) subtitle.textContent = "สุนัขที่ใช่ สำหรับคุณ";
    }

    const nav = [...document.querySelectorAll(".site-header .main-nav .nav-link")];
    const links = [
      ["./dog-index.html", "หน้าหลัก"],
      ["./dog-assessment.html?species=dog", "แบบประเมิน"],
      ["./dog-breeds.html", "หมาของเรา"],
      ["./about.html?species=dog", "เกี่ยวกับเรา"]
    ];
    links.forEach(([href,label], index) => {
      const link = nav[index];
      if (!link) return;
      link.href = href;
      const text = link.querySelector("span");
      if (text) text.textContent = label;
    });

    document.querySelectorAll('a[href*="login.html"],a[href*="register.html"],a[href*="farm-register.html"],a[href*="forgot-password.html"]').forEach(link => {
      link.setAttribute("href", addDogQuery(link.getAttribute("href") || ""));
    });

    const loginImage = document.querySelector(".login-photo-frame img");
    if (loginImage) loginImage.src = "https://media.tag24.de/720x480/i/i/iimiidqqv60zu0z1hx7l0f9ucukz7q74.jpg";
    const registerImage = document.querySelector(".intro-photo-frame img");
    if (registerImage) {
      registerImage.src = pageName === "farm-register.html"
        ? "https://images.stockcake.com/public/d/e/a/dea0ff74-fd85-4cfe-9739-084d3276bdda_large/cozy-winter-dog-stockcake.jpg"
        : "https://tse2.mm.bing.net/th/id/OIP.grwIDi7R8O_yciwSpBtpDgHaFK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3";
      registerImage.classList.remove("intro-cat-photo");
      registerImage.classList.add("intro-dog-photo");
    }
  }

  function start() {
    ensureSnow();
    applyDogAuthHeader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("pageshow", start);
})();
