"use strict";

const API_BASE_URL = window.CATMATCH_API_URL;
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
    careNotes: Array.isArray(knowledge.careNotes) ? knowledge.careNotes : [],
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
    lifeSpan: (() => {
      const supplied = String(raw.lifeSpan ?? raw.life_span ?? "").trim();
      if (supplied && supplied !== "ไม่ระบุ") return supplied;
      return String(
        window.CATMATCH_CAT_LIFE_SPANS?.[databaseName]
        ?? window.CATMATCH_CAT_LIFE_SPANS?.[name]
        ?? "12-18"
      );
    })(),
    temperament: String(raw.temperament ?? "")
  };
}


function formatLifeSpan(value, fallback = "12-18") {
  const supplied = String(value || "").trim();
  const source = supplied && supplied !== "ไม่ระบุ" ? supplied : fallback;
  const cleaned = String(source)
    .replace(/years?|yrs?/gi, "")
    .replace(/\bto\b/gi, "-")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .trim();
  return `${cleaned || fallback} ปี`;
}

function renderDetail(breed) {
  document.title = `${breed.name} — CatMatch`;

  setText("detailBreedName", breed.name);
  setText("detailThaiName", breed.thaiName || "ชื่อสายพันธุ์สากล");
  setText("detailDescription", createRichDescription(breed));
  setText("detailOrigin", breed.origin);
  setText("detailCoat", breed.coatLabel);
  setText("detailActivity", activityText(breed.activity));
  setText("detailLifeSpan", formatLifeSpan(breed.lifeSpan));

const tags = document.getElementById("detailTags");

if (tags) {
  tags.innerHTML = buildTags(breed)
    .map(
      (tag) => `
        <a
          class="trait-tag detail-trait-tag"
          data-tag="${escapeHTML(tag.key)}"
          href="./cat-breeds.html?tag=${encodeURIComponent(tag.key)}"
          title="ดูสายพันธุ์ที่มีคุณสมบัติ ${escapeHTML(tag.label)}"
        >
          ${escapeHTML(tag.label)}
          <span class="tag-arrow" aria-hidden="true">›</span>
        </a>
      `
    )
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

  const features = createAppearancePoints(breed);

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

  const generated = createBreedSpecificCare(breed);
  const custom = breed.careNotes.length ? breed.careNotes : [];
  const notes = [...custom, ...generated].slice(0, 6);
  const titles = [
    "เวลาและกิจกรรมที่ต้องจัดให้",
    "การดูแลขน ผิวหนัง และความสะอาด",
    "สภาพบ้านและพื้นที่ที่เหมาะสม",
    "การอยู่ร่วมกับคน เด็ก และสัตว์อื่น",
    "ค่าใช้จ่ายและการเตรียมอุปกรณ์",
    "สุขภาพที่ควรถามผู้เพาะพันธุ์"
  ];

  careGrid.innerHTML = notes.map((body, index) => `
    <article class="care-card">
      <strong>${escapeHTML(titles[index] || "สิ่งที่ควรเตรียม")}</strong>
      <span>${escapeHTML(body)}</span>
    </article>`).join("");
}

function renderTraits(breed) {
  const traitGrid = document.getElementById("traitDetailGrid");
  if (!traitGrid) return;

  const groups = [
    {
      title: "บุคลิกและการเข้าสังคม",
      description:
        "แสดงแนวโน้มการเข้าหาคน การเล่น การเรียนรู้ และการปรับตัวของสายพันธุ์",
      items: [
        ["ความเป็นมิตร", breed.friendly],
        ["ความชอบปฏิสัมพันธ์กับคน", breed.affectionate],
        ["ความชอบเล่น", breed.playful],
        ["ความเป็นอิสระ", breed.independence],
        ["ความสามารถในการฝึก", breed.trainability],
        ["พฤติกรรมปกป้องพื้นที่", breed.protective],
        ["ความสามารถในการปรับตัว", breed.adaptability],
        ["การเข้าสังคม", breed.sociability]
      ]
    },
    {
      title: "กิจกรรมและความเหมาะสมกับที่อยู่อาศัย",
      description:
        "ช่วยประเมินว่ารูปแบบชีวิต พื้นที่ และสมาชิกในบ้านเหมาะกับสายพันธุ์หรือไม่",
      items: [
        ["ระดับกิจกรรม", breed.activity],
        ["ความต้องการออกกำลังกาย", breed.exercise],
        ["ความชอบพื้นที่ภายนอก", breed.outdoor],
        ["ความเหมาะสมกับพื้นที่จำกัด", breed.apartment],
        ["ความเหมาะสมกับครอบครัว", breed.family],
        ["ความเหมาะสมกับเด็ก", breed.child],
        ["ความเหมาะสมสำหรับผู้เลี้ยงครั้งแรก", breed.firstTime]
      ]
    },
    {
      title: "การดูแลและสภาพแวดล้อม",
      description:
        "ค่าที่สูงในหัวข้อการดูแล หมายถึงต้องเตรียมเวลาและการดูแลมากขึ้น",
      items: [
        ["ความต้องการดูแลขน", breed.grooming],
        ["ระดับการผลัดขน", breed.shedding],
        ["แนวโน้มการส่งเสียง", breed.noise],
        ["การทนต่ออากาศร้อน", breed.heat],
        ["การทนต่ออากาศหนาว", breed.cold]
      ]
    }
  ];

  traitGrid.innerHTML = groups
    .map((group) => {
      const traitItems = group.items
        .map(([label, value]) => {
          const safeValue = Math.min(
            5,
            Math.max(1, Math.round(Number(value) || 1))
          );

          const segments = Array.from(
            { length: 5 },
            (_, index) => `
              <i class="${index < safeValue ? "is-active" : ""}"></i>
            `
          ).join("");

          return `
            <div
              class="trait-detail-row"
              aria-label="${escapeHTML(label)} ${escapeHTML(
                scoreLabel(safeValue)
              )}"
            >
              <span>${escapeHTML(label)}</span>

              <div
                class="trait-level-meter"
                role="img"
                aria-label="${escapeHTML(label)} ${escapeHTML(
                  scoreLabel(safeValue)
                )}"
              >
                ${segments}
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <section class="trait-group">
          <div class="trait-group-heading">
            <h3>${escapeHTML(group.title)}</h3>
            <p>${escapeHTML(group.description)}</p>
          </div>

          <div class="trait-group-grid">
            ${traitItems}
          </div>
        </section>
      `;
    })
    .join("");
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
    setText("detailLifeSpan", formatLifeSpan(breed.lifeSpan));
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
  return createAppearancePoints(breed);
}

function createObserveSummary(breed) {
  return `เวลาแยก ${breed.name} ให้ดูพร้อมกัน 4 จุด ได้แก่ รูปศีรษะและใบหู สัดส่วนลำตัว รูปหาง และชนิดขน อย่าตัดสินจากสีเพียงอย่างเดียว เพราะหลายสายพันธุ์มีสีหรือลายคล้ายกันได้`;
}

function createAppearancePoints(breed) {
  const source = breed.features || [];
  const headHint = source.find((item) => /ศีรษะ|หน้า|หู|ตา/.test(item));
  const bodyHint = source.find((item) => /ลำตัว|อก|ขา|กล้าม|สัดส่วน/.test(item));
  const tailHint = source.find((item) => /หาง/.test(item));
  const coatHint = source.find((item) => /ขน|ลาย|ผิว/.test(item));

  return [
    headHint || `ศีรษะและใบหูของ ${breed.name}: ดูรูปหน้า แนวแก้ม ขนาดและตำแหน่งใบหู รวมถึงรูปดวงตาร่วมกัน ไม่ควรใช้จุดใดจุดหนึ่งตัดสิน`,
    bodyHint || `สัดส่วนลำตัว: ${bodyShapeText(breed)} ควรดูแนวหลัง ความยาวขา ความกว้างอก และมวลกล้ามเนื้อจากภาพด้านข้าง`,
    tailHint || `รูปหาง: ดูความยาว โคนหาง ปลายหาง และความฟูให้สัมพันธ์กับลำตัว เพราะหางช่วยแยกสายพันธุ์ที่หน้าคล้ายกันได้`,
    coatHint || `ชนิดขน: ${breed.coatLabel} ให้ดูความยาว ความแน่น พื้นผิว และทิศทางของเส้นขน โดยใช้สีหรือลายเป็นข้อมูลประกอบเท่านั้น`
  ];
}

function bodyShapeText(breed) {
  if (breed.activity >= 4 && breed.exercise >= 4) return "มักดูเพรียว แข็งแรง และคล่องตัว";
  if (breed.activity <= 2) return "มักดูแน่น สมส่วน และเคลื่อนไหวสุขุม";
  return "มีสัดส่วนปานกลาง สมดุลระหว่างความแน่นและความคล่องตัว";
}

function createBreedSpecificCare(breed) {
  const activity = breed.activity >= 4
    ? `${breed.name} มีพลังงานค่อนข้างสูง ควรแบ่งเวลาเล่นอย่างจริงจังทุกวัน พร้อมของเล่นล่าเหยื่อ ชั้นปีน และกิจกรรมแก้เบื่อ`
    : breed.activity <= 2
      ? `${breed.name} ค่อนข้างสงบ แต่ยังต้องมีช่วงเล่นสั้น ๆ สม่ำเสมอ เพื่อควบคุมน้ำหนักและลดความเครียดจากการอยู่นิ่งนาน`
      : `${breed.name} ต้องการกิจกรรมระดับปานกลาง ควรมีเวลาเล่นทุกวันและสลับของเล่นเพื่อรักษาความสนใจ`;

  const grooming = coatCareText(breed);
  const home = breed.apartment >= 4
    ? `เลี้ยงในคอนโดได้เมื่อมีพื้นที่แนวตั้ง จุดหลบพัก กระบะทรายสะอาด และควบคุมประตูหน้าต่างให้ปลอดภัย`
    : `ควรมีพื้นที่เคลื่อนไหวมากกว่าห้องแคบ จัดชั้นปีนหลายระดับและจุดพักแยกจากบริเวณที่มีเสียงดัง`;

  const social = breed.child >= 4 && breed.family >= 4
    ? `โดยทั่วไปเหมาะกับครอบครัว แต่เด็กควรเรียนรู้วิธีอุ้มและเล่นอย่างนุ่มนวล พร้อมให้แมวมีมุมถอยหนีเมื่อไม่ต้องการปฏิสัมพันธ์`
    : breed.independence >= 4
      ? `มีความเป็นอิสระสูง ควรเคารพพื้นที่ส่วนตัวและไม่บังคับอุ้ม การแนะนำคนหรือสัตว์ใหม่ควรทำทีละขั้น`
      : `ควรแนะนำสมาชิกในบ้านและสัตว์ตัวอื่นอย่างค่อยเป็นค่อยไป สังเกตภาษากายและแยกพื้นที่ในช่วงแรก`;

  const budget = breed.grooming >= 4
    ? `เตรียมงบสำหรับหวีคุณภาพดี อุปกรณ์แก้ขนพัน การอาบหรือกรูมมิ่งเป็นระยะ รวมถึงอาหารและตรวจสุขภาพประจำปี`
    : `เตรียมงบสำหรับอาหารคุณภาพดี กระบะทราย ที่ลับเล็บ ของเล่น วัคซีน และการตรวจสุขภาพประจำปี แม้ขนดูแลง่ายก็ยังมีค่าใช้จ่ายต่อเนื่อง`;

  const health = healthQuestionText(breed);
  return [activity, grooming, home, social, budget, health];
}

function healthQuestionText(breed) {
  const name = breed.name.toLowerCase();
  if (/persian|exotic|himalayan/.test(name)) return `ควรถามผลตรวจสุขภาพพ่อแม่พันธุ์ โดยเฉพาะโรคไตถุงน้ำ ปัญหาระบบหายใจ ดวงตา และโครงสร้างใบหน้า`;
  if (/maine coon|ragdoll|british|sphynx/.test(name)) return `ควรถามผลคัดกรองโรคหัวใจ HCM ของพ่อแม่พันธุ์ รวมถึงประวัติข้อสะโพกและสุขภาพประจำสายเลือด`;
  if (/bengal/.test(name)) return `ควรถามผลตรวจ PRA-b, ภาวะขาดเอนไซม์ PK และการคัดกรองหัวใจของพ่อแม่พันธุ์`;
  if (/abyssinian|somali/.test(name)) return `ควรถามผลตรวจภาวะขาดเอนไซม์ PK และโรคจอประสาทตาเสื่อม รวมถึงประวัติสุขภาพของสายเลือด`;
  if (/scottish fold/.test(name)) return `ควรถามเรื่องยีนหูพับและการตรวจโครงกระดูก หลีกเลี่ยงการผสมหูพับกับหูพับเพราะเพิ่มความเสี่ยงโรคกระดูกอ่อน`;
  if (/manx|cymric/.test(name)) return `ควรถามประวัติปัญหากระดูกสันหลัง การขับถ่าย และการเดินของลูกแมว เนื่องจากลักษณะหางสั้นสัมพันธ์กับโครงสร้างกระดูก`;
  return `ควรถามใบตรวจสุขภาพ วัคซีน การถ่ายพยาธิ ประวัติพ่อแม่พันธุ์ และโรคพันธุกรรมที่ผู้เพาะพันธุ์คัดกรองสำหรับ ${breed.name}`;
}

function scoreLabel(value) {
  if (value <= 1) return "น้อยมาก";
  if (value === 2) return "น้อย";
  if (value === 3) return "ปานกลาง";
  if (value === 4) return "มาก";
  return "มากเป็นพิเศษ";
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

function calmnessScore(breed) {
  const activityCalm = 6 - breed.activity;
  const quietness = 6 - breed.noise;
  const playCalm = 6 - breed.playful;

  const calculated =
    activityCalm * 0.4 +
    quietness * 0.3 +
    playCalm * 0.15 +
    breed.adaptability * 0.1 +
    breed.independence * 0.05;

  return Math.min(5, Math.max(1, calculated));
}

function getCoatTagKey(coat) {
  const coatTagMap = {
    short: "coat-short",
    medium: "coat-medium",
    long: "coat-long",
    curly: "coat-curly",
    hairless: "coat-hairless"
  };

  return coatTagMap[coat] || "coat-short";
}

function getDetailCalmScore(breed) {
  const activityCalm = 6 - breed.activity;
  const quietness = 6 - breed.noise;
  const playCalm = 6 - breed.playful;

  const calculated =
    activityCalm * 0.4 +
    quietness * 0.3 +
    playCalm * 0.15 +
    breed.adaptability * 0.1 +
    breed.independence * 0.05;

  return Math.min(5, Math.max(1, calculated));
}
function getTraitTagKey(label) {
  const tagMap = {
    "เข้ากับคนง่าย": "friendly",
    "เป็นมิตร": "friendly",

    "ชอบปฏิสัมพันธ์": "affectionate",
    "ติดคน": "affectionate",

    "ชอบกิจกรรม": "active",
    "ขี้เล่น": "active",
    "พลังงานสูง": "active",

    "บุคลิกสุขุม": "calm",
    "รักสงบ": "calm",

    "มีความเป็นอิสระ": "independent",
    "รักอิสระ": "independent",

    "เหมาะกับพื้นที่จำกัด": "apartment",
    "เหมาะกับคอนโด": "apartment",

    "เหมาะกับครอบครัว": "family",

    "เข้ากับเด็กได้ดี": "child-friendly",

    "เหมาะสำหรับผู้เลี้ยงครั้งแรก": "first-time",
    "เหมาะกับมือใหม่": "first-time",

    "ดูแลขนไม่ซับซ้อน": "low-grooming",
    "ดูแลง่าย": "low-grooming"
  };

  if (tagMap[label]) {
    return tagMap[label];
  }

  const text = String(label || "");

  if (text.includes("ไม่มีขน")) {
    return "coat-hairless";
  }

  if (text.includes("หยิก") || text.includes("ลอน")) {
    return "coat-curly";
  }

  if (text.includes("ปานกลาง") || text.includes("กึ่งยาว")) {
    return "coat-medium";
  }

  if (text.includes("ยาว")) {
    return "coat-long";
  }

  if (text.includes("สั้น")) {
    return "coat-short";
  }

  return "default";
}
function buildTags(breed) {
  const tags = [
    {
      label: breed.coatLabel,
      key: getCoatTagKey(breed.coat)
    }
  ];

  if (breed.friendly >= 4) {
    tags.push({
      label: "เข้ากับคนง่าย",
      key: "friendly"
    });
  }

  if (breed.affectionate >= 4) {
    tags.push({
      label: "ชอบปฏิสัมพันธ์",
      key: "affectionate"
    });
  }

  if (
    breed.playful >= 4 ||
    breed.activity >= 4 ||
    breed.exercise >= 4
  ) {
    tags.push({
      label: "ชอบกิจกรรม",
      key: "active"
    });
  }

  if (
    getDetailCalmScore(breed) >= 3.1 &&
    breed.activity <= 3 &&
    breed.noise <= 3
  ) {
    tags.push({
      label: "บุคลิกสุขุม",
      key: "calm"
    });
  }

  if (breed.independence >= 4) {
    tags.push({
      label: "มีความเป็นอิสระ",
      key: "independent"
    });
  }

  if (breed.apartment >= 4) {
    tags.push({
      label: "เหมาะกับพื้นที่จำกัด",
      key: "apartment"
    });
  }

  if (
    breed.family >= 4 &&
    breed.friendly >= 3
  ) {
    tags.push({
      label: "เหมาะกับครอบครัว",
      key: "family"
    });
  }

  if (
    breed.child >= 4 &&
    breed.friendly >= 4
  ) {
    tags.push({
      label: "เข้ากับเด็กได้ดี",
      key: "child-friendly"
    });
  }

  if (breed.firstTime >= 4) {
    tags.push({
      label: "เหมาะสำหรับผู้เลี้ยงครั้งแรก",
      key: "first-time"
    });
  }

  if (
    breed.grooming <= 2 &&
    breed.shedding <= 3
  ) {
    tags.push({
      label: "ดูแลขนไม่ซับซ้อน",
      key: "low-grooming"
    });
  }

  /*
   * ลบแท็กที่ซ้ำกัน และจำกัดไม่เกิน 8 แท็ก
   * เพื่อไม่ให้หน้ารายละเอียดดูรก
   */
  return tags
    .filter(
      (tag, index, allTags) =>
        allTags.findIndex((item) => item.key === tag.key) === index
    )
    .slice(0, 8);
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
  if (value <= 2) {
    return "ต้องการกิจกรรมน้อย";
  }

  if (value >= 4) {
    return "ต้องการกิจกรรมเป็นประจำ";
  }

  return "ต้องการกิจกรรมพอเหมาะ";
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
