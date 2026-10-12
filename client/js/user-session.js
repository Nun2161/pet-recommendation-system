"use strict";

(() => {
  if (window.CatMatchUserSession) return;

  const TOKEN_KEYS = ["catmatch_token", "userToken", "token"];
  const USER_KEYS = ["catmatch_user", "user"];
  const ROLE_KEYS = ["catmatch_role"];
  const IDENTITY_KEYS = [
    "catmatch_auth_uid",
    "catmatch_auth_user_id",
    "catmatch_auth_email",
  ];
  const ALL_AUTH_KEYS = [
    ...TOKEN_KEYS,
    ...USER_KEYS,
    ...ROLE_KEYS,
    ...IDENTITY_KEYS,
    "catmatch_farm_token",
    "farm_token",
    "farmToken",
    "catmatch_farm",
    "farm",
    "catmatch_admin_token",
    "admin_token",
    "adminToken",
    "catmatch_admin",
    "admin",
  ];
  const ACCOUNT_TRANSIENT_KEYS = [
    "catmatch_assessment_result",
    "catmatch_favorite_breeds",
    "catmatch_google_identity",
    "catmatch_interest_onboarding_done",
    "catmatch_selected_breed",
    "catmatch_user_interests",
  ];
  const LEGACY_PROFILE_IMAGE_KEY = "catmatch_profile_image";
  const PROFILE_IMAGE_OWNER_KEY = "catmatch_profile_image_owner";
  const PROFILE_IMAGE_INDEX_KEY = "catmatch_profile_image_index_v3";
  const LEGACY_PROFILE_IMAGE_INDEX_KEY = "catmatch_profile_image_index_v2";
  const SCOPED_PROFILE_OWNER_PREFIX = "catmatch_profile_image_owner_v3:";

  const API_BASE = String(
    window.CATMATCH_API_URL || "http://127.0.0.1:3000/api"
  ).replace(/\/+$/, "");
  const FIREBASE_SESSION_URL = `${API_BASE}/auth/firebase/session`;

  let restorePromise = null;
  let logoutPromise = null;
  let firebaseReconcilePromise = null;
  let lastReconciledFirebaseUid = "";

  function storages() {
    // sessionStorage ต้องมาก่อน เพื่อไม่ให้ localStorage เก่าทับบัญชีในแท็บปัจจุบัน
    return [sessionStorage, localStorage];
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getFirebaseGooglePhoto(firebaseUser = null) {
    if (!firebaseUser) return "";

    const googleProvider = Array.isArray(firebaseUser.providerData)
      ? firebaseUser.providerData.find((provider) => provider?.providerId === "google.com")
      : null;
    const value = String(googleProvider?.photoURL || firebaseUser.photoURL || "").trim();
    return /^https?:\/\//i.test(value) ? value : "";
  }

  function normalizeIdentity(identity = {}) {
    const userId = Number(identity.userId || identity.user_id || 0);
    return {
      uid: String(identity.uid || identity.firebase_uid || "").trim(),
      userId: Number.isInteger(userId) && userId > 0 ? userId : 0,
      email: normalizeEmail(identity.email),
    };
  }

  function identityHasValue(identity = {}) {
    return Boolean(identity.uid || identity.userId || identity.email);
  }

  function identityAliases(identityValue = {}) {
    const identity = normalizeIdentity(identityValue);
    return [...new Set([
      identity.uid,
      identity.userId ? `user:${identity.userId}` : "",
      identity.email ? `email:${identity.email}` : "",
    ].filter(Boolean))];
  }

  function readIndexFrom(key) {
    for (const storage of storages()) {
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

  function readScopedProfileOwner(identity) {
    if (!identity) return "";
    for (const storage of storages()) {
      const owner = String(storage.getItem(`${SCOPED_PROFILE_OWNER_PREFIX}${identity}`) || "").trim();
      if (owner) return owner;
    }
    return "";
  }

  function writeScopedProfileOwner(identity, owner) {
    if (!identity || !owner) return;
    try {
      localStorage.setItem(`${SCOPED_PROFILE_OWNER_PREFIX}${identity}`, owner);
    } catch (_error) {
      try { sessionStorage.setItem(`${SCOPED_PROFILE_OWNER_PREFIX}${identity}`, owner); } catch (_sessionError) {}
    }
  }

  function readLegacyProfileOwner() {
    return String(
      localStorage.getItem(PROFILE_IMAGE_OWNER_KEY) ||
      sessionStorage.getItem(PROFILE_IMAGE_OWNER_KEY) ||
      ""
    ).trim();
  }

  function readProfileImageForIdentity(identityValue = {}) {
    const aliases = identityAliases(identityValue);
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
    const legacyOwner = readLegacyProfileOwner();
    let indexChanged = false;

    for (const identity of identities) {
      const key = `${LEGACY_PROFILE_IMAGE_KEY}:${identity}`;
      let imageData = "";
      for (const storage of storages()) {
        imageData = storage.getItem(key) || "";
        if (imageData) break;
      }
      if (!imageData) continue;

      const owner = readScopedProfileOwner(identity) || legacyOwner;
      if (!owner || !aliases.includes(owner)) {
        aliases.forEach((alias) => {
          if (index[alias] === identity) {
            delete index[alias];
            indexChanged = true;
          }
        });
        continue;
      }

      if (identity !== canonicalIdentity) {
        try { localStorage.setItem(`${LEGACY_PROFILE_IMAGE_KEY}:${canonicalIdentity}`, imageData); } catch (_error) {}
      }
      writeScopedProfileOwner(canonicalIdentity, canonicalIdentity);
      aliases.forEach((alias) => { index[alias] = canonicalIdentity; });
      writeProfileImageIndex(index);
      return imageData;
    }

    if (indexChanged) writeProfileImageIndex(index);

    const legacyImage = localStorage.getItem(LEGACY_PROFILE_IMAGE_KEY)
      || sessionStorage.getItem(LEGACY_PROFILE_IMAGE_KEY)
      || "";
    if (legacyImage && legacyOwner && aliases.includes(legacyOwner)) {
      try { localStorage.setItem(`${LEGACY_PROFILE_IMAGE_KEY}:${canonicalIdentity}`, legacyImage); } catch (_error) {}
      writeScopedProfileOwner(canonicalIdentity, canonicalIdentity);
      aliases.forEach((alias) => { index[alias] = canonicalIdentity; });
      writeProfileImageIndex(index);
      return legacyImage;
    }

    return "";
  }

  function preserveProfileImageForIdentity(identityValue = {}) {
    readProfileImageForIdentity(identityValue);
  }

  function writeProfileImageForIdentity(identityValue = {}, imageData = "") {
    const value = String(imageData || "");
    const aliases = identityAliases(identityValue);
    const canonicalIdentity = aliases[0] || "";
    if (!canonicalIdentity || !value) return false;

    try {
      localStorage.setItem(`${LEGACY_PROFILE_IMAGE_KEY}:${canonicalIdentity}`, value);
    } catch (_error) {
      try {
        sessionStorage.setItem(`${LEGACY_PROFILE_IMAGE_KEY}:${canonicalIdentity}`, value);
      } catch (_sessionError) {
        return false;
      }
    }

    writeScopedProfileOwner(canonicalIdentity, canonicalIdentity);
    const index = readProfileImageIndex();
    aliases.forEach((alias) => {
      index[alias] = canonicalIdentity;
    });
    writeProfileImageIndex(index);
    return true;
  }

  function identitiesConflict(leftValue, rightValue) {
    const left = normalizeIdentity(leftValue);
    const right = normalizeIdentity(rightValue);

    if (left.uid && right.uid) return left.uid !== right.uid;
    if (left.userId && right.userId) return left.userId !== right.userId;
    if (left.email && right.email) return left.email !== right.email;
    return false;
  }

  function decodeJwtPayload(token) {
    try {
      const part = String(token || "").split(".")[1];
      if (!part) return {};
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const json = decodeURIComponent(
        atob(padded)
          .split("")
          .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join("")
      );
      return JSON.parse(json) || {};
    } catch (_error) {
      return {};
    }
  }

  function identityFromToken(token) {
    const payload = decodeJwtPayload(token);
    return normalizeIdentity({
      uid: payload.firebase_uid,
      userId: payload.user_id,
      email: payload.email,
    });
  }

  function identityFromUser(user = {}) {
    return normalizeIdentity({
      uid: user.firebase_uid || user.uid,
      userId: user.user_id || user.id,
      email: user.email,
    });
  }

  function firstValue(keys) {
    for (const storage of storages()) {
      for (const key of keys) {
        const value = storage.getItem(key);
        if (value) return value;
      }
    }
    return "";
  }

  function readJSON(keys) {
    for (const storage of storages()) {
      for (const key of keys) {
        try {
          const value = JSON.parse(storage.getItem(key) || "null");
          if (value && typeof value === "object") return value;
        } catch (_error) {
          // ข้ามข้อมูลที่อ่านไม่ได้
        }
      }
    }
    return null;
  }

  function getToken() {
    return firstValue(TOKEN_KEYS);
  }

  function getUser() {
    return readJSON(USER_KEYS);
  }

  function getStoredIdentity() {
    const explicit = normalizeIdentity({
      uid: firstValue(["catmatch_auth_uid"]),
      userId: firstValue(["catmatch_auth_user_id"]),
      email: firstValue(["catmatch_auth_email"]),
    });
    if (identityHasValue(explicit)) return explicit;

    const tokenIdentity = identityFromToken(getToken());
    if (identityHasValue(tokenIdentity)) return tokenIdentity;

    return identityFromUser(getUser() || {});
  }

  function syncGooglePhotoToStoredUser(firebaseUser = null) {
    const user = getUser();
    if (!firebaseUser || !user) return false;

    const storedIdentity = getStoredIdentity();
    const firebaseIdentity = normalizeIdentity({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
    });
    const userIdentity = identityFromUser(user);

    if (
      (identityHasValue(storedIdentity) && identitiesConflict(storedIdentity, firebaseIdentity)) ||
      (identityHasValue(userIdentity) && identitiesConflict(userIdentity, firebaseIdentity))
    ) {
      return false;
    }

    const photoURL = getFirebaseGooglePhoto(firebaseUser);
    const previousGooglePhoto = String(user.google_photo_url || "").trim();
    const nextUser = {
      ...user,
      ...(firebaseIdentity.uid ? { firebase_uid: firebaseIdentity.uid } : {}),
      ...(firebaseIdentity.email && !user.email ? { email: firebaseIdentity.email } : {}),
    };

    if (photoURL) {
      nextUser.google_photo_url = photoURL;
      nextUser.google_photo_uid = firebaseIdentity.uid || "";
      nextUser.photo_url = photoURL;
    } else {
      delete nextUser.google_photo_url;
      delete nextUser.google_photo_uid;
      if (previousGooglePhoto && String(nextUser.photo_url || "").trim() === previousGooglePhoto) {
        delete nextUser.photo_url;
      }
    }

    if (JSON.stringify(nextUser) === JSON.stringify(user)) return false;

    const value = JSON.stringify(nextUser);
    USER_KEYS.forEach((key) => writeEverywhere(key, value));
    window.dispatchEvent(new Event("catmatch:profile-image-updated"));
    window.dispatchEvent(
      new CustomEvent("catmatch:user-session", {
        detail: { signedIn: true, identity: firebaseIdentity },
      })
    );
    return true;
  }

  function writeEverywhere(key, value) {
    for (const storage of storages()) {
      if (value === undefined || value === null || value === "") {
        storage.removeItem(key);
      } else {
        storage.setItem(key, String(value));
      }
    }
  }

  function removeEverywhere(keys) {
    for (const storage of storages()) {
      keys.forEach((key) => storage.removeItem(key));
    }
  }

  function clearAccountTransientData(identityValue = getStoredIdentity()) {
    /* ย้ายรูปแบบเก่าไปไว้ใต้รหัสบัญชีก่อนล้าง เพื่อให้กลับเข้าบัญชีเดิมแล้วรูปยังอยู่ */
    preserveProfileImageForIdentity(identityValue);
    removeEverywhere(ACCOUNT_TRANSIENT_KEYS);

    localStorage.removeItem(LEGACY_PROFILE_IMAGE_KEY);
    localStorage.removeItem(PROFILE_IMAGE_OWNER_KEY);
    sessionStorage.removeItem(LEGACY_PROFILE_IMAGE_KEY);
    sessionStorage.removeItem(PROFILE_IMAGE_OWNER_KEY);
  }

  function clear({ clearAccountData = false } = {}) {
    if (clearAccountData) clearAccountTransientData();
    removeEverywhere(ALL_AUTH_KEYS);
    window.dispatchEvent(
      new CustomEvent("catmatch:user-session", {
        detail: { signedIn: false },
      })
    );
  }

  function normalizeSession(data, firebaseUser = null) {
    const role = data?.role || data?.data?.role || "user";
    const token =
      data?.token ||
      data?.accessToken ||
      data?.data?.token ||
      data?.data?.accessToken ||
      "";
    const user =
      data?.user ||
      data?.data?.user ||
      data?.profile ||
      data?.data?.profile ||
      data?.[role] ||
      data?.data?.[role] ||
      null;

    const tokenIdentity = identityFromToken(token);
    const responseIdentity = normalizeIdentity({
      uid:
        data?.firebase_uid ||
        data?.data?.firebase_uid ||
        user?.firebase_uid ||
        tokenIdentity.uid,
      userId: user?.user_id || tokenIdentity.userId,
      email: user?.email || tokenIdentity.email,
    });
    const firebaseIdentity = normalizeIdentity({
      uid: firebaseUser?.uid,
      email: firebaseUser?.email,
    });

    if (
      identityHasValue(firebaseIdentity) &&
      identityHasValue(responseIdentity) &&
      identitiesConflict(firebaseIdentity, responseIdentity)
    ) {
      const error = new Error(
        "ข้อมูลบัญชี Google ไม่ตรงกับบัญชี CatMatch ระบบจึงยกเลิกการเข้าสู่ระบบเพื่อป้องกันข้อมูลปนกัน"
      );
      error.code = "ACCOUNT_IDENTITY_MISMATCH";
      throw error;
    }

    const identity = normalizeIdentity({
      uid: firebaseIdentity.uid || responseIdentity.uid,
      userId: responseIdentity.userId,
      email: firebaseIdentity.email || responseIdentity.email,
    });

    const firebasePhotoURL = getFirebaseGooglePhoto(firebaseUser);
    const normalizedUser = user
      ? {
          ...user,
          ...(identity.uid ? { firebase_uid: identity.uid } : {}),
          ...(identity.userId && !user.user_id ? { user_id: identity.userId } : {}),
          ...(identity.email && !user.email ? { email: identity.email } : {}),
          ...(firebasePhotoURL
            ? {
                photo_url: firebasePhotoURL,
                google_photo_url: firebasePhotoURL,
                google_photo_uid: identity.uid || firebaseUser?.uid || "",
              }
            : {}),
        }
      : firebaseUser
        ? {
            firebase_uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || firebaseUser.email || "ผู้ใช้",
            ...(firebasePhotoURL
              ? {
                  photo_url: firebasePhotoURL,
                  google_photo_url: firebasePhotoURL,
                  google_photo_uid: firebaseUser.uid || "",
                }
              : {}),
          }
        : null;

    return { role, token, user: normalizedUser, identity };
  }

  function save(data, firebaseUser = null) {
    const session = normalizeSession(data, firebaseUser);
    if (!session.token || session.role !== "user") return false;

    const previousIdentity = getStoredIdentity();
    if (
      identityHasValue(previousIdentity) &&
      identityHasValue(session.identity) &&
      identitiesConflict(previousIdentity, session.identity)
    ) {
      clearAccountTransientData(previousIdentity);
    }

    removeEverywhere(ALL_AUTH_KEYS);

    TOKEN_KEYS.forEach((key) => writeEverywhere(key, session.token));
    writeEverywhere("catmatch_role", "user");

    if (session.user) {
      const value = JSON.stringify(session.user);
      USER_KEYS.forEach((key) => writeEverywhere(key, value));
    }

    writeEverywhere("catmatch_auth_uid", session.identity.uid);
    writeEverywhere("catmatch_auth_user_id", session.identity.userId || "");
    writeEverywhere("catmatch_auth_email", session.identity.email);

    window.dispatchEvent(
      new CustomEvent("catmatch:user-session", {
        detail: {
          signedIn: true,
          identity: session.identity,
        },
      })
    );

    void bridgeLocalAliases({ pushCurrent: true });
    return true;
  }

  function alternateOriginInfo() {
    const host = window.location.hostname;
    if (!["localhost", "127.0.0.1"].includes(host) || !window.location.port) {
      return null;
    }
    const alternateHost = host === "localhost" ? "127.0.0.1" : "localhost";
    return {
      origin: `${window.location.protocol}//${alternateHost}:${window.location.port}`,
      url: `${window.location.protocol}//${alternateHost}:${window.location.port}/client/pages/session-bridge.html?v=4`,
    };
  }

  function bridgeRequest(message, { timeoutMs = 1600 } = {}) {
    const alternate = alternateOriginInfo();
    if (!alternate || !document.body) return Promise.resolve(null);

    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.hidden = true;
      iframe.tabIndex = -1;
      iframe.setAttribute("aria-hidden", "true");
      iframe.src = alternate.url;

      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timer);
        iframe.remove();
        resolve(result || null);
      };
      const onMessage = (event) => {
        if (event.origin !== alternate.origin || event.source !== iframe.contentWindow) return;
        const response = event.data || {};
        if (response.type === "catmatch-session-bridge-ready") {
          iframe.contentWindow?.postMessage(message, alternate.origin);
          return;
        }
        if (response.type === "catmatch-session-bridge-result") {
          finish(response);
        }
      };
      const timer = window.setTimeout(() => finish(null), timeoutMs);
      window.addEventListener("message", onMessage);
      document.body.appendChild(iframe);
    });
  }

  async function bridgeLocalAliases({ pushCurrent = false, timeoutMs = 1600 } = {}) {
    const currentToken = getToken();
    const currentUser = getUser();
    const currentIdentity = getStoredIdentity();

    if (pushCurrent && currentToken) {
      const result = await bridgeRequest(
        {
          type: "catmatch-session-write",
          token: currentToken,
          user: currentUser,
          identity: currentIdentity,
          profileImage: readProfileImageForIdentity(currentIdentity),
        },
        { timeoutMs }
      );
      return Boolean(result?.ok);
    }

    const result = await bridgeRequest(
      { type: "catmatch-session-read" },
      { timeoutMs }
    );
    if (!result?.ok || !result.token) return false;

    const remoteIdentity = normalizeIdentity(
      result.identity || identityFromToken(result.token)
    );
    const firebaseIdentity = normalizeIdentity({
      uid: window.catmatchFirebase?.auth?.currentUser?.uid,
      email: window.catmatchFirebase?.auth?.currentUser?.email,
    });

    if (
      identityHasValue(firebaseIdentity) &&
      identityHasValue(remoteIdentity) &&
      identitiesConflict(firebaseIdentity, remoteIdentity)
    ) {
      return false;
    }

    const localIdentity = getStoredIdentity();
    if (
      identityHasValue(localIdentity) &&
      identityHasValue(remoteIdentity) &&
      identitiesConflict(localIdentity, remoteIdentity)
    ) {
      return false;
    }

    /* ดึงรูปของบัญชีเดียวกันข้ามระหว่าง localhost และ 127.0.0.1 แม้ฝั่งนี้มี Token อยู่แล้ว */
    if (result.profileImage) {
      writeProfileImageForIdentity(remoteIdentity, result.profileImage);
      window.dispatchEvent(new Event("catmatch:profile-image-updated"));
    }

    if (getToken()) return true;

    TOKEN_KEYS.forEach((key) => writeEverywhere(key, result.token));
    writeEverywhere("catmatch_role", "user");
    if (result.user) {
      const value = JSON.stringify(result.user);
      USER_KEYS.forEach((key) => writeEverywhere(key, value));
    }
    writeEverywhere("catmatch_auth_uid", remoteIdentity.uid);
    writeEverywhere("catmatch_auth_user_id", remoteIdentity.userId || "");
    writeEverywhere("catmatch_auth_email", remoteIdentity.email);
    return true;
  }

  async function clearRemoteAliases() {
    const result = await bridgeRequest(
      { type: "catmatch-session-clear" },
      { timeoutMs: 1600 }
    );
    return Boolean(result?.ok);
  }

  function migrateExistingSession() {
    const token = getToken();
    const user = getUser();
    const tokenIdentity = identityFromToken(token);
    const userIdentity = identityFromUser(user || {});
    const identity = normalizeIdentity({
      uid: userIdentity.uid || tokenIdentity.uid,
      userId: userIdentity.userId || tokenIdentity.userId,
      email: userIdentity.email || tokenIdentity.email,
    });

    preserveProfileImageForIdentity(identity);

    if (token) TOKEN_KEYS.forEach((key) => writeEverywhere(key, token));
    if (user) {
      const enriched = {
        ...user,
        ...(identity.uid && !user.firebase_uid ? { firebase_uid: identity.uid } : {}),
      };
      const value = JSON.stringify(enriched);
      USER_KEYS.forEach((key) => writeEverywhere(key, value));
    }
    if (token) writeEverywhere("catmatch_role", "user");
    if (identity.uid) writeEverywhere("catmatch_auth_uid", identity.uid);
    if (identity.userId) writeEverywhere("catmatch_auth_user_id", identity.userId);
    if (identity.email) writeEverywhere("catmatch_auth_email", identity.email);
  }

  function waitForFirebaseUser(timeoutMs = 3500) {
    const auth = window.catmatchFirebase?.auth;
    if (!auth) return Promise.resolve(null);
    if (auth.currentUser) return Promise.resolve(auth.currentUser);

    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      let unsubscribe = () => {};
      const finish = (user) => {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        unsubscribe();
        resolve(user || null);
      };
      unsubscribe = auth.onAuthStateChanged(
        (user) => finish(user),
        () => finish(null)
      );
      if (settled) unsubscribe();
      else timer = window.setTimeout(() => finish(auth.currentUser), timeoutMs);
    });
  }

  async function restore({ force = false, firebaseUser = null } = {}) {
    if (restorePromise) return restorePromise;

    restorePromise = (async () => {
      const bridge = window.catmatchFirebase;
      if (!bridge?.configured || !bridge.auth || typeof bridge.getIdToken !== "function") {
        return false;
      }

      const activeFirebaseUser = firebaseUser || bridge.auth.currentUser || (await waitForFirebaseUser());
      if (!activeFirebaseUser) return false;

      const idToken = await bridge.getIdToken(activeFirebaseUser, force);
      const allowCreate =
        Array.isArray(activeFirebaseUser.providerData) &&
        activeFirebaseUser.providerData.some(
          (provider) => provider?.providerId === "google.com"
        );
      const response = await fetch(FIREBASE_SESSION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ idToken, allowCreate }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        const error = new Error(
          data?.message || "ไม่สามารถกู้คืนเซสชันเข้าสู่ระบบได้"
        );
        error.status = response.status;
        error.code = data?.code || "SESSION_RESTORE_FAILED";
        throw error;
      }
      return save(data, activeFirebaseUser);
    })().finally(() => {
      restorePromise = null;
    });

    return restorePromise;
  }

  async function ensure({ allowBridge = true } = {}) {
    migrateExistingSession();

    const bridge = window.catmatchFirebase;
    const firebaseUser = bridge?.configured ? await waitForFirebaseUser() : null;
    const token = getToken();
    const storedIdentity = getStoredIdentity();
    const firebaseIdentity = normalizeIdentity({
      uid: firebaseUser?.uid,
      email: firebaseUser?.email,
    });

    if (token && firebaseUser) {
      if (
        !storedIdentity.uid ||
        identitiesConflict(storedIdentity, firebaseIdentity)
      ) {
        clear({ clearAccountData: identitiesConflict(storedIdentity, firebaseIdentity) });
        await clearRemoteAliases().catch(() => false);
        await restore({ force: true, firebaseUser });
      } else {
        syncGooglePhotoToStoredUser(firebaseUser);
      }

      return {
        signedIn: Boolean(getToken()),
        token: getToken(),
        user: getUser(),
        firebaseUser,
        identity: getStoredIdentity(),
      };
    }

    if (token) {
      void bridgeLocalAliases({ pushCurrent: true });
      return {
        signedIn: true,
        token,
        user: getUser(),
        firebaseUser: null,
        identity: storedIdentity,
      };
    }

    // ถ้ามี Firebase user ให้ Firebase เป็นแหล่งข้อมูลหลัก ห้ามดึงบัญชีเก่าจากอีก hostname
    if (firebaseUser) {
      try {
        await restore({ force: true, firebaseUser });
      } catch (error) {
        console.warn("CatMatch session restore failed:", error);
        clear({ clearAccountData: true });
        return {
          signedIn: false,
          token: "",
          user: null,
          firebaseUser,
          identity: firebaseIdentity,
        };
      }
      return {
        signedIn: Boolean(getToken()),
        token: getToken(),
        user: getUser(),
        firebaseUser,
        identity: getStoredIdentity(),
      };
    }

    if (allowBridge) await bridgeLocalAliases();

    return {
      signedIn: Boolean(getToken()),
      token: getToken(),
      user: getUser(),
      firebaseUser: null,
      identity: getStoredIdentity(),
    };
  }

  async function prepareAccountSwitch() {
    const previousIdentity = getStoredIdentity();
    if (identityHasValue(previousIdentity)) clearAccountTransientData();
    clear({ clearAccountData: true });
    await clearRemoteAliases().catch(() => false);
    await window.catmatchFirebase?.signOut?.().catch(() => {});
  }

  async function logout({ redirectTo = "" } = {}) {
    if (logoutPromise) return logoutPromise;

    const destination = redirectTo || defaultLogoutRedirect();
    let navigated = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      window.location.replace(destination);
    };

    logoutPromise = (async () => {
      // ล้าง JWT และข้อมูลบัญชีฝั่งหน้าเว็บทันที เพื่อไม่ให้หน้าถัดไปอ่านบัญชีเดิมกลับมา
      clear({ clearAccountData: true });

      const firebaseSignOut = Promise.resolve(
        window.catmatchFirebase?.signOut?.()
      ).catch(() => false);
      const aliasCleanup = Promise.resolve(clearRemoteAliases()).catch(() => false);

      // Firebase sign-out ต้องได้โอกาสบันทึกก่อนเปลี่ยนหน้า แต่ห้ามทำให้ปุ่มค้าง
      await Promise.race([
        Promise.allSettled([firebaseSignOut, aliasCleanup]),
        new Promise((resolve) => window.setTimeout(resolve, 450)),
      ]);

      navigate();
      return true;
    })()
      .catch(() => {
        clear({ clearAccountData: true });
        navigate();
        return false;
      })
      .finally(() => {
        logoutPromise = null;
      });

    // กันกรณี Promise ภายนอกค้างจากส่วนเสริมเบราว์เซอร์หรือ iframe ข้าม hostname
    window.setTimeout(navigate, 650);
    return logoutPromise;
  }

  async function fetchWithAuth(url, options = {}, allowRetry = true) {
    const session = await ensure();
    if (!session.signedIn || !session.token) {
      const error = new Error("กรุณาเข้าสู่ระบบ");
      error.status = 401;
      throw error;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    if (response.status === 401 && allowRetry) {
      removeEverywhere(TOKEN_KEYS);
      const restored = await restore({ force: true }).catch(() => false);
      if (restored) return fetchWithAuth(url, options, false);
    }
    return response;
  }

  function defaultLogoutRedirect() {
    const page = String(window.location.pathname || "").toLowerCase();
    const isDog =
      document.body?.classList.contains("dog-theme") ||
      document.body?.dataset?.species === "dog" ||
      page.includes("dog-");
    return isDog ? "./dog-index.html" : "./index.html";
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element
        ? event.target.closest("#logoutButton,[data-catmatch-logout]")
        : null;
      if (!target) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      target.disabled = true;
      target.setAttribute("aria-busy", "true");
      const label = target.querySelector("span:last-child");
      if (label) label.textContent = "กำลังออกจากระบบ...";
      const destination = target.dataset.logoutRedirect || defaultLogoutRedirect();
      void logout({ redirectTo: destination });
    },
    true
  );

  migrateExistingSession();

  const firebaseAuth = window.catmatchFirebase?.auth;
  if (firebaseAuth?.onIdTokenChanged) {
    firebaseAuth.onIdTokenChanged((firebaseUser) => {
      if (!firebaseUser || !getToken()) return;

      const firebaseIdentity = normalizeIdentity({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
      });
      const storedIdentity = getStoredIdentity();
      const needsReconcile =
        !storedIdentity.uid ||
        identitiesConflict(storedIdentity, firebaseIdentity);

      if (!needsReconcile) {
        lastReconciledFirebaseUid = firebaseIdentity.uid || lastReconciledFirebaseUid;
        syncGooglePhotoToStoredUser(firebaseUser);
        return;
      }

      /*
       * Firebase เรียก onIdTokenChanged อีกครั้งเมื่อรีเฟรชโทเคนตามปกติ
       * ห้าม reload หน้า เพราะสคริปต์นี้ถูกโหลดในทุกหน้าและจะทำให้เว็บ
       * ดูเหมือนรีเฟรชเองวนซ้ำ ให้ซิงก์เซสชันในหน้าเดิมแทน
       */
      if (firebaseReconcilePromise) return;
      if (firebaseIdentity.uid && firebaseIdentity.uid === lastReconciledFirebaseUid) return;

      const accountChanged = identitiesConflict(storedIdentity, firebaseIdentity);
      firebaseReconcilePromise = (async () => {
        if (accountChanged) {
          clear({ clearAccountData: true });
          await clearRemoteAliases().catch(() => false);
        }

        try {
          const restored = await restore({ force: true, firebaseUser });
          if (restored) {
            lastReconciledFirebaseUid = firebaseIdentity.uid || "";
            syncGooglePhotoToStoredUser(firebaseUser);
          }
        } catch (error) {
          console.warn("Firebase account reconciliation failed:", error);
          if (accountChanged) clear({ clearAccountData: true });
        }
      })().finally(() => {
        firebaseReconcilePromise = null;
      });
    });
  }

  window.CatMatchUserSession = Object.freeze({
    TOKEN_KEYS,
    USER_KEYS,
    getToken,
    getUser,
    getStoredIdentity,
    save,
    clear,
    waitForFirebaseUser,
    restore,
    ensure,
    fetchWithAuth,
    bridgeLocalAliases,
    clearRemoteAliases,
    prepareAccountSwitch,
    logout,
    isStoredSignedIn: () => Boolean(getToken()),
    identitiesConflict,
    identityFromToken,
    preserveProfileImageForIdentity,
    readProfileImageForIdentity,
    writeProfileImageForIdentity,
    syncGooglePhotoToStoredUser,
    getFirebaseGooglePhoto,
  });
})();
