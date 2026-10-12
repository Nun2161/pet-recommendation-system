"use strict";

(() => {
  const SPECIES = "dog";
  const pageHost = window.location.hostname === "localhost" ? "localhost" : "127.0.0.1";
  const API_BASE = String(
    window.CATMATCH_API_URL || `http://${pageHost}:3000/api`
  ).replace(/\/+$/, "");

  const historyList = document.getElementById("historyList");
  const historyLoading = document.getElementById("historyLoading");
  const historyEmpty = document.getElementById("historyEmpty");
  const historyError = document.getElementById("historyError");
  const historyCount = document.getElementById("historyCount");

  function clearDogResultRevealSessions() {
    try {
      const keysToRemove = [];
      for (let index = 0; index < window.sessionStorage.length; index += 1) {
        const key = window.sessionStorage.key(index);
        if (key?.startsWith("dogmatch_dog_result_reveal_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
    } catch (_error) {
      // History can still load when browser storage is disabled.
    }
  }

  clearDogResultRevealSessions();

  function readJSON(storage, key) {
    try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
  }

  function getUser() {
    return readJSON(sessionStorage, "catmatch_user") ||
      readJSON(sessionStorage, "user") ||
      readJSON(localStorage, "catmatch_user") ||
      readJSON(localStorage, "user");
  }

  function getToken() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of ["catmatch_token", "userToken", "token"]) {
        const value = storage.getItem(key);
        if (value) return value;
      }
    }
    return "";
  }

  function apiBaseCandidates() {
    const candidates = [API_BASE];
    if (/^http:\/\/(localhost|127\.0\.0\.1):3000\/api$/i.test(API_BASE)) {
      candidates.push(
        API_BASE.includes("localhost")
          ? "http://127.0.0.1:3000/api"
          : "http://localhost:3000/api"
      );
    }
    return [...new Set(candidates)];
  }

  async function requestHistory(path, token) {
    let lastError = null;
    for (const base of apiBaseCandidates()) {
      try {
        const response = await fetch(`${base}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store"
        });
        const payload = await response.json().catch(() => ({}));
        return { response, payload };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("เชื่อมต่อ Backend ไม่ได้");
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatThaiDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ไม่ระบุวันที่";
    return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  }

  async function loadAssessmentHistory() {
    const token = getToken();

    try {
      let { response, payload } = await requestHistory(
        `/history?species=${SPECIES}`,
        token
      );

      // รองรับ Backend รุ่นเดิมโดยไม่ทำให้ประวัติแมวเก่าหาย
      if (!response.ok && [400, 404].includes(response.status)) {
        ({ response, payload } = await requestHistory("/history", token));
      }

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "โหลดประวัติแบบประเมินไม่สำเร็จ");
      }

      const allItems = Array.isArray(payload.data) ? payload.data : [];
      const items = allItems.filter((item) => {
        const itemSpecies = item?.species === "dog" ? "dog" : "cat";
        return itemSpecies === SPECIES;
      });

      historyLoading.hidden = true;
      historyError.hidden = true;
      historyCount.textContent = `${items.length} ครั้ง`;

      if (!items.length) {
        historyEmpty.hidden = false;
        historyList.hidden = true;
        return;
      }

      historyEmpty.hidden = true;
      historyList.innerHTML = items.map((item, index) => {
        const top = item.recommendations?.[0] || {};
        const resultId = Number(item.result_id || 0);
        const breedName = top.breed_name || "ดูผลลัพธ์แบบประเมิน";
        const matchScore = Number(top.match_score || 0);
        const answeredCount = Number(item.answered_count || 0);
        const speciesLabel = SPECIES === "dog" ? "สุนัข" : "แมว";
        const resultPage = SPECIES === "dog" ? "dog-result.html" : "result.html";

        return `
          <a class="history-card" href="./${resultPage}?result_id=${resultId}&history=1&species=${SPECIES}">
            <span class="history-card__number">${index + 1}</span>
            <span class="history-card__content">
              <strong>${escapeHTML(breedName)}</strong>
              <small>${escapeHTML(formatThaiDate(item.created_at))} · ${speciesLabel} · ${answeredCount} ข้อ</small>
            </span>
            <span class="history-card__score">
              <small>ความเหมาะสม</small>
              <strong>${matchScore.toFixed(0)}%</strong>
            </span>
            <span class="history-card__arrow" aria-hidden="true">→</span>
          </a>`;
      }).join("");

      historyList.hidden = false;
    } catch (error) {
      historyLoading.hidden = true;
      historyError.textContent = error?.message === "Failed to fetch"
        ? "เชื่อมต่อ Backend ไม่ได้ กรุณาเปิด server ด้วย npm run dev"
        : error?.message || "เกิดข้อผิดพลาดในการโหลดประวัติ";
      historyError.hidden = false;
    }
  }

  if (!getUser()) {
    window.location.replace("./login.html?return=dog-assessment-history");
    return;
  }

  void loadAssessmentHistory();
})();
