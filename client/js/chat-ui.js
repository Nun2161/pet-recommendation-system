"use strict";

(() => {
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 20 * 1024 * 1024;
  const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  const CHAT_EMOJIS = [
    "😀", "😄", "😊", "🥰", "😍", "😂", "😭", "🥹",
    "👍", "🙏", "❤️", "💖", "🎉", "✨", "🌟", "✅",
    "🐶", "🐱", "🐾", "🦴", "🎾", "🏠", "📍", "📷",
  ];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[char]);
  }

  function formatTime(value, withDate = false) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const sameDay = new Date().toDateString() === date.toDateString();
    return new Intl.DateTimeFormat("th-TH", sameDay && !withDate
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    ).format(date);
  }

  function formatLastSeen(value) {
    if (!value) return "ออฟไลน์";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ออฟไลน์";
    return `ออฟไลน์ · ล่าสุด ${formatTime(value, true)}`;
  }

  function initials(name) {
    return String(name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  function adminLogo(species = "cat") {
    if (species === "dog") {
      return `<span class="chat-admin-logo" aria-label="ผู้ดูแล DogMatch"><svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="admin-logo-fill" d="M20.2 22.2C16.5 18.7 11.4 19.1 9.8 25.1c-2 7.5.6 14.8 6.3 18 2.6 1.5 5.2.5 6.6-2.1 1.5-2.9.7-6.8.2-10.2-.5-3.4-.7-6.3-2.7-8.6Z"></path>
        <path class="admin-logo-fill" d="M43.8 22.2c3.7-3.5 8.8-3.1 10.4 2.9 2 7.5-.6 14.8-6.3 18-2.6 1.5-5.2.5-6.6-2.1-1.5-2.9-.7-6.8-.2-10.2.5-3.4.7-6.3 2.7-8.6Z"></path>
        <path class="admin-logo-fill" d="M32 12.5c-10.5 0-17.4 7.4-17.4 19 0 12.8 7 21.2 17.4 21.2s17.4-8.4 17.4-21.2c0-11.6-6.9-19-17.4-19Z"></path>
        <path class="admin-logo-line" d="M27 32h.01M37 32h.01M29.5 38c1.6-1.15 3.4-1.15 5 0-1 1.7-1.7 2.45-2.5 2.45s-1.5-.75-2.5-2.45ZM32 40v1.2M32 41.1c-1.2 2.8-4.4 4-6.8 1.2M32 41.1c1.2 2.8 4.4 4 6.8 1.2"></path>
      </svg></span>`;
    }
    return `<span class="chat-admin-logo" aria-label="ผู้ดูแล CatMatch"><svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="admin-logo-fill" d="M17 23 14 11l10 6c5-2 11-2 16 0l10-6-3 12c4 4 6 8 6 14 0 12-9 20-21 20S11 49 11 37c0-6 2-10 6-14Z"></path>
      <path class="admin-logo-line" d="M24 33h.01M42 33h.01M30 39c1.5 1 2.5 1 4 0M32 35v2M24 40l-7 1M40 40l7 1M23 45l-6 4M41 45l6 4"></path>
    </svg></span>`;
  }

  function avatarMarkup(counterpart, species = "cat") {
    if (counterpart?.type === "admin") return adminLogo(species);
    const url = counterpart?.avatar_url ? window.CatMatchChatApi?.resolveMediaUrl(counterpart.avatar_url) : "";
    if (url) {
      return `<img src="${escapeHTML(url)}" alt="รูปโปรไฟล์ ${escapeHTML(counterpart?.name || "ผู้ใช้")}" data-chat-avatar-image><span class="chat-avatar-fallback" hidden>${escapeHTML(initials(counterpart?.name))}</span>`;
    }
    return escapeHTML(initials(counterpart?.name));
  }

  function listingDetailHref(item) {
    if (String(item?.conversation_type || "") !== "user_listing") return "";
    const listingId = Number(item?.subject_id || 0);
    if (!Number.isInteger(listingId) || listingId <= 0) return "";
    const species = item?.subject_species === "dog" ? "dog" : "cat";
    const detailPage = species === "dog" ? "dog-shelter-detail.html" : "cat-shelter-detail.html";
    return `./${detailPage}?animal_id=u-${listingId}`;
  }

  function subjectMarkup(item) {
    const title = String(item?.subject_title || "").trim();
    const subtitle = String(item?.subject_subtitle || "").trim();
    const rawImage = String(item?.subject_image_url || "").trim();
    const imageUrl = rawImage ? window.CatMatchChatApi?.resolveMediaUrl(rawImage) : "";
    const listingHref = listingDetailHref(item);

    if (listingHref && imageUrl) {
      return `<a class="chat-subject-listing" href="${escapeHTML(listingHref)}" target="_blank" rel="noopener" title="กดเพื่อดูประกาศ" aria-label="เปิดประกาศ ${escapeHTML(title || "สัตว์ที่สนใจ")}">
        <img src="${escapeHTML(imageUrl)}" alt="รูปน้องจากประกาศ" loading="lazy">
      </a>`;
    }

    if (!title && !subtitle && !imageUrl) return "";
    return `<div class="chat-subject-card${imageUrl ? " has-image" : ""}">
      ${imageUrl ? `<img src="${escapeHTML(imageUrl)}" alt="รูปสัตว์ที่สนใจ" loading="lazy">` : ""}
      <span><strong>${escapeHTML(title || "หัวข้อการสนทนา")}</strong>${subtitle ? `<small>${escapeHTML(subtitle)}</small>` : ""}</span>
    </div>`;
  }

  function listingReferenceMarkup(item) {
    if (String(item?.conversation_type || "") !== "user_listing") return "";
    const listingId = Number(item?.subject_id || 0);
    const rawImage = String(item?.subject_image_url || "").trim();
    if (!Number.isInteger(listingId) || listingId <= 0 || !rawImage) return "";

    const href = listingDetailHref(item);
    if (!href) return "";
    const imageUrl = window.CatMatchChatApi?.resolveMediaUrl(rawImage) || rawImage;
    const label = `เปิดประกาศของ${String(item?.subject_title || "น้อง").replace(/^สนใจ/, "") || "น้อง"}`;

    return `<a class="chat-listing-reference" href="${escapeHTML(href)}" target="_blank" rel="noopener" aria-label="${escapeHTML(label)}" title="กดเพื่อดูประกาศ">
      <img src="${escapeHTML(imageUrl)}" alt="รูปน้องจากประกาศ" loading="lazy">
    </a>`;
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
      reader.readAsDataURL(file);
    });
  }

  function validateFile(file) {
    if (!file) throw new Error("ไม่พบไฟล์ที่เลือก");
    if (IMAGE_TYPES.has(file.type)) {
      if (file.size > MAX_IMAGE_SIZE) throw new Error("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
      return "image";
    }
    if (VIDEO_TYPES.has(file.type)) {
      if (file.size > MAX_VIDEO_SIZE) throw new Error("วิดีโอต้องมีขนาดไม่เกิน 20 MB");
      return "video";
    }
    throw new Error("รองรับรูป JPG, PNG, WEBP และวิดีโอ MP4, WEBM, MOV เท่านั้น");
  }

  function formatBreedDisplay(name, species = "cat") {
    const english = String(name || "").trim();
    if (!english) return "";
    const rows = species === "dog"
      ? (window.DOGMATCH_DOG_BREEDS || [])
      : (window.CATMATCH_CAT_BREEDS || []);
    const matched = rows.find((row) => String(row?.breed_name || "").trim().toLowerCase() === english.toLowerCase());
    const thai = String(matched?.thai_name || "").trim();
    return thai && thai.toLowerCase() !== english.toLowerCase() ? `${thai} (${english})` : english;
  }

  function profileRoleLabel(profile, conversation) {
    if (profile?.type === "admin") return "ผู้ดูแลระบบ PetMatch";
    if (profile?.type === "farm") return "บัญชีฟาร์มที่ได้รับการอนุมัติ";
    if (conversation?.conversation_type === "user_listing") return "ผู้ลงประกาศช่วยหาบ้าน";
    return "ผู้ใช้ PetMatch";
  }

  class ChatUI {
    constructor(root, options = {}) {
      this.root = root;
      this.role = options.role || root.dataset.chatRole || "user";
      this.api = window.CatMatchChatApi;
      this.actor = this.api.getActor(this.role);
      this.conversations = [];
      this.activeId = 0;
      this.messages = [];
      this.stream = null;
      this.sharedRealtimeUnsubscribe = null;
      this.pendingFile = null;
      this.typingTimer = null;
      this.remoteTypingTimer = null;
      this.profileModal = null;
      this.lastConversationMarkup = "";
      this.initialized = false;
      this.isSending = false;
      this.onUnread = options.onUnread || (() => {});
      this.startRequest = options.startRequest || null;
      this.bindElements();
    }

    ensureEmojiControls() {
      const form = this.root.querySelector("[data-chat-form]");
      const attach = this.root.querySelector("[data-chat-attach]");
      if (!form || !attach || this.root.querySelector("[data-chat-emoji]")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-emoji-button";
      button.dataset.chatEmoji = "";
      button.setAttribute("aria-label", "เลือกอิโมจิ");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "☺";
      attach.insertAdjacentElement("afterend", button);

      const picker = document.createElement("div");
      picker.className = "chat-emoji-picker";
      picker.dataset.chatEmojiPicker = "";
      picker.hidden = true;
      picker.setAttribute("role", "dialog");
      picker.setAttribute("aria-label", "เลือกอิโมจิ");
      picker.innerHTML = CHAT_EMOJIS.map((emoji) =>
        `<button type="button" data-chat-emoji-value="${emoji}" aria-label="อิโมจิ ${emoji}">${emoji}</button>`
      ).join("");
      form.appendChild(picker);
    }

    bindElements() {
      this.ensureEmojiControls();
      const q = (name) => this.root.querySelector(`[data-chat-${name}]`);
      this.els = {
        list: q("conversations"), search: q("search"), empty: q("empty"), active: q("active"),
        messages: q("messages"), name: q("name"), subject: q("subject"), status: q("status"),
        avatar: q("avatar"), form: q("form"), input: q("input"), send: q("send"),
        file: q("file"), attach: q("attach"), preview: q("preview"), typing: q("typing"),
        error: q("error"), admin: q("admin"), refresh: q("refresh"), totalUnread: q("total-unread"),
        emoji: q("emoji"), emojiPicker: q("emoji-picker"),
      };
    }

    ensureProfileModal() {
      if (this.profileModal) return this.profileModal;

      const modal = document.createElement("dialog");
      modal.className = "chat-profile-modal";
      modal.dataset.chatProfileModal = "";
      modal.dataset.species = this.root.dataset.species || "cat";
      modal.setAttribute("aria-labelledby", "chatProfileName");
      modal.innerHTML = `
        <section class="chat-profile-card">
          <button class="chat-profile-close" type="button" data-chat-profile-close aria-label="ปิดโปรไฟล์">×</button>
          <div class="chat-profile-avatar" data-chat-profile-avatar>?</div>
          <h2 id="chatProfileName" data-chat-profile-name>ผู้ใช้</h2>
          <p class="chat-profile-role" data-chat-profile-role>ผู้ใช้ PetMatch</p>
          <p class="chat-profile-status" data-chat-profile-status>ออฟไลน์</p>
          <div class="chat-profile-context" data-chat-profile-context hidden></div>
          <div class="chat-farm-profile" data-chat-farm-profile hidden></div>
        </section>`;

      // Native dialog renders in the browser top layer, so the Admin page zoom
      // and the Farm dashboard grid can no longer crop the overlay.
      document.body.appendChild(modal);

      modal.addEventListener("click", (event) => {
        if (event.target.closest("[data-chat-profile-close]")) {
          this.closeProfile();
          return;
        }
        if (event.target !== modal) return;
        const card = modal.querySelector(".chat-profile-card");
        const rect = card?.getBoundingClientRect();
        if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
          this.closeProfile();
        }
      });
      modal.addEventListener("cancel", (event) => {
        event.preventDefault();
        this.closeProfile();
      });

      this.profileModal = modal;
      return modal;
    }

    setProfileAvatar(container, profile, species) {
      if (!container) return;
      container.innerHTML = avatarMarkup(profile, species);
      this.bindAvatarFallbacks(container);
    }

    async loadFarmProfile(modal, profile, conversation) {
      const farmPanel = modal.querySelector("[data-chat-farm-profile]");
      if (!farmPanel) return;

      const species = conversation?.subject_species === "dog" ? "dog" : "cat";
      const profileKey = `${profile?.id || 0}:${species}:${this.activeId}`;
      modal.dataset.profileRequestKey = profileKey;
      farmPanel.hidden = false;
      farmPanel.innerHTML = '<div class="chat-farm-profile-loading">กำลังโหลดข้อมูลฟาร์ม...</div>';

      try {
        const apiRoot = String(this.api?.API_ROOT || window.CATMATCH_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
        const response = await fetch(`${apiRoot}/farms/${encodeURIComponent(profile.id)}?species=${species}&t=${Date.now()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) throw new Error(payload.message || "โหลดโปรไฟล์ฟาร์มไม่สำเร็จ");
        if (modal.dataset.profileRequestKey !== profileKey) return;

        const farm = payload.data || {};
        const address = [farm.address, farm.subdistrict, farm.district, farm.province]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(" ") || "ยังไม่ได้ระบุที่อยู่";
        const animals = Array.isArray(farm.animals)
          ? farm.animals.filter((animal) => String(animal.status || "").toLowerCase() === "available").slice(0, 4)
          : [];
        const farmAvatar = String(farm.profile_image || profile.avatar_url || "").trim();
        if (farmAvatar) {
          this.setProfileAvatar(
            modal.querySelector("[data-chat-profile-avatar]"),
            { ...profile, avatar_url: farmAvatar },
            species
          );
        }

        const animalLabel = species === "dog" ? "สุนัข" : "แมว";
        const mapPage = species === "dog" ? "dog-farm-map.html" : "farm-map.html";
        const animalCards = animals.length
          ? animals.map((animal) => {
              const rawImage = String(animal.image_url || "").trim();
              const image = rawImage ? this.api.resolveMediaUrl(rawImage) : "";
              const breed = formatBreedDisplay(animal.breed_name, species);
              return `<article class="chat-farm-animal-mini">
                <span class="chat-farm-animal-image">${image
                  ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(animal.animal_name || animalLabel)}" loading="lazy">`
                  : `<b aria-hidden="true">${species === "dog" ? "🐶" : "🐱"}</b>`}</span>
                <span><strong>${escapeHTML(animal.animal_name || animalLabel)}</strong><small>${escapeHTML(breed)}</small></span>
              </article>`;
            }).join("")
          : `<p class="chat-farm-profile-empty">ยังไม่มี${animalLabel}ที่พร้อมติดต่อในขณะนี้</p>`;

        farmPanel.innerHTML = `
          <div class="chat-farm-verified">✓ ฟาร์มผ่านการยืนยัน</div>
          <p class="chat-farm-address">${escapeHTML(address)}</p>
          <p class="chat-farm-description">${escapeHTML(farm.description || "ฟาร์มยังไม่ได้เพิ่มรายละเอียดเพิ่มเติม")}</p>
          <div class="chat-farm-section-head"><strong>${animalLabel}พร้อมติดต่อ</strong><span>${animals.length} ตัว</span></div>
          <div class="chat-farm-animal-list">${animalCards}</div>
          <a class="chat-farm-map-link" href="./${mapPage}?farm_id=${encodeURIComponent(profile.id)}">ดูโปรไฟล์ฟาร์มบนแผนที่ →</a>`;
      } catch (error) {
        if (modal.dataset.profileRequestKey !== profileKey) return;
        farmPanel.innerHTML = `<p class="chat-farm-profile-empty">${escapeHTML(error.message || "ไม่สามารถโหลดโปรไฟล์ฟาร์มได้")}</p>`;
      }
    }

    async openCounterpartProfile() {
      const conversation = this.activeConversation();
      const profile = conversation?.counterpart;
      if (!profile) return;

      const modal = this.ensureProfileModal();
      const card = modal.querySelector(".chat-profile-card");
      const avatar = modal.querySelector("[data-chat-profile-avatar]");
      const name = modal.querySelector("[data-chat-profile-name]");
      const role = modal.querySelector("[data-chat-profile-role]");
      const status = modal.querySelector("[data-chat-profile-status]");
      const context = modal.querySelector("[data-chat-profile-context]");
      const farmPanel = modal.querySelector("[data-chat-farm-profile]");
      const species = conversation.subject_species || this.root.dataset.species || "cat";
      const isFarm = profile.type === "farm";

      modal.dataset.profileType = profile.type || "user";
      modal.dataset.species = species;
      card?.classList.toggle("is-farm-profile", isFarm);
      this.setProfileAvatar(avatar, profile, species);
      if (name) name.textContent = profile.name || "ผู้ใช้";
      if (role) role.textContent = profileRoleLabel(profile, conversation);
      if (status) {
        status.textContent = profile.online ? "● ออนไลน์" : formatLastSeen(profile.last_seen_at);
        status.classList.toggle("is-online", Boolean(profile.online));
      }

      const subject = [conversation.subject_title, conversation.subject_subtitle].filter(Boolean).join(" · ");
      if (context) {
        context.hidden = isFarm || !subject;
        context.textContent = !isFarm && subject ? `กำลังสนทนาเรื่อง ${subject}` : "";
      }
      if (farmPanel) {
        farmPanel.hidden = !isFarm;
        if (!isFarm) farmPanel.innerHTML = "";
      }

      if (!modal.open) {
        try {
          modal.showModal();
        } catch (_error) {
          modal.setAttribute("open", "");
        }
      }
      document.documentElement.classList.add("chat-profile-open");
      document.body.classList.add("chat-profile-open");
      requestAnimationFrame(() => modal.querySelector("[data-chat-profile-close]")?.focus());

      if (isFarm) await this.loadFarmProfile(modal, profile, conversation);
    }

    closeProfile() {
      if (!this.profileModal) return;
      this.profileModal.dataset.profileRequestKey = "";
      if (this.profileModal.open && typeof this.profileModal.close === "function") {
        this.profileModal.close();
      } else {
        this.profileModal.removeAttribute("open");
      }
      document.documentElement.classList.remove("chat-profile-open");
      document.body.classList.remove("chat-profile-open");
    }

    showError(message = "") {
      if (!this.els.error) return;
      this.els.error.textContent = message;
      this.els.error.hidden = !message;
    }

    bindAvatarFallbacks(scope = this.root) {
      scope.querySelectorAll("img[data-chat-avatar-image]").forEach((image) => {
        if (image.dataset.fallbackBound === "true") return;
        image.dataset.fallbackBound = "true";
        image.addEventListener("error", () => {
          const fallback = image.nextElementSibling;
          image.remove();
          if (fallback) fallback.hidden = false;
        }, { once: true });
      });
    }

    async init() {
      if (this.initialized) return;
      this.initialized = true;
      if (!this.api.getToken(this.role)) {
        this.showError("กรุณาเข้าสู่ระบบก่อนใช้งานแชท");
        return;
      }
      this.bindEvents();
      await this.loadConversations();
      if (this.startRequest) {
        try {
          const payload = await this.api.request("/conversations", {
            method: "POST",
            body: JSON.stringify(this.startRequest),
          }, this.role);
          await this.loadConversations();
          await this.openConversation(payload.data.conversation_id);
        } catch (error) {
          this.showError(error.message);
        }
      } else if (this.conversations[0]) {
        await this.openConversation(this.conversations[0].conversation_id);
      }
      this.connectRealtime();
    }

    bindEvents() {
      this.els.list?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-conversation-id]");
        if (button) void this.openConversation(Number(button.dataset.conversationId));
      });
      this.root.addEventListener("click", (event) => {
        const trigger = event.target.closest("[data-chat-profile=\"counterpart\"]");
        if (!trigger || !this.root.contains(trigger)) return;
        event.preventDefault();
        event.stopPropagation();
        this.openCounterpartProfile();
      });
      this.root.addEventListener("keydown", (event) => {
        const trigger = event.target.closest("[data-chat-profile=\"counterpart\"]");
        if (!trigger || !this.root.contains(trigger)) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.openCounterpartProfile();
        }
      });
      this.els.search?.addEventListener("input", () => this.renderConversations());
      this.els.refresh?.addEventListener("click", () => this.loadConversations());
      this.els.form?.addEventListener("submit", (event) => {
        event.preventDefault();
        void this.sendCurrentMessage();
      });
      if (this.els.send) {
        // ใช้ปุ่มธรรมดาและเรียกส่งโดยตรง เพื่อไม่ให้ฟอร์มซ้อนในหน้า Farm/Admin
        // หรือพฤติกรรม submit ของเบราว์เซอร์ขัดขวางการส่งข้อความ
        this.els.send.type = "button";
        this.els.send.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          void this.sendCurrentMessage();
        });
      }
      this.els.input?.addEventListener("input", () => {
        this.autoGrow();
        this.sendTyping(true);
      });
      this.els.input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          void this.sendCurrentMessage();
        }
      });
      this.els.attach?.addEventListener("click", () => this.els.file?.click());
      this.els.emoji?.addEventListener("click", (event) => {
        event.stopPropagation();
        const shouldOpen = Boolean(this.els.emojiPicker?.hidden);
        if (this.els.emojiPicker) this.els.emojiPicker.hidden = !shouldOpen;
        this.els.emoji?.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      });
      this.els.emojiPicker?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-chat-emoji-value]");
        if (!button) return;
        this.insertEmoji(button.dataset.chatEmojiValue || "");
        this.els.emojiPicker.hidden = true;
        this.els.emoji?.setAttribute("aria-expanded", "false");
      });
      document.addEventListener("click", (event) => {
        if (!this.els.emojiPicker || this.els.emojiPicker.hidden) return;
        if (event.target.closest("[data-chat-emoji], [data-chat-emoji-picker]")) return;
        this.els.emojiPicker.hidden = true;
        this.els.emoji?.setAttribute("aria-expanded", "false");
      });
      this.els.file?.addEventListener("change", () => this.selectFile(this.els.file.files?.[0]));
      this.els.preview?.addEventListener("click", (event) => {
        if (event.target.closest("[data-remove-attachment]")) this.clearFile();
      });
      this.els.admin?.addEventListener("click", async () => {
        try {
          const payload = await this.api.request("/conversations", {
            method: "POST", body: JSON.stringify({ type: "user_admin", species: this.root.dataset.species || null }),
          }, this.role);
          await this.loadConversations();
          await this.openConversation(payload.data.conversation_id);
        } catch (error) { this.showError(error.message); }
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && this.activeId) void this.markRead();
      });
    }

    async loadConversations() {
      try {
        const payload = await this.api.request("/conversations", {}, this.role);
        this.conversations = payload.data || [];
        const unread = Number(payload.unread_count || 0);
        if (this.els.totalUnread) this.els.totalUnread.textContent = unread ? String(unread) : "";
        this.onUnread(unread);
        window.dispatchEvent(new CustomEvent("catmatch:chat-unread", { detail: { count: unread } }));
        this.renderConversations();
        if (this.activeId) this.updateHeader();
      } catch (error) {
        this.showError(error.message);
      }
    }

    renderConversations() {
      if (!this.els.list) return;
      const keyword = String(this.els.search?.value || "").trim().toLowerCase();
      const filtered = this.conversations.filter((item) => {
        const text = `${item.counterpart?.name || ""} ${item.subject_title || ""} ${item.subject_subtitle || ""}`.toLowerCase();
        return !keyword || text.includes(keyword);
      });
      const markup = filtered.length ? filtered.map((item) => {
        const last = item.last_message;
        const preview = last
          ? (last.message_type === "image" ? "ส่งรูปภาพ" : last.message_type === "video" ? "ส่งวิดีโอ" : last.text)
          : "เริ่มต้นบทสนทนา";
        const online = Boolean(item.counterpart?.online);
        return `<button class="chat-conversation ${item.conversation_id === this.activeId ? "is-active" : ""}" type="button" data-conversation-id="${item.conversation_id}">
          <span class="chat-avatar">${avatarMarkup(item.counterpart, item.subject_species || this.root.dataset.species || "cat")}<i class="${online ? "is-online" : ""}"></i></span>
          <span class="chat-conversation-body"><strong>${escapeHTML(item.counterpart?.name || "บทสนทนา")}</strong><small>${escapeHTML(item.subject_title || "")}</small><span>${escapeHTML(preview || "")}</span></span>
          <span class="chat-conversation-meta"><time>${escapeHTML(formatTime(item.updated_at))}</time>${item.unread_count ? `<b>${item.unread_count > 99 ? "99+" : item.unread_count}</b>` : ""}</span>
        </button>`;
      }).join("") : `<div class="chat-list-empty"><strong>ยังไม่มีข้อความ</strong><p>${this.role === "user" ? "เริ่มแชทจากหน้าโปรไฟล์ฟาร์ม ประกาศช่วยหาบ้าน หรือติดต่อแอดมิน" : "บทสนทนาใหม่จะแสดงที่นี่แบบเรียลไทม์"}</p></div>`;
      if (markup === this.lastConversationMarkup) return;
      this.lastConversationMarkup = markup;
      const scrollTop = this.els.list.scrollTop;
      this.els.list.innerHTML = markup;
      this.els.list.scrollTop = scrollTop;
      this.bindAvatarFallbacks(this.els.list);
    }

    activeConversation() {
      return this.conversations.find((item) => item.conversation_id === this.activeId) || null;
    }

    async openConversation(id) {
      if (!id) return;
      this.activeId = id;
      this.renderConversations();
      this.showError();
      if (this.els.empty) this.els.empty.hidden = true;
      if (this.els.active) this.els.active.hidden = false;
      this.root.classList.add("is-mobile-active");
      try {
        const payload = await this.api.request(`/conversations/${id}/messages`, {}, this.role);
        this.messages = payload.data || [];
        const index = this.conversations.findIndex((item) => item.conversation_id === id);
        if (index >= 0 && payload.conversation) this.conversations[index] = payload.conversation;
        this.updateHeader();
        this.renderMessages();
        await this.markRead();
      } catch (error) {
        this.showError(error.message);
      }
    }

    updateHeader() {
      const item = this.activeConversation();
      if (!item) return;
      if (this.els.name) {
        this.els.name.textContent = item.counterpart?.name || "บทสนทนา";
        this.els.name.dataset.chatProfile = "counterpart";
        this.els.name.tabIndex = 0;
        this.els.name.setAttribute("role", "button");
        this.els.name.setAttribute("aria-label", `ดูโปรไฟล์ ${item.counterpart?.name || "อีกฝ่าย"}`);
      }
      if (this.els.subject) this.els.subject.innerHTML = subjectMarkup(item);
      if (this.els.status) {
        this.els.status.textContent = item.counterpart?.online ? "ออนไลน์" : formatLastSeen(item.counterpart?.last_seen_at);
        this.els.status.classList.toggle("is-online", Boolean(item.counterpart?.online));
      }
      if (this.els.avatar) {
        this.els.avatar.innerHTML = avatarMarkup(item.counterpart, item.subject_species || this.root.dataset.species || "cat");
        this.els.avatar.dataset.chatProfile = "counterpart";
        this.els.avatar.tabIndex = 0;
        this.els.avatar.setAttribute("role", "button");
        this.els.avatar.setAttribute("aria-label", `ดูโปรไฟล์ ${item.counterpart?.name || "อีกฝ่าย"}`);
        this.bindAvatarFallbacks(this.els.avatar);
      }
    }

    renderMessages() {
      if (!this.els.messages) return;
      const conversation = this.activeConversation();
      const readThrough = Number(conversation?.other_last_read_message_id || 0);
      const messageMarkup = this.messages.length ? this.messages.map((message) => {
        const media = message.message_type === "image"
          ? `<a class="chat-media chat-media-image" href="${escapeHTML(this.api.resolveMediaUrl(message.media_url))}" target="_blank" rel="noopener"><img src="${escapeHTML(this.api.resolveMediaUrl(message.media_url))}" alt="${escapeHTML(message.media_name || "รูปภาพในแชท")}" loading="lazy"></a>`
          : message.message_type === "video"
            ? `<div class="chat-media chat-media-video"><video src="${escapeHTML(this.api.resolveMediaUrl(message.media_url))}" controls preload="metadata"></video><small>${escapeHTML(message.media_name || "วิดีโอ")}</small></div>`
            : "";
        const read = message.is_mine && readThrough >= message.message_id ? "อ่านแล้ว" : "";
        const messageSpecies = conversation?.subject_species || this.root.dataset.species || "cat";
        const sender = message.sender || {
          type: message.is_mine ? this.actor?.type : conversation?.counterpart?.type,
          id: message.is_mine ? this.actor?.id : conversation?.counterpart?.id,
          name: message.is_mine ? this.actor?.name : conversation?.counterpart?.name,
          avatar_url: message.is_mine ? this.actor?.avatar_url : conversation?.counterpart?.avatar_url,
        };
        const messageAvatar = message.is_mine
          ? `<span class="chat-message-avatar" aria-hidden="true">${avatarMarkup(sender, messageSpecies)}</span>`
          : `<button class="chat-message-avatar chat-profile-trigger" type="button" data-chat-profile="counterpart" aria-label="ดูโปรไฟล์ ${escapeHTML(sender?.name || "อีกฝ่าย")}">${avatarMarkup(sender, messageSpecies)}</button>`;
        return `<article class="chat-message ${message.is_mine ? "is-mine" : "is-other"}" data-message-id="${message.message_id}">
          ${messageAvatar}
          <div class="chat-message-stack">
            <div class="chat-bubble">${media}${message.text ? `<p>${escapeHTML(message.text).replace(/\n/g, "<br>")}</p>` : ""}</div>
            <footer><time>${escapeHTML(formatTime(message.created_at))}</time>${read ? `<span>✓✓ ${read}</span>` : ""}</footer>
          </div>
        </article>`;
      }).join("") : `<div class="chat-messages-empty"><span>💬</span><strong>เริ่มบทสนทนาอย่างสุภาพ</strong><p>ไม่ควรส่งข้อมูลสำคัญ เช่น รหัสผ่าน หรือข้อมูลทางการเงิน</p></div>`;
      this.els.messages.innerHTML = messageMarkup;
      this.bindAvatarFallbacks(this.els.messages);
      this.scrollToBottom();
    }

    scrollToBottom() {
      requestAnimationFrame(() => {
        if (this.els.messages) this.els.messages.scrollTop = this.els.messages.scrollHeight;
      });
    }

    async markRead() {
      if (!this.activeId || document.hidden) return;
      try {
        const payload = await this.api.request(`/conversations/${this.activeId}/read`, {
          method: "POST", body: JSON.stringify({}),
        }, this.role);
        const item = this.activeConversation();
        if (item) {
          item.unread_count = 0;
          item.my_last_read_message_id = Number(payload.last_read_message_id || 0);
        }
        this.renderConversations();
        const unread = this.conversations.reduce((sum, row) => sum + Number(row.unread_count || 0), 0);
        this.onUnread(unread);
        window.dispatchEvent(new CustomEvent("catmatch:chat-unread", { detail: { count: unread } }));
      } catch (_error) {}
    }

    insertEmoji(emoji) {
      if (!emoji || !this.els.input) return;
      const input = this.els.input;
      const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
      const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
      input.value = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
      const cursor = start + emoji.length;
      input.focus();
      input.setSelectionRange(cursor, cursor);
      this.autoGrow();
      this.sendTyping(true);
    }

    async selectFile(file) {
      try {
        const type = validateFile(file);
        const dataUrl = await readFile(file);
        this.pendingFile = { file, type, dataUrl };
        if (this.els.preview) {
          const preview = type === "image"
            ? `<img src="${escapeHTML(dataUrl)}" alt="ตัวอย่างรูป">`
            : `<video src="${escapeHTML(dataUrl)}" controls></video>`;
          this.els.preview.innerHTML = `${preview}<span><strong>${escapeHTML(file.name)}</strong><small>${(file.size / 1024 / 1024).toFixed(1)} MB</small></span><button type="button" data-remove-attachment aria-label="ลบไฟล์">×</button>`;
          this.els.preview.hidden = false;
        }
      } catch (error) {
        this.clearFile();
        this.showError(error.message);
      }
    }

    clearFile() {
      this.pendingFile = null;
      if (this.els.file) this.els.file.value = "";
      if (this.els.preview) { this.els.preview.hidden = true; this.els.preview.innerHTML = ""; }
    }

    async sendCurrentMessage() {
      if (this.isSending) return;
      if (!this.activeId) {
        this.showError("กรุณาเลือกบทสนทนาก่อนส่งข้อความ");
        return;
      }

      const text = String(this.els.input?.value || "").trim();
      if (!text && !this.pendingFile) return;

      const body = this.pendingFile ? {
        message_type: this.pendingFile.type,
        text,
        media_data_url: this.pendingFile.dataUrl,
        media_name: this.pendingFile.file.name,
      } : { message_type: "text", text };

      this.isSending = true;
      this.showError();
      if (this.els.send) this.els.send.disabled = true;
      if (this.els.input) this.els.input.disabled = true;

      try {
        const payload = await this.api.request(`/conversations/${this.activeId}/messages`, {
          method: "POST",
          body: JSON.stringify(body),
        }, this.role);

        const sentMessage = payload?.data;
        if (!sentMessage || !Number(sentMessage.message_id)) {
          throw new Error("ระบบไม่ได้รับข้อความ กรุณาลองส่งอีกครั้ง");
        }

        if (!this.messages.some((item) => Number(item.message_id) === Number(sentMessage.message_id))) {
          this.messages.push({ ...sentMessage, is_mine: true });
        }
        if (this.els.input) this.els.input.value = "";
        this.clearFile();
        this.autoGrow();
        this.renderMessages();
        this.sendTyping(false);
        void this.loadConversations();
      } catch (error) {
        this.showError(error?.message || "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่");
      } finally {
        this.isSending = false;
        if (this.els.send) this.els.send.disabled = false;
        if (this.els.input) {
          this.els.input.disabled = false;
          this.els.input.focus();
        }
      }
    }

    autoGrow() {
      if (!this.els.input) return;
      this.els.input.style.height = "auto";
      this.els.input.style.height = `${Math.min(this.els.input.scrollHeight, 72)}px`;
    }

    sendTyping(typing) {
      if (!this.activeId) return;
      clearTimeout(this.typingTimer);
      void this.api.request(`/conversations/${this.activeId}/typing`, {
        method: "POST", body: JSON.stringify({ typing }),
      }, this.role).catch(() => {});
      if (typing) {
        this.typingTimer = setTimeout(() => this.sendTyping(false), 1800);
      }
    }

    handleRealtimeEvent(name, data = {}) {
      if (name === "message:new") {
        const conversationId = Number(data.conversation_id || 0);
        if (conversationId === this.activeId && data.message) {
          const mine = data.message.sender?.type === this.actor.type && Number(data.message.sender?.id) === Number(this.actor.id);
          const message = { ...data.message, is_mine: mine };
          if (!this.messages.some((item) => item.message_id === message.message_id)) {
            this.messages.push(message);
            this.renderMessages();
          }
          if (!mine) void this.markRead();
        }
        void this.loadConversations();
        return;
      }

      if (name === "conversation:read") {
        const item = this.conversations.find((row) => row.conversation_id === Number(data.conversation_id));
        if (item && !(data.reader?.type === this.actor.type && Number(data.reader?.id) === Number(this.actor.id))) {
          item.other_last_read_message_id = Number(data.last_read_message_id || 0);
          if (item.conversation_id === this.activeId) this.renderMessages();
        }
        return;
      }

      if (name === "typing") {
        if (Number(data.conversation_id) !== this.activeId || !this.els.typing) return;
        const typingActor = data.actor || {};
        const isMyTypingEvent =
          typingActor.type === this.actor?.type &&
          String(typingActor.id ?? "") === String(this.actor?.id ?? "");
        if (isMyTypingEvent) {
          clearTimeout(this.remoteTypingTimer);
          this.els.typing.hidden = true;
          this.els.typing.textContent = "";
          return;
        }
        clearTimeout(this.remoteTypingTimer);
        this.els.typing.hidden = !data.typing;
        this.els.typing.textContent = data.typing ? `${typingActor.name || "อีกฝ่าย"} กำลังพิมพ์...` : "";
        if (data.typing) this.remoteTypingTimer = setTimeout(() => {
          this.els.typing.hidden = true;
        }, 2600);
        return;
      }

      if (name === "profile:updated") {
        void this.loadConversations();
        return;
      }

      if (name === "presence") {
        let changed = false;
        this.conversations.forEach((item) => {
          if (item.counterpart?.type === data.actor?.type && Number(item.counterpart?.id) === Number(data.actor?.id)) {
            item.counterpart.online = Boolean(data.online);
            item.counterpart.last_seen_at = data.last_seen_at || item.counterpart.last_seen_at;
            changed = true;
          }
        });
        if (changed) { this.renderConversations(); this.updateHeader(); }
      }
    }

    connectRealtime() {
      this.stream?.close();
      this.stream = null;
      this.sharedRealtimeUnsubscribe?.();
      this.sharedRealtimeUnsubscribe = null;

      if (this.role === "user" && window.CatMatchChatNav?.subscribeRealtime) {
        this.sharedRealtimeUnsubscribe = window.CatMatchChatNav.subscribeRealtime((name, data) => {
          this.handleRealtimeEvent(name, data);
        });
        return;
      }

      this.stream = this.api.createStream(this.role);
      if (!this.stream) return;
      ["message:new", "conversation:read", "typing", "presence", "profile:updated"].forEach((name) => {
        this.stream.addEventListener(name, (event) => {
          let data = {};
          try { data = JSON.parse(event.data || "{}"); } catch (_error) {}
          this.handleRealtimeEvent(name, data);
        });
      });
      this.stream.onerror = () => {
        if (this.els.status && this.activeConversation()?.counterpart?.online) {
          this.els.status.textContent = "กำลังเชื่อมต่อใหม่...";
          this.els.status.classList.remove("is-online");
        }
      };
    }

  }

  window.CatMatchChatUI = {
    create(root, options) {
      return new ChatUI(root, options);
    },
  };
})();
