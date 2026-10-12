"use strict";

(() => {
  if (window.CatMatchChatApi?.__stableAuthVersion) return;

  const API_ROOT = String(
    window.CATMATCH_API_URL ||
    window.CATMATCH_API_BASE ||
    `${window.CATMATCH_API_BASE_URL || "http://localhost:3000"}/api`
  ).replace(/\/+$/, "");

  const TOKEN_KEYS = {
    user: ["catmatch_token", "userToken", "user_token", "token"],
    farm: ["catmatch_farm_token", "farm_token", "farmToken"],
    admin: ["catmatch_admin_token", "admin_token", "adminToken"],
  };

  function decodeToken(token) {
    try {
      const raw = String(token || "").split(".")[1];
      if (!raw) return {};
      const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return JSON.parse(
        decodeURIComponent(
          atob(padded)
            .split("")
            .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
            .join("")
        )
      ) || {};
    } catch (_error) {
      return {};
    }
  }

  function inferRole(payload = {}) {
    const explicit = String(payload.role || "").trim().toLowerCase();
    if (["user", "farm", "admin"].includes(explicit)) return explicit;
    if (Number(payload.admin_id || 0) > 0) return "admin";
    if (Number(payload.farm_id || 0) > 0) return "farm";
    if (Number(payload.user_id || 0) > 0) return "user";
    return "";
  }

  function actorId(payload = {}, role = "user") {
    return Number(
      role === "farm"
        ? payload.farm_id
        : role === "admin"
          ? payload.admin_id
          : payload.user_id
    ) || 0;
  }

  function isExpired(payload = {}) {
    const expiresAt = Number(payload.exp || 0);
    return expiresAt > 0 && expiresAt <= Math.floor(Date.now() / 1000);
  }

  /*
   * สำคัญ: โมดูลแชทไม่มีสิทธิ์ลบ Token หลักของระบบ
   * หาก API แชทตอบ 401 ให้แจ้งข้อผิดพลาดหรือขอ UserSession กู้ Token
   * แต่ห้าม removeItem เพราะจะทำให้ทุกหน้าสลับออก/เข้าและเหมือนรีเฟรชวนซ้ำ
   */
  function getToken(role = "user") {
    const expectedRole = ["user", "farm", "admin"].includes(role) ? role : "user";
    const keys = TOKEN_KEYS[expectedRole] || TOKEN_KEYS.user;
    const checked = new Set();

    for (const storage of [sessionStorage, localStorage]) {
      for (const key of keys) {
        let value = "";
        try {
          value = String(storage.getItem(key) || "").trim();
        } catch (_error) {}
        if (!value || checked.has(value)) continue;
        checked.add(value);

        const payload = decodeToken(value);
        if (isExpired(payload)) continue;
        if (inferRole(payload) !== expectedRole || !actorId(payload, expectedRole)) continue;
        return value;
      }
    }
    return "";
  }

  function getActor(role = "user") {
    const payload = decodeToken(getToken(role));
    return {
      type: role,
      id: actorId(payload, role),
      name: payload.name || payload.farm_name || "",
    };
  }

  async function fetchChat(path, options, token) {
    const controller = new AbortController();
    const timeoutMs = Number(options?.timeout || 15000);
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_ROOT}/chat${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("การส่งข้อความใช้เวลานานเกินไป กรุณาลองอีกครั้ง");
        timeoutError.status = 408;
        timeoutError.code = "CHAT_REQUEST_TIMEOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function tryRestoreUserSession(previousToken) {
    const sessionApi = window.CatMatchUserSession;
    if (!sessionApi?.restore) return "";

    try {
      await sessionApi.restore({ force: true });
      const replacement = getToken("user");
      return replacement && replacement !== previousToken ? replacement : "";
    } catch (_error) {
      return "";
    }
  }

  async function request(path, options = {}, role = "user") {
    let token = getToken(role);
    if (!token) {
      const error = new Error("กรุณาเข้าสู่ระบบก่อนใช้งานแชท");
      error.status = 401;
      throw error;
    }

    let result = await fetchChat(path, options, token);

    // ผู้ใช้ทั่วไปลองกู้ Token ใหม่ได้หนึ่งครั้ง แต่ไม่ลบ Token เดิมและไม่รีโหลดหน้า
    if (result.response.status === 401 && role === "user") {
      const replacement = await tryRestoreUserSession(token);
      if (replacement) {
        token = replacement;
        result = await fetchChat(path, options, token);
      }
    }

    const { response, payload } = result;
    if (!response.ok || payload.success === false) {
      const error = new Error(payload.message || "ไม่สามารถเชื่อมต่อระบบแชทได้");
      error.status = response.status;
      error.code = response.status === 401 ? "CHAT_SESSION_UNAVAILABLE" : "CHAT_REQUEST_FAILED";
      throw error;
    }
    return payload;
  }

  function createStream(role = "user") {
    const token = getToken(role);
    if (!token) return null;
    return new EventSource(`${API_ROOT}/chat/stream?token=${encodeURIComponent(token)}`);
  }

  function resolveMediaUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (/^(data:|blob:|https?:)/i.test(url)) return url;
    const origin = API_ROOT.replace(/\/api$/, "");
    return url.startsWith("/") ? `${origin}${url}` : `${origin}/${url}`;
  }

  window.CatMatchChatApi = Object.freeze({
    __stableAuthVersion: "2",
    API_ROOT,
    getToken,
    getActor,
    request,
    createStream,
    resolveMediaUrl,
  });
})();
