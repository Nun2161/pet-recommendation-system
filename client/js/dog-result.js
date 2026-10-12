"use strict";

(() => {
  const API_BASE = window.CATMATCH_API_URL;
  const params = new URLSearchParams(window.location.search);
  const resultId = Number(params.get("result_id"));
  const historyMode = params.get("history") === "1";
  const resultViewStorageKey = resultId
    ? `dogmatch_dog_result_viewed_${resultId}`
    : "dogmatch_dog_result_viewed_latest";

  const loading = document.getElementById("resultLoading");
  const errorBox = document.getElementById("resultError");
  const errorMessage = document.getElementById("resultErrorMessage");
  const revealStage = document.getElementById("dogRevealStage");
  const historyResults = document.getElementById("historyResults");
  const recommendationGrid = document.getElementById("recommendationGrid");

  const intro = document.getElementById("dogResultIntro");
  const experience = document.getElementById("dogGlobeExperience");
  const startButton = document.getElementById("startDogReveal");
  const shakeButton = document.getElementById("shakeDogGlobe");
  const shakeButtonLabel = document.getElementById("shakeDogGlobeLabel");
  const globeWrap = document.getElementById("dogSnowGlobeWrap");
  const globe = document.getElementById("dogSnowGlobe");
  const globeSnow = document.getElementById("dogGlobeSnow");
  const globeSparkles = document.getElementById("dogGlobeSparkles");
  const rankLabel = document.getElementById("dogRevealRankLabel");
  const status = document.getElementById("dogRevealStatus");
  const topThreeCards = document.getElementById("dogTopThreeCards");
  const finalActions = document.getElementById("dogResultFinalActions");
  const snowScene = document.querySelector(".dog-snow-scene");

  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.reducedMotion === "true";

  let recommendations = [];
  let storedResult = null;
  let experienceStarted = false;
  let revealBusy = false;
  let revealStep = 0;
  const revealSequence = [2, 1, 0];
  const extraSnowflakes = [];

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function wasResultViewed() {
    if (historyMode) return true;
    try {
      return window.localStorage.getItem(resultViewStorageKey) === "1";
    } catch (_error) {
      return false;
    }
  }

  function markResultViewed() {
    try {
      window.localStorage.setItem(resultViewStorageKey, "1");
    } catch (_error) {
      // The result page still works when browser storage is disabled.
    }
  }

  function currentResultIdentity() {
    const value = Number(
      resultId ||
      storedResult?.result_id ||
      storedResult?.history_id ||
      storedResult?.recommendation_id ||
      0
    );

    return Number.isFinite(value) && value > 0 ? String(value) : "latest";
  }

  function revealStateStorageKey() {
    return `dogmatch_dog_result_reveal_${currentResultIdentity()}`;
  }

  function readRevealState() {
    try {
      const state = JSON.parse(
        window.sessionStorage.getItem(revealStateStorageKey()) || "null"
      );

      if (!state || !Array.isArray(state.revealed)) return null;

      const revealed = [...new Set(
        state.revealed
          .map(Number)
          .filter((index) => Number.isInteger(index) && index >= 0 && index <= 2)
      )];

      return {
        revealed,
        complete: state.complete === true || revealed.length >= 3
      };
    } catch (_error) {
      return null;
    }
  }

  function writeRevealState(revealed) {
    try {
      const normalized = [...new Set(
        revealed
          .map(Number)
          .filter((index) => Number.isInteger(index) && index >= 0 && index <= 2)
      )];

      window.sessionStorage.setItem(
        revealStateStorageKey(),
        JSON.stringify({
          revealed: normalized,
          complete: normalized.length >= 3,
          saved_at: Date.now()
        })
      );
    } catch (_error) {
      // The result page still works when browser storage is disabled.
    }
  }


  function clearCurrentRevealState() {
    try {
      window.sessionStorage.removeItem(revealStateStorageKey());
    } catch (_error) {
      // The result page still works when browser storage is disabled.
    }
  }

  function saveVisibleCardState() {
    if (!topThreeCards) return;

    const revealed = Array.from(
      topThreeCards.querySelectorAll(".dog-podium-card.is-visible")
    )
      .map((card) => Number(card.dataset.rank) - 1)
      .filter((index) => Number.isInteger(index) && index >= 0 && index <= 2);

    writeRevealState(revealed);
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
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  }

  function recommendationBreedId(item) {
    const value = Number(item?.breed_id || item?.breed?.breed_id || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function localBreed(item) {
    const breedId = recommendationBreedId(item);
    const breedName = recommendationName(item).trim().toLowerCase();
    const rows = Array.isArray(window.DOGMATCH_DOG_BREEDS)
      ? window.DOGMATCH_DOG_BREEDS
      : [];

    return rows.find((row) =>
      Number(row.breed_id || row.source_order) === breedId ||
      String(row.breed_name || "").trim().toLowerCase() === breedName
    ) || null;
  }

  function recommendationImage(item, index) {
    const local = localBreed(item);
    const rows = Array.isArray(window.DOGMATCH_DOG_BREEDS)
      ? window.DOGMATCH_DOG_BREEDS
      : [];
    const fallback = rows[index % Math.max(rows.length, 1)]?.image_url || "";

    return (
      item?.image_url ||
      item?.breed?.image_url ||
      local?.image_url ||
      window.DOGMATCH_DOG_FALLBACK ||
      fallback
    );
  }

  function recommendationThaiName(item) {
    return String(
      item?.thai_name || item?.breed?.thai_name || localBreed(item)?.thai_name || ""
    ).trim();
  }

  function recommendationDescription(item) {
    return (
      item?.description ||
      item?.breed?.description ||
      localBreed(item)?.description ||
      "สายพันธุ์นี้มีหลายด้านที่สอดคล้องกับคำตอบและรูปแบบชีวิตของคุณ"
    );
  }

  function detailUrl(item) {
    const breedId = recommendationBreedId(item);
    return breedId ? `./dog-detail.html?id=${breedId}` : "./dog-breeds.html";
  }

  function farmUrl(item) {
    const breedId = recommendationBreedId(item);
    const name = recommendationName(item);
    return (
      `./dog-farm-map.html?breed_id=${breedId}` +
      `&breed_name=${encodeURIComponent(name)}` +
      (resultId ? `&result_id=${resultId}` : "")
    );
  }

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function showError(message) {
    hideElement(loading);
    hideElement(revealStage);
    hideElement(historyResults);
    if (errorMessage) errorMessage.textContent = message;
    showElement(errorBox);
  }

  function createExtraSnow() {
    if (!snowScene || extraSnowflakes.length) return;

    for (let index = 0; index < 30; index += 1) {
      const snowflake = document.createElement("span");
      const direction = index % 2 === 0 ? -1 : 1;
      const drift = direction * (20 + (index % 6) * 7);

      snowflake.className = "dog-snowflake dog-result-snow-extra";
      snowflake.style.setProperty("--left", `${2 + ((index * 13) % 96)}%`);
      snowflake.style.setProperty("--size", `${5 + (index % 4) * 2}px`);
      snowflake.style.setProperty("--opacity", `${0.42 + (index % 4) * 0.1}`);
      snowflake.style.setProperty("--duration", `${14 + (index % 7) * 2}s`);
      snowflake.style.setProperty("--sway", `${3.6 + (index % 5) * 0.6}s`);
      snowflake.style.setProperty("--delay", `${-(index % 13)}s`);
      snowflake.style.setProperty("--drift", `${drift}px`);

      snowScene.appendChild(snowflake);
      extraSnowflakes.push(snowflake);
    }

    requestAnimationFrame(() => {
      extraSnowflakes.forEach((snowflake) => snowflake.classList.add("is-visible"));
    });
  }

  function softenExtraSnow() {
    extraSnowflakes.forEach((snowflake) => {
      snowflake.classList.remove("is-visible");
      snowflake.classList.add("is-fading");
    });
    window.setTimeout(() => {
      extraSnowflakes.splice(0).forEach((snowflake) => snowflake.remove());
    }, 1800);
  }

  function createGlobeSnow() {
    if (!globeSnow || globeSnow.childElementCount) return;
    for (let index = 0; index < 46; index += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty("--snow-x", `${8 + ((index * 37) % 84)}%`);
      particle.style.setProperty("--snow-y", `${8 + ((index * 23) % 80)}%`);
      particle.style.setProperty("--snow-size", `${3 + (index % 4)}px`);
      particle.style.setProperty("--snow-delay", `${-(index % 12) * 0.12}s`);
      particle.style.setProperty("--snow-duration", `${1.2 + (index % 6) * 0.16}s`);
      particle.style.setProperty("--drift", `${index % 2 ? 34 : -34}px`);
      globeSnow.appendChild(particle);
    }
  }

  function createSparkles() {
    if (!globeSparkles || globeSparkles.childElementCount) return;
    const positions = [
      [19, 28], [76, 25], [84, 49], [24, 61], [69, 71], [47, 18], [39, 74]
    ];
    positions.forEach(([x, y], index) => {
      const sparkle = document.createElement("i");
      sparkle.style.setProperty("--spark-x", `${x}%`);
      sparkle.style.setProperty("--spark-y", `${y}%`);
      sparkle.style.setProperty("--spark-delay", `${index * 0.17}s`);
      globeSparkles.appendChild(sparkle);
    });
  }

  function playGlassShake(shakeCount) {
    if (reduceMotion) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = 0.055;
      master.connect(context.destination);

      for (let index = 0; index < shakeCount * 4; index += 1) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.08;
        oscillator.type = index % 2 ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(650 + (index % 4) * 120, start);
        oscillator.frequency.exponentialRampToValueAtTime(390, start + 0.08);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + 0.1);
      }
      window.setTimeout(() => context.close().catch(() => {}), 2200);
    } catch (_error) {
      // เสียงเป็นเพียงส่วนเสริม หากเบราว์เซอร์ไม่อนุญาตยังคงเล่นภาพเคลื่อนไหวได้
    }
  }

  function resetGlobeForRank(rank) {
    globe?.classList.remove(
      "is-shaking",
      "is-swirling",
      "show-silhouette",
      "is-clearing",
      "is-card-launching",
      "is-prime",
      "is-resting",
      "rank-1",
      "rank-2",
      "rank-3",
      "shake-pass-1",
      "shake-pass-2",
      "shake-pass-3"
    );
    globe?.classList.add(`rank-${rank}`);
    if (rank === 1) globe?.classList.add("is-prime");
  }

  async function shakeGlobe(times, rank) {
    playGlassShake(times);

    for (let index = 0; index < times; index += 1) {
      globe.classList.remove("is-shaking", "shake-pass-1", "shake-pass-2", "shake-pass-3");
      void globe.offsetWidth;
      globe.classList.add("is-shaking", `shake-pass-${Math.min(index + 1, 3)}`);
      await wait(reduceMotion ? 20 : rank === 1 ? 760 : rank === 2 ? 700 : 640);
      globe.classList.remove("is-shaking");
      if (index < times - 1) await wait(reduceMotion ? 10 : 120);
    }
  }

  function animateCardScore(card, score) {
    const scoreElement = card.querySelector("[data-score-value]");
    const bar = card.querySelector("[data-score-bar]");
    if (!scoreElement || !bar) return;

    const target = Math.round(score);
    const duration = reduceMotion ? 1 : 760;
    const startedAt = performance.now();
    bar.style.width = `${target}%`;

    function update(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      scoreElement.textContent = `${Math.round(target * eased)}%`;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function resultCardMarkup(item, recommendationIndex) {
    const rank = recommendationIndex + 1;
    const name = recommendationName(item);
    const thaiName = recommendationThaiName(item);
    const score = recommendationScore(item);
    const image = recommendationImage(item, recommendationIndex);

    return `
      <article class="dog-podium-card dog-podium-card--rank-${rank}" data-rank="${rank}">
        <div class="dog-card-snow-burst" aria-hidden="true"></div>
        <span class="dog-podium-rank" aria-label="อันดับ ${rank}">${String(rank).padStart(2, "0")}</span>
        <div class="dog-podium-image">
          <img src="${escapeHTML(image)}" alt="สุนัขสายพันธุ์ ${escapeHTML(name)}" referrerpolicy="no-referrer">
        </div>
        <div class="dog-podium-content">
          <p>อันดับ ${rank}</p>
          <h2>${escapeHTML(name)}</h2>
          ${thaiName ? `<small class="dog-podium-thai-name">${escapeHTML(thaiName)}</small>` : ""}
          <div class="dog-podium-score">
            <span>ความเหมาะสม</span>
            <strong data-score-value>0%</strong>
          </div>
          <div class="dog-podium-track" aria-hidden="true"><span data-score-bar></span></div>
          <div class="dog-podium-actions">
            <a href="${detailUrl(item)}">ดูรายละเอียด</a>
            <a class="dog-podium-farm-link" href="${farmUrl(item)}">ค้นหาฟาร์มสายพันธุ์นี้</a>
          </div>
        </div>
      </article>`;
  }

  function createCardSnowBurst(card) {
    const burst = card.querySelector(".dog-card-snow-burst");
    if (!burst) return;
    for (let index = 0; index < 26; index += 1) {
      const particle = document.createElement("i");
      const angle = (360 / 26) * index;
      const distance = 52 + (index % 5) * 16;
      const radians = angle * Math.PI / 180;
      particle.style.setProperty("--burst-x", `${Math.cos(radians) * distance}px`);
      particle.style.setProperty("--burst-y", `${Math.sin(radians) * distance}px`);
      particle.style.setProperty("--burst-size", `${4 + (index % 4) * 2}px`);
      particle.style.setProperty("--burst-delay", `${(index % 6) * 0.025}s`);
      burst.appendChild(particle);
    }
    requestAnimationFrame(() => burst.classList.add("is-active"));
    window.setTimeout(() => burst.remove(), 1500);
  }

  function arrangeFinalPodium() {
    const cards = Array.from(topThreeCards.querySelectorAll(".dog-podium-card.is-visible"));
    const firstPositions = new Map(cards.map((card) => [card, card.getBoundingClientRect()]));
    topThreeCards.classList.add("is-final-layout");
    globeWrap.classList.add("is-lifted");
    if (reduceMotion) return;

    requestAnimationFrame(() => {
      cards.forEach((card) => {
        const first = firstPositions.get(card);
        const last = card.getBoundingClientRect();
        card.animate(
          [
            { transform: `translate3d(${first.left - last.left}px, ${first.top - last.top}px, 0)` },
            { transform: "translate3d(0, 0, 0)" }
          ],
          { duration: 820, easing: "cubic-bezier(.2,.75,.2,1)", fill: "both" }
        );
      });
    });
  }

  function applyImageFallback(card) {
    const image = card?.querySelector("img");
    if (!image) return;

    image.addEventListener("error", () => {
      const fallback = Array.isArray(window.DOGMATCH_DOG_BREEDS)
        ? window.DOGMATCH_DOG_BREEDS.find((row) => row.image_url)?.image_url
        : "";
      if (fallback && image.src !== fallback) image.src = fallback;
    }, { once: true });
  }

  function setCardScore(card, score) {
    const scoreElement = card?.querySelector("[data-score-value]");
    const bar = card?.querySelector("[data-score-bar]");
    const value = Math.round(score);
    if (scoreElement) scoreElement.textContent = `${value}%`;
    if (bar) bar.style.width = `${value}%`;
  }

  function createPopupCard(card) {
    const layer = document.createElement("div");
    const popup = card.cloneNode(true);

    layer.className = "dog-result-card-popup-layer dog-result-card-popup-layer--globe";
    layer.setAttribute("role", "presentation");

    popup.classList.remove("is-awaiting-slot", "is-visible", "is-docked");
    popup.classList.add("dog-result-card-popup");
    popup.setAttribute("aria-hidden", "true");
    popup.querySelectorAll("a, button").forEach((control) => {
      control.setAttribute("tabindex", "-1");
    });

    const rankValue = Number(popup.dataset.rank || card.dataset.rank || 0);
    const popupContent = popup.querySelector(".dog-podium-content");
    const popupActions = popup.querySelector(".dog-podium-actions");
    const popupRank = popup.querySelector(".dog-podium-rank");

    popup.classList.add("dog-result-card-popup--editorial");

    if (popupRank) {
      popupRank.textContent = `อันดับ ${rankValue}`;
      popupRank.setAttribute("aria-label", `ผลลัพธ์อันดับ ${rankValue}`);
    }

    if (popupContent) {
      const detailLabel = popupContent.querySelector("p");
      if (detailLabel) detailLabel.remove();

      const eyebrow = document.createElement("p");
      eyebrow.className = "dog-popup-eyebrow";
      eyebrow.textContent = rankValue === 1
        ? "เพื่อนที่เหมาะกับคุณที่สุด"
        : "เพื่อนที่เข้ากับไลฟ์สไตล์ของคุณ";

      const title = popupContent.querySelector("h2");
      if (title) {
        popupContent.insertBefore(eyebrow, title);
      } else {
        popupContent.prepend(eyebrow);
      }

      const oldPreviewText = popupContent.querySelector(".dog-popup-preview-text");
      if (oldPreviewText) oldPreviewText.remove();

      const previewText = document.createElement("p");
      previewText.className = "dog-popup-preview-text";
      previewText.textContent = "ผลลัพธ์นี้คำนวณจากคำตอบและรูปแบบการใช้ชีวิตของคุณ เพื่อช่วยให้เปรียบเทียบสายพันธุ์ที่เหมาะสมได้ง่ายขึ้น";

      if (popupActions) {
        popupContent.insertBefore(previewText, popupActions);
      } else {
        popupContent.appendChild(previewText);
      }
    }

    if (popupActions) {
      popupActions.innerHTML = "";
      const previewAction = document.createElement("div");
      previewAction.className = "dog-popup-preview-action";
      previewAction.innerHTML = rankValue === 1
        ? "<span>ดูผลลัพธ์ทั้ง 3 อันดับ</span><b aria-hidden=\"true\">→</b>"
        : "<span>เตรียมเปิดอันดับถัดไป</span><b aria-hidden=\"true\">→</b>";
      popupActions.appendChild(previewAction);
    }

    const oldBurst = popup.querySelector(".dog-card-snow-burst");
    if (oldBurst) oldBurst.innerHTML = "";

    const globeTarget =
      globe?.querySelector(".dog-globe-glass") ||
      globeWrap ||
      globe;

    layer.appendChild(popup);

    /*
     * Mount the popup inside the visible glass circle itself.
     * Its 50% / 50% position is therefore always the exact centre
     * of the Snow Globe and cannot drift because of viewport,
     * dialog, page zoom, scrolling or another transformed parent.
     */
    if (globeTarget) {
      globeTarget.classList.add("has-result-card-popup");
      globeTarget.appendChild(layer);
    } else {
      document.documentElement.appendChild(layer);
      layer.classList.add("dog-result-card-popup-layer--fallback");
    }

    applyImageFallback(popup);

    return {
      layer,
      popup,
      cleanup: () => {
        globeTarget?.classList.remove("has-result-card-popup");
      }
    };
  }

  async function showPopupThenDock(card, score) {
    const { layer, popup, cleanup } = createPopupCard(card);

    requestAnimationFrame(() => {
      layer.classList.add("is-visible");
      popup.classList.add("is-popup-visible");
      createCardSnowBurst(popup);
      animateCardScore(popup, score);
    });

    await wait(2000);
    setCardScore(card, score);

    /* Close the preview before showing the real card in its permanent slot.
       This avoids a browser animation getting stuck halfway over the globe. */
    popup.classList.remove("is-popup-visible");
    popup.classList.add("is-popup-leaving");
    layer.classList.add("is-closing");

    await wait(reduceMotion ? 20 : 280);

    if (typeof layer.close === "function" && layer.open) {
      layer.close();
    }
    cleanup?.();
    layer.remove();

    card.classList.remove("is-awaiting-slot");
    card.classList.add("is-visible", "is-docked");
    createCardSnowBurst(card);
    saveVisibleCardState();

    if (!reduceMotion) {
      await wait(80);
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }

  async function revealResultCard(item, recommendationIndex) {
    const rank = recommendationIndex + 1;
    const holder = document.createElement("div");
    holder.innerHTML = resultCardMarkup(item, recommendationIndex).trim();
    const card = holder.firstElementChild;
    card.classList.add("is-awaiting-slot");
    topThreeCards.appendChild(card);
    applyImageFallback(card);

    if (rank === 1) arrangeFinalPodium();

    globe.classList.add("is-card-launching");
    await wait(reduceMotion ? 10 : 40);
    await showPopupThenDock(card, recommendationScore(item));
    globe.classList.remove("is-card-launching");
  }

  function updateShakeButton() {
    const nextIndex = revealSequence[revealStep];
    const nextItem = recommendations[nextIndex];
    if (!nextItem) {
      hideElement(shakeButton);
      return;
    }
    const rank = nextIndex + 1;
    if (shakeButtonLabel) shakeButtonLabel.textContent = `เขย่าลูกแก้ว — เปิดอันดับ ${rank}`;
    if (rankLabel) rankLabel.textContent = `พร้อมเปิดอันดับ ${rank}`;
    setStatus(`กดปุ่มเพื่อเขย่าลูกแก้วและเปิดผลลัพธ์อันดับ ${rank}`);
    showElement(shakeButton);
    shakeButton.disabled = false;
  }

  async function revealCurrentRecommendation() {
    if (revealBusy || revealStep >= revealSequence.length) return;
    const recommendationIndex = revealSequence[revealStep];
    const item = recommendations[recommendationIndex];
    if (!item) {
      revealStep += 1;
      updateShakeButton();
      return;
    }

    revealBusy = true;
    shakeButton.disabled = true;
    const rank = recommendationIndex + 1;
    const shakeCount = rank === 1 ? 3 : rank === 2 ? 2 : 1;
    resetGlobeForRank(rank);

    if (rankLabel) rankLabel.textContent = `กำลังเปิดอันดับ ${rank}`;
    setStatus(`กำลังเขย่าลูกแก้ว ${shakeCount} ${shakeCount === 1 ? "ครั้ง" : "ครั้ง"}`);
    await shakeGlobe(shakeCount, rank);

    globe.classList.add("is-swirling");
    setStatus(rank === 1 ? "หิมะกำลังหมุนแรงขึ้นและเกิดประกาย" : "หิมะภายในลูกแก้วกำลังหมุน");
    await wait(reduceMotion ? 30 : rank === 1 ? 1250 : 980);

    globe.classList.add("show-silhouette");
    setStatus("เริ่มมองเห็นเงาของเพื่อนสุนัข");
    await wait(reduceMotion ? 30 : 880);

    globe.classList.add("is-clearing");
    setStatus("หิมะกำลังค่อย ๆ จางลง");
    await wait(reduceMotion ? 30 : 1180);

    setStatus(`พบการ์ด ${recommendationName(item)} อันดับ ${rank}`);
    await revealResultCard(item, recommendationIndex);

    revealStep += 1;
    revealBusy = false;

    if (revealStep < revealSequence.length) {
      const nextRank = revealSequence[revealStep] + 1;
      globe.classList.add("is-resting");
      setStatus(`เปิดอันดับ ${rank} แล้ว กดเขย่าอีกครั้งเพื่อเปิดอันดับ ${nextRank}`);
      if (shakeButtonLabel) shakeButtonLabel.textContent = `เขย่าลูกแก้ว — เปิดอันดับ ${nextRank}`;
      if (rankLabel) rankLabel.textContent = `พร้อมเปิดอันดับ ${nextRank}`;
      shakeButton.disabled = false;
    } else {
      hideElement(shakeButton);
      globe.classList.add("is-complete");
      revealStage.classList.add("is-complete");
      topThreeCards.classList.add("is-final-layout");
      if (rankLabel) rankLabel.textContent = "ผลลัพธ์ของคุณพร้อมแล้ว";
      setStatus("เพื่อนสุนัขทั้ง 3 อันดับของคุณพร้อมแล้ว");
      await wait(reduceMotion ? 30 : 620);
      showElement(finalActions);
      requestAnimationFrame(() => finalActions.classList.add("is-visible"));
      window.setTimeout(softenExtraSnow, 3000);
    }
  }

  async function startRevealExperience() {
    if (experienceStarted || !recommendations.length) return;
    experienceStarted = true;
    startButton.disabled = true;
    createGlobeSnow();
    createSparkles();
    createExtraSnow();

    intro.classList.add("is-leaving");
    revealStage.classList.add("is-starting");
    await wait(reduceMotion ? 20 : 430);
    hideElement(intro);
    showElement(experience);

    requestAnimationFrame(() => {
      experience.classList.add("is-visible");
      globeWrap.classList.add("is-visible");
    });

    await wait(reduceMotion ? 20 : 620);
    updateShakeButton();
  }

  function prepareManualGlobeReplay() {
    if (!recommendations.length) return;

    experienceStarted = true;
    revealBusy = false;
    revealStep = 0;

    hideElement(intro);
    showElement(revealStage);
    showElement(experience);
    hideElement(finalActions);

    revealStage.classList.remove(
      "is-complete",
      "is-saved-view",
      "is-starting"
    );
    experience.classList.add("is-visible");
    globeWrap?.classList.remove("is-lifted");
    globeWrap?.classList.add("is-visible");
    topThreeCards.innerHTML = "";
    topThreeCards.classList.remove("is-final-layout");

    createGlobeSnow();
    createSparkles();
    createExtraSnow();
    resetGlobeForRank(3);
    updateShakeButton();
  }

  function restoreSavedRevealState() {
    const savedState = readRevealState();
    if (!savedState?.revealed?.length) return false;

    const savedSet = new Set(savedState.revealed);
    topThreeCards.innerHTML = "";
    topThreeCards.classList.remove("is-final-layout");

    revealSequence.forEach((recommendationIndex) => {
      if (!savedSet.has(recommendationIndex)) return;

      const item = recommendations[recommendationIndex];
      if (!item) return;

      const holder = document.createElement("div");
      holder.innerHTML = resultCardMarkup(item, recommendationIndex).trim();
      const card = holder.firstElementChild;
      setCardScore(card, recommendationScore(item));
      card.classList.add("is-visible", "is-docked");
      topThreeCards.appendChild(card);
      applyImageFallback(card);
    });

    revealStep = revealSequence.filter((index) => savedSet.has(index)).length;

    if (savedState.complete || revealStep >= revealSequence.length) {
      revealStep = revealSequence.length;
      hideElement(shakeButton);
      globe.classList.add("is-complete");
      revealStage.classList.add("is-complete");
      topThreeCards.classList.add("is-final-layout");
      globeWrap.classList.add("is-lifted");

      if (rankLabel) rankLabel.textContent = "ผลลัพธ์ของคุณพร้อมแล้ว";
      setStatus("เพื่อนสุนัขทั้ง 3 อันดับของคุณพร้อมแล้ว");
      showElement(finalActions);
      finalActions.classList.add("is-visible");
    } else {
      resetGlobeForRank(revealSequence[revealStep] + 1);
      updateShakeButton();
    }

    return true;
  }

  function renderSavedPodium() {
    hideElement(intro);
    showElement(revealStage);
    showElement(experience);

    revealStage.classList.add("is-complete", "is-saved-view");
    experience.classList.add("is-visible");
    topThreeCards.innerHTML = "";
    topThreeCards.classList.add("is-final-layout");

    const title = experience.querySelector(".dog-globe-title h1");
    if (rankLabel) {
      rankLabel.textContent = historyMode
        ? "ผลแบบประเมินย้อนหลัง"
        : "ผลลัพธ์ที่บันทึกไว้";
    }
    if (title) title.textContent = "เพื่อนสุนัขที่เหมาะกับคุณ";

    recommendations.slice(0, 3).forEach((item, index) => {
      const holder = document.createElement("div");
      holder.innerHTML = resultCardMarkup(item, index).trim();
      const card = holder.firstElementChild;
      setCardScore(card, recommendationScore(item));
      card.classList.add("is-visible", "is-docked");
      topThreeCards.appendChild(card);
      applyImageFallback(card);
    });

    showElement(finalActions);
    finalActions.classList.add("is-visible");
  }

  function renderHistoryCards() {
    if (!recommendationGrid) return;

    recommendationGrid.innerHTML = recommendations
      .slice(0, 3)
      .map((item, index) => {
        const name = recommendationName(item);
        const score = recommendationScore(item);
        const breedId = recommendationBreedId(item);
        const description = recommendationDescription(item);

        return `
          <article class="recommendation-card rank-${index + 1}">
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
                <a href="./dog-detail.html?id=${breedId}">ดูรายละเอียด →</a>
                <a class="recommendation-card__map-link" href="${farmUrl(item)}">ค้นหาฟาร์ม</a>
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  async function fetchRecommendations() {
    if (!resultId) return [];
    const response = await fetch(
      `${API_BASE}/recommendations/${resultId}`,
      { cache: "no-store" }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || "ไม่สามารถโหลดผลลัพธ์ได้");
    }
    const data = payload.data || payload.recommendations || [];
    return Array.isArray(data) ? data : [];
  }

  async function loadResult() {
    storedResult = readStoredResult();

    if (!historyMode && storedResult?.recommendations?.length) {
      recommendations = storedResult.recommendations.slice(0, 3);
    } else if (resultId) {
      try {
        recommendations = (await fetchRecommendations()).slice(0, 3);
      } catch (error) {
        const message =
          error?.message === "Failed to fetch"
            ? "เชื่อมต่อ Backend ไม่ได้ กรุณาเปิด server แล้วลองใหม่"
            : error?.message || "ไม่สามารถโหลดผลลัพธ์ได้";
        showError(message);
        return;
      }
    }

    if (!recommendations.length) {
      showError("ไม่พบผลลัพธ์ กรุณาทำแบบประเมินใหม่");
      return;
    }

    hideElement(loading);
    hideElement(errorBox);

    /* เปิดเข้าหน้าผลลัพธ์แล้วแสดง Snow Globe พร้อมปุ่มเขย่าทันที
       ไม่แสดงหน้าข้อความเริ่มต้น และผู้ใช้ยังเล่นเปิดผลทีละอันดับได้
       ทั้งหลังทำแบบประเมินและเมื่อกลับมาจากหน้าประวัติ */
    prepareManualGlobeReplay();
    restoreSavedRevealState();
    markResultViewed();
  }

  startButton?.addEventListener("click", startRevealExperience);
  shakeButton?.addEventListener("click", revealCurrentRecommendation);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const targetUrl = new URL(link.href, window.location.href);
    const isHistoryDestination =
      targetUrl.pathname.endsWith("/dog-assessment-history.html") ||
      targetUrl.pathname.endsWith("dog-assessment-history.html");

    if (isHistoryDestination) {
      clearCurrentRevealState();
      return;
    }

    if (link.closest(".dog-podium-actions") || link.classList.contains("dog-podium-farm-link")) {
      saveVisibleCardState();
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || !recommendations.length) return;
    saveVisibleCardState();
  });

  loadResult();
})();
