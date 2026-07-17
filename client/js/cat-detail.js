"use strict";

const API_BASE_URL = "http://localhost:3000/api";
let currentBreed = null;

window.addEventListener("DOMContentLoaded", initDetailPage);

async function initDetailPage() {
  try {
    setupHeader();

    const fallback = document.getElementById("pageFallback");
    const id = Number(new URLSearchParams(window.location.search).get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      if (fallback) {
        fallback.innerHTML = `
          <strong>กำลังพาไปหน้าสายพันธุ์แมว…</strong>
          <span><a href="./cat-breeds.html">กดที่นี่เมื่อหน้าไม่เปลี่ยน</a></span>`;
      }
      window.setTimeout(() => window.location.replace("./cat-breeds.html"), 120);
      return;
    }

    // อ่านจาก session/local ก่อนเพื่อให้หน้าแสดงทันทีและไม่กลายเป็นหน้าขาว
    let raw = readStoredBreed(id) || findFallbackBreed(id);

    // Backend เป็นข้อมูลเสริมเท่านั้น ไม่บล็อกหน้า
    if (!raw) raw = await fetchBreedByIdWithTimeout(id, 2500);

    if (!raw) {
      showError("ไม่พบข้อมูลสายพันธุ์รหัสนี้");
      return;
    }

    currentBreed = normalizeBreed(raw, id);
    renderDetail(currentBreed);

    if (fallback) fallback.hidden = true;

    // เติมรูปจาก resolver เฉพาะเมื่อข้อมูล Knowledge ไม่มีรูป
    if (!currentBreed.image) {
      resolveFallbackImage(currentBreed).catch((error) => {
        console.info("โหลดรูปสำรองไม่สำเร็จ:", error?.message || error);
        showImageUnavailable(currentBreed.name);
      });
    }
  } catch (error) {
    console.error("Cat detail initialization error:", error);
    showError("หน้าเกิดข้อผิดพลาด แต่ยังสามารถกลับไปหน้าสายพันธุ์แมวได้");
  }
}

function setupHeader() {
  const header = document.getElementById("siteHeader");
  const toggle = document.getElementById("menuToggle");

  toggle?.addEventListener("click", () => {
    const open = header?.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(Boolean(open)));
  });

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

function readStoredBreed(id) {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem("catmatch_selected_breed") || "null"
    );
    return stored && Number(stored.id ?? stored.breed_id) === id
      ? stored
      : null;
  } catch {
    return null;
  }
}

function findFallbackBreed(id) {
  const rows = Array.isArray(window.CATMATCH_CAT_BREEDS)
    ? window.CATMATCH_CAT_BREEDS
    : [];
  return rows.find((row) => Number(row.breed_id ?? row.id) === id) || null;
}

async function fetchBreedByIdWithTimeout(id, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/breeds?limit=100`, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const rows = extractRows(payload);
    return rows.find((row) => Number(row.breed_id ?? row.id) === id) || null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.breeds)) return payload.breeds;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function normalizeBreed(raw, fallbackId) {
  const id = Number(raw.breed_id ?? raw.id ?? fallbackId);
  const knowledge = window.CatMatchBreedKnowledge?.get?.(id) || {};
  const databaseName = String(
    raw.breed_name ?? raw.name ?? `สายพันธุ์ ${id}`
  ).trim();
  const name = String(knowledge.officialName || databaseName).trim();
  const coatLabel = window.CatMatchBreedKnowledge?.coatLabel?.(id, name)
    || coatText(normalizeCoat(raw.coat ?? raw.coat_length ?? raw.coat_type ?? inferCoatFromName(name)));

  return {
    id,
    name,
    databaseName,
    thaiName: String(
      raw.thaiName ?? raw.thai_name ?? raw.breed_name_th ?? raw.thai_breed_name ?? ""
    ),
    origin: String(knowledge.origin || raw.origin || raw.country_of_origin || "ไม่ระบุ"),
    description: String(raw.description ?? raw.breed_description ?? ""),
    coat: normalizeCoat(raw.coat ?? raw.coat_length ?? raw.coat_type ?? coatLabel),
    coatLabel,
    image: String(knowledge.image || knowledge.thumbnail || raw.image || ""),
    thumbnail: String(knowledge.thumbnail || knowledge.image || raw.thumbnail || ""),
    sourceUrl: String(knowledge.sourceUrl || raw.sourceUrl || ""),
    referenceImageId: String(raw.referenceImageId || ""),
    imageSource: knowledge.image || knowledge.thumbnail ? "knowledge" : String(raw.imageSource || "none"),
    features: Array.isArray(knowledge.features) ? knowledge.features : [],
    comparisons: Array.isArray(knowledge.comparisons) ? knowledge.comparisons : [],
    friendly: score(raw.friendly, 3),
    affectionate: score(raw.affectionate ?? raw.affection, 3),
    playful: score(raw.playful, 3),
    independence: score(raw.independence, 3),
    trainability: score(raw.trainability, 3),
    protective: score(raw.protective, 3),
    adaptability: score(raw.adaptability, 3),
    sociability: score(raw.sociability, 3),
    activity: score(raw.activity ?? raw.activity_level ?? raw.energy_level, 3),
    exercise: score(raw.exercise ?? raw.exercise_need, 3),
    outdoor: score(raw.outdoor ?? raw.outdoor_preference, 3),
    apartment: score(raw.apartment ?? raw.apartment_suitability, 3),
    family: score(raw.family ?? raw.family_friendly, 3),
    child: score(raw.child ?? raw.child_friendly, 3),
    firstTime: score(raw.firstTime ?? raw.first_time_owner_friendly, 3),
    grooming: score(raw.grooming ?? raw.grooming_need ?? raw.care_need, 3),
    shedding: score(raw.shedding ?? raw.shedding_level, 3),
    noise: score(raw.noise ?? raw.noise_level, 3),
    heat: score(raw.heat ?? raw.heat_tolerance, 3),
    cold: score(raw.cold ?? raw.cold_tolerance, 3),
    lifeSpan: String(raw.lifeSpan ?? raw.life_span ?? ""),
    temperament: String(raw.temperament ?? "")
  };
}

function renderDetail(breed) {
  document.title = `${breed.name} — CatMatch`;

  setText("detailBreedName", breed.name);
  setText("detailThaiName", breed.thaiName || "ชื่อสายพันธุ์สากล");
  setText("detailDescription", createRichDescription(breed));
  setText("detailOrigin", breed.origin);
  setText("detailCoat", breed.coatLabel);
  setText("detailActivity", activityText(breed.activity));
  setText(
    "detailLifeSpan",
    breed.lifeSpan && breed.lifeSpan !== "ไม่ระบุ"
      ? `${breed.lifeSpan} ปี`
      : "ไม่ระบุ"
  );

  const tags = document.getElementById("detailTags");
  if (tags) {
    tags.innerHTML = buildTags(breed)
      .map((tag) => `<span>${escapeHTML(tag)}</span>`)
      .join("");
  }

  renderFeatures(breed);
  renderComparisons(breed);
  renderCare(breed);
  renderTraits(breed);
  setupFavoriteButton(breed.id);

  if (breed.image) setupImage(breed);
  else showImageUnavailable(breed.name);

  const loading = document.getElementById("detailLoading");
  const detail = document.getElementById("breedDetail");
  if (loading) loading.hidden = true;
  if (detail) detail.hidden = false;
}

function renderFeatures(breed) {
  const featureList = document.getElementById("featureList");
  const summary = document.getElementById("observeSummary");

  const features = breed.features.length
    ? breed.features
    : createFallbackFeatures(breed);

  if (featureList) {
    featureList.innerHTML = features.map((item, index) => `
      <article>
        <span>${String(index + 1).padStart(2, "0")}</span>
        <p>${escapeHTML(item)}</p>
      </article>`).join("");
  }

  if (summary) summary.textContent = createObserveSummary(breed);
}

function renderComparisons(breed) {
  const section = document.getElementById("similarBreedSection");
  const grid = document.getElementById("similarBreedGrid");
  if (!section || !grid) return;

  if (!breed.comparisons.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  grid.innerHTML = breed.comparisons.map((comparison) => {
    const comparisonId = Number(comparison.id);
    const raw = findFallbackBreed(comparisonId);
    const knowledge = window.CatMatchBreedKnowledge?.get?.(comparisonId) || {};
    const name = String(
      knowledge.officialName || raw?.breed_name || raw?.name || `สายพันธุ์ ${comparisonId}`
    );
    const imageUrl = String(
      knowledge.image || knowledge.thumbnail || window.CatMatchBreedKnowledge?.placeholder || ""
    );

    return `
      <article class="similar-card">
        <img
          src="${escapeHTML(imageUrl)}"
          data-breed-id="${comparisonId}"
          data-image-stage="full"
          alt="ภาพอ้างอิงแมวสายพันธุ์ ${escapeHTML(name)}"
          loading="lazy"
          onerror="window.CatMatchBreedImages.repairImageElement(this)">
        <div>
          <p class="compare-label">คล้ายกันแต่คนละสายพันธุ์</p>
          <h3>${escapeHTML(name)}</h3>
          <p>${escapeHTML(comparison.difference)}</p>
          <a href="./cat_detail.html?id=${comparisonId}">
            เปิดดู ${escapeHTML(name)} →
          </a>
        </div>
      </article>`;
  }).join("");
}

function renderCare(breed) {
  const careGrid = document.getElementById("careGrid");
  if (!careGrid) return;

  const cards = [
    ["นิสัยโดยรวม", temperamentText(breed)],
    ["พื้นที่และกิจกรรม", spaceText(breed)],
    ["การดูแลขนและผิวหนัง", coatCareText(breed)],
    ["เหมาะกับผู้เลี้ยง", ownerText(breed)]
  ];

  careGrid.innerHTML = cards.map(([title, body]) => `
    <article class="care-card">
      <strong>${escapeHTML(title)}</strong>
      <span>${escapeHTML(body)}</span>
    </article>`).join("");
}

function renderTraits(breed) {
  const traitGrid = document.getElementById("traitDetailGrid");
  if (!traitGrid) return;

  const traits = [
    ["ความเป็นมิตร", breed.friendly],
    ["ความติดคน", breed.affectionate],
    ["ความขี้เล่น", breed.playful],
    ["ความเป็นอิสระ", breed.independence],
    ["ความสามารถในการฝึก", breed.trainability],
    ["การปรับตัว", breed.adaptability],
    ["ระดับกิจกรรม", breed.activity],
    ["ความต้องการออกกำลัง", breed.exercise],
    ["เหมาะกับคอนโด", breed.apartment],
    ["เหมาะกับครอบครัว", breed.family],
    ["เหมาะกับเด็ก", breed.child],
    ["เหมาะกับมือใหม่", breed.firstTime],
    ["ความต้องการดูแลขน", breed.grooming],
    ["ระดับการผลัดขน", breed.shedding],
    ["ระดับเสียง", breed.noise],
    ["ทนต่ออากาศร้อน", breed.heat],
    ["ทนต่ออากาศหนาว", breed.cold]
  ];

  traitGrid.innerHTML = traits.map(([label, value]) => `
    <div class="trait-detail-row trait-row">
      <span>${escapeHTML(label)}</span>
      <div class="trait-detail-track"><i class="trait-detail-fill" style="width:${value * 20}%"></i></div>
      <strong>${value}/5</strong>
    </div>`).join("");
}

function setupImage(breed) {
  const image = document.getElementById("detailBreedImage");
  const frame = document.getElementById("detailImageFrame");
  const placeholder = document.getElementById("detailImagePlaceholder");
  const note = document.getElementById("imageSourceNote");

  if (!image || !frame) return;

  image.hidden = false;
  image.alt = `ภาพอ้างอิงแมวสายพันธุ์ ${breed.name}`;
  image.dataset.breedId = String(breed.id);
  image.dataset.referenceImageId = breed.referenceImageId || "";
  image.dataset.imageStage = "full";
  image.onload = () => {
    image.hidden = false;
    frame.classList.add("image-ready");
    frame.classList.remove("image-unavailable");
    if (placeholder) placeholder.hidden = true;
  };
  image.onerror = () => {
    window.CatMatchBreedImages?.repairImageElement?.(image);
  };
  image.src = breed.image;

  if (note) {
    if (breed.sourceUrl) {
      note.innerHTML = `ภาพอ้างอิงสายพันธุ์จาก <a href="${escapeHTML(breed.sourceUrl)}" target="_blank" rel="noopener noreferrer">แหล่งข้อมูลสายพันธุ์</a> — ตรวจชนิดขนและรหัสสายพันธุ์ก่อนนำมาแสดง`;
    } else {
      note.textContent = "รูปถูกจับคู่ตามรหัสและชื่อสายพันธุ์";
    }
  }
}

async function resolveFallbackImage(breed) {
  const resolver = window.CatMatchBreedImages;
  if (!resolver?.matchBreed) {
    showImageUnavailable(breed.name);
    return;
  }

  const match = await resolver.matchBreed(breed);
  if (!match?.matched || !match.imageUrl) {
    showImageUnavailable(breed.name);
    return;
  }

  breed.image = match.imageUrl;
  breed.thumbnail = match.thumbnail || match.imageUrl;
  breed.referenceImageId = match.referenceImageId || "";
  breed.sourceUrl = breed.sourceUrl || match.sourceUrl || "";
  breed.imageSource = match.source || "fallback";

  if (breed.origin === "ไม่ระบุ" && match.metadata?.origin) {
    breed.origin = String(match.metadata.origin);
    setText("detailOrigin", breed.origin);
  }

  if (!breed.lifeSpan && match.metadata?.life_span) {
    breed.lifeSpan = String(match.metadata.life_span);
    setText("detailLifeSpan", `${breed.lifeSpan} ปี`);
  }

  setupImage(breed);
}

function showImageUnavailable(name) {
  const image = document.getElementById("detailBreedImage");
  const frame = document.getElementById("detailImageFrame");
  const placeholder = document.getElementById("detailImagePlaceholder");
  const note = document.getElementById("imageSourceNote");

  if (image) image.hidden = true;
  frame?.classList.remove("image-ready");
  frame?.classList.add("image-unavailable");

  if (placeholder) {
    placeholder.hidden = false;
    const label = placeholder.querySelector("span");
    if (label) label.textContent = `ยังไม่มีรูปที่ยืนยันว่าเป็น ${name}`;
  }

  if (note) {
    note.textContent = "ระบบไม่ใช้รูปสุ่มหรือรูปสายพันธุ์อื่นแทน เพื่อป้องกันข้อมูลผิด";
  }
}

function createRichDescription(breed) {
  const featureOne = breed.features[0] || "มีรูปทรงและพื้นผิวขนที่เป็นเอกลักษณ์ของสายพันธุ์";
  const featureTwo = breed.features[1] || "ควรสังเกตศีรษะ ใบหู ลำตัว และหางร่วมกัน";
  const featureThree = breed.features[2] || "ควรดูภาพหลายมุมเพื่อเห็นสัดส่วนของร่างกายได้ชัดเจน";

  return `${breed.name} มีจุดเด่นภายนอกที่ควรรู้ ได้แก่ ${featureOne}, ${featureTwo} และ ${featureThree} เคล็ดลับในการสังเกตคือดูรูปศีรษะ ใบหู แนวลำตัว หาง และพื้นผิวขนประกอบกันจากหลายมุม เพราะสีหรือลายเพียงอย่างเดียวอาจใกล้เคียงกับสายพันธุ์อื่นได้`;
}

function createFallbackFeatures(breed) {
  return [
    `ลักษณะขน: ${breed.coatLabel}`,
    `ระดับกิจกรรมโดยรวม: ${activityText(breed.activity)}`,
    "ควรตรวจรูปศีรษะ ใบหู สัดส่วนลำตัว และหางร่วมกัน"
  ];
}

function createObserveSummary(breed) {
  return `เวลาแยก ${breed.name} ให้ดูพร้อมกัน 4 จุด ได้แก่ รูปศีรษะและใบหู สัดส่วนลำตัว รูปหาง และชนิดขน อย่าตัดสินจากสีเพียงอย่างเดียว เพราะหลายสายพันธุ์มีสีหรือลายคล้ายกันได้`;
}

function temperamentText(breed) {
  if (breed.temperament) return breed.temperament;
  if (breed.affectionate >= 4 && breed.playful >= 4) {
    return "มักติดคนและชอบเล่น ควรมีเวลาโต้ตอบและของเล่นเปลี่ยนรูปแบบเป็นประจำ";
  }
  if (breed.independence >= 4) {
    return "มีความเป็นอิสระพอสมควร แต่ยังต้องมีพื้นที่ปลอดภัยและกิจกรรมกระตุ้นสมอง";
  }
  return "นิสัยอยู่ระดับปานกลาง ควรดูบุคลิกของแมวรายตัวร่วมกับข้อมูลสายพันธุ์";
}

function spaceText(breed) {
  return breed.activity >= 4
    ? "พลังงานสูง ควรมีพื้นที่แนวตั้ง ชั้นปีน และเวลาเล่นทุกวัน"
    : "กิจกรรมปานกลางถึงสงบ จัดมุมพัก ที่ลับเล็บ และการเล่นสั้น ๆ แต่สม่ำเสมอ";
}

function coatCareText(breed) {
  if (breed.coat === "hairless") {
    return "ต้องดูแลผิว เช็ดความมัน รักษาอุณหภูมิ และป้องกันแดด แม้ไม่มีขนก็ไม่ได้แปลว่าดูแลง่าย";
  }
  if (breed.coat === "curly") {
    return "ขนหยิกหรือขนลอนควรใช้วิธีแปรงที่ไม่ดึงลอนแรงเกินไป พร้อมตรวจผิวหนังเป็นระยะ";
  }
  if (breed.grooming >= 4 || ["long", "medium"].includes(breed.coat)) {
    return "ควรหวีขนอย่างสม่ำเสมอ โดยเฉพาะบริเวณคอ ท้อง ขาหลัง และหาง เพื่อลดการพันกัน";
  }
  return "ขนค่อนข้างดูแลง่าย แต่ควรแปรงเพื่อเก็บขนหลุดและตรวจผิวหนังเป็นประจำ";
}

function ownerText(breed) {
  return breed.firstTime >= 4
    ? "เหมาะกับมือใหม่ได้เมื่อเตรียมเวลา งบประมาณ และสภาพแวดล้อมตามความต้องการของสายพันธุ์"
    : "เหมาะกับผู้ที่ศึกษาพฤติกรรมและพร้อมจัดกิจกรรมหรือการดูแลเฉพาะด้านอย่างต่อเนื่อง";
}

function buildTags(breed) {
  const tags = [breed.coatLabel];
  if (breed.friendly >= 4) tags.push("เป็นมิตร");
  if (breed.affectionate >= 4) tags.push("ติดคน");
  if (breed.playful >= 4) tags.push("ขี้เล่น");
  if (breed.activity >= 4) tags.push("พลังงานสูง");
  if (breed.apartment >= 4) tags.push("เหมาะกับคอนโด");
  if (breed.family >= 4) tags.push("เหมาะกับครอบครัว");
  if (breed.firstTime >= 4) tags.push("เหมาะกับมือใหม่");
  if (breed.grooming <= 2) tags.push("ดูแลง่าย");
  return [...new Set(tags)].slice(0, 7);
}

function setupFavoriteButton(id) {
  const button = document.getElementById("favoriteDetailButton");
  if (!button) return;

  const favorites = loadFavoriteSet();

  const updateButton = () => {
    const active = favorites.has(id);
    button.textContent = active
      ? "บันทึกในรายการโปรดแล้ว"
      : "บันทึกเป็นรายการโปรด";
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-saved", active);
  };

  button.addEventListener("click", () => {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);

    try {
      localStorage.setItem(
        "catmatch_favorite_breeds",
        JSON.stringify([...favorites])
      );
    } catch {
      // ปุ่มยังเปลี่ยนสถานะได้แม้ localStorage ใช้ไม่ได้
    }

    updateButton();
  });

  updateButton();
}

function loadFavoriteSet() {
  try {
    const values = JSON.parse(
      localStorage.getItem("catmatch_favorite_breeds") || "[]"
    );
    return new Set(
      Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : []
    );
  } catch {
    return new Set();
  }
}

function showError(message = "ไม่พบข้อมูลสายพันธุ์นี้") {
  const fallback = document.getElementById("pageFallback");
  const loading = document.getElementById("detailLoading");
  const detail = document.getElementById("breedDetail");
  const errorBox = document.getElementById("detailError");

  if (fallback) fallback.hidden = true;
  if (loading) loading.hidden = true;
  if (detail) detail.hidden = true;

  if (errorBox) {
    errorBox.hidden = false;
    const title = errorBox.querySelector("h1");
    if (title) title.textContent = message;
  }
}

function inferCoatFromName(name) {
  const text = String(name || "").toLowerCase();
  if (["sphynx", "donskoy", "peterbald"].some((item) => text.includes(item))) {
    return "hairless";
  }
  if (text.includes("wirehair") || text.includes("rex")) return "curly";
  if (
    text.includes("longhair") ||
    ["somali", "birman", "ragdoll", "cymric", "himalayan", "maine coon", "persian", "siberian"]
      .some((item) => text.includes(item))
  ) {
    return "long";
  }
  return "short";
}

function normalizeCoat(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("hairless") || text.includes("ไม่มีขน")) return "hairless";
  if (text.includes("wire") || text.includes("rex") || text.includes("หยิก") || text.includes("ลอน")) return "curly";
  if (text.includes("long") || text.includes("ยาว")) return "long";
  if (text.includes("medium") || text.includes("ปานกลาง") || text.includes("กึ่งยาว")) return "medium";
  return "short";
}

function coatText(coat) {
  return ({
    short: "ขนสั้น",
    medium: "ขนปานกลาง",
    long: "ขนยาว",
    curly: "ขนหยิกหรือขนลอน",
    hairless: "ไม่มีขนหรือมีขนอ่อนมาก"
  })[coat] || "ไม่ระบุ";
}

function activityText(value) {
  if (value <= 2) return "ค่อนข้างสงบ";
  if (value >= 4) return "กระฉับกระเฉง";
  return "ปานกลาง";
}

function score(value, fallback = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(5, Math.max(1, Math.round(number)));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}
