(() => {
  "use strict";

  /**
   * ระบบรูปสายพันธุ์แมวแบบ strict
   * - ใช้เฉพาะรูปที่ชื่อสายพันธุ์ตรงกันเท่านั้น
   * - ให้ภาพสตูดิโอ/พื้นหลังเรียบจาก PetPetIn เป็นตัวสำรองลำดับแรก
   * - ใช้รูปเดิมของโปรเจกต์และ TheCatAPI เฉพาะเมื่อชื่อสายพันธุ์ตรงแบบ exact
   * - ไม่ตัดคำ Longhair / Shorthair เพื่อไปใช้รูปสายพันธุ์แม่แบบมั่ว ๆ
   */

  const BREEDS_URL = "https://api.thecatapi.com/v1/breeds";
  const IMAGE_INFO_URL = "https://api.thecatapi.com/v1/images/";
  const CACHE_KEY = "catmatch_thecatapi_breeds_strict_v1";
  const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  const PETPETIN_BASENAME = new Map(Object.entries({
    "abyssinian": "abyssinian",
    "somali": "somali",
    "american bobtail": "american_bobtail",
    "american bobtail shorthair": "american_bobtail_shorthair",
    "american curl": "american_curl",
    "american curl longhair": "american_curl_longhair",
    "american shorthair": "american_shorthair",
    "american wirehair": "american_wirehair",
    "australian mist": "australian_mist",
    "bengal": "bengal",
    "bengal longhair": "bengal_longhair",
    "birman": "birman",
    "burmese": "burmese",
    "bombay": "bombay",
    "british shorthair": "british_shorthair",
    "british longhair": "british_longhair",
    "burmilla shorthair": "burmilla",
    "burmilla longhair": "burmilla_longhair",
    "chartreux": "chartreux",
    "chausie": "chausie",
    "ragdoll": "ragdoll",
    "cherubim": "cherubim",
    "cornish rex": "cornish_rex",
    "manx": "manx",
    "cymric": "cymric",
    "devon rex": "devon_rex",
    "havana": "havana_brown",
    "highlander": "highlander",
    "highlander longhair": "highlander_longhair",
    "himalayan": "himalayan",
    "household pet": "domestic_shorthair",
    "japanese bobtail": "japanese_bobtail",
    "japanese bobtail longhair": "japanese_bobtail_longhair",
    "khaomanee": "khaomanee",
    "donskoy": "donskoy",
    "egyptian mau": "egyptian_mau",
    "exotic shorthair": "exotic_shorthair",
    "maine coon": "maine_coon",
    "maine coon polydactyl": "maine_coon_polydactyl",
    "munchkin": "munchkin",
    "nebelung": "nebelung",
    "norwegian forest": "norwegian_forest_cat",
    "ocicat": "ocicat",
    "korat": "korat",
    "laperm": "laperm",
    "lykoi": "lykoi",
    "selkirk rex": "selkirk_rex",
    "serengeti": "serengeti",
    "siamese": "siamese",
    "persian": "persian",
    "peterbald": "peterbald",
    "pixiebob": "pixie_bob",
    "russian blue": "russian_blue",
    "savannah": "savannah",
    "scottish": "scottish_fold",
    "scottish short fur": "scottish_straight",
    "thai": "thai",
    "tonkinese": "tonkinese",
    "toyger": "toyger",
    "turkish angora": "turkish_angora",
    "siberian": "siberian",
    "singapura": "singapura",
    "snowshoe": "snowshoe",
    "sphynx": "sphynx",
    "tennessee rex": "tennessee_rex",
    "turkish van": "turkish_van"
  }));

  // ชื่อ alias ที่เป็นสายพันธุ์เดียวกันจริง ๆ เท่านั้น
  const API_EXACT_ALIASES = new Map(Object.entries({
    "havana": "Havana Brown",
    "khaomanee": "Khao Manee",
    "norwegian forest": "Norwegian Forest Cat",
    "pixiebob": "Pixie-bob",
    "scottish": "Scottish Fold",
    "scottish short fur": "Scottish Straight",
    "burmilla shorthair": "Burmilla"
  }));

  // รูปที่ผู้ใช้เลือกเอง โดยจับคู่ชื่อสายพันธุ์กับข้อมูล 66 สายพันธุ์แบบตรงชื่อ
  const CURATED_EXACT_URLS = new Map(Object.entries({
    "abyssinian": ["https://thepedigreepaws.b-cdn.net/web/cat-breed/2/1594151825-abyssinian-medium-sized-purebreed-cat.jpg"],
    "somali": ["https://cattime.com/wp-content/uploads/sites/14/2011/12/GettyImages-147031347.jpg"],
    "american bobtail": ["https://cfa.org/wp-content/uploads/2024/03/American_bobtail_helmi2.jpg"],
    "american bobtail shorthair": ["https://static.wikia.nocookie.net/kitty/images/b/bb/Cat_amerbobt_SH_lg.jpg/revision/latest?cb=20130121172409&path-prefix=de"],
    "american curl": ["https://cfa.org/wp-content/uploads/2024/01/ac-profile2.jpg"],
    "american curl longhair": ["https://cfa.org/wp-content/uploads/2024/06/2024-bw1i-SugarCurlPlagrim-1024x769.webp"],
    "american shorthair": ["https://catastic.pet/wp-content/uploads/2023/01/studio-photography-american-shorthair-cat-colored-backgrounds-1.jpg"],
    "american wirehair": ["https://cfa.org/wp-content/uploads/2024/01/awh-profile4.jpg"],
    "australian mist": ["https://adelaidevet.com.au/wp-content/uploads/2022/08/australian-mist-adelaidevet.jpg"],
    "bengal": ["https://i.pinimg.com/originals/f3/96/53/f3965351680b70372bac8a7fcfd0ade2.jpg"],
    "bengal longhair": ["https://th.bing.com/th/id/R.35665e2e0287d964c7740eba12b6694a?rik=qLvbfEMjgk8uiw&riu=http%3a%2f%2fwww.indiancreekbengals.com%2fimg%2fkittens%2fcashmere%2fcashmere8.png&ehk=KdPIP6nXkDgi%2bdsszdt0N%2fxh8g%2fvhc4KHbCuyyTwez8%3d&risl=&pid=ImgRaw&r=0"],
    "birman": ["https://i.pinimg.com/736x/a5/7f/02/a57f02f91f6e9d605daa19cbb744a6f4.jpg"],
    "burmese": ["https://th.bing.com/th/id/R.8542a59a44945f9811519081510ca420?rik=jQer7uLbBNTueg&riu=http%3a%2f%2fburmesecat.org%2fwp-content%2fuploads%2fphoto-gallery%2findex+slider%2fBurmau+Jon+Snow.jpg&ehk=DYv6C4nNijKAn1KP%2b6pmqfV6n7dzTU50Ry3QDmeSTtE%3d&risl=&pid=ImgRaw&r=0"],
    "bombay": ["https://www.catbreedselector.com/wp-content/uploads/2017/07/Black-Bombay-Cat.jpg"],
    "british shorthair": ["https://cfa.org/wp-content/uploads/2024/03/British_Short_Hair_Frunk.jpg"],
    "british longhair": ["https://tse4.mm.bing.net/th/id/OIP.Etqw14WMSnrsBzYzMeac2AHaFL?r=0&w=1024&h=717&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "burmilla shorthair": ["https://geomedia.top/wp-content/uploads/2016/06/Burmilla-korotkosherstnaya.jpg"],
    "burmilla longhair": ["https://tse2.mm.bing.net/th/id/OIP.giIHlG8rAysuhjOOxzr_GAAAAA?r=0&w=422&h=500&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "chartreux": ["https://media.istockphoto.com/id/1216940988/photo/british-shorthair.jpg?s=170667a&w=0&k=20&c=_Jjj-pE2OO8GXNLBtq5-vnV40eoHjmx6CNptrA6tuSM="],
    "chausie": ["https://articles.hepper.com/wp-content/uploads/2021/09/F1-chausie-cat-kitten-on-a-dark-background_JMax-Studio-Shutterstock_715600909.webp"],
    "ragdoll": ["https://wallpapercave.com/wp/wp8541259.jpg"],
    "cherubim": ["https://tse2.mm.bing.net/th/id/OIP.wLmBWy9RlklWl7tBporxwgAAAA?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "cornish rex": ["https://tse3.mm.bing.net/th/id/OIP.ykEhQ500Ldt4RQfEDhHTbwHaFE?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "manx": ["https://tse3.mm.bing.net/th/id/OIP.EgByu79XPhvLT3epOZ1V9wHaGF?r=0&w=827&h=679&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "cymric": ["https://tse4.mm.bing.net/th/id/OIP.4soOp7SJLlCbwiMpL-mifwHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "devon rex": ["https://tse3.mm.bing.net/th/id/OIP.yDXz_t6roZ45moJcp_ozIgHaFj?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "havana": ["https://www.044.eu/media/posts/177/HavanaBrownCatsSophisticatedAffectionate002.jpg"],
    "highlander": ["https://tse3.mm.bing.net/th/id/OIP.sWnoShlszx9ifcrSthwIHwAAAA?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "highlander longhair": ["https://pic2.zhimg.com/v2-2e9cf63e0356bcb64293218eecafafbd_1440w.jpg"],
    "himalayan": ["https://pofoto.club/uploads/posts/2022-09/1663435336_10-pofoto-club-p-gimalaiskii-kolor-point-13.jpg"],
    "household pet": ["https://tse3.mm.bing.net/th/id/OIP.V-pKgL4mJOzJTFlsl6DWmwHaFL?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "japanese bobtail": ["https://cattime.com/wp-content/uploads/sites/14/2011/12/GettyImages-1217156544.jpg"],
    "japanese bobtail longhair": ["https://tse3.mm.bing.net/th/id/OIP.dOmoivuDzWsliVsgk9KjqwHaFL?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "khaomanee": ["https://www.races-de-chat.fr/wp-content/uploads/2019/11/chat_khao-manee.jpg"],
    "donskoy": ["https://th.bing.com/th/id/R.cfc67fda8d58d204f3809669d7aae5b5?rik=%2bwp%2fVPZ%2fVZIB5Q&riu=http%3a%2f%2fwww.catbreedselector.com%2fwp-content%2fuploads%2f2015%2f06%2fDonskoy-Cat-Pictures.jpg&ehk=2zu4DHc9xzFhGyE6fDsZPfHDv%2bpBVj36hs0J13sK0A4%3d&risl=&pid=ImgRaw&r=0"],
    "egyptian mau": ["https://www.litter-robot.com/media/magefan_blog/2019/10/Egyptian-Mau.jpg"],
    "exotic shorthair": ["https://res.cloudinary.com/wuuff/image/upload/v1624292884/odlnoix9oplj1cbfxwey.jpg"],
    "maine coon": ["https://www.thehappycatsite.com/wp-content/uploads/2017/12/orange2.jpg"],
    "maine coon polydactyl": ["https://tse2.mm.bing.net/th/id/OIP.o5NfgFd9khebzDzljcrCBQHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "munchkin": ["https://tse2.mm.bing.net/th/id/OIP.jAN1kai6bqm4pcBuM-QxxwHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "nebelung": ["https://smylepets.com/wp-content/uploads/2021/10/nebelung-gato.jpg"],
    "norwegian forest": ["https://img.freepik.com/premium-photo/norwegian-forest-cat_87557-24808.jpg"],
    "ocicat": ["https://cdn-fastly.petguide.com/media/2022/02/15/8202694/ocicat.jpg?size=720x845&nocrop=1"],
    "korat": ["https://i.pinimg.com/736x/11/4f/4a/114f4a8aa121823eeb3d48d7c14b88db.jpg"],
    "laperm": ["https://www.catster.com/wp-content/uploads/2023/11/Laperm-chocolate-silver-tortie-tabby-on-black-background_Linn-Currie-Shutterstock-scaled.jpg"],
    "lykoi": ["https://tse4.mm.bing.net/th/id/OIP.emKs3fDaCWqWripxL_IzDgHaFr?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "selkirk rex": ["https://media.graphassets.com/resize=height:404,width:938/output=format:webp/VuQMVlkdTI8hWZlPR8tJ?width=938"],
    "serengeti": ["https://i.pinimg.com/736x/99/b5/3f/99b53f7337b58a650303cc68580a6463.jpg"],
    "siamese": ["https://tse3.mm.bing.net/th/id/OIP.3a3VG-gQTpfh49M5gSDCkgHaFX?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "persian": ["https://www.thesprucepets.com/thmb/5OSN_p9hUfPssKsJORQDGnAz_tQ=/1963x0/filters:no_upscale():strip_icc()/GettyImages-181861505-4e63227ed0a14dc9bfe86848ef54caf3.jpg"],
    "peterbald": ["https://howlonglive.com/wp-content/uploads/2023/10/image-2.png"],
    "pixiebob": ["https://tse3.mm.bing.net/th/id/OIP.cAxN8SER2pcSU5cXNS5_nQHaFL?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "russian blue": ["https://a-z-animals.com/media/2019/11/Russian-Blue-on-basket.jpg"],
    "savannah": ["https://i.pinimg.com/originals/de/ce/b9/deceb9aaff74b8b7da5882b53d24d50c.jpg"],
    "scottish": ["https://tse2.mm.bing.net/th/id/OIP.uUIXqpH9OSXgmZ9ptZFOywHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "scottish short fur": ["https://welovecatz.hu/media/images/2024_08_scottish-straight-macska-4-1024x535.original.jpg"],
    "thai": ["https://tse2.mm.bing.net/th/id/OIP.SAstFVmdbAiLO6X6m8b5AgHaE8?r=0&w=1000&h=667&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "tonkinese": ["https://i.pinimg.com/736x/cc/30/14/cc3014d7b1db7a5a9ed1de7d85a11fd7.jpg"],
    "toyger": ["https://tse1.mm.bing.net/th/id/OIP.LOyV3LkrCUTF7TlQYPe28QHaEW?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "turkish angora": ["https://petflair.co/wp-content/uploads/2024/08/Turkish-Angora-Cat-1.jpg"],
    "siberian": ["https://tse4.mm.bing.net/th/id/OIP.w5DlqY-PxqM6uVxf1qjZRwHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "singapura": ["https://tse3.mm.bing.net/th/id/OIP.ldWFAGYB4M952F65cEP3wQHaE9?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "snowshoe": ["https://tse2.mm.bing.net/th/id/OIP.2jLltkmYhDa1g3pumVJJ_gHaE6?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "sphynx": ["https://tse3.mm.bing.net/th/id/OIP.es9_7A4h7KsRyP6_kJ3lWgHaFj?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"],
    "tennessee rex": ["https://pangovet.com/wp-content/uploads/2022/11/long-curly-haired-cat-Linn-Currie-Shutterstock-800x534.jpg"],
    "turkish van": ["https://i.pinimg.com/originals/18/4c/3e/184c3e43e4c6fd23877c25e4dbc6b9d6.jpg"]
  }));

  let catalogPromise = null;
  const exactImageCache = new Map();

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function idOf(value) {
    const id = Number(value?.breed_id ?? value?.id ?? value);
    return Number.isInteger(id) && id > 0 ? id : 0;
  }

  function findLocalBreedByName(name) {
    const target = normalize(name);
    const rows = Array.isArray(window.CATMATCH_CAT_BREEDS)
      ? window.CATMATCH_CAT_BREEDS
      : [];
    return rows.find((row) => normalize(row?.breed_name ?? row?.name) === target) || null;
  }

  function findLocalBreedById(value) {
    const id = idOf(value);
    const rows = Array.isArray(window.CATMATCH_CAT_BREEDS)
      ? window.CATMATCH_CAT_BREEDS
      : [];
    return rows.find((row) => idOf(row) === id) || null;
  }

  function breedNameOf(value, imageElement = null) {
    if (typeof value === "string") return value.trim();
    const direct = String(value?.breed_name ?? value?.name ?? "").trim();
    if (direct) return direct;
    const byId = findLocalBreedById(value ?? imageElement?.dataset?.breedId);
    if (byId) return String(byId.breed_name ?? byId.name ?? "").trim();
    return String(imageElement?.dataset?.breedName || "").trim();
  }

  function knowledgeOf(value) {
    const id = idOf(value) || idOf(findLocalBreedByName(breedNameOf(value)));
    const knowledge = window.CatMatchBreedKnowledge;
    return id && knowledge?.get ? knowledge.get(id) : null;
  }

  function petpetinUrl(name) {
    const basename = PETPETIN_BASENAME.get(normalize(name));
    return basename ? `https://www.petpetin.com/images/${basename}.jpg` : "";
  }

  function uniqueUrls(urls) {
    const seen = new Set();
    return urls.filter((url) => {
      const value = String(url || "").trim();
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function staticExactCandidates(name, value) {
    const key = normalize(name);
    const item = knowledgeOf(value);
    return uniqueUrls([
      ...(CURATED_EXACT_URLS.get(key) || []),
      item?.image,
      item?.thumbnail
    ]);
  }

  function readCatalogCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!cached || !Array.isArray(cached.rows) || !Number.isFinite(cached.savedAt)) return null;
      if (Date.now() - cached.savedAt > CACHE_MAX_AGE) return null;
      return cached.rows;
    } catch {
      return null;
    }
  }

  function saveCatalogCache(rows) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), rows }));
    } catch {
      // ใช้งานต่อได้แม้ localStorage ถูกปิด
    }
  }

  async function fetchCatalogRows() {
    const cached = readCatalogCache();
    if (cached) return cached;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(BREEDS_URL, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`TheCatAPI ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error("Invalid breed catalog");
      saveCatalogCache(rows);
      return rows;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetchCatalogRows()
        .then((rows) => {
          const byName = new Map();
          rows.forEach((row) => byName.set(normalize(row.name), row));
          return { rows, byName };
        })
        .catch((error) => {
          catalogPromise = null;
          throw error;
        });
    }
    return catalogPromise;
  }

  function candidateImageUrl(referenceImageId) {
    return referenceImageId
      ? `https://cdn2.thecatapi.com/images/${encodeURIComponent(referenceImageId)}.jpg`
      : "";
  }

  async function matchFromApiExact(name) {
    const requestedName = String(name || "").trim();
    if (!requestedName) return null;

    const catalog = await getCatalog();
    const key = normalize(requestedName);
    const exactName = API_EXACT_ALIASES.get(key) || requestedName;
    const row = catalog.byName.get(normalize(exactName));
    if (!row?.reference_image_id) return null;

    return {
      requestedName,
      matchedName: String(row.name || ""),
      imageUrl: candidateImageUrl(row.reference_image_id),
      thumbnail: candidateImageUrl(row.reference_image_id),
      sourceUrl: "https://thecatapi.com/",
      referenceImageId: String(row.reference_image_id),
      metadata: row,
      matched: true,
      source: "thecatapi-exact"
    };
  }

  async function getExactImageUrl(referenceImageId) {
    if (!referenceImageId) return "";
    if (exactImageCache.has(referenceImageId)) return exactImageCache.get(referenceImageId);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(`${IMAGE_INFO_URL}${encodeURIComponent(referenceImageId)}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return "";
      const payload = await response.json();
      const url = String(payload?.url || "");
      if (url) exactImageCache.set(referenceImageId, url);
      return url;
    } catch {
      return "";
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function matchBreed(nameOrBreed) {
    const requestedName = breedNameOf(nameOrBreed);
    const staticCandidates = staticExactCandidates(requestedName, nameOrBreed);
    if (staticCandidates.length) {
      const local = findLocalBreedByName(requestedName);
      return {
        id: idOf(nameOrBreed) || idOf(local),
        requestedName,
        matchedName: requestedName,
        imageUrl: staticCandidates[0],
        thumbnail: staticCandidates[0],
        sourceUrl: "",
        referenceImageId: "",
        metadata: local || null,
        matched: true,
        source: "strict-external"
      };
    }

    try {
      const apiMatch = await matchFromApiExact(requestedName);
      if (apiMatch) return apiMatch;
    } catch (error) {
      console.info("ไม่สามารถโหลดคลังรูปแมวแบบ exact:", error?.message || error);
    }

    return {
      id: idOf(nameOrBreed),
      requestedName,
      matchedName: "",
      imageUrl: "",
      thumbnail: "",
      sourceUrl: "",
      referenceImageId: "",
      metadata: null,
      matched: false,
      source: "none"
    };
  }

  async function repairImageElement(imageElement) {
    if (!imageElement || imageElement.dataset.repairing === "true") return;
    imageElement.dataset.repairing = "true";

    try {
      const breedId = idOf(imageElement.dataset.breedId);
      const localBreed = findLocalBreedById(breedId);
      const breedName = String(
        imageElement.dataset.breedName ||
        localBreed?.breed_name ||
        localBreed?.name ||
        ""
      ).trim();

      const staticCandidates = staticExactCandidates(breedName, breedId)
        .filter((url) => url !== imageElement.currentSrc && url !== imageElement.src);

      const attempted = new Set(
        String(imageElement.dataset.attemptedUrls || "")
          .split("|")
          .filter(Boolean)
      );
      attempted.add(imageElement.currentSrc || imageElement.src || "");

      const nextStatic = staticCandidates.find((url) => !attempted.has(url));
      if (nextStatic) {
        attempted.add(nextStatic);
        imageElement.dataset.attemptedUrls = [...attempted].join("|");
        imageElement.classList.remove("is-placeholder");
        imageElement.hidden = false;
        imageElement.src = nextStatic;
        return;
      }

      if (imageElement.dataset.apiExactTried !== "true") {
        imageElement.dataset.apiExactTried = "true";
        try {
          const apiMatch = await matchFromApiExact(breedName);
          if (apiMatch?.matched) {
            const exactUrl = await getExactImageUrl(apiMatch.referenceImageId);
            const url = exactUrl || apiMatch.imageUrl;
            if (url && !attempted.has(url)) {
              attempted.add(url);
              imageElement.dataset.attemptedUrls = [...attempted].join("|");
              imageElement.dataset.referenceImageId = apiMatch.referenceImageId;
              imageElement.classList.remove("is-placeholder");
              imageElement.hidden = false;
              imageElement.src = url;
              return;
            }
          }
        } catch (error) {
          console.info("รูป exact ของสายพันธุ์นี้โหลดไม่ได้:", error?.message || error);
        }
      }

      const placeholder = window.CatMatchBreedKnowledge?.placeholder || "";
      if (placeholder && imageElement.src !== placeholder) {
        imageElement.src = placeholder;
        imageElement.classList.add("is-placeholder");
        imageElement.hidden = false;
        return;
      }

      imageElement.hidden = true;
      imageElement.closest(".breed-image, .detail-image-frame")
        ?.classList.add("image-unavailable");
    } finally {
      imageElement.dataset.repairing = "false";
    }
  }

  window.CatMatchBreedImages = {
    getCatalog,
    matchBreed,
    repairImageElement,
    normalize
  };
})();
