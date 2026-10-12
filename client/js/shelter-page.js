"use strict";

(async () => {
  const body = document.body;
  const species = body.dataset.species === "dog" ? "dog" : "cat";
  const speciesLabel = species === "dog" ? "สุนัข" : "แมว";
  const isDog = species === "dog";
  const submitUrl = isDog ? "./dog-stray-listing.html" : "./cat-stray-listing.html";
  const API_BASE = String(window.CATMATCH_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
  const FIREBASE_SESSION_URL = `${API_BASE}/auth/firebase/session`;
  const TOKEN_KEYS = ["catmatch_token", "userToken", "token"];

  function getToken() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of TOKEN_KEYS) {
        const value = storage.getItem(key);
        if (value) return value;
      }
    }
    return "";
  }

  function readStoredJSON(storage, key) {
    try { return JSON.parse(storage.getItem(key) || "null"); } catch (_) { return null; }
  }

  function getStoredUser() {
    return readStoredJSON(sessionStorage, "catmatch_user")
      || readStoredJSON(sessionStorage, "user")
      || readStoredJSON(localStorage, "catmatch_user")
      || readStoredJSON(localStorage, "user");
  }

  function getCurrentUserId() {
    const user = window.CatMatchUserSession?.getUser?.() || getStoredUser() || {};
    const storedId = Number(user.user_id ?? user.userId ?? user.id);
    if (Number.isInteger(storedId) && storedId > 0) return storedId;

    const token = getToken();
    if (!token || token.split(".").length < 2) return 0;
    try {
      const payloadText = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = payloadText.padEnd(Math.ceil(payloadText.length / 4) * 4, "=");
      const payload = JSON.parse(decodeURIComponent(Array.from(atob(padded), (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
      const tokenId = Number(payload.user_id ?? payload.userId ?? payload.id ?? payload.sub);
      return Number.isInteger(tokenId) && tokenId > 0 ? tokenId : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveSession(data, firebaseUser = null) {
    const token = data?.token || data?.accessToken || data?.data?.token || data?.data?.accessToken;
    const role = data?.role || data?.data?.role || "user";
    const profile = data?.user
      || data?.data?.user
      || data?.profile
      || data?.data?.profile
      || data?.[role]
      || data?.data?.[role]
      || (firebaseUser ? {
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || firebaseUser.email || "ผู้ใช้",
        photo_url: firebaseUser.photoURL || "",
      } : null);

    if (!token || role !== "user") return false;

    sessionStorage.setItem("token", token);
    sessionStorage.setItem("catmatch_token", token);
    sessionStorage.setItem("userToken", token);
    sessionStorage.setItem("catmatch_role", "user");

    if (profile) {
      const serialized = JSON.stringify(profile);
      sessionStorage.setItem("catmatch_user", serialized);
      sessionStorage.setItem("user", serialized);
    }
    return true;
  }

  function waitForFirebaseUser(timeoutMs = 8000) {
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

  async function restoreBackendSession(firebaseUser) {
    const bridge = window.catmatchFirebase;
    if (!firebaseUser || !bridge?.configured || typeof bridge.getIdToken !== "function") return false;

    const idToken = await bridge.getIdToken(firebaseUser, false);
    const allowCreate = Array.isArray(firebaseUser.providerData)
      && firebaseUser.providerData.some((provider) => provider?.providerId === "google.com");
    const response = await fetch(FIREBASE_SESSION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ idToken, allowCreate }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "ไม่สามารถกู้คืนเซสชันเข้าสู่ระบบได้");
    }
    return saveSession(data, firebaseUser);
  }

  async function isSignedIn() {
    // ใช้ตัวจัดการเซสชันกลางก่อน เพื่อให้ Google/JWT เชื่อมกันทุกหน้าของหมาและแมว
    if (window.CatMatchUserSession?.ensure) {
      const session = await window.CatMatchUserSession.ensure();
      return Boolean(session?.signedIn);
    }

    // JWT เพียงอย่างเดียวถือว่าเข้าสู่ระบบแล้ว ไม่บังคับให้มีข้อมูลโปรไฟล์ซ้ำใน storage
    if (getToken()) return true;

    const firebaseUser = await waitForFirebaseUser();
    if (!firebaseUser) return false;

    try {
      await restoreBackendSession(firebaseUser);
    } catch (error) {
      console.warn("Unable to restore CatMatch backend session:", error);
      if (!getStoredUser()) {
        const profile = JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || firebaseUser.email || "ผู้ใช้",
          photo_url: firebaseUser.photoURL || "",
        });
        for (const storage of [localStorage, sessionStorage]) {
          storage.setItem("catmatch_user", profile);
          storage.setItem("user", profile);
        }
      }
    }
    return true;
  }

  function getHeaderUser() {
    const stored = getStoredUser();
    if (stored) return stored;

    const firebaseUser = window.catmatchFirebase?.auth?.currentUser;
    if (!firebaseUser) return {};

    return {
      firebase_uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || firebaseUser.email || "ผู้ใช้งาน",
      photo_url: firebaseUser.photoURL || "",
    };
  }

  function syncAuthenticatedNavigation() {
    const guestActions = document.getElementById("guestNavActions");
    const userActions = document.getElementById("userNavActions");
    if (!guestActions || !userActions) return;

    // หน้าแมวไม่ได้โหลด index.js จึงต้องสลับแถบผู้ใช้จากตัวจัดการหน้านี้โดยตรง
    guestActions.hidden = true;
    guestActions.setAttribute("aria-hidden", "true");
    userActions.hidden = false;
    userActions.setAttribute("aria-hidden", "false");

    const user = getHeaderUser();
    const displayName = String(
      user.username || user.full_name || user.name || user.nickname || "ผู้ใช้งาน"
    ).trim() || "ผู้ใช้งาน";
    const email = String(user.email || "").trim();
    const initial = (displayName.charAt(0) || "U").toUpperCase();

    const values = {
      userDisplayName: displayName,
      userMenuName: displayName,
      userMenuEmail: email,
      userAvatar: initial,
      userMenuAvatar: initial,
    };

    for (const [id, value] of Object.entries(values)) {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    }

    window.CatMatchProfileAvatar?.sync?.();
  }

  function renderLoginRequired() {
    const loginUrl = isDog
      ? "./login.html?species=dog&return=dog-shelter-animals"
      : "./login.html?species=cat&portal=cat&fresh=1&return=cat-shelter-animals";
    const registerUrl = isDog
      ? "./register.html?species=dog&fresh=1&return=dog-shelter-animals"
      : "./register.html?species=cat&portal=cat&fresh=1&return=cat-shelter-animals";
    const homeUrl = isDog ? "./dog-index.html" : "./index.html";
    document.body.className = `shelter-auth-required-page ${isDog ? "dog-theme" : "cat-theme"}`;
    document.body.innerHTML = `
      <main class="shelter-auth-required">
        <section class="shelter-auth-card" aria-labelledby="shelterAuthTitle">
          <div class="shelter-auth-icon" aria-hidden="true">${isDog ? "🐶" : "🐱"}</div>
          <p class="eyebrow">พื้นที่ช่วยหาบ้าน</p>
          <h1 id="shelterAuthTitle">เข้าสู่ระบบก่อนดู${speciesLabel}ที่กำลังรอบ้าน</h1>
          <p>กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อน เพื่อดูรายการทั้งหมด รายละเอียดช่องทางติดต่อ และลงประกาศช่วยหาบ้านให้${speciesLabel}</p>
          <div class="shelter-auth-actions">
            <a class="button button-primary" href="${loginUrl}">เข้าสู่ระบบ</a>
            <a class="button button-secondary" href="${registerUrl}">สมัครสมาชิก</a>
          </div>
          <a class="shelter-auth-back" href="${homeUrl}">← กลับหน้า ${isDog ? "DogMatch" : "CatMatch"}</a>
        </section>
      </main>`;
  }

  if (!(await isSignedIn())) {
    renderLoginRequired();
    return;
  }

  syncAuthenticatedNavigation();

  let allAnimals = await window.CatMatchShelterData.loadList(species);

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function detailUrl(id) {
    return species === "dog"
      ? `./dog-shelter-detail.html?animal_id=${encodeURIComponent(id)}`
      : `./cat-shelter-detail.html?animal_id=${encodeURIComponent(id)}`;
  }
  function safeHttpUrl(value) {
    try {
      const parsed = new URL(String(value || ""), window.location.href);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch (_) { return ""; }
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
  function animalCard(item) {
    const tags = (item.traits || []).slice(0, 3).map((trait) => `<span>${escapeHTML(trait)}</span>`).join("");
    return `
      <article class="shelter-animal-card">
        <a class="shelter-animal-card__media" href="${detailUrl(item.id)}">
          <img src="${escapeHTML(item.image)}" alt="${speciesLabel}ชื่อ ${escapeHTML(item.name)}" referrerpolicy="no-referrer">
          <span class="shelter-status-badge ${item.urgent ? "is-urgent" : ""}">${item.urgent ? "ต้องการบ้านด่วน" : "กำลังรอบ้าน"}</span>
          ${sourceBadge(item)}
        </a>
        <div class="shelter-animal-card__body">
          <p class="shelter-kicker">${escapeHTML(sourceLabel(item))}</p>
          <h2>${escapeHTML(item.name)}</h2>
          <p class="shelter-meta">${escapeHTML(item.gender)} · ${escapeHTML(item.age)} · ${escapeHTML(item.size)}</p>
          <div class="shelter-traits">${tags}</div>
          <p class="shelter-card-location">⌖ ${escapeHTML(item.province)}</p>
          <a class="shelter-card-link" href="${detailUrl(item.id)}">ทำความรู้จัก <span aria-hidden="true">→</span></a>
        </div>
      </article>`;
  }

  const hero = document.querySelector(".shelter-page-hero > div:first-child");
  if (hero) {
    const eyebrow = hero.querySelector(".eyebrow");
    const paragraph = hero.querySelector("p:not(.eyebrow)");
    if (eyebrow) eyebrow.textContent = "พื้นที่ช่วยหาบ้านที่ผ่านการตรวจสอบ";
    if (paragraph) paragraph.textContent = `รวม${speciesLabel}จากศูนย์พักพิงและประกาศจากผู้ใช้ ทุกประกาศจากผู้ใช้ผ่านการอนุมัติของแอดมินก่อนเผยแพร่`;
    if (!hero.querySelector(".shelter-page-actions")) {
      hero.insertAdjacentHTML("beforeend", `<div class="shelter-page-actions"><a class="button button-primary button-small" href="${submitUrl}">+ ลงประกาศช่วยหาบ้านให้${speciesLabel}</a><span>ประกาศจากผู้ใช้จะแสดงป้าย “ผู้ใช้ช่วยหาบ้าน”</span></div>`);
    }
  }

  const grid = document.getElementById("shelterAnimalGrid");
  if (grid) {
    const search = document.getElementById("shelterSearch");
    const gender = document.getElementById("shelterGender");
    const size = document.getElementById("shelterSize");
    const urgent = document.getElementById("shelterUrgent");
    const count = document.getElementById("shelterResultCount");
    const filterPanel = document.querySelector(".shelter-filter-panel");
    let source = document.getElementById("shelterSource");
    if (filterPanel && !source) {
      const wrapper = document.createElement("div");
      wrapper.className = "shelter-field";
      wrapper.innerHTML = `<label for="shelterSource">แหล่งที่มา</label><select id="shelterSource"><option value="">ทั้งหมด</option><option value="shelter">ศูนย์พักพิง</option><option value="user">ประกาศโดยผู้ใช้</option></select>`;
      filterPanel.insertBefore(wrapper, filterPanel.querySelector(".shelter-check"));
      source = wrapper.querySelector("select");
      filterPanel.classList.add("has-source-filter");
    }

    function render() {
      const keyword = String(search?.value || "").trim().toLowerCase();
      const genderValue = gender?.value || "";
      const sizeValue = size?.value || "";
      const sourceValue = source?.value || "";
      const urgentOnly = Boolean(urgent?.checked);
      const filtered = allAnimals.filter((item) => {
        const text = [item.name, item.shelter, item.contact_name, item.province, item.location_text, ...(item.traits || [])].join(" ").toLowerCase();
        return (!keyword || text.includes(keyword))
          && (!genderValue || item.gender === genderValue)
          && (!sizeValue || item.size === sizeValue)
          && (!sourceValue || item.source_type === sourceValue)
          && (!urgentOnly || item.urgent);
      });
      if (count) count.textContent = `${filtered.length} ตัว`;
      grid.innerHTML = filtered.length
        ? filtered.map(animalCard).join("")
        : `<div class="shelter-empty"><strong>ไม่พบ${speciesLabel}ที่ตรงกับตัวกรอง</strong><p>ลองเปลี่ยนคำค้นหา แหล่งที่มา หรือสถานะบ้านด่วน</p></div>`;
    }

    [search, gender, size, source, urgent].forEach((control) => control?.addEventListener(control === search ? "input" : "change", render));
    document.getElementById("shelterClearFilters")?.addEventListener("click", () => {
      if (search) search.value = "";
      if (gender) gender.value = "";
      if (size) size.value = "";
      if (source) source.value = "";
      if (urgent) urgent.checked = false;
      render();
    });
    render();
  }

  const detailRoot = document.getElementById("shelterAnimalDetail");
  if (detailRoot) {
    const id = new URLSearchParams(location.search).get("animal_id") || allAnimals[0]?.id;
    let item = allAnimals.find((animal) => String(animal.id) === String(id));
    if (!item && id) item = await window.CatMatchShelterData.loadDetail(species, id);
    if (!item) {
      detailRoot.innerHTML = `<div class="shelter-empty"><strong>ไม่พบข้อมูล${speciesLabel}</strong><p>ข้อมูลนี้อาจถูกปิดประกาศหรือย้ายไปยังรายการอื่นแล้ว</p></div>`;
      return;
    }

    const isUserListing = item.source_type === "user";
    const currentUserId = getCurrentUserId();
    const ownerUserId = Number(item.owner_user_id ?? item.user_id ?? 0);
    const isOwnListing = isUserListing && currentUserId > 0 && ownerUserId === currentUserId;
    const contactRole = isUserListing ? "ผู้ลงประกาศ" : "ศูนย์พักพิง";
    document.title = `${item.name} — ${species === "dog" ? "DogMatch" : "CatMatch"}`;
    const tags = (item.traits || []).map((trait) => `<span>${escapeHTML(trait)}</span>`).join("");
    const phoneButton = !isOwnListing && item.phone
      ? `<a class="button button-primary" href="tel:${escapeHTML(item.phone)}">โทรหา${contactRole}</a>`
      : (!isOwnListing ? `<button class="button button-primary" type="button" disabled>ไม่ได้ระบุเบอร์โทร</button>` : "");
    const socialUrl = safeHttpUrl(item.social_url);
    const socialButton = !isOwnListing && socialUrl
      ? `<a class="button button-secondary" href="${escapeHTML(socialUrl)}" target="_blank" rel="noopener">โซเชียลของ${contactRole}</a>`
      : "";
    const lineButton = !isOwnListing && item.line_contact
      ? `<a class="button button-secondary" href="https://line.me/R/ti/p/${encodeURIComponent(item.line_contact)}" target="_blank" rel="noopener">ติดต่อผ่าน LINE</a>`
      : "";
    const hasCoordinates = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
    const directionsUrl = hasCoordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.latitude)},${encodeURIComponent(item.longitude)}`
      : "";
    const mapButton = !isOwnListing && directionsUrl
      ? `<a class="button button-secondary shelter-map-directions" href="${directionsUrl}" target="_blank" rel="noopener" aria-label="นำทางไปยังสถานที่ของ${speciesLabel}ชื่อ ${escapeHTML(item.name)} ด้วย Google Maps">⌖ นำทางด้วย Google Maps</a>`
      : "";
    const listingNumericId = Number(item.numeric_id || String(item.id || "").replace(/^u-/, ""));
    const chatButton = !isOwnListing && item.allow_web_contact && Number.isInteger(listingNumericId) && listingNumericId > 0
      ? `<a class="button button-primary shelter-chat-button" href="./chat.html?start=listing&listing_id=${listingNumericId}&species=${species}">💬 แชทกับ${contactRole}</a>`
      : "";
    const manageUrl = `./adoption-requests.html?tab=listings&species=${species}`;
    const contactCard = isOwnListing
      ? `<aside class="shelter-contact-card is-owner-card">
          <p class="eyebrow">ประกาศของคุณ</p>
          <h2>คุณเป็นผู้ลงประกาศนี้</h2>
          <p>หน้านี้คือมุมมองที่ผู้สนใจเห็น จึงไม่จำเป็นต้องแสดงปุ่มโทร โซเชียล แผนที่ หรือแชทเพื่อให้คุณติดต่อบัญชีของตัวเอง</p>
          <div class="shelter-owner-summary"><span>✓</span><div><strong>จัดการจากหน้าประกาศของฉัน</strong><small>แก้ไขข้อมูล ดูผลตรวจสอบ หรือบันทึกว่าได้บ้านแล้ว</small></div></div>
          <div class="shelter-contact-actions"><a class="button button-primary" href="${manageUrl}">ไปที่ประกาศของฉัน</a><a class="button button-secondary" href="${species === "dog" ? "./dog-shelter-animals.html" : "./cat-shelter-animals.html"}">กลับไปดูรายการทั้งหมด</a></div>
          <p class="shelter-contact-note">ช่องทางติดต่อของคุณยังแสดงให้ผู้ใช้อื่นตามข้อมูลที่ได้รับอนุมัติ แต่จะไม่สร้างปุ่มติดต่อให้เจ้าของประกาศเอง</p>
        </aside>`
      : `<aside class="shelter-contact-card">
          <p class="eyebrow">${isUserListing ? "ลงประกาศโดย" : "ดูแลโดย"}</p>
          <h2>${escapeHTML(isUserListing ? (item.contact_name || "ผู้ใช้ในระบบ") : item.shelter)} ${!isUserListing && item.verified ? "✓" : ""}</h2>
          <p>${escapeHTML(item.location_text || item.address || item.province)}</p>
          <small>${escapeHTML(item.contact_hours)}</small>
          <div class="shelter-contact-actions">${phoneButton}${socialButton}${lineButton}${mapButton}${chatButton}</div>
          <p class="shelter-contact-note">${isUserListing ? "เว็บไซต์เป็นพื้นที่เผยแพร่และตรวจสอบประกาศเบื้องต้น กรุณาตรวจสอบตัวตนและสภาพสัตว์ก่อนนัดหมาย" : "ติดต่อเจ้าหน้าที่ของศูนย์โดยตรงตามช่องทางที่ระบุ"}</p>
        </aside>`;

    detailRoot.innerHTML = `
      <div class="shelter-detail-grid ${isUserListing ? "is-user-listing" : "is-shelter-listing"}">
        <section class="shelter-detail-gallery">
          <div class="shelter-detail-image">
            <img src="${escapeHTML(item.image)}" alt="${speciesLabel}ชื่อ ${escapeHTML(item.name)}" referrerpolicy="no-referrer">
            <span class="shelter-status-badge ${item.urgent ? "is-urgent" : ""}">${item.urgent ? "ต้องการบ้านด่วน" : "กำลังรอบ้าน"}</span>
            ${sourceBadge(item)}
          </div>
          <p>${escapeHTML(item.source_note)}</p>
        </section>

        <section class="shelter-detail-content">
          <p class="eyebrow">${isUserListing ? `ประกาศช่วยหาบ้านโดยผู้ใช้` : `เพื่อน${speciesLabel}จากศูนย์พักพิง`}</p>
          <h1>${escapeHTML(item.name)}</h1>
          <p class="shelter-detail-meta">${escapeHTML(item.gender)} · ${escapeHTML(item.age)} · ${escapeHTML(item.size)} · ${escapeHTML(item.province)}</p>
          ${isUserListing ? `<div class="shelter-user-warning"><strong>${isOwnListing ? "ประกาศช่วยหาบ้านของคุณ" : "ประกาศช่วยหาบ้านโดยผู้ใช้"}</strong><span>${isOwnListing ? "นี่คือหน้าประกาศที่ผู้สนใจจะเห็น คุณสามารถจัดการข้อมูลได้จากหน้าประกาศของฉัน" : "แอดมินตรวจสอบข้อมูลก่อนเผยแพร่แล้ว ผู้สนใจควรนัดพบในพื้นที่ปลอดภัยและตรวจสอบข้อมูลด้วยตนเองอีกครั้ง"}</span></div>` : ""}
          <div class="shelter-traits shelter-traits--large">${tags}</div>
          ${item.personality ? `<div class="shelter-detail-section"><h2>ลักษณะนิสัย</h2><p>${escapeHTML(item.personality)}</p></div>` : ""}
          <div class="shelter-detail-section"><h2>เรื่องราวของ${escapeHTML(item.name)}</h2><p>${escapeHTML(item.story)}</p></div>
          <div class="shelter-detail-facts">
            <div><span>สุขภาพ</span><strong>${escapeHTML(item.health)}</strong></div>
            <div><span>วัคซีน</span><strong>${escapeHTML(item.vaccination)}</strong></div>
            <div><span>การทำหมัน</span><strong>${escapeHTML(item.sterilization)}</strong></div>
            <div><span>บ้านที่เหมาะสม</span><strong>${escapeHTML(item.suitable_home)}</strong></div>
          </div>
        </section>

        ${contactCard}
      </div>`;
  }
})();
