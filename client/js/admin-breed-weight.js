"use strict";

/* =========================================================
   ADMIN 04–05: BREED & WEIGHT MANAGEMENT
   แยกไฟล์จาก admin.js เพื่อไม่เปลี่ยนฟังก์ชันเดิม
   ========================================================= */

(() => {
  const API_ROOT = `${window.CATMATCH_API_URL}/admin`;

  const TOKEN_KEYS = [
    "catmatch_admin_token",
    "admin_token",
    "adminToken",
    "catmatch_token",
    "token",
  ];

  const TRAITS = [
    { key: "friendly", label: "เป็นมิตร" },
    { key: "affectionate", label: "ชอบแสดงความรัก" },
    { key: "playful", label: "ขี้เล่น" },
    { key: "independence", label: "ความเป็นอิสระ" },
    { key: "trainability", label: "ฝึกง่าย" },
    { key: "protective", label: "ปกป้องเจ้าของ" },
    { key: "adaptability", label: "ปรับตัวง่าย" },
    { key: "sociability", label: "เข้าสังคม" },
    { key: "activity_level", label: "ระดับกิจกรรม" },
    { key: "exercise_need", label: "ความต้องการออกกำลัง" },
    { key: "outdoor_preference", label: "ชอบกิจกรรมนอกบ้าน" },
    { key: "apartment_suitability", label: "เหมาะกับห้อง/คอนโด" },
    { key: "family_friendly", label: "เหมาะกับครอบครัว" },
    { key: "child_friendly", label: "เป็นมิตรกับเด็ก" },
    { key: "first_time_owner_friendly", label: "เหมาะกับผู้เลี้ยงมือใหม่" },
    { key: "grooming_need", label: "ความต้องการดูแลขน" },
    { key: "shedding_level", label: "ระดับการผลัดขน" },
    { key: "noise_level", label: "ระดับเสียง" },
    { key: "heat_tolerance", label: "ทนต่ออากาศร้อน" },
    { key: "cold_tolerance", label: "ทนต่ออากาศเย็น" },
  ];

  const WEIGHT_GROUPS = [
    {
      title: "บุคลิกและความสัมพันธ์",
      description: "ลักษณะนิสัย การแสดงความรัก และการเข้ากับคน",
      keys: [
        "friendly",
        "affectionate",
        "playful",
        "independence",
        "sociability",
      ],
    },
    {
      title: "การเรียนรู้และการปรับตัว",
      description: "ความสามารถในการฝึก การปกป้อง และการปรับตัว",
      keys: [
        "trainability",
        "protective",
        "adaptability",
        "activity_level",
        "exercise_need",
      ],
    },
    {
      title: "บ้านและครอบครัว",
      description: "ความเหมาะสมกับพื้นที่ เด็ก ครอบครัว และผู้เลี้ยงมือใหม่",
      keys: [
        "outdoor_preference",
        "apartment_suitability",
        "family_friendly",
        "child_friendly",
        "first_time_owner_friendly",
      ],
    },
    {
      title: "การดูแลและสภาพอากาศ",
      description: "ภาระการดูแลขน การผลัดขน เสียง และการทนต่ออากาศ",
      keys: [
        "grooming_need",
        "shedding_level",
        "noise_level",
        "heat_tolerance",
        "cold_tolerance",
      ],
    },
  ];

  const traitByKey = new Map(
    TRAITS.map((trait) => [trait.key, trait])
  );

  let breeds = [];
  let activeBreedSpecies = "cat";
  let activeWeightSpecies = "cat";
  const breedsLoaded = { cat: false, dog: false };
  const weightsLoaded = { cat: false, dog: false };
  let breedSearchTimer = null;

  const elements = {
    message: document.getElementById("adminMessage"),

    refreshBreeds: document.getElementById("refreshBreeds"),
    addBreed: document.getElementById("addBreed"),
    breedSearch: document.getElementById("breedSearch"),
    breedStatus: document.getElementById("breedStatus"),
    breedResultCount: document.getElementById("breedResultCount"),
    breedSkeleton: document.getElementById("breedSkeleton"),
    breedEmpty: document.getElementById("breedEmpty"),
    breedList: document.getElementById("breedList"),

    breedDialog: document.getElementById("breedEditorDialog"),
    breedDialogTitle: document.getElementById("breedDialogTitle"),
    breedDialogClose: document.getElementById("breedDialogClose"),
    breedCancel: document.getElementById("breedCancel"),
    breedForm: document.getElementById("breedForm"),
    breedId: document.getElementById("breedId"),
    breedSpecies: document.getElementById("breedSpecies"),
    breedSpeciesButtons: Array.from(document.querySelectorAll("[data-breed-species]")),
    breedPanelKicker: document.getElementById("breedPanelKicker"),
    breedPanelTitle: document.getElementById("breedPanelTitle"),
    breedEmptyIcon: document.getElementById("breedEmptyIcon"),
    breedName: document.getElementById("breedName"),
    breedDescription: document.getElementById("breedDescription"),
    breedEditorStatus: document.getElementById("breedEditorStatus"),
    breedTraitFields: document.getElementById("breedTraitFields"),
    breedSave: document.getElementById("breedSave"),

    refreshWeights: document.getElementById("refreshWeights"),
    weightVersion: document.getElementById("weightVersion"),
    weightUpdatedAt: document.getElementById("weightUpdatedAt"),
    weightStatus: document.getElementById("weightStatus"),
    weightSkeleton: document.getElementById("weightSkeleton"),
    weightForm: document.getElementById("weightForm"),
    weightGroups: document.getElementById("weightGroups"),
    weightTotal: document.getElementById("weightTotal"),
    weightTotalValue: document.getElementById("weightTotalValue"),
    weightMeterFill: document.getElementById("weightMeterFill"),
    equalizeWeights: document.getElementById("equalizeWeights"),
    resetWeights: document.getElementById("resetWeights"),
    saveWeights: document.getElementById("saveWeights"),
    weightSpeciesButtons: Array.from(document.querySelectorAll("[data-weight-species]")),
  };

  function getStoredToken() {
    for (const key of TOKEN_KEYS) {
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) return sessionValue;

      const localValue = localStorage.getItem(key);
      if (localValue) return localValue;
    }

    return "";
  }

  function showFeatureMessage(message = "", type = "error") {
    if (!elements.message) return;

    elements.message.textContent = message;
    elements.message.hidden = !message;
    elements.message.classList.toggle(
      "is-success",
      type === "success"
    );
  }

  function setLoading(button, loading, text = "กำลังบันทึก...") {
    if (!button) return;

    if (loading) {
      button.dataset.beforeLoading = button.textContent;
      button.textContent = text;
      button.disabled = true;
      return;
    }

    button.textContent =
      button.dataset.beforeLoading || button.textContent;
    button.disabled = false;
    delete button.dataset.beforeLoading;
  }

  async function readJson(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return {};
    return response.json();
  }

  async function featureApi(path, options = {}) {
    const token = getStoredToken();

    if (!token) {
      window.location.replace("./login.html");
      throw new Error("กรุณาเข้าสู่ระบบผู้ดูแลระบบ");
    }

    const response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
    });

    const data = await readJson(response);

    if (response.status === 401 || response.status === 403) {
      window.location.replace("./login.html");
      throw new Error(
        data.message || "เซสชันผู้ดูแลหมดอายุ"
      );
    }

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message || "ไม่สามารถดำเนินการได้"
      );
    }

    return data;
  }

  async function confirmAction(message, options = {}) {
    if (window.CatMatchDialog?.confirm) {
      return window.CatMatchDialog.confirm(message, options);
    }

    return window.confirm(message);
  }

  function formatDate(value) {
    if (!value) return "ยังไม่มีประวัติ";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ไม่ระบุ";

    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function normalizeBreedName(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getLocalBreedRows(species = activeBreedSpecies) {
    return species === "dog"
      ? (Array.isArray(window.DOGMATCH_DOG_BREEDS) ? window.DOGMATCH_DOG_BREEDS : [])
      : (Array.isArray(window.CATMATCH_CAT_BREEDS) ? window.CATMATCH_CAT_BREEDS : []);
  }

  function getLocalBreedId(breed) {
    const databaseId = Number(breed?.breed_id);
    const localRows = getLocalBreedRows(breed?.species || activeBreedSpecies);
    const byName = localRows.find((row) =>
      normalizeBreedName(row?.breed_name) === normalizeBreedName(breed?.breed_name)
    );
    if (byName?.breed_id) return Number(byName.breed_id);
    return Number.isInteger(databaseId) && databaseId > 0 ? databaseId : 0;
  }

  function getBreedImageReference(breed) {
    const species = breed?.species || activeBreedSpecies;
    const localRows = getLocalBreedRows(species);
    const localBreed = localRows.find((row) =>
      normalizeBreedName(row?.breed_name) === normalizeBreedName(breed?.breed_name)
    );
    const localBreedId = Number(localBreed?.breed_id || getLocalBreedId(breed));

    if (species === "dog") {
      const imageUrl = String(
        breed?.image_url || localBreed?.image_url || localBreed?.image || ""
      );
      return { localBreedId, imageUrl, thumbnailUrl: imageUrl };
    }

    const knowledge = window.CatMatchBreedKnowledge;
    const item = localBreedId && knowledge?.get ? knowledge.get(localBreedId) : null;
    return {
      localBreedId,
      imageUrl: String(breed?.image_url || item?.image || item?.thumbnail || ""),
      thumbnailUrl: String(item?.thumbnail || item?.image || breed?.image_url || ""),
    };
  }

  function renderBreedImage(imageBox, breed) {
    const reference = getBreedImageReference(breed);
    const fallback = (breed?.species || activeBreedSpecies) === "dog" ? "🐶" : "🐱";

    if (!reference.imageUrl) {
      imageBox.textContent = fallback;
      imageBox.title = "ยังไม่มีรูปในคลังสายพันธุ์";
      return;
    }

    const image = document.createElement("img");
    image.src = reference.imageUrl;
    image.alt = `รูป${breed.breed_name}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.dataset.breedId = String(reference.localBreedId || "");
    image.dataset.imageStage = "full";

    image.addEventListener("error", () => {
      if (
        (breed?.species || activeBreedSpecies) === "cat" &&
        window.CatMatchBreedKnowledge?.handleImageError &&
        reference.localBreedId
      ) {
        window.CatMatchBreedKnowledge.handleImageError(image, reference.localBreedId);
        return;
      }
      if (reference.thumbnailUrl && image.src !== reference.thumbnailUrl) {
        image.src = reference.thumbnailUrl;
        return;
      }
      image.remove();
      imageBox.textContent = fallback;
      imageBox.title = "ไม่สามารถโหลดรูปสายพันธุ์ได้";
    });

    imageBox.replaceChildren(image);
  }

  function updateBreedSpeciesUi() {
    const isDog = activeBreedSpecies === "dog";
    elements.breedSpeciesButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.breedSpecies === activeBreedSpecies);
    });
    if (elements.breedPanelKicker) elements.breedPanelKicker.textContent = isDog ? "DOG BREEDS" : "CAT BREEDS";
    if (elements.breedPanelTitle) elements.breedPanelTitle.textContent = isDog ? "รายการสายพันธุ์สุนัข" : "รายการสายพันธุ์แมว";
    if (elements.breedEmptyIcon) elements.breedEmptyIcon.textContent = isDog ? "🐶" : "🐱";
    if (elements.breedSpecies) elements.breedSpecies.value = activeBreedSpecies;
  }

  function updateWeightSpeciesUi() {
    elements.weightSpeciesButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.weightSpecies === activeWeightSpecies);
    });
  }

  function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== "") element.textContent = text;
    return element;
  }

  function createButton(text, className, handler) {
    const button = createElement("button", className, text);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function createBreedStatusBadge(status) {
    const badge = createElement(
      "span",
      `admin-status-badge ${
        status === "active" ? "is-completed" : "is-cancelled"
      }`,
      status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"
    );

    return badge;
  }

  function renderTraitEditor() {
    if (!elements.breedTraitFields) return;
    elements.breedTraitFields.replaceChildren();

    TRAITS.forEach((trait) => {
      const field = createElement("div", "admin-trait-field");
      const label = createElement("label", "", trait.label);
      label.htmlFor = `breedTrait_${trait.key}`;

      const select = document.createElement("select");
      select.id = `breedTrait_${trait.key}`;
      select.name = trait.key;
      select.required = true;
      select.dataset.breedTrait = trait.key;

      [1, 2, 3, 4, 5].forEach((score) => {
        const option = document.createElement("option");
        option.value = String(score);
        option.textContent = `${score} — ${
          score === 1
            ? "น้อยมาก"
            : score === 2
              ? "น้อย"
              : score === 3
                ? "ปานกลาง"
                : score === 4
                  ? "มาก"
                  : "มากที่สุด"
        }`;
        select.appendChild(option);
      });

      select.value = "3";
      field.append(label, select);
      elements.breedTraitFields.appendChild(field);
    });
  }

  function getBreedTraitInputs() {
    return Array.from(
      document.querySelectorAll("[data-breed-trait]")
    );
  }

  function setDialogOpen(open) {
    const dialog = elements.breedDialog;
    if (!dialog) return;

    if (open) {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      return;
    }

    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function openBreedEditor(breed = null) {
    if (!elements.breedForm) return;

    elements.breedForm.reset();
    getBreedTraitInputs().forEach((input) => {
      input.value = "3";
    });

    const species = breed?.species || activeBreedSpecies;
    if (elements.breedSpecies) elements.breedSpecies.value = species;
    elements.breedId.value = breed?.breed_id || "";
    elements.breedName.value = breed?.breed_name || "";
    elements.breedDescription.value = breed?.description || "";
    elements.breedEditorStatus.value = breed?.status || "active";

    if (breed) {
      getBreedTraitInputs().forEach((input) => {
        const value = Number(breed[input.dataset.breedTrait]);
        input.value = String(
          Number.isFinite(value)
            ? Math.min(5, Math.max(1, Math.round(value)))
            : 3
        );
      });
    }

    if (elements.breedDialogTitle) {
      const animalLabel = species === "dog" ? "สุนัข" : "แมว";
      elements.breedDialogTitle.textContent = breed
        ? `แก้ไข ${breed.breed_name}`
        : `เพิ่มสายพันธุ์${animalLabel}`;
    }

    setDialogOpen(true);
    window.setTimeout(() => elements.breedName?.focus(), 60);
  }

  function collectBreedForm() {
    const payload = {
      breed_name: elements.breedName.value.trim(),
      species: elements.breedSpecies?.value || activeBreedSpecies,
      description: elements.breedDescription.value.trim(),
      status: elements.breedEditorStatus.value,
    };

    getBreedTraitInputs().forEach((input) => {
      payload[input.dataset.breedTrait] = Number(input.value);
    });

    return payload;
  }

  function createBreedCard(breed) {
    const card = createElement(
      "article",
      `admin-breed-card ${
        breed.status === "inactive" ? "is-inactive" : ""
      }`
    );

    const imageBox = createElement(
      "div",
      "admin-breed-image",
      (breed?.species || activeBreedSpecies) === "dog" ? "🐶" : "🐱"
    );
    renderBreedImage(imageBox, breed);

    const main = createElement("div", "admin-breed-main");
    const titleRow = createElement("div", "admin-breed-title-row");
    titleRow.append(
      createElement("h3", "", breed.breed_name),
      createBreedStatusBadge(breed.status)
    );

    const id = createElement(
      "div",
      "admin-breed-id",
      `รหัสสายพันธุ์ #${breed.breed_id}`
    );

    const description = createElement(
      "p",
      "admin-breed-description",
      breed.description || "ยังไม่มีคำอธิบายสายพันธุ์"
    );

    const details = document.createElement("details");
    details.className = "admin-breed-details";
    const summary = document.createElement("summary");
    summary.textContent = "ดูคะแนนลักษณะทั้ง 20 ด้าน";

    const scoreGrid = createElement("div", "admin-breed-score-grid");
    TRAITS.forEach((trait) => {
      const score = createElement("div", "admin-breed-score");
      score.append(
        createElement("span", "", trait.label),
        createElement("strong", "", `${Number(breed[trait.key]) || 0}/5`)
      );
      scoreGrid.appendChild(score);
    });

    details.append(summary, scoreGrid);
    main.append(titleRow, id, description, details);

    const actions = createElement("div", "admin-breed-actions");
    const editButton = createButton(
      "แก้ไข",
      "button button-primary button-small",
      () => openBreedEditor(breed)
    );

    const nextStatus =
      breed.status === "active" ? "inactive" : "active";
    const toggleButton = createButton(
      nextStatus === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน",
      "button button-secondary button-small",
      () => toggleBreedStatus(breed, nextStatus, toggleButton)
    );

    actions.append(editButton, toggleButton);
    card.append(imageBox, main, actions);
    return card;
  }

  function renderBreeds() {
    if (!elements.breedList || !elements.breedEmpty) return;

    elements.breedList.replaceChildren();
    elements.breedEmpty.hidden = breeds.length > 0;

    if (elements.breedResultCount) {
      elements.breedResultCount.textContent = `${breeds.length} สายพันธุ์`;
    }

    breeds.forEach((breed) => {
      elements.breedList.appendChild(createBreedCard(breed));
    });
  }

  async function loadBreeds() {
    showFeatureMessage();
    elements.breedSkeleton && (elements.breedSkeleton.hidden = false);
    elements.breedEmpty && (elements.breedEmpty.hidden = true);
    elements.breedList?.replaceChildren();
    elements.refreshBreeds && (elements.refreshBreeds.disabled = true);

    try {
      const search = encodeURIComponent(
        elements.breedSearch?.value.trim() || ""
      );
      const status = encodeURIComponent(
        elements.breedStatus?.value || "all"
      );

      const data = await featureApi(
        `/breeds?species=${encodeURIComponent(activeBreedSpecies)}&search=${search}&status=${status}`
      );

      breeds = Array.isArray(data.data) ? data.data : [];
      breedsLoaded[activeBreedSpecies] = true;
      renderBreeds();
    } catch (error) {
      showFeatureMessage(
        error instanceof TypeError
          ? "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบว่า npm run dev เปิดอยู่"
          : error.message
      );
    } finally {
      elements.breedSkeleton && (elements.breedSkeleton.hidden = true);
      elements.refreshBreeds && (elements.refreshBreeds.disabled = false);
    }
  }

  async function saveBreed(event) {
    event.preventDefault();

    if (!elements.breedForm.reportValidity()) return;

    const breedId = Number(elements.breedId.value);
    const isEditing = Number.isInteger(breedId) && breedId > 0;
    const payload = collectBreedForm();

    setLoading(elements.breedSave, true);
    showFeatureMessage();

    try {
      const data = await featureApi(
        isEditing ? `/breeds/${breedId}` : "/breeds",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setDialogOpen(false);
      await loadBreeds();
      showFeatureMessage(
        data.message || "บันทึกสายพันธุ์สำเร็จ",
        "success"
      );
    } catch (error) {
      showFeatureMessage(error.message);
    } finally {
      setLoading(elements.breedSave, false);
    }
  }

  async function toggleBreedStatus(breed, status, button) {
    const statusText =
      status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน";

    const confirmed = await confirmAction(
      `ต้องการ${statusText}สายพันธุ์ “${breed.breed_name}” หรือไม่?`,
      {
        title: "ยืนยันสถานะสายพันธุ์",
        confirmText: statusText,
        danger: status === "inactive",
      }
    );

    if (!confirmed) return;

    setLoading(button, true, "กำลังอัปเดต...");
    showFeatureMessage();

    try {
      const data = await featureApi(`/breeds/${breed.breed_id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, species: breed.species || activeBreedSpecies }),
      });

      await loadBreeds();
      showFeatureMessage(data.message, "success");
    } catch (error) {
      showFeatureMessage(error.message);
    } finally {
      setLoading(button, false);
    }
  }

  function renderWeightFields() {
    if (!elements.weightGroups) return;
    elements.weightGroups.replaceChildren();

    WEIGHT_GROUPS.forEach((group) => {
      const groupElement = createElement("section", "admin-weight-group");
      const heading = createElement("div", "admin-weight-group-heading");
      heading.append(
        createElement("h3", "", group.title),
        createElement("p", "", group.description)
      );

      const grid = createElement("div", "admin-weight-grid");

      group.keys.forEach((key) => {
        const trait = traitByKey.get(key);
        const field = createElement("div", "admin-weight-field");
        const label = createElement("label", "", trait.label);
        label.htmlFor = `weight_${key}`;

        const wrap = createElement("div", "admin-weight-input-wrap");
        const input = document.createElement("input");
        input.id = `weight_${key}`;
        input.className = "admin-weight-input";
        input.type = "number";
        input.min = "0";
        input.max = "100";
        input.step = "0.01";
        input.inputMode = "decimal";
        input.value = "5";
        input.dataset.weightKey = `${key}_weight`;
        input.setAttribute("aria-label", `ค่าน้ำหนัก ${trait.label}`);
        input.addEventListener("input", updateWeightTotal);

        wrap.append(input, createElement("span", "", "%"));
        field.append(label, wrap);
        grid.appendChild(field);
      });

      groupElement.append(heading, grid);
      elements.weightGroups.appendChild(groupElement);
    });
  }

  function getWeightInputs() {
    return Array.from(
      document.querySelectorAll("[data-weight-key]")
    );
  }

  function setWeightValues(values = {}) {
    const inputs = getWeightInputs();
    let runningTotal = 0;

    inputs.forEach((input, index) => {
      const raw = Number(values[input.dataset.weightKey]);
      let value = Number.isFinite(raw) ? raw : 5;

      if (index === inputs.length - 1) {
        value = Math.max(0, 100 - runningTotal);
      }

      value = Number(value.toFixed(2));
      input.value = String(value);
      runningTotal += value;
    });

    updateWeightTotal();
  }

  function collectWeights() {
    const weights = {};

    getWeightInputs().forEach((input) => {
      weights[input.dataset.weightKey] = Number(input.value || 0);
    });

    return weights;
  }

  function calculateWeightTotal() {
    return getWeightInputs().reduce(
      (sum, input) => sum + Number(input.value || 0),
      0
    );
  }

  function updateWeightTotal() {
    const total = calculateWeightTotal();
    const valid = Math.abs(total - 100) <= 0.05;
    const percentage = Math.min(100, Math.max(0, total));

    if (elements.weightTotalValue) {
      elements.weightTotalValue.textContent = `${total.toFixed(2)}%`;
    }

    if (elements.weightMeterFill) {
      elements.weightMeterFill.style.width = `${percentage}%`;
    }

    elements.weightTotal?.classList.toggle("is-invalid", !valid);

    if (elements.saveWeights) {
      elements.saveWeights.disabled = !valid;
      elements.saveWeights.title = valid
        ? "บันทึกค่าน้ำหนัก"
        : "ผลรวมต้องเท่ากับ 100%";
    }
  }

  async function loadWeights() {
    showFeatureMessage();
    elements.weightSkeleton && (elements.weightSkeleton.hidden = false);
    elements.weightForm && (elements.weightForm.hidden = true);
    elements.refreshWeights && (elements.refreshWeights.disabled = true);

    try {
      const data = await featureApi(`/weights?species=${encodeURIComponent(activeWeightSpecies)}`);
      const current = data.data || {};

      setWeightValues(current.normalized_weights || {});

      if (elements.weightVersion) {
        elements.weightVersion.textContent = current.weight_id
          ? `#${current.weight_id}`
          : "ค่าเริ่มต้น";
      }

      if (elements.weightUpdatedAt) {
        elements.weightUpdatedAt.textContent = formatDate(current.updated_at);
      }

      if (elements.weightStatus) {
        elements.weightStatus.textContent = current.weight_id
          ? "พร้อมใช้งาน"
          : "ยังไม่มีข้อมูลในฐานข้อมูล";
      }

      weightsLoaded[activeWeightSpecies] = true;
      elements.weightForm && (elements.weightForm.hidden = false);
    } catch (error) {
      showFeatureMessage(
        error instanceof TypeError
          ? "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบว่า npm run dev เปิดอยู่"
          : error.message
      );
    } finally {
      elements.weightSkeleton && (elements.weightSkeleton.hidden = true);
      elements.refreshWeights && (elements.refreshWeights.disabled = false);
    }
  }

  function equalizeWeights() {
    const inputs = getWeightInputs();
    const equalValue = 100 / inputs.length;

    inputs.forEach((input) => {
      input.value = String(Number(equalValue.toFixed(2)));
    });

    updateWeightTotal();
  }

  async function saveWeights(event) {
    event.preventDefault();

    const total = calculateWeightTotal();

    if (Math.abs(total - 100) > 0.05) {
      showFeatureMessage(
        `ผลรวมค่าน้ำหนักต้องเท่ากับ 100% (ปัจจุบัน ${total.toFixed(2)}%)`
      );
      return;
    }

    const confirmed = await confirmAction(
      "ต้องการบันทึกค่าน้ำหนักชุดใหม่นี้หรือไม่? ค่านี้จะใช้กับการทำแบบประเมินครั้งถัดไป โดยไม่เปลี่ยนผลลัพธ์เก่า",
      {
        title: "ยืนยันค่าน้ำหนักการแนะนำ",
        confirmText: "บันทึกค่าน้ำหนัก",
      }
    );

    if (!confirmed) return;

    setLoading(elements.saveWeights, true);
    showFeatureMessage();

    try {
      const data = await featureApi("/weights", {
        method: "POST",
        body: JSON.stringify({ species: activeWeightSpecies, weights: collectWeights() }),
      });

      await loadWeights();
      showFeatureMessage(data.message, "success");
    } catch (error) {
      showFeatureMessage(error.message);
    } finally {
      setLoading(elements.saveWeights, false);
      updateWeightTotal();
    }
  }

  function handleFeatureSection(sectionName) {
    if (sectionName === "breeds" && !breedsLoaded[activeBreedSpecies]) {
      loadBreeds();
    }

    if (sectionName === "weights" && !weightsLoaded[activeWeightSpecies]) {
      loadWeights();
    }
  }

  function bindEvents() {
    document.querySelectorAll("[data-admin-section]").forEach((button) => {
      button.addEventListener("click", () => {
        handleFeatureSection(button.dataset.adminSection);
      });
    });

    elements.breedSpeciesButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const species = button.dataset.breedSpecies === "dog" ? "dog" : "cat";
        if (species === activeBreedSpecies) return;
        activeBreedSpecies = species;
        breeds = [];
        if (elements.breedSearch) elements.breedSearch.value = "";
        if (elements.breedStatus) elements.breedStatus.value = "all";
        updateBreedSpeciesUi();
        loadBreeds();
      });
    });

    elements.weightSpeciesButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const species = button.dataset.weightSpecies === "dog" ? "dog" : "cat";
        if (species === activeWeightSpecies) return;
        activeWeightSpecies = species;
        updateWeightSpeciesUi();
        loadWeights();
      });
    });

    elements.refreshBreeds?.addEventListener("click", loadBreeds);
    elements.addBreed?.addEventListener("click", () => openBreedEditor());
    elements.breedForm?.addEventListener("submit", saveBreed);
    elements.breedDialogClose?.addEventListener("click", () => setDialogOpen(false));
    elements.breedCancel?.addEventListener("click", () => setDialogOpen(false));

    elements.breedDialog?.addEventListener("click", (event) => {
      if (event.target === elements.breedDialog) {
        setDialogOpen(false);
      }
    });

    elements.breedSearch?.addEventListener("input", () => {
      window.clearTimeout(breedSearchTimer);
      breedSearchTimer = window.setTimeout(loadBreeds, 280);
    });

    elements.breedStatus?.addEventListener("change", loadBreeds);

    elements.refreshWeights?.addEventListener("click", loadWeights);
    elements.resetWeights?.addEventListener("click", loadWeights);
    elements.equalizeWeights?.addEventListener("click", equalizeWeights);
    elements.weightForm?.addEventListener("submit", saveWeights);
  }

  function openRequestedSection() {
    const requested = new URLSearchParams(window.location.search).get("section");
    if (requested !== "breeds" && requested !== "weights") return;

    if (typeof showSection === "function") {
      showSection(requested);
      handleFeatureSection(requested);
      return;
    }

    const button = document.querySelector(
      `[data-admin-section="${requested}"]`
    );
    button?.click();
  }

  renderTraitEditor();
  renderWeightFields();
  updateBreedSpeciesUi();
  updateWeightSpeciesUi();
  bindEvents();
  updateWeightTotal();
  openRequestedSection();
})();
