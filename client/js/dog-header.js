"use strict";

(() => {
  const DOG_ACCOUNT_PAGES = new Set([
    "adoption-requests.html",
    "notifications.html",
    "favorites.html",
    "account-info.html",
    "settings.html",
    "about.html"
  ]);

  const readJSON = (storage, key) => {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  const getToken = () =>
    sessionStorage.getItem("catmatch_token") ||
    localStorage.getItem("catmatch_token") ||
    sessionStorage.getItem("userToken") ||
    localStorage.getItem("userToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    "";

  const getUser = () => {
    const records = [
      readJSON(sessionStorage, "catmatch_user"),
      readJSON(sessionStorage, "user"),
      readJSON(localStorage, "catmatch_user"),
      readJSON(localStorage, "user"),
    ].filter(Boolean);
    if (!records.length) return null;

    const activeUid = String(
      sessionStorage.getItem("catmatch_auth_uid") ||
      localStorage.getItem("catmatch_auth_uid") ||
      ""
    ).trim();
    const activeEmail = String(
      sessionStorage.getItem("catmatch_auth_email") ||
      localStorage.getItem("catmatch_auth_email") ||
      ""
    ).trim().toLowerCase();

    const matching = records.filter((record) => {
      const uid = String(record?.firebase_uid || record?.uid || "").trim();
      const email = String(record?.email || "").trim().toLowerCase();
      let comparable = false;
      if (activeUid && uid) {
        comparable = true;
        if (activeUid !== uid) return false;
      }
      if (activeEmail && email) {
        comparable = true;
        if (activeEmail !== email) return false;
      }
      return comparable;
    });
    if (!matching.length) return records[0];

    const merged = Object.assign({}, ...matching.slice().reverse());
    const googlePhotoRecord = matching.find((record) =>
      String(record?.google_photo_uid || "").trim() === activeUid &&
      /^https?:\/\//i.test(String(record?.google_photo_url || "").trim())
    );
    if (googlePhotoRecord) {
      merged.google_photo_uid = googlePhotoRecord.google_photo_uid;
      merged.google_photo_url = googlePhotoRecord.google_photo_url;
    }
    return merged;
  };

  const clearAuth = () => {
    [localStorage, sessionStorage].forEach((storage) => {
      [
        "catmatch_token",
        "userToken",
        "token",
        "catmatch_user",
        "user",
        "catmatch_role",
        "catmatch_auth_uid",
        "catmatch_auth_user_id",
        "catmatch_auth_email"
      ].forEach((key) => storage.removeItem(key));
    });
  };

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const resolveImageUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(data:|blob:|https?:)/i.test(raw)) return raw;

    const apiBase = String(
      window.CATMATCH_API_BASE_URL ||
      window.CATMATCH_API_URL ||
      "http://localhost:3000"
    )
      .replace(/\/api\/?$/i, "")
      .replace(/\/+$/, "");

    return raw.startsWith("/")
      ? `${apiBase}${raw}`
      : `${apiBase}/${raw}`;
  };

  const getFirebaseGooglePhoto = (firebaseUser = null) => {
    if (!firebaseUser) return "";
    const googleProvider = Array.isArray(firebaseUser.providerData)
      ? firebaseUser.providerData.find((provider) => provider?.providerId === "google.com")
      : null;
    const value = String(googleProvider?.photoURL || firebaseUser.photoURL || "").trim();
    return /^https?:\/\//i.test(value) ? value : "";
  };

  const getProfileImage = (user = {}) => {
    const uid = String(user.firebase_uid || user.uid || "").trim();
    const userId = Number(user.user_id || user.id || 0);
    const email = String(user.email || "").trim().toLowerCase();
    const identity = uid || (Number.isInteger(userId) && userId > 0 ? `user:${userId}` : (email ? `email:${email}` : ""));
    const scopedKey = identity ? `catmatch_profile_image:${identity}` : "";
    const legacyOwner = String(localStorage.getItem("catmatch_profile_image_owner") || "").trim();
    const storedImage =
      (scopedKey && (localStorage.getItem(scopedKey) || sessionStorage.getItem(scopedKey))) ||
      (identity && legacyOwner === identity ? localStorage.getItem("catmatch_profile_image") : "") ||
      "";
    if (storedImage) return resolveImageUrl(storedImage);

    const firebaseUser = window.catmatchFirebase?.auth?.currentUser || null;
    if (firebaseUser?.uid) {
      const firebaseEmail = String(firebaseUser.email || "").trim().toLowerCase();
      const sameAccount =
        (uid && firebaseUser.uid === uid) ||
        (!uid && email && firebaseEmail && email === firebaseEmail);
      if (!sameAccount) return "";
      return getFirebaseGooglePhoto(firebaseUser);
    }

    const ownerUid = String(user.google_photo_uid || "").trim();
    const storedGooglePhoto = String(user.google_photo_url || "").trim();
    if (uid && ownerUid === uid && /^https?:\/\//i.test(storedGooglePhoto)) {
      return storedGooglePhoto;
    }

    return "";
  };

  const renderAvatar = (element, imageUrl, initial, displayName) => {
    if (!element) return;

    element.style.overflow = "hidden";
    element.style.padding = "0";
    element.style.borderRadius = "50%";

    if (!imageUrl) {
      element.textContent = initial;
      return;
    }

    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `รูปโปรไฟล์ ${displayName}`;
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    image.style.display = "block";
    image.style.borderRadius = "inherit";
    image.addEventListener(
      "error",
      () => {
        element.textContent = initial;
      },
      { once: true }
    );
    element.replaceChildren(image);
  };

  const dogAccountUrl = (href) => {
    try {
      const url = new URL(href, window.location.href);
      const page = url.pathname.split("/").pop()?.toLowerCase() || "";
      if (!DOG_ACCOUNT_PAGES.has(page)) return href;
      url.searchParams.set("species", "dog");
      return `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
    } catch {
      return href;
    }
  };

  const applyDogAccountLinks = (header) => {
    header.querySelectorAll("a[href]").forEach((link) => {
      const rawHref = link.getAttribute("href") || "";
      const nextHref = dogAccountUrl(rawHref);
      if (nextHref) link.setAttribute("href", nextHref.startsWith(".") ? nextHref : `./${nextHref}`);

      if (/\/(?:login|register)\.html|^(?:\.\/)?(?:login|register)\.html/i.test(rawHref)) {
        try {
          const authUrl = new URL(rawHref, window.location.href);
          authUrl.searchParams.set("species", "dog");
          const pageName = authUrl.pathname.split("/").pop();
          link.setAttribute("href", `./${pageName}${authUrl.search}${authUrl.hash}`);
        } catch {
          /* Keep the original link if the URL cannot be parsed. */
        }
      }
    });

    const settingsButton = document.getElementById("accountSettingsButton");
    if (settingsButton && settingsButton.dataset.dogSettingsBound !== "true") {
      settingsButton.dataset.dogSettingsBound = "true";
      settingsButton.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.location.href = "./settings.html?species=dog";
        },
        true
      );
    }
  };

  const init = () => {
    const header = document.getElementById("siteHeader");
    if (!header || header.dataset.dogHeaderReady === "true") return;
    header.dataset.dogHeaderReady = "true";

    const mainNav = document.getElementById("mainNav") || header.querySelector(".main-nav");
    const menuToggle = document.getElementById("menuToggle");
    const guestActions = document.getElementById("guestNavActions");
    const userActions = document.getElementById("userNavActions");
    const userMenuTrigger = document.getElementById("userMenuTrigger");
    const userMenuPanel = document.getElementById("userMenuPanel");

    applyDogAccountLinks(header);

    const closeMobileMenu = () => {
      menuToggle?.setAttribute("aria-expanded", "false");
      mainNav?.classList.remove("is-open");
      header.classList.remove("menu-open");
    };

    const closeUserMenu = () => {
      userMenuTrigger?.setAttribute("aria-expanded", "false");
      if (userMenuPanel) {
        userMenuPanel.hidden = true;
        userMenuPanel.classList.remove("is-open");
      }
    };

    menuToggle?.addEventListener(
      "click",
      (event) => {
        event.stopImmediatePropagation();
        const open = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!open));
        mainNav?.classList.toggle("is-open", !open);
        header.classList.toggle("menu-open", !open);
        if (!open) closeUserMenu();
      },
      true
    );

    mainNav?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMobileMenu);
    });

    const signedIn = Boolean(getToken() && getUser());
    if (guestActions) guestActions.hidden = signedIn;
    if (userActions) userActions.hidden = !signedIn;

    const syncUser = () => {
      if (!signedIn) return;
      const user = getUser() || {};
      const displayName = String(
        user.username || user.full_name || user.name || user.nickname || "ผู้ใช้งาน"
      ).trim();
      const email = String(user.email || "");
      const initial = (displayName[0] || "U").toUpperCase();
      const imageUrl = getProfileImage(user);

      setText("userDisplayName", displayName);
      setText("userMenuName", displayName);
      setText("userMenuEmail", email);
      renderAvatar(document.getElementById("userAvatar"), imageUrl, initial, displayName);
      renderAvatar(document.getElementById("userMenuAvatar"), imageUrl, initial, displayName);
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("catmatch:profile-image-updated", syncUser);
    window.addEventListener("catmatch:user-session", syncUser);
    window.addEventListener("pageshow", syncUser);

    const firebaseAuth = window.catmatchFirebase?.auth;
    if (firebaseAuth?.onIdTokenChanged) {
      firebaseAuth.onIdTokenChanged((firebaseUser) => {
        if (firebaseUser) {
          window.CatMatchUserSession?.syncGooglePhotoToStoredUser?.(firebaseUser);
        }
        syncUser();
      });
    }

    userMenuTrigger?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const open = userMenuTrigger.getAttribute("aria-expanded") === "true";
        if (open) {
          closeUserMenu();
        } else if (userMenuPanel) {
          userMenuPanel.hidden = false;
          userMenuPanel.classList.add("is-open");
          userMenuTrigger.setAttribute("aria-expanded", "true");
        }
      },
      true
    );

    userMenuPanel?.addEventListener("click", (event) => event.stopPropagation());

    document.getElementById("logoutButton")?.addEventListener(
      "click",
      async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (window.CatMatchUserSession?.logout) {
          await window.CatMatchUserSession.logout({ redirectTo: "./dog-index.html" });
          return;
        }

        clearAuth();
        await window.catmatchFirebase?.signOut?.().catch(() => {});
        window.location.replace("./dog-index.html");
      },
      true
    );

    document.addEventListener("click", closeUserMenu);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeUserMenu();
        closeMobileMenu();
      }
    });

    const updateHeaderShadow = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    updateHeaderShadow();
    window.addEventListener("scroll", updateHeaderShadow, { passive: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
