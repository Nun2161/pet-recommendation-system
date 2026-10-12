"use strict";

(() => {
  const API_BASE = window.CATMATCH_API_URL;
  const localRows = Array.isArray(window.DOGMATCH_DOG_BREEDS) ? window.DOGMATCH_DOG_BREEDS : [];
  const fallback = window.DOGMATCH_DOG_FALLBACK || "";
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  const TRAIT_GROUPS = [
    {
      title: "บุคลิกและการเข้าสังคม",
      description: "แสดงแนวโน้มการเข้าหาคน การเล่น การเรียนรู้ และการปรับตัวของสายพันธุ์",
      rows: [
        ["friendly", "ความเป็นมิตร"], ["affectionate", "ความชอบปฏิสัมพันธ์กับคน"], ["playful", "ความชอบเล่น"],
        ["independence", "ความเป็นอิสระ"], ["trainability", "ความสามารถในการฝึก"], ["protective", "พฤติกรรมปกป้องพื้นที่"],
        ["adaptability", "ความสามารถในการปรับตัว"], ["sociability", "การเข้าสังคม"]
      ]
    },
    {
      title: "กิจกรรมและความเหมาะสมกับที่อยู่อาศัย",
      description: "ช่วยประเมินว่ารูปแบบชีวิต พื้นที่ และสมาชิกในบ้านเหมาะกับสายพันธุ์หรือไม่",
      rows: [
        ["activity_level", "ระดับกิจกรรม"], ["exercise_need", "ความต้องการออกกำลังกาย"], ["outdoor_preference", "ความชอบพื้นที่ภายนอก"],
        ["apartment_suitability", "ความเหมาะสมกับพื้นที่จำกัด"], ["family_friendly", "ความเหมาะสมกับครอบครัว"], ["child_friendly", "ความเหมาะสมกับเด็ก"],
        ["first_time_owner_friendly", "ความเหมาะสมสำหรับผู้เลี้ยงครั้งแรก"]
      ]
    },
    {
      title: "การดูแลและสภาพแวดล้อม",
      description: "ค่าที่สูงในหัวข้อการดูแล หมายถึงต้องเตรียมเวลาและการดูแลมากขึ้น",
      rows: [
        ["grooming_need", "ความต้องการดูแลขน"], ["shedding_level", "ระดับการผลัดขน"], ["noise_level", "แนวโน้มการส่งเสียง"],
        ["heat_tolerance", "การทนต่ออากาศร้อน"], ["cold_tolerance", "การทนต่ออากาศหนาว"]
      ]
    }
  ];
  const TAG_RULES = [
    { key: "friendly-high", label: "เข้ากับคนง่าย", match: (row) => row.friendly >= 4 },
    { key: "friendly-low", label: "ต้องใช้เวลาทำความคุ้นเคย", match: (row) => row.friendly <= 2 },
    { key: "affectionate-high", label: "ชอบปฏิสัมพันธ์", match: (row) => row.affectionate >= 4 },
    { key: "playful-high", label: "ชอบเล่น", match: (row) => row.playful >= 4 },
    { key: "independent-high", label: "มีความเป็นอิสระ", match: (row) => row.independence >= 4 },
    { key: "trainable-high", label: "ฝึกได้ดี", match: (row) => row.trainability >= 4 },
    { key: "training-patience", label: "ต้องฝึกอย่างสม่ำเสมอ", match: (row) => row.trainability <= 2 },
    { key: "protective-high", label: "มีแนวโน้มปกป้อง", match: (row) => row.protective >= 4 },
    { key: "adaptable-high", label: "ปรับตัวเก่ง", match: (row) => row.adaptability >= 4 },
    { key: "social-high", label: "เข้าสังคมได้ดี", match: (row) => row.sociability >= 4 },
    { key: "active-high", label: "ชอบกิจกรรม", match: (row) => row.activity_level >= 4 },
    { key: "calm-low", label: "ค่อนข้างสงบ", match: (row) => row.activity_level <= 2 },
    { key: "exercise-high", label: "ต้องออกกำลังกายมาก", match: (row) => row.exercise_need >= 4 },
    { key: "exercise-low", label: "ออกกำลังกายไม่มาก", match: (row) => row.exercise_need <= 2 },
    { key: "outdoor-high", label: "ชอบพื้นที่กลางแจ้ง", match: (row) => row.outdoor_preference >= 4 },
    { key: "apartment-high", label: "เหมาะกับพื้นที่จำกัด", match: (row) => row.apartment_suitability >= 4 },
    { key: "family-high", label: "เหมาะกับครอบครัว", match: (row) => row.family_friendly >= 4 },
    { key: "child-high", label: "เข้ากับเด็กได้ดี", match: (row) => row.child_friendly >= 4 },
    { key: "beginner-high", label: "เหมาะกับผู้เลี้ยงครั้งแรก", match: (row) => row.first_time_owner_friendly >= 4 },
    { key: "grooming-low", label: "ดูแลขนไม่ซับซ้อน", match: (row) => row.grooming_need <= 2 },
    { key: "grooming-high", label: "ต้องดูแลขนสม่ำเสมอ", match: (row) => row.grooming_need >= 4 },
    { key: "shedding-low", label: "ผลัดขนน้อย", match: (row) => row.shedding_level <= 2 },
    { key: "shedding-high", label: "ผลัดขนมาก", match: (row) => row.shedding_level >= 4 },
    { key: "quiet-low", label: "ค่อนข้างเงียบ", match: (row) => row.noise_level <= 2 },
    { key: "vocal-high", label: "ชอบส่งเสียง", match: (row) => row.noise_level >= 4 },
    { key: "heat-high", label: "ทนร้อนได้ดี", match: (row) => row.heat_tolerance >= 4 },
    { key: "cold-high", label: "ทนหนาวได้ดี", match: (row) => row.cold_tolerance >= 4 },
  ];
  const BREED_FAMILY_GROUPS = [
    {
      key: "long-haired-sighthounds",
      label: "สุนัขล่าเหยื่อด้วยสายตาขนยาว",
      description: "อยู่ในกลุ่ม Sighthound ใกล้เคียงกัน โดยพิจารณาจากตระกูลและรูปแบบการใช้งานของสายพันธุ์",
      breeds: ["Afghan Hound", "Saluki", "Borzoi"]
    },
    {
      key: "sighthounds",
      label: "สุนัขล่าเหยื่อด้วยสายตา",
      description: "อยู่ในกลุ่ม Sighthound ที่พัฒนามาเพื่อมองเห็นและไล่ตามเหยื่อ",
      breeds: ["Greyhound", "Whippet", "Irish Wolfhound", "Borzoi", "Saluki", "Afghan Hound"]
    },
    {
      key: "northern-sled-dogs",
      label: "สุนัขกลุ่มนอร์ดิกและสุนัขลากเลื่อน",
      description: "เป็นสุนัขกลุ่มเหนือที่มีประวัติการทำงานในสภาพอากาศหนาวและการเดินทางระยะไกล",
      breeds: ["Alaskan Malamute", "Siberian Husky", "Samoyed"]
    },
    {
      key: "asian-spitz",
      label: "สุนัขสปิตซ์และสายพันธุ์เอเชียดั้งเดิม",
      description: "มีพื้นฐานเป็นสุนัขสปิตซ์หรือสายพันธุ์ดั้งเดิมของเอเชียที่มีโครงสร้างและลักษณะพื้นฐานใกล้เคียงกัน",
      breeds: ["Shiba Inu", "Akita Inu", "Chow Chow", "Thai Bangkaew", "Shar Pei"]
    },
    {
      key: "primitive-dogs",
      label: "สุนัขสายพันธุ์ดั้งเดิม",
      description: "เป็นสายพันธุ์ดั้งเดิมที่คงลักษณะพื้นฐานและความเป็นอิสระไว้ค่อนข้างมาก",
      breeds: ["Basenji", "Thai Ridgeback", "Shiba Inu", "Akita Inu"]
    },
    {
      key: "retrievers-water-dogs",
      label: "สุนัขรีทรีฟเวอร์และสุนัขทำงานทางน้ำ",
      description: "อยู่ในกลุ่มสุนัขทำงานเก็บสิ่งของหรือทำงานใกล้น้ำ ซึ่งมีพื้นฐานการใช้งานสัมพันธ์กัน",
      breeds: ["Golden Retriever", "Labrador Retriever", "Newfoundland", "Portuguese Water Dog", "Standard Poodle"]
    },
    {
      key: "poodles",
      label: "สุนัขตระกูลพุดเดิล",
      description: "เป็นสุนัขในตระกูลพุดเดิลหรือมีรูปแบบขนและการทำงานทางน้ำใกล้เคียงกัน",
      breeds: ["Toy Poodle", "Standard Poodle", "Portuguese Water Dog", "Bichon Frise"]
    },
    {
      key: "collie-herding",
      label: "สุนัขตระกูลคอลลี่และสุนัขต้อนฝูง",
      description: "พัฒนามาเพื่อการต้อนและควบคุมฝูงสัตว์ จึงมีพื้นฐานการทำงานและการตอบสนองต่อผู้ดูแลใกล้เคียงกัน",
      breeds: ["Border Collie", "Collie (Rough Collie)", "Shetland Sheepdog", "Australian Shepherd", "Old English Sheepdog", "Cardigan Welsh Corgi"]
    },
    {
      key: "shepherd-working",
      label: "สุนัขต้อนและสุนัขทำงาน",
      description: "เป็นสุนัขทำงานที่พัฒนามาเพื่อการควบคุมฝูง การเฝ้าระวัง หรือการทำงานร่วมกับผู้ดูแล",
      breeds: ["German Shepherd", "Belgian Malinois", "Australian Shepherd", "Border Collie"]
    },
    {
      key: "scent-hounds",
      label: "สุนัขล่าเหยื่อด้วยกลิ่น",
      description: "อยู่ในกลุ่ม Scent Hound ซึ่งใช้การดมกลิ่นเป็นหลักในการติดตามร่องรอย",
      breeds: ["Beagle", "Basset Hound", "Bloodhound", "Dachshund"]
    },
    {
      key: "small-terriers",
      label: "สุนัขเทอร์เรียขนาดเล็ก",
      description: "อยู่ในกลุ่มเทอร์เรียที่พัฒนามาเพื่อค้นหา ไล่ หรือควบคุมสัตว์ขนาดเล็ก",
      breeds: ["Jack Russell Terrier", "West Highland White Terrier", "Yorkshire Terrier", "Miniature Schnauzer"]
    },
    {
      key: "bull-terriers",
      label: "สุนัขกลุ่มบูลและเทอร์เรีย",
      description: "มีพื้นฐานจากสายบูลด็อกและเทอร์เรีย หรืออยู่ในกลุ่มสายพันธุ์ที่พัฒนาจากสายดังกล่าว",
      breeds: ["Bull Terrier", "Staffordshire Bull Terrier", "American Bully", "Boston Terrier"]
    },
    {
      key: "bulldogs",
      label: "สุนัขตระกูลบูลด็อก",
      description: "มีพื้นฐานสายบูลด็อกหรือมีประวัติการพัฒนาสายพันธุ์เกี่ยวข้องกับบูลด็อก",
      breeds: ["English Bulldog", "French Bulldog", "Boston Terrier", "Boxer", "American Bully"]
    },
    {
      key: "mastiff-molossers",
      label: "สุนัขตระกูลมาสทิฟฟ์และโมลอสเซอร์",
      description: "เป็นสุนัขโครงสร้างใหญ่ในกลุ่ม Molosser ซึ่งมีพื้นฐานการเฝ้าระวัง ปกป้อง หรือทำงานหนัก",
      breeds: ["Mastiff", "Cane Corso", "Rottweiler", "Great Dane", "Tibetan Mastiff", "Boxer"]
    },
    {
      key: "mountain-guardians",
      label: "สุนัขภูเขาและสุนัขอารักขาฝูงสัตว์",
      description: "เป็นสุนัขขนาดใหญ่ที่พัฒนามาเพื่อทำงานในภูเขา การช่วยเหลือ หรือการอารักขาฝูงสัตว์",
      breeds: ["Bernese Mountain Dog", "Saint Bernard", "Newfoundland", "Great Pyrenees", "Tibetan Mastiff"]
    },
    {
      key: "tibetan-companions",
      label: "สุนัขตระกูลทิเบตและสุนัขวัง",
      description: "เป็นสายพันธุ์สุนัขคู่กายจากทิเบตหรือจีนที่มีประวัติและลักษณะพื้นฐานใกล้เคียงกัน",
      breeds: ["Shih Tzu", "Lhasa Apso", "Pekingese"]
    },
    {
      key: "bichon-companions",
      label: "สุนัขคู่กายตระกูลบิชอง",
      description: "อยู่ในกลุ่มสุนัขคู่กายขนาดเล็กที่มีประวัติสายพันธุ์และลักษณะขนใกล้เคียงกัน",
      breeds: ["Maltese", "Bichon Frise", "Toy Poodle"]
    },
    {
      key: "toy-companions",
      label: "สุนัขคู่กายขนาดเล็ก",
      description: "เป็นสุนัขคู่กายขนาดเล็กที่ถูกพัฒนาเพื่ออยู่ใกล้ชิดมนุษย์เป็นหลัก",
      breeds: ["Chihuahua", "Papillon", "Pomeranian", "Maltese", "Pug", "Cavalier King Charles Spaniel"]
    },
    {
      key: "toy-spaniels",
      label: "สุนัขสแปเนียลและสุนัขคู่กาย",
      description: "เป็นสุนัขคู่กายที่มีพื้นฐานจากสายสแปเนียลหรือมีประวัติการพัฒนาสายพันธุ์ใกล้เคียงกัน",
      breeds: ["Cavalier King Charles Spaniel", "Papillon", "Cocker Spaniel"]
    },
    {
      key: "spaniels-setters",
      label: "สุนัขล่านกและสุนัขกีฬา",
      description: "อยู่ในกลุ่มสุนัขกีฬาที่พัฒนามาเพื่อค้นหา ชี้ หรือเก็บนกและสัตว์ปีก",
      breeds: ["Cocker Spaniel", "Irish Setter", "Weimaraner", "Golden Retriever", "Labrador Retriever"]
    },
    {
      key: "pinscher-schnauzer",
      label: "สุนัขตระกูลพินเชอร์และชเนาเซอร์",
      description: "อยู่ในกลุ่ม Pinscher และ Schnauzer หรือมีพื้นฐานการพัฒนาสายพันธุ์สัมพันธ์กัน",
      breeds: ["Miniature Pinscher", "Doberman Pinscher", "Miniature Schnauzer"]
    },
    {
      key: "chinese-breeds",
      label: "สุนัขสายพันธุ์จีนดั้งเดิม",
      description: "เป็นสายพันธุ์จากจีนที่มีประวัติยาวนานและมีรากทางภูมิภาคใกล้เคียงกัน",
      breeds: ["Chow Chow", "Shar Pei", "Pekingese", "Pug", "Shih Tzu"]
    },
    {
      key: "giant-athletic-dogs",
      label: "สุนัขขนาดใหญ่และสุนัขทำงานเชิงกีฬา",
      description: "เป็นสุนัขโครงสร้างใหญ่ที่มีประวัติการทำงานและการเคลื่อนไหวสูง",
      breeds: ["Great Dane", "Irish Wolfhound", "Greyhound", "Weimaraner", "Dalmatian"]
    }
  ];
  const score = (value, fallbackValue = 3) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallbackValue;
    return Math.max(1, Math.min(5, parsed));
  };
  const escapeHTML = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const getToken = () =>
    window.DogMatchShared?.getToken?.() ||
    sessionStorage.getItem("catmatch_token") ||
    localStorage.getItem("catmatch_token") ||
    sessionStorage.getItem("userToken") ||
    localStorage.getItem("userToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    "";
  const DOG_FAVORITES_STORAGE_PREFIX = "dogmatch_favorite_dogs_v1";
  const DOG_FAVORITES_SHARED_KEY = "dogmatch_favorite_dogs_v2";
  const DOG_FAVORITE_RECORDS_SHARED_KEY = "dogmatch_favorite_dog_records_v2";

  function readStoredJSON(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch (_error) {
      return null;
    }
  }

  function collectStoredDogUsers() {
    const users = [];
    [sessionStorage, localStorage].forEach((storage) => {
      ["catmatch_user", "user"].forEach((key) => {
        const value = readStoredJSON(storage, key);
        if (value && typeof value === "object") users.push(value);
      });
    });
    return users;
  }

  function getStoredUser() {
    return collectStoredDogUsers()[0] || null;
  }

  function dogFavoriteStorageKeys() {
    const identifiers = collectStoredDogUsers()
      .flatMap((user) => [user.firebase_uid, user.uid, user.user_id, user.id, user.email, user.username])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    const unique = [...new Set(identifiers)];
    return [
      DOG_FAVORITES_SHARED_KEY,
      ...unique.map((id) => `${DOG_FAVORITES_STORAGE_PREFIX}:${id}`),
      ...unique.map((id) => `${DOG_FAVORITES_SHARED_KEY}:${id}`)
    ];
  }

  function readDogFavoriteIds() {
    const merged = new Set();
    const keys = new Set(dogFavoriteStorageKeys());
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(`${DOG_FAVORITES_STORAGE_PREFIX}:`)) keys.add(key);
    }
    [localStorage, sessionStorage].forEach((storage) => {
      keys.forEach((key) => {
        try {
          const value = JSON.parse(storage.getItem(key) || "[]");
          (Array.isArray(value) ? value : value?.ids || [])
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
            .forEach((id) => merged.add(id));
        } catch (_error) {}
      });
    });
    return merged;
  }

  function writeDogFavoriteIds(ids) {
    const normalized = [...ids].map(Number).filter((id) => Number.isInteger(id) && id > 0)
      .sort((first, second) => first - second);
    const value = JSON.stringify([...new Set(normalized)]);
    dogFavoriteStorageKeys().forEach((key) => {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
    });
  }

  function persistDogFavoriteRecord(breedId, isFavorite) {
    let records = {};
    try { records = JSON.parse(localStorage.getItem(DOG_FAVORITE_RECORDS_SHARED_KEY) || "{}") || {}; }
    catch (_error) {}
    if (!isFavorite) {
      delete records[String(breedId)];
    } else {
      const breed = current || {};
      records[String(breedId)] = {
        breed_id: breedId,
        breed_name: String(breed.breed_name || `สุนัขสายพันธุ์ ${breedId}`),
        thai_name: String(breed.thai_name || ""),
        image_url: String(breed.image_url || fallback || ""),
        description: String(breed.description || ""),
        favorited_at: new Date().toISOString()
      };
    }
    const value = JSON.stringify(records);
    localStorage.setItem(DOG_FAVORITE_RECORDS_SHARED_KEY, value);
    sessionStorage.setItem(DOG_FAVORITE_RECORDS_SHARED_KEY, value);
  }

  let current = null;
  let favorite = false;

  function numberText(value) {
    return String(score(value));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function normalize(row, fallbackId = 0) {
    return {
      ...row,
      breed_id: Number(row.breed_id || row.id || row.source_order || fallbackId),
      breed_name: String(row.breed_name || row.name || `สายพันธุ์ ${fallbackId}`).trim(),
      thai_name: String(row.thai_name || row.breed_name_th || row.thai_breed_name || "").trim(),
      image_url: String(row.image_url || row.image || fallback),
      description: String(row.description || ""),
      origin: String(row.origin || "ไม่ระบุ"),
      historic_role: String(row.historic_role || "").trim(),
      life_span: (() => {
        const supplied = String(row.life_span || row.lifeSpan || "").trim();
        if (supplied && supplied !== "ไม่ระบุ") return supplied;
        const breedName = String(row.breed_name || row.name || "").trim();
        return String(window.DOGMATCH_DOG_LIFE_SPANS?.[breedName] || "10-14");
      })(),
      friendly: score(row.friendly), affectionate: score(row.affectionate), playful: score(row.playful),
      independence: score(row.independence), trainability: score(row.trainability), protective: score(row.protective),
      adaptability: score(row.adaptability), sociability: score(row.sociability), activity_level: score(row.activity_level),
      exercise_need: score(row.exercise_need), outdoor_preference: score(row.outdoor_preference), apartment_suitability: score(row.apartment_suitability),
      family_friendly: score(row.family_friendly), child_friendly: score(row.child_friendly), first_time_owner_friendly: score(row.first_time_owner_friendly),
      grooming_need: score(row.grooming_need), shedding_level: score(row.shedding_level), noise_level: score(row.noise_level),
      heat_tolerance: score(row.heat_tolerance), cold_tolerance: score(row.cold_tolerance),
    };
  }

  function localById(value) {
    return localRows.find((row) => Number(row.breed_id || row.source_order || row.id) === Number(value));
  }

  async function loadBreed() {
    const local = localById(id);
    try {
      const response = await fetch(`${API_BASE}/breeds/${encodeURIComponent(id)}?species=dog`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.data) {
        const localMatch = localRows.find((row) => String(row.breed_name).toLowerCase() === String(payload.data.breed_name || "").toLowerCase()) || local || {};
        return normalize({
          ...localMatch,
          ...payload.data,
          thai_name: payload.data.thai_name || payload.data.breed_name_th || localMatch.thai_name || "",
          origin: payload.data.origin || localMatch.origin || "ไม่ระบุ",
          historic_role: payload.data.historic_role || localMatch.historic_role || "",
          image_url: payload.data.image_url || localMatch.image_url || fallback,
          description: payload.data.description || localMatch.description || "",
        }, id);
      }
    } catch (_error) {}
    return local ? normalize(local, id) : null;
  }

  async function loadFavoriteState() {
    if (!current || !getToken() || !getStoredUser()) {
      favorite = false;
      return;
    }

    favorite = readDogFavoriteIds().has(Number(current.breed_id));
  }

  function updateFavoriteButton() {
    const button = document.getElementById("favoriteDetailButton");
    if (!button) return;
    button.classList.toggle("is-active", favorite);
    button.setAttribute("aria-pressed", String(favorite));
    button.textContent = favorite ? "นำออกจากรายการโปรด" : "บันทึกเป็นรายการโปรด";
  }

  async function toggleFavorite() {
    if (!current) return;

    const token = getToken();
    const user = getStoredUser();
    if (!token || !user) {
      window.alert("กรุณาเข้าสู่ระบบก่อนบันทึกรายการโปรด");
      window.location.href = `./login.html?return=dog-detail&id=${encodeURIComponent(current.breed_id)}`;
      return;
    }

    const breedId = Number(current.breed_id);
    const favorites = readDogFavoriteIds();

    if (favorites.has(breedId)) {
      favorites.delete(breedId);
      favorite = false;
    } else {
      favorites.add(breedId);
      favorite = true;
    }

    writeDogFavoriteIds(favorites);
    persistDogFavoriteRecord(breedId, favorite);
    updateFavoriteButton();
  }

  function rankLabel(value) {
    const normalized = score(value);
    if (normalized >= 5) return "มากที่สุด";
    if (normalized >= 4) return "ค่อนข้างมาก";
    if (normalized >= 3) return "ปานกลาง";
    if (normalized >= 2) return "ค่อนข้างน้อย";
    return "น้อยที่สุด";
  }

  function activityText(value) {
    const normalized = score(value);
    if (normalized >= 5) return "ต้องการกิจกรรมสูง";
    if (normalized >= 4) return "ต้องการกิจกรรมสม่ำเสมอ";
    if (normalized >= 3) return "ต้องการกิจกรรมพอเหมาะ";
    if (normalized >= 2) return "ต้องการกิจกรรมไม่มาก";
    return "ค่อนข้างสงบ";
  }

  function coatText(breed) {
    if (breed.grooming_need >= 4 && breed.shedding_level >= 4) return "ขนหนา ต้องดูแลและเก็บขนสม่ำเสมอ";
    if (breed.grooming_need >= 4) return "ขนค่อนข้างต้องการการดูแลสม่ำเสมอ";
    if (breed.grooming_need <= 2 && breed.shedding_level <= 2) return "ขนดูแลง่ายและผลัดขนไม่มาก";
    if (breed.shedding_level >= 4) return "ขนผลัดตามฤดูกาลหรือมีแนวโน้มผลัดมาก";
    return "ขนระดับปานกลาง ดูแลตามรอบปกติ";
  }

  function getBreedTags(breed) {
    return TAG_RULES
      .filter((rule) => rule.match(breed))
      .map(({ key, label }) => ({ key, label }));
  }

  function createHighlightStatements(breed) {
    const statements = [];

    if (breed.friendly >= 4) statements.push("มีแนวโน้มเข้ากับคนได้ดี");
    else if (breed.friendly <= 2) statements.push("ค่อนข้างระมัดระวังกับคนใหม่และควรให้เวลาทำความคุ้นเคย");

    if (breed.activity_level >= 4 || breed.exercise_need >= 4) statements.push("ต้องการกิจกรรมและการออกกำลังกายอย่างสม่ำเสมอ");
    else if (breed.activity_level <= 2 && breed.exercise_need <= 2) statements.push("ต้องการกิจกรรมไม่มากและเหมาะกับกิจวัตรที่ค่อนข้างสงบ");

    if (breed.trainability >= 4) statements.push("มีแนวโน้มตอบสนองต่อการฝึกได้ดี");
    else if (breed.trainability <= 2) statements.push("ควรใช้ความอดทนและความสม่ำเสมอในการฝึก");

    if (breed.independence >= 4) statements.push("มีความเป็นอิสระและเป็นตัวของตัวเองค่อนข้างสูง");
    if (breed.protective >= 4) statements.push("มีแนวโน้มปกป้องพื้นที่หรือสมาชิกในบ้าน");
    if (breed.apartment_suitability >= 4) statements.push("ปรับตัวกับบ้านหรือพื้นที่จำกัดได้ค่อนข้างดีเมื่อมีกิจกรรมเพียงพอ");
    if (breed.family_friendly >= 4) statements.push("มีแนวโน้มเหมาะกับการอยู่ร่วมกับครอบครัว");

    if (breed.grooming_need >= 4) statements.push("ต้องดูแลขนและความสะอาดอย่างสม่ำเสมอ");
    else if (breed.grooming_need <= 2) statements.push("การดูแลขนค่อนข้างไม่ซับซ้อน");

    return [...new Set(statements)].slice(0, 3);
  }

  function createDescription(breed) {
    const displayName = breed.thai_name
      ? `${breed.breed_name} (${breed.thai_name})`
      : breed.breed_name;
    const originText = breed.origin && breed.origin !== "ไม่ระบุ"
      ? `มีต้นกำเนิดจาก${breed.origin}`
      : "มีประวัติการพัฒนาสายพันธุ์มาอย่างต่อเนื่อง";
    const roleText = breed.historic_role
      ? ` และได้รับการพัฒนาในฐานะ${breed.historic_role}`
      : "";

    return `${displayName} ${originText}${roleText} ข้อมูลส่วนนี้สรุปภูมิหลังและบทบาทดั้งเดิมของสายพันธุ์ เพื่อช่วยให้เข้าใจที่มาและวัตถุประสงค์ในการพัฒนาสายพันธุ์ได้ชัดเจนขึ้น`;
  }

  function formatLifeSpan(value, fallback = "10-14") {
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

  function createObserveSummary(breed) {
    return `เวลาสังเกต ${breed.breed_name} ควรดูภาพรวมร่วมกันทั้งรูปศีรษะ สัดส่วนลำตัว ชนิดขน และระดับกิจกรรม ไม่ตัดสินจากสีหรือภาพเพียงมุมเดียว เพราะหลายสายพันธุ์อาจมีลักษณะใกล้เคียงกันได้`;
  }

  function createAppearancePoints(breed) {
    return [
      `ดูรูปศีรษะ ใบหู และแนวลำตัวร่วมกัน เพื่อแยกความต่างจากสายพันธุ์ที่หน้าตาใกล้เคียง`,
      `${coatText(breed)} โดยดูทั้งพื้นผิวขน ความยาว และระดับการผลัดขนประกอบกัน`,
      `ระดับกิจกรรมของสายพันธุ์นี้อยู่ในเกณฑ์${activityText(breed.activity_level)} จึงควรใช้ข้อมูลพฤติกรรมช่วยยืนยันร่วมกับลักษณะภายนอก`,
      `${breed.trainability >= 4 ? "มักตอบสนองต่อการฝึกได้ดี" : breed.trainability <= 2 ? "อาจต้องใช้ความสม่ำเสมอในการฝึกมากขึ้น" : "มีความสามารถในการฝึกระดับปานกลาง"} และ${breed.independence >= 4 ? "มีความเป็นตัวของตัวเองพอสมควร" : "ค่อนข้างชอบอยู่ใกล้คน"}`
    ];
  }

  function findRelatedBreeds(breed) {
    const rows = localRows.map((row) => normalize(row, Number(row.breed_id || row.source_order || row.id || 0)));
    const rowByName = new Map(rows.map((row) => [row.breed_name.toLowerCase(), row]));
    const currentName = breed.breed_name.toLowerCase();
    const matches = [];
    const seen = new Set([currentName]);

    BREED_FAMILY_GROUPS.forEach((group) => {
      const currentIndex = group.breeds.findIndex((name) => name.toLowerCase() === currentName);
      if (currentIndex === -1) return;

      group.breeds
        .map((name, index) => ({ name, index, distance: Math.abs(index - currentIndex) }))
        .filter((item) => item.index !== currentIndex)
        .sort((a, b) => a.distance - b.distance || a.index - b.index)
        .forEach((item) => {
          const key = item.name.toLowerCase();
          const row = rowByName.get(key);
          if (!row || seen.has(key)) return;
          seen.add(key);
          matches.push({
            ...row,
            relationshipLabel: group.label,
            relationshipDescription: group.description
          });
        });
    });

    return matches.slice(0, 2);
  }

  function renderTags(breed) {
    const container = document.getElementById("detailTags");
    if (!container) return;
    container.innerHTML = getBreedTags(breed).map((tag) => `
      <a
        class="trait-tag detail-trait-tag"
        href="./dog-breeds.html?tag=${encodeURIComponent(tag.key)}"
        title="ดูสุนัขทั้งหมดที่มีแท็ก ${escapeHTML(tag.label)}"
      >
        ${escapeHTML(tag.label)}
        <span class="tag-arrow" aria-hidden="true">›</span>
      </a>`).join("");
  }

  function renderFeatures(breed) {
    const list = document.getElementById("featureList");
    const summary = document.getElementById("observeSummary");
    const features = createAppearancePoints(breed);
    if (list) {
      list.innerHTML = features.map((item, index) => `
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
    const similar = findRelatedBreeds(breed);
    if (!similar.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    grid.innerHTML = similar.map((item) => `
      <article class="similar-card">
        <img src="${escapeHTML(item.image_url || fallback)}" alt="${escapeHTML(item.breed_name)}" loading="lazy" referrerpolicy="no-referrer">
        <div>
          <span class="compare-label">${escapeHTML(item.relationshipLabel || "สายพันธุ์ในกลุ่มใกล้เคียง")}</span>
          <h3>${escapeHTML(item.breed_name)}</h3>
          ${item.thai_name ? `<p class="dog-similar-thai-name">${escapeHTML(item.thai_name)}</p>` : ""}
          <p>${escapeHTML(item.relationshipDescription || "อยู่ในตระกูลหรือกลุ่มการใช้งานที่ใกล้เคียงกัน")}</p>
          <a href="./dog-detail.html?id=${encodeURIComponent(item.breed_id)}&species=dog">เปิดดู ${escapeHTML(item.breed_name)} →</a>
        </div>
      </article>`).join("");
    grid.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => {
      if (fallback && img.src !== fallback) img.src = fallback;
    }, { once: true }));
  }

  function careItems(breed) {
    return [
      ["เวลาและกิจกรรมที่ต้องจัดให้", breed.activity_level >= 4 ? "ควรมีเวลาเล่น เดิน หรือทำกิจกรรมทุกวันอย่างสม่ำเสมอ" : breed.activity_level <= 2 ? "ต้องการกิจกรรมไม่มาก แต่ยังควรมีเวลาเล่นและกระตุ้นอย่างสม่ำเสมอ" : "ควรมีเวลาเล่นและพาออกกำลังกายในระดับพอเหมาะ"],
      ["การดูแลขนและความสะอาด", breed.grooming_need >= 4 ? "ควรวางแผนแปรงขนและดูแลความสะอาดเป็นประจำ" : breed.grooming_need <= 2 ? "การดูแลขนค่อนข้างง่าย แต่ยังควรตรวจสภาพผิวหนังและความสะอาดสม่ำเสมอ" : "ควรดูแลขนตามรอบและตรวจสภาพผิวหนังเป็นประจำ"],
      ["สภาพบ้านและพื้นที่ที่เหมาะสม", breed.apartment_suitability >= 4 ? "ค่อนข้างเหมาะกับบ้านหรือคอนโดที่มีพื้นที่จำกัด หากจัดมุมพักผ่อนและกิจกรรมเพียงพอ" : "ควรดูขนาด พลังงาน และพื้นที่ใช้งานในบ้านให้เหมาะกับสายพันธุ์"],
      ["การอยู่ร่วมกับคน เด็ก และสัตว์อื่น", breed.family_friendly >= 4 ? "มีแนวโน้มอยู่ร่วมกับครอบครัวได้ดี แต่ควรฝึกการเข้าสังคมและการเล่นอย่างเหมาะสม" : "ควรประเมินบุคลิกของแต่ละตัวและฝึกการเข้าสังคมอย่างค่อยเป็นค่อยไป"],
      ["ค่าใช้จ่ายและการเตรียมอุปกรณ์", "ควรเตรียมงบสำหรับอาหาร อุปกรณ์ประจำตัว วัคซีน การป้องกันเห็บหมัด และการตรวจสุขภาพประจำปี"],
      ["ความพร้อมของผู้เลี้ยง", breed.first_time_owner_friendly >= 4 ? "ผู้เลี้ยงครั้งแรกสามารถเริ่มต้นได้ง่ายขึ้นเมื่อมีเวลาและความสม่ำเสมอในการฝึก" : "หากเป็นผู้เลี้ยงครั้งแรก ควรศึกษาลักษณะสายพันธุ์และแผนการฝึกเพิ่มเติมก่อนตัดสินใจ"]
    ];
  }

  function renderCare(breed) {
    const grid = document.getElementById("careGrid");
    if (!grid) return;
    grid.innerHTML = careItems(breed).map(([title, body]) => `
      <article class="care-card">
        <strong>${escapeHTML(title)}</strong>
        <span>${escapeHTML(body)}</span>
      </article>`).join("");
  }

  function buildMeter(value, label) {
    const level = score(value);
    const percentage = level * 20;
    return `
      <div
        class="dog-trait-progress"
        role="img"
        aria-label="${escapeHTML(label)} ระดับ ${level} จาก 5"
      >
        <span class="dog-trait-progress__fill" style="--trait-width:${percentage}%"></span>
      </div>`;
  }

  function renderTraits(breed) {
    const grid = document.getElementById("traitDetailGrid");
    if (!grid) return;
    grid.innerHTML = TRAIT_GROUPS.map((group) => `
      <section class="trait-group">
        <div class="trait-group-heading">
          <h3>${escapeHTML(group.title)}</h3>
          <p>${escapeHTML(group.description)}</p>
        </div>
        <div class="trait-group-grid">
          ${group.rows.map(([key, label]) => {
            const level = score(breed[key]);
            return `
              <article class="trait-detail-row dog-trait-card">
                <div class="dog-trait-card__head">
                  <span>${escapeHTML(label)}</span>
                  <strong class="dog-trait-score">${level}<small>/5</small></strong>
                </div>
                ${buildMeter(level, label)}
                <div class="dog-trait-card__foot">
                  <strong>${escapeHTML(rankLabel(level))}</strong>
                  <small>ระดับ ${level} จาก 5</small>
                </div>
              </article>`;
          }).join("")}
        </div>
      </section>`).join("");
  }

  function setupImage(breed) {
    const image = document.getElementById("detailBreedImage");
    const placeholder = document.getElementById("detailImagePlaceholder");
    const sourceNote = document.getElementById("imageSourceNote");
    if (!image || !placeholder) return;
    image.src = breed.image_url || fallback;
    image.alt = `ภาพสายพันธุ์สุนัข ${breed.breed_name}`;
    image.hidden = false;
    placeholder.hidden = true;
    image.addEventListener("error", () => {
      if (fallback && image.src !== fallback) image.src = fallback;
    }, { once: true });
    if (sourceNote) sourceNote.textContent = "ภาพอ้างอิงสายพันธุ์จากแหล่งข้อมูลภายนอก — ตรวจชนิดขนและลักษณะโดยรวมก่อนนำมาแสดง";
  }

  function renderDetail(breed) {
    document.title = `${breed.breed_name}${breed.thai_name ? ` (${breed.thai_name})` : ""} — DogMatch`;
    setText("detailBreedName", breed.breed_name);
    setText("detailDescription", createDescription(breed));
    setText("detailOrigin", breed.origin || "ไม่ระบุ");
    setText("detailCoat", coatText(breed));
    setText("detailActivity", activityText(breed.activity_level));
    setText("detailLifeSpan", formatLifeSpan(breed.life_span));

    const thaiName = document.getElementById("detailThaiName");
    if (thaiName) {
      thaiName.textContent = breed.thai_name || "";
      thaiName.hidden = !breed.thai_name;
    }

    renderTags(breed);
    renderFeatures(breed);
    renderComparisons(breed);
    renderCare(breed);
    renderTraits(breed);
    setupImage(breed);
    updateFavoriteButton();

    const loading = document.getElementById("detailLoading");
    const detail = document.getElementById("breedDetail");
    if (loading) loading.hidden = true;
    if (detail) detail.hidden = false;
  }

  function showError(message) {
    const loading = document.getElementById("detailLoading");
    const error = document.getElementById("detailError");
    const copy = document.getElementById("dogDetailErrorMessage");
    if (loading) loading.hidden = true;
    if (error) error.hidden = false;
    if (copy) copy.textContent = message;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!Number.isInteger(id) || id <= 0) {
      showError("รหัสสายพันธุ์ไม่ถูกต้อง");
      return;
    }
    current = await loadBreed();
    if (!current) {
      showError("ไม่พบข้อมูลสายพันธุ์นี้");
      return;
    }
    await loadFavoriteState();
    renderDetail(current);
    document.getElementById("favoriteDetailButton")?.addEventListener("click", () => void toggleFavorite());
  });
})();
