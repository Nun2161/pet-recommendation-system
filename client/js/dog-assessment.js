"use strict";

(() => {
  const pageHost = window.location.hostname === "localhost" ? "localhost" : "127.0.0.1";
  const API_BASE = String(
    window.CATMATCH_API_URL || `http://${pageHost}:3000/api`
  ).replace(/\/+$/, "");

  function apiBaseCandidates() {
    const candidates = [API_BASE];
    if (/^http:\/\/(localhost|127\.0\.0\.1):3000\/api$/i.test(API_BASE)) {
      const alternate = API_BASE.includes("localhost")
        ? "http://127.0.0.1:3000/api"
        : "http://localhost:3000/api";
      candidates.push(alternate);
    }
    return [...new Set(candidates)];
  }

  async function requestApi(path, options = {}) {
    let lastNetworkError = null;

    for (const base of apiBaseCandidates()) {
      try {
        const response = await fetch(`${base}${path}`, options);
        const payload = await response.json().catch(() => ({}));
        return { response, payload };
      } catch (error) {
        lastNetworkError = error;
      }
    }

    throw lastNetworkError || new Error("เชื่อมต่อ Backend ไม่ได้");
  }
  const PAGE_SIZE = 10;
  const SPECIES = "dog";
  const ANIMAL_LABEL = SPECIES === "dog" ? "สุนัข" : "แมว";
  const DRAFT_PREFIX = `catmatch_assessment_draft_v1_${SPECIES}`;

  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const errorMessage = document.getElementById("errorMessage");
  const loginGate = document.getElementById("loginGate");
  const startGate = document.getElementById("startGate");
  const startAssessmentButton = document.getElementById("startAssessmentButton");
  const questionnaire = document.getElementById("questionnaire");
  const questionList = document.getElementById("questionList");
  const assessmentForm = document.getElementById("assessmentForm");
  const previousButton = document.getElementById("previousButton");
  const nextButton = document.getElementById("nextButton");
  const submitButton = document.getElementById("submitButton");
  const submitLabel = submitButton?.querySelector(".submit-label");
  const submitLoading = submitButton?.querySelector(".submit-loading");
  const confirmSubmitButton = document.getElementById("confirmSubmitButton");
  const retryButton = document.getElementById("retryButton");
  const dialog = document.getElementById("assessmentDialog");
  const formMessage = document.getElementById("formMessage");

  let questions = [];
  let currentPage = 0;
  let answers = new Map();
  let currentUser = null;
  let submitting = false;

  const CATEGORY_LABELS = {
    friendly: "การเข้ากับคน", affectionate: "ความผูกพัน", playful: "ความขี้เล่น",
    independence: "ความเป็นอิสระ", trainability: "การเรียนรู้", protective: "การปกป้อง",
    adaptability: "การปรับตัว", sociability: "การเข้าสังคม", activity_level: "ระดับกิจกรรม",
    exercise_need: "การออกกำลัง", outdoor_preference: "ความชอบพื้นที่นอกบ้าน",
    apartment_suitability: "ความเหมาะกับพื้นที่จำกัด", family_friendly: "ความเหมาะกับครอบครัว",
    child_friendly: "การเข้ากับเด็ก", first_time_owner_friendly: "ผู้เลี้ยงครั้งแรก",
    grooming_need: "การดูแลขน", shedding_level: "การผลัดขน", noise_level: "ระดับเสียง",
    heat_tolerance: "การทนร้อน", cold_tolerance: "การทนหนาว"
  };

  function readJSON(storage, key) {
    try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
  }

  function getUser() {
    return readJSON(sessionStorage, "catmatch_user") || readJSON(sessionStorage, "user") ||
      readJSON(localStorage, "catmatch_user") || readJSON(localStorage, "user");
  }

  function getUserId(user) {
    return Number(user?.user_id || user?.id || user?.data?.user_id || 0);
  }

 function getDisplayName(user) {
  return String(
    user?.username ||
    user?.name ||
    user?.nickname ||
    "ผู้ใช้งาน"
  ).trim();
}

  function draftKey() { return `${DRAFT_PREFIX}_${getUserId(currentUser) || "guest"}`; }

  function setPageMode(mode) {
    document.body.classList.toggle("assessment-auth-required", mode === "login");
    document.body.classList.toggle("assessment-prestart", mode === "start");
    document.body.classList.toggle("assessment-started", mode === "quiz");
    const account = document.getElementById("assessmentAccount");
    if (account) account.hidden = mode === "login";
  }

  function showOnly(target) {
    [loadingState, errorState, loginGate, startGate, questionnaire].forEach((item) => {
      if (!item) return;
      const shouldHide = item !== target;
      item.hidden = shouldHide;
      item.setAttribute("aria-hidden", String(shouldHide));
      item.style.display = shouldHide ? "none" : "";
    });
  }

  function showMessage(message = "") {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.hidden = !message;
  }

  function saveDraft() {
    if (!currentUser) return;
    const value = { page: currentPage, answers: Object.fromEntries(answers), saved_at: Date.now() };
    try { localStorage.setItem(draftKey(), JSON.stringify(value)); } catch {}
  }

  function restoreDraft() {
    const draft = readJSON(localStorage, draftKey());
    if (!draft) return;
    currentPage = Math.max(0, Number(draft.page) || 0);
    answers = new Map(Object.entries(draft.answers || {}).map(([key, value]) => [Number(key), Number(value)]));
  }

  function clearDraft() {
    try { localStorage.removeItem(draftKey()); } catch {}
  }

  function applySpeciesCopy() {
    document.body.dataset.species = SPECIES;
    document.title =
      `แบบประเมินค้นหา${ANIMAL_LABEL}ที่ใช่ — DogMatch`;

    const heroTitle = document.querySelector(
      ".assessment-hero h1"
    );
    if (heroTitle && SPECIES === "dog") {
      heroTitle.innerHTML =
        "ค้นหาสุนัขที่เข้ากับ<br><span>ชีวิตของคุณจริง ๆ</span>";
    }

    const startTitle = document.querySelector(
      "#startGate h2"
    );
    if (startTitle) {
      startTitle.textContent =
        `ค้นหา${ANIMAL_LABEL}ที่เข้ากับชีวิตของคุณ`;
    }

    const dialogText = document.querySelector(
      "#assessmentDialog .assessment-dialog__card > p:last-of-type"
    );
    if (dialogText) {
      dialogText.textContent =
        `ระบบจะคำนวณคะแนนจากบุคลิกและไลฟ์สไตล์ เพื่อจัดอันดับ${ANIMAL_LABEL}ที่เหมาะกับคุณมากที่สุด`;
    }

    const loginLink = document.querySelector(
      "#loginGate a[href*='return=dog-assessment']"
    );
    if (loginLink && SPECIES === "dog") {
      loginLink.href = "./login.html?return=dog-assessment";
    }
  }

  function updateAccount() {
    const name = getDisplayName(currentUser);
    const nameEl = document.getElementById("assessmentUserName");
    const avatar = document.getElementById("assessmentAvatar");
    if (nameEl) nameEl.textContent = name;
    if (avatar) avatar.textContent = (name[0] || "U").toUpperCase();
  }

  async function loadQuestions() {
    showOnly(loadingState);
    showMessage();
    try {
      const { response, payload } = await requestApi(
        `/questions?species=${encodeURIComponent(SPECIES)}`,
        { cache: "no-store" }
      );
      if (!response.ok || payload.success === false || !Array.isArray(payload.data)) {
        throw new Error(payload.message || "ไม่สามารถโหลดคำถามได้");
      }
      questions = payload.data.filter((question) => Array.isArray(question.options) && question.options.length);
      if (!questions.length) throw new Error("ยังไม่มีคำถามที่เปิดใช้งานในฐานข้อมูล");
      currentPage = Math.min(currentPage, Math.max(0, pageCount() - 1));
      renderCurrentPage();
      showOnly(questionnaire);
    } catch (error) {
      if (errorMessage) errorMessage.textContent = error.message === "Failed to fetch"
        ? "เชื่อมต่อ Backend ไม่ได้ กรุณาเปิด server ด้วย npm run dev"
        : error.message;
      showOnly(errorState);
    }
  }

  function pageCount() { return Math.ceil(questions.length / PAGE_SIZE); }

  function pageQuestions(page = currentPage) {
    return questions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  }

  function isPageComplete(page) {
    return pageQuestions(page).every((question) => answers.has(Number(question.question_id)));
  }

  function escapeHTML(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }


  function renderCurrentPage() {
    const items = pageQuestions();
    questionList.innerHTML = items.map((question, index) => {
      const qid = Number(question.question_id);
      const selected = answers.get(qid);
      const category = CATEGORY_LABELS[question.category] || "ไลฟ์สไตล์และนิสัย";
      return `
        <fieldset class="assessment-question" data-question-id="${qid}">
          <legend><span class="assessment-question__number">${currentPage * PAGE_SIZE + index + 1}</span>
            <span>${escapeHTML(question.question_text)}<small style="display:block;margin-top:4px;color:#8a959e;font-size:12px;font-weight:500">${escapeHTML(category)}</small></span>
          </legend>
          <div class="assessment-options">
            ${question.options.map((option) => {
              const oid = Number(option.option_id);
              return `<div class="assessment-option"><input type="radio" id="option-${qid}-${oid}" name="question-${qid}" value="${oid}" ${selected === oid ? "checked" : ""}><label for="option-${qid}-${oid}">${escapeHTML(option.option_text)}</label></div>`;
            }).join("")}
          </div>
        </fieldset>`;
    }).join("");

    questionList.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener("change", () => {
        const qid = Number(input.name.replace("question-", ""));
        answers.set(qid, Number(input.value));
        input.closest(".assessment-question")?.classList.remove("is-missing");
        showMessage();
        updateProgress();
        saveDraft();
      });
    });

    const totalPages = pageCount();
    document.getElementById("sectionLabel").textContent = "คำถามชุดปัจจุบัน";
    document.getElementById("pageTitle").textContent = currentPage === totalPages - 1 ? "ตรวจคำตอบชุดสุดท้าย" : "เลือกคำตอบที่ใกล้ตัวคุณที่สุด";
    previousButton.disabled = currentPage === 0;
    previousButton.setAttribute("aria-disabled", String(currentPage === 0));
    const isLastPage = currentPage === totalPages - 1;
    nextButton.hidden = isLastPage;
    submitButton.hidden = !isLastPage;
    nextButton.style.display = isLastPage ? "none" : "inline-flex";
    submitButton.style.display = isLastPage ? "inline-flex" : "none";
    updateProgress();
    document.querySelector(".assessment-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateProgress() {
    const count = answers.size;
    const total = questions.length || 100;
    const percent = Math.round((count / total) * 100);
    document.getElementById("answeredCount").textContent = count;
    document.getElementById("totalQuestionCount").textContent = total;
    document.getElementById("progressPercent").textContent = `${percent}%`;
    document.getElementById("progressFill").style.width = `${percent}%`;
  }

  function validateCurrentPage() {
    const missing = pageQuestions().filter((question) => !answers.has(Number(question.question_id)));
    questionList.querySelectorAll(".assessment-question").forEach((fieldset) => {
      fieldset.classList.toggle("is-missing", missing.some((question) => Number(question.question_id) === Number(fieldset.dataset.questionId)));
    });
    if (missing.length) {
      showMessage(`ต้องตอบคำถามในชุดนี้ให้ครบทุกข้อก่อนจึงจะไปต่อได้ เหลืออีก ${missing.length} ข้อ`);
      questionList.querySelector(".is-missing")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    showMessage();
    return true;
  }

  let dialogReturnFocus = null;

  function openDialog() {
    if (!dialog) return;

    dialogReturnFocus = document.activeElement;
    dialog.hidden = false;
    document.documentElement.classList.add("assessment-dialog-open");

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    window.requestAnimationFrame(() => {
      confirmSubmitButton?.focus({ preventScroll: true });
    });
  }

  function closeDialog() {
    if (!dialog) return;

    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }

    dialog.hidden = true;
    document.documentElement.classList.remove("assessment-dialog-open");
    document.body.style.overflow = "";

    if (dialogReturnFocus instanceof HTMLElement) {
      dialogReturnFocus.focus({ preventScroll: true });
    }
    dialogReturnFocus = null;
  }

  function setSubmitting(value) {
    submitting = value;
    submitButton.disabled = value;
    confirmSubmitButton.disabled = value;
    if (submitLabel) submitLabel.hidden = value;
    if (submitLoading) submitLoading.hidden = !value;
    confirmSubmitButton.textContent = value ? "กำลังคำนวณผล..." : "ยืนยันและคำนวณผล";
  }

  async function submitAnswers() {
    if (submitting) return;
    if (answers.size !== questions.length) {
      const firstIncomplete = Array.from({ length: pageCount() }, (_, index) => index).find((index) => !isPageComplete(index));
      closeDialog();
      currentPage = firstIncomplete ?? currentPage;
      renderCurrentPage();
      showMessage(`ยังตอบไม่ครบ ${questions.length - answers.size} ข้อ กรุณาตรวจคำตอบที่ทำเครื่องหมายไว้`);
      return;
    }

    setSubmitting(true);
    try {
      const { response, payload } = await requestApi("/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: getUserId(currentUser),
          species: SPECIES,
          answers: questions.map((question) => ({
            question_id: Number(question.question_id),
            option_id: Number(answers.get(Number(question.question_id)))
          }))
        })
      });
      if (!response.ok || payload.success === false) throw new Error(payload.message || "ไม่สามารถคำนวณผลได้");
      clearDraft();
      sessionStorage.setItem("catmatch_assessment_result", JSON.stringify(payload));
      window.location.replace(
        `./dog-result.html?result_id=${encodeURIComponent(payload.result_id)}&species=${encodeURIComponent(SPECIES)}`
      );
    } catch (error) {
      closeDialog();
      showMessage(error.message === "Failed to fetch" ? "เชื่อมต่อ Backend ไม่ได้ กรุณาเปิด server แล้วลองอีกครั้ง" : error.message);
    } finally {
      setSubmitting(false);
    }
  }

  previousButton?.addEventListener("click", () => {
    if (currentPage > 0) { currentPage -= 1; renderCurrentPage(); saveDraft(); }
  });
  nextButton?.addEventListener("click", () => {
    if (!validateCurrentPage()) return;
    if (currentPage < pageCount() - 1) { currentPage += 1; renderCurrentPage(); saveDraft(); }
  });
  assessmentForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateCurrentPage()) return;
    openDialog();
  });
  confirmSubmitButton?.addEventListener("click", submitAnswers);
  dialog?.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  dialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  retryButton?.addEventListener("click", loadQuestions);
  startAssessmentButton?.addEventListener("click", () => {
    setPageMode("quiz");
    restoreDraft();
    loadQuestions();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !dialog.hidden) closeDialog(); });

  document.getElementById("menuToggle")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    document.querySelector(".main-nav")?.classList.toggle("is-open", !open);
  });

  applySpeciesCopy();
  currentUser = getUser();
  if (!currentUser || !getUserId(currentUser)) {
    setPageMode("login");
    showOnly(loginGate);
    return;
  }
  updateAccount();
  setPageMode("start");
  showOnly(startGate);
})();
