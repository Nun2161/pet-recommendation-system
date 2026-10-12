"use strict";

(() => {
  const LEGACY_STORAGE_KEY = "catmatch_profile_image";
  const PROFILE_IMAGE_OWNER_KEY = "catmatch_profile_image_owner";
  const PROFILE_IMAGE_INDEX_KEY = "catmatch_profile_image_index_v3";
  const LEGACY_PROFILE_IMAGE_INDEX_KEY = "catmatch_profile_image_index_v2";
  const SCOPED_OWNER_PREFIX = "catmatch_profile_image_owner_v3:";

  function getUserIdentityAliases(user = readStoredUser()) {
    const aliases = [];
    const uid = String(user?.firebase_uid || user?.uid || "").trim();
    const userId = Number(user?.user_id || user?.id || 0);
    const email = String(user?.email || "").trim().toLowerCase();

    if (uid) aliases.push(uid);
    if (Number.isInteger(userId) && userId > 0) aliases.push(`user:${userId}`);
    if (email) aliases.push(`email:${email}`);
    return [...new Set(aliases)];
  }

  function getUserIdentity(user = readStoredUser()) {
    return getUserIdentityAliases(user)[0] || "";
  }

  function getProfileImageStorageKey(user = readStoredUser()) {
    const identity = getUserIdentity(user);
    return identity ? `${LEGACY_STORAGE_KEY}:${identity}` : "";
  }

  function readIndexFrom(key) {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const value = JSON.parse(storage.getItem(key) || "{}");
        if (value && typeof value === "object" && !Array.isArray(value)) return value;
      } catch (_error) {}
    }
    return {};
  }

  function readProfileImageIndex() {
    return readIndexFrom(PROFILE_IMAGE_INDEX_KEY);
  }

  function readLegacyProfileImageIndex() {
    return readIndexFrom(LEGACY_PROFILE_IMAGE_INDEX_KEY);
  }

  function writeProfileImageIndex(index) {
    try {
      localStorage.setItem(PROFILE_IMAGE_INDEX_KEY, JSON.stringify(index || {}));
    } catch (_error) {}
  }

  function readScopedOwner(identity) {
    if (!identity) return "";
    for (const storage of [sessionStorage, localStorage]) {
      const owner = String(storage.getItem(`${SCOPED_OWNER_PREFIX}${identity}`) || "").trim();
      if (owner) return owner;
    }
    return "";
  }

  function writeScopedOwner(identity, owner) {
    if (!identity || !owner) return;
    try {
      localStorage.setItem(`${SCOPED_OWNER_PREFIX}${identity}`, owner);
    } catch (_error) {
      try { sessionStorage.setItem(`${SCOPED_OWNER_PREFIX}${identity}`, owner); } catch (_sessionError) {}
    }
  }

  function readLegacyOwner() {
    return String(
      localStorage.getItem(PROFILE_IMAGE_OWNER_KEY) ||
      sessionStorage.getItem(PROFILE_IMAGE_OWNER_KEY) ||
      ""
    ).trim();
  }

  function ownerMatchesCurrent(owner, aliases) {
    return Boolean(owner && aliases.includes(owner));
  }

  function registerProfileImageAliases(user, canonicalIdentity) {
    if (!canonicalIdentity) return;
    const index = readProfileImageIndex();
    getUserIdentityAliases(user).forEach((alias) => {
      index[alias] = canonicalIdentity;
    });
    writeProfileImageIndex(index);
  }

  function readCustomProfileImage(user = readStoredUser()) {
    const aliases = getUserIdentityAliases(user);
    const canonicalIdentity = aliases[0] || "";
    if (!canonicalIdentity) return "";

    const index = readProfileImageIndex();
    const legacyIndex = readLegacyProfileImageIndex();
    const identities = [...new Set([
      canonicalIdentity,
      ...aliases,
      ...aliases.map((alias) => index[alias]).filter(Boolean),
      ...aliases.map((alias) => legacyIndex[alias]).filter(Boolean),
    ])];
    const legacyOwner = readLegacyOwner();
    let indexChanged = false;

    for (const identity of identities) {
      const key = `${LEGACY_STORAGE_KEY}:${identity}`;
      let imageData = "";
      for (const storage of [sessionStorage, localStorage]) {
        imageData = storage.getItem(key) || "";
        if (imageData) break;
      }
      if (!imageData) continue;

      const scopedOwner = readScopedOwner(identity);
      const owner = scopedOwner || legacyOwner;
      if (!ownerMatchesCurrent(owner, aliases)) {
        aliases.forEach((alias) => {
          if (index[alias] === identity) {
            delete index[alias];
            indexChanged = true;
          }
        });
        continue;
      }

      const canonicalKey = `${LEGACY_STORAGE_KEY}:${canonicalIdentity}`;
      if (key !== canonicalKey) {
        try { localStorage.setItem(canonicalKey, imageData); } catch (_error) {}
      }
      writeScopedOwner(canonicalIdentity, canonicalIdentity);
      registerProfileImageAliases(user, canonicalIdentity);
      if (indexChanged) writeProfileImageIndex(index);
      return imageData;
    }

    if (indexChanged) writeProfileImageIndex(index);

    const legacyImage = localStorage.getItem(LEGACY_STORAGE_KEY) || sessionStorage.getItem(LEGACY_STORAGE_KEY) || "";
    if (legacyImage && ownerMatchesCurrent(legacyOwner, aliases)) {
      try {
        localStorage.setItem(`${LEGACY_STORAGE_KEY}:${canonicalIdentity}`, legacyImage);
        writeScopedOwner(canonicalIdentity, canonicalIdentity);
        registerProfileImageAliases(user, canonicalIdentity);
      } catch (_error) {}
      return legacyImage;
    }

    return "";
  }

  function getFirebaseGooglePhoto(firebaseUser = null) {
    if (!firebaseUser) return "";
    const googleProvider = Array.isArray(firebaseUser.providerData)
      ? firebaseUser.providerData.find((provider) => provider?.providerId === "google.com")
      : null;
    const value = String(googleProvider?.photoURL || firebaseUser.photoURL || "").trim();
    return /^https?:\/\//i.test(value) ? value : "";
  }

  function readActiveIdentity() {
    const sessionIdentity = window.CatMatchUserSession?.getStoredIdentity?.() || {};
    const uid = String(
      sessionIdentity.uid ||
      sessionStorage.getItem("catmatch_auth_uid") ||
      localStorage.getItem("catmatch_auth_uid") ||
      ""
    ).trim();
    const email = String(
      sessionIdentity.email ||
      sessionStorage.getItem("catmatch_auth_email") ||
      localStorage.getItem("catmatch_auth_email") ||
      ""
    ).trim().toLowerCase();
    return { uid, email };
  }

  function userMatchesActiveIdentity(user = readStoredUser()) {
    const active = readActiveIdentity();
    const uid = String(user?.firebase_uid || user?.uid || "").trim();
    const email = String(user?.email || "").trim().toLowerCase();
    let matched = false;

    if (active.uid && uid) {
      if (active.uid !== uid) return false;
      matched = true;
    }
    if (active.email && email) {
      if (active.email !== email) return false;
      matched = true;
    }
    return matched;
  }

  function readStoredGooglePhoto(user = readStoredUser()) {
    if (!userMatchesActiveIdentity(user)) return "";
    const active = readActiveIdentity();
    const ownerUid = String(user?.google_photo_uid || "").trim();
    const value = String(user?.google_photo_url || "").trim();
    if (!active.uid || !ownerUid || ownerUid !== active.uid) return "";
    return /^https?:\/\//i.test(value) ? value : "";
  }

  function readProfilePhotoFallback(user = readStoredUser()) {
    const firebaseUser = window.catmatchFirebase?.auth?.currentUser || null;
    const storedUid = String(user?.firebase_uid || user?.uid || "").trim();
    const storedEmail = String(user?.email || "").trim().toLowerCase();
    const firebaseEmail = String(firebaseUser?.email || "").trim().toLowerCase();

    if (firebaseUser?.uid) {
      const sameAccount =
        (storedUid && firebaseUser.uid === storedUid) ||
        (!storedUid && storedEmail && firebaseEmail && storedEmail === firebaseEmail);
      if (!sameAccount) return "";
      return getFirebaseGooglePhoto(firebaseUser);
    }

    return readStoredGooglePhoto(user);
  }

  function readProfileImage(user = readStoredUser()) {
    return readCustomProfileImage(user) || readProfilePhotoFallback(user);
  }

  function isFarmContext() {
    const params = new URLSearchParams(window.location.search);
    const page = window.location.pathname.split("/").pop()?.toLowerCase() || "";
    return (
      params.get("from") === "farm" ||
      page === "farm.html" ||
      document.body?.classList.contains("farm-dashboard-page") ||
      document.body?.classList.contains("is-farm-settings")
    );
  }

  function readStoredFarm() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of ["catmatch_farm", "farm"]) {
        try {
          const value = JSON.parse(storage.getItem(key) || "null");
          if (value) return value;
        } catch (_error) {}
      }
    }
    return {};
  }

  function resolveFarmImageUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(data:|blob:|https?:)/i.test(raw)) return raw;
    const base = String(window.CATMATCH_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
    return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
  }

  let syncQueued = false;

  function readStoredUser() {
    const records = [];
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of ["catmatch_user", "user"]) {
        try {
          const value = JSON.parse(storage.getItem(key) || "null");
          if (value && typeof value === "object") records.push(value);
        } catch (_error) {
          // ข้ามข้อมูลที่อ่านไม่ได้
        }
      }
    }

    if (!records.length) return {};

    const active = readActiveIdentity();
    if (!active.uid && !active.email) return records[0];

    const matching = records.filter((record) => {
      const uid = String(record?.firebase_uid || record?.uid || "").trim();
      const email = String(record?.email || "").trim().toLowerCase();
      let hasComparableIdentity = false;
      if (active.uid && uid) {
        hasComparableIdentity = true;
        if (active.uid !== uid) return false;
      }
      if (active.email && email) {
        hasComparableIdentity = true;
        if (active.email !== email) return false;
      }
      return hasComparableIdentity;
    });

    if (!matching.length) return records[0];

    const merged = Object.assign({}, ...matching.slice().reverse());
    const googlePhotoRecord = matching.find((record) =>
      String(record?.google_photo_uid || "").trim() === active.uid &&
      /^https?:\/\//i.test(String(record?.google_photo_url || "").trim())
    );
    if (googlePhotoRecord) {
      merged.google_photo_uid = googlePhotoRecord.google_photo_uid;
      merged.google_photo_url = googlePhotoRecord.google_photo_url;
    }
    return merged;
  }

  function getDisplayName() {
    if (isFarmContext()) {
      const farm = readStoredFarm();
      return String(farm.farm_name || farm.owner_name || "ฟาร์มของคุณ").trim();
    }
    const user = readStoredUser();
    return String(user.username || user.full_name || user.name || "ผู้ใช้งาน").trim();
  }

  function getEmail() {
    const record = isFarmContext() ? readStoredFarm() : readStoredUser();
    return String(record.email || "").trim();
  }

  function getInitial() {
    return (
      getDisplayName()
        .charAt(0)
        .toUpperCase() ||
      "U"
    );
  }

  function createAvatarImage(imageData) {
    const image =
      document.createElement("img");

    image.src = imageData;
    image.alt = "";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";

    return image;
  }

  function renderAvatar(
    element,
    imageData
  ) {
    if (!element) {
      return;
    }

    element.style.overflow = "hidden";
    element.style.padding = "0";
    element.style.borderRadius = "50%";

    const currentImage =
      element.querySelector(
        ":scope > img"
      );

    if (imageData) {
      if (
        currentImage &&
        currentImage.src === imageData
      ) {
        return;
      }

      const image = createAvatarImage(imageData);
      image.addEventListener(
        "error",
        () => {
          element.textContent = getInitial();
        },
        { once: true }
      );
      element.replaceChildren(image);

      return;
    }

    if (
      element.textContent !==
      getInitial()
    ) {
      element.textContent =
        getInitial();
    }
  }

  function populateAssessmentMenu() {
    if (
      !document.body.classList.contains(
        "assessment-page"
      )
    ) {
      return;
    }

    const name =
      getDisplayName();

    const values = {
      assessmentUserName: name,
      userMenuName: name,
      userMenuEmail: getEmail(),
    };

    Object.entries(values).forEach(
      ([id, value]) => {
        const element =
          document.getElementById(id);

        if (element) {
          element.textContent =
            value;
        }
      }
    );
  }

  function syncProfileAvatars() {
    syncQueued = false;

    const imageData = isFarmContext()
      ? resolveFarmImageUrl(readStoredFarm().profile_image || readStoredFarm().image_url || "")
      : readProfileImage();

    const selectors = [
      "#userAvatar",
      "#userMenuAvatar",
      "#accountLargeAvatar",
      "#assessmentAvatar",
      ".user-avatar",
      ".user-menu-avatar",
      ".assessment-account__avatar",
      "[data-profile-avatar]",
    ];

    document
      .querySelectorAll(
        selectors.join(",")
      )
      .forEach(
        (element) => {
          renderAvatar(
            element,
            imageData
          );
        }
      );

    populateAssessmentMenu();
  }

  function queueSync() {
    if (syncQueued) {
      return;
    }

    syncQueued = true;

    window.requestAnimationFrame(
      syncProfileAvatars
    );
  }

  function setupAssessmentMenu() {
    if (
      !document.body.classList.contains(
        "assessment-page"
      )
    ) {
      return;
    }

    const trigger =
      document.getElementById(
        "userMenuTrigger"
      );

    const panel =
      document.getElementById(
        "userMenuPanel"
      );

    if (
      trigger &&
      panel &&
      trigger.dataset.avatarMenuBound !==
        "true"
    ) {
      trigger.dataset.avatarMenuBound =
        "true";

      trigger.addEventListener(
        "click",
        () => {
          const open =
            trigger.getAttribute(
              "aria-expanded"
            ) === "true";

          trigger.setAttribute(
            "aria-expanded",
            String(!open)
          );

          panel.hidden = open;
        }
      );

      document.addEventListener(
        "click",
        (event) => {
          if (
            panel.hidden ||
            trigger.contains(
              event.target
            ) ||
            panel.contains(
              event.target
            )
          ) {
            return;
          }

          panel.hidden = true;

          trigger.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      );
    }

    const logoutButton =
      document.getElementById(
        "logoutButton"
      );

    if (
      logoutButton &&
      logoutButton.dataset
        .avatarLogoutBound !== "true"
    ) {
      logoutButton.dataset
        .avatarLogoutBound = "true";

      logoutButton.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();

          if (window.CatMatchUserSession?.logout) {
            await window.CatMatchUserSession.logout({ redirectTo: "./login.html" });
            return;
          }

          for (const storage of [localStorage, sessionStorage]) {
            [
              "catmatch_token",
              "userToken",
              "token",
              "catmatch_user",
              "user",
              "catmatch_role",
              "catmatch_auth_uid",
              "catmatch_auth_user_id",
              "catmatch_auth_email",
            ].forEach((key) => storage.removeItem(key));
          }

          await window.catmatchFirebase?.signOut?.().catch(() => {});
          window.location.replace("./login.html");
        }
      );
    }
  }

  window.CatMatchProfileAvatar = {
    sync: queueSync,
    storageKey: getProfileImageStorageKey(),
    getProfileImageStorageKey,
    getUserIdentityAliases,
    readProfileImage,
  };

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupAssessmentMenu();
      queueSync();

      window.setTimeout(
        queueSync,
        0
      );

      window.setTimeout(
        queueSync,
        120
      );

      /* กู้รูปของบัญชีเดียวกันเมื่อสลับใช้งาน localhost กับ 127.0.0.1 */
      void window.CatMatchUserSession?.bridgeLocalAliases?.()
        .then(() => queueSync())
        .catch(() => {});
    }
  );

  const observer =
    new MutationObserver(
      (mutations) => {
        const avatarChanged =
          mutations.some(
            (mutation) => {
              const target =
                mutation.target
                  ?.nodeType === 1
                  ? mutation.target
                  : mutation.target
                      ?.parentElement;

              return Boolean(
                target?.matches?.(
                  "#userAvatar, #userMenuAvatar, #accountLargeAvatar, #assessmentAvatar, .user-avatar, .user-menu-avatar, .assessment-account__avatar"
                ) ||
                target?.closest?.(
                  "#userAvatar, #userMenuAvatar, #accountLargeAvatar, #assessmentAvatar, .user-avatar, .user-menu-avatar, .assessment-account__avatar"
                )
              );
            }
          );

        if (avatarChanged) {
          queueSync();
        }
      }
    );

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      observer.observe(
        document.body,
        {
          subtree: true,
          childList: true,
          characterData: true,
        }
      );
    }
  );

  window.addEventListener(
    "storage",
    (event) => {
      if (
        event.key === LEGACY_STORAGE_KEY ||
        event.key === PROFILE_IMAGE_OWNER_KEY ||
        String(event.key || "").startsWith(`${LEGACY_STORAGE_KEY}:`)
      ) {
        queueSync();
      }
    }
  );

  window.addEventListener(
    "catmatch:profile-image-updated",
    queueSync
  );

  window.addEventListener(
    "catmatch:user-session",
    queueSync
  );

  const firebaseAuth = window.catmatchFirebase?.auth;
  if (firebaseAuth?.onIdTokenChanged) {
    firebaseAuth.onIdTokenChanged((firebaseUser) => {
      if (firebaseUser) {
        window.CatMatchUserSession?.syncGooglePhotoToStoredUser?.(firebaseUser);
      }
      queueSync();
    });
  }
})();
