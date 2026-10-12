"use strict";

(() => {
  const API_BASE = window.CATMATCH_API_URL;
  const params =
  new URLSearchParams(window.location.search);

const resultId =
  Number(params.get("result_id"));

const historyMode =
  params.get("history") === "1";

let species =
  params.get("species") === "dog" ? "dog" : "cat";

  const loading = document.getElementById("resultLoading");
  const errorBox = document.getElementById("resultError");
  const errorMessage = document.getElementById("resultErrorMessage");
  const recommendationGrid = document.getElementById("recommendationGrid");
  const resultNext = document.getElementById("resultNext");
  const scoreSummary = document.getElementById("scoreSummary");

  const gachaStage = document.getElementById("gachaStage");
  const finalResults = document.getElementById("finalResults");
  const capsuleTray = document.getElementById("capsuleTray");
  const gachaMachine = document.getElementById("gachaMachine");
  const spinButton = document.getElementById("spinButton");
  const gachaKnob = document.getElementById("gachaKnob");
  const skipButton = document.getElementById("skipGacha");

  const revealModal = document.getElementById("revealModal");
  const sakuraBurst = document.getElementById("sakuraBurst");
  const revealRank = document.getElementById("revealRank");
  const revealImage = document.getElementById("revealImage");
  const revealName = document.getElementById("revealName");
  const revealScore = document.getElementById("revealScore");
  const revealDescription = document.getElementById("revealDescription");
  const nextRevealButton = document.getElementById("nextReveal");

  const catFallbackImages = [
    "https://cdn2.thecatapi.com/images/oGefY4YoG.jpg",
    "https://cdn2.thecatapi.com/images/s4wQfYoEk.jpg",
    "https://cdn2.thecatapi.com/images/JFPROfGtQ.jpg",
  ];

  const dogFallbackImage =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#F5EFE6"/>
        <circle cx="400" cy="300" r="190" fill="#CBDCEB"/>
        <path d="M265 250 205 130c-25 85-8 164 65 202M535 250l60-120c25 85 8 164-65 202" fill="#6D94C5"/>
        <path d="M250 265c25-105 90-155 150-155s125 50 150 155c38 155-32 250-150 290-118-40-188-135-150-290Z" fill="#E8DFCA" stroke="#6D94C5" stroke-width="16"/>
        <circle cx="335" cy="300" r="18" fill="#24364B"/>
        <circle cx="465" cy="300" r="18" fill="#24364B"/>
        <ellipse cx="400" cy="390" rx="85" ry="62" fill="#F5EFE6"/>
        <path d="M370 370c18-18 42-18 60 0-8 23-20 34-30 34s-22-11-30-34Z" fill="#24364B"/>
        <path d="M400 404v28m0 0c-27 20-55 16-72-6m72 6c27 20 55 16 72-6" fill="none" stroke="#24364B" stroke-width="12" stroke-linecap="round"/>
      </svg>
    `);

  let fallbackImages =
    species === "dog"
      ? [dogFallbackImage, dogFallbackImage, dogFallbackImage]
      : catFallbackImages;

  let recommendations = [];
  let storedResult = null;
  let revealOrder = [];
  let revealIndex = 0;
  let spinCount = 0;
  let spinLocked = false;
  let scoreTimer = null;
  const CAPSULE_COLORS = [
  {
    key: "blue",
    group: 1
  },
  {
    key: "yellow",
    group: 2
  },
  {
    key: "light-blue",
    group: 0
  }
];

let spinAnimationPlan = [];
let capsuleColorPlan = [];

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readStoredResult() {
    try {
      return JSON.parse(
        sessionStorage.getItem("catmatch_assessment_result") || "null"
      );
    } catch (_error) {
      return null;
    }
  }

  function currentCatResultIdentity() {
    const value = Number(
      resultId ||
      storedResult?.result_id ||
      storedResult?.history_id ||
      storedResult?.recommendation_id ||
      0
    );

    return Number.isFinite(value) && value > 0 ? String(value) : "latest";
  }

  function catRevealStorageKey() {
    return `catmatch_cat_result_reveal_${currentCatResultIdentity()}`;
  }

  function wasCatRevealCompleted() {
    try {
      return window.sessionStorage.getItem(catRevealStorageKey()) === "complete";
    } catch (_error) {
      return false;
    }
  }

  function markCatRevealCompleted() {
    try {
      window.sessionStorage.setItem(catRevealStorageKey(), "complete");
    } catch (_error) {
      // The result page still works when browser storage is disabled.
    }
  }

  function clearCatRevealCompleted() {
    try {
      window.sessionStorage.removeItem(catRevealStorageKey());
    } catch (_error) {
      // The result page still works when browser storage is disabled.
    }
  }

  function shouldResetCatHistoryReveal() {
    if (!historyMode || species !== "cat") return false;

    const navigationEntry =
      window.performance
        ?.getEntriesByType?.("navigation")
        ?.[0];

    /*
     * Preserve a completed reveal when the user returns from a breed
     * detail or farm page, and also preserve it on refresh/back-forward.
     * A fresh visit from assessment history (or a directly opened history
     * URL) must start with the gacha and keep all result cards hidden.
     */
    if (
      navigationEntry?.type === "reload" ||
      navigationEntry?.type === "back_forward"
    ) {
      return false;
    }

    let referrerPath = "";
    try {
      referrerPath = new URL(document.referrer).pathname.toLowerCase();
    } catch (_error) {
      referrerPath = "";
    }

    if (
      referrerPath.endsWith("/result.html") ||
      referrerPath.endsWith("/farm-map.html") ||
      referrerPath.endsWith("/cat_detail.html")
    ) {
      return false;
    }

    return true;
  }

  function setCatRevealPending(isPending) {
    document.body.classList.toggle("cat-result-reveal-pending", Boolean(isPending));

    if (isPending) {
      hideElement(finalResults);
      hideElement(recommendationGrid);
      hideElement(resultNext);
    }
  }

  function recommendationName(item) {
    return (
      item?.breed_name ||
      item?.name ||
      item?.breed?.breed_name ||
      "สายพันธุ์แนะนำ"
    );
  }

  function recommendationScore(item) {
    const value = Number(
      item?.match_score ?? item?.score ?? item?.match_percentage ?? 0
    );

    return Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : 0;
  }

  function recommendationBreedId(item) {
    const value = Number(item?.breed_id || item?.breed?.breed_id || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function recommendationImage(item, index) {
    const breedId = recommendationBreedId(item);
    const knowledge =
      species === "cat"
        ? window.CatMatchBreedKnowledge?.get?.(breedId) || {}
        : {};

    return (
      knowledge.image ||
      knowledge.thumbnail ||
      item?.image_url ||
      item?.breed?.image_url ||
      fallbackImages[index % fallbackImages.length]
    );
  }

  function recommendationDescription(item) {
    return (
      item?.description ||
      item?.breed?.description ||
      "สายพันธุ์นี้มีลักษณะหลายด้านที่สอดคล้องกับคำตอบและไลฟ์สไตล์ของคุณ"
    );
  }

  function applySpeciesCopy() {
    const animalLabel = species === "dog" ? "สุนัข" : "แมว";
    document.body.dataset.species = species;
    document.title =
      `เปิดกาชาปอง${animalLabel}ที่ใช่ — CatMatch`;

    fallbackImages =
      species === "dog"
        ? [dogFallbackImage, dogFallbackImage, dogFallbackImage]
        : catFallbackImages;

    const heroTitle = document.querySelector(
      ".result-hero h1, .gacha-intro h1"
    );
    if (heroTitle && species === "dog") {
      heroTitle.innerHTML =
        "หมุนเพื่อค้นหา<br><span>สุนัขที่ใช่ของคุณ</span>";
    }

    const finalTitle = document.querySelector(
      "#finalResults h1"
    );
    if (finalTitle) {
      finalTitle.textContent =
        `${animalLabel}ที่เข้ากับคุณมากที่สุด`;
    }
  }

  function hideElement(element) {
    if (!element) return;
    element.hidden = true;
    element.setAttribute("hidden", "");
  }

  function showElement(element) {
    if (!element) return;
    element.hidden = false;
    element.removeAttribute("hidden");
  }

  function resetGachaControls() {
    spinLocked = false;
    if (spinCount < 3) {
      if (spinButton) spinButton.disabled = false;
      if (gachaKnob) gachaKnob.disabled = false;
    }
  }

  function showError(message) {
    hideElement(loading);
    hideElement(gachaStage);
    hideElement(finalResults);

    if (errorMessage) {
      errorMessage.textContent = message;
    }

    showElement(errorBox);
  }

  function renderScoreSummary() {
    if (!scoreSummary) return;

    const scores = storedResult?.scores || {};
    scoreSummary.innerHTML = Object.entries(scores)
      .slice(0, 6)
      .map(([key, value]) => {
        const numericValue = Number(value);
        const displayValue = Number.isFinite(numericValue)
          ? numericValue.toFixed(1)
          : "0.0";

        return `<span>${escapeHTML(key.replaceAll("_", " "))} ${displayValue}/5</span>`;
      })
      .join("");
  }

  function renderRecommendationCards() {
    if (!recommendationGrid) return;

    recommendationGrid.innerHTML = recommendations
      .slice(0, 3)
      .map((item, index) => {
        const score = recommendationScore(item);
        const name = recommendationName(item);
        const image = recommendationImage(item, index);
        const breedId = recommendationBreedId(item);
        const description = recommendationDescription(item);

        return `
          <article class="recommendation-card rank-${index + 1}">
            <div class="recommendation-card__image">
              <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(name)}"
                loading="eager"
                decoding="async"
              >
            </div>
            <div class="recommendation-card__body">
              <span class="recommendation-card__rank">อันดับ ${index + 1}</span>
              <h2>${escapeHTML(name)}</h2>
              <div class="recommendation-card__score">
                <span>ความเหมาะสม</span>
                <strong>${score.toFixed(0)}%</strong>
              </div>
              <div class="recommendation-card__track" aria-hidden="true">
                <span style="width:${score}%"></span>
              </div>
              <p>${escapeHTML(description)}</p>
              <div class="recommendation-card__actions">
                ${
                  species === "dog"
                    ? `<a href="./assessment.html?species=dog">ทำแบบประเมินสุนัขใหม่ →</a>
                       <span class="recommendation-card__map-link" aria-disabled="true">
                         รอเชื่อมข้อมูลฟาร์มสุนัข
                       </span>`
                    : `<a href="./cat_detail.html?id=${breedId}">ดูรายละเอียด →</a>
                       <a
                         class="recommendation-card__map-link"
                         href="./farm-map.html?breed_id=${breedId}&breed_name=${encodeURIComponent(name)}${resultId ? `&result_id=${resultId}` : ""}"
                       >
                         ดูฟาร์มใกล้ฉัน
                       </a>`
                }
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    recommendationGrid
      .querySelectorAll(".recommendation-card__image img")
      .forEach((image, index) => {
        image.addEventListener(
          "error",
          () => {
            image.src = fallbackImages[index % fallbackImages.length];
          },
          { once: true }
        );
      });
  }

  function renderFinalResults() {
    if (!recommendations.length) {
      showError("ไม่พบผลลัพธ์ กรุณาทำแบบประเมินใหม่");
      return;
    }

    setCatRevealPending(false);
    markCatRevealCompleted();
    window.clearInterval(scoreTimer);
    hideElement(revealModal);
    hideElement(gachaStage);
    hideElement(loading);
    hideElement(errorBox);

    renderRecommendationCards();
    renderScoreSummary();

    showElement(recommendationGrid);
    showElement(resultNext);
    showElement(finalResults);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createSakuraBurst(isFirstRank) {
    if (!sakuraBurst) return;

    sakuraBurst.replaceChildren();
    const petalCount = isFirstRank ? 90 : 24;
    const maximumDistance = isFirstRank ? 480 : 220;

    for (let index = 0; index < petalCount; index += 1) {
      const petal = document.createElement("i");
      petal.style.setProperty("--a", `${Math.random() * 360}deg`);
      petal.style.setProperty(
        "--d",
        `${90 + Math.random() * maximumDistance}px`
      );
      petal.style.setProperty(
        "--r",
        `${Math.random() * 720 - 360}deg`
      );
      petal.style.setProperty("--delay", `${Math.random() * 0.22}s`);
      petal.style.setProperty("--scale", `${0.65 + Math.random() * 1.3}`);
      sakuraBurst.appendChild(petal);
    }
  }

  function animateScore(targetScore) {
    if (!revealScore) return;

    window.clearInterval(scoreTimer);
    revealScore.textContent = "0%";

    let currentScore = 0;
    const target = Math.round(targetScore);
    const increment = Math.max(1, Math.ceil(target / 45));

    scoreTimer = window.setInterval(() => {
      currentScore = Math.min(target, currentScore + increment);
      revealScore.textContent = `${currentScore}%`;

      if (currentScore >= target) {
        window.clearInterval(scoreTimer);
      }
    }, 24);
  }

  function revealRecommendation(rankIndex) {
    const item = recommendations[rankIndex];
    if (!item || !revealModal) return;

    const rank = rankIndex + 1;
    const name = recommendationName(item);
    const image = recommendationImage(item, rankIndex);
    const score = recommendationScore(item);

    if (revealRank) revealRank.textContent = `อันดับ ${rank}`;
    if (revealName) revealName.textContent = name;
    if (revealDescription) {
      revealDescription.textContent = recommendationDescription(item);
    }

    if (revealImage) {
      revealImage.src = image;
      revealImage.alt = name;
      revealImage.onerror = () => {
        revealImage.src = fallbackImages[rankIndex % fallbackImages.length];
      };
    }

    revealModal.className = `reveal-modal is-rank-${rank}`;
    createSakuraBurst(rank === 1);
    showElement(revealModal);
    animateScore(score);

    if (nextRevealButton) {
      nextRevealButton.textContent =
        rank === 1 ? "ดูผลลัพธ์ทั้งหมด →" : "เปิดลูกถัดไป →";
    }
  }

  function openCapsule(button) {
    if (!button || button.dataset.opened === "1") return;

    const expectedRank = revealOrder[revealIndex];
    const selectedRank = Number(button.dataset.rank);

    if (selectedRank !== expectedRank) {
      button.classList.add("is-wrong-order");
      window.setTimeout(
        () => button.classList.remove("is-wrong-order"),
        420
      );
      return;
    }

    button.dataset.opened = "1";
    button.classList.add("is-open");

    window.setTimeout(() => {
      revealRecommendation(expectedRank - 1);
    }, 350);
  }

  function shuffleItems(items) {
  const shuffled = [...items];

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(Math.random() * (index + 1));

    [
      shuffled[index],
      shuffled[randomIndex]
    ] = [
      shuffled[randomIndex],
      shuffled[index]
    ];
  }

  return shuffled;
}

function createSpinAnimationPlan() {
  /*
   * เลือก 3 แบบจากทั้งหมด 5 แบบ
   * ในการหมุนชุดเดียวกันจะไม่ซ้ำกัน
   */
  return shuffleItems([1, 2, 3, 4, 5])
    .slice(0, 3);
}

function createCapsuleColorPlan() {
  const storageKey =
    "catmatch_last_capsule_color_plan";

  let previousPlan = "";

  try {
    previousPlan =
      localStorage.getItem(storageKey) || "";
  } catch (_error) {
    previousPlan = "";
  }

  let newPlan = [];
  let newPlanText = "";

  /*
   * สีภายในชุดซ้ำกันได้ เช่น:
   * ฟ้า ฟ้า น้ำเงิน
   *
   * แต่ชุดสีทั้ง 3 ลูกจะไม่เหมือน
   * ชุดที่สุ่มครั้งก่อนทั้งหมด
   */
  for (
    let attempt = 0;
    attempt < 30;
    attempt += 1
  ) {
    newPlan = Array.from(
      { length: 3 },
      () => {
        const randomIndex =
          Math.floor(
            Math.random() *
            CAPSULE_COLORS.length
          );

        return CAPSULE_COLORS[randomIndex];
      }
    );

    newPlanText = newPlan
      .map((color) => color.key)
      .join("|");

    if (newPlanText !== previousPlan) {
      break;
    }
  }

  try {
    localStorage.setItem(
      storageKey,
      newPlanText
    );
  } catch (_error) {
    // หน้าเว็บยังทำงานได้แม้ localStorage ใช้ไม่ได้
  }

  return newPlan;
}

function clearSpinAnimationClasses() {
  if (!gachaMachine) return;

  gachaMachine.classList.remove(
    "spin-style-1",
    "spin-style-2",
    "spin-style-3",
    "spin-style-4",
    "spin-style-5"
  );
}

function applySpinAnimation(animationNumber) {
  if (!gachaMachine) return;

  clearSpinAnimationClasses();

  gachaMachine.classList.add(
    `spin-style-${animationNumber}`
  );
}

 function createCapsuleButton(
  rank,
  index,
  color
) {
  const button =
    document.createElement("button");

  button.className =
    `capsule capsule-color-${color.key}`;

  button.dataset.rank = String(rank);
  button.dataset.color = color.key;
  button.type = "button";

  button.setAttribute(
    "aria-label",
    `เปิดลูกกาชาปองลูกที่ ${index + 1}`
  );

  button.innerHTML = `
    <span aria-hidden="true"></span>
    <b>ลูกที่ ${index + 1}</b>
  `;

  button.addEventListener(
    "click",
    () => openCapsule(button)
  );

  return button;
}

  function getInsideCapsules() {
    return Array.from(
      gachaMachine?.querySelectorAll(
        ".capsule-cloud--full .ball:not(.capsule-drop-ghost)"
      ) || []
    );
  }

 function selectInsideCapsule(color) {
  const cloud =
    gachaMachine?.querySelector(
      ".capsule-cloud--full"
    );

  if (!cloud) return null;

  const cloudRect =
    cloud.getBoundingClientRect();

  const candidates =
    getInsideCapsules().filter(
      (ball, index) => {
        const colorGroup =
          (index + 1) % 3;

        return (
          !ball.classList.contains(
            "is-picked"
          ) &&
          colorGroup === color.group
        );
      }
    );

  const availableCandidates =
    candidates.length
      ? candidates
      : getInsideCapsules().filter(
          (ball) =>
            !ball.classList.contains(
              "is-picked"
            )
        );

  if (!availableCandidates.length) {
    return null;
  }

  /*
   * เลือกลูกสีที่สุ่มไว้
   * โดยเลือกลูกที่อยู่ต่ำและใกล้ช่องปล่อย
   */
  const releaseX =
    cloudRect.width * 0.22;

  return availableCandidates
    .map((ball) => {
      const rect =
        ball.getBoundingClientRect();

      return {
        ball,
        bottom:
          rect.bottom - cloudRect.top,
        distance: Math.abs(
          rect.left -
          cloudRect.left +
          rect.width / 2 -
          releaseX
        )
      };
    })
    .sort(
      (first, second) =>
        second.bottom - first.bottom ||
        first.distance - second.distance
    )[0]
    .ball;
}

  const INSIDE_CAPSULE_ROTATIONS = [
    -10, 7, -5, 9,
    -7, 6, -9, 4,
    8, -6, 10, -4,
    7, -8, 5, -10,
    6, -5, 8, -7
  ];

  function createInsideCapsuleSlots(cloud) {
    const sampleBall = getInsideCapsules()[0];

    if (!cloud || !sampleBall) {
      return [];
    }

    /*
     * ผัง 20 ตำแหน่งแบบกองจริง ไม่เรียงเป็นตารางตรง ๆ
     * ใช้สัดส่วนของพื้นที่ว่าง จึงยังคงรูปทรงเดิมเมื่อหน้าเว็บย่อ 67%
     * และเมื่อกาชาหนึ่งลูกออก ตำแหน่งว่างจะไล่ขึ้นไปด้านบนตามแรงโน้มถ่วง
     */
    const organicLayout = [
      [0.02, 0.05, -11],
      [0.28, 0.00,   7],
      [0.58, 0.06,  -5],
      [0.90, 0.02,  10],

      [0.13, 0.23,   8],
      [0.40, 0.29, -10],
      [0.67, 0.20,   4],
      [0.96, 0.30,   9],

      [0.00, 0.48,  -7],
      [0.27, 0.43,  11],
      [0.57, 0.52,  -4],
      [0.88, 0.46,   8],

      [0.10, 0.70,   9],
      [0.38, 0.65,  -8],
      [0.68, 0.74,   5],
      [0.96, 0.67, -10],

      [0.02, 0.94,  -5],
      [0.31, 0.86,   8],
      [0.61, 0.98,  -9],
      [0.90, 0.88,   6]
    ];

    const cloudWidth = cloud.clientWidth;
    const cloudHeight = cloud.clientHeight;
    const ballSize = Math.max(
      1,
      Math.min(
        sampleBall.offsetWidth,
        sampleBall.offsetHeight
      )
    );

    const maxLeft = Math.max(0, cloudWidth - ballSize);
    const maxTop = Math.max(0, cloudHeight - ballSize);

    return organicLayout.map(
      ([xRatio, yRatio, rotation], index) => {
        const left = Math.min(
          maxLeft,
          Math.max(0, maxLeft * xRatio)
        );
        const top = Math.min(
          maxTop,
          Math.max(0, maxTop * yRatio)
        );

        return {
          index,
          left,
          top,
          centerX: left + ballSize / 2,
          centerY: top + ballSize / 2,
          rotation
        };
      }
    );
  }

  function applyInsideCapsuleSlot(
    ball,
    slot,
    animate = true,
    delay = 0
  ) {
    if (!ball || !slot) return;

    ball.dataset.slotIndex = String(slot.index);
    ball.style.setProperty(
      "--slot-left",
      `${slot.left.toFixed(2)}px`
    );
    ball.style.setProperty(
      "--slot-top",
      `${slot.top.toFixed(2)}px`
    );
    ball.style.setProperty(
      "--slot-rotate",
      `${slot.rotation}deg`
    );
    ball.style.setProperty(
      "--gravity-delay",
      `${delay}ms`
    );
    ball.style.zIndex = String(slot.index + 2);

    if (animate) {
      ball.classList.remove("is-gravity-falling");
      void ball.offsetWidth;
      ball.classList.add("is-gravity-falling");
    }
  }

  function initializeInsideCapsuleLayout({
    resetState = false
  } = {}) {
    const cloud = gachaMachine?.querySelector(
      ".capsule-cloud--full"
    );

    if (!cloud) return;

    const balls = getInsideCapsules();
    const slots = createInsideCapsuleSlots(cloud);

    if (!slots.length) return;

    cloud.classList.remove(
      "is-rebalancing",
      "is-gravity-settling"
    );

    balls.forEach((ball, index) => {
      ball.classList.remove(
        "is-source-moving",
        "is-gravity-falling"
      );

      if (resetState) {
        ball.classList.remove(
          "is-picked",
          "is-dispensed"
        );
      }

      if (
        !ball.classList.contains("is-dispensed")
      ) {
        const currentSlot = Number.parseInt(
          ball.dataset.slotIndex || "",
          10
        );
        const slot =
          Number.isInteger(currentSlot) &&
          slots[currentSlot]
            ? slots[currentSlot]
            : slots[index];

        applyInsideCapsuleSlot(
          ball,
          slot,
          false
        );
      }
    });

    cloud.dataset.layoutReady = "true";
  }

  function clearInsideCapsuleMotion() {
    const cloud = gachaMachine?.querySelector(
      ".capsule-cloud--full"
    );

    if (!cloud) return;

    cloud
      .querySelectorAll(".capsule-drop-ghost")
      .forEach((ghost) => ghost.remove());

    getInsideCapsules().forEach((ball) => {
      ball.classList.remove(
        "is-source-moving",
        "is-gravity-falling",
        "is-picked",
        "is-dispensed"
      );

      [
        "--jostle-x",
        "--jostle-y",
        "--jostle-rotate",
        "--jostle-back-x",
        "--jostle-back-y",
        "--jostle-back-rotate",
        "--jostle-settle-x",
        "--jostle-settle-y",
        "--jostle-settle-rotate",
        "--jostle-delay"
      ].forEach((propertyName) => {
        ball.style.removeProperty(propertyName);
      });
    });

    initializeInsideCapsuleLayout({
      resetState: true
    });
  }

  function settleInsideCapsulesFrom(
    sourceSlotIndex
  ) {
    const cloud = gachaMachine?.querySelector(
      ".capsule-cloud--full"
    );

    if (!cloud) return;

    const slots = createInsideCapsuleSlots(cloud);
    const balls = getInsideCapsules().filter(
      (ball) =>
        !ball.classList.contains("is-dispensed")
    );

    if (
      !slots.length ||
      !Number.isInteger(sourceSlotIndex) ||
      !slots[sourceSlotIndex]
    ) {
      return;
    }

    const occupied = new Map();

    balls.forEach((ball) => {
      const slotIndex = Number.parseInt(
        ball.dataset.slotIndex || "",
        10
      );

      if (
        Number.isInteger(slotIndex) &&
        slots[slotIndex]
      ) {
        occupied.set(slotIndex, ball);
      }
    });

    let emptySlotIndex = sourceSlotIndex;
    const movedBalls = [];
    let guard = 0;

    /*
     * หา "ลูกที่อยู่เหนือช่องว่างและใกล้ที่สุด"
     * แล้วปล่อยให้ตกลงมาแทนที่ต่อกันเป็นทอด ๆ
     * จึงไม่ทำให้ทั้งกองไหลไปรวมมุมเดียว
     */
    while (guard < slots.length) {
      guard += 1;

      const emptySlot = slots[emptySlotIndex];
      let bestCandidate = null;

      occupied.forEach((ball, slotIndex) => {
        const candidateSlot = slots[slotIndex];

        if (
          candidateSlot.top >=
          emptySlot.top - 8
        ) {
          return;
        }

        const verticalDistance =
          emptySlot.top - candidateSlot.top;
        const horizontalDistance = Math.abs(
          emptySlot.centerX -
          candidateSlot.centerX
        );

        const score =
          verticalDistance +
          horizontalDistance * 0.62;

        if (
          !bestCandidate ||
          score < bestCandidate.score
        ) {
          bestCandidate = {
            ball,
            slotIndex,
            score
          };
        }
      });

      if (!bestCandidate) break;

      occupied.delete(bestCandidate.slotIndex);
      occupied.set(
        emptySlotIndex,
        bestCandidate.ball
      );

      movedBalls.push({
        ball: bestCandidate.ball,
        targetSlot: emptySlot,
        fromSlotIndex:
          bestCandidate.slotIndex
      });

      emptySlotIndex =
        bestCandidate.slotIndex;
    }

    cloud.classList.remove(
      "is-rebalancing"
    );
    cloud.classList.add(
      "is-gravity-settling"
    );

    movedBalls.forEach(
      ({ ball, targetSlot }, index) => {
        applyInsideCapsuleSlot(
          ball,
          targetSlot,
          true,
          index * 55
        );
      }
    );

    window.setTimeout(() => {
      cloud.classList.remove(
        "is-gravity-settling"
      );
      movedBalls.forEach(({ ball }) => {
        ball.classList.remove(
          "is-gravity-falling"
        );
      });
    }, 980);
  }

  function animateInsideCapsuleDrop(sourceBall) {
    const cloud = gachaMachine?.querySelector(
      ".capsule-cloud--full"
    );

    if (!cloud || !sourceBall) return;

    cloud
      .querySelectorAll(".capsule-drop-ghost")
      .forEach((ghost) => ghost.remove());

    const sourceSlotIndex = Number.parseInt(
      sourceBall.dataset.slotIndex || "",
      10
    );

    const sourceLeft = sourceBall.offsetLeft;
    const sourceTop = sourceBall.offsetTop;
    const sourceWidth = sourceBall.offsetWidth;
    const sourceHeight = sourceBall.offsetHeight;
    const sourceCenterX =
      sourceLeft + sourceWidth / 2;
    const sourceCenterY =
      sourceTop + sourceHeight / 2;

    const targetCenterX = Math.max(
      sourceWidth / 2 + 6,
      cloud.clientWidth * 0.18
    );
    const targetCenterY =
      cloud.clientHeight +
      sourceHeight * 0.22;
    const deltaX =
      targetCenterX - sourceCenterX;
    const deltaY = Math.max(
      70,
      targetCenterY - sourceCenterY
    );

    const ghost = sourceBall.cloneNode(true);
    ghost.className =
      "ball capsule-drop-ghost";
    ghost.removeAttribute("style");
    ghost.removeAttribute("data-slot-index");
    ghost.setAttribute(
      "aria-hidden",
      "true"
    );

    const computedStyle =
      window.getComputedStyle(sourceBall);
    const ballColor = computedStyle
      .getPropertyValue("--ball-color")
      .trim();

    if (ballColor) {
      ghost.style.setProperty(
        "--ball-color",
        ballColor
      );
    }

    ghost.style.left = `${sourceLeft}px`;
    ghost.style.top = `${sourceTop}px`;
    ghost.style.width = `${sourceWidth}px`;
    ghost.style.height = `${sourceHeight}px`;
    ghost.style.setProperty(
      "--drop-x",
      `${deltaX}px`
    );
    ghost.style.setProperty(
      "--drop-y",
      `${deltaY}px`
    );
    ghost.style.setProperty(
      "--drop-mid-x",
      `${deltaX * 0.56}px`
    );
    ghost.style.setProperty(
      "--drop-mid-y",
      `${deltaY * 0.52}px`
    );
    ghost.style.setProperty(
      "--drop-bounce-x",
      `${deltaX * 0.86}px`
    );
    ghost.style.setProperty(
      "--drop-bounce-y",
      `${deltaY * 0.88}px`
    );

    cloud.appendChild(ghost);

    sourceBall.classList.add(
      "is-source-moving",
      "is-dispensed"
    );

    getInsideCapsules().forEach(
      (ball, index) => {
        if (
          ball === sourceBall ||
          ball.classList.contains(
            "is-dispensed"
          )
        ) {
          return;
        }

        const direction =
          index % 2 === 0 ? 1 : -1;
        const jostleX =
          direction * (3 + (index % 3));
        const jostleY =
          3 + (index % 4);
        const jostleRotate =
          direction * (1.5 + index % 3);

        ball.style.setProperty(
          "--jostle-x",
          `${jostleX}px`
        );
        ball.style.setProperty(
          "--jostle-y",
          `${jostleY}px`
        );
        ball.style.setProperty(
          "--jostle-rotate",
          `${jostleRotate}deg`
        );
        ball.style.setProperty(
          "--jostle-back-x",
          `${-jostleX}px`
        );
        ball.style.setProperty(
          "--jostle-back-y",
          `${Math.round(-jostleY * 0.45)}px`
        );
        ball.style.setProperty(
          "--jostle-back-rotate",
          `${-jostleRotate}deg`
        );
        ball.style.setProperty(
          "--jostle-settle-x",
          `${Math.round(-jostleX * 0.3)}px`
        );
        ball.style.setProperty(
          "--jostle-settle-y",
          `${Math.round(jostleY * 0.25)}px`
        );
        ball.style.setProperty(
          "--jostle-settle-rotate",
          `${-jostleRotate * 0.3}deg`
        );
        ball.style.setProperty(
          "--jostle-delay",
          `${(index % 6) * 16}ms`
        );
      }
    );

    cloud.classList.remove("is-rebalancing");
    void cloud.offsetWidth;
    cloud.classList.add("is-rebalancing");

    window.setTimeout(() => {
      settleInsideCapsulesFrom(
        sourceSlotIndex
      );
    }, 120);

    const finish = () => {
      ghost.remove();
      sourceBall.classList.remove(
        "is-source-moving"
      );

      window.setTimeout(() => {
        cloud.classList.remove(
          "is-rebalancing"
        );
      }, 140);
    };

    ghost.addEventListener(
      "animationend",
      finish,
      { once: true }
    );
    window.setTimeout(finish, 980);
  }

function releaseOneCapsule() {
  if (
    !capsuleTray ||
    spinCount >= revealOrder.length
  ) {
    return;
  }

  const index = spinCount;
  const rank = revealOrder[index];

  const color =
    capsuleColorPlan[index] ||
    CAPSULE_COLORS[0];

  const button =
    createCapsuleButton(
      rank,
      index,
      color
    );

  capsuleTray.appendChild(button);

  window.requestAnimationFrame(() => {
    button.classList.add("is-dropping");
  });

  window.setTimeout(() => {
    button.classList.remove("is-dropping");
    button.classList.add("is-dropped");
  }, 760);

  /*
   * นำลูกสีเดียวกับลูกด้านนอก
   * ออกจากภายในตู้
   */
  const dispensedBall =
    selectInsideCapsule(color);

  if (dispensedBall) {
    dispensedBall.classList.add("is-picked");
    animateInsideCapsuleDrop(dispensedBall);
  }

  spinCount += 1;

  if (spinCount >= 3) {
    window.setTimeout(() => {
      capsuleTray
        .querySelector(
          `[data-rank="${revealOrder[0]}"]`
        )
        ?.classList.add("is-ready");
    }, 800);

    if (spinButton) {
      spinButton.disabled = true;
      spinButton.innerHTML =
        "ออกครบ 3 ลูกแล้ว <span>✓</span>";
    }

    if (gachaKnob) {
      gachaKnob.disabled = true;
    }
  } else if (spinButton) {
    spinButton.innerHTML =
      `หมุนอีก ${3 - spinCount} ครั้ง ` +
      `<span>↻</span>`;
  }
}

 function spinGacha() {
  if (
    spinLocked ||
    spinCount >= 3 ||
    !recommendations.length
  ) {
    return;
  }

  if (spinCount === 0) {
    revealOrder = [3, 2, 1];
    revealIndex = 0;

    capsuleTray?.replaceChildren();
    clearInsideCapsuleMotion();
    getInsideCapsules().forEach((ball) => ball.classList.remove("is-picked"));

    /*
     * เตรียมอนิเมชัน 3 แบบ
     * จากทั้งหมด 5 แบบ
     */
    spinAnimationPlan =
      createSpinAnimationPlan();

    /*
     * เตรียมสีลูก 3 ลูก
     */
    capsuleColorPlan =
      createCapsuleColorPlan();
  }

  const animationNumber =
    spinAnimationPlan[spinCount] || 1;

  spinLocked = true;

  applySpinAnimation(
    animationNumber
  );

  gachaMachine?.classList.add(
    "is-spinning"
  );

  if (spinButton) {
    spinButton.disabled = true;
  }

  if (gachaKnob) {
    gachaKnob.disabled = true;
  }

  window.setTimeout(() => {
    gachaMachine?.classList.remove(
      "is-spinning"
    );

    clearSpinAnimationClasses();

    releaseOneCapsule();

    spinLocked = false;

    if (spinCount < 3) {
      if (spinButton) {
        spinButton.disabled = false;
      }

      if (gachaKnob) {
        gachaKnob.disabled = false;
      }
    }
  }, 1150);
}
  function handleNextReveal() {
    hideElement(revealModal);
    window.clearInterval(scoreTimer);
    revealIndex += 1;

    if (revealIndex >= revealOrder.length) {
      renderFinalResults();
      return;
    }

    const nextRank = revealOrder[revealIndex];
    capsuleTray
      ?.querySelector(`[data-rank="${nextRank}"]`)
      ?.classList.add("is-ready");
  }

  async function fetchRecommendations() {
    const response = await fetch(
      `${API_BASE}/recommendations/${resultId}`,
      { cache: "no-store" }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || "ไม่สามารถโหลดผลลัพธ์ได้");
    }

    const data = payload.data || payload.recommendations || [];
    const responseSpecies =
      payload.species || data?.[0]?.species;

    if (responseSpecies === "dog" || responseSpecies === "cat") {
      species = responseSpecies;
      applySpeciesCopy();
    }

    return Array.isArray(data) ? data : [];
  }

async function loadResult() {
  /*
   * เปิดจากหน้าประวัติ:
   * โหลดผลตาม result_id โดยตรง
   */
  if (historyMode && resultId) {
    hideElement(gachaStage);

    try {
      recommendations =
        (await fetchRecommendations()).slice(0, 3);
    } catch (error) {
      const message =
        error?.message === "Failed to fetch"
          ? "เชื่อมต่อ Backend ไม่ได้ กรุณาเปิด server แล้วลองใหม่"
          : error?.message ||
            "ไม่สามารถโหลดผลลัพธ์ย้อนหลังได้";

      showError(message);
      return;
    }
  } else {
    storedResult = readStoredResult();

    if (
      storedResult?.species === "dog" ||
      storedResult?.species === "cat"
    ) {
      species = storedResult.species;
      applySpeciesCopy();
    }

    if (storedResult?.recommendations?.length) {
      recommendations =
        storedResult.recommendations.slice(0, 3);
    } else if (resultId) {
      try {
        recommendations =
          (await fetchRecommendations()).slice(0, 3);
      } catch (error) {
        const message =
          error?.message === "Failed to fetch"
            ? "เชื่อมต่อ Backend ไม่ได้ กรุณาเปิด server แล้วลองใหม่"
            : error?.message ||
              "ไม่สามารถโหลดผลลัพธ์ได้";

        showError(message);
        return;
      }
    }
  }

  if (!recommendations.length) {
    showError(
      "ไม่พบผลลัพธ์ กรุณาทำแบบประเมินใหม่"
    );
    return;
  }

  hideElement(loading);
  hideElement(errorBox);

  /*
   * เมื่อเปิดผลแมวจากหน้าประวัติใหม่ ต้องเริ่มสุ่มใหม่เสมอ
   * แต่การย้อนกลับจากหน้ารายละเอียดหรือหน้าฟาร์มจะรักษาการ์ดเดิมไว้
   */
  if (shouldResetCatHistoryReveal()) {
    clearCatRevealCompleted();
  }

  /*
   * แสดงการ์ดได้เฉพาะผลที่ผู้ใช้สุ่มครบแล้วเท่านั้น
   */
  if (wasCatRevealCompleted()) {
    setCatRevealPending(false);
    hideElement(gachaStage);
    renderFinalResults();
    return;
  }

  /*
   * ทั้งผลใหม่และผลที่เปิดจากประวัติ:
   * ซ่อนการ์ดทั้งหมดจนกว่าจะสุ่มครบ 3 อันดับ
   */
  setCatRevealPending(true);

  if (gachaStage) {
    resetGachaControls();
    showElement(gachaStage);

    window.requestAnimationFrame(() => {
      initializeInsideCapsuleLayout({
        resetState: true
      });
    });
  } else {
    renderFinalResults();
  }
}

spinButton?.addEventListener(
  "click",
  spinGacha
);

gachaKnob?.addEventListener(
  "click",
  spinGacha
);

if (skipButton) {
  hideElement(skipButton);
  skipButton.disabled = true;
}

nextRevealButton?.addEventListener(
  "click",
  handleNextReveal
);

let insideCapsuleResizeTimer = null;
window.addEventListener("resize", () => {
  window.clearTimeout(insideCapsuleResizeTimer);
  insideCapsuleResizeTimer = window.setTimeout(() => {
    initializeInsideCapsuleLayout();
  }, 120);
});

applySpeciesCopy();
  loadResult();
})();