"use strict";

const API_BASE = `${window.CATMATCH_API_URL}/auth`;
const PROFILE_ENDPOINT = `${API_BASE}/onboarding/google-profile`;
const AVAILABILITY_ENDPOINT = `${PROFILE_ENDPOINT}/check-availability`;
const THAILAND_DATA_URL = "https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province_with_district_and_sub_district.json";
const GLOBAL_LOCATION_DATA_URL = "https://countriesnow.space/api/v0.1/countries/states";
const GLOBAL_CITY_DATA_URL = "https://countriesnow.space/api/v0.1/countries/state/cities";

const form = document.getElementById("googleOnboardingForm");
const steps = [...document.querySelectorAll(".form-step")];
const indicators = [...document.querySelectorAll(".step-indicator")];
const progress = document.getElementById("stepperProgress");
const backButton = document.getElementById("backButton");
const nextButton = document.getElementById("nextButton");
const submitButton = document.getElementById("submitButton");
const formStatus = document.getElementById("formStatus");
const phoneCountry = document.getElementById("phoneCountry");
const phoneInput = document.getElementById("phone");
const dialCode = document.getElementById("dialCode");
const birthDate = document.getElementById("birthDate");
const calendarButton = document.getElementById("calendarButton");
const locationStatus = document.getElementById("locationDataStatus");

let currentStep = 1;
let highestStep = 1;
let thaiLocations = [];
let locationDataReady = false;
const availability = { name: null, username: null };
const availabilityTimers = new Map();

const PHONE_RULES = Object.freeze({
  TH: { dial: "+66", min: 9, max: 9, groups: [2, 3, 4] },
  LA: { dial: "+856", min: 8, max: 10, groups: [2, 3, 4] },
  KH: { dial: "+855", min: 8, max: 10, groups: [2, 3, 4] },
  MM: { dial: "+95", min: 7, max: 10, groups: [2, 3, 4] },
  VN: { dial: "+84", min: 8, max: 10, groups: [2, 3, 4] },
  MY: { dial: "+60", min: 8, max: 10, groups: [2, 3, 4] },
  SG: { dial: "+65", min: 8, max: 8, groups: [4, 4] },
  ID: { dial: "+62", min: 8, max: 12, groups: [3, 4, 4] },
  PH: { dial: "+63", min: 10, max: 10, groups: [3, 3, 4] },
  CN: { dial: "+86", min: 11, max: 11, groups: [3, 4, 4] },
  JP: { dial: "+81", min: 9, max: 10, groups: [2, 4, 4] },
  KR: { dial: "+82", min: 9, max: 10, groups: [2, 4, 4] },
  IN: { dial: "+91", min: 10, max: 10, groups: [5, 5] },
  AU: { dial: "+61", min: 9, max: 9, groups: [1, 4, 4] },
  GB: { dial: "+44", min: 9, max: 10, groups: [2, 4, 4] },
  US: { dial: "+1", min: 10, max: 10, groups: [3, 3, 4] },
  CA: { dial: "+1", min: 10, max: 10, groups: [3, 3, 4] }
});

const STATIC_COUNTRIES = Object.freeze([{"name":"Afghanistan","iso2":"AF","iso3":"AFG","states":[]},{"name":"Albania","iso2":"AL","iso3":"ALB","states":[]},{"name":"Algeria","iso2":"DZ","iso3":"DZA","states":[]},{"name":"American Samoa","iso2":"AS","iso3":"ASM","states":[]},{"name":"Andorra","iso2":"AD","iso3":"AND","states":[]},{"name":"Angola","iso2":"AO","iso3":"AGO","states":[]},{"name":"Anguilla","iso2":"AI","iso3":"AIA","states":[]},{"name":"Antarctica","iso2":"AQ","iso3":"ATA","states":[]},{"name":"Antigua and Barbuda","iso2":"AG","iso3":"ATG","states":[]},{"name":"Argentina","iso2":"AR","iso3":"ARG","states":[]},{"name":"Armenia","iso2":"AM","iso3":"ARM","states":[]},{"name":"Aruba","iso2":"AW","iso3":"ABW","states":[]},{"name":"Australia","iso2":"AU","iso3":"AUS","states":[]},{"name":"Austria","iso2":"AT","iso3":"AUT","states":[]},{"name":"Azerbaijan","iso2":"AZ","iso3":"AZE","states":[]},{"name":"Bahamas","iso2":"BS","iso3":"BHS","states":[]},{"name":"Bahrain","iso2":"BH","iso3":"BHR","states":[]},{"name":"Bangladesh","iso2":"BD","iso3":"BGD","states":[]},{"name":"Barbados","iso2":"BB","iso3":"BRB","states":[]},{"name":"Belarus","iso2":"BY","iso3":"BLR","states":[]},{"name":"Belgium","iso2":"BE","iso3":"BEL","states":[]},{"name":"Belize","iso2":"BZ","iso3":"BLZ","states":[]},{"name":"Benin","iso2":"BJ","iso3":"BEN","states":[]},{"name":"Bermuda","iso2":"BM","iso3":"BMU","states":[]},{"name":"Bhutan","iso2":"BT","iso3":"BTN","states":[]},{"name":"Bolivia, Plurinational State of","iso2":"BO","iso3":"BOL","states":[]},{"name":"Bonaire, Sint Eustatius and Saba","iso2":"BQ","iso3":"BES","states":[]},{"name":"Bosnia and Herzegovina","iso2":"BA","iso3":"BIH","states":[]},{"name":"Botswana","iso2":"BW","iso3":"BWA","states":[]},{"name":"Bouvet Island","iso2":"BV","iso3":"BVT","states":[]},{"name":"Brazil","iso2":"BR","iso3":"BRA","states":[]},{"name":"British Indian Ocean Territory","iso2":"IO","iso3":"IOT","states":[]},{"name":"Brunei Darussalam","iso2":"BN","iso3":"BRN","states":[]},{"name":"Bulgaria","iso2":"BG","iso3":"BGR","states":[]},{"name":"Burkina Faso","iso2":"BF","iso3":"BFA","states":[]},{"name":"Burundi","iso2":"BI","iso3":"BDI","states":[]},{"name":"Cabo Verde","iso2":"CV","iso3":"CPV","states":[]},{"name":"Cambodia","iso2":"KH","iso3":"KHM","states":[]},{"name":"Cameroon","iso2":"CM","iso3":"CMR","states":[]},{"name":"Canada","iso2":"CA","iso3":"CAN","states":[]},{"name":"Cayman Islands","iso2":"KY","iso3":"CYM","states":[]},{"name":"Central African Republic","iso2":"CF","iso3":"CAF","states":[]},{"name":"Chad","iso2":"TD","iso3":"TCD","states":[]},{"name":"Chile","iso2":"CL","iso3":"CHL","states":[]},{"name":"China","iso2":"CN","iso3":"CHN","states":[]},{"name":"Christmas Island","iso2":"CX","iso3":"CXR","states":[]},{"name":"Cocos (Keeling) Islands","iso2":"CC","iso3":"CCK","states":[]},{"name":"Colombia","iso2":"CO","iso3":"COL","states":[]},{"name":"Comoros","iso2":"KM","iso3":"COM","states":[]},{"name":"Congo","iso2":"CG","iso3":"COG","states":[]},{"name":"Congo, The Democratic Republic of the","iso2":"CD","iso3":"COD","states":[]},{"name":"Cook Islands","iso2":"CK","iso3":"COK","states":[]},{"name":"Costa Rica","iso2":"CR","iso3":"CRI","states":[]},{"name":"Croatia","iso2":"HR","iso3":"HRV","states":[]},{"name":"Cuba","iso2":"CU","iso3":"CUB","states":[]},{"name":"Curaçao","iso2":"CW","iso3":"CUW","states":[]},{"name":"Cyprus","iso2":"CY","iso3":"CYP","states":[]},{"name":"Czechia","iso2":"CZ","iso3":"CZE","states":[]},{"name":"Côte d'Ivoire","iso2":"CI","iso3":"CIV","states":[]},{"name":"Denmark","iso2":"DK","iso3":"DNK","states":[]},{"name":"Djibouti","iso2":"DJ","iso3":"DJI","states":[]},{"name":"Dominica","iso2":"DM","iso3":"DMA","states":[]},{"name":"Dominican Republic","iso2":"DO","iso3":"DOM","states":[]},{"name":"Ecuador","iso2":"EC","iso3":"ECU","states":[]},{"name":"Egypt","iso2":"EG","iso3":"EGY","states":[]},{"name":"El Salvador","iso2":"SV","iso3":"SLV","states":[]},{"name":"Equatorial Guinea","iso2":"GQ","iso3":"GNQ","states":[]},{"name":"Eritrea","iso2":"ER","iso3":"ERI","states":[]},{"name":"Estonia","iso2":"EE","iso3":"EST","states":[]},{"name":"Eswatini","iso2":"SZ","iso3":"SWZ","states":[]},{"name":"Ethiopia","iso2":"ET","iso3":"ETH","states":[]},{"name":"Falkland Islands (Malvinas)","iso2":"FK","iso3":"FLK","states":[]},{"name":"Faroe Islands","iso2":"FO","iso3":"FRO","states":[]},{"name":"Fiji","iso2":"FJ","iso3":"FJI","states":[]},{"name":"Finland","iso2":"FI","iso3":"FIN","states":[]},{"name":"France","iso2":"FR","iso3":"FRA","states":[]},{"name":"French Guiana","iso2":"GF","iso3":"GUF","states":[]},{"name":"French Polynesia","iso2":"PF","iso3":"PYF","states":[]},{"name":"French Southern Territories","iso2":"TF","iso3":"ATF","states":[]},{"name":"Gabon","iso2":"GA","iso3":"GAB","states":[]},{"name":"Gambia","iso2":"GM","iso3":"GMB","states":[]},{"name":"Georgia","iso2":"GE","iso3":"GEO","states":[]},{"name":"Germany","iso2":"DE","iso3":"DEU","states":[]},{"name":"Ghana","iso2":"GH","iso3":"GHA","states":[]},{"name":"Gibraltar","iso2":"GI","iso3":"GIB","states":[]},{"name":"Greece","iso2":"GR","iso3":"GRC","states":[]},{"name":"Greenland","iso2":"GL","iso3":"GRL","states":[]},{"name":"Grenada","iso2":"GD","iso3":"GRD","states":[]},{"name":"Guadeloupe","iso2":"GP","iso3":"GLP","states":[]},{"name":"Guam","iso2":"GU","iso3":"GUM","states":[]},{"name":"Guatemala","iso2":"GT","iso3":"GTM","states":[]},{"name":"Guernsey","iso2":"GG","iso3":"GGY","states":[]},{"name":"Guinea","iso2":"GN","iso3":"GIN","states":[]},{"name":"Guinea-Bissau","iso2":"GW","iso3":"GNB","states":[]},{"name":"Guyana","iso2":"GY","iso3":"GUY","states":[]},{"name":"Haiti","iso2":"HT","iso3":"HTI","states":[]},{"name":"Heard Island and McDonald Islands","iso2":"HM","iso3":"HMD","states":[]},{"name":"Holy See (Vatican City State)","iso2":"VA","iso3":"VAT","states":[]},{"name":"Honduras","iso2":"HN","iso3":"HND","states":[]},{"name":"Hong Kong","iso2":"HK","iso3":"HKG","states":[]},{"name":"Hungary","iso2":"HU","iso3":"HUN","states":[]},{"name":"Iceland","iso2":"IS","iso3":"ISL","states":[]},{"name":"India","iso2":"IN","iso3":"IND","states":[]},{"name":"Indonesia","iso2":"ID","iso3":"IDN","states":[]},{"name":"Iran, Islamic Republic of","iso2":"IR","iso3":"IRN","states":[]},{"name":"Iraq","iso2":"IQ","iso3":"IRQ","states":[]},{"name":"Ireland","iso2":"IE","iso3":"IRL","states":[]},{"name":"Isle of Man","iso2":"IM","iso3":"IMN","states":[]},{"name":"Israel","iso2":"IL","iso3":"ISR","states":[]},{"name":"Italy","iso2":"IT","iso3":"ITA","states":[]},{"name":"Jamaica","iso2":"JM","iso3":"JAM","states":[]},{"name":"Japan","iso2":"JP","iso3":"JPN","states":[]},{"name":"Jersey","iso2":"JE","iso3":"JEY","states":[]},{"name":"Jordan","iso2":"JO","iso3":"JOR","states":[]},{"name":"Kazakhstan","iso2":"KZ","iso3":"KAZ","states":[]},{"name":"Kenya","iso2":"KE","iso3":"KEN","states":[]},{"name":"Kiribati","iso2":"KI","iso3":"KIR","states":[]},{"name":"Korea, Democratic People's Republic of","iso2":"KP","iso3":"PRK","states":[]},{"name":"Korea, Republic of","iso2":"KR","iso3":"KOR","states":[]},{"name":"Kosovo","iso2":"XK","iso3":"XKX","states":[]},{"name":"Kuwait","iso2":"KW","iso3":"KWT","states":[]},{"name":"Kyrgyzstan","iso2":"KG","iso3":"KGZ","states":[]},{"name":"Lao People's Democratic Republic","iso2":"LA","iso3":"LAO","states":[]},{"name":"Latvia","iso2":"LV","iso3":"LVA","states":[]},{"name":"Lebanon","iso2":"LB","iso3":"LBN","states":[]},{"name":"Lesotho","iso2":"LS","iso3":"LSO","states":[]},{"name":"Liberia","iso2":"LR","iso3":"LBR","states":[]},{"name":"Libya","iso2":"LY","iso3":"LBY","states":[]},{"name":"Liechtenstein","iso2":"LI","iso3":"LIE","states":[]},{"name":"Lithuania","iso2":"LT","iso3":"LTU","states":[]},{"name":"Luxembourg","iso2":"LU","iso3":"LUX","states":[]},{"name":"Macao","iso2":"MO","iso3":"MAC","states":[]},{"name":"Madagascar","iso2":"MG","iso3":"MDG","states":[]},{"name":"Malawi","iso2":"MW","iso3":"MWI","states":[]},{"name":"Malaysia","iso2":"MY","iso3":"MYS","states":[]},{"name":"Maldives","iso2":"MV","iso3":"MDV","states":[]},{"name":"Mali","iso2":"ML","iso3":"MLI","states":[]},{"name":"Malta","iso2":"MT","iso3":"MLT","states":[]},{"name":"Marshall Islands","iso2":"MH","iso3":"MHL","states":[]},{"name":"Martinique","iso2":"MQ","iso3":"MTQ","states":[]},{"name":"Mauritania","iso2":"MR","iso3":"MRT","states":[]},{"name":"Mauritius","iso2":"MU","iso3":"MUS","states":[]},{"name":"Mayotte","iso2":"YT","iso3":"MYT","states":[]},{"name":"Mexico","iso2":"MX","iso3":"MEX","states":[]},{"name":"Micronesia, Federated States of","iso2":"FM","iso3":"FSM","states":[]},{"name":"Moldova, Republic of","iso2":"MD","iso3":"MDA","states":[]},{"name":"Monaco","iso2":"MC","iso3":"MCO","states":[]},{"name":"Mongolia","iso2":"MN","iso3":"MNG","states":[]},{"name":"Montenegro","iso2":"ME","iso3":"MNE","states":[]},{"name":"Montserrat","iso2":"MS","iso3":"MSR","states":[]},{"name":"Morocco","iso2":"MA","iso3":"MAR","states":[]},{"name":"Mozambique","iso2":"MZ","iso3":"MOZ","states":[]},{"name":"Myanmar","iso2":"MM","iso3":"MMR","states":[]},{"name":"Namibia","iso2":"NA","iso3":"NAM","states":[]},{"name":"Nauru","iso2":"NR","iso3":"NRU","states":[]},{"name":"Nepal","iso2":"NP","iso3":"NPL","states":[]},{"name":"Netherlands","iso2":"NL","iso3":"NLD","states":[]},{"name":"New Caledonia","iso2":"NC","iso3":"NCL","states":[]},{"name":"New Zealand","iso2":"NZ","iso3":"NZL","states":[]},{"name":"Nicaragua","iso2":"NI","iso3":"NIC","states":[]},{"name":"Niger","iso2":"NE","iso3":"NER","states":[]},{"name":"Nigeria","iso2":"NG","iso3":"NGA","states":[]},{"name":"Niue","iso2":"NU","iso3":"NIU","states":[]},{"name":"Norfolk Island","iso2":"NF","iso3":"NFK","states":[]},{"name":"North Macedonia","iso2":"MK","iso3":"MKD","states":[]},{"name":"Northern Mariana Islands","iso2":"MP","iso3":"MNP","states":[]},{"name":"Norway","iso2":"NO","iso3":"NOR","states":[]},{"name":"Oman","iso2":"OM","iso3":"OMN","states":[]},{"name":"Pakistan","iso2":"PK","iso3":"PAK","states":[]},{"name":"Palau","iso2":"PW","iso3":"PLW","states":[]},{"name":"Palestine, State of","iso2":"PS","iso3":"PSE","states":[]},{"name":"Panama","iso2":"PA","iso3":"PAN","states":[]},{"name":"Papua New Guinea","iso2":"PG","iso3":"PNG","states":[]},{"name":"Paraguay","iso2":"PY","iso3":"PRY","states":[]},{"name":"Peru","iso2":"PE","iso3":"PER","states":[]},{"name":"Philippines","iso2":"PH","iso3":"PHL","states":[]},{"name":"Pitcairn","iso2":"PN","iso3":"PCN","states":[]},{"name":"Poland","iso2":"PL","iso3":"POL","states":[]},{"name":"Portugal","iso2":"PT","iso3":"PRT","states":[]},{"name":"Puerto Rico","iso2":"PR","iso3":"PRI","states":[]},{"name":"Qatar","iso2":"QA","iso3":"QAT","states":[]},{"name":"Romania","iso2":"RO","iso3":"ROU","states":[]},{"name":"Russian Federation","iso2":"RU","iso3":"RUS","states":[]},{"name":"Rwanda","iso2":"RW","iso3":"RWA","states":[]},{"name":"Réunion","iso2":"RE","iso3":"REU","states":[]},{"name":"Saint Barthélemy","iso2":"BL","iso3":"BLM","states":[]},{"name":"Saint Helena, Ascension and Tristan da Cunha","iso2":"SH","iso3":"SHN","states":[]},{"name":"Saint Kitts and Nevis","iso2":"KN","iso3":"KNA","states":[]},{"name":"Saint Lucia","iso2":"LC","iso3":"LCA","states":[]},{"name":"Saint Martin (French part)","iso2":"MF","iso3":"MAF","states":[]},{"name":"Saint Pierre and Miquelon","iso2":"PM","iso3":"SPM","states":[]},{"name":"Saint Vincent and the Grenadines","iso2":"VC","iso3":"VCT","states":[]},{"name":"Samoa","iso2":"WS","iso3":"WSM","states":[]},{"name":"San Marino","iso2":"SM","iso3":"SMR","states":[]},{"name":"Sao Tome and Principe","iso2":"ST","iso3":"STP","states":[]},{"name":"Saudi Arabia","iso2":"SA","iso3":"SAU","states":[]},{"name":"Senegal","iso2":"SN","iso3":"SEN","states":[]},{"name":"Serbia","iso2":"RS","iso3":"SRB","states":[]},{"name":"Seychelles","iso2":"SC","iso3":"SYC","states":[]},{"name":"Sierra Leone","iso2":"SL","iso3":"SLE","states":[]},{"name":"Singapore","iso2":"SG","iso3":"SGP","states":[]},{"name":"Sint Maarten (Dutch part)","iso2":"SX","iso3":"SXM","states":[]},{"name":"Slovakia","iso2":"SK","iso3":"SVK","states":[]},{"name":"Slovenia","iso2":"SI","iso3":"SVN","states":[]},{"name":"Solomon Islands","iso2":"SB","iso3":"SLB","states":[]},{"name":"Somalia","iso2":"SO","iso3":"SOM","states":[]},{"name":"South Africa","iso2":"ZA","iso3":"ZAF","states":[]},{"name":"South Georgia and the South Sandwich Islands","iso2":"GS","iso3":"SGS","states":[]},{"name":"South Sudan","iso2":"SS","iso3":"SSD","states":[]},{"name":"Spain","iso2":"ES","iso3":"ESP","states":[]},{"name":"Sri Lanka","iso2":"LK","iso3":"LKA","states":[]},{"name":"Sudan","iso2":"SD","iso3":"SDN","states":[]},{"name":"Suriname","iso2":"SR","iso3":"SUR","states":[]},{"name":"Svalbard and Jan Mayen","iso2":"SJ","iso3":"SJM","states":[]},{"name":"Sweden","iso2":"SE","iso3":"SWE","states":[]},{"name":"Switzerland","iso2":"CH","iso3":"CHE","states":[]},{"name":"Syrian Arab Republic","iso2":"SY","iso3":"SYR","states":[]},{"name":"Taiwan, Province of China","iso2":"TW","iso3":"TWN","states":[]},{"name":"Tajikistan","iso2":"TJ","iso3":"TJK","states":[]},{"name":"Tanzania, United Republic of","iso2":"TZ","iso3":"TZA","states":[]},{"name":"Thailand","iso2":"TH","iso3":"THA","states":[]},{"name":"Timor-Leste","iso2":"TL","iso3":"TLS","states":[]},{"name":"Togo","iso2":"TG","iso3":"TGO","states":[]},{"name":"Tokelau","iso2":"TK","iso3":"TKL","states":[]},{"name":"Tonga","iso2":"TO","iso3":"TON","states":[]},{"name":"Trinidad and Tobago","iso2":"TT","iso3":"TTO","states":[]},{"name":"Tunisia","iso2":"TN","iso3":"TUN","states":[]},{"name":"Turkmenistan","iso2":"TM","iso3":"TKM","states":[]},{"name":"Turks and Caicos Islands","iso2":"TC","iso3":"TCA","states":[]},{"name":"Tuvalu","iso2":"TV","iso3":"TUV","states":[]},{"name":"Türkiye","iso2":"TR","iso3":"TUR","states":[]},{"name":"Uganda","iso2":"UG","iso3":"UGA","states":[]},{"name":"Ukraine","iso2":"UA","iso3":"UKR","states":[]},{"name":"United Arab Emirates","iso2":"AE","iso3":"ARE","states":[]},{"name":"United Kingdom","iso2":"GB","iso3":"GBR","states":[]},{"name":"United States","iso2":"US","iso3":"USA","states":[]},{"name":"United States Minor Outlying Islands","iso2":"UM","iso3":"UMI","states":[]},{"name":"Uruguay","iso2":"UY","iso3":"URY","states":[]},{"name":"Uzbekistan","iso2":"UZ","iso3":"UZB","states":[]},{"name":"Vanuatu","iso2":"VU","iso3":"VUT","states":[]},{"name":"Venezuela, Bolivarian Republic of","iso2":"VE","iso3":"VEN","states":[]},{"name":"Viet Nam","iso2":"VN","iso3":"VNM","states":[]},{"name":"Virgin Islands, British","iso2":"VG","iso3":"VGB","states":[]},{"name":"Virgin Islands, U.S.","iso2":"VI","iso3":"VIR","states":[]},{"name":"Wallis and Futuna","iso2":"WF","iso3":"WLF","states":[]},{"name":"Western Sahara","iso2":"EH","iso3":"ESH","states":[]},{"name":"Yemen","iso2":"YE","iso3":"YEM","states":[]},{"name":"Zambia","iso2":"ZM","iso3":"ZMB","states":[]},{"name":"Zimbabwe","iso2":"ZW","iso3":"ZWE","states":[]},{"name":"Åland Islands","iso2":"AX","iso3":"ALA","states":[]}]);

const COUNTRY_SEARCH_ALIASES = Object.freeze({
  TH: ["Thailand", "ประเทศไทย", "ไทย", "th"],
  US: ["USA", "United States of America", "America", "สหรัฐอเมริกา"],
  GB: ["UK", "Great Britain", "Britain", "England", "สหราชอาณาจักร"],
  KR: ["South Korea", "Republic of Korea", "เกาหลีใต้"],
  KP: ["North Korea", "เกาหลีเหนือ"],
  LA: ["Laos", "ลาว"],
  VN: ["Vietnam", "เวียดนาม"],
  JP: ["Japan", "ญี่ปุ่น"],
  CN: ["China", "จีน"]
});
function normalizeLocation(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
function bilingual(thaiValue, englishValue) {
  const thai = String(thaiValue || "").trim();
  const english = String(englishValue || "").trim();

  if (thai && english) {
    return `${thai} (${english})`;
  }

  return thai || english;
}
function makeCountryOption(country) {
  const countryName = String(country?.name || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();

  const thailand =
    String(country?.iso2 || "").toUpperCase() === "TH" ||
    countryName === "thailand";

  const value = thailand
    ? "ประเทศไทย (Thailand)"
    : String(country?.name || "").trim();

  return {
    value,
    label: value,
    aliases: [
      country?.name,
      country?.iso2,
      country?.iso3,
      ...(COUNTRY_SEARCH_ALIASES[country?.iso2] || [])
    ].filter(Boolean),
    raw: country
  };
}

function buildCountryOptions(countries) {
  return (Array.isArray(countries) ? countries : [])
    .filter((country) => country?.name)
    .map(makeCountryOption)
    .sort((a, b) => isThailandValue(a.value) ? -1 : isThailandValue(b.value) ? 1 : a.label.localeCompare(b.label, "en"));
}

const locationOptions = {
  country: buildCountryOptions(STATIC_COUNTRIES),
  province: [],
  district: [],
  subdistrict: []
};
let globalCountries = STATIC_COUNTRIES.map((country) => ({ ...country }));
let worldCityRequestId = 0;

function getToken() {
  return sessionStorage.getItem("catmatch_token")
    || sessionStorage.getItem("userToken")
    || sessionStorage.getItem("token")
    || localStorage.getItem("catmatch_token")
    || localStorage.getItem("userToken")
    || localStorage.getItem("token")
    || "";
}

function clearAuthentication() {
  [
    "catmatch_token", "userToken", "token", "catmatch_role",
    "catmatch_user", "user", "catmatch_google_identity"
  ].forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}

async function apiRequest(url, options = {}) {
  const token = getToken();
  if (!token) {
    clearAuthentication();
    window.location.replace("./login.html");
    throw new Error("กรุณาเข้าสู่ระบบด้วย Google อีกครั้ง");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("เซิร์ฟเวอร์ตอบกลับช้าเกินไป กรุณาลองอีกครั้ง");
    }
    throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่าเปิดเซิร์ฟเวอร์ที่พอร์ต 3000 แล้ว");
  } finally {
    window.clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearAuthentication();
    window.location.replace("./login.html");
    throw new Error(data.message || "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  if (!response.ok || data.success === false) {
    throw Object.assign(new Error(data.message || "เกิดข้อผิดพลาด"), {
      errors: data.errors || null,
      status: response.status
    });
  }

  return data;
}

function showStatus(message = "", type = "info") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = message ? `form-status is-visible is-${type}` : "form-status";
}

function getControl(field) {
  if (!field) return null;
  return field.closest(".input-shell") || field.closest(".consent-check") || field;
}

function clearError(field) {
  const control = getControl(field);
  control?.classList.remove("is-invalid");
  field?.removeAttribute("aria-invalid");
  const box = field?.id ? document.querySelector(`[data-error-for="${field.id}"]`) : null;
  if (box) {
    box.textContent = "";
    box.removeAttribute("role");
  }
}

function setError(field, message) {
  const control = getControl(field);
  control?.classList.add("is-invalid");
  control?.classList.remove("is-valid");
  field?.setAttribute("aria-invalid", "true");
  const box = field?.id ? document.querySelector(`[data-error-for="${field.id}"]`) : null;
  if (box) {
    box.textContent = message;
    box.setAttribute("role", "alert");
  }
}

function setValid(field) {
  const control = getControl(field);
  control?.classList.remove("is-invalid");
  control?.classList.add("is-valid");
  field?.removeAttribute("aria-invalid");
}

function requiredMessage(field) {
  const messages = {
    name: "กรุณากรอกชื่อและนามสกุลภาษาอังกฤษ",
    username: "กรุณากรอกชื่อผู้ใช้งาน",
    nickname: "กรุณากรอกชื่อเล่น",
    gender: "กรุณาเลือกเพศ",
    phone: "กรุณากรอกเบอร์โทรศัพท์",
    country: "กรุณาเลือกประเทศ",
    province: "กรุณาเลือกจังหวัด รัฐ หรือภูมิภาค",
    district: "กรุณาเลือกอำเภอ เขต หรือเมือง",
    address: "กรุณากรอกรายละเอียดที่อยู่"
  };
  return messages[field?.id] || "กรุณากรอกข้อมูลช่องนี้";
}

function normalizeName(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function validateDate(value) {
  if (!value) return { valid: true, iso: null };

  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { valid: false, message: "กรุณากรอกวันเกิดรูปแบบ dd/mm/yyyy" };

  const [, dd, mm, yyyy] = match;
  const year = Number(yyyy);
  const month = Number(mm);
  const day = Number(dd);
  const date = new Date(Date.UTC(year, month - 1, day));
  const currentYear = new Date().getFullYear();

  if (year >= 2400) return { valid: false, message: "กรุณาใช้ปี ค.ศ. ไม่ใช้ปี พ.ศ." };
  if (
    year < 1900 || year > currentYear
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return { valid: false, message: "วันเกิดไม่ถูกต้อง" };
  }

  return { valid: true, iso: `${yyyy}-${mm}-${dd}` };
}

function isoToDisplay(value) {
  const match = String(value || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "").replace(/^0+/, "");
}

function splitByGroups(digits, groups) {
  const parts = [];
  let cursor = 0;

  for (const size of groups) {
    if (cursor >= digits.length) break;
    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }

  if (cursor < digits.length) parts.push(digits.slice(cursor));
  return parts.filter(Boolean).join(" ");
}

function formatPhone(value) {
  const country = phoneCountry?.value || "TH";
  const rule = PHONE_RULES[country] || { max: 14, groups: [3, 3, 4] };
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.length > 1) digits = digits.replace(/^0+/, "");
  digits = digits.slice(0, rule.max);
  return splitByGroups(digits, rule.groups || [3, 3, 4]);
}

function getPhoneE164() {
  const rule = PHONE_RULES[phoneCountry?.value] || {
    dial: phoneCountry?.selectedOptions?.[0]?.dataset.code || "+66"
  };
  return `${rule.dial}${normalizePhoneDigits(phoneInput?.value)}`;
}

function updateDialCode() {
  const rule = PHONE_RULES[phoneCountry?.value] || PHONE_RULES.TH;
  if (dialCode) dialCode.textContent = rule.dial;
  if (phoneInput) phoneInput.value = formatPhone(phoneInput.value);
}

function setPhoneFromProfile(phone, country) {
  const selectedCountry = PHONE_RULES[country] ? country : "TH";
  if (phoneCountry) phoneCountry.value = selectedCountry;
  updateDialCode();

  const dial = (PHONE_RULES[selectedCountry] || PHONE_RULES.TH).dial.replace("+", "");
  const digits = String(phone || "").replace(/\D/g, "");
  const local = digits.startsWith(dial) ? digits.slice(dial.length) : digits;
  if (phoneInput) phoneInput.value = formatPhone(local);
}

function validateField(field) {
  if (!field) return true;

  clearError(field);

  // อีเมล Google เป็นช่องอ่านอย่างเดียว แต่ต้องมีค่าจริงก่อนผ่านขั้นบัญชี
  if (field.id === "email") {
    const email = field.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(field, "ไม่พบอีเมลจากบัญชี Google กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วย Google อีกครั้ง");
      return false;
    }
    setValid(field);
    return true;
  }

  if (field.readOnly) return true;

  if (field.disabled) {
    if (field.required) {
      setError(field, requiredMessage(field));
      return false;
    }
    return true;
  }

  if (field.type === "checkbox") {
    if (field.required && !field.checked) {
      setError(field, "กรุณายอมรับข้อกำหนดก่อนบันทึก");
      return false;
    }
    return true;
  }

  const value = field.value.trim();
  if (field.required && !value) {
    setError(field, requiredMessage(field));
    return false;
  }
  if (!value && !field.required) return true;

  if (field.id === "name") {
    const normalized = normalizeName(value);
    field.value = normalized;
    if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)+$/.test(normalized)) {
      setError(field, "กรุณากรอกชื่อและนามสกุลเป็นภาษาอังกฤษ เช่น Kanda Jaiboon");
      return false;
    }
  }

  if (field.id === "username" && !/^[A-Za-z][A-Za-z0-9_]{9}$/.test(value)) {
    setError(field, "ชื่อผู้ใช้งานต้องมี 10 ตัวพอดี และขึ้นต้นด้วยตัวอักษรอังกฤษ");
    return false;
  }

  if (field.id === "nickname" && (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(value) || value.length < 2 || value.length > 30)) {
    setError(field, "กรุณากรอกชื่อเล่นภาษาอังกฤษ 2–30 ตัวอักษร");
    return false;
  }

  if (field.id === "gender" && !["female", "male", "prefer_not_to_say"].includes(value)) {
    setError(field, "กรุณาเลือกเพศ");
    return false;
  }

  if (field.id === "phone") {
    const digits = normalizePhoneDigits(value);
    const rule = PHONE_RULES[phoneCountry?.value] || { min: 6, max: 14 };
    if (digits.length < rule.min || digits.length > rule.max) {
      setError(field, `กรุณากรอกเบอร์โทรศัพท์ ${rule.min}–${rule.max} หลัก`);
      return false;
    }
  }

  if (field.id === "birthDate") {
    const result = validateDate(value);
    if (!result.valid) {
      setError(field, result.message);
      return false;
    }
  }

  if (["country", "province", "district", "subdistrict"].includes(field.id) && value.length > 100) {
    setError(field, "ข้อมูลยาวเกินกำหนด");
    return false;
  }

  if (field.id === "address" && (value.length < 5 || value.length > 500)) {
    setError(field, "กรุณากรอกรายละเอียดที่อยู่ 5–500 ตัวอักษร");
    return false;
  }

  if (["name", "username"].includes(field.id) && availability[field.id] === false) {
    const message = availabilityBox(field.id)?.textContent
      || (field.id === "username" ? "ชื่อผู้ใช้งานนี้ถูกใช้แล้ว" : "ชื่อและนามสกุลนี้ถูกใช้แล้ว");
    setError(field, message);
    return false;
  }

  setValid(field);
  return true;
}

function validateStep(stepNumber) {
  const step = steps.find((item) => Number(item.dataset.step) === stepNumber);
  if (!step) return false;

  let valid = true;
  const fields = [...step.querySelectorAll("input, textarea, select")]
    .filter((field) => field.type !== "hidden");

  fields.forEach((field) => {
    if (!validateField(field)) valid = false;
  });

  if (!valid) {
    showStatus("กรุณาตรวจสอบช่องที่มีกรอบสีแดงและกรอกข้อมูลให้ครบ", "error");
    const firstInvalid = fields.find((field) => getControl(field)?.classList.contains("is-invalid"));
    const focusTarget = firstInvalid?.disabled
      ? fields.slice(0, Math.max(fields.indexOf(firstInvalid), 0)).reverse().find((field) => !field.disabled)
      : firstInvalid;
    focusTarget?.focus();
    getControl(firstInvalid)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return valid;
}

function renderStep({ scroll = false } = {}) {
  steps.forEach((step) => {
    step.classList.toggle("is-active", Number(step.dataset.step) === currentStep);
  });

  indicators.forEach((indicator, index) => {
    const number = index + 1;
    indicator.classList.toggle("is-active", number === currentStep);
    indicator.classList.toggle("is-complete", number < currentStep);
    indicator.disabled = number > highestStep;
    indicator.toggleAttribute("aria-current", number === currentStep);
  });

  if (progress) {
    const denominator = Math.max(steps.length - 1, 1);
    progress.style.width = `${((currentStep - 1) / denominator) * 66.68}%`;
  }

  if (backButton) backButton.hidden = currentStep === 1;
  if (nextButton) nextButton.hidden = currentStep === steps.length;
  if (submitButton) submitButton.hidden = currentStep !== steps.length;
  showStatus();

  if (scroll) {
    document.querySelector(".register-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function goNext(event) {
  event?.preventDefault();
  showStatus();

  if (!validateStep(currentStep)) return;

  if (currentStep === 1) {
    // ไม่รอ API ตรวจชื่อก่อนเปลี่ยนขั้น เพื่อให้ใช้งานต่อได้แม้เครือข่ายช้า
    // หากตรวจพบว่าซ้ำแล้ว จะหยุดพร้อมแสดงข้อความใต้ช่องอย่างชัดเจน
    const unavailableField = ["name", "username"]
      .map((id) => document.getElementById(id))
      .find((field) => field && availability[field.id] === false);
    if (unavailableField) {
      showStatus("ชื่อหรือชื่อผู้ใช้งานนี้ถูกใช้แล้ว กรุณาแก้ไขช่องที่มีกรอบสีแดง", "error");
      unavailableField.focus();
      return;
    }
  }

  currentStep = Math.min(steps.length, currentStep + 1);
  highestStep = Math.max(highestStep, currentStep);
  renderStep({ scroll: true });
}

function goBack() {
  currentStep = Math.max(1, currentStep - 1);
  renderStep({ scroll: true });
}

function setLoading(loading) {
  if (submitButton) {
    submitButton.disabled = loading;
    submitButton.classList.toggle("is-loading", loading);
    const label = submitButton.querySelector(".submit-label");
    if (label) label.textContent = loading ? "กำลังบันทึกข้อมูล" : "บันทึกและเริ่มใช้งาน";
  }
  if (nextButton) nextButton.disabled = loading;
  if (backButton) backButton.disabled = loading;
}

function readStoredJson(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) || "null") || {};
  } catch {
    return {};
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = String(token || "").split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(decodeURIComponent(Array.from(atob(padded), (char) =>
      `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""))) || {};
  } catch {
    return {};
  }
}

function getIdentity() {
  const sessionIdentity = readStoredJson(sessionStorage, "catmatch_google_identity");
  const localIdentity = readStoredJson(localStorage, "catmatch_google_identity");
  const sessionProfile = readStoredJson(sessionStorage, "catmatch_user");
  const legacySessionProfile = readStoredJson(sessionStorage, "user");
  const localProfile = readStoredJson(localStorage, "catmatch_user");
  const legacyLocalProfile = readStoredJson(localStorage, "user");
  const firebaseUser = window.catmatchFirebase?.auth?.currentUser;
  const tokenPayload = decodeJwtPayload(getToken());

  return {
    displayName: sessionIdentity.displayName || sessionIdentity.name
      || localIdentity.displayName || localIdentity.name
      || firebaseUser?.displayName || sessionProfile.name || legacySessionProfile.name
      || localProfile.name || legacyLocalProfile.name || "",
    email: sessionIdentity.email || localIdentity.email
      || firebaseUser?.email || sessionProfile.email || legacySessionProfile.email
      || localProfile.email || legacyLocalProfile.email || tokenPayload.email || "",
    photoURL: sessionIdentity.photoURL || sessionIdentity.photo_url
      || localIdentity.photoURL || localIdentity.photo_url || firebaseUser?.photoURL || ""
  };
}

function renderGoogleIdentity(profile = {}) {
  const identity = getIdentity();
  const name = identity.displayName || profile.name || "บัญชี Google";
  const email = identity.email || profile.email || "";

  const accountName = document.getElementById("googleAccountName");
  const accountEmail = document.getElementById("googleAccountEmail");
  const avatar = document.getElementById("googleAvatar");

  if (accountName) accountName.textContent = name;
  if (accountEmail) accountEmail.textContent = email || "ยังไม่พบอีเมลจาก Google";

  const emailInput = document.getElementById("email");
  if (emailInput) {
    emailInput.value = email;
    emailInput.title = email || "ยังไม่พบอีเมลจาก Google";
    if (email) clearError(emailInput);
  }

  if (!avatar) return;
  if (identity.photoURL) {
    const image = document.createElement("img");
    image.src = identity.photoURL;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    avatar.replaceChildren(image);
  } else {
    avatar.textContent = (name.trim()[0] || "G").toUpperCase();
  }
}

function waitForFirebaseIdentity(timeoutMs = 5000) {
  const auth = window.catmatchFirebase?.auth;
  if (!auth?.onAuthStateChanged) return Promise.resolve(null);
  if (auth.currentUser?.email) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};
    const finish = (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(user || null);
    };
    const timer = window.setTimeout(() => finish(auth.currentUser), timeoutMs);
    unsubscribe = auth.onAuthStateChanged((user) => finish(user), () => finish(null));
  });
}

async function hydrateGoogleIdentity() {
  renderGoogleIdentity();
  const user = await waitForFirebaseIdentity();
  if (!user) return;

  const identity = {
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    uid: user.uid || ""
  };
  sessionStorage.setItem("catmatch_google_identity", JSON.stringify(identity));
  renderGoogleIdentity();
}

async function loadProfile() {
  // โหลดข้อมูลจากเซิร์ฟเวอร์แบบเบื้องหลัง เพื่อไม่ล็อกปุ่ม “ถัดไป” ระหว่างรอ API
  try {
    const data = await apiRequest(PROFILE_ENDPOINT, { method: "GET" });
    if (data.needs_profile_onboarding === false) {
      window.location.replace(data.needs_interest_onboarding ? "./interests.html" : "./index.html");
      return;
    }

    const profile = data.profile || {};
    renderGoogleIdentity(profile);
    const identity = getIdentity();

    const values = {
      name: profile.name || identity.displayName || "",
      username: profile.username || "",
      email: profile.email || identity.email || "",
      nickname: profile.nickname || "",
      gender: ["male", "female", "prefer_not_to_say"].includes(profile.gender)
        ? profile.gender
        : "",
      country: profile.country || "Thailand",
      province: profile.province || "",
      district: profile.district || "",
      subdistrict: profile.subdistrict || "",
      address: profile.address || ""
    };

    Object.entries(values).forEach(([id, value]) => {
      const field = document.getElementById(id);
      // ไม่เขียนทับข้อมูลที่ผู้ใช้เริ่มกรอกระหว่างรอ API
      if (field && (!field.value.trim() || id === "email")) field.value = value;
    });

    if (!phoneInput?.value.trim()) setPhoneFromProfile(profile.phone, profile.phone_country || "TH");
    if (birthDate && !birthDate.value.trim()) birthDate.value = isoToDisplay(profile.birth_date);

    const currentName = document.getElementById("name")?.value.trim();
    const currentUsername = document.getElementById("username")?.value.trim();
    if (profile.name && normalizeName(currentName) === normalizeName(profile.name)) availability.name = true;
    if (profile.username && currentUsername === profile.username) availability.username = true;
    restoreLocationHierarchy();
  } catch (error) {
    renderGoogleIdentity();
    showStatus(`${error.message} แต่คุณยังกรอกข้อมูลและกดถัดไปได้`, "info");
  }
}

function availabilityBox(field) {
  return document.getElementById(`${field}Availability`);
}

function validateFieldIgnoringAvailability(field) {
  const previous = availability[field.id];
  availability[field.id] = true;
  const valid = validateField(field);
  availability[field.id] = previous;
  return valid;
}

async function checkAvailability(fieldName) {
  const input = document.getElementById(fieldName);
  const box = availabilityBox(fieldName);
  if (!input || !box || !validateFieldIgnoringAvailability(input)) return;

  box.textContent = "กำลังตรวจสอบ...";
  box.className = "availability is-checking";

  try {
    const data = await apiRequest(AVAILABILITY_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ field: fieldName, value: input.value.trim() })
    });

    availability[fieldName] = Boolean(data.available);
    box.textContent = data.message || (data.available ? "สามารถใช้ข้อมูลนี้ได้" : "ข้อมูลนี้ถูกใช้แล้ว");
    box.className = `availability ${data.available ? "is-available" : "is-unavailable"}`;

    if (data.available) setValid(input);
    else setError(input, box.textContent);
  } catch (error) {
    availability[fieldName] = null;
    box.textContent = "ตรวจสอบไม่ได้ในขณะนี้ ระบบจะตรวจอีกครั้งตอนบันทึก";
    box.className = "availability";
  }
}

function scheduleAvailability(fieldName) {
  const box = availabilityBox(fieldName);
  availability[fieldName] = null;
  if (box) {
    box.textContent = "";
    box.className = "availability";
  }

  clearTimeout(availabilityTimers.get(fieldName));
  availabilityTimers.set(fieldName, window.setTimeout(() => checkAvailability(fieldName), 450));
}

function setupBirthDatePicker() {
  const textInput = birthDate;
  const button = calendarButton;
  const picker = document.getElementById("birthPicker");
  const monthSelect = document.getElementById("birthMonthSelect");
  const yearSelect = document.getElementById("birthYearSelect");
  const dayGrid = document.getElementById("birthDayGrid");
  const previousButton = document.getElementById("birthPrevMonth");
  const nextMonthButton = document.getElementById("birthNextMonth");
  const clearButton = document.getElementById("birthClearButton");
  if (!textInput || !button || !picker || !monthSelect || !yearSelect || !dayGrid) return;

  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const today = new Date();
  let viewYear = 2000;
  let viewMonth = today.getMonth();

  monthSelect.innerHTML = monthNames.map((name, index) => `<option value="${index}">${name}</option>`).join("");
  yearSelect.innerHTML = Array.from({ length: today.getFullYear() - 1899 }, (_, index) => today.getFullYear() - index)
    .map((year) => `<option value="${year}">${year}</option>`).join("");

  const parseInputDate = () => {
    const result = validateDate(textInput.value);
    if (!result.valid || !result.iso) return null;
    const [year, month, day] = result.iso.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const isFutureDate = (year, month, day) => new Date(year, month, day) > new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const closePicker = () => { picker.hidden = true; button.setAttribute("aria-expanded", "false"); };

  const render = () => {
    monthSelect.value = String(viewMonth);
    yearSelect.value = String(viewYear);
    dayGrid.replaceChildren();
    const selected = parseInputDate();
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let blank = 0; blank < firstWeekday; blank += 1) {
      const spacer = document.createElement("span");
      spacer.className = "birth-day-spacer";
      dayGrid.append(spacer);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "birth-day-button";
      dayButton.textContent = String(day);
      dayButton.setAttribute("role", "gridcell");
      dayButton.disabled = isFutureDate(viewYear, viewMonth, day);
      if (selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day) dayButton.classList.add("is-selected");
      if (today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day) dayButton.classList.add("is-today");
      dayButton.addEventListener("click", () => {
        textInput.value = `${String(day).padStart(2, "0")}/${String(viewMonth + 1).padStart(2, "0")}/${viewYear}`;
        validateField(textInput);
        closePicker();
      });
      dayGrid.append(dayButton);
    }
    if (previousButton) previousButton.disabled = viewYear === 1900 && viewMonth === 0;
    if (nextMonthButton) nextMonthButton.disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  };

  const openPicker = () => {
    const selected = parseInputDate();
    if (selected) { viewYear = selected.getFullYear(); viewMonth = selected.getMonth(); }
    picker.hidden = false;
    button.setAttribute("aria-expanded", "true");
    render();
  };

  button.addEventListener("click", () => picker.hidden ? openPicker() : closePicker());
  previousButton?.addEventListener("click", () => { viewMonth -= 1; if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; } render(); });
  nextMonthButton?.addEventListener("click", () => { viewMonth += 1; if (viewMonth > 11) { viewMonth = 0; viewYear += 1; } render(); });
  monthSelect.addEventListener("change", () => { viewMonth = Number(monthSelect.value); render(); });
  yearSelect.addEventListener("change", () => { viewYear = Number(yearSelect.value); if (viewYear === today.getFullYear() && viewMonth > today.getMonth()) viewMonth = today.getMonth(); render(); });
  clearButton?.addEventListener("click", () => { textInput.value = ""; clearError(textInput); closePicker(); });
  textInput.addEventListener("input", () => {
    const digits = textInput.value.replace(/\D/g, "").slice(0, 8);
    textInput.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
  });
  document.addEventListener("pointerdown", (event) => { if (!picker.hidden && !picker.contains(event.target) && !button.contains(event.target)) closePicker(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !picker.hidden) closePicker(); });
}

function getDistricts(province) {
  if (!province) return [];
  return province.districts || province.district || province.amphure || [];
}

function getSubdistricts(district) {
  if (!district) return [];
  return district.sub_districts || district.subdistricts || district.tambons || district.tambon || [];
}

function makeThaiProvinceOption(province) {
  return {
    value: bilingual(province.name_th, province.name_en || province.name),
    label: bilingual(province.name_th, province.name_en || province.name),
    aliases: [province.name_th, province.name_en, province.name],
    raw: province
  };
}

function makeThaiDistrictOption(district) {
  return {
    value: bilingual(district.name_th, district.name_en || district.name),
    label: bilingual(district.name_th, district.name_en || district.name),
    aliases: [district.name_th, district.name_en, district.name],
    raw: district
  };
}

function makeThaiSubdistrictOption(subdistrict) {
  return {
    value: bilingual(subdistrict.name_th, subdistrict.name_en || subdistrict.name),
    label: bilingual(subdistrict.name_th, subdistrict.name_en || subdistrict.name),
    aliases: [subdistrict.name_th, subdistrict.name_en, subdistrict.name, subdistrict.zip_code],
    raw: subdistrict
  };
}

function optionMatches(option, query) {
  const normalizedQuery = normalizeLocation(query);
  if (!normalizedQuery) return true;
  return [option.value, option.label, ...(option.aliases || [])]
    .filter(Boolean)
    .some((candidate) => normalizeLocation(candidate).includes(normalizedQuery));
}

function findExactOption(fieldName, value) {
  const target = normalizeLocation(value);
  if (!target) return null;
  return (locationOptions[fieldName] || []).find((option) =>
    [option.value, option.label, ...(option.aliases || [])]
      .filter(Boolean)
      .some((candidate) => normalizeLocation(candidate) === target)
  ) || null;
}

function isThailandValue(value) {
  const normalized = normalizeLocation(value);

  return (
    normalized === "th" ||
    normalized === "ไทย" ||
    normalized.includes("ประเทศไทย") ||
    normalized.includes("thailand")
  );
}

function getLocationInput(fieldName) {
  return document.querySelector(`[data-location-field="${fieldName}"]`);
}

function getSuggestionBox(fieldName) {
  return document.querySelector(`[data-suggestions-for="${fieldName}"]`);
}

function closeSuggestionBoxes(exceptField = "") {
  document.querySelectorAll(".suggestion-box").forEach((box) => {
    if (box.dataset.suggestionsFor !== exceptField) {
      box.classList.remove("is-open");
      box.replaceChildren();
    }
  });
}

function renderSuggestions(fieldName, query = "") {
  const box = getSuggestionBox(fieldName);
  const input = getLocationInput(fieldName);
  if (!box || !input || input.disabled) return;

  const options = (locationOptions[fieldName] || [])
    .filter((option) => optionMatches(option, query))
    .slice(0, 40);

  box.replaceChildren();

  if (!options.length) {
    const message = document.createElement("span");
    message.className = "suggestion-message";
    message.textContent = "ไม่พบรายการ คุณสามารถกรอกชื่อพื้นที่เองได้";
    box.append(message);
    box.classList.add("is-open");
    return;
  }

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-item";
    button.textContent = option.label || option.value;
    button.dataset.value = option.value;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      input.value = option.value;
      void applyLocationSelection(fieldName, option, { clearChildren: true, focusNext: true });
      clearError(input);
      box.classList.remove("is-open");
      box.replaceChildren();
    });
    box.append(button);
  });

  box.classList.add("is-open");
}

function updateLocationLabels(thailandSelected) {
  const provinceLabel = document.getElementById("provinceLabel");
  const districtLabel = document.getElementById("districtLabel");
  const subdistrictLabel = document.getElementById("subdistrictLabel");

  if (provinceLabel) {
    provinceLabel.innerHTML = thailandSelected
      ? 'จังหวัด <span aria-hidden="true">*</span>'
      : 'รัฐ / จังหวัด / ภูมิภาค <span aria-hidden="true">*</span>';
  }
  if (districtLabel) {
    districtLabel.innerHTML = thailandSelected
      ? 'อำเภอ / เขต <span aria-hidden="true">*</span>'
      : 'เมือง / เขต / อำเภอ <span aria-hidden="true">*</span>';
  }
  if (subdistrictLabel) subdistrictLabel.textContent = thailandSelected ? "ตำบล / แขวง" : "พื้นที่ย่อย";
}

function clearLocationChildren(fieldName) {
  const province = getLocationInput("province");
  const district = getLocationInput("district");
  const subdistrict = getLocationInput("subdistrict");

  if (fieldName === "country") {
    if (province) province.value = "";
    if (district) district.value = "";
    if (subdistrict) subdistrict.value = "";
    locationOptions.province = [];
    locationOptions.district = [];
    locationOptions.subdistrict = [];
  }

  if (fieldName === "province") {
    if (district) district.value = "";
    if (subdistrict) subdistrict.value = "";
    locationOptions.district = [];
    locationOptions.subdistrict = [];
  }

  if (fieldName === "district") {
    if (subdistrict) subdistrict.value = "";
    locationOptions.subdistrict = [];
  }
}

async function applyLocationSelection(fieldName, option = null, settings = {}) {
  const { clearChildren = false, focusNext = false } = settings;
  const country = getLocationInput("country");
  const province = getLocationInput("province");
  const district = getLocationInput("district");
  const subdistrict = getLocationInput("subdistrict");

  if (clearChildren) clearLocationChildren(fieldName);

  if (fieldName === "country") {
    const thailandSelected = isThailandValue(option?.value || country?.value);
    updateLocationLabels(thailandSelected);

    if (province) {
      province.disabled = false;
      province.placeholder = thailandSelected
        ? "พิมพ์ชื่อจังหวัด ไทย/อังกฤษ เช่น Bangkok"
        : "พิมพ์ชื่อรัฐ จังหวัด หรือภูมิภาค";
    }

    if (thailandSelected && locationDataReady) {
      locationOptions.province = thaiLocations.map(makeThaiProvinceOption);
      if (locationStatus) locationStatus.textContent = "เลือกจังหวัด อำเภอ และตำบลจากรายการได้เหมือนหน้าสมัครสมาชิก";
    } else {
      const selectedCountry = option?.raw || findExactOption("country", country?.value)?.raw;
      const states = Array.isArray(selectedCountry?.states) ? selectedCountry.states : [];
      locationOptions.province = states.map((state, index) => ({
        value: String(state?.name || state).trim(),
        label: String(state?.name || state).trim(),
        aliases: [state?.name, state?.state_code].filter(Boolean),
        raw: state,
        id: state?.state_code || index
      })).filter((item) => item.value);
      if (locationStatus) locationStatus.textContent = locationOptions.province.length
        ? "เลือกประเทศแล้ว ระบบแสดงรัฐหรือจังหวัดที่เกี่ยวข้องให้แล้ว"
        : "ประเทศนี้ไม่มีรายการรัฐจากแหล่งข้อมูล คุณยังสามารถพิมพ์ชื่อพื้นที่เองได้";
    }
    if (district) { district.disabled = true; district.placeholder = "เลือกจังหวัดหรือรัฐก่อน"; }
    if (subdistrict) { subdistrict.disabled = true; subdistrict.placeholder = "เลือกเมืองหรืออำเภอก่อน"; }

    if (focusNext) province?.focus();
    return;
  }

  if (fieldName === "province") {
    const thailandSelected = isThailandValue(country?.value);
    if (district) {
      district.disabled = false;
      district.placeholder = thailandSelected
        ? "พิมพ์ชื่ออำเภอหรือเขต ไทย/อังกฤษ"
        : "พิมพ์ชื่อเมือง เขต หรืออำเภอ";
    }

    if (thailandSelected) {
      const matchedProvince = option?.raw || findExactOption("province", province?.value)?.raw;
      locationOptions.district = getDistricts(matchedProvince).map(makeThaiDistrictOption);
    } else {
      const selectedCountry = findExactOption("country", country?.value)?.raw;
      const selectedProvince = option?.raw || findExactOption("province", province?.value)?.raw;
      const requestId = ++worldCityRequestId;
      district.disabled = true;
      district.placeholder = "กำลังโหลดรายชื่อเมือง...";
      try {
        const cities = await loadWorldCities(selectedCountry?.name || country?.value, selectedProvince?.name || province?.value);
        if (requestId !== worldCityRequestId) return;
        locationOptions.district = cities.map((city) => ({ value: city, label: city, aliases: [city], raw: city }));
      } catch (error) {
        console.warn("World city data unavailable:", error.message);
        locationOptions.district = [];
      }
      district.disabled = false;
      district.placeholder = locationOptions.district.length ? "พิมพ์ชื่อเมือง เขต หรืออำเภอ" : "กรอกชื่อเมือง เขต หรืออำเภอ";
    }

    if (subdistrict) {
      subdistrict.disabled = true;
      subdistrict.placeholder = "เลือกอำเภอหรือเขตก่อน";
    }

    if (focusNext) district?.focus();
    return;
  }

  if (fieldName === "district") {
    const thailandSelected = isThailandValue(country?.value);
    if (subdistrict) {
      subdistrict.disabled = false;
      subdistrict.placeholder = thailandSelected
        ? "พิมพ์ชื่อตำบลหรือแขวง ไทย/อังกฤษ"
        : "กรอกพื้นที่ย่อย (ไม่บังคับ)";
    }

    if (thailandSelected) {
      const matchedDistrict = option?.raw || findExactOption("district", district?.value)?.raw;
      locationOptions.subdistrict = getSubdistricts(matchedDistrict).map(makeThaiSubdistrictOption);
    } else {
      locationOptions.subdistrict = [];
    }

    if (focusNext) subdistrict?.focus();
  }
}

function commitLocationField(fieldName) {
  const input = getLocationInput(fieldName);
  if (!input) return;

  const exact = findExactOption(fieldName, input.value);
  if (exact) {
    input.value = exact.value;
    void applyLocationSelection(fieldName, exact, { clearChildren: false, focusNext: false });
    return;
  }

  void applyLocationSelection(fieldName, null, { clearChildren: false, focusNext: false });
}

function setupLocationAutocomplete() {
  ["country", "province", "district", "subdistrict"].forEach((fieldName) => {
    const input = getLocationInput(fieldName);
    if (!input) return;

    input.addEventListener("focus", () => {
      closeSuggestionBoxes(fieldName);
      renderSuggestions(fieldName, input.value);
    });

    input.addEventListener("input", () => {
      clearError(input);
      if (fieldName !== "subdistrict") clearLocationChildren(fieldName);

      if (fieldName === "country") {
        const thailandSelected = isThailandValue(input.value);
        updateLocationLabels(thailandSelected);
        const province = getLocationInput("province");
        if (province) province.disabled = !input.value.trim();
      }

      if (fieldName === "province") {
        const district = getLocationInput("district");
        if (district) district.disabled = !input.value.trim();
      }

      if (fieldName === "district") {
        const subdistrict = getLocationInput("subdistrict");
        if (subdistrict) subdistrict.disabled = !input.value.trim();
      }

      renderSuggestions(fieldName, input.value);
    });

    input.addEventListener("change", () => commitLocationField(fieldName));
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        commitLocationField(fieldName);
        getSuggestionBox(fieldName)?.classList.remove("is-open");
      }, 100);
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".autocomplete-field")) closeSuggestionBoxes();
  });
}

function restoreLocationHierarchy() {
  const country = getLocationInput("country");
  const province = getLocationInput("province");
  const district = getLocationInput("district");
  const subdistrict = getLocationInput("subdistrict");
  if (!country) return;

  const saved = {
    province: province?.value || "",
    district: district?.value || "",
    subdistrict: subdistrict?.value || ""
  };

  applyLocationSelection("country", findExactOption("country", country.value), {
    clearChildren: false,
    focusNext: false
  });

  if (province) province.value = saved.province;
  if (saved.province) {
    const provinceOption = findExactOption("province", saved.province);
    applyLocationSelection("province", provinceOption, { clearChildren: false, focusNext: false });
  }

  if (district) district.value = saved.district;
  if (saved.district) {
    const districtOption = findExactOption("district", saved.district);
    applyLocationSelection("district", districtOption, { clearChildren: false, focusNext: false });
  }

  if (subdistrict) subdistrict.value = saved.subdistrict;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 16000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { window.clearTimeout(timer); }
}

async function loadWorldCities(countryName, stateName) {
  if (!countryName || !stateName) return [];
  const response = await fetchWithTimeout(GLOBAL_CITY_DATA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ country: countryName, state: stateName })
  });
  if (!response.ok) throw new Error(`โหลดข้อมูลเมืองไม่สำเร็จ (${response.status})`);
  const result = await response.json();
  return Array.isArray(result?.data) ? result.data : [];
}

function mergeGlobalCountries(remoteCountries) {
  const remoteByIso = new Map((Array.isArray(remoteCountries) ? remoteCountries : [])
    .map((country) => [String(country?.iso2 || "").toUpperCase(), country]));
  const remoteByName = new Map((Array.isArray(remoteCountries) ? remoteCountries : [])
    .map((country) => [normalizeLocation(country?.name), country]));
  const merged = STATIC_COUNTRIES.map((country) => {
    const remote = remoteByIso.get(country.iso2) || remoteByName.get(normalizeLocation(country.name));
    return { ...country, ...(remote || {}), name: country.name, iso2: country.iso2, iso3: country.iso3,
      states: Array.isArray(remote?.states) ? remote.states : [] };
  });
  return merged;
}

async function loadLocationData() {
  if (locationStatus) locationStatus.textContent = "กำลังเตรียมข้อมูลประเทศ จังหวัด และเมือง";
  const [thaiResult, globalResult] = await Promise.allSettled([
    fetchWithTimeout(THAILAND_DATA_URL, { headers: { Accept: "application/json" }, cache: "force-cache" }).then(async (response) => {
      if (!response.ok) throw new Error("โหลดข้อมูลพื้นที่ไทยไม่สำเร็จ");
      return response.json();
    }),
    fetchWithTimeout(GLOBAL_LOCATION_DATA_URL, { headers: { Accept: "application/json" }, cache: "force-cache" }).then(async (response) => {
      if (!response.ok) throw new Error("โหลดข้อมูลประเทศไม่สำเร็จ");
      const result = await response.json();
      return Array.isArray(result?.data) ? result.data : [];
    })
  ]);

  if (thaiResult.status === "fulfilled") {
    thaiLocations = Array.isArray(thaiResult.value) ? thaiResult.value : [];
    locationDataReady = thaiLocations.length > 0;
  }
  if (globalResult.status === "fulfilled") globalCountries = mergeGlobalCountries(globalResult.value);
  else globalCountries = mergeGlobalCountries([]);
  locationOptions.country = buildCountryOptions(globalCountries);
  await restoreLocationHierarchy();

  if (locationStatus) {
    locationStatus.textContent = "พร้อมใช้งาน: เลือกประเทศ แล้วระบบจะแสดงรัฐ จังหวัด เมือง หรืออำเภอที่เกี่ยวข้อง";
    locationStatus.classList.add("is-ready");
  }
}

async function submitProfile(event) {
  event.preventDefault();
  if (!validateStep(3)) return;

  setLoading(true);
  showStatus();

  const date = validateDate(birthDate?.value.trim() || "");
  const payload = {
    name: normalizeName(document.getElementById("name")?.value),
    username: document.getElementById("username")?.value.trim(),
    phone: getPhoneE164(),
    phone_country: phoneCountry?.value || "TH",
    birth_date: date.iso,
    nickname: document.getElementById("nickname")?.value.trim(),
    gender: document.getElementById("gender")?.value,
    contact_preference: "email",
    country: document.getElementById("country")?.value.trim(),
    province: document.getElementById("province")?.value.trim(),
    district: document.getElementById("district")?.value.trim(),
    subdistrict: document.getElementById("subdistrict")?.value.trim() || null,
    address: document.getElementById("address")?.value.trim(),
    accepted_terms: Boolean(document.getElementById("terms")?.checked)
  };

  try {
    const result = await apiRequest(PROFILE_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const stored = result.profile || {};
    sessionStorage.setItem("catmatch_user", JSON.stringify(stored));
    sessionStorage.setItem("user", JSON.stringify(stored));
    sessionStorage.removeItem("catmatch_google_identity");

    showStatus("บันทึกข้อมูลสำเร็จ กำลังพาคุณไปหน้าถัดไป...", "success");
    window.setTimeout(() => {
      window.location.replace(result.needs_interest_onboarding ? "./interests.html" : "./index.html");
    }, 650);
  } catch (error) {
    if (error.errors && typeof error.errors === "object") {
      Object.entries(error.errors).forEach(([name, message]) => {
        const fieldId = {
          phone_country: "phone",
          birth_date: "birthDate",
          accepted_terms: "terms"
        }[name] || name;
        const field = document.getElementById(fieldId);
        if (field) setError(field, String(message));
      });

      const step2Fields = new Set(["nickname", "gender", "phone", "phone_country", "birthDate", "birth_date"]);
      const step3Fields = new Set(["country", "province", "district", "subdistrict", "address", "terms", "accepted_terms"]);
      const keys = Object.keys(error.errors);

      currentStep = keys.some((key) => step3Fields.has(key))
        ? 3
        : keys.some((key) => step2Fields.has(key))
          ? 2
          : 1;
      highestStep = Math.max(highestStep, currentStep);
      renderStep({ scroll: true });
    }

    showStatus(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function bindEvents() {
  nextButton?.addEventListener("click", goNext);
  backButton?.addEventListener("click", goBack);
  form?.addEventListener("submit", submitProfile);

  indicators.forEach((indicator) => {
    indicator.addEventListener("click", () => {
      const target = Number(indicator.dataset.stepTarget);
      if (target <= highestStep) {
        currentStep = target;
        renderStep({ scroll: true });
      }
    });
  });

  form?.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => {
      clearError(field);
      showStatus();
    });

    field.addEventListener("blur", () => {
      if (!field.readOnly && !field.dataset.locationField) {
        validateField(field);
      }
    });
  });

  ["name", "username"].forEach((fieldName) => {
    document.getElementById(fieldName)?.addEventListener("input", () => scheduleAvailability(fieldName));
  });

  phoneInput?.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });
  phoneCountry?.addEventListener("change", updateDialCode);


  form?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA" && currentStep < steps.length) {
      event.preventDefault();
      goNext();
    }
  });

  document.getElementById("cancelGoogleOnboarding")?.addEventListener("click", async () => {
    clearAuthentication();
    try {
      await window.catmatchFirebase?.signOut?.();
    } catch {
      // The local session is already cleared, so sign-out failure must not trap the user.
    }
    window.location.replace("./login.html");
  });

  document.getElementById("menuToggle")?.addEventListener("click", (event) => {
    const nav = document.querySelector(".main-nav");
    const open = nav?.classList.toggle("is-open") || false;
    event.currentTarget.classList.toggle("is-open", open);
    event.currentTarget.setAttribute("aria-expanded", String(open));
  });

  window.addEventListener("scroll", () => {
    document.getElementById("siteHeader")?.classList.toggle("is-scrolled", window.scrollY > 16);
  }, { passive: true });
}


function initialize() {
  updateDialCode();
  renderGoogleIdentity();

  // ผูกปุ่มและ validation ก่อนส่วนเสริมทั้งหมด เพื่อให้ปุ่ม “ถัดไป” แสดง error ได้เสมอ
  // แม้ปฏิทินหรือข้อมูลที่อยู่จากภายนอกโหลดไม่สำเร็จ
  bindEvents();
  renderStep();
  if (nextButton) nextButton.disabled = false;

  try {
    setupBirthDatePicker();
  } catch (error) {
    console.error("Birth date picker initialization failed:", error);
  }

  try {
    setupLocationAutocomplete();
  } catch (error) {
    console.error("Location autocomplete initialization failed:", error);
  }

  void hydrateGoogleIdentity();

  Promise.allSettled([loadLocationData(), loadProfile()]).then(() => {
    try {
      restoreLocationHierarchy();
    } catch (error) {
      console.error("Location hierarchy restoration failed:", error);
    }
    renderGoogleIdentity();
  });
}
initialize();
(() => {
  "use strict";

  const form = document.getElementById("googleOnboardingForm");
  const nextButton = document.getElementById("nextButton");
  const formStatus = document.getElementById("formStatus");

  const emailInput = document.getElementById("email");
  const googleAccountName = document.getElementById("googleAccountName");
  const googleAccountEmail = document.getElementById("googleAccountEmail");
  const googleAvatar = document.getElementById("googleAvatar");
  const nameInput = document.getElementById("name");

  if (!form || !nextButton) return;

  /* อีเมล Google ต้องมีเสมอ แม้ว่าจะเป็น readonly */
  if (emailInput) {
    emailInput.required = true;
    emailInput.removeAttribute("placeholder");
  }

  /* ป้องกัน CSS เก่าทำให้ข้อความ Error ไม่ปรากฏ */
  const hotfixStyle = document.createElement("style");
  hotfixStyle.textContent = `
    .google-onboarding-page .form-status.is-visible {
      display: block !important;
      margin-bottom: 22px !important;
      padding: 14px 16px !important;
      border-radius: 17px !important;
    }

    .google-onboarding-page .form-status.is-error {
      border: 1px solid rgba(221, 103, 103, .32) !important;
      background: rgba(255, 239, 239, .92) !important;
      color: #c35d5d !important;
    }

    .google-onboarding-page .input-shell.is-invalid,
    .google-onboarding-page textarea.is-invalid,
    .google-onboarding-page .consent-check.is-invalid {
      border-color: #ed7777 !important;
      box-shadow: 0 0 0 4px rgba(237, 119, 119, .09) !important;
    }

    .google-onboarding-page .field-error {
      display: block !important;
      min-height: 18px !important;
      margin-top: 6px !important;
      color: #e06767 !important;
      font-size: .78rem !important;
    }

    .google-onboarding-page #googleAccountEmail.account-load-error {
      color: #c35d5d !important;
    }
  `;
  document.head.appendChild(hotfixStyle);

  function showTopError(message) {
    if (!formStatus) return;

    formStatus.textContent = message;
    formStatus.className = "form-status is-visible is-error";
    formStatus.hidden = false;
  }

  function clearTopError() {
    if (!formStatus) return;

    formStatus.textContent = "";
    formStatus.className = "form-status";
    formStatus.hidden = true;
  }

  function setFieldError(field, message = "") {
    if (!field?.id) return;

    const control =
      field.closest(".input-shell") ||
      field.closest(".consent-check") ||
      field;

    control.classList.toggle("is-invalid", Boolean(message));
    control.classList.remove("is-valid");

    field.setAttribute("aria-invalid", message ? "true" : "false");

    const errorBox = document.querySelector(
      `[data-error-for="${field.id}"]`
    );

    if (errorBox) {
      errorBox.textContent = message;
    }
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      String(value || "").trim()
    );
  }

  function parseStoredValue(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function getStoredIdentity() {
    const storages = [sessionStorage, localStorage];
    const keys = [
      "catmatch_google_identity",
      "catmatch_user",
      "user"
    ];

    for (const storage of storages) {
      for (const key of keys) {
        const value = parseStoredValue(storage, key);

        if (!value) continue;

        const email =
          value.email ||
          value.google_email ||
          value.profile?.email ||
          "";

        if (!validEmail(email)) continue;

        return {
          displayName:
            value.displayName ||
            value.name ||
            value.profile?.name ||
            "",
          email,
          photoURL:
            value.photoURL ||
            value.picture ||
            value.avatar ||
            value.profile?.photoURL ||
            ""
        };
      }
    }

    return null;
  }

  function getFirebaseAuth() {
    if (window.catmatchFirebase?.auth) {
      return window.catmatchFirebase.auth;
    }

    if (window.firebase?.auth) {
      return window.firebase.auth();
    }

    return null;
  }

  function identityFromFirebaseUser(user) {
    if (!user) return null;

    const googleProvider = Array.isArray(user.providerData)
      ? user.providerData.find(
          (provider) => provider?.providerId === "google.com"
        )
      : null;

    const email =
      googleProvider?.email ||
      user.email ||
      "";

    if (!validEmail(email)) return null;

    return {
      displayName:
        googleProvider?.displayName ||
        user.displayName ||
        "",
      email,
      photoURL:
        googleProvider?.photoURL ||
        user.photoURL ||
        ""
    };
  }

  function applyGoogleIdentity(identity) {
    if (!identity || !validEmail(identity.email)) {
      return false;
    }

    const displayName =
      String(identity.displayName || "").trim() ||
      identity.email.split("@")[0];

    const email = identity.email.trim().toLowerCase();

    if (googleAccountName) {
      googleAccountName.textContent = displayName;
    }

    if (googleAccountEmail) {
      googleAccountEmail.textContent = email;
      googleAccountEmail.classList.remove("account-load-error");
    }

    if (emailInput) {
      emailInput.value = email;
      setFieldError(emailInput);
    }

    /* เติมชื่อในฟอร์มเฉพาะกรณีเป็นภาษาอังกฤษตามเงื่อนไข */
    if (
      nameInput &&
      !nameInput.value.trim() &&
      /^[A-Za-z]+(?:[ '-][A-Za-z]+)+$/.test(displayName)
    ) {
      nameInput.value = displayName;
    }

    if (googleAvatar && identity.photoURL) {
      let image = googleAvatar.querySelector("img");

      if (!image) {
        image = document.createElement("img");
        image.alt = "";
        image.referrerPolicy = "no-referrer";
        googleAvatar.replaceChildren(image);
      }

      image.src = identity.photoURL;
    }

    sessionStorage.setItem(
      "catmatch_google_identity",
      JSON.stringify({
        displayName,
        email,
        photoURL: identity.photoURL || ""
      })
    );

    return true;
  }

  function showMissingGoogleEmail() {
    if (emailInput?.value && validEmail(emailInput.value)) return;

    if (googleAccountEmail) {
      googleAccountEmail.textContent =
        "ไม่พบอีเมลจากบัญชี Google";
      googleAccountEmail.classList.add("account-load-error");
    }
  }

  /* ใช้ Session ก่อน เพื่อให้ข้อมูลขึ้นโดยไม่ต้องรอ API */
  applyGoogleIdentity(getStoredIdentity());

  /* จากนั้นใช้ข้อมูลจริงจาก Firebase Authentication */
  const auth = getFirebaseAuth();

  if (auth?.currentUser) {
    applyGoogleIdentity(
      identityFromFirebaseUser(auth.currentUser)
    );
  }

  if (typeof auth?.onAuthStateChanged === "function") {
    auth.onAuthStateChanged((user) => {
      if (user) {
        applyGoogleIdentity(identityFromFirebaseUser(user));
      } else {
        showMissingGoogleEmail();
      }
    });
  }

  /*
   * loadProfile เดิมปิดปุ่มถัดไปไว้ระหว่างรอ API
   * จึงต้องปลดปุ่มเพื่อให้กดแล้วแสดง Error ได้ทันที
   */
  function unlockNextButton() {
    if (!nextButton.hidden) {
      nextButton.disabled = false;
      nextButton.removeAttribute("aria-disabled");
    }
  }

  unlockNextButton();

  const buttonObserver = new MutationObserver(() => {
    unlockNextButton();
  });

  buttonObserver.observe(nextButton, {
    attributes: true,
    attributeFilter: ["disabled", "hidden"]
  });

  /*
   * คอยเติมข้อมูลกลับ หาก API เก่าเขียนค่าว่างทับข้อมูล Firebase
   */
  let refreshCount = 0;

  const identityRefreshTimer = window.setInterval(() => {
    unlockNextButton();

    const firebaseIdentity = identityFromFirebaseUser(
      getFirebaseAuth()?.currentUser
    );

    const identity =
      firebaseIdentity ||
      getStoredIdentity();

    if (identity) {
      applyGoogleIdentity(identity);
    }

    refreshCount += 1;

    if (
      refreshCount >= 80 &&
      validEmail(emailInput?.value)
    ) {
      window.clearInterval(identityRefreshTimer);
    }
  }, 250);

  function validateActiveStep(event) {
    const activeStep = form.querySelector(
      ".form-step.is-active"
    );

    if (!activeStep) return;

    let firstInvalid = null;

    const fields = [
      ...activeStep.querySelectorAll(
        "input, select, textarea"
      )
    ].filter(
      (field) =>
        field.id !== "birthDateNative" &&
        !field.disabled &&
        (!field.readOnly || field.id === "email")
    );

    fields.forEach((field) => {
      let message = "";
      const value = String(field.value || "").trim();

      if (field.type === "checkbox") {
        if (field.required && !field.checked) {
          message =
            "กรุณายอมรับข้อกำหนดก่อนบันทึก";
        }
      } else if (field.required && !value) {
        message =
          field.id === "email"
            ? "ไม่พบอีเมลจากบัญชี Google กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วย Google ใหม่"
            : "กรุณากรอกข้อมูลช่องนี้";
      } else if (
        field.id === "email" &&
        !validEmail(value)
      ) {
        message =
          "ไม่พบอีเมลจากบัญชี Google กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วย Google ใหม่";
      } else if (
        field.id === "name" &&
        value &&
        !/^[A-Za-z]+(?:[ '-][A-Za-z]+)+$/.test(value)
      ) {
        message =
          "กรุณากรอกชื่อและนามสกุลด้วยตัวอักษรภาษาอังกฤษ";
      } else if (
        field.id === "username" &&
        value &&
        !/^[A-Za-z][A-Za-z0-9_]{9}$/.test(value)
      ) {
        message =
          "ชื่อผู้ใช้งานต้องมี 10 ตัวพอดี และขึ้นต้นด้วยตัวอักษรอังกฤษ";
      } else if (
        field.id === "nickname" &&
        value &&
        !/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(value)
      ) {
        message =
          "กรุณากรอกชื่อเล่นด้วยตัวอักษรภาษาอังกฤษ";
      } else if (
        field.id === "phone" &&
        value.replace(/\D/g, "").length < 6
      ) {
        message =
          "กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง";
      } else if (
        field.id === "birthDate" &&
        value &&
        !/^\d{2}\/\d{2}\/\d{4}$/.test(value)
      ) {
        message =
          "กรุณากรอกวันเกิดรูปแบบ dd/mm/yyyy";
      } else if (
        field.id === "address" &&
        value &&
        value.length < 5
      ) {
        message =
          "กรุณากรอกรายละเอียดที่อยู่อย่างน้อย 5 ตัวอักษร";
      }

      setFieldError(field, message);

      if (message && !firstInvalid) {
        firstInvalid = field;
      }
    });

    if (!firstInvalid) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    showTopError(
      "กรุณาตรวจสอบข้อมูลที่ยังไม่ครบหรือไม่ถูกต้อง"
    );

    formStatus?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    window.setTimeout(() => {
      firstInvalid.focus();
    }, 250);
  }

  /*
   * ใช้ capture=true เพื่อให้ตรวจข้อมูลก่อน Event เดิม
   */
  nextButton.addEventListener(
    "click",
    validateActiveStep,
    true
  );

  form.addEventListener(
    "input",
    (event) => {
      const field = event.target;

      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
      ) {
        setFieldError(field);
        clearTopError();
      }
    },
    true
  );
})();
/* =========================================================
   CATMATCH GOOGLE ONBOARDING — ADDRESS & LEGAL PATCH V9
   - แสดงประเทศครบทั้งหมด
   - ใช้ Cache เดียวกับหน้าสมัครสมาชิก
   - ประเทศไทยแสดงจังหวัด/อำเภอ/ตำบลภาษาไทย
   - ประเทศอื่นแสดงรัฐและเมืองภาษาอังกฤษ
   - เก็บข้อมูลและขั้นตอนเมื่อเปิดหน้ากฎหมาย
========================================================= */

function readGoogleLocationCache(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeGoogleLocationCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache เป็นส่วนเสริม หน้าเว็บยังทำงานต่อได้
  }
}

/*
 * ประเทศไทยแสดงชื่อภาษาไทย
 * แต่ยังค้นหาด้วยชื่ออังกฤษและรหัสไปรษณีย์ได้
 */
function makeThaiProvinceOption(province) {
  const thai = String(
    province?.name_th || province?.name || ""
  ).trim();

  const english = String(
    province?.name_en || ""
  ).trim();

  return {
    value: thai || english,
    label: thai || english,
    aliases: [
      thai,
      english,
      province?.name
    ].filter(Boolean),
    raw: province
  };
}

function makeThaiDistrictOption(district) {
  const thai = String(
    district?.name_th || district?.name || ""
  ).trim();

  const english = String(
    district?.name_en || ""
  ).trim();

  return {
    value: thai || english,
    label: thai || english,
    aliases: [
      thai,
      english,
      district?.name
    ].filter(Boolean),
    raw: district
  };
}

function makeThaiSubdistrictOption(subdistrict) {
  const thai = String(
    subdistrict?.name_th || subdistrict?.name || ""
  ).trim();

  const english = String(
    subdistrict?.name_en || ""
  ).trim();

  return {
    value: thai || english,
    label: thai || english,
    aliases: [
      thai,
      english,
      subdistrict?.name,
      subdistrict?.zip_code
    ].filter(Boolean),
    raw: subdistrict
  };
}

/*
 * ประเทศต้องแสดงครบ ไม่ตัดเหลือ 40 ประเทศ
 * จังหวัด/เมืองจำกัดไว้เพื่อไม่ให้กล่องยาวและช้าเกินไป
 */
function renderSuggestions(fieldName, query = "") {
  const box = getSuggestionBox(fieldName);
  const input = getLocationInput(fieldName);

  if (!box || !input || input.disabled) return;

  const matchedOptions = (
    locationOptions[fieldName] || []
  ).filter((option) => optionMatches(option, query));

  const options =
    fieldName === "country"
      ? matchedOptions
      : matchedOptions.slice(0, 80);

  box.replaceChildren();

  if (!options.length) {
    const message = document.createElement("span");

    message.className = "suggestion-message";

    message.textContent =
      fieldName === "country"
        ? "ไม่พบประเทศ กรุณาตรวจสอบชื่อประเทศอีกครั้ง"
        : "ไม่พบรายการ คุณสามารถกรอกชื่อพื้นที่เองได้";

    box.append(message);
    box.classList.add("is-open");
    return;
  }

  options.forEach((option) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "suggestion-item";
    button.textContent = option.label || option.value;
    button.dataset.value = option.value;

    button.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();

        input.value = option.value;

        void applyLocationSelection(
          fieldName,
          option,
          {
            clearChildren: true,
            focusNext: true
          }
        );

        clearError(input);
        box.classList.remove("is-open");
        box.replaceChildren();
      }
    );

    box.append(button);
  });

  box.classList.add("is-open");
}

/*
 * ใช้ Cache เมืองเดียวกับ register.js
 */
async function loadWorldCities(countryName, stateName) {
  if (!countryName || !stateName) return [];

  const cacheKey =
    `catmatch_global_city_v1:${countryName}|${stateName}`;

  const cached =
    readGoogleLocationCache(cacheKey);

  if (Array.isArray(cached)) {
    return cached;
  }

  const response = await fetchWithTimeout(
    GLOBAL_CITY_DATA_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        country: countryName,
        state: stateName
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `โหลดข้อมูลเมืองไม่สำเร็จ (${response.status})`
    );
  }

  const result = await response.json();

  const cities =
    Array.isArray(result?.data)
      ? result.data
      : [];

  writeGoogleLocationCache(cacheKey, cities);

  return cities;
}

/*
 * โหลดข้อมูลเหมือน register.js:
 * - ประเทศครบจาก STATIC_COUNTRIES เสมอ
 * - ใช้ Cache ถ้ามี
 * - ถ้าไม่มี Cache จึงเรียก API
 */
async function loadLocationData() {
  if (locationStatus) {
    locationStatus.textContent =
      "กำลังเตรียมข้อมูลประเทศ จังหวัด และเมือง";
    locationStatus.classList.remove(
      "is-ready",
      "is-error"
    );
  }

  const cachedThailand =
    readGoogleLocationCache(
      "catmatch_thailand_locations_v3"
    );

  const cachedGlobal =
    readGoogleLocationCache(
      "catmatch_global_locations_v2"
    );

  /*
   * แสดงรายชื่อประเทศทั้งหมดทันที
   * ไม่ต้องรอ API ประเทศ
   */
  if (
    Array.isArray(cachedGlobal) &&
    cachedGlobal.length
  ) {
    globalCountries =
      mergeGlobalCountries(cachedGlobal);
  } else {
    globalCountries =
      mergeGlobalCountries([]);
  }

  locationOptions.country =
    buildCountryOptions(globalCountries);

  if (
    Array.isArray(cachedThailand) &&
    cachedThailand.length
  ) {
    thaiLocations = cachedThailand;
    locationDataReady = true;
  }

  const thailandPromise =
    locationDataReady
      ? Promise.resolve(thaiLocations)
      : fetchWithTimeout(
          THAILAND_DATA_URL,
          {
            headers: {
              Accept: "application/json"
            },
            cache: "force-cache"
          }
        ).then(async (response) => {
          if (!response.ok) {
            throw new Error(
              "โหลดข้อมูลพื้นที่ไทยไม่สำเร็จ"
            );
          }

          return response.json();
        });

  const globalPromise =
    Array.isArray(cachedGlobal) &&
    cachedGlobal.length
      ? Promise.resolve(cachedGlobal)
      : fetchWithTimeout(
          GLOBAL_LOCATION_DATA_URL,
          {
            headers: {
              Accept: "application/json"
            },
            cache: "force-cache"
          }
        ).then(async (response) => {
          if (!response.ok) {
            throw new Error(
              "โหลดข้อมูลประเทศไม่สำเร็จ"
            );
          }

          const result = await response.json();

          return Array.isArray(result?.data)
            ? result.data
            : [];
        });

  const [thailandResult, globalResult] =
    await Promise.allSettled([
      thailandPromise,
      globalPromise
    ]);

  if (
    thailandResult.status === "fulfilled" &&
    Array.isArray(thailandResult.value) &&
    thailandResult.value.length
  ) {
    thaiLocations = thailandResult.value;
    locationDataReady = true;

    writeGoogleLocationCache(
      "catmatch_thailand_locations_v3",
      thaiLocations
    );
  }

  if (
    globalResult.status === "fulfilled" &&
    Array.isArray(globalResult.value)
  ) {
    globalCountries =
      mergeGlobalCountries(globalResult.value);

    writeGoogleLocationCache(
      "catmatch_global_locations_v2",
      globalResult.value
    );
  } else {
    globalCountries =
      mergeGlobalCountries(
        Array.isArray(cachedGlobal)
          ? cachedGlobal
          : []
      );
  }

  locationOptions.country =
    buildCountryOptions(globalCountries);

  await restoreLocationHierarchy();

  if (locationStatus) {
    locationStatus.textContent =
      locationDataReady
        ? "พร้อมใช้งาน: ประเทศไทยเลือกจังหวัด อำเภอ และตำบลเป็นภาษาไทย ประเทศอื่นเลือกพื้นที่เป็นภาษาอังกฤษ"
        : "รายชื่อประเทศพร้อมใช้งาน หากพื้นที่ไม่มีในรายการสามารถกรอกเองได้";

    locationStatus.classList.add("is-ready");
    locationStatus.classList.remove("is-error");
  }
}

/*
 * บันทึกฟอร์ม Google onboarding เมื่อเปิดหน้า
 * ข้อกำหนดหรือนโยบายความเป็นส่วนตัว
 */
(() => {
  "use strict";

  const draftKey =
    "catmatch_google_onboarding_draft_v1";

  function saveGoogleOnboardingDraft() {
    if (!form) return;

    const values = {};

    form
      .querySelectorAll(
        "input, select, textarea"
      )
      .forEach((field) => {
        if (!field.name) return;

        if (field.type === "checkbox") {
          values[field.name] =
            field.checked;
          return;
        }

        if (field.type === "radio") {
          if (field.checked) {
            values[field.name] =
              field.value;
          }

          return;
        }

        values[field.name] =
          field.value;
      });

    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          values,
          currentStep,
          highestStep,
          savedAt: Date.now()
        })
      );
    } catch {
      // Session Storage ถูกปิดก็ไม่ทำให้หน้าเสีย
    }
  }

  function restoreGoogleOnboardingDraft() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    if (params.get("restore") !== "1") {
      return;
    }

    let draft = null;

    try {
      draft = JSON.parse(
        sessionStorage.getItem(draftKey) ||
        "null"
      );
    } catch {
      draft = null;
    }

    if (!draft?.values || !form) {
      return;
    }

    Object.entries(draft.values)
      .forEach(([name, value]) => {
        const fields = [
          ...form.querySelectorAll(
            `[name="${CSS.escape(name)}"]`
          )
        ];

        fields.forEach((field) => {
          if (field.type === "checkbox") {
            field.checked = Boolean(value);
          } else if (
            field.type === "radio"
          ) {
            field.checked =
              field.value === value;
          } else {
            field.value = value ?? "";
          }
        });
      });

    /*
     * กลับมาหน้ากรอกที่อยู่เสมอ
     */
    currentStep = 3;
    highestStep = 3;

    renderStep();

    /*
     * รอข้อมูลประเทศและจังหวัดโหลดก่อน
     * แล้วจึงสร้างลำดับจังหวัด–อำเภอ–ตำบลกลับมา
     */
    let restoreAttempt = 0;

    const restoreTimer =
      window.setInterval(() => {
        void restoreLocationHierarchy();

        restoreAttempt += 1;

        if (
          restoreAttempt >= 40 ||
          locationOptions.country.length > 100
        ) {
          window.clearInterval(
            restoreTimer
          );

          renderStep({
            scroll: true
          });
        }
      }, 250);

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  document
    .querySelectorAll(
      "[data-legal-link]"
    )
    .forEach((link) => {
      link.addEventListener(
        "click",
        saveGoogleOnboardingDraft
      );
    });

  window.addEventListener(
    "pagehide",
    saveGoogleOnboardingDraft
  );

  restoreGoogleOnboardingDraft();
})();