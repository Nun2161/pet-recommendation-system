"use strict";

(async () => {
  const currentPage = window.location.pathname.split("/").pop().toLowerCase();
  const isDog = currentPage === "dog-index.html";
  const species = isDog ? "dog" : "cat";
  const speciesLabel = isDog ? "สุนัข" : "แมว";
  const farmSection = document.querySelector(".farm-map-section");
  if (!farmSection || document.getElementById("shelterHomeSection")) return;

  const animals = (await window.CatMatchShelterData.loadList(species)).slice(0, 4);
  if (!animals.length) return;

  const allUrl = isDog ? "./dog-shelter-animals.html" : "./cat-shelter-animals.html";
  const submitUrl = isDog ? "./dog-stray-listing.html" : "./cat-stray-listing.html";
  const detailUrl = (id) => isDog
    ? `./dog-shelter-detail.html?animal_id=${encodeURIComponent(id)}`
    : `./cat-shelter-detail.html?animal_id=${encodeURIComponent(id)}`;

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function sourceLabel(item) {
    return item.source_type === "user"
      ? "ประกาศโดยผู้ใช้ · ผ่านแอดมิน"
      : `${item.shelter || "ศูนย์พักพิง"} ${item.verified ? "✓" : ""}`;
  }
  function sourceBadge(item) {
    return item.source_type === "user"
      ? '<span class="shelter-source-badge is-user">ผู้ใช้ช่วยหาบ้าน</span>'
      : '<span class="shelter-source-badge is-shelter">จากศูนย์พักพิง</span>';
  }
  function traits(item, limit = 3) {
    return (item.traits || []).slice(0, limit).map((trait) => `<span>${escapeHTML(trait)}</span>`).join("");
  }
  function compactCard(item) {
    return `
      <a class="shelter-mini-card" href="${detailUrl(item.id)}">
        <span class="shelter-mini-card__media"><img src="${escapeHTML(item.image)}" alt="${speciesLabel}ชื่อ ${escapeHTML(item.name)}" referrerpolicy="no-referrer">${sourceBadge(item)}</span>
        <span class="shelter-mini-card__body">
          <small>${item.urgent ? "ต้องการบ้านด่วน" : "กำลังรอบ้าน"}</small>
          <strong>${escapeHTML(item.name)}</strong>
          <span>${escapeHTML(item.gender)} · ${escapeHTML(item.age)}</span>
        </span>
        <span class="shelter-mini-card__arrow" aria-hidden="true">→</span>
      </a>`;
  }

  const featured = animals[0];
  const section = document.createElement("section");
  section.id = "shelterHomeSection";
  section.className = "shelter-home section section-shell";
  section.innerHTML = `
    <div class="container">
      <div class="section-heading row reveal shelter-home__heading">
        <div>
          <p class="eyebrow">พื้นที่ช่วยหาบ้านที่ผ่านการตรวจสอบ</p>
          <h2>เพื่อน${speciesLabel}ที่กำลังรอบ้าน</h2>
          <p class="shelter-home__intro">รวม${speciesLabel}จากศูนย์พักพิงและประกาศช่วยหาบ้านจากผู้ใช้ ทุกประกาศจากผู้ใช้ต้องผ่านการอนุมัติของแอดมินก่อนเผยแพร่</p>
        </div>
        <div class="shelter-home__actions">
          <a class="button button-secondary button-small" href="${submitUrl}" data-shelter-login-required>ลงประกาศ${speciesLabel}จร</a>
          <a class="text-link shelter-view-all-link" href="${allUrl}" data-shelter-login-required>ดูทั้งหมด <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <div class="shelter-home-grid reveal">
        <article class="shelter-featured-card">
          <div class="shelter-featured-card__media">
            <img src="${escapeHTML(featured.image)}" alt="${speciesLabel}ชื่อ ${escapeHTML(featured.name)}" referrerpolicy="no-referrer">
            <span class="shelter-status-badge ${featured.urgent ? "is-urgent" : ""}">${featured.urgent ? "ต้องการบ้านด่วน" : "กำลังรอบ้าน"}</span>
            ${sourceBadge(featured)}
          </div>
          <div class="shelter-featured-card__content">
            <p class="shelter-kicker">${escapeHTML(sourceLabel(featured))}</p>
            <h3>${escapeHTML(featured.name)}</h3>
            <p class="shelter-meta">${escapeHTML(featured.gender)} · ${escapeHTML(featured.age)} · ${escapeHTML(featured.size)}</p>
            <div class="shelter-traits">${traits(featured)}</div>
            <p class="shelter-story">${escapeHTML(featured.story)}</p>
            <a class="button button-primary shelter-primary-action" href="${detailUrl(featured.id)}">ทำความรู้จัก <span aria-hidden="true">→</span></a>
          </div>
        </article>
        <div class="shelter-mini-list">${animals.slice(1).map(compactCard).join("")}</div>
      </div>
      <p class="shelter-source-note">สัตว์จากศูนย์พักพิงจะระบุชื่อศูนย์ ส่วนประกาศจากผู้ใช้จะมีป้าย “ผู้ใช้ช่วยหาบ้าน” อย่างชัดเจน</p>
    </div>`;

  function isStoredSignedIn() {
    if (window.CatMatchUserSession?.isStoredSignedIn()) return true;
    const tokenKeys = ["catmatch_token", "userToken", "token"];
    return [sessionStorage, localStorage].some((storage) => tokenKeys.some((key) => Boolean(storage.getItem(key))));
  }

  async function ensureSignedIn() {
    if (isStoredSignedIn()) return true;
    if (window.CatMatchUserSession?.ensure) {
      const session = await window.CatMatchUserSession.ensure();
      return Boolean(session?.signedIn);
    }
    return Boolean(window.catmatchFirebase?.auth?.currentUser);
  }
  function openShelterLoginDialog() {
    let dialog = document.getElementById("shelterLoginRequiredDialog");
    if (!dialog) {
      const loginUrl = isDog
        ? "./login.html?species=dog&return=dog-index"
        : "./login.html?species=cat&portal=cat&return=index&fresh=1";
      const registerUrl = isDog
        ? "./register.html?species=dog&fresh=1&return=dog-index"
        : "./register.html?species=cat&portal=cat&fresh=1&return=index";
      dialog = document.createElement("dialog");
      dialog.id = "shelterLoginRequiredDialog";
      dialog.className = `shelter-login-dialog ${isDog ? "is-dog" : "is-cat"}`;
      dialog.innerHTML = `
        <button class="shelter-login-dialog__close" type="button" aria-label="ปิด">×</button>
        <div class="shelter-login-dialog__icon" aria-hidden="true">${isDog ? "🐶" : "🐱"}</div>
        <p class="eyebrow">พื้นที่ช่วยหาบ้าน</p>
        <h2>เข้าสู่ระบบก่อนใช้งานส่วนนี้</h2>
        <p>กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อน เพื่อดูรายการทั้งหมดหรือลงประกาศช่วยหาบ้านให้${speciesLabel}จร</p>
        <div class="shelter-login-dialog__actions">
          <a class="button button-primary" href="${loginUrl}">เข้าสู่ระบบ</a>
          <a class="button button-secondary" href="${registerUrl}">สมัครสมาชิก</a>
        </div>`;
      document.body.appendChild(dialog);
      dialog.querySelector(".shelter-login-dialog__close")?.addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", (event) => {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      });
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  section.querySelectorAll("[data-shelter-login-required]").forEach((link) => link.addEventListener("click", async (event) => {
    if (isStoredSignedIn()) return;
    event.preventDefault();
    const signedIn = await ensureSignedIn();
    if (signedIn) {
      window.location.href = link.href;
      return;
    }
    openShelterLoginDialog();
  }));

  farmSection.before(section);
  window.requestAnimationFrame(() => {
    section.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
  });
})();
