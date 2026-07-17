(() => {
  "use strict";

  const DATA = {
  "1": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Ruddy-Aby-Breed-snippet.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Ruddy-Aby-Breed-snippet-300x200.jpg",
    "sourceUrl": "https://tica.org/breed/abyssinian/",
    "origin": "เอธิโอเปีย / สหราชอาณาจักร",
    "features": [
      "ขนสั้นแบบ ticking แต่ละเส้นมีหลายแถบสี",
      "ลำตัวเพรียวแข็งแรงและเคลื่อนไหวคล่อง",
      "ศีรษะทรงลิ่ม หูใหญ่ตั้งและตาอัลมอนด์"
    ],
    "comparisons": [
      {
        "id": 2,
        "difference": "Somali เป็นญาติขนยาวของ Abyssinian ให้ดูหางพวง แผงคอ และขนกึ่งยาว ส่วน Abyssinian ขนสั้นแนบตัวกว่า"
      }
    ]
  },
  "2": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Somali-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Somali-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/somali/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขนกึ่งยาวแบบ ticking คล้าย Abyssinian",
      "หางฟูเป็นพวงและมีขนรอบคอชัด",
      "ลำตัวเพรียวแข็งแรงและใบหูใหญ่"
    ],
    "comparisons": [
      {
        "id": 1,
        "difference": "Abyssinian มีขนสั้นและหางไม่ฟูเท่า Somali แต่ทั้งคู่มีลาย ticking และรูปร่างนักกีฬาใกล้กัน"
      }
    ]
  },
  "3": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Full-Body_.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Full-Body_-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/american-bobtail/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "หางสั้นตามธรรมชาติราวหนึ่งในสามถึงครึ่งหางปกติ",
      "ขนกึ่งยาวฟูเล็กน้อย ดูคล้ายแมวป่า",
      "ลำตัวแข็งแรง อกกว้างและสะโพกเด่น"
    ],
    "comparisons": [
      {
        "id": 4,
        "difference": "ทั้งคู่หางสั้นเหมือนกัน แต่ American Bobtail ตัวนี้มีขนกึ่งยาวฟู ส่วนชนิด Shorthair ขนสั้นแน่นและเห็นทรงลำตัวชัดกว่า"
      }
    ]
  },
  "4": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Shorthair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/American-Bobtail-Shorthair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/american-bobtail-shorthair/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "หางสั้นตามธรรมชาติเป็นจุดสังเกตหลัก",
      "ขนสั้นแน่น เห็นแนวลำตัวชัดกว่าแบบขนยาว",
      "ลำตัวแข็งแรงและมีสีลายได้หลายแบบ"
    ],
    "comparisons": [
      {
        "id": 3,
        "difference": "ชนิด Shorthair ขนสั้นแนบตัว ส่วน American Bobtail แบบขนยาวมีขนพองรอบคอ ท้อง และหางมากกว่า"
      }
    ]
  },
  "5": {
    "officialName": "",
    "image": "https://upload.wikimedia.org/wikipedia/commons/5/5f/American_curl_kitten.jpg",
    "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/5/5f/American_curl_kitten.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:American_curl_kitten.jpg",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ปลายใบหูโค้งย้อนด้านหลังอย่างนุ่มนวล",
      "ขนสั้นเรียบแนบลำตัว ไม่ฟูเป็นพวง",
      "ลำตัวขนาดกลางและดวงตารูปวอลนัต"
    ],
    "comparisons": [
      {
        "id": 6,
        "difference": "ทั้งคู่มีหูโค้งย้อน จุดแยกคือชนิด Longhair มีหางพวงและขนกึ่งยาว ส่วนชนิดนี้ขนสั้นเรียบกว่า"
      }
    ]
  },
  "6": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/American-Curl-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/American-Curl-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/american-curl-longhair/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ปลายใบหูโค้งย้อนด้านหลังเหมือนชนิดขนสั้น",
      "ขนกึ่งยาวเนียนและหางฟูเป็นพวง",
      "ขนชั้นในไม่หนามาก จึงไม่ดูพองเท่า Persian"
    ],
    "comparisons": [
      {
        "id": 5,
        "difference": "Longhair มีขนกึ่งยาวและหางฟูชัด ส่วน American Curl ขนสั้นเห็นแนวลำตัวและใบหูได้ง่ายกว่า"
      }
    ]
  },
  "7": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/American-Shorthair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/American-Shorthair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/american-shorthair/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ลำตัวหนาแน่น กล้ามเนื้อชัดและอกกว้าง",
      "ขนสั้นหนาแน่น สี silver tabby พบได้บ่อย",
      "ใบหน้าค่อนข้างกลม แก้มเต็ม"
    ],
    "comparisons": [
      {
        "id": 8,
        "difference": "American Shorthair ขนตรงหนาแบบ plush ส่วน American Wirehair ขนหยิกกระด้าง เด้ง และหนวดอาจงอ"
      }
    ]
  },
  "8": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/American-Wirehair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/American-Wirehair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/american-wirehair/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขนหยิกกระด้างและเด้งคล้ายลวดเป็นเอกลักษณ์",
      "หนวดและขนบริเวณหูอาจงอหรือเป็นคลื่น",
      "รูปร่างใกล้ American Shorthair แต่ผิวสัมผัสขนต่างชัด"
    ],
    "comparisons": [
      {
        "id": 7,
        "difference": "ให้สัมผัสและดูเส้นขน: Wirehair เป็นคลื่นหรือหยิกกระด้าง ขณะที่ American Shorthair ขนตรงเรียบและหนาแน่น"
      }
    ]
  },
  "9": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Australian-Mist-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Australian-Mist-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/australian-mist/",
    "origin": "ออสเตรเลีย",
    "features": [
      "ลายจุดหรือลายหินอ่อนถูกคลุมด้วยชั้นสีหมอก",
      "ลำตัวขนาดกลางสมส่วนและตาโต",
      "ขนสั้นแนบตัวและลายไม่คมจัดเหมือน Bengal"
    ],
    "comparisons": []
  },
  "10": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Bengal-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Bengal-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/bengal/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขนสั้นเงา มี rosette จุดหรือลาย marble ชัด",
      "ลำตัวยาวแข็งแรง ขาหลังมีกำลัง",
      "ลายดูคล้ายเสือดาวและมีความเปรียบต่างสูง"
    ],
    "comparisons": [
      {
        "id": 11,
        "difference": "Bengal ขนสั้นทำให้ rosette คมชัด ส่วน Bengal Longhair มีขนกึ่งยาว หางฟู และขอบลายดูนุ่มกว่า"
      }
    ]
  },
  "11": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Bengal-Longhair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Bengal-Longhair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/bengal-longhair/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "มี rosette หรือลาย marble แบบ Bengal",
      "ขนกึ่งยาวทำให้ขอบลายดูนุ่มและหางฟูขึ้น",
      "มีขนรอบคอ ท้อง และหางมากกว่าชนิดขนสั้น"
    ],
    "comparisons": [
      {
        "id": 10,
        "difference": "ดูความยาวขนรอบคอ ท้อง และหาง: Longhair ฟูชัด แต่ Bengal ปกติขนสั้นเงาแนบตัว"
      }
    ]
  },
  "12": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Birman-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Birman-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/birman/",
    "origin": "เมียนมา / ฝรั่งเศส",
    "features": [
      "ลายแต้มสีพร้อมดวงตาสีฟ้า",
      "ถุงมือสีขาวที่เท้าทั้งสี่เป็นจุดสำคัญ",
      "ขนกึ่งยาวนุ่มและไม่มีขนชั้นในหนามาก"
    ],
    "comparisons": []
  },
  "13": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Burmese-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Burmese-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/burmese/",
    "origin": "เมียนมา",
    "features": [
      "ตัวกะทัดรัดแต่หนักและมีกล้ามเนื้อ",
      "ขนสั้นเงาแนบตัว สี sable เป็นสีเด่น",
      "ดวงตากลมสีทองและใบหน้าสั้นมน"
    ],
    "comparisons": []
  },
  "14": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Bombay-Full-Body3.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Bombay-Full-Body3-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/bombay/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขนดำสนิทเงาจากโคนถึงปลาย",
      "ตากลมหรือรีสีทองถึงทองแดง",
      "ลำตัวมีกล้ามเนื้อและดูคล้ายเสือดำขนาดเล็ก"
    ],
    "comparisons": []
  },
  "15": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/British-Shorthair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/British-Shorthair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/british-shorthair/",
    "origin": "สหราชอาณาจักร",
    "features": [
      "ใบหน้ากลม แก้มเต็มและลำตัวหนาแน่น",
      "ขนสั้นหนาแบบ plush ตั้งออกจากลำตัวเล็กน้อย",
      "หางหนาปลายมนและขาสั้นแข็งแรง"
    ],
    "comparisons": [
      {
        "id": 16,
        "difference": "British Shorthair ขนสั้นหนาแบบกำมะหยี่ ส่วน British Longhair มีแผงคอ ขนลำตัวยาว และหางพวง"
      }
    ]
  },
  "16": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/British-Longhair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/British-Longhair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/british-longhair/",
    "origin": "สหราชอาณาจักร",
    "features": [
      "โครงสร้างกลมหนาแน่นเหมือน British Shorthair",
      "ขนยาวหนาฟู มีแผงคอและหางพวงชัด",
      "ใบหน้ากลม แก้มเต็มและตากลมโต"
    ],
    "comparisons": [
      {
        "id": 15,
        "difference": "โครงสร้างกลมคล้ายกัน แต่ Longhair มีขนยาวตั้งออกจากตัวและต้องหวีมากกว่า ส่วน Shorthair ขนสั้น plush"
      }
    ]
  },
  "17": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Burmilla-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Burmilla-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/burmilla/",
    "origin": "สหราชอาณาจักร",
    "features": [
      "ขนสั้นสีเงินแบบ shaded หรือ tipped",
      "ขอบตา จมูก และริมฝีปากเข้มเหมือนแต่งหน้า",
      "ลำตัวขนาดกลางและหน้ากลมอ่อนโยน"
    ],
    "comparisons": [
      {
        "id": 18,
        "difference": "Burmilla Shorthair เห็นเส้นขอบตาและสีเงินชัดบนขนสั้น ส่วน Longhair มีหางพวงและขนลำตัวฟูกว่า"
      }
    ]
  },
  "18": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Burmilla-Longhair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Burmilla-Longhair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/burmilla-longhair/",
    "origin": "สหราชอาณาจักร",
    "features": [
      "สีเงิน shaded เหมือน Burmilla Shorthair",
      "ขนกึ่งยาวและหางพวงทำให้ดูฟูกว่า",
      "เส้นขอบตาเข้มยังเป็นจุดเด่นของใบหน้า"
    ],
    "comparisons": [
      {
        "id": 17,
        "difference": "Longhair มีขนกึ่งยาวและหางพวง ส่วน Shorthair ขนสั้นแนบตัว แต่ทั้งคู่มีสีเงิน shaded และขอบตาเข้ม"
      }
    ]
  },
  "19": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Chartreux-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Chartreux-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/chartreux/",
    "origin": "ฝรั่งเศส",
    "features": [
      "ขนสีฟ้าเทาแบบ woolly สองชั้น",
      "ดวงตาทองถึงทองแดงและใบหน้าคล้ายยิ้ม",
      "ลำตัวแข็งแรง ขาเรียวแต่กระดูกแน่น"
    ],
    "comparisons": []
  },
  "20": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Chausie-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Chausie-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/chausie/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขายาว ลำตัวยาวและทรงสูงแบบนักกีฬา",
      "หูใหญ่ตั้งสูงและโหนกแก้มชัด",
      "ขนสั้น สีดำ น้ำตาล ticked หรือ silver tipped"
    ],
    "comparisons": []
  },
  "21": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Ragdoll-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Ragdoll-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/ragdoll/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ตัวใหญ่ ขนกึ่งยาวนุ่มและหางฟู",
      "ดวงตาสีฟ้าและลายแต้มสี",
      "ศีรษะกว้างทรงลิ่มอ่อนและลำตัวสมส่วน"
    ],
    "comparisons": [
      {
        "id": 22,
        "difference": "Ragdoll มักเน้นลายแต้มสีและตาฟ้า ส่วน Cherubim อาจมีสีและลายกว้างกว่า ควรตรวจทะเบียนสายพันธุ์ประกอบ"
      }
    ]
  },
  "22": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2025/05/Cherubim-breedpic.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2025/05/Cherubim-breedpic-300x202.jpg",
    "sourceUrl": "https://tica.org/breed/cherubim/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ตัวใหญ่ โครงสร้างแน่นและขนนุ่มกึ่งยาว",
      "ใบหน้ากว้าง ดวงตาโตและหางฟู",
      "สีและลายอาจกว้างกว่า Ragdoll จึงควรดูมาตรฐานทะเบียนร่วมด้วย"
    ],
    "comparisons": [
      {
        "id": 21,
        "difference": "Cherubim คล้าย Ragdoll ด้านขนาดและขนนุ่ม แต่สีหรือลายอาจไม่จำกัดแบบ Ragdoll และมาตรฐานทะเบียนต่างกัน"
      }
    ]
  },
  "23": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Cornish-Rex-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Cornish-Rex-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/cornish-rex/",
    "origin": "สหราชอาณาจักร",
    "features": [
      "ขนสั้นมากเป็นคลื่นแน่น มีเฉพาะขนอ่อนเป็นหลัก",
      "ลำตัวเพรียวโค้ง หลังโก่งและขายาว",
      "ศีรษะรูปไข่ หูใหญ่ และหนวดย่น"
    ],
    "comparisons": []
  },
  "24": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Manx-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Manx-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/manx/",
    "origin": "เกาะแมน",
    "features": [
      "หางสั้นมากหรือไม่มีหางและสะโพกกลมสูง",
      "ขนสั้นสองชั้นแน่น",
      "ขาหลังยาวกว่าขาหน้า ทำให้เดินกระโดดเด่น"
    ],
    "comparisons": [
      {
        "id": 25,
        "difference": "Manx เป็นชนิดขนสั้น ส่วน Cymric คือญาติขนยาวที่มีขนสองชั้นฟู แต่ทั้งคู่มีหางสั้นหรือไม่มีหางและสะโพกสูง"
      }
    ]
  },
  "25": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Cymric-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Cymric-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/cymric/",
    "origin": "เกาะแมน / แคนาดา",
    "features": [
      "โครงสร้างและหางแบบ Manx",
      "ขนกึ่งยาวถึงยาวหนาแน่นและฟู",
      "สะโพกกลมสูงและขาหลังแข็งแรง"
    ],
    "comparisons": [
      {
        "id": 24,
        "difference": "Cymric ขนยาวฟูและมีขนรอบคอมากกว่า Manx ซึ่งขนสั้น แต่โครงสร้างสะโพกสูงกับหางสั้นใกล้กัน"
      }
    ]
  },
  "26": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Devon-Rex-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Devon-Rex-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/devon-rex/",
    "origin": "สหราชอาณาจักร",
    "features": [
      "ขนสั้นหยิกเป็นคลื่นนุ่มและบาง",
      "หูใหญ่มาก โหนกแก้มสูงและใบหน้าคล้ายเอลฟ์",
      "ลำตัวเพรียวแต่มีอกกว้าง"
    ],
    "comparisons": []
  },
  "27": {
    "officialName": "Havana Brown",
    "image": "https://tica.org/wp-content/uploads/2018/08/Havana-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Havana-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/havana/",
    "origin": "สหราชอาณาจักร",
    "features": [
      "ขนสั้นสีน้ำตาลช็อกโกแลตสม่ำเสมอ",
      "ตาสีเขียวและหนวดสีน้ำตาล",
      "ปากทรงเหลี่ยมชัดเมื่อมองด้านหน้า"
    ],
    "comparisons": []
  },
  "28": {
    "officialName": "Highlander Shorthair",
    "image": "https://tica.org/wp-content/uploads/2018/08/Highlander-Shorthair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Highlander-Shorthair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/highlander-shorthair/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ปลายหูโค้งหลวม หางสั้นและลำตัวมีกล้ามเนื้อ",
      "ขนสั้นแน่นและแนบลำตัว เห็นลายกับทรงชัด",
      "ขาหลังยาวกว่าขาหน้าและอุ้งเท้าใหญ่"
    ],
    "comparisons": [
      {
        "id": 29,
        "difference": "ทั้งคู่มีหูโค้งและหางสั้น แต่ Shorthair ขนสั้นแน่น ส่วน Longhair มีขนท้องรุงรังและขนซอกนิ้วชัด"
      }
    ]
  },
  "29": {
    "officialName": "Highlander Longhair",
    "image": "https://tica.org/wp-content/uploads/2018/08/Highlander-Longhair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Highlander-Longhair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/highlander/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ปลายหูโค้งหลวมและหางสั้นเหมือนชนิดขนสั้น",
      "ขนยาวถึงกึ่งยาว มีขนท้องรุงรังและขนซอกนิ้ว",
      "หางและลำตัวดูฟูกว่า Highlander Shorthair ชัดเจน"
    ],
    "comparisons": [
      {
        "id": 28,
        "difference": "Longhair มีขนยาวถึงราว 2.5 นิ้ว ขนท้องยาวและมีขนซอกนิ้ว ส่วน Shorthair ขนสั้นแนบลำตัว"
      }
    ]
  },
  "30": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Himalayan-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Himalayan-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/himalayan/",
    "origin": "สหรัฐอเมริกา / สหราชอาณาจักร",
    "features": [
      "ใบหน้าและลำตัวแบบ Persian",
      "ขนยาวมากพร้อมลายแต้มสีและตาสีฟ้า",
      "ตัวสั้นหนา ขาสั้นและหางฟู"
    ],
    "comparisons": []
  },
  "31": {
    "officialName": "Household Pet Shorthair",
    "image": "https://tica.org/wp-content/uploads/2018/08/Household-Pet-Shorthair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Household-Pet-Shorthair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/household-pet-kitten/",
    "origin": "ไม่ใช่สายพันธุ์แท้",
    "features": [
      "เป็นแมวบ้านสายเลือดผสม ไม่ใช่สายพันธุ์แท้",
      "รูปร่าง สี และลายแตกต่างกันได้มาก",
      "ควรระบุชนิดขนและลักษณะเฉพาะเป็นรายตัว"
    ],
    "comparisons": []
  },
  "32": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Japanese-Bobtail-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Japanese-Bobtail-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/japanese-bobtail/",
    "origin": "ญี่ปุ่น",
    "features": [
      "หางสั้นเป็นปอมปอมจากกระดูกที่คดงอ",
      "ขนสั้นนุ่มแนบลำตัวและขนชั้นในน้อย",
      "ขายาว โดยเฉพาะขาหลัง และศีรษะทรงสามเหลี่ยม"
    ],
    "comparisons": [
      {
        "id": 33,
        "difference": "ชนิดขนสั้นมีขนแนบตัว ส่วน Longhair มีขนท้อง กางเกงขาหลัง และพวงหางแบบดอกเบญจมาศฟูกว่า"
      }
    ]
  },
  "33": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Japanese-Bobtail-Longhair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Japanese-Bobtail-Longhair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/japanese-bobtail-longhair/",
    "origin": "ญี่ปุ่น",
    "features": [
      "หางปอมปอมเหมือน Japanese Bobtail ขนสั้น",
      "ขนยาวคลุมลำตัว มีขนท้องและกางเกงขาหลัง",
      "พวงหางดูคล้ายดอกเบญจมาศเต็มดอก"
    ],
    "comparisons": [
      {
        "id": 32,
        "difference": "Longhair มีขนยาวคลุมลำตัวและขาหลัง ส่วน Japanese Bobtail ขนสั้นเห็นเส้นลำตัวเรียวยาวชัดกว่า"
      }
    ]
  },
  "34": {
    "officialName": "Khao Manee",
    "image": "https://tica.org/wp-content/uploads/2018/08/Khaomanee-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Khaomanee-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/khaomanee/",
    "origin": "ประเทศไทย",
    "features": [
      "ขนสั้นสีขาวล้วนและแนบตัว",
      "ตาสีฟ้า ทอง หรือสองสีพบได้",
      "ลำตัวเพรียวปานกลางและใบหน้าทรงหัวใจดัดแปลง"
    ],
    "comparisons": []
  },
  "35": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Donskoy-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Donskoy-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/donskoy/",
    "origin": "รัสเซีย",
    "features": [
      "ผิวหนังเกือบไร้ขนหรือมีขนอ่อนบาง",
      "มีรอยย่นชัดบริเวณหัว คอ และขา",
      "ศีรษะทรงลิ่ม หูใหญ่ และนิ้วยาว"
    ],
    "comparisons": [
      {
        "id": 51,
        "difference": "Donskoy มักมีรอยย่นและโครงสร้างค่อนข้างแข็งแรง ส่วน Peterbald เพรียวยาวแบบ Oriental และมีชนิดขนหลายระดับ"
      },
      {
        "id": 64,
        "difference": "Sphynx มีขนอ่อนละเอียดและรูปร่างอกกว้างท้องกลม ส่วน Donskoy เกิดจากยีนไร้ขนคนละแบบและรอยย่นเด่น"
      }
    ]
  },
  "36": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Egyptian-Mau-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Egyptian-Mau-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/egyptian-mau/",
    "origin": "อียิปต์",
    "features": [
      "มีจุดตามธรรมชาติบนขนและผิวหนัง",
      "หน้าผากมีลายคล้ายตัว M หรือ scarab",
      "ตาสีเขียว gooseberry และขาหลังยาว"
    ],
    "comparisons": [
      {
        "id": 43,
        "difference": "Egyptian Mau มีจุดตามธรรมชาติและตาเขียว พร้อมแผ่นหนังที่ขาหลัง ส่วน Ocicat เป็นแมวบ้านลายจุดที่ลำตัวหนากว่า"
      },
      {
        "id": 54,
        "difference": "Savannah ตัวสูงขายาวและหูใหญ่มากกว่า Egyptian Mau"
      }
    ]
  },
  "37": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Exotic-Shorthair-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Exotic-Shorthair-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/exotic-shorthair/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ใบหน้ากลมแบนและลำตัวหนาแบบ Persian",
      "ขนสั้นหนา plush ดูเหมือนตุ๊กตา",
      "ตากลมโตและจมูกสั้น"
    ],
    "comparisons": []
  },
  "38": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Maine-Coon-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Maine-Coon-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/maine-coon/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ตัวใหญ่ ลำตัวยาวสี่เหลี่ยมและอกกว้าง",
      "ขนยาวรุงรัง มีแผงคอและหางพวง",
      "หูใหญ่มีขนพู่และปากทรงเหลี่ยม"
    ],
    "comparisons": [
      {
        "id": 39,
        "difference": "Maine Coon Polydactyl มีนิ้วเกินและอุ้งเท้ากว้าง จุดอื่นคล้าย Maine Coon ปกติ"
      }
    ]
  },
  "39": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Maine-Coon-Polydactyl-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Maine-Coon-Polydactyl-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/maine-coon-polydactyl/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "รูปร่างและขนเหมือน Maine Coon",
      "มีนิ้วเท้ามากกว่าปกติ ทำให้อุ้งเท้ากว้าง",
      "ต้องดูจำนวนและตำแหน่งนิ้วเพื่อแยกจาก Maine Coon ปกติ"
    ],
    "comparisons": [
      {
        "id": 38,
        "difference": "ตรวจจำนวนเท้า: Polydactyl มีนิ้วมากกว่าปกติ ส่วน Maine Coon ทั่วไปมีจำนวนนิ้วมาตรฐาน"
      }
    ]
  },
  "40": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Munchkin-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Munchkin-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/munchkin/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขาสั้นจากลักษณะทางพันธุกรรมแต่ลำตัวความยาวปกติ",
      "ลำตัวแข็งแรงและเดินวิ่งคล่อง",
      "ใบหน้าและสีขนมีได้หลายรูปแบบ"
    ],
    "comparisons": []
  },
  "41": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Nebelung-Body-Shot.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Nebelung-Body-Shot-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/nebelung/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขนกึ่งยาวสีฟ้าเทา ปลายขนมีประกายเงิน",
      "ตาสีเขียวและหางฟูยาว",
      "ลำตัวเพรียวกว่า British Longhair"
    ],
    "comparisons": [
      {
        "id": 53,
        "difference": "ทั้งคู่สีฟ้าเงิน แต่ Nebelung ขนกึ่งยาวและหางฟู ส่วน Russian Blue ขนสั้นสองชั้นแนบตัว"
      }
    ]
  },
  "42": {
    "officialName": "Norwegian Forest Cat",
    "image": "https://tica.org/wp-content/uploads/2018/08/Norwegian-Forest-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Norwegian-Forest-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/norwegian-forest/",
    "origin": "นอร์เวย์",
    "features": [
      "ศีรษะสามเหลี่ยมและสันจมูกตรง",
      "ขนสองชั้นยาวกันน้ำ มีแผงคอและหางฟู",
      "ขาหลังแข็งแรงและลำตัวยาวใหญ่"
    ],
    "comparisons": [
      {
        "id": 38,
        "difference": "Norwegian Forest หัวสามเหลี่ยมและสันจมูกตรง ส่วน Maine Coon ปากเหลี่ยมและลำตัวยาวสี่เหลี่ยม"
      },
      {
        "id": 61,
        "difference": "Siberian มีเส้นโค้งกลมและหัวมนกว่า Norwegian Forest ที่หัวสามเหลี่ยมชัด"
      }
    ]
  },
  "43": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Ocicat-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Ocicat-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/ocicat/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ลายจุดชัดบนขนสั้นโดยไม่มีสายเลือดแมวป่า",
      "ลำตัวมีกล้ามเนื้อและอกลึก",
      "ลายหน้าชัด ตารูปอัลมอนด์และหูขนาดกลาง"
    ],
    "comparisons": [
      {
        "id": 36,
        "difference": "Ocicat ลำตัวหนาและลายจุดเกิดจากการผสมแมวบ้าน ส่วน Egyptian Mau มีจุดตามธรรมชาติและตาเขียว"
      },
      {
        "id": 54,
        "difference": "Savannah สูงขายาว หูใหญ่ และมีแถบน้ำตาชัดกว่า Ocicat"
      }
    ]
  },
  "44": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2026/06/korat.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2026/06/korat-300x200.jpg",
    "sourceUrl": "https://tica.org/breed/korat/",
    "origin": "ประเทศไทย",
    "features": [
      "ขนสั้นสีเงินฟ้าเส้นเดียวทั่วตัว",
      "ศีรษะรูปหัวใจและตาสีเขียวสด",
      "ลำตัวแน่นแต่ไม่หนาเท่า British Shorthair"
    ],
    "comparisons": []
  },
  "45": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/laperm-550x350-1.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/laperm-550x350-1-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/laperm/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขนหยิกหรือเป็นลอนตั้งแต่โคนถึงปลาย",
      "หนวดอาจหยิกและมีทั้งชนิดขนสั้นกับขนยาว",
      "ลำตัวปานกลางและใบหูใหญ่"
    ],
    "comparisons": []
  },
  "46": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Lykoi-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Lykoi-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/lykoi/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขน roan บางเป็นหย่อมและหน้าคล้ายหน้ากากไร้ขน",
      "ผิวหนังเห็นชัดรอบตา จมูก และปาก",
      "รูปลักษณ์คล้ายหมาป่าแต่โครงสร้างเป็นแมวบ้าน"
    ],
    "comparisons": []
  },
  "47": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Selkirk-Rex-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Selkirk-Rex-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/selkirk-rex/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขนหยิกหนานุ่มแบบ plush",
      "ศีรษะกลม ลำตัวหนาแน่นและกระดูกหนัก",
      "หนวดหยิกและลอนขนเห็นชัดทั่วลำตัว"
    ],
    "comparisons": []
  },
  "48": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Serengeti-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Serengeti-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/serengeti/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขายาว ลำตัวเพรียวและหูใหญ่ตั้งสูง",
      "ขนสั้นมีจุดตัดกับพื้นสีอ่อน",
      "ดูคล้าย Savannah แต่ขนาดมักเล็กกว่าและโครงสร้างเบากว่า"
    ],
    "comparisons": []
  },
  "49": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Siamese-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Siamese-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/siamese/",
    "origin": "ประเทศไทย",
    "features": [
      "ศีรษะทรงลิ่มยาว หูใหญ่มากและลำตัวเพรียว",
      "ลายแต้มสีเข้มที่หน้า หู ขา และหาง",
      "ดวงตาสีฟ้าทรงอัลมอนด์"
    ],
    "comparisons": [
      {
        "id": 57,
        "difference": "Siamese สมัยใหม่เพรียวยาว หัวลิ่มและหูใหญ่มาก ส่วน Thai กลมและมีกล้ามเนื้อมากกว่า"
      },
      {
        "id": 58,
        "difference": "Tonkinese มีสี mink และตา aqua ได้บ่อย ความต่างแต้มสีน้อยกว่า Siamese"
      }
    ]
  },
  "50": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Persian-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Persian-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/persian/",
    "origin": "อิหร่าน / สหราชอาณาจักร",
    "features": [
      "ขนยาวหนามาก มีแผงคอและหางพวง",
      "ศีรษะกลม จมูกสั้นและลำตัว cobby",
      "ขาสั้นหนาและอุ้งเท้ากลม"
    ],
    "comparisons": [
      {
        "id": 30,
        "difference": "Himalayan มีโครงสร้าง Persian แต่ต้องมีลายแต้มสีและตาฟ้า ส่วน Persian มีสีและลายหลากหลาย"
      },
      {
        "id": 37,
        "difference": "Exotic Shorthair มีหน้าและตัวแบบ Persian แต่ขนสั้นหนา ไม่ยาวฟู"
      }
    ]
  },
  "51": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Peterbald-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Peterbald-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/peterbald/",
    "origin": "รัสเซีย",
    "features": [
      "มีได้ตั้งแต่ไร้ขนจนถึงขนแบบ brush หรือ velour",
      "ลำตัวเพรียวยาวแบบ Oriental และหูใหญ่มาก",
      "หัวทรงลิ่มยาวและนิ้วยาว"
    ],
    "comparisons": [
      {
        "id": 35,
        "difference": "Peterbald ลำตัวเพรียวยาว หูใหญ่แบบ Oriental ส่วน Donskoy ลำตัวแน่นกว่าและรอยย่นชัด"
      },
      {
        "id": 64,
        "difference": "Sphynx มีรูปร่างอกกว้างและท้องกลมกว่า Peterbald ที่เพรียวยาว"
      }
    ]
  },
  "52": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Pixiebob-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Pixiebob-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/pixiebob/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "หางสั้น ลาย spotted tabby และรูปลักษณ์คล้าย bobcat",
      "ลำตัวใหญ่หนาและปากกว้าง",
      "บางตัวมีนิ้วเกิน แต่ไม่ใช่ลักษณะบังคับทุกตัว"
    ],
    "comparisons": []
  },
  "53": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Russian-Blue-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Russian-Blue-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/russian-blue/",
    "origin": "รัสเซีย",
    "features": [
      "ขนสั้นสองชั้นสีฟ้าเงินและแนบตัว",
      "ดวงตาสีเขียวสดและศีรษะทรงลิ่ม",
      "ลำตัวเพรียวและอุ้งเท้าเล็กกว่า Chartreux"
    ],
    "comparisons": [
      {
        "id": 41,
        "difference": "Russian Blue ขนสั้นหนาสีเงิน ส่วน Nebelung เป็นญาติขนยาว มีหางพวงและขนกึ่งยาว"
      }
    ]
  },
  "54": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Savannah-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Savannah-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/savannah/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ตัวสูงขายาว หูใหญ่และคอยาว",
      "ขนสั้นลายจุดสีเข้มบนพื้นสีทองหรือเงิน",
      "มีแถบน้ำตาจากหัวตาลงสู่จมูก"
    ],
    "comparisons": [
      {
        "id": 43,
        "difference": "Savannah ตัวสูง ขายาวและหูใหญ่มากกว่า Ocicat ซึ่งตัวหนาแน่นกว่า"
      },
      {
        "id": 36,
        "difference": "Egyptian Mau มีตาเขียวและลายจุดธรรมชาติ ขนาดกับหูมักเล็กกว่า Savannah"
      }
    ]
  },
  "55": {
    "officialName": "Scottish Fold",
    "image": "https://tica.org/wp-content/uploads/2018/08/Scottish-Fold-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Scottish-Fold-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/scottish-fold/",
    "origin": "สกอตแลนด์",
    "features": [
      "ใบหูพับไปด้านหน้าและแนบศีรษะ",
      "หน้ากลม ตากลมและลำตัวปานกลาง",
      "ขนสั้นหนาแน่นและหางควรยืดหยุ่น"
    ],
    "comparisons": [
      {
        "id": 56,
        "difference": "Scottish Fold มีใบหูพับไปด้านหน้า ส่วน Scottish Straight ใบหูตั้งตรง แม้ใบหน้าและลำตัวกลมคล้ายกัน"
      }
    ]
  },
  "56": {
    "officialName": "Scottish Straight Shorthair",
    "image": "https://tica.org/wp-content/uploads/2018/08/Scottish-Straight-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Scottish-Straight-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/scottish-straight/",
    "origin": "สกอตแลนด์",
    "features": [
      "ใบหูตั้งตรง ไม่พับ แต่โครงหน้าและลำตัวกลมแบบกลุ่ม Scottish",
      "ขนสั้นหนานุ่ม",
      "แยกจาก Scottish Fold ที่ใบหูเป็นหลัก"
    ],
    "comparisons": [
      {
        "id": 55,
        "difference": "จุดแยกชัดที่สุดคือใบหู: Straight ตั้งตรง ส่วน Fold พับแนบศีรษะ"
      }
    ]
  },
  "57": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Thai-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Thai-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/thai/",
    "origin": "ประเทศไทย",
    "features": [
      "ลายแต้มสีและตาสีฟ้าแบบ Siamese",
      "ศีรษะและลำตัวกลมมนกว่า Siamese สมัยใหม่",
      "หูขนาดกลางและลำตัวมีกล้ามเนื้อมากกว่า"
    ],
    "comparisons": [
      {
        "id": 49,
        "difference": "Thai มีศีรษะกลมมนและลำตัวหนากว่า Siamese สมัยใหม่ที่เพรียวยาวและหัวลิ่ม"
      },
      {
        "id": 58,
        "difference": "Tonkinese มักมีสี mink กับตา aqua และแต้มสีไม่ตัดกันเท่า Thai"
      }
    ]
  },
  "58": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Tonkinese-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Tonkinese-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/tonkinese/",
    "origin": "สหรัฐอเมริกา / แคนาดา",
    "features": [
      "สีขนแบบ mink มีความต่างระหว่างลำตัวกับแต้มสีปานกลาง",
      "ตาสี aqua พบได้บ่อย",
      "โครงสร้างอยู่กึ่งกลางระหว่าง Siamese กับ Burmese"
    ],
    "comparisons": [
      {
        "id": 49,
        "difference": "Tonkinese มีลำตัวปานกลางและสี mink ส่วน Siamese เพรียวยาวและแต้มสีตัดกับลำตัวชัด"
      },
      {
        "id": 57,
        "difference": "Thai กลมและมี colorpoint ชัดกว่า Tonkinese ที่ความต่างสีอ่อนกว่า"
      }
    ]
  },
  "59": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Toyger-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Toyger-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/toyger/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ลายแถบแนวตั้งเข้มคล้ายเสือบนพื้นส้มทอง",
      "ลำตัวยาวมีกล้ามเนื้อและไหล่สูง",
      "ลายหน้าวงกลมและหูค่อนข้างเล็กกลม"
    ],
    "comparisons": []
  },
  "60": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Turkish-Angora-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Turkish-Angora-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/turkish-angora/",
    "origin": "ตุรกี",
    "features": [
      "ขนกึ่งยาวเส้นละเอียด ไม่มีขนชั้นในหนา",
      "ลำตัวเพรียว ขายาวและหางเป็นพวง",
      "ศีรษะทรงลิ่มและหูใหญ่ตั้งสูง"
    ],
    "comparisons": []
  },
  "61": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Siberian-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Siberian-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/siberian/",
    "origin": "รัสเซีย",
    "features": [
      "ตัวใหญ่กลมแข็งแรงและอกกว้าง",
      "ขนสามชั้นหนา มีแผงคอและหางพวง",
      "ศีรษะโค้งมนมากกว่า Norwegian Forest"
    ],
    "comparisons": [
      {
        "id": 42,
        "difference": "Siberian หัวและลำตัวโค้งมน ขนสามชั้น ส่วน Norwegian Forest หัวสามเหลี่ยมและจมูกตรง"
      },
      {
        "id": 38,
        "difference": "Maine Coon มีปากเหลี่ยมและลำตัวยาวสี่เหลี่ยมกว่า Siberian"
      }
    ]
  },
  "62": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Singapura-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Singapura-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/singapura/",
    "origin": "สิงคโปร์",
    "features": [
      "ตัวเล็กมาก ขนสั้นสี sepia ticked",
      "ตาและหูใหญ่เมื่อเทียบกับศีรษะ",
      "มีเส้นเข้มจากตาและลำตัวกะทัดรัด"
    ],
    "comparisons": []
  },
  "63": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Snowshoe-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Snowshoe-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/snowshoe/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ลายแต้มสีพร้อมถุงเท้าขาว",
      "ใบหน้ามักมีลายขาวรูปตัว V กลับหัว",
      "ดวงตาสีฟ้าและลำตัวปานกลาง"
    ],
    "comparisons": []
  },
  "64": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Sphynx-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Sphynx-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/sphynx/",
    "origin": "แคนาดา",
    "features": [
      "แทบไม่มีขน ผิวสัมผัสคล้ายหนังกลับ",
      "หูใหญ่มากและมีรอยย่นบริเวณหัว",
      "ท้องกลมเล็กน้อยและกล้ามเนื้อแข็งแรง"
    ],
    "comparisons": [
      {
        "id": 35,
        "difference": "Sphynx มีขนอ่อนคล้ายกำมะหยี่และอกกว้างท้องกลม ส่วน Donskoy รอยย่นเด่นและยีนไร้ขนต่างกัน"
      },
      {
        "id": 51,
        "difference": "Peterbald เพรียวยาวและมีชนิดขนหลายแบบ ส่วน Sphynx ลำตัวหนาแน่นกว่า"
      }
    ]
  },
  "65": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2024/07/Tennessee-Rex-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2024/07/Tennessee-Rex-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/tennessee-rex/",
    "origin": "สหรัฐอเมริกา",
    "features": [
      "ขนหยิกเป็นลอนและมีประกาย satin หรือ glitter",
      "หนวดอาจเป็นคลื่นและขนนุ่มกว่าลักษณะ wirehair",
      "ลำตัวขนาดกลางและหูใหญ่"
    ],
    "comparisons": []
  },
  "66": {
    "officialName": "",
    "image": "https://tica.org/wp-content/uploads/2018/08/Turkish-Van-Full-Body.jpg",
    "thumbnail": "https://tica.org/wp-content/uploads/2018/08/Turkish-Van-Full-Body-300x210.jpg",
    "sourceUrl": "https://tica.org/breed/turkish-van/",
    "origin": "ตุรกี",
    "features": [
      "ลำตัวขาวเป็นหลัก มีสีเด่นที่หัวและหางแบบ van pattern",
      "ขนกึ่งยาวเส้นเดี่ยวและหางฟู",
      "ลำตัวแข็งแรง อกกว้างและขายาวปานกลาง"
    ],
    "comparisons": []
  }
};

  const PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">
      <rect width="800" height="560" fill="#fff8f6"/>
      <circle cx="400" cy="250" r="125" fill="#f8dce6"/>
      <path d="M320 226 300 150l72 40c18-7 38-7 56 0l72-40-20 76c30 27 45 62 45 102 0 82-55 137-125 137s-125-55-125-137c0-40 15-75 45-102Z" fill="none" stroke="#cf7699" stroke-width="14" stroke-linejoin="round"/>
      <circle cx="360" cy="302" r="7" fill="#cf7699"/><circle cx="440" cy="302" r="7" fill="#cf7699"/>
      <path d="M383 344c11 8 23 8 34 0" fill="none" stroke="#cf7699" stroke-width="9" stroke-linecap="round"/>
      <text x="400" y="520" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#786b70">ไม่สามารถโหลดรูปอ้างอิงได้</text>
    </svg>`)}`;

  function idOf(value) {
    const id = Number(value?.breed_id ?? value?.id ?? value);
    return Number.isInteger(id) ? id : 0;
  }

  function get(value) {
    const id = idOf(value);
    return DATA[id] ? { id, ...DATA[id] } : { id, image: "", thumbnail: "", sourceUrl: "https://tica.org/breed-standards/", origin: "ไม่ระบุ", features: [], comparisons: [] };
  }

  function handleImageError(image, value) {
    const item = get(value);
    const tried = image.dataset.imageStage || "full";
    if (tried === "full" && item.thumbnail && image.src !== item.thumbnail) {
      image.dataset.imageStage = "thumb";
      image.src = item.thumbnail;
      return;
    }
    image.dataset.imageStage = "placeholder";
    image.src = PLACEHOLDER;
    image.classList.add("is-placeholder");
  }

  function coatLabel(value, fallback = "") {
    const id = idOf(value);
    const name = String(DATA[id]?.officialName || fallback || value?.breed_name || value?.name || "").toLowerCase();
    if ([35,51,64].includes(id)) return "ไม่มีขนหรือมีขนอ่อนมาก";
    if ([8,23,26,45,47,65].includes(id)) return "ขนหยิกหรือขนลอน";
    if ([2,3,6,11,12,16,18,21,22,25,29,30,33,38,39,41,42,45,50,60,61,66].includes(id) || name.includes("longhair")) return "ขนยาวหรือกึ่งยาว";
    return "ขนสั้น";
  }

  window.CatMatchBreedKnowledge = { get, handleImageError, coatLabel, placeholder: PLACEHOLDER, all: DATA };
})();
