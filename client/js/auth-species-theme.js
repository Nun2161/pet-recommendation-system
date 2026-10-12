"use strict";

(() => {
  const parameters = new URLSearchParams(window.location.search);
  const referrer = String(document.referrer || "");
  const pageName = window.location.pathname.split("/").pop() || "";
  const isResetContinuation = /^(?:reset-password|password-reset-status)\.html$/i.test(pageName);
  const explicitSpecies = String(parameters.get("species") || "").toLowerCase();
  const explicitPortal = String(parameters.get("portal") || "").toLowerCase();

  // An explicit CatMatch link must always remain CatMatch, even when the user
  // previously visited DogMatch or the referrer contains stale dog context.
  if (explicitSpecies === "cat" || explicitPortal === "cat") {
    document.documentElement.dataset.authSpecies = "cat";
    try {
      sessionStorage.setItem("catmatch_auth_species", "cat");
      localStorage.removeItem("dogmatch_password_reset_context");
    } catch (_error) {}
    return;
  }

  let rememberedDogReset = false;
  try {
    const remembered = JSON.parse(localStorage.getItem("dogmatch_password_reset_context") || "null");
    rememberedDogReset = Boolean(
      remembered &&
      remembered.species === "dog" &&
      Number(remembered.expiresAt || 0) > Date.now()
    );
  } catch {}

  let rememberedPortalSpecies = "";
  try {
    rememberedPortalSpecies = String(sessionStorage.getItem("catmatch_auth_species") || "").toLowerCase();
  } catch (_error) {}

  const dogEntry =
    parameters.get("species") === "dog" ||
    String(parameters.get("return") || "").toLowerCase().startsWith("dog") ||
    /(?:\/dog-[^/?#]+\.html|[?&]species=dog)/i.test(referrer) ||
    (pageName === "farm-pending.html" && rememberedPortalSpecies === "dog") ||
    (isResetContinuation && rememberedDogReset);

  if (!dogEntry) return;

  document.documentElement.dataset.authSpecies = "dog";
  try {
    sessionStorage.setItem("catmatch_auth_species", "dog");
    localStorage.setItem("dogmatch_password_reset_context", JSON.stringify({
      species: "dog",
      expiresAt: Date.now() + 30 * 60 * 1000
    }));
  } catch {}

  if (parameters.get("species") !== "dog") {
    parameters.set("species", "dog");
    const nextUrl = `${window.location.pathname}?${parameters.toString()}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
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

  // Exact navigation markup copied from dog-index.html.
  const DOG_MAIN_NAV = `
    <a class="nav-link" href="./dog-index.html">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6"></path></svg>
      <span>หน้าหลัก</span>
    </a>
    <a class="nav-link" href="./dog-assessment.html?species=dog">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 4h12v16H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path><path d="m16 15 1.5 1.5L20 13.5"></path></svg>
      <span>แบบประเมิน</span>
    </a>
    <a class="nav-link" href="./dog-breeds.html">
      <svg aria-hidden="true" class="dogmatch-round-dog-nav" viewBox="0 0 64 64">
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
      </svg>
      <span>หมาของเรา</span>
    </a>
    <a class="nav-link" href="./about.html?species=dog">
      <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4-4"></path></svg>
      <span>เกี่ยวกับเรา</span>
    </a>`;

  const withDogContext = (href, options = {}) => {
    try {
      const url = new URL(href, window.location.href);
      url.searchParams.set("species", "dog");
      if (options.fresh) url.searchParams.set("fresh", "1");
      const returnValue = parameters.get("return");
      if (returnValue && !url.searchParams.has("return")) {
        url.searchParams.set("return", returnValue);
      }
      return `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
    } catch {
      return href;
    }
  };

  const replaceVisibleWords = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      node.nodeValue = node.nodeValue
        .replaceAll("CatMatch", "DogMatch")
        .replaceAll("แมว", "สุนัข");
    });
  };

  const rewriteDogFlowLinks = () => {
    document.querySelectorAll('a[href="./index.html"], a[href="index.html"]').forEach((link) => {
      link.href = "./dog-index.html";
    });

    const rules = [
      ['a[href*="login.html"]', false],
      ['a[href*="register.html"]', true],
      ['a[href*="farm-register.html"]', false],
      ['a[href*="forgot-password.html"]', false],
      ['a[href*="reset-password.html"]', false],
      ['a[href*="password-reset-status.html"]', false]
    ];

    rules.forEach(([selector, fresh]) => {
      document.querySelectorAll(selector).forEach((link) => {
        const raw = link.getAttribute("href") || "";
        if (!raw || raw.startsWith("#") || raw.startsWith("javascript:")) return;
        link.href = `./${withDogContext(raw, { fresh })}`;
      });
    });
  };

  const applyDogResetHeader = () => {
    const brand = document.querySelector(".reset-brand");
    if (brand) {
      brand.href = "./dog-index.html";
      const strong = brand.querySelector("strong");
      const small = brand.querySelector("small");
      if (strong) strong.textContent = "DogMatch";
      if (small) small.textContent = "สุนัขที่ใช่ สำหรับคุณ";
    }

    document.querySelectorAll('.reset-header-link, .reset-back-link').forEach((link) => {
      const raw = link.getAttribute("href") || "./login.html";
      if (/index\.html/i.test(raw)) {
        link.href = "./dog-index.html";
      } else {
        link.href = `./${withDogContext(raw)}`;
      }
    });
  };

  const applyDogHeader = () => {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const brand = header.querySelector(".brand");
    if (brand) {
      brand.href = "./dog-index.html";
      brand.setAttribute("aria-label", "DogMatch หน้าแรก");
      brand.innerHTML = `
        <span aria-hidden="true" class="brand-logo">${DOG_LOGO}</span>
        <span class="brand-text">
          <strong>DogMatch</strong>
          <small>สุนัขที่ใช่ สำหรับคุณ</small>
        </span>`;
    }

    const mainNav = header.querySelector(".main-nav");
    if (mainNav) {
      mainNav.id = "mainNav";
      mainNav.setAttribute("aria-label", "เมนูหลัก");
      mainNav.innerHTML = DOG_MAIN_NAV;
    }

    const navShell = header.querySelector(".nav-shell");
    if (navShell) navShell.classList.add("dog-index-header-copy");

    rewriteDogFlowLinks();
  };

  const applyDogContent = () => {
    document.body.classList.add("dog-auth-context");
    const pageCopy = {
      "login.html": [
        "เข้าสู่ระบบ — DogMatch",
        "เข้าสู่ระบบ DogMatch เพื่อดูผลแบบประเมิน สุนัขที่สนใจ และข้อมูลบัญชีของคุณ"
      ],
      "register.html": [
        "สมัครสมาชิก — DogMatch",
        "สมัครสมาชิก DogMatch เพื่อทำแบบประเมิน บันทึกสุนัขที่สนใจ และค้นหาฟาร์มใกล้คุณ"
      ],
      "farm-register.html": [
        "ลงทะเบียนฟาร์มสุนัข — DogMatch",
        "ลงทะเบียนฟาร์มสุนัขใน DogMatch และส่งข้อมูลเพื่อรอการตรวจสอบ"
      ],
      "farm-pending.html": [
        "สถานะคำขอฟาร์มสุนัข — DogMatch",
        "ติดตามสถานะคำขอลงทะเบียนฟาร์มสุนัข DogMatch"
      ],
      "forgot-password.html": [
        "ลืมรหัสผ่าน — DogMatch",
        "ขอลิงก์ตั้งรหัสผ่านใหม่สำหรับบัญชี DogMatch"
      ],
      "reset-password.html": [
        "ตั้งรหัสผ่านใหม่ — DogMatch",
        "ตั้งรหัสผ่านใหม่สำหรับบัญชี DogMatch"
      ],
      "password-reset-status.html": [
        "สถานะคำขอเปลี่ยนรหัสผ่าน — DogMatch",
        "ตรวจสอบสถานะคำขอเปลี่ยนรหัสผ่าน DogMatch"
      ]
    };
    const [title, description] = pageCopy[pageName] || ["DogMatch", "DogMatch"];
    document.title = title;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = description;

    replaceVisibleWords(document.body);
    applyDogHeader();
    applyDogResetHeader();
    rewriteDogFlowLinks();

    const loginImage = document.querySelector(".login-photo-frame img");
    if (loginImage) {
      loginImage.src = "https://media.tag24.de/720x480/i/i/iimiidqqv60zu0z1hx7l0f9ucukz7q74.jpg";
      loginImage.alt = "สุนัขในบรรยากาศอบอุ่นสำหรับหน้าเข้าสู่ระบบ DogMatch";
    }

    const registerImage = document.querySelector(".intro-photo-frame img");
    if (registerImage) {
      registerImage.src = pageName === "farm-register.html"
        ? "https://images.stockcake.com/public/d/e/a/dea0ff74-fd85-4cfe-9739-084d3276bdda_large/cozy-winter-dog-stockcake.jpg"
        : "https://tse2.mm.bing.net/th/id/OIP.grwIDi7R8O_yciwSpBtpDgHaFK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3";
      registerImage.alt = "สุนัขสำหรับหน้าสมัครสมาชิกและลงทะเบียนฟาร์ม DogMatch";
      registerImage.classList.remove("intro-cat-photo");
      registerImage.classList.add("intro-dog-photo");
    }
    rewriteDogFlowLinks();

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "characterData" && record.target?.nodeValue) {
          const next = record.target.nodeValue
            .replaceAll("CatMatch", "DogMatch")
            .replaceAll("แมว", "สุนัข");
          if (next !== record.target.nodeValue) record.target.nodeValue = next;
        }
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const next = String(node.nodeValue || "")
              .replaceAll("CatMatch", "DogMatch")
              .replaceAll("แมว", "สุนัข");
            if (next !== node.nodeValue) node.nodeValue = next;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            replaceVisibleWords(node);
          }
        });
      });
      rewriteDogFlowLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDogContent, { once: true });
  } else {
    applyDogContent();
  }
})();
