"use strict";

(function initializeFarmPendingPage() {
  const STORAGE_KEY = "catmatch_farm_registration_result";
  const POLL_INTERVAL = 10000;
  const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const API_BASE_URL = String(
    window.CATMATCH_API_BASE_URL || (isLocalPage ? "http://localhost:3000" : "")
  ).replace(/\/+$/, "");
  const STATUS_URL = API_BASE_URL
    ? `${API_BASE_URL}/api/auth/farm-register/status`
    : "/api/auth/farm-register/status";

  const params = new URLSearchParams(window.location.search);
  let stored = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") ||
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_error) {}

  const flowSpecies = (() => {
    const explicit = String(params.get("species") || stored?.species || "").toLowerCase();
    if (explicit === "dog" || explicit === "cat") return explicit;
    return document.documentElement.dataset.authSpecies === "dog" ? "dog" : "cat";
  })();

  const farmLoginHref = () => {
    const url = new URL("./login.html", window.location.href);
    url.searchParams.set("role", "farm");
    url.searchParams.set("return", "farm");
    url.searchParams.set("farm_status", "approved");
    url.searchParams.set("species", flowSpecies);
    return `${url.pathname.split("/").pop()}${url.search}`;
  };

  const initialFarm = {
    farm_id: Number(params.get("farm_id")) || null,
    farm_name: params.get("farm_name") || stored?.farm_name || "ฟาร์มของคุณ",
    email: params.get("email") || stored?.email || "—",
    status: params.get("status") || stored?.status || "pending",
    rejection_reason: stored?.rejection_reason || null,
    approved_at: stored?.approved_at || null,
    species: flowSpecies,
  };

  let currentUser = null;
  let pollTimer = 0;
  let checking = false;

  function persistFarm(farm) {
    const normalized = { ...initialFarm, ...farm, checked_at: Date.now() };
    try {
      const serialized = JSON.stringify(normalized);
      sessionStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (_error) {}
    return normalized;
  }

  function setLastChecked(message = "") {
    const element = document.getElementById("pendingLastChecked");
    if (!element) return;
    element.textContent = message || `ตรวจสอบล่าสุด ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  }

  function renderFarmStatus(farm) {
    const current = persistFarm(farm);
    const status = String(current.status || "pending").toLowerCase();
    const nameElement = document.getElementById("pendingFarmName");
    const emailElement = document.getElementById("pendingFarmEmail");
    const eyebrowElement = document.getElementById("pendingEyebrow");
    const titleElement = document.getElementById("pendingTitle");
    const leadElement = document.getElementById("pendingLead");
    const badgeElement = document.querySelector(".pending-badge");
    const finalStep = document.getElementById("pendingFinalStep");
    const primaryAction = document.getElementById("pendingPrimaryAction");
    const liveNote = document.getElementById("pendingLiveNote");

    if (nameElement) nameElement.textContent = current.farm_name || "ฟาร์มของคุณ";
    if (emailElement) emailElement.textContent = current.email || "—";
    document.body.classList.remove("is-approved", "is-rejected", "is-inactive");
    finalStep?.classList.remove("is-current", "is-complete");

    if (status === "approved") {
      document.body.classList.add("is-approved");
      eyebrowElement.textContent = "ตรวจสอบเรียบร้อยแล้ว";
      titleElement.textContent = "บัญชีฟาร์มได้รับอนุมัติแล้ว";
      leadElement.textContent = `ผู้ดูแลระบบอนุมัติข้อมูลฟาร์มเรียบร้อยแล้ว ตอนนี้สามารถเข้าสู่ระบบเพื่อเริ่มจัดการข้อมูลฟาร์มและข้อมูล${flowSpecies === "dog" ? "สุนัข" : "แมว"}ได้`;
      if (badgeElement) badgeElement.innerHTML = "<b></b> อนุมัติแล้ว";

      // เมื่ออนุมัติแล้ว ทุกขั้นตอนต้องแสดงว่าเสร็จสมบูรณ์
      document.querySelectorAll(".pending-steps li").forEach((step) => {
        step.classList.remove("is-current");
        step.classList.add("is-complete");
        const marker = step.querySelector(":scope > span");
        if (marker) marker.textContent = "✓";
      });

      const processHeading = document.querySelector(".pending-process .pending-card-heading h2");
      if (processHeading) processHeading.textContent = "อนุมัติและเปิดใช้งานเรียบร้อย";

      if (primaryAction) {
        primaryAction.href = `./${farmLoginHref()}`;
        primaryAction.innerHTML = 'เข้าสู่ระบบเพื่อเริ่มใช้งาน <span aria-hidden="true">→</span>';
      }
      if (liveNote) {
        liveNote.classList.add("is-approved");
        liveNote.querySelector("strong").textContent = "อนุมัติสำเร็จแล้ว";
        liveNote.querySelector("p").textContent = "กดปุ่มเข้าสู่ระบบเพื่อเปิดศูนย์จัดการฟาร์มได้ทันที";
      }
      window.clearInterval(pollTimer);
      return;
    }

    if (status === "rejected") {
      document.body.classList.add("is-rejected");
      eyebrowElement.textContent = "ผลการตรวจสอบคำขอ";
      titleElement.textContent = "คำขอลงทะเบียนฟาร์มต้องแก้ไข";
      leadElement.textContent = current.rejection_reason
        ? `เหตุผลจากผู้ดูแลระบบ: ${current.rejection_reason}`
        : "คำขอยังไม่ผ่านการอนุมัติ กรุณาตรวจสอบข้อมูลและติดต่อผู้ดูแลระบบก่อนส่งใหม่";
      if (badgeElement) badgeElement.innerHTML = "<b></b> ต้องแก้ไขข้อมูล";
      if (primaryAction) {
        const retryUrl = new URL("./farm-register.html", window.location.href);
        retryUrl.searchParams.set("fresh", "1");
        retryUrl.searchParams.set("species", flowSpecies);
        primaryAction.href = `${retryUrl.pathname.split("/").pop()}${retryUrl.search}`;
        primaryAction.innerHTML = 'กลับไปตรวจข้อมูล <span aria-hidden="true">→</span>';
      }
      window.clearInterval(pollTimer);
      return;
    }

    if (status === "inactive") {
      document.body.classList.add("is-inactive");
      eyebrowElement.textContent = "สถานะบัญชีฟาร์ม";
      titleElement.textContent = "บัญชีฟาร์มถูกระงับชั่วคราว";
      leadElement.textContent = "กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบสถานะและแนวทางเปิดใช้งานบัญชีอีกครั้ง";
      if (badgeElement) badgeElement.innerHTML = "<b></b> ระงับการใช้งาน";
      window.clearInterval(pollTimer);
      return;
    }

    const pendingSteps = document.querySelectorAll(".pending-steps li");
    pendingSteps.forEach((step, index) => {
      step.classList.toggle("is-complete", index === 0);
      step.classList.toggle("is-current", index === 1);
      const marker = step.querySelector(":scope > span");
      if (marker) marker.textContent = index === 0 ? "✓" : String(index + 1);
    });
    const processHeading = document.querySelector(".pending-process .pending-card-heading h2");
    if (processHeading) processHeading.textContent = "กำลังตรวจสอบข้อมูล";

    eyebrowElement.textContent = "ส่งคำขอเรียบร้อยแล้ว";
    titleElement.textContent = "กำลังรอผู้ดูแลระบบอนุมัติ";
    leadElement.textContent = "CatMatch ได้รับข้อมูลฟาร์มและใบรับรองแล้ว กรุณาอย่าเพิ่งออกจากระบบ หน้านี้จะอัปเดตทันทีเมื่อผู้ดูแลระบบตรวจสอบเสร็จ";
    if (badgeElement) badgeElement.innerHTML = "<b></b> รออนุมัติ";
    finalStep?.classList.add("is-current");
  }

  async function requestStatus(user) {
    const url = new URL(STATUS_URL, window.location.href);
    url.searchParams.set("t", String(Date.now()));
    if (initialFarm.email && initialFarm.email !== "—") {
      url.searchParams.set("email", initialFarm.email.trim().toLowerCase());
    }

    const headers = { "Cache-Control": "no-cache" };

    const response = await fetch(url.href, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false || !result.farm) {
      throw new Error(result.message || "ยังไม่สามารถตรวจสอบสถานะได้");
    }
    return result.farm;
  }

  async function refreshFarmStatus(user = currentUser, manual = false) {
    if (checking) return;
    checking = true;
    const button = document.getElementById("refreshFarmStatus");
    if (manual && button) {
      button.disabled = true;
      button.textContent = "กำลังตรวจสอบ...";
    }

    try {
      const farm = await requestStatus(user);
      renderFarmStatus(farm);
      setLastChecked();
    } catch (error) {
      setLastChecked(`ตรวจสอบไม่สำเร็จ: ${error.message}`);
    } finally {
      checking = false;
      if (button) {
        button.disabled = false;
        button.textContent = "↻ รีเฟรชสถานะ";
      }
    }
  }

  renderFarmStatus(initialFarm);
  document.getElementById("refreshFarmStatus")?.addEventListener("click", () => void refreshFarmStatus(currentUser, true));

  if (window.catmatchFirebase?.configured && window.catmatchFirebase.auth) {
    window.catmatchFirebase.auth.onAuthStateChanged((user) => {
      currentUser = user || null;
      window.clearInterval(pollTimer);
      void refreshFarmStatus(currentUser);
      pollTimer = window.setInterval(() => void refreshFarmStatus(currentUser), POLL_INTERVAL);
    });
  } else {
    void refreshFarmStatus(null);
    pollTimer = window.setInterval(() => void refreshFarmStatus(null), POLL_INTERVAL);
  }

  function prepareOneTimeHomeNotice() {
    try {
      const current = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") || initialFarm;
      sessionStorage.setItem("catmatch_farm_home_notice_once_v1", JSON.stringify(current));
    } catch (_error) {}
  }
  document.querySelectorAll('a[href="./index.html"]').forEach((link) => link.addEventListener("click", prepareOneTimeHomeNotice));
  window.addEventListener("focus", () => void refreshFarmStatus(currentUser));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void refreshFarmStatus(currentUser); });
  window.setTimeout(() => document.body.classList.add("is-ready"), 40);
})();
