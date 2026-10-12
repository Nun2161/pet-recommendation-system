"use strict";

(() => {
  const API_BASE = String(window.CATMATCH_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
  const API_ROOT = `${API_BASE}/admin`;
  const TOKEN_KEYS = ["catmatch_admin_token", "admin_token", "adminToken", "catmatch_token", "token"];
  const APPROVAL_LABELS = { pending: "รอตรวจสอบ", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ" };
  const ADOPTION_LABELS = { available: "กำลังรอบ้าน", contacting: "อยู่ระหว่างพูดคุย", reserved: "อยู่ระหว่างพิจารณา", adopted: "ได้บ้านแล้ว", unavailable: "ปิดประกาศ" };
  const GENDER_LABELS = { male: "เพศผู้", female: "เพศเมีย", unknown: "ไม่ระบุเพศ" };
  const SIZE_LABELS = { small: "ขนาดเล็ก", medium: "ขนาดกลาง", large: "ขนาดใหญ่" };

  const $ = (id) => document.getElementById(id);
  const els = {
    message: $("adminMessage"), refresh: $("refreshStrayListings"), search: $("strayAdminSearch"), approval: $("strayAdminApproval"), count: $("strayAdminCount"), pendingCount: $("strayPendingCount"), list: $("strayAdminList"), empty: $("strayAdminEmpty"), skeleton: $("strayAdminSkeleton"),
    speciesButtons: Array.from(document.querySelectorAll("[data-stray-admin-species]")),
    dialog: $("strayReviewDialog"), close: $("strayReviewClose"), image: $("strayReviewImage"), source: $("strayReviewSource"), title: $("strayReviewTitle"), meta: $("strayReviewMeta"), user: $("strayReviewUser"), contact: $("strayReviewContact"), location: $("strayReviewLocation"), detail: $("strayReviewDetail"), reasonWrap: $("strayReviewReasonWrap"), reason: $("strayReviewReason"), approve: $("strayReviewApprove"), reject: $("strayReviewReject"), cancel: $("strayReviewCancel")
  };
  let activeSpecies = "dog";
  let listings = [];
  let selected = null;
  let searchTimer = null;

  function getToken() {
    for (const key of TOKEN_KEYS) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (value) return value;
    }
    return "";
  }
  function escapeHTML(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function resolveImageUrl(value) {
    const imageUrl = String(value || "").trim();
    if (!imageUrl) return "";
    if (/^(?:data:|blob:|https?:\/\/|\/\/)/i.test(imageUrl)) return imageUrl;
    try { return new URL(imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`, new URL(API_BASE).origin).href; } catch (_) { return imageUrl; }
  }
  function showMessage(message = "", type = "error") {
    if (!els.message) return;
    els.message.textContent = message;
    els.message.hidden = !message;
    els.message.classList.toggle("is-success", type === "success");
  }
  async function api(path, options = {}) {
    const token = getToken();
    if (!token) { window.location.replace("./login.html"); throw new Error("กรุณาเข้าสู่ระบบผู้ดูแลระบบ"); }
    const response = await fetch(`${API_ROOT}${path}`, { ...options, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || "ไม่สามารถดำเนินการได้");
    return data;
  }
  function updateSpeciesUi() {
    els.speciesButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.strayAdminSpecies === activeSpecies));
  }
  function card(item) {
    const traits = (item.traits || []).slice(0, 4).map((trait) => `<span>${escapeHTML(trait)}</span>`).join("");
    const contact = [item.contact_phone, item.contact_line].filter(Boolean).join(" · ") || "ติดต่อผ่านเว็บ";
    return `<article class="admin-stray-card">
      <div class="admin-stray-card__media"><img src="${escapeHTML(resolveImageUrl(item.cover_image_url))}" alt="${escapeHTML(item.name)}"><span class="admin-stray-status is-${escapeHTML(item.approval_status)}">${escapeHTML(APPROVAL_LABELS[item.approval_status] || item.approval_status)}</span></div>
      <div class="admin-stray-card__content">
        <p class="admin-stray-kicker">ประกาศโดยผู้ใช้ #${item.user_id}</p><h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(GENDER_LABELS[item.gender] || item.gender)} · ${escapeHTML(item.estimated_age || "ไม่ระบุอายุ")} · ${escapeHTML(SIZE_LABELS[item.size] || item.size)}</p>
        <div class="admin-stray-traits">${traits}</div>
        <dl><div><dt>ผู้ลงประกาศ</dt><dd>${escapeHTML(item.contact_name || item.account_name)}</dd></div><div><dt>ติดต่อ</dt><dd>${escapeHTML(contact)}</dd></div><div><dt>สถานที่</dt><dd>${escapeHTML(item.province)} · ${escapeHTML(item.location_text)}</dd></div><div><dt>สถานะหาบ้าน</dt><dd>${escapeHTML(ADOPTION_LABELS[item.adoption_status] || item.adoption_status)}</dd></div></dl>
        ${item.rejection_reason ? `<p class="admin-stray-reason"><strong>เหตุผลที่ไม่อนุมัติ:</strong> ${escapeHTML(item.rejection_reason)}</p>` : ""}
      </div>
      <div class="admin-stray-card__actions"><button class="button button-secondary button-small" type="button" data-stray-review="${item.listing_id}">ดูรายละเอียด</button>${item.approval_status !== "approved" ? `<button class="button button-primary button-small" type="button" data-stray-quick-approve="${item.listing_id}">อนุมัติ</button>` : ""}</div>
    </article>`;
  }
  function render() {
    if (els.count) els.count.textContent = `${listings.length} ประกาศ`;
    if (els.pendingCount) els.pendingCount.textContent = listings.filter((item) => item.approval_status === "pending").length;
    if (els.empty) els.empty.hidden = Boolean(listings.length);
    if (els.list) els.list.innerHTML = listings.map(card).join("");
  }
  async function load() {
    if (els.skeleton) els.skeleton.hidden = false;
    if (els.empty) els.empty.hidden = true;
    try {
      const search = encodeURIComponent(els.search?.value.trim() || "");
      const approval = encodeURIComponent(els.approval?.value || "pending");
      const data = await api(`/stray-listings?species=${activeSpecies}&approval=${approval}&search=${search}`);
      listings = Array.isArray(data.data) ? data.data : [];
      render();
    } catch (error) { showMessage(error.message); }
    finally { if (els.skeleton) els.skeleton.hidden = true; }
  }
  function openDialog(item) {
    selected = item;
    if (!item || !els.dialog) return;
    els.image.src = resolveImageUrl(item.cover_image_url);
    els.source.textContent = `USER HOME-FINDING LISTING #${item.listing_id}`;
    els.title.textContent = item.name;
    els.meta.textContent = `${GENDER_LABELS[item.gender] || item.gender} · ${item.estimated_age || "ไม่ระบุอายุ"} · ${SIZE_LABELS[item.size] || item.size} · ${item.province}`;
    els.user.innerHTML = `<strong>${escapeHTML(item.contact_name || item.account_name)}</strong><span>${escapeHTML(item.account_email || "")}</span>`;
    els.contact.innerHTML = `<strong>ช่องทางติดต่อ</strong><span>${escapeHTML([item.contact_phone, item.contact_social_url, item.contact_line, item.allow_web_contact ? "อนุญาตแชทในเว็บ" : ""].filter(Boolean).join(" · ") || "ไม่ได้ระบุ")}</span>`;
    els.location.innerHTML = `<strong>ตำแหน่งที่พบ</strong><span>${escapeHTML(item.location_text)}<br>${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}</span>`;
    els.detail.innerHTML = `<div><strong>สุขภาพ</strong><p>${escapeHTML(item.health_detail || "ไม่ระบุ")}</p></div><div><strong>วัคซีน / ทำหมัน</strong><p>${escapeHTML(item.vaccination_status || "ไม่ระบุ")} · ${escapeHTML(item.sterilization_status || "ไม่ระบุ")}</p></div><div><strong>นิสัย</strong><p>${escapeHTML(item.personality || "ไม่ระบุ")}</p></div><div><strong>เรื่องราว</strong><p>${escapeHTML(item.background_story || "ไม่ระบุ")}</p></div><div><strong>บ้านที่เหมาะสม</strong><p>${escapeHTML(item.suitable_home || "ไม่ระบุ")}</p></div>`;
    els.reason.value = item.rejection_reason || "";
    els.reasonWrap.hidden = item.approval_status !== "rejected";
    els.approve.hidden = item.approval_status === "approved";
    if (typeof els.dialog.showModal === "function") els.dialog.showModal(); else els.dialog.setAttribute("open", "");
  }
  function closeDialog() { if (!els.dialog) return; if (typeof els.dialog.close === "function") els.dialog.close(); else els.dialog.removeAttribute("open"); selected = null; }
  async function review(approval, item = selected) {
    if (!item) return;
    let reason = "";
    if (approval === "rejected") {
      els.reasonWrap.hidden = false;
      reason = els.reason.value.trim();
      if (!reason) { els.reason.focus(); showMessage("กรุณาระบุเหตุผลที่ไม่อนุมัติ"); return; }
    }
    try {
      const data = await api(`/stray-listings/${item.listing_id}/review`, { method: "PATCH", body: JSON.stringify({ approval_status: approval, rejection_reason: reason }) });
      closeDialog();
      showMessage(data.message, "success");
      await load();
    } catch (error) { showMessage(error.message); }
  }
  function bind() {
    document.querySelectorAll('[data-admin-section="stray-listings"]').forEach((button) => button.addEventListener("click", load));
    els.refresh?.addEventListener("click", load);
    els.speciesButtons.forEach((button) => button.addEventListener("click", () => { activeSpecies = button.dataset.strayAdminSpecies === "cat" ? "cat" : "dog"; updateSpeciesUi(); load(); }));
    els.search?.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 250); });
    els.approval?.addEventListener("change", load);
    els.list?.addEventListener("click", (event) => {
      const reviewButton = event.target.closest("[data-stray-review]");
      const approveButton = event.target.closest("[data-stray-quick-approve]");
      if (reviewButton) openDialog(listings.find((item) => Number(item.listing_id) === Number(reviewButton.dataset.strayReview)));
      if (approveButton) review("approved", listings.find((item) => Number(item.listing_id) === Number(approveButton.dataset.strayQuickApprove)));
    });
    els.close?.addEventListener("click", closeDialog); els.cancel?.addEventListener("click", closeDialog);
    els.approve?.addEventListener("click", () => review("approved")); els.reject?.addEventListener("click", () => review("rejected"));
    els.dialog?.addEventListener("click", (event) => { if (event.target === els.dialog) closeDialog(); });
  }
  updateSpeciesUi();
  bind();
  if (new URLSearchParams(location.search).get("section") === "stray-listings") document.querySelector('[data-admin-section="stray-listings"]')?.click();
})();
