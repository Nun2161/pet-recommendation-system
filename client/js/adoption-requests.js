"use strict";

(() => {
  const API_BASE = String(window.CATMATCH_API_URL || "http://127.0.0.1:3000/api").replace(/\/+$/, "");
  const REQUESTS_URL = `${API_BASE}/adoptions/my`;
  const LISTINGS_URL = `${API_BASE}/stray-listings`;
  const AUTH_KEYS = ["catmatch_token", "userToken", "token"];
  const USER_KEYS = ["catmatch_user", "user"];

  const state = {
    activeTab: "requests",
    requests: [],
    requestFilter: "all",
    listings: [],
    listingSpecies: "all",
    listingStatus: "all",
    requestsLoading: false,
    listingsLoading: false,
  };
  const ui = {};

  const requestStatusMeta = {
    pending: { label: "รอตอบกลับ", className: "is-pending" },
    approved: { label: "อนุมัติแล้ว", className: "is-approved" },
    rejected: { label: "ปฏิเสธแล้ว", className: "is-rejected" },
    cancelled: { label: "ยกเลิกแล้ว", className: "is-cancelled" },
    adopted: { label: "รับอุปการะแล้ว", className: "is-approved" },
  };
  const approvalMeta = {
    pending: { label: "รอแอดมินตรวจสอบ", className: "is-pending" },
    approved: { label: "อนุมัติแล้ว", className: "is-approved" },
    rejected: { label: "ไม่ผ่านการอนุมัติ", className: "is-rejected" },
  };
  const adoptionMeta = {
    available: "กำลังรอบ้าน",
    contacting: "อยู่ระหว่างพูดคุย",
    reserved: "อยู่ระหว่างพิจารณา",
    adopted: "ได้บ้านแล้ว",
    unavailable: "ปิดประกาศ",
  };

  document.addEventListener("DOMContentLoaded", () => void initialize());

  async function initialize() {
    cacheElements();
    setupMenus();
    setupActions();

    const session = window.CatMatchUserSession?.ensure
      ? await window.CatMatchUserSession.ensure()
      : { signedIn: Boolean(readToken()), token: readToken(), user: readStoredUser() };

    if (!session?.signedIn) {
      const returnValue = encodeURIComponent(`adoption-requests${window.location.search || ""}`);
      window.location.replace(`./login.html?return=${returnValue}`);
      return;
    }

    renderAccount(session.user || readStoredUser());
    applyInitialQuery();
    setActiveTab(state.activeTab, { updateUrl: false });
    await Promise.all([loadRequests(), loadMyListings()]);
  }

  function cacheElements() {
    ui.tabs = Array.from(document.querySelectorAll("[data-activity-tab]"));
    ui.panels = Array.from(document.querySelectorAll("[data-activity-panel]"));
    ui.summaryLabel = document.getElementById("activitySummaryLabel");
    ui.summaryCount = document.getElementById("adoptionRequestCount");
    ui.summaryUnit = document.getElementById("activitySummaryUnit");

    ui.requestList = document.getElementById("adoptionList");
    ui.requestLoading = document.getElementById("adoptionLoading");
    ui.requestEmpty = document.getElementById("adoptionEmpty");
    ui.requestError = document.getElementById("adoptionError");
    ui.requestErrorMessage = document.getElementById("adoptionErrorMessage");
    ui.requestStatus = document.getElementById("adoptionStatus");
    ui.requestRefresh = document.getElementById("refreshAdoptionRequests");
    ui.requestRetry = document.getElementById("retryAdoptionRequests");
    ui.requestFilters = Array.from(document.querySelectorAll(".adoption-filter"));

    ui.listingList = document.getElementById("myListingsList");
    ui.listingLoading = document.getElementById("myListingsLoading");
    ui.listingEmpty = document.getElementById("myListingsEmpty");
    ui.listingError = document.getElementById("myListingsError");
    ui.listingErrorMessage = document.getElementById("myListingsErrorMessage");
    ui.listingStatusText = document.getElementById("myListingsStatus");
    ui.listingRefresh = document.getElementById("refreshMyListings");
    ui.listingRetry = document.getElementById("retryMyListings");
    ui.listingSpeciesFilters = Array.from(document.querySelectorAll("[data-listing-species]"));
    ui.listingStatusFilter = document.getElementById("listingStatusFilter");
  }

  function applyInitialQuery() {
    const params = new URLSearchParams(window.location.search);
    state.activeTab = params.get("tab") === "listings" ? "listings" : "requests";
    const species = params.get("species");
    if (["cat", "dog"].includes(species)) state.listingSpecies = species;
    ui.listingSpeciesFilters.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.listingSpecies === state.listingSpecies);
    });
  }

  function readToken() {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of AUTH_KEYS) {
        const value = storage.getItem(key);
        if (value) return value;
      }
    }
    return "";
  }

  function readStoredUser() {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of USER_KEYS) {
        try {
          const value = JSON.parse(storage.getItem(key) || "null");
          if (value) return value;
        } catch (_error) {}
      }
    }
    return null;
  }

  function renderAccount(user) {
    const name = String(user?.username || user?.full_name || user?.name || "ผู้ใช้งาน").trim();
    const email = String(user?.email || "").trim();
    const initial = name.charAt(0).toUpperCase() || "U";
    document.getElementById("userNavActions")?.removeAttribute("hidden");
    for (const id of ["userDisplayName", "userMenuName"]) {
      const element = document.getElementById(id);
      if (element) element.textContent = name;
    }
    const emailElement = document.getElementById("userMenuEmail");
    if (emailElement) emailElement.textContent = email;
    for (const id of ["userAvatar", "userMenuAvatar"]) {
      const element = document.getElementById(id);
      if (element && !element.querySelector("img")) element.textContent = initial;
    }
  }

  function setupMenus() {
    const trigger = document.getElementById("userMenuTrigger");
    const panel = document.getElementById("userMenuPanel");
    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");

    trigger?.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = panel?.hasAttribute("hidden");
      panel?.toggleAttribute("hidden", !open);
      trigger.setAttribute("aria-expanded", String(open));
    });
    menuToggle?.addEventListener("click", () => {
      const open = mainNav?.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(Boolean(open)));
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#userMenuTrigger,#userMenuPanel")) {
        panel?.setAttribute("hidden", "");
        trigger?.setAttribute("aria-expanded", "false");
      }
    });
    document.getElementById("accountSettingsButton")?.addEventListener("click", () => {
      window.location.href = "./settings.html";
    });
    document.getElementById("logoutButton")?.addEventListener("click", async () => {
      window.CatMatchUserSession?.clear?.();
      for (const storage of [localStorage, sessionStorage]) {
        [...AUTH_KEYS, ...USER_KEYS].forEach((key) => storage.removeItem(key));
      }
      try { await window.catmatchFirebase?.signOut?.(); } catch (_error) {}
      window.location.replace("./login.html");
    });
  }

  function setupActions() {
    ui.tabs.forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.activityTab)));
    ui.requestRefresh?.addEventListener("click", () => void loadRequests());
    ui.requestRetry?.addEventListener("click", () => void loadRequests());
    ui.requestFilters.forEach((button) => button.addEventListener("click", () => {
      state.requestFilter = button.dataset.status || "all";
      ui.requestFilters.forEach((item) => item.classList.toggle("is-active", item === button));
      renderRequests();
    }));

    ui.listingRefresh?.addEventListener("click", () => void loadMyListings());
    ui.listingRetry?.addEventListener("click", () => void loadMyListings());
    ui.listingSpeciesFilters.forEach((button) => button.addEventListener("click", () => {
      state.listingSpecies = button.dataset.listingSpecies || "all";
      ui.listingSpeciesFilters.forEach((item) => item.classList.toggle("is-active", item === button));
      renderMyListings();
      updateQuery();
    }));
    ui.listingStatusFilter?.addEventListener("change", () => {
      state.listingStatus = ui.listingStatusFilter.value || "all";
      renderMyListings();
    });
    ui.listingList?.addEventListener("click", (event) => {
      const statusButton = event.target.closest("[data-listing-status]");
      if (!statusButton) return;
      void updateListingStatus(statusButton.dataset.listingStatus, statusButton.dataset.nextStatus);
    });
  }

  function setActiveTab(tab, { updateUrl = true } = {}) {
    state.activeTab = tab === "listings" ? "listings" : "requests";
    ui.tabs.forEach((button) => {
      const active = button.dataset.activityTab === state.activeTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    ui.panels.forEach((panel) => {
      panel.hidden = panel.dataset.activityPanel !== state.activeTab;
    });
    updateSummary();
    if (updateUrl) updateQuery();
  }

  function updateQuery() {
    const url = new URL(window.location.href);
    if (state.activeTab === "listings") url.searchParams.set("tab", "listings");
    else url.searchParams.delete("tab");
    if (state.activeTab === "listings" && ["cat", "dog"].includes(state.listingSpecies)) {
      url.searchParams.set("species", state.listingSpecies);
    } else {
      url.searchParams.delete("species");
    }
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function updateSummary() {
    const listingsTab = state.activeTab === "listings";
    if (ui.summaryLabel) ui.summaryLabel.textContent = listingsTab ? "ประกาศทั้งหมด" : "คำขอทั้งหมด";
    if (ui.summaryCount) ui.summaryCount.textContent = String(listingsTab ? state.listings.length : state.requests.length);
    if (ui.summaryUnit) ui.summaryUnit.textContent = listingsTab ? "ประกาศ" : "รายการ";
  }

  async function authenticatedFetch(url, options = {}) {
    if (window.CatMatchUserSession?.fetchWithAuth) {
      return window.CatMatchUserSession.fetchWithAuth(url, options);
    }
    const token = readToken();
    if (!token) throw new Error("กรุณาเข้าสู่ระบบ");
    return fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
  }

  async function loadRequests() {
    if (state.requestsLoading) return;
    state.requestsLoading = true;
    setRequestView("loading");
    if (ui.requestRefresh) ui.requestRefresh.disabled = true;
    setText(ui.requestStatus, "กำลังตรวจสอบคำขอล่าสุด…");
    try {
      const response = await authenticatedFetch(`${REQUESTS_URL}?t=${Date.now()}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || "ไม่สามารถโหลดคำขออุปการะได้");
      state.requests = Array.isArray(result.data) ? result.data : [];
      renderRequests();
      setText(ui.requestStatus, `อัปเดตล่าสุด ${currentTime()}`);
      updateSummary();
    } catch (error) {
      setRequestView("error");
      setText(ui.requestErrorMessage, error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setText(ui.requestStatus, "");
    } finally {
      state.requestsLoading = false;
      if (ui.requestRefresh) ui.requestRefresh.disabled = false;
    }
  }

  function renderRequests() {
    const visible = state.requestFilter === "all"
      ? state.requests
      : state.requests.filter((item) => normalizeStatus(item.status) === state.requestFilter);
    if (!visible.length) {
      setRequestView("empty");
      return;
    }
    ui.requestList.innerHTML = visible.map(requestCardTemplate).join("");
    setRequestView("list");
    const requestedId = Number(new URLSearchParams(location.search).get("request_id"));
    if (requestedId > 0) {
      const target = ui.requestList.querySelector(`[data-request-id="${requestedId}"]`);
      target?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
      target?.classList.add("is-highlighted");
    }
  }

  function requestCardTemplate(item) {
    const status = normalizeStatus(item.status);
    const meta = requestStatusMeta[status] || { label: status || "ไม่ทราบสถานะ", className: "is-cancelled" };
    const species = String(item.species || "cat").toLowerCase() === "dog" ? "dog" : "cat";
    const animalName = item.animal_name || (species === "dog" ? "สุนัขจากฟาร์ม" : "แมวจากฟาร์ม");
    const breedName = item.breed_name || "ยังไม่ระบุสายพันธุ์";
    const image = normalizeImage(item.image_url);
    const age = formatAge(item.age_months);
    const gender = formatGender(item.gender);
    const phone = String(item.phone || "").replace(/[^+\d]/g, "");
    const mapPage = species === "dog" ? "dog-farm-map.html?species=dog" : "farm-map.html";
    const mapLink = `./${mapPage}${mapPage.includes("?") ? "&" : "?"}breed_id=${encodeURIComponent(item.breed_id || "")}&breed_name=${encodeURIComponent(breedName)}&source=adoption`;
    return `<article class="adoption-card" data-request-id="${Number(item.request_id) || 0}">
      <div class="adoption-card__image">${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(animalName)}" loading="lazy">` : `<span aria-hidden="true">${species === "dog" ? "🐕" : "🐈"}</span>`}</div>
      <div class="adoption-card__body"><div class="adoption-card__top"><h2>${escapeHTML(animalName)}</h2><span class="adoption-badge ${meta.className}">${meta.label}</span></div>
      <div class="adoption-card__meta"><span>${species === "dog" ? "สุนัข" : "แมว"}</span><span>${escapeHTML(breedName)}</span>${age ? `<span>${escapeHTML(age)}</span>` : ""}${gender ? `<span>${escapeHTML(gender)}</span>` : ""}</div>
      <p class="adoption-card__farm"><strong>${escapeHTML(item.farm_name || "ฟาร์ม")}</strong><br>${escapeHTML(item.address || "ยังไม่ได้ระบุที่อยู่")}</p><small class="adoption-card__date">ส่งคำขอเมื่อ ${formatDate(item.request_date)}</small></div>
      <div class="adoption-card__actions"><a href="${mapLink}">ดูฟาร์มบนแผนที่</a>${phone ? `<a href="tel:${phone}">โทรหาฟาร์ม</a>` : `<a href="./notifications.html">ดูการแจ้งเตือน</a>`}</div>
    </article>`;
  }

  async function loadMyListings() {
    if (state.listingsLoading) return;
    state.listingsLoading = true;
    setListingView("loading");
    if (ui.listingRefresh) ui.listingRefresh.disabled = true;
    setText(ui.listingStatusText, "กำลังตรวจสอบประกาศล่าสุด…");
    try {
      const response = await authenticatedFetch(`${LISTINGS_URL}/mine?t=${Date.now()}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || "ไม่สามารถโหลดประกาศของคุณได้");
      state.listings = Array.isArray(result.data) ? result.data : [];
      renderMyListings();
      setText(ui.listingStatusText, `อัปเดตล่าสุด ${currentTime()}`);
      updateSummary();
    } catch (error) {
      setListingView("error");
      setText(ui.listingErrorMessage, error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setText(ui.listingStatusText, "");
    } finally {
      state.listingsLoading = false;
      if (ui.listingRefresh) ui.listingRefresh.disabled = false;
    }
  }

  function renderMyListings() {
    const visible = state.listings.filter((item) => {
      if (state.listingSpecies !== "all" && item.species !== state.listingSpecies) return false;
      if (state.listingStatus === "all") return true;
      if (state.listingStatus === "adopted") return item.adoption_status === "adopted";
      return item.approval_status === state.listingStatus;
    });
    if (!visible.length) {
      setListingView("empty");
      return;
    }
    ui.listingList.innerHTML = visible.map(listingCardTemplate).join("");
    setListingView("list");
  }

  function listingCardTemplate(item) {
    const species = item.species === "dog" ? "dog" : "cat";
    const speciesLabel = species === "dog" ? "สุนัข" : "แมว";
    const approval = approvalMeta[item.approval_status] || { label: item.approval_status || "ไม่ทราบสถานะ", className: "is-cancelled" };
    const adoptionLabel = adoptionMeta[item.adoption_status] || item.adoption_status || "ไม่ทราบสถานะ";
    const image = normalizeImage(item.cover_image_url);
    const canEdit = item.approval_status !== "approved" && item.adoption_status !== "adopted";
    const editPage = species === "dog" ? "dog-stray-listing.html" : "cat-stray-listing.html";
    const detailPage = species === "dog" ? "dog-shelter-detail.html" : "cat-shelter-detail.html";
    const statusAction = item.approval_status === "approved"
      ? `<button type="button" data-listing-status="${Number(item.listing_id)}" data-next-status="${item.adoption_status === "adopted" ? "available" : "adopted"}">${item.adoption_status === "adopted" ? "เปิดประกาศอีกครั้ง" : "บันทึกว่าได้บ้านแล้ว"}</button>`
      : "";
    return `<article class="my-listing-card">
      <div class="my-listing-card__image">${image ? `<img src="${escapeHTML(image)}" alt="${speciesLabel}ชื่อ ${escapeHTML(item.name)}" loading="lazy">` : `<span aria-hidden="true">${species === "dog" ? "🐕" : "🐈"}</span>`}</div>
      <div class="my-listing-card__body"><div class="my-listing-card__top"><span class="listing-species">${speciesLabel}</span><span class="adoption-badge ${approval.className}">${approval.label}</span></div><h3>${escapeHTML(item.name || `ประกาศ${speciesLabel}`)}</h3><p>${escapeHTML(item.province || "ไม่ระบุจังหวัด")} · ${escapeHTML(adoptionLabel)}</p>${item.rejection_reason ? `<small>เหตุผล: ${escapeHTML(item.rejection_reason)}</small>` : ""}</div>
      <div class="my-listing-card__actions">${item.approval_status === "approved" && item.adoption_status === "available" ? `<a href="./${detailPage}?animal_id=u-${Number(item.listing_id)}">ดูหน้าประกาศ</a>` : ""}${canEdit ? `<a href="./${editPage}?edit=${Number(item.listing_id)}&from=adoption-requests">แก้ไขประกาศ</a>` : ""}${statusAction}</div>
    </article>`;
  }

  async function updateListingStatus(id, nextStatus) {
    const listingId = Number(id);
    if (!listingId || !["available", "adopted"].includes(nextStatus)) return;
    try {
      const response = await authenticatedFetch(`${LISTINGS_URL}/${listingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ adoption_status: nextStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || "ไม่สามารถอัปเดตสถานะประกาศได้");
      setText(ui.listingStatusText, result.message || "อัปเดตสถานะแล้ว");
      await loadMyListings();
    } catch (error) {
      setText(ui.listingStatusText, error.message || "ไม่สามารถอัปเดตสถานะประกาศได้");
    }
  }

  function setRequestView(name) {
    if (ui.requestLoading) ui.requestLoading.hidden = name !== "loading";
    if (ui.requestList) ui.requestList.hidden = name !== "list";
    if (ui.requestEmpty) ui.requestEmpty.hidden = name !== "empty";
    if (ui.requestError) ui.requestError.hidden = name !== "error";
  }
  function setListingView(name) {
    if (ui.listingLoading) ui.listingLoading.hidden = name !== "loading";
    if (ui.listingList) ui.listingList.hidden = name !== "list";
    if (ui.listingEmpty) ui.listingEmpty.hidden = name !== "empty";
    if (ui.listingError) ui.listingError.hidden = name !== "error";
  }
  function setText(element, value) { if (element) element.textContent = value; }
  function normalizeStatus(value) { return String(value || "pending").trim().toLowerCase(); }
  function normalizeImage(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(data:|blob:|https?:)/i.test(raw)) return window.CatMatchApi?.resolve(raw) || raw;
    return raw.startsWith("/") ? `${window.CATMATCH_API_BASE_URL}${raw}` : `${window.CATMATCH_API_BASE_URL}/${raw}`;
  }
  function formatAge(months) {
    const value = Number(months);
    if (!Number.isFinite(value) || value < 0) return "";
    if (value < 12) return `${value} เดือน`;
    const years = Math.floor(value / 12);
    const remain = value % 12;
    return remain ? `${years} ปี ${remain} เดือน` : `${years} ปี`;
  }
  function formatGender(value) {
    const gender = String(value || "").toLowerCase();
    if (["male", "m", "เพศผู้"].includes(gender)) return "เพศผู้";
    if (["female", "f", "เพศเมีย"].includes(gender)) return "เพศเมีย";
    return value ? String(value) : "";
  }
  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  }
  function currentTime() { return new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }); }
  function reducedMotion() { return document.documentElement.dataset.reducedMotion === "true" || matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function escapeHTML(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
})();
