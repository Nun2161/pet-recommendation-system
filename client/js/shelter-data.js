"use strict";

/*
 * ข้อมูลต้นแบบสำหรับพื้นที่สัตว์จากศูนย์พักพิง
 * เมื่อต่อ Backend ให้แทน array นี้ด้วยข้อมูลจาก API โดยคงชื่อฟิลด์เดิมไว้
 * ข้อมูลติดต่อถูกเว้นว่างโดยตั้งใจ จนกว่าศูนย์พักพิงจะยืนยันช่องทางจริง
 */
window.CATMATCH_SHELTER_ANIMALS = [
  {
    id: "dog-001",
    species: "dog",
    name: "เจ้าถั่ว",
    gender: "เพศผู้",
    age: "ประมาณ 2 ปี",
    size: "ขนาดกลาง",
    province: "กรุงเทพมหานคร",
    shelter: "ศูนย์พักพิงพันธมิตร",
    verified: true,
    urgent: true,
    status: "available",
    image: "https://tse2.mm.bing.net/th/id/OIP.oQoDUBuQbnv8jeIPYahFXwHaE8?r=0&w=760&h=507&rs=1&pid=ImgDetMain&o=7&rm=3",
    traits: ["เป็นมิตร", "ใจเย็น", "เข้ากับคนง่าย"],
    health: "ตรวจสุขภาพเบื้องต้นแล้ว",
    vaccination: "รอยืนยันข้อมูลวัคซีน",
    sterilization: "รอยืนยันข้อมูลการทำหมัน",
    story: "เจ้าถั่วเป็นสุนัขอารมณ์ดี ชอบอยู่ใกล้คน และกำลังมองหาครอบครัวที่พร้อมให้เวลาในการปรับตัวอย่างค่อยเป็นค่อยไป",
    suitable_home: "บ้านที่มีเวลาให้ทำกิจกรรมและพร้อมพาไปตรวจสุขภาพตามนัด",
    phone: "",
    social_url: "",
    contact_hours: "รอยืนยันเวลาติดต่อจากศูนย์พักพิง"
  },
  {
    id: "dog-002",
    species: "dog",
    name: "โมจิ",
    gender: "เพศเมีย",
    age: "ประมาณ 1 ปี 6 เดือน",
    size: "ขนาดเล็ก",
    province: "นนทบุรี",
    shelter: "ศูนย์พักพิงพันธมิตร",
    verified: true,
    urgent: false,
    status: "available",
    image: "https://upload.chien.com/upload_global/61/87824-151709_full.jpg",
    traits: ["ขี้เล่น", "เรียนรู้ไว", "ชอบเดินเล่น"],
    health: "ตรวจสุขภาพเบื้องต้นแล้ว",
    vaccination: "รอยืนยันข้อมูลวัคซีน",
    sterilization: "รอยืนยันข้อมูลการทำหมัน",
    story: "โมจิเป็นสุนัขขนาดเล็กที่กระตือรือร้นและชอบทำความรู้จักสิ่งใหม่ เหมาะกับผู้ดูแลที่ชอบกิจกรรมเบา ๆ เป็นประจำ",
    suitable_home: "บ้านหรือคอนโดที่จัดเวลาพาเดินเล่นและมีพื้นที่พักผ่อนสงบ",
    phone: "",
    social_url: "",
    contact_hours: "รอยืนยันเวลาติดต่อจากศูนย์พักพิง"
  },
  {
    id: "dog-003",
    species: "dog",
    name: "โกโก้",
    gender: "เพศผู้",
    age: "ประมาณ 3 ปี",
    size: "ขนาดใหญ่",
    province: "ปทุมธานี",
    shelter: "ศูนย์พักพิงพันธมิตร",
    verified: true,
    urgent: false,
    status: "available",
    image: "https://th.bing.com/th/id/R.f6dd630022fbbb12c7c1fe12df011fd6?rik=UKqyRAdKNQVh%2fw&pid=ImgRaw&r=0",
    traits: ["ซื่อสัตย์", "ฉลาด", "ต้องการพื้นที่"],
    health: "ตรวจสุขภาพเบื้องต้นแล้ว",
    vaccination: "รอยืนยันข้อมูลวัคซีน",
    sterilization: "รอยืนยันข้อมูลการทำหมัน",
    story: "โกโก้มีบุคลิกสุขุมและเรียนรู้คำสั่งได้ดี ต้องการผู้ดูแลที่มีเวลาและเข้าใจการดูแลสุนัขขนาดใหญ่",
    suitable_home: "บ้านที่มีพื้นที่ปลอดภัยและผู้ดูแลที่พร้อมทำกิจกรรมร่วมกัน",
    phone: "",
    social_url: "",
    contact_hours: "รอยืนยันเวลาติดต่อจากศูนย์พักพิง"
  },
  {
    id: "dog-004",
    species: "dog",
    name: "ข้าวปั้น",
    gender: "เพศผู้",
    age: "ประมาณ 10 เดือน",
    size: "ขนาดเล็ก",
    province: "สมุทรปราการ",
    shelter: "ศูนย์พักพิงพันธมิตร",
    verified: true,
    urgent: true,
    status: "available",
    image: "https://th.bing.com/th/id/OIP.3PLeUeLudkXzU2j7CpysVgHaEX?w=310&h=182&c=7&r=0&o=7&dpr=1.4&pid=1.7&rm=3",
    traits: ["ร่าเริง", "ชอบคน", "ยังเป็นวัยเรียนรู้"],
    health: "ตรวจสุขภาพเบื้องต้นแล้ว",
    vaccination: "รอยืนยันข้อมูลวัคซีน",
    sterilization: "รอยืนยันข้อมูลการทำหมัน",
    story: "ข้าวปั้นยังอยู่ในวัยเรียนรู้และต้องการบ้านที่ช่วยฝึกกิจวัตรพื้นฐานด้วยความสม่ำเสมอ",
    suitable_home: "ครอบครัวที่มีเวลาให้การฝึกและดูแลพลังงานของสุนัขวัยรุ่น",
    phone: "",
    social_url: "",
    contact_hours: "รอยืนยันเวลาติดต่อจากศูนย์พักพิง"
  },
  {
    id: "cat-001",
    species: "cat",
    name: "ข้าวหอม",
    gender: "เพศเมีย",
    age: "ประมาณ 1 ปี",
    size: "ขนาดกลาง",
    province: "กรุงเทพมหานคร",
    shelter: "ศูนย์พักพิงพันธมิตร",
    verified: true,
    urgent: true,
    status: "available",
    image: "https://tica.org/wp-content/uploads/2018/08/Ruddy-Aby-Breed-snippet.jpg",
    traits: ["เข้ากับคนง่าย", "อยากรู้อยากเห็น", "ชอบเล่น"],
    health: "ตรวจสุขภาพเบื้องต้นแล้ว",
    vaccination: "รอยืนยันข้อมูลวัคซีน",
    sterilization: "รอยืนยันข้อมูลการทำหมัน",
    story: "ข้าวหอมเป็นแมวที่สนใจผู้คนและชอบสำรวจพื้นที่ใหม่ เหมาะกับบ้านที่จัดมุมพักและของเล่นไว้อย่างเป็นสัดส่วน",
    suitable_home: "บ้านที่มีพื้นที่ปลอดภัยภายในอาคารและพร้อมให้เวลาเล่นทุกวัน",
    phone: "",
    social_url: "",
    contact_hours: "รอยืนยันเวลาติดต่อจากศูนย์พักพิง"
  },
  {
    id: "cat-002",
    species: "cat",
    name: "เมฆ",
    gender: "เพศผู้",
    age: "ประมาณ 2 ปี",
    size: "ขนาดกลาง",
    province: "นนทบุรี",
    shelter: "ศูนย์พักพิงพันธมิตร",
    verified: true,
    urgent: false,
    status: "available",
    image: "https://tica.org/wp-content/uploads/2018/08/British-Longhair-Full-Body.jpg",
    traits: ["สุขุม", "ขนยาว", "ชอบมุมสงบ"],
    health: "ตรวจสุขภาพเบื้องต้นแล้ว",
    vaccination: "รอยืนยันข้อมูลวัคซีน",
    sterilization: "รอยืนยันข้อมูลการทำหมัน",
    story: "เมฆมีบุคลิกค่อนข้างสงบและต้องการเวลาทำความคุ้นเคย เหมาะกับผู้ดูแลที่ไม่เร่งรัดและดูแลขนอย่างสม่ำเสมอ",
    suitable_home: "บ้านบรรยากาศสงบ ไม่มีเสียงดังต่อเนื่อง และมีเวลาหวีขน",
    phone: "",
    social_url: "",
    contact_hours: "รอยืนยันเวลาติดต่อจากศูนย์พักพิง"
  },
  {
    id: "cat-003",
    species: "cat",
    name: "ถุงเงิน",
    gender: "เพศผู้",
    age: "ประมาณ 1 ปี 8 เดือน",
    size: "ขนาดกลาง",
    province: "ปทุมธานี",
    shelter: "ศูนย์พักพิงพันธมิตร",
    verified: true,
    urgent: false,
    status: "available",
    image: "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Full-Body_.jpg",
    traits: ["เป็นมิตร", "ปรับตัวเก่ง", "เหมาะกับครอบครัว"],
    health: "ตรวจสุขภาพเบื้องต้นแล้ว",
    vaccination: "รอยืนยันข้อมูลวัคซีน",
    sterilization: "รอยืนยันข้อมูลการทำหมัน",
    story: "ถุงเงินชอบอยู่ใกล้สมาชิกในบ้านและปรับตัวกับกิจวัตรใหม่ได้ดี เมื่อได้รับพื้นที่ส่วนตัวที่เพียงพอ",
    suitable_home: "ครอบครัวที่มีมุมพักของแมวและดูแลระบบปิดเพื่อความปลอดภัย",
    phone: "",
    social_url: "",
    contact_hours: "รอยืนยันเวลาติดต่อจากศูนย์พักพิง"
  },
  {
    id: "cat-004",
    species: "cat",
    name: "โมจิ",
    gender: "เพศเมีย",
    age: "ประมาณ 8 เดือน",
    size: "ขนาดเล็ก",
    province: "สมุทรปราการ",
    shelter: "ศูนย์พักพิงพันธมิตร",
    verified: true,
    urgent: true,
    status: "available",
    image: "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Shorthair-Full-Body.jpg",
    traits: ["ขี้เล่น", "ชอบคน", "ยังเป็นวัยเรียนรู้"],
    health: "ตรวจสุขภาพเบื้องต้นแล้ว",
    vaccination: "รอยืนยันข้อมูลวัคซีน",
    sterilization: "รอยืนยันข้อมูลการทำหมัน",
    story: "โมจิเป็นลูกแมวที่กำลังเรียนรู้การใช้ชีวิตในบ้าน ต้องการผู้ดูแลที่มีเวลาสร้างกิจวัตรและเล่นอย่างเหมาะสม",
    suitable_home: "บ้านระบบปิดที่มีเวลาเล่นและดูแลความปลอดภัยของลูกแมว",
    phone: "",
    social_url: "",
    contact_hours: "รอยืนยันเวลาติดต่อจากศูนย์พักพิง"
  }
];

window.CatMatchShelterData = (() => {
  const cache = new Map();

  function getApiRoot() {
    return String(window.CATMATCH_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
  }

  function resolveImageUrl(value) {
    const imageUrl = String(value || "").trim();
    if (!imageUrl) return "";
    if (/^(?:data:|blob:|https?:\/\/|\/\/)/i.test(imageUrl)) return imageUrl;

    try {
      const apiUrl = new URL(getApiRoot(), window.location.href);
      const serverOrigin = apiUrl.origin;
      return new URL(imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`, serverOrigin).href;
    } catch (_) {
      return imageUrl;
    }
  }

  function normalizeAnimal(item) {
    if (!item || typeof item !== "object") return item;
    const sourceType = item.source_type === "user" ? "user" : "shelter";
    return {
      ...item,
      source_type: sourceType,
      source_label: item.source_label || (sourceType === "user" ? "ประกาศโดยผู้ใช้" : "สัตว์จากศูนย์พักพิง"),
      source_note: item.source_note || (sourceType === "user" ? "ประกาศช่วยหาบ้านโดยผู้ใช้ · ผ่านการตรวจสอบโดยแอดมินแล้ว" : "ข้อมูลจากศูนย์พักพิงที่ผ่านการตรวจสอบ"),
      admin_approved: item.admin_approved !== false,
      image: resolveImageUrl(item.image || item.cover_image_url),
    };
  }

  function fallback(species) {
    return (window.CATMATCH_SHELTER_ANIMALS || [])
      .filter((item) => item.species === species && item.status === "available")
      .map(normalizeAnimal);
  }

  async function loadList(species, options = {}) {
    const normalized = species === "dog" ? "dog" : "cat";
    if (!options.force && cache.has(normalized)) return cache.get(normalized);

    try {
      const response = await fetch(`${getApiRoot()}/shelters/animals?species=${normalized}`, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "โหลดข้อมูลศูนย์พักพิงไม่สำเร็จ");
      }

      const apiRows = Array.isArray(data.data) ? data.data.map(normalizeAnimal) : [];
      const rows = apiRows.length ? apiRows : fallback(normalized);
      if (!apiRows.length) {
        console.info(`ยังไม่มีข้อมูล${normalized === "dog" ? "สุนัข" : "แมว"}ที่พร้อมเผยแพร่ จึงแสดงข้อมูลตัวอย่างชั่วคราว`);
      }
      cache.set(normalized, rows);
      return rows;
    } catch (error) {
      console.warn("ใช้ข้อมูลตัวอย่างศูนย์พักพิงชั่วคราว:", error.message);
      const rows = fallback(normalized);
      cache.set(normalized, rows);
      return rows;
    }
  }

  async function loadDetail(species, id) {
    const publicId = String(id || "").trim();
    if (publicId) {
      try {
        const response = await fetch(`${getApiRoot()}/shelters/animals/${encodeURIComponent(publicId)}`, {
          headers: { Accept: "application/json" },
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.success !== false && data.data) {
          return normalizeAnimal(data.data);
        }
      } catch (error) {
        console.warn("โหลดรายละเอียดสัตว์จาก API ไม่สำเร็จ:", error.message);
      }
    }
    const rows = await loadList(species);
    return rows.find((item) => String(item.id) === publicId) || null;
  }

  return { loadList, loadDetail, resolveImageUrl };
})();
