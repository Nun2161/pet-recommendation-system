"use strict";

(() => {
  const API_ORIGIN = window.CATMATCH_API_ORIGIN || "http://localhost:3000";
  const API_BASE = window.CATMATCH_API_BASE || `${API_ORIGIN}/api`;
  const params = new URLSearchParams(location.search);
  const farmId = Number(params.get("id"));
  const species = params.get("species") === "dog" ? "dog" : "cat";

  const $ = (id) => document.getElementById(id);
  const loading = $("profileLoading");
  const errorBox = $("profileError");
  const content = $("profileContent");
  const modal = $("catModal");
  let animals = [];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function imageUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (url.startsWith("/uploads/")) return `${API_ORIGIN}${url}`;
    return url;
  }

  function ageLabel(value) {
    const months = Number(value);
    if (!Number.isFinite(months) || months < 0) return "ไม่ระบุอายุ";
    if (months < 12) return `${months} เดือน`;
    const years = Math.floor(months / 12);
    const remain = months % 12;
    return remain ? `${years} ปี ${remain} เดือน` : `${years} ปี`;
  }

  function genderLabel(value) {
    const gender = String(value || "").toLowerCase();
    if (gender === "male") return "เพศผู้";
    if (gender === "female") return "เพศเมีย";
    return "ไม่ระบุเพศ";
  }

  function address(farm) {
    return [farm.address, farm.subdistrict, farm.district, farm.province, farm.country].filter(Boolean).join(" ") || "ยังไม่ได้ระบุที่อยู่";
  }

  function externalUrl(value) {
    if (!value) return "";
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  function phoneHref(farm) {
    const value = `${farm.phone_country || ""}${farm.phone || ""}`.replace(/[^+\d]/g, "");
    return value ? `tel:${value}` : "";
  }

  function renderFarm(farm) {
    document.title = `${farm.farm_name || "โปรไฟล์ฟาร์ม"} — CatMatch`;
    $("farmName").textContent = farm.farm_name || "ฟาร์มแมว";
    $("farmAddress").textContent = address(farm);
    $("farmDescription").textContent = farm.description || "ฟาร์มยังไม่ได้เพิ่มรายละเอียดเพิ่มเติม";

    const profileImage = imageUrl(farm.profile_image);
    const image = $("farmProfileImage");
    const fallback = $("farmProfileFallback");
    if (profileImage) {
      image.src = profileImage;
      image.alt = `รูปโปรไฟล์ ${farm.farm_name || "ฟาร์ม"}`;
      image.hidden = false;
      fallback.hidden = true;
      image.onerror = () => { image.hidden = true; fallback.hidden = false; };
    }

    const phone = phoneHref(farm);
    const directions = Number.isFinite(Number(farm.latitude)) && Number.isFinite(Number(farm.longitude))
      ? `https://www.google.com/maps/dir/?api=1&destination=${farm.latitude},${farm.longitude}` : "";
    const breedName = String(params.get("breed_name") || "").trim();
    const chatUrl = `./chat.html?start=farm&farm_id=${encodeURIComponent(farm.farm_id || farmId)}&species=${species}${breedName ? `&breed_name=${encodeURIComponent(breedName)}` : ""}`;
    $("farmActions").innerHTML = [
      `<a class="action action--primary" href="${chatUrl}">💬 แชทกับฟาร์ม</a>`,
      phone ? `<a class="action" href="${phone}">☎ โทรหาฟาร์ม</a>` : "",
      farm.facebook ? `<a class="action" href="${escapeHTML(externalUrl(farm.facebook))}" target="_blank" rel="noopener">Facebook</a>` : "",
      farm.website ? `<a class="action" href="${escapeHTML(externalUrl(farm.website))}" target="_blank" rel="noopener">เว็บไซต์</a>` : "",
      directions ? `<a class="action" href="${directions}" target="_blank" rel="noopener">⌖ นำทาง</a>` : ""
    ].filter(Boolean).join("");

    const info = [
      ["ผู้ดูแลฟาร์ม", farm.owner_name],
      ["จังหวัด", farm.province],
      ["อำเภอ/เขต", farm.district],
      ["โทรศัพท์", farm.phone ? `${farm.phone_country || ""} ${farm.phone}`.trim() : ""],
      ["อีเมล", farm.email],
      ["Line", farm.line_contact]
    ].filter(([,value]) => value);
    $("farmInfo").innerHTML = info.map(([label,value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join("") || "<p>ยังไม่มีข้อมูลติดต่อเพิ่มเติม</p>";

    animals = Array.isArray(farm.animals) ? farm.animals.filter((animal) => String(animal.status || "").toLowerCase() === "available") : [];
    $("animalCount").textContent = `${animals.length} ตัว`;
    $("animalGrid").innerHTML = animals.length ? animals.map((animal, index) => {
      const photo = imageUrl(animal.image_url);
      return `<button class="animal-card" type="button" data-animal-index="${index}">
        <span class="animal-card__photo">${photo ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(animal.animal_name || "รูปแมว")}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>🐱</span>` : "<span>🐱</span>"}</span>
        <span class="animal-card__body"><strong>${escapeHTML(animal.animal_name || "แมวในฟาร์ม")}</strong><small>${escapeHTML(animal.breed_name || "ไม่ระบุสายพันธุ์")}</small><em>${escapeHTML(ageLabel(animal.age_months))} · ${escapeHTML(genderLabel(animal.gender))}</em><b>ดูรายละเอียด →</b></span>
      </button>`;
    }).join("") : `<div class="empty-animals">ขณะนี้ฟาร์มยังไม่มีแมวที่พร้อมติดต่อ</div>`;

    content.hidden = false;
  }

  function openAnimal(index) {
    const animal = animals[index];
    if (!animal) return;
    const photo = imageUrl(animal.image_url);
    $("catModalName").textContent = animal.animal_name || "แมวในฟาร์ม";
    $("catModalBreed").textContent = animal.breed_name || "ไม่ระบุสายพันธุ์";
    $("catModalMeta").innerHTML = [ageLabel(animal.age_months), genderLabel(animal.gender), animal.color ? `สี ${animal.color}` : "", "พร้อมติดต่อ"].filter(Boolean).map((x) => `<span>${escapeHTML(x)}</span>`).join("");
    $("catModalDescription").textContent = animal.description || "ฟาร์มยังไม่ได้เพิ่มรายละเอียดเพิ่มเติมของแมวตัวนี้";
    const chat = $("catModalChat");
    if (chat) {
      const chatParams = new URLSearchParams({
        start: "farm",
        farm_id: String(farmId),
        animal_id: String(animal.animal_id),
        species,
      });
      chat.href = `./chat.html?${chatParams.toString()}`;
    }
    const image = $("catModalImage");
    const fallback = $("catModalFallback");
    if (photo) { image.src = photo; image.hidden = false; fallback.hidden = true; image.onerror = () => { image.hidden = true; fallback.hidden = false; }; }
    else { image.removeAttribute("src"); image.hidden = true; fallback.hidden = false; }
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  async function init() {
    if (!Number.isInteger(farmId) || farmId <= 0) {
      loading.hidden = true; errorBox.hidden = false; errorBox.textContent = "ไม่พบรหัสฟาร์ม กรุณากลับไปเลือกฟาร์มจากหน้าแผนที่"; return;
    }
    try {
      const response = await fetch(`${API_BASE}/farms/${farmId}?species=${species}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || "โหลดข้อมูลฟาร์มไม่สำเร็จ");
      loading.hidden = true;
      renderFarm(payload.data);
    } catch (error) {
      loading.hidden = true; errorBox.hidden = false; errorBox.textContent = error.message || "ไม่สามารถโหลดโปรไฟล์ฟาร์มได้";
    }
  }

  document.addEventListener("click", (event) => {
    const card = event.target.closest("[data-animal-index]");
    if (card) openAnimal(Number(card.dataset.animalIndex));
    if (event.target.closest("[data-close-modal]")) closeModal();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
  init();
})();
