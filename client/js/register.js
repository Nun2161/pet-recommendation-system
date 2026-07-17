const API_BASE_URL = "http://localhost:3000/api";
const REGISTER_ENDPOINT = `${API_BASE_URL}/auth/register`;
const AVAILABILITY_ENDPOINT = `${API_BASE_URL}/auth/check-availability`;
const HOME_PAGE = "./index.html";
const REGISTER_DRAFT_KEY = "catmatch_register_draft_v1";
const DRAFT_EXCLUDED_FIELDS = new Set(["password", "confirmPassword"]);

const COMMON_PASSWORDS = new Set([
  "password", "password123", "password123!", "qwerty", "qwerty123",
  "qwerty123!", "admin123", "admin123!", "welcome123", "welcome123!",
  "letmein123", "catmatch123", "catmatch123!", "1234567890", "abcd1234"
]);

const form = document.getElementById("registerForm");
const steps = [...document.querySelectorAll(".form-step")];
const indicators = [...document.querySelectorAll(".step-indicator")];
const progress = document.getElementById("stepperProgress");
const backButton = document.getElementById("backButton");
const nextButton = document.getElementById("nextButton");
const submitButton = document.getElementById("submitButton");
const formStatus = document.getElementById("formStatus");
const successModal = document.getElementById("successModal");

let currentStep = 1;
let highestStep = 1;
const availabilityTimers = new Map();
const availabilityState = {
  name: null,
  username: null,
  email: null
};

const THAILAND_LOCATION_DATA_URL =
  "https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province_with_district_and_sub_district.json";
const GLOBAL_LOCATION_DATA_URL =
  "https://countriesnow.space/api/v0.1/countries/states";
const GLOBAL_CITY_DATA_URL =
  "https://countriesnow.space/api/v0.1/countries/state/cities";

const STATIC_COUNTRIES = Object.freeze([{"name":"Afghanistan","iso2":"AF","iso3":"AFG","states":[]},{"name":"Albania","iso2":"AL","iso3":"ALB","states":[]},{"name":"Algeria","iso2":"DZ","iso3":"DZA","states":[]},{"name":"American Samoa","iso2":"AS","iso3":"ASM","states":[]},{"name":"Andorra","iso2":"AD","iso3":"AND","states":[]},{"name":"Angola","iso2":"AO","iso3":"AGO","states":[]},{"name":"Anguilla","iso2":"AI","iso3":"AIA","states":[]},{"name":"Antarctica","iso2":"AQ","iso3":"ATA","states":[]},{"name":"Antigua and Barbuda","iso2":"AG","iso3":"ATG","states":[]},{"name":"Argentina","iso2":"AR","iso3":"ARG","states":[]},{"name":"Armenia","iso2":"AM","iso3":"ARM","states":[]},{"name":"Aruba","iso2":"AW","iso3":"ABW","states":[]},{"name":"Australia","iso2":"AU","iso3":"AUS","states":[]},{"name":"Austria","iso2":"AT","iso3":"AUT","states":[]},{"name":"Azerbaijan","iso2":"AZ","iso3":"AZE","states":[]},{"name":"Bahamas","iso2":"BS","iso3":"BHS","states":[]},{"name":"Bahrain","iso2":"BH","iso3":"BHR","states":[]},{"name":"Bangladesh","iso2":"BD","iso3":"BGD","states":[]},{"name":"Barbados","iso2":"BB","iso3":"BRB","states":[]},{"name":"Belarus","iso2":"BY","iso3":"BLR","states":[]},{"name":"Belgium","iso2":"BE","iso3":"BEL","states":[]},{"name":"Belize","iso2":"BZ","iso3":"BLZ","states":[]},{"name":"Benin","iso2":"BJ","iso3":"BEN","states":[]},{"name":"Bermuda","iso2":"BM","iso3":"BMU","states":[]},{"name":"Bhutan","iso2":"BT","iso3":"BTN","states":[]},{"name":"Bolivia, Plurinational State of","iso2":"BO","iso3":"BOL","states":[]},{"name":"Bonaire, Sint Eustatius and Saba","iso2":"BQ","iso3":"BES","states":[]},{"name":"Bosnia and Herzegovina","iso2":"BA","iso3":"BIH","states":[]},{"name":"Botswana","iso2":"BW","iso3":"BWA","states":[]},{"name":"Bouvet Island","iso2":"BV","iso3":"BVT","states":[]},{"name":"Brazil","iso2":"BR","iso3":"BRA","states":[]},{"name":"British Indian Ocean Territory","iso2":"IO","iso3":"IOT","states":[]},{"name":"Brunei Darussalam","iso2":"BN","iso3":"BRN","states":[]},{"name":"Bulgaria","iso2":"BG","iso3":"BGR","states":[]},{"name":"Burkina Faso","iso2":"BF","iso3":"BFA","states":[]},{"name":"Burundi","iso2":"BI","iso3":"BDI","states":[]},{"name":"Cabo Verde","iso2":"CV","iso3":"CPV","states":[]},{"name":"Cambodia","iso2":"KH","iso3":"KHM","states":[]},{"name":"Cameroon","iso2":"CM","iso3":"CMR","states":[]},{"name":"Canada","iso2":"CA","iso3":"CAN","states":[]},{"name":"Cayman Islands","iso2":"KY","iso3":"CYM","states":[]},{"name":"Central African Republic","iso2":"CF","iso3":"CAF","states":[]},{"name":"Chad","iso2":"TD","iso3":"TCD","states":[]},{"name":"Chile","iso2":"CL","iso3":"CHL","states":[]},{"name":"China","iso2":"CN","iso3":"CHN","states":[]},{"name":"Christmas Island","iso2":"CX","iso3":"CXR","states":[]},{"name":"Cocos (Keeling) Islands","iso2":"CC","iso3":"CCK","states":[]},{"name":"Colombia","iso2":"CO","iso3":"COL","states":[]},{"name":"Comoros","iso2":"KM","iso3":"COM","states":[]},{"name":"Congo","iso2":"CG","iso3":"COG","states":[]},{"name":"Congo, The Democratic Republic of the","iso2":"CD","iso3":"COD","states":[]},{"name":"Cook Islands","iso2":"CK","iso3":"COK","states":[]},{"name":"Costa Rica","iso2":"CR","iso3":"CRI","states":[]},{"name":"Croatia","iso2":"HR","iso3":"HRV","states":[]},{"name":"Cuba","iso2":"CU","iso3":"CUB","states":[]},{"name":"Curaçao","iso2":"CW","iso3":"CUW","states":[]},{"name":"Cyprus","iso2":"CY","iso3":"CYP","states":[]},{"name":"Czechia","iso2":"CZ","iso3":"CZE","states":[]},{"name":"Côte d'Ivoire","iso2":"CI","iso3":"CIV","states":[]},{"name":"Denmark","iso2":"DK","iso3":"DNK","states":[]},{"name":"Djibouti","iso2":"DJ","iso3":"DJI","states":[]},{"name":"Dominica","iso2":"DM","iso3":"DMA","states":[]},{"name":"Dominican Republic","iso2":"DO","iso3":"DOM","states":[]},{"name":"Ecuador","iso2":"EC","iso3":"ECU","states":[]},{"name":"Egypt","iso2":"EG","iso3":"EGY","states":[]},{"name":"El Salvador","iso2":"SV","iso3":"SLV","states":[]},{"name":"Equatorial Guinea","iso2":"GQ","iso3":"GNQ","states":[]},{"name":"Eritrea","iso2":"ER","iso3":"ERI","states":[]},{"name":"Estonia","iso2":"EE","iso3":"EST","states":[]},{"name":"Eswatini","iso2":"SZ","iso3":"SWZ","states":[]},{"name":"Ethiopia","iso2":"ET","iso3":"ETH","states":[]},{"name":"Falkland Islands (Malvinas)","iso2":"FK","iso3":"FLK","states":[]},{"name":"Faroe Islands","iso2":"FO","iso3":"FRO","states":[]},{"name":"Fiji","iso2":"FJ","iso3":"FJI","states":[]},{"name":"Finland","iso2":"FI","iso3":"FIN","states":[]},{"name":"France","iso2":"FR","iso3":"FRA","states":[]},{"name":"French Guiana","iso2":"GF","iso3":"GUF","states":[]},{"name":"French Polynesia","iso2":"PF","iso3":"PYF","states":[]},{"name":"French Southern Territories","iso2":"TF","iso3":"ATF","states":[]},{"name":"Gabon","iso2":"GA","iso3":"GAB","states":[]},{"name":"Gambia","iso2":"GM","iso3":"GMB","states":[]},{"name":"Georgia","iso2":"GE","iso3":"GEO","states":[]},{"name":"Germany","iso2":"DE","iso3":"DEU","states":[]},{"name":"Ghana","iso2":"GH","iso3":"GHA","states":[]},{"name":"Gibraltar","iso2":"GI","iso3":"GIB","states":[]},{"name":"Greece","iso2":"GR","iso3":"GRC","states":[]},{"name":"Greenland","iso2":"GL","iso3":"GRL","states":[]},{"name":"Grenada","iso2":"GD","iso3":"GRD","states":[]},{"name":"Guadeloupe","iso2":"GP","iso3":"GLP","states":[]},{"name":"Guam","iso2":"GU","iso3":"GUM","states":[]},{"name":"Guatemala","iso2":"GT","iso3":"GTM","states":[]},{"name":"Guernsey","iso2":"GG","iso3":"GGY","states":[]},{"name":"Guinea","iso2":"GN","iso3":"GIN","states":[]},{"name":"Guinea-Bissau","iso2":"GW","iso3":"GNB","states":[]},{"name":"Guyana","iso2":"GY","iso3":"GUY","states":[]},{"name":"Haiti","iso2":"HT","iso3":"HTI","states":[]},{"name":"Heard Island and McDonald Islands","iso2":"HM","iso3":"HMD","states":[]},{"name":"Holy See (Vatican City State)","iso2":"VA","iso3":"VAT","states":[]},{"name":"Honduras","iso2":"HN","iso3":"HND","states":[]},{"name":"Hong Kong","iso2":"HK","iso3":"HKG","states":[]},{"name":"Hungary","iso2":"HU","iso3":"HUN","states":[]},{"name":"Iceland","iso2":"IS","iso3":"ISL","states":[]},{"name":"India","iso2":"IN","iso3":"IND","states":[]},{"name":"Indonesia","iso2":"ID","iso3":"IDN","states":[]},{"name":"Iran, Islamic Republic of","iso2":"IR","iso3":"IRN","states":[]},{"name":"Iraq","iso2":"IQ","iso3":"IRQ","states":[]},{"name":"Ireland","iso2":"IE","iso3":"IRL","states":[]},{"name":"Isle of Man","iso2":"IM","iso3":"IMN","states":[]},{"name":"Israel","iso2":"IL","iso3":"ISR","states":[]},{"name":"Italy","iso2":"IT","iso3":"ITA","states":[]},{"name":"Jamaica","iso2":"JM","iso3":"JAM","states":[]},{"name":"Japan","iso2":"JP","iso3":"JPN","states":[]},{"name":"Jersey","iso2":"JE","iso3":"JEY","states":[]},{"name":"Jordan","iso2":"JO","iso3":"JOR","states":[]},{"name":"Kazakhstan","iso2":"KZ","iso3":"KAZ","states":[]},{"name":"Kenya","iso2":"KE","iso3":"KEN","states":[]},{"name":"Kiribati","iso2":"KI","iso3":"KIR","states":[]},{"name":"Korea, Democratic People's Republic of","iso2":"KP","iso3":"PRK","states":[]},{"name":"Korea, Republic of","iso2":"KR","iso3":"KOR","states":[]},{"name":"Kosovo","iso2":"XK","iso3":"XKX","states":[]},{"name":"Kuwait","iso2":"KW","iso3":"KWT","states":[]},{"name":"Kyrgyzstan","iso2":"KG","iso3":"KGZ","states":[]},{"name":"Lao People's Democratic Republic","iso2":"LA","iso3":"LAO","states":[]},{"name":"Latvia","iso2":"LV","iso3":"LVA","states":[]},{"name":"Lebanon","iso2":"LB","iso3":"LBN","states":[]},{"name":"Lesotho","iso2":"LS","iso3":"LSO","states":[]},{"name":"Liberia","iso2":"LR","iso3":"LBR","states":[]},{"name":"Libya","iso2":"LY","iso3":"LBY","states":[]},{"name":"Liechtenstein","iso2":"LI","iso3":"LIE","states":[]},{"name":"Lithuania","iso2":"LT","iso3":"LTU","states":[]},{"name":"Luxembourg","iso2":"LU","iso3":"LUX","states":[]},{"name":"Macao","iso2":"MO","iso3":"MAC","states":[]},{"name":"Madagascar","iso2":"MG","iso3":"MDG","states":[]},{"name":"Malawi","iso2":"MW","iso3":"MWI","states":[]},{"name":"Malaysia","iso2":"MY","iso3":"MYS","states":[]},{"name":"Maldives","iso2":"MV","iso3":"MDV","states":[]},{"name":"Mali","iso2":"ML","iso3":"MLI","states":[]},{"name":"Malta","iso2":"MT","iso3":"MLT","states":[]},{"name":"Marshall Islands","iso2":"MH","iso3":"MHL","states":[]},{"name":"Martinique","iso2":"MQ","iso3":"MTQ","states":[]},{"name":"Mauritania","iso2":"MR","iso3":"MRT","states":[]},{"name":"Mauritius","iso2":"MU","iso3":"MUS","states":[]},{"name":"Mayotte","iso2":"YT","iso3":"MYT","states":[]},{"name":"Mexico","iso2":"MX","iso3":"MEX","states":[]},{"name":"Micronesia, Federated States of","iso2":"FM","iso3":"FSM","states":[]},{"name":"Moldova, Republic of","iso2":"MD","iso3":"MDA","states":[]},{"name":"Monaco","iso2":"MC","iso3":"MCO","states":[]},{"name":"Mongolia","iso2":"MN","iso3":"MNG","states":[]},{"name":"Montenegro","iso2":"ME","iso3":"MNE","states":[]},{"name":"Montserrat","iso2":"MS","iso3":"MSR","states":[]},{"name":"Morocco","iso2":"MA","iso3":"MAR","states":[]},{"name":"Mozambique","iso2":"MZ","iso3":"MOZ","states":[]},{"name":"Myanmar","iso2":"MM","iso3":"MMR","states":[]},{"name":"Namibia","iso2":"NA","iso3":"NAM","states":[]},{"name":"Nauru","iso2":"NR","iso3":"NRU","states":[]},{"name":"Nepal","iso2":"NP","iso3":"NPL","states":[]},{"name":"Netherlands","iso2":"NL","iso3":"NLD","states":[]},{"name":"New Caledonia","iso2":"NC","iso3":"NCL","states":[]},{"name":"New Zealand","iso2":"NZ","iso3":"NZL","states":[]},{"name":"Nicaragua","iso2":"NI","iso3":"NIC","states":[]},{"name":"Niger","iso2":"NE","iso3":"NER","states":[]},{"name":"Nigeria","iso2":"NG","iso3":"NGA","states":[]},{"name":"Niue","iso2":"NU","iso3":"NIU","states":[]},{"name":"Norfolk Island","iso2":"NF","iso3":"NFK","states":[]},{"name":"North Macedonia","iso2":"MK","iso3":"MKD","states":[]},{"name":"Northern Mariana Islands","iso2":"MP","iso3":"MNP","states":[]},{"name":"Norway","iso2":"NO","iso3":"NOR","states":[]},{"name":"Oman","iso2":"OM","iso3":"OMN","states":[]},{"name":"Pakistan","iso2":"PK","iso3":"PAK","states":[]},{"name":"Palau","iso2":"PW","iso3":"PLW","states":[]},{"name":"Palestine, State of","iso2":"PS","iso3":"PSE","states":[]},{"name":"Panama","iso2":"PA","iso3":"PAN","states":[]},{"name":"Papua New Guinea","iso2":"PG","iso3":"PNG","states":[]},{"name":"Paraguay","iso2":"PY","iso3":"PRY","states":[]},{"name":"Peru","iso2":"PE","iso3":"PER","states":[]},{"name":"Philippines","iso2":"PH","iso3":"PHL","states":[]},{"name":"Pitcairn","iso2":"PN","iso3":"PCN","states":[]},{"name":"Poland","iso2":"PL","iso3":"POL","states":[]},{"name":"Portugal","iso2":"PT","iso3":"PRT","states":[]},{"name":"Puerto Rico","iso2":"PR","iso3":"PRI","states":[]},{"name":"Qatar","iso2":"QA","iso3":"QAT","states":[]},{"name":"Romania","iso2":"RO","iso3":"ROU","states":[]},{"name":"Russian Federation","iso2":"RU","iso3":"RUS","states":[]},{"name":"Rwanda","iso2":"RW","iso3":"RWA","states":[]},{"name":"Réunion","iso2":"RE","iso3":"REU","states":[]},{"name":"Saint Barthélemy","iso2":"BL","iso3":"BLM","states":[]},{"name":"Saint Helena, Ascension and Tristan da Cunha","iso2":"SH","iso3":"SHN","states":[]},{"name":"Saint Kitts and Nevis","iso2":"KN","iso3":"KNA","states":[]},{"name":"Saint Lucia","iso2":"LC","iso3":"LCA","states":[]},{"name":"Saint Martin (French part)","iso2":"MF","iso3":"MAF","states":[]},{"name":"Saint Pierre and Miquelon","iso2":"PM","iso3":"SPM","states":[]},{"name":"Saint Vincent and the Grenadines","iso2":"VC","iso3":"VCT","states":[]},{"name":"Samoa","iso2":"WS","iso3":"WSM","states":[]},{"name":"San Marino","iso2":"SM","iso3":"SMR","states":[]},{"name":"Sao Tome and Principe","iso2":"ST","iso3":"STP","states":[]},{"name":"Saudi Arabia","iso2":"SA","iso3":"SAU","states":[]},{"name":"Senegal","iso2":"SN","iso3":"SEN","states":[]},{"name":"Serbia","iso2":"RS","iso3":"SRB","states":[]},{"name":"Seychelles","iso2":"SC","iso3":"SYC","states":[]},{"name":"Sierra Leone","iso2":"SL","iso3":"SLE","states":[]},{"name":"Singapore","iso2":"SG","iso3":"SGP","states":[]},{"name":"Sint Maarten (Dutch part)","iso2":"SX","iso3":"SXM","states":[]},{"name":"Slovakia","iso2":"SK","iso3":"SVK","states":[]},{"name":"Slovenia","iso2":"SI","iso3":"SVN","states":[]},{"name":"Solomon Islands","iso2":"SB","iso3":"SLB","states":[]},{"name":"Somalia","iso2":"SO","iso3":"SOM","states":[]},{"name":"South Africa","iso2":"ZA","iso3":"ZAF","states":[]},{"name":"South Georgia and the South Sandwich Islands","iso2":"GS","iso3":"SGS","states":[]},{"name":"South Sudan","iso2":"SS","iso3":"SSD","states":[]},{"name":"Spain","iso2":"ES","iso3":"ESP","states":[]},{"name":"Sri Lanka","iso2":"LK","iso3":"LKA","states":[]},{"name":"Sudan","iso2":"SD","iso3":"SDN","states":[]},{"name":"Suriname","iso2":"SR","iso3":"SUR","states":[]},{"name":"Svalbard and Jan Mayen","iso2":"SJ","iso3":"SJM","states":[]},{"name":"Sweden","iso2":"SE","iso3":"SWE","states":[]},{"name":"Switzerland","iso2":"CH","iso3":"CHE","states":[]},{"name":"Syrian Arab Republic","iso2":"SY","iso3":"SYR","states":[]},{"name":"Taiwan, Province of China","iso2":"TW","iso3":"TWN","states":[]},{"name":"Tajikistan","iso2":"TJ","iso3":"TJK","states":[]},{"name":"Tanzania, United Republic of","iso2":"TZ","iso3":"TZA","states":[]},{"name":"Thailand","iso2":"TH","iso3":"THA","states":[]},{"name":"Timor-Leste","iso2":"TL","iso3":"TLS","states":[]},{"name":"Togo","iso2":"TG","iso3":"TGO","states":[]},{"name":"Tokelau","iso2":"TK","iso3":"TKL","states":[]},{"name":"Tonga","iso2":"TO","iso3":"TON","states":[]},{"name":"Trinidad and Tobago","iso2":"TT","iso3":"TTO","states":[]},{"name":"Tunisia","iso2":"TN","iso3":"TUN","states":[]},{"name":"Turkmenistan","iso2":"TM","iso3":"TKM","states":[]},{"name":"Turks and Caicos Islands","iso2":"TC","iso3":"TCA","states":[]},{"name":"Tuvalu","iso2":"TV","iso3":"TUV","states":[]},{"name":"Türkiye","iso2":"TR","iso3":"TUR","states":[]},{"name":"Uganda","iso2":"UG","iso3":"UGA","states":[]},{"name":"Ukraine","iso2":"UA","iso3":"UKR","states":[]},{"name":"United Arab Emirates","iso2":"AE","iso3":"ARE","states":[]},{"name":"United Kingdom","iso2":"GB","iso3":"GBR","states":[]},{"name":"United States","iso2":"US","iso3":"USA","states":[]},{"name":"United States Minor Outlying Islands","iso2":"UM","iso3":"UMI","states":[]},{"name":"Uruguay","iso2":"UY","iso3":"URY","states":[]},{"name":"Uzbekistan","iso2":"UZ","iso3":"UZB","states":[]},{"name":"Vanuatu","iso2":"VU","iso3":"VUT","states":[]},{"name":"Venezuela, Bolivarian Republic of","iso2":"VE","iso3":"VEN","states":[]},{"name":"Viet Nam","iso2":"VN","iso3":"VNM","states":[]},{"name":"Virgin Islands, British","iso2":"VG","iso3":"VGB","states":[]},{"name":"Virgin Islands, U.S.","iso2":"VI","iso3":"VIR","states":[]},{"name":"Wallis and Futuna","iso2":"WF","iso3":"WLF","states":[]},{"name":"Western Sahara","iso2":"EH","iso3":"ESH","states":[]},{"name":"Yemen","iso2":"YE","iso3":"YEM","states":[]},{"name":"Zambia","iso2":"ZM","iso3":"ZMB","states":[]},{"name":"Zimbabwe","iso2":"ZW","iso3":"ZWE","states":[]},{"name":"Åland Islands","iso2":"AX","iso3":"ALA","states":[]}]);

const THAILAND_LOCATION_CACHE_KEY = "catmatch_thailand_locations_v3";
const GLOBAL_LOCATION_CACHE_KEY = "catmatch_global_locations_v2";
const GLOBAL_CITY_CACHE_PREFIX = "catmatch_global_city_v1:";

let thailandLocations = [];
let globalCountries = [];
let locationDataReady = false;
let thailandLocationReady = false;
let globalLocationReady = false;
let worldCityRequestId = 0;

const locationOptions = {
  country: [],
  province: [],
  district: [],
  subdistrict: []
};

document.addEventListener("DOMContentLoaded", () => {
  prepareRegisterSession();
  setupNavigation();
  setupProtectedPasswordFields();
  setupPasswordStrength();
  setupPhoneInput();
  setupBirthDatePicker();
  setupAvailabilityChecks();
  setupLocationAutocomplete();
  setupMobileMenu();
  setupHeaderScroll();
  setupPetalParallax();
  setupRegisterDraft();
  updateStepUI();
});


function prepareRegisterSession() {
  const params = new URLSearchParams(window.location.search);
  const startFresh = params.get("fresh") === "1";
  const restoreDraft = params.get("restore") === "1";

  if (startFresh && !restoreDraft) {
    clearRegisterDraft();
    form?.reset();
    currentStep = 1;
    highestStep = 1;

    form?.querySelectorAll("[data-location-field]").forEach((field) => {
      field.value = "";
      field.dataset.locationId = "";
    });

    // ลบ query หลังรีเซ็ต เพื่อให้ URL สะอาด แต่ไม่ทำให้หน้าโหลดซ้ำ
    window.history.replaceState({}, "", window.location.pathname);
  }
}


function setupRegisterDraft() {
  if (!form) return;

  restoreRegisterDraft();

  let saveTimer = null;
  const scheduleSave = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveRegisterDraft, 120);
  };

  form.addEventListener("input", scheduleSave);
  form.addEventListener("change", scheduleSave);

  document.querySelectorAll("[data-legal-link]").forEach((link) => {
    link.addEventListener("click", saveRegisterDraft);
  });

  window.addEventListener("pagehide", saveRegisterDraft);
}

function saveRegisterDraft() {
  if (!form) return;

  const values = {};
  form.querySelectorAll("input, textarea, select").forEach((field) => {
    if (!field.name || DRAFT_EXCLUDED_FIELDS.has(field.name)) return;

    if (field.type === "checkbox") {
      values[field.name] = field.checked;
      return;
    }

    if (field.type === "radio") {
      if (field.checked) values[field.name] = field.value;
      return;
    }

    values[field.name] = field.value;
  });

  const draft = {
    values,
    currentStep,
    highestStep,
    savedAt: Date.now()
  };

  try {
    sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage restrictions; browser history can still preserve the page.
  }
}

function restoreRegisterDraft() {
  let draft = null;

  try {
    draft = JSON.parse(sessionStorage.getItem(REGISTER_DRAFT_KEY) || "null");
  } catch {
    draft = null;
  }

  if (!draft || !draft.values) return;

  Object.entries(draft.values).forEach(([name, value]) => {
    const fields = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
    if (!fields.length) return;

    fields.forEach((field) => {
      if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else if (field.type === "radio") {
        field.checked = field.value === value;
      } else if (!DRAFT_EXCLUDED_FIELDS.has(name)) {
        field.value = value ?? "";
      }
    });
  });

  currentStep = Math.min(Math.max(Number(draft.currentStep) || 1, 1), steps.length);
  highestStep = Math.min(Math.max(Number(draft.highestStep) || currentStep, currentStep), steps.length);

  restoreLocationDraftState();
}

function restoreLocationDraftState() {
  if (!locationDataReady) return;
  void restoreLocationHierarchy();
}

function clearRegisterDraft() {
  try {
    sessionStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch {
    // No-op
  }
}


function setupPetalParallax() {
  const scene = document.querySelector(".register-sakura-scene");

  if (!scene) {
    return;
  }

  const onScroll = () => {
    const y = window.scrollY || 0;
    const shift = Math.min(y * 0.05, 28);
    const boost = Math.min(y / 5000, 0.12);

    scene.style.setProperty("--scene-shift", `${shift}px`);
    scene.style.setProperty("--petal-boost", boost.toFixed(2));
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function setupNavigation() {
  nextButton?.addEventListener("click", async () => {
    clearStatus();

    if (!validateStep(currentStep)) return;

    setNextLoading(true);

    try {
      if (currentStep === 1) {
        const unique = await checkStepOneAvailability();
        if (!unique) return;
      }

      highestStep = Math.max(highestStep, currentStep + 1);
      goToStep(currentStep + 1);
    } finally {
      setNextLoading(false);
    }
  });

  backButton?.addEventListener("click", () => {
    if (currentStep === 1) {
      window.location.href = HOME_PAGE;
      return;
    }
    goToStep(currentStep - 1);
  });

  indicators.forEach((indicator) => {
    indicator.addEventListener("click", () => {
      const target = Number(indicator.dataset.stepTarget);
      if (target <= highestStep && target !== currentStep) goToStep(target);
    });
  });

  form?.addEventListener("submit", submitRegistration);
}


function goToStep(step) {
  if (step < 1 || step > steps.length) return;
  currentStep = step;
  updateStepUI();
  document.querySelector(".register-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateStepUI() {
  steps.forEach((step) => step.classList.toggle("is-active", Number(step.dataset.step) === currentStep));

  indicators.forEach((indicator, index) => {
    const stepNumber = index + 1;
    indicator.classList.toggle("is-active", stepNumber === currentStep);
    indicator.classList.toggle("is-complete", stepNumber < currentStep);
    indicator.disabled = stepNumber > highestStep;
    indicator.toggleAttribute("aria-current", stepNumber === currentStep);
  });

  progress.style.width = `${((currentStep - 1) / (steps.length - 1)) * 66.68}%`;
  backButton.hidden = false;
  backButton.innerHTML = currentStep === 1
    ? '<span aria-hidden="true">←</span> กลับหน้าแรก'
    : '<span aria-hidden="true">←</span> ย้อนกลับ';
  nextButton.hidden = currentStep === steps.length;
  submitButton.hidden = currentStep !== steps.length;
  clearStatus();
}


function validateStep(stepNumber) {
  const step = steps.find((item) => Number(item.dataset.step) === stepNumber);
  if (!step) return false;

  let valid = true;
  const fields = [...step.querySelectorAll("input, textarea, select")].filter((field) => field.type !== "radio" && field.id !== "birthDateNative");

  fields.forEach((field) => {
    if (!validateField(field)) valid = false;
  });

  if (stepNumber === 1) {
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    if (password.value !== confirmPassword.value) {
      showFieldError(confirmPassword, "รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      valid = false;
    }

    const passwordRules = getPasswordRules(password.value);
    if (!Object.values(passwordRules).every(Boolean)) {
      showFieldError(password, getPasswordError(passwordRules));
      valid = false;
    }

    for (const fieldName of ["name", "username", "email"]) {
      if (availabilityState[fieldName] === false) valid = false;
    }
  }

  if (!valid) {
    showStatus("กรุณาตรวจสอบข้อมูลที่ยังไม่ครบหรือไม่ถูกต้อง", "error");
    step.querySelector(".is-invalid input, .is-invalid textarea, .is-invalid select, textarea.is-invalid, input:invalid, select:invalid, textarea:invalid")?.focus();
  }

  return valid;
}


function validateField(field) {
  clearFieldError(field);

  if (field.type === "checkbox" && field.required && !field.checked) {
    showFieldError(field, "กรุณายอมรับข้อกำหนดก่อนสร้างบัญชี");
    return false;
  }

  const value = field.value.trim();

  if (field.required && !value) {
    showFieldError(field, "กรุณากรอกข้อมูลช่องนี้");
    return false;
  }

  if (!value && !field.required) return true;

  if (field.id === "name") {
    const normalizedName = normalizeFullName(value);
    if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)+$/.test(normalizedName)) {
      showFieldError(field, "กรุณากรอกชื่อและนามสกุลเป็นภาษาอังกฤษ เช่น Kanda Jaiboon");
      return false;
    }
    if (normalizedName.length < 3 || normalizedName.length > 80) {
      showFieldError(field, "ชื่อและนามสกุลต้องมีความยาว 3–80 ตัวอักษร");
      return false;
    }
    field.value = normalizedName;
  }

  if (field.id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    showFieldError(field, "รูปแบบอีเมลไม่ถูกต้อง");
    return false;
  }

  if (field.id === "email" && value.length > 191) {
    showFieldError(field, "อีเมลยาวเกินกำหนด");
    return false;
  }

  if (field.id === "username" && !/^[A-Za-z][A-Za-z0-9_]{9}$/.test(value)) {
    showFieldError(field, "ชื่อผู้ใช้งานต้องมี 10 ตัวพอดี ขึ้นต้นด้วยตัวอักษรอังกฤษ และใช้ได้เฉพาะตัวอักษร ตัวเลข หรือ _");
    return false;
  }

  if (field.id === "password") {
    const rules = getPasswordRules(value);
    if (!Object.values(rules).every(Boolean)) {
      showFieldError(field, getPasswordError(rules));
      return false;
    }
  }

  if (field.id === "phone") {
    const country = document.getElementById("phoneCountry")?.value || "TH";
    const digits = normalizeLocalPhone(value, country);
    const limits = PHONE_COUNTRY_RULES[country] || { min: 6, max: 14 };

    if (digits.length < limits.min || digits.length > limits.max) {
      showFieldError(field, `กรุณากรอกเบอร์โทรศัพท์ ${limits.min}–${limits.max} หลัก`);
      return false;
    }
  }

  if (field.id === "birthDate" && value) {
    const dateResult = validateGregorianBirthDate(value);
    if (!dateResult.valid) {
      showFieldError(field, dateResult.message);
      return false;
    }
  }

  if (field.id === "nickname") {
    if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(value)) {
      showFieldError(field, "กรุณากรอกชื่อเล่นเป็นภาษาอังกฤษ เช่น Olive");
      return false;
    }

    if (value.length < 2 || value.length > 30) {
      showFieldError(field, "ชื่อเล่นต้องมีความยาว 2–30 ตัวอักษร");
      return false;
    }
  }

  if (field.id === "gender" && !["female", "male", "nonbinary", "prefer_not_to_say"].includes(value)) {
    showFieldError(field, "กรุณาเลือกเพศ");
    return false;
  }

  if (field.id === "address" && (value.length < 5 || value.length > 500)) {
    showFieldError(field, "กรุณากรอกรายละเอียดที่อยู่ 5–500 ตัวอักษร");
    return false;
  }

  if (locationDataReady && field.id === "country") {
    if (locationOptions.country.length && !findLocationOption("country", value)) {
      showFieldError(field, "กรุณาเลือกประเทศจากรายการที่ระบบแสดง");
      return false;
    }
  }

  if (locationDataReady && field.id === "province") {
    if (locationOptions.province.length && !findLocationOption("province", value)) {
      showFieldError(field, "กรุณาเลือกจังหวัด รัฐ หรือภูมิภาคจากรายการที่ระบบแสดง");
      return false;
    }
  }

  if (locationDataReady && field.id === "district") {
    if (locationOptions.district.length && !findLocationOption("district", value)) {
      showFieldError(field, "กรุณาเลือกอำเภอ เขต หรือเมืองที่อยู่ในพื้นที่ที่เลือก");
      return false;
    }
  }

  if (locationDataReady && field.id === "subdistrict" && value && isThailandSelected()) {
    if (locationOptions.subdistrict.length && !findLocationOption("subdistrict", value)) {
      showFieldError(field, "กรุณาเลือกตำบลหรือแขวงที่อยู่ในอำเภอหรือเขตที่เลือก");
      return false;
    }
  }

  markFieldValid(field);
  return true;
}


function getFieldControl(field) {
  return field.closest(".input-shell") || field;
}

function showFieldError(field, message) {
  const control = getFieldControl(field);
  control.classList.add("is-invalid");
  control.classList.remove("is-valid");
  const error = document.querySelector(`[data-error-for="${field.id}"]`);
  if (error) error.textContent = message;
}

function clearFieldError(field) {
  getFieldControl(field).classList.remove("is-invalid");
  const error = document.querySelector(`[data-error-for="${field.id}"]`);
  if (error) error.textContent = "";
}

function markFieldValid(field) {
  const control = getFieldControl(field);
  control.classList.add("is-valid");
  control.classList.remove("is-invalid");
}

function setupProtectedPasswordFields() {
  document.querySelectorAll("[data-protect-password]").forEach((field) => {
    ["copy", "cut", "dragstart"].forEach((eventName) => {
      field.addEventListener(eventName, (event) => {
        event.preventDefault();
        showStatus("ไม่อนุญาตให้คัดลอกรหัสผ่าน เพื่อความปลอดภัยของบัญชี", "error");
      });
    });
  });
}

function setupPasswordStrength() {
  const password = document.getElementById("password");
  const strength = document.getElementById("passwordStrength");
  if (!password || !strength) return;

  const refresh = () => {
    const value = password.value;
    const rules = getPasswordRules(value);
    const groups = {
      length: rules.length,
      letters: rules.lowercase && rules.uppercase,
      numberSpecial: rules.number && rules.special,
      safe: rules.ascii && rules.personal && rules.common
    };

    Object.entries(groups).forEach(([group, passed]) => {
      strength
        .querySelector(`[data-rule-group="${group}"]`)
        ?.classList.toggle("is-valid", passed);
    });

    const passedCount = Object.values(rules).filter(Boolean).length;
    const totalRules = Object.keys(rules).length;
    const ratio = totalRules ? passedCount / totalRules : 0;
    const track = strength.querySelector(".strength-track span");
    const label = strength.querySelector(".strength-row strong");
    const remaining = Object.values(groups).filter((passed) => !passed).length;

    const state = !value
      ? { label: "ยังไม่ได้กรอก", color: "#d7736b" }
      : remaining === 0
        ? { label: "ปลอดภัย พร้อมใช้งาน", color: "#6a9e8f" }
        : { label: `เหลืออีก ${remaining} เงื่อนไข`, color: ratio < 0.55 ? "#d7736b" : "#d7a85f" };

    track.style.width = `${ratio * 100}%`;
    track.style.background = state.color;
    label.textContent = state.label;
  };

  password.addEventListener("input", refresh);
  ["name", "username", "email"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", refresh);
  });
  refresh();
}


function collapseRepeatedCharacters(value) {
  return String(value || "").replace(/(.)\1+/g, "$1");
}

function buildPersonalPasswordTokens() {
  const name = normalizeFullName(document.getElementById("name")?.value || "").toLowerCase();
  const username = (document.getElementById("username")?.value || "").trim().toLowerCase();
  const emailLocal = ((document.getElementById("email")?.value || "").split("@")[0] || "").trim().toLowerCase();
  const tokens = new Set();

  const addToken = (token, includePrefixes = false) => {
    const cleaned = String(token || "").replace(/[^a-z0-9]/g, "");
    if (cleaned.length < 3) return;
    tokens.add(cleaned);

    if (includePrefixes && cleaned.length >= 4) {
      for (let length = 4; length <= cleaned.length; length += 1) {
        tokens.add(cleaned.slice(0, length));
      }
    }
  };

  name.split(/[\s'-]+/).forEach((token) => addToken(token));
  username.split(/[^a-z0-9]+/).forEach((token) => addToken(token, true));
  (username.match(/[a-z]{3,}/g) || []).forEach((token) => addToken(token, true));
  emailLocal.split(/[^a-z0-9]+/).forEach((token) => addToken(token));
  (emailLocal.match(/[a-z]{3,}/g) || []).forEach((token) => addToken(token));

  return [...tokens];
}

function getPasswordRules(value) {
  const lowerValue = String(value || "").toLowerCase();
  const comparablePassword = lowerValue.replace(/[^a-z0-9]/g, "");
  const collapsedPassword = collapseRepeatedCharacters(comparablePassword);
  const personalTokens = buildPersonalPasswordTokens();

  const containsPersonalData = personalTokens.some((token) => {
    const collapsedToken = collapseRepeatedCharacters(token);
    return comparablePassword.includes(token) || collapsedPassword.includes(collapsedToken);
  });

  const normalizedForBlocklist = lowerValue.replace(/[^a-z0-9]/g, "");
  const isCommon = COMMON_PASSWORDS.has(lowerValue) ||
    COMMON_PASSWORDS.has(normalizedForBlocklist) ||
    /(.)\1{3,}/.test(value) ||
    /(123456|abcdef|qwerty|asdfgh|zxcvbn)/i.test(value);

  return {
    length: value.length === 10,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
    ascii: /^[\x21-\x7E]+$/.test(value),
    personal: value.length > 0 && !containsPersonalData,
    common: value.length > 0 && !isCommon
  };
}


function getPasswordError(rules) {
  if (!rules.length) return "รหัสผ่านต้องมี 10 ตัวพอดี";
  if (!rules.lowercase || !rules.uppercase) return "เพิ่มตัวพิมพ์เล็กและตัวพิมพ์ใหญ่อย่างน้อยอย่างละ 1 ตัว";
  if (!rules.number || !rules.special) return "เพิ่มตัวเลขและสัญลักษณ์พิเศษอย่างน้อยอย่างละ 1 ตัว";
  if (!rules.ascii) return "ใช้เฉพาะอักษรอังกฤษ ตัวเลข และสัญลักษณ์ โดยห้ามเว้นวรรค";
  if (!rules.personal) return "ห้ามใช้ชื่อหรือส่วนหนึ่งของชื่อผู้ใช้งานในรหัสผ่าน แม้เปลี่ยนตัวพิมพ์เล็ก–ใหญ่";
  if (!rules.common) return "รหัสผ่านนี้เดาง่ายเกินไป กรุณาเปลี่ยนเป็นรูปแบบอื่น";
  return "กรุณาตรวจสอบรหัสผ่านอีกครั้ง";
}


function normalizeFullName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function setupPhoneInput() {
  const country = document.getElementById("phoneCountry");
  const phone = document.getElementById("phone");
  const dialCode = document.getElementById("dialCode");
  if (!country || !phone || !dialCode) return;

  const refreshCountry = () => {
    const rule = PHONE_COUNTRY_RULES[country.value] || PHONE_COUNTRY_RULES.TH;
    dialCode.textContent = rule.code;
    phone.placeholder = rule.placeholder;
    phone.value = formatPhoneDigits(normalizeLocalPhone(phone.value, country.value));
    clearFieldError(phone);
  };

  country.addEventListener("change", refreshCountry);
  phone.addEventListener("input", () => {
    const rule = PHONE_COUNTRY_RULES[country.value] || { max: 14 };
    const normalizedDigits = normalizeLocalPhone(phone.value, country.value).slice(0, rule.max);
    phone.value = formatPhoneDigits(normalizedDigits);
    clearFieldError(phone);
  });

  refreshCountry();
}

const PHONE_COUNTRY_RULES = {
  TH: { code: "+66", min: 9, max: 9, placeholder: "81 234 5678" },
  LA: { code: "+856", min: 8, max: 10, placeholder: "20 5555 5555" },
  KH: { code: "+855", min: 8, max: 10, placeholder: "12 345 678" },
  MM: { code: "+95", min: 7, max: 10, placeholder: "9 123 456 789" },
  VN: { code: "+84", min: 9, max: 10, placeholder: "91 234 5678" },
  MY: { code: "+60", min: 9, max: 10, placeholder: "12 345 6789" },
  SG: { code: "+65", min: 8, max: 8, placeholder: "8123 4567" },
  ID: { code: "+62", min: 8, max: 12, placeholder: "812 3456 7890" },
  PH: { code: "+63", min: 10, max: 10, placeholder: "917 123 4567" },
  CN: { code: "+86", min: 11, max: 11, placeholder: "138 0013 8000" },
  JP: { code: "+81", min: 9, max: 10, placeholder: "90 1234 5678" },
  KR: { code: "+82", min: 9, max: 10, placeholder: "10 1234 5678" },
  IN: { code: "+91", min: 10, max: 10, placeholder: "98765 43210" },
  AU: { code: "+61", min: 9, max: 9, placeholder: "412 345 678" },
  GB: { code: "+44", min: 10, max: 10, placeholder: "7700 900123" },
  US: { code: "+1", min: 10, max: 10, placeholder: "202 555 0123" },
  CA: { code: "+1", min: 10, max: 10, placeholder: "416 555 0123" }
};

function extractPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeLocalPhone(value, countryCode) {
  let digits = extractPhoneDigits(value);
  const rule = PHONE_COUNTRY_RULES[countryCode] || PHONE_COUNTRY_RULES.TH;
  const dialDigits = rule.code.replace(/\D/g, "");

  if (digits.startsWith(dialDigits)) digits = digits.slice(dialDigits.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function formatPhoneDigits(digits) {
  return String(digits || "").replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function getPhoneE164() {
  const countryCode = document.getElementById("phoneCountry")?.value || "TH";
  const rule = PHONE_COUNTRY_RULES[countryCode] || PHONE_COUNTRY_RULES.TH;
  const digits = normalizeLocalPhone(document.getElementById("phone")?.value, countryCode);
  return `${rule.code}${digits}`;
}

function setupBirthDatePicker() {
  const textInput = document.getElementById("birthDate");
  const button = document.getElementById("calendarButton");
  const picker = document.getElementById("birthPicker");
  const monthSelect = document.getElementById("birthMonthSelect");
  const yearSelect = document.getElementById("birthYearSelect");
  const dayGrid = document.getElementById("birthDayGrid");
  const previousButton = document.getElementById("birthPrevMonth");
  const nextButton = document.getElementById("birthNextMonth");
  const clearButton = document.getElementById("birthClearButton");
  if (!textInput || !button || !picker || !monthSelect || !yearSelect || !dayGrid) return;

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const today = new Date();
  let viewYear = 2000;
  let viewMonth = today.getMonth();

  monthSelect.innerHTML = monthNames.map((name, index) => `<option value="${index}">${name}</option>`).join("");
  yearSelect.innerHTML = Array.from(
    { length: today.getFullYear() - 1899 },
    (_, index) => today.getFullYear() - index
  ).map((year) => `<option value="${year}">${year}</option>`).join("");

  const parseInputDate = () => {
    const result = validateGregorianBirthDate(textInput.value);
    return result.valid ? result.date : null;
  };

  const isFutureDate = (year, month, day) => {
    const candidate = new Date(year, month, day);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return candidate > endOfToday;
  };

  const closePicker = () => {
    picker.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };

  const render = () => {
    monthSelect.value = String(viewMonth);
    yearSelect.value = String(viewYear);
    dayGrid.innerHTML = "";
    const selected = parseInputDate();
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let blank = 0; blank < firstWeekday; blank += 1) {
      const spacer = document.createElement("span");
      spacer.className = "birth-day-spacer";
      dayGrid.appendChild(spacer);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "birth-day-button";
      dayButton.textContent = String(day);
      dayButton.setAttribute("role", "gridcell");
      dayButton.disabled = isFutureDate(viewYear, viewMonth, day);

      if (selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day) {
        dayButton.classList.add("is-selected");
      }
      if (today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day) {
        dayButton.classList.add("is-today");
      }

      dayButton.addEventListener("click", () => {
        textInput.value = [
          String(day).padStart(2, "0"),
          String(viewMonth + 1).padStart(2, "0"),
          String(viewYear)
        ].join("/");
        validateField(textInput);
        closePicker();
      });
      dayGrid.appendChild(dayButton);
    }

    if (previousButton) previousButton.disabled = viewYear === 1900 && viewMonth === 0;
    if (nextButton) nextButton.disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  };

  const openPicker = () => {
    const selected = parseInputDate();
    if (selected) {
      viewYear = selected.getFullYear();
      viewMonth = selected.getMonth();
    }
    picker.hidden = false;
    button.setAttribute("aria-expanded", "true");
    render();
  };

  button.addEventListener("click", () => picker.hidden ? openPicker() : closePicker());
  previousButton?.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    render();
  });
  nextButton?.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    render();
  });
  monthSelect.addEventListener("change", () => { viewMonth = Number(monthSelect.value); render(); });
  yearSelect.addEventListener("change", () => {
    viewYear = Number(yearSelect.value);
    if (viewYear === today.getFullYear() && viewMonth > today.getMonth()) viewMonth = today.getMonth();
    render();
  });
  clearButton?.addEventListener("click", () => {
    textInput.value = "";
    clearFieldError(textInput);
    closePicker();
  });
  textInput.addEventListener("input", () => {
    const digits = textInput.value.replace(/\D/g, "").slice(0, 8);
    textInput.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
  });
  document.addEventListener("pointerdown", (event) => {
    if (!picker.hidden && !picker.contains(event.target) && !button.contains(event.target)) closePicker();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !picker.hidden) closePicker();
  });
}

function validateGregorianBirthDate(value) {
  const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { valid: false, message: "กรุณากรอกวันที่ในรูปแบบ dd/mm/yyyy" };

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const currentYear = new Date().getFullYear();

  if (year >= 2400) return { valid: false, message: "กรุณากรอกปี ค.ศ. เท่านั้น ไม่ใช้ปี พ.ศ." };
  if (year < 1900 || year > currentYear) return { valid: false, message: `ปีเกิดต้องเป็น ค.ศ. ระหว่าง 1900–${currentYear}` };

  const date = new Date(year, month - 1, day);
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? { valid: true, date } : { valid: false, message: "วัน เดือน หรือปีเกิดไม่ถูกต้อง" };
}

function isValidDateString(value) {
  return validateGregorianBirthDate(value).valid;
}

function toIsoDate(value) {
  if (!value) return null;
  const result = validateGregorianBirthDate(value);
  if (!result.valid) return null;
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

function setupAvailabilityChecks() {
  ["name", "username", "email"].forEach((fieldName) => {
    const field = document.getElementById(fieldName);
    if (!field) return;

    field.addEventListener("input", () => {
      availabilityState[fieldName] = null;
      if (fieldName === "username") {
        const indicator = document.getElementById("usernameAvailability");
        if (indicator) indicator.textContent = "";
      }

      clearTimeout(availabilityTimers.get(fieldName));
      const timer = setTimeout(async () => {
        if (!isAvailabilityValueLocallyValid(fieldName, field.value)) return;
        await checkAvailability(fieldName, field.value, { silentNetworkError: true });
      }, 650);
      availabilityTimers.set(fieldName, timer);
    });

    field.addEventListener("blur", async () => {
      clearTimeout(availabilityTimers.get(fieldName));
      if (!isAvailabilityValueLocallyValid(fieldName, field.value)) return;
      await checkAvailability(fieldName, field.value, { silentNetworkError: true });
    });
  });
}

function isAvailabilityValueLocallyValid(fieldName, rawValue) {
  const value = rawValue.trim();
  if (fieldName === "name") return /^[A-Za-z]+(?:[ '-][A-Za-z]+)+$/.test(normalizeFullName(value));
  if (fieldName === "username") return /^[A-Za-z][A-Za-z0-9_]{9}$/.test(value);
  if (fieldName === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return false;
}

async function checkAvailability(fieldName, rawValue, { silentNetworkError = false } = {}) {
  const field = document.getElementById(fieldName);
  if (!field) return true;

  const value = fieldName === "name" ? normalizeFullName(rawValue) : rawValue.trim();
  const indicator = fieldName === "username" ? document.getElementById("usernameAvailability") : null;
  if (indicator) indicator.textContent = "…";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(AVAILABILITY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: fieldName, value }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "ตรวจสอบข้อมูลซ้ำไม่ได้");

    availabilityState[fieldName] = Boolean(result.available);
    if (!result.available) {
      showFieldError(field, result.message || duplicateMessageFor(fieldName));
      if (indicator) indicator.textContent = "✕";
      return false;
    }

    clearFieldError(field);
    markFieldValid(field);
    if (indicator) {
      indicator.textContent = "✓";
      indicator.title = "ชื่อผู้ใช้งานนี้ยังใช้งานได้";
    }
    return true;
  } catch (error) {
    availabilityState[fieldName] = null;
    if (indicator) indicator.textContent = "";

    if (!silentNetworkError) {
      const message = error.name === "AbortError"
        ? "การตรวจสอบข้อมูลใช้เวลานานเกินไป กรุณาลองอีกครั้ง"
        : error.message;
      showStatus(message, "error");
    }

    // อนุญาตให้ไปขั้นที่ 2 ได้เมื่อ API ตรวจซ้ำไม่ตอบสนอง
    // Backend จะตรวจซ้ำอีกครั้งก่อนสร้างบัญชีจริง
    return true;
  }
}

async function checkStepOneAvailability() {
  const checks = await Promise.all([
    checkAvailability("name", document.getElementById("name").value),
    checkAvailability("username", document.getElementById("username").value),
    checkAvailability("email", document.getElementById("email").value)
  ]);

  const unique = checks.every(Boolean);
  if (!unique) {
    showStatus("พบข้อมูลที่มีผู้ใช้งานแล้ว กรุณาแก้ไขก่อนดำเนินการต่อ", "error");
    document.querySelector(".is-invalid input")?.focus();
  }
  return unique;
}

function duplicateMessageFor(fieldName) {
  return {
    name: "มีผู้ใช้งานชื่อนี้แล้ว",
    email: "มีผู้ใช้งานอีเมลนี้แล้ว",
    username: "มีผู้ใช้งานชื่อผู้ใช้นี้แล้ว"
  }[fieldName] || "ข้อมูลนี้ถูกใช้งานแล้ว";
}


function setupLocationAutocomplete() {
  const inputs = getLocationInputs();

  const closeAllSuggestions = (exceptField = null) => {
    document.querySelectorAll(".suggestion-box.is-open").forEach((box) => {
      if (box.dataset.suggestionsFor !== exceptField) {
        box.classList.remove("is-open");
        box.innerHTML = "";
      }
    });
  };

  const renderSuggestions = (field) => {
    const input = inputs[field];
    const box = document.querySelector(`[data-suggestions-for="${field}"]`);
    if (!input || !box || input.disabled) return;

    closeAllSuggestions(field);
    const query = input.value.trim();
    const filteredMatches = getLocationOptions(field)
      .filter((item) => locationOptionMatches(item, query));

    // ประเทศต้องแสดงครบทั้งหมด ไม่ตัดเหลือเพียง 35 รายการ
    const matches = field === "country"
      ? filteredMatches
      : filteredMatches.slice(0, 50);

    if (!locationDataReady) {
      box.innerHTML = '<span class="suggestion-message">กำลังโหลดข้อมูลพื้นที่ กรุณารอสักครู่</span>';
      box.classList.add("is-open");
      return;
    }

    if (field === "province" && !findLocationOption("country", inputs.country.value)) {
      box.innerHTML = '<span class="suggestion-message">กรุณาเลือกประเทศก่อน</span>';
      box.classList.add("is-open");
      return;
    }

    if (field === "district" && !inputs.province.value.trim()) {
      box.innerHTML = '<span class="suggestion-message">กรุณาเลือกจังหวัด รัฐ หรือภูมิภาคก่อน</span>';
      box.classList.add("is-open");
      return;
    }

    if (field === "subdistrict" && isThailandSelected() && !inputs.district.value.trim()) {
      box.innerHTML = '<span class="suggestion-message">กรุณาเลือกอำเภอหรือเขตก่อน</span>';
      box.classList.add("is-open");
      return;
    }

    if (!matches.length) {
      const freeTextAllowed =
        (field === "province" && !locationOptions.province.length) ||
        (field === "district" && !locationOptions.district.length) ||
        (field === "subdistrict" && !isThailandSelected());
      box.innerHTML = freeTextAllowed
        ? '<span class="suggestion-message">ไม่พบรายการ คุณสามารถกรอกชื่อพื้นที่เองได้</span>'
        : '<span class="suggestion-message">ไม่พบข้อมูลที่ตรงกัน</span>';
      box.classList.add("is-open");
      return;
    }

    box.innerHTML = matches.map((item) => `
      <button type="button" class="suggestion-item"
        data-value="${escapeHtml(item.value)}"
        data-location-id="${escapeHtml(String(item.id ?? ""))}">
        <span>${escapeHtml(item.label)}</span>
        ${item.secondary ? `<small>${escapeHtml(item.secondary)}</small>` : ""}
      </button>
    `).join("");
    box.classList.add("is-open");
  };

  Object.entries(inputs).forEach(([field, input]) => {
    if (!input) return;
    const box = document.querySelector(`[data-suggestions-for="${field}"]`);
    if (!box) return;

    input.addEventListener("focus", () => renderSuggestions(field));
    input.addEventListener("input", () => {
      clearFieldError(input);
      input.dataset.locationId = "";
      if (field === "country") clearLocationFieldsFrom("country");
      if (field === "province") clearLocationFieldsFrom("province");
      if (field === "district") clearLocationFieldsFrom("district");
      renderSuggestions(field);
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        box.classList.remove("is-open");
        box.innerHTML = "";
      }, 180);
    });

    box.addEventListener("mousedown", async (event) => {
      const itemElement = event.target.closest("[data-value]");
      if (!itemElement) return;
      event.preventDefault();

      const item = getLocationOptions(field).find(
        (option) => String(option.id) === String(itemElement.dataset.locationId)
      ) || getLocationOptions(field).find(
        (option) => normalizeLocationText(option.value) === normalizeLocationText(itemElement.dataset.value)
      );
      if (!item) return;

      input.value = item.value;
      input.dataset.locationId = String(item.id ?? "");
      box.classList.remove("is-open");
      box.innerHTML = "";
      markFieldValid(input);

      if (field === "country") await applyCountrySelection(item, { focusNext: true });
      if (field === "province") await applyProvinceSelection(item, { focusNext: true });
      if (field === "district") applyDistrictSelection(item, { focusNext: true });
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".autocomplete-field")) closeAllSuggestions();
  });

  void initializeGlobalLocationData();
}

function getLocationInputs() {
  return {
    country: document.getElementById("country"),
    province: document.getElementById("province"),
    district: document.getElementById("district"),
    subdistrict: document.getElementById("subdistrict")
  };
}

async function initializeGlobalLocationData() {
  const status = document.getElementById("locationDataStatus");
  const inputs = getLocationInputs();

  // รายชื่อประเทศ ISO ครบพร้อมใช้งานทันที ไม่ต้องรอ API
  globalCountries = mergeGlobalCountryData([]);
  locationOptions.country = buildCountryOptions(globalCountries);
  locationDataReady = true;

  if (inputs.country) {
    inputs.country.disabled = false;
    inputs.country.placeholder = "พิมพ์ชื่อประเทศ เช่น Thailand, Japan";
  }
  if (inputs.province) inputs.province.disabled = true;
  if (inputs.district) inputs.district.disabled = true;
  if (inputs.subdistrict) inputs.subdistrict.disabled = true;

  if (status) {
    status.textContent = "รายชื่อประเทศพร้อมใช้งาน กำลังเตรียมจังหวัด รัฐ และเมือง";
  }

  const [globalResult, thailandResult] = await Promise.allSettled([
    loadGlobalCountriesStates(),
    loadThailandLocations()
  ]);

  if (globalResult.status === "fulfilled") {
    globalCountries = mergeGlobalCountryData(globalResult.value);
    globalLocationReady = true;
  } else {
    console.warn("Global state data unavailable:", globalResult.reason);
    globalCountries = mergeGlobalCountryData([]);
  }

  if (thailandResult.status === "fulfilled") {
    thailandLocations = thailandResult.value;
    thailandLocationReady = true;
  } else {
    console.warn("Thailand location data unavailable:", thailandResult.reason);
  }

  locationOptions.country = buildCountryOptions(globalCountries);
  await restoreLocationHierarchy();

  if (status) {
    status.textContent = (globalLocationReady || thailandLocationReady)
      ? "พร้อมใช้งาน: เลือกประเทศ แล้วระบบจะแสดงพื้นที่ที่เกี่ยวข้อง"
      : "รายชื่อประเทศพร้อมใช้งาน หากพื้นที่ย่อยไม่มีในรายการสามารถกรอกเองได้";
    status.classList.toggle("is-ready", true);
    status.classList.remove("is-error");
  }
}

async function loadGlobalCountriesStates() {
  const cached = readJsonCache(GLOBAL_LOCATION_CACHE_KEY);
  if (Array.isArray(cached) && cached.length) return cached;
  const response = await fetchWithTimeout(GLOBAL_LOCATION_DATA_URL, {
    method: "GET", headers: { Accept: "application/json" }, cache: "force-cache"
  });
  if (!response.ok) throw new Error(`โหลดข้อมูลประเทศไม่สำเร็จ (${response.status})`);
  const result = await response.json();
  const data = Array.isArray(result?.data) ? result.data : [];
  if (!data.length) throw new Error("ไม่พบข้อมูลประเทศ");
  writeJsonCache(GLOBAL_LOCATION_CACHE_KEY, data);
  return data;
}

async function loadThailandLocations() {
  const cached = readJsonCache(THAILAND_LOCATION_CACHE_KEY);
  if (Array.isArray(cached) && cached.length) return cached;
  const response = await fetchWithTimeout(THAILAND_LOCATION_DATA_URL, {
    headers: { Accept: "application/json" }, cache: "force-cache"
  });
  if (!response.ok) throw new Error(`โหลดข้อมูลประเทศไทยไม่สำเร็จ (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) throw new Error("ข้อมูลประเทศไทยไม่ถูกต้อง");
  writeJsonCache(THAILAND_LOCATION_CACHE_KEY, data);
  return data;
}

async function loadWorldCities(countryName, stateName) {
  const cacheKey = `${GLOBAL_CITY_CACHE_PREFIX}${countryName}|${stateName}`;
  const cached = readJsonCache(cacheKey);
  if (Array.isArray(cached)) return cached;
  const response = await fetchWithTimeout(GLOBAL_CITY_DATA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ country: countryName, state: stateName })
  });
  if (!response.ok) throw new Error(`โหลดข้อมูลเมืองไม่สำเร็จ (${response.status})`);
  const result = await response.json();
  const cities = Array.isArray(result?.data) ? result.data : [];
  writeJsonCache(cacheKey, cities);
  return cities;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 16000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function mergeGlobalCountryData(remoteCountries) {
  const remoteByIso = new Map();
  const remoteByName = new Map();

  (Array.isArray(remoteCountries) ? remoteCountries : []).forEach((country) => {
    const iso2 = String(country?.iso2 || "").toUpperCase();
    const nameKey = normalizeLocationText(country?.name);
    if (iso2) remoteByIso.set(iso2, country);
    if (nameKey) remoteByName.set(nameKey, country);
  });

  const merged = STATIC_COUNTRIES.map((country) => {
    const remote = remoteByIso.get(country.iso2)
      || remoteByName.get(normalizeLocationText(country.name));
    return {
      ...country,
      ...(remote || {}),
      name: country.name,
      iso2: country.iso2,
      iso3: country.iso3,
      states: Array.isArray(remote?.states) ? remote.states : []
    };
  });

  // เก็บรายการพิเศษจากแหล่งข้อมูลภายนอกที่อาจไม่มีใน ISO ด้วย
  (Array.isArray(remoteCountries) ? remoteCountries : []).forEach((country) => {
    const iso2 = String(country?.iso2 || "").toUpperCase();
    const exists = merged.some((item) => item.iso2 === iso2
      || normalizeLocationText(item.name) === normalizeLocationText(country?.name));
    if (!exists && country?.name) merged.push(country);
  });

  return merged;
}

const COUNTRY_SEARCH_ALIASES = Object.freeze({
  US: ["USA", "United States of America", "America", "สหรัฐอเมริกา"],
  GB: ["UK", "Great Britain", "Britain", "England", "สหราชอาณาจักร"],
  KR: ["South Korea", "Republic of Korea", "เกาหลีใต้"],
  KP: ["North Korea", "เกาหลีเหนือ"],
  RU: ["Russia", "รัสเซีย"],
  VN: ["Vietnam", "เวียดนาม"],
  LA: ["Laos", "ลาว"],
  CZ: ["Czech Republic", "สาธารณรัฐเช็ก"],
  TR: ["Turkey", "ตุรกี"],
  TW: ["Taiwan", "ไต้หวัน"],
  PS: ["Palestine", "ปาเลสไตน์"],
  XK: ["Kosovo", "โคโซโว"],
  TH: ["Thailand", "ประเทศไทย", "ไทย"],
  AE: ["UAE", "United Arab Emirates", "สหรัฐอาหรับเอมิเรตส์"],
  BN: ["Brunei", "บรูไน"],
  BO: ["Bolivia", "โบลิเวีย"],
  VE: ["Venezuela", "เวเนซุเอลา"],
  TZ: ["Tanzania", "แทนซาเนีย"],
  MD: ["Moldova", "มอลโดวา"],
  SY: ["Syria", "ซีเรีย"],
  IR: ["Iran", "อิหร่าน"]
});

function buildCountryOptions(countries) {
  const options = countries.map((country) => {
    const thailand = country.iso2 === "TH" || normalizeLocationText(country.name) === "thailand";
    const label = thailand ? "ประเทศไทย (Thailand)" : country.name;
    return {
      id: country.iso2 || country.iso3 || country.name,
      value: label,
      label,
      secondary: "",
      search: [country.name, country.iso2, country.iso3, ...(COUNTRY_SEARCH_ALIASES[country.iso2] || []), thailand ? "ประเทศไทย ไทย" : ""],
      raw: country
    };
  });

  return options.sort((a, b) =>
    a.id === "TH" ? -1 : b.id === "TH" ? 1 : a.label.localeCompare(b.label, "en")
  );
}

async function restoreLocationHierarchy() {
  const inputs = getLocationInputs();
  const saved = {
    province: inputs.province.value,
    district: inputs.district.value,
    subdistrict: inputs.subdistrict.value
  };
  const countryValue = inputs.country.value.trim();

  if (!countryValue) {
    inputs.country.value = "";
    inputs.country.dataset.locationId = "";
    inputs.province.value = "";
    inputs.district.value = "";
    inputs.subdistrict.value = "";
    inputs.province.disabled = true;
    inputs.district.disabled = true;
    inputs.subdistrict.disabled = true;
    return;
  }

  const country = findLocationOption("country", countryValue);
  if (!country) {
    inputs.country.disabled = false;
    return;
  }

  inputs.country.value = country.value;
  inputs.country.dataset.locationId = String(country.id ?? "");
  await applyCountrySelection(country, { preserveValues: true });

  const province = findLocationOption("province", saved.province);
  if (province) {
    inputs.province.value = province.value;
    inputs.province.dataset.locationId = String(province.id ?? "");
    await applyProvinceSelection(province, { preserveValues: true });
  } else if (saved.province) {
    inputs.province.value = saved.province;
    inputs.province.disabled = false;
  }

  const district = findLocationOption("district", saved.district);
  if (district) {
    inputs.district.value = district.value;
    inputs.district.dataset.locationId = String(district.id ?? "");
    applyDistrictSelection(district, { preserveValues: true });
  } else if (saved.district) {
    inputs.district.value = saved.district;
    inputs.district.disabled = false;
  }
  if (saved.subdistrict) inputs.subdistrict.value = saved.subdistrict;
}

async function applyCountrySelection(country, options = {}) {
  const inputs = getLocationInputs();
  clearLocationFieldsFrom("country", options.preserveValues);
  updateLocationLabels(country);

  if (isThailandCountry(country)) {
    locationOptions.province = thailandLocationReady ? thailandLocations.map(createThailandProvinceOption) : [];
  } else {
    const states = Array.isArray(country.raw?.states) ? country.raw.states : [];
    locationOptions.province = states.map((state, index) => ({
      id: state.state_code || `${country.id}-${index}`,
      value: state.name, label: state.name, secondary: "",
      search: [state.name, state.state_code], raw: state
    }));
  }

  inputs.province.disabled = false;
  inputs.province.placeholder = isThailandCountry(country)
    ? "พิมพ์ไทยหรืออังกฤษ เช่น Bangkok, Nakhon Ratchasima"
    : "พิมพ์ชื่อรัฐ จังหวัด หรือภูมิภาค";
  inputs.district.disabled = true;
  inputs.subdistrict.disabled = true;
  if (options.focusNext) inputs.province.focus();
}

async function applyProvinceSelection(province, options = {}) {
  const inputs = getLocationInputs();
  clearLocationFieldsFrom("province", options.preserveValues);

  if (isThailandSelected()) {
    const raw = province.raw || findThailandProvinceByAnyName(province.value);
    locationOptions.district = getProvinceDistricts(raw).map(createThailandDistrictOption);
    inputs.district.disabled = false;
    inputs.district.placeholder = "พิมพ์ชื่ออำเภอหรือเขต ไทย/อังกฤษ";
  } else {
    const country = findLocationOption("country", inputs.country.value);
    const requestId = ++worldCityRequestId;
    inputs.district.disabled = true;
    inputs.district.placeholder = "กำลังโหลดรายชื่อเมือง...";
    try {
      const cities = await loadWorldCities(country.raw?.name || country.label, province.raw?.name || province.value);
      if (requestId !== worldCityRequestId) return;
      locationOptions.district = cities.map((city, index) => ({
        id: `${province.id}-${index}`, value: city, label: city, secondary: "",
        search: [city], raw: city
      }));
    } catch (error) {
      console.warn("World city data unavailable:", error.message);
      locationOptions.district = [];
    }
    inputs.district.disabled = false;
    inputs.district.placeholder = locationOptions.district.length
      ? "พิมพ์ชื่อเมือง เขต หรืออำเภอ"
      : "กรอกชื่อเมือง เขต หรืออำเภอ";
  }
  if (options.focusNext) inputs.district.focus();
}

function applyDistrictSelection(district, options = {}) {
  const inputs = getLocationInputs();
  clearLocationFieldsFrom("district", options.preserveValues);
  if (isThailandSelected()) {
    const raw = district.raw || findThailandDistrictByAnyName(inputs.province.value, district.value);
    locationOptions.subdistrict = getDistrictSubdistricts(raw).map(createThailandSubdistrictOption);
    inputs.subdistrict.disabled = false;
    inputs.subdistrict.placeholder = "พิมพ์ชื่อตำบลหรือแขวง ไทย/อังกฤษ";
  } else {
    locationOptions.subdistrict = [];
    inputs.subdistrict.disabled = false;
    inputs.subdistrict.placeholder = "กรอกพื้นที่ย่อย แขวง หรือตำบล (ไม่บังคับ)";
  }
  if (options.focusNext) inputs.subdistrict.focus();
}

function clearLocationFieldsFrom(field, preserveValues = false) {
  const inputs = getLocationInputs();
  if (field === "country") {
    if (!preserveValues) {
      inputs.province.value = ""; inputs.district.value = ""; inputs.subdistrict.value = "";
    }
    inputs.province.dataset.locationId = ""; inputs.district.dataset.locationId = ""; inputs.subdistrict.dataset.locationId = "";
    locationOptions.province = []; locationOptions.district = []; locationOptions.subdistrict = [];
    inputs.district.disabled = true; inputs.subdistrict.disabled = true;
  }
  if (field === "province") {
    if (!preserveValues) { inputs.district.value = ""; inputs.subdistrict.value = ""; }
    inputs.district.dataset.locationId = ""; inputs.subdistrict.dataset.locationId = "";
    locationOptions.district = []; locationOptions.subdistrict = []; inputs.subdistrict.disabled = true;
  }
  if (field === "district") {
    if (!preserveValues) inputs.subdistrict.value = "";
    inputs.subdistrict.dataset.locationId = ""; locationOptions.subdistrict = [];
  }
}

function updateLocationLabels(country) {
  const thai = isThailandCountry(country);
  const provinceLabel = document.getElementById("provinceLabel");
  const districtLabel = document.getElementById("districtLabel");
  const subdistrictLabel = document.getElementById("subdistrictLabel");

  if (provinceLabel) provinceLabel.innerHTML = thai
    ? 'จังหวัด <span aria-hidden="true">*</span>'
    : 'รัฐ / จังหวัด / ภูมิภาค <span aria-hidden="true">*</span>';
  if (districtLabel) districtLabel.innerHTML = thai
    ? 'อำเภอ / เขต <span aria-hidden="true">*</span>'
    : 'เมือง / เขต / อำเภอ <span aria-hidden="true">*</span>';
  if (subdistrictLabel) subdistrictLabel.textContent = thai
    ? "ตำบล / แขวง"
    : "พื้นที่ย่อย";
}

function createThailandProvinceOption(province) {
  const label = formatBilingualName(province.name_th, province.name_en);
  return {
    id: province.id,
    value: label,
    label,
    secondary: "",
    search: [province.name_th, province.name_en, getThailandProvinceAlias(province)],
    raw: province
  };
}

function createThailandDistrictOption(district) {
  const label = formatBilingualName(district.name_th, district.name_en);
  return {
    id: district.id,
    value: label,
    label,
    secondary: "",
    search: [district.name_th, district.name_en],
    raw: district
  };
}

function createThailandSubdistrictOption(subdistrict) {
  const label = formatBilingualName(subdistrict.name_th, subdistrict.name_en);
  return {
    id: subdistrict.id,
    value: label,
    label,
    secondary: "",
    search: [subdistrict.name_th, subdistrict.name_en, subdistrict.zip_code],
    raw: subdistrict
  };
}

function formatBilingualName(thaiName, englishName) {
  return thaiName && englishName ? `${thaiName} (${englishName})` : thaiName || englishName || "";
}

function getThailandProvinceAlias(province) {
  return {
    "กรุงเทพมหานคร": "Bangkok BKK Krung Thep",
    "นครราชสีมา": "Nakhon Ratchasima Korat",
    "เชียงใหม่": "Chiang Mai",
    "ชลบุรี": "Chon Buri Chonburi",
    "พระนครศรีอยุธยา": "Phra Nakhon Si Ayutthaya Ayutthaya"
  }[province.name_th] || "";
}

function getLocationOptions(field) { return locationOptions[field] || []; }

function findLocationOption(field, value) {
  const normalized = normalizeLocationText(value);
  if (!normalized) return null;
  return getLocationOptions(field).find((item) =>
    [item.value, item.label, ...(item.search || [])]
      .some((candidate) => normalizeLocationText(candidate) === normalized)
  ) || null;
}

function locationOptionMatches(item, query) {
  const normalizedQuery = normalizeLocationText(query);
  if (!normalizedQuery) return true;
  const candidates = [item.value, item.label, item.secondary, ...(item.search || [])]
    .filter(Boolean).map(normalizeLocationText);
  if (candidates.some((candidate) => candidate.includes(normalizedQuery))) return true;
  return /^[a-z0-9]+$/i.test(normalizedQuery) && normalizedQuery.length >= 4
    ? candidates.some((candidate) => /^[a-z0-9]+$/i.test(candidate) && levenshteinDistance(candidate, normalizedQuery) <= 2)
    : false;
}

function findThailandProvinceByAnyName(value) {
  const normalized = normalizeLocationText(value);
  return thailandLocations.find((province) =>
    [province.name_th, province.name_en, formatBilingualName(province.name_th, province.name_en), getThailandProvinceAlias(province)]
      .some((candidate) => normalizeLocationText(candidate) === normalized)
  ) || null;
}

function findThailandDistrictByAnyName(provinceValue, districtValue) {
  const province = findThailandProvinceByAnyName(provinceValue);
  if (!province) return null;
  const normalized = normalizeLocationText(districtValue);
  return getProvinceDistricts(province).find((district) =>
    [district.name_th, district.name_en, formatBilingualName(district.name_th, district.name_en)]
      .some((candidate) => normalizeLocationText(candidate) === normalized)
  ) || null;
}

function getProvinceDistricts(province) {
  if (!province) return [];
  if (Array.isArray(province.districts)) return province.districts;
  if (Array.isArray(province.district)) return province.district;
  if (Array.isArray(province.amphure)) return province.amphure;
  return [];
}

function getDistrictSubdistricts(district) {
  if (!district) return [];
  if (Array.isArray(district.sub_districts)) return district.sub_districts;
  if (Array.isArray(district.subdistricts)) return district.subdistricts;
  if (Array.isArray(district.tambons)) return district.tambons;
  if (Array.isArray(district.tambon)) return district.tambon;
  return [];
}

function isThailandSelected() {
  return isThailandCountry(findLocationOption("country", getLocationInputs().country?.value));
}

function isThailandCountry(country) {
  if (!country) return false;
  const value = normalizeLocationText(country.value);
  return country.id === "TH"
    || normalizeLocationText(country.raw?.name) === "thailand"
    || value.includes("thailand")
    || value.includes("ประเทศไทย");
}

function normalizeLocationText(value) {
  return String(value || "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9ก-๙]/g, "");
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () => []);
  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function readJsonCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch { return null; }
}

function writeJsonCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Cache is optional. */ }
}

function getFallbackCountries() {
  return [
    { name: "Thailand", iso2: "TH", iso3: "THA", states: [] },
    { name: "Japan", iso2: "JP", iso3: "JPN", states: [] },
    { name: "United States", iso2: "US", iso3: "USA", states: [] },
    { name: "United Kingdom", iso2: "GB", iso3: "GBR", states: [] },
    { name: "Australia", iso2: "AU", iso3: "AUS", states: [] },
    { name: "Singapore", iso2: "SG", iso3: "SGP", states: [] }
  ];
}

async function submitRegistration(event) {
  event.preventDefault();
  if (!validateStep(3)) return;

  setLoading(true);
  clearStatus();

  const data = new FormData(form);
  const payload = {
    name: normalizeFullName(data.get("name")),
    username: data.get("username")?.trim(),
    email: data.get("email")?.trim().toLowerCase(),
    password: data.get("password"),
    phone: getPhoneE164(),
    phone_country: data.get("phone_country"),
    birth_date: toIsoDate(data.get("birthDate")),
    nickname: data.get("nickname")?.trim(),
    gender: data.get("gender"),
    contact_preference: "email",
    country: data.get("country")?.trim(),
    province: data.get("province")?.trim(),
    district: data.get("district")?.trim(),
    subdistrict: data.get("subdistrict")?.trim() || null,
    address: data.get("address")?.trim()
  };

  try {
    const response = await fetch(REGISTER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      if (result.errors && typeof result.errors === "object") {
        applyServerFieldErrors(result.errors);
        goToErrorStep(result.errors);
        throw new Error(result.message || "พบข้อมูลที่ต้องแก้ไข");
      }
      if (response.status === 429) throw new Error(result.message || "ส่งคำขอสมัครสมาชิกบ่อยเกินไป กรุณารอสักครู่");
      if (response.status === 404) throw new Error("ไม่พบ API สมัครสมาชิก กรุณาตรวจสอบการติดตั้ง userRegisterRoutes");
      throw new Error(result.message || "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
    }

    clearRegisterDraft();
    successModal.hidden = false;
    successModal.classList.remove("is-celebrating");
    void successModal.offsetWidth;
    successModal.classList.add("is-celebrating");
    document.body.style.overflow = "hidden";
  } catch (error) {
    showStatus(error.message === "Failed to fetch"
      ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาเปิด backend ที่ http://localhost:3000"
      : error.message, "error");
  } finally {
    setLoading(false);
  }
}

function applyServerFieldErrors(errors) {
  for (const [fieldName, message] of Object.entries(errors)) {
    const fieldId = fieldName === "phone_country" ? "phone" : fieldName;
    const field = document.getElementById(fieldId);
    if (!field) continue;
    if (Object.hasOwn(availabilityState, fieldName)) availabilityState[fieldName] = false;
    showFieldError(field, message);
  }
}

function goToErrorStep(errors) {
  const stepTwoFields = new Set(["phone", "phone_country", "birthDate", "nickname", "gender"]);
  const stepThreeFields = new Set(["country", "province", "district", "subdistrict", "address", "terms"]);
  const names = Object.keys(errors);

  if (names.some((name) => stepThreeFields.has(name))) {
    goToStep(3);
  } else if (names.some((name) => stepTwoFields.has(name))) {
    goToStep(2);
  } else {
    goToStep(1);
  }
}


function setNextLoading(loading) {
  if (!nextButton) return;
  nextButton.disabled = loading;
  nextButton.classList.toggle("is-loading", loading);
  nextButton.innerHTML = loading
    ? '<span class="button-mini-loader" aria-hidden="true"></span> กำลังตรวจสอบ'
    : 'ถัดไป <span aria-hidden="true">→</span>';
}


function setLoading(loading) {
  submitButton.classList.toggle("is-loading", loading);
  submitButton.disabled = loading;
  submitButton.querySelector(".submit-label").textContent = loading ? "กำลังสร้างบัญชี" : "สร้างบัญชี";
}

function showStatus(message, type = "info") {
  formStatus.textContent = message;
  formStatus.className = `form-status is-visible is-${type}`;
}

function clearStatus() {
  formStatus.textContent = "";
  formStatus.className = "form-status";
}

function setupMobileMenu() {
  const header = document.getElementById("siteHeader");
  document.getElementById("menuToggle")?.addEventListener("click", () => header?.classList.toggle("menu-open"));
}

function setupHeaderScroll() {
  const header = document.getElementById("siteHeader");
  const update = () => header?.classList.toggle("is-scrolled", window.scrollY > 16);
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
