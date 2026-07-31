/* Chuyen tieng Anh sang IPA dua tren tu dien CMU (ARPAbet).
   Port tu core.py cua ban desktop - xu ly dung nguyen am AH/ER co trong am
   khac voi khong trong am (loi cua thu vien eng_to_ipa goc la luon quy ve
   dang khong trong am, vd "love" sai thanh "ləv" thay vi "lʌv"). */

const ARPABET_TO_IPA = {
  aa: "ɑ", ae: "æ", ao: "ɔ", aw: "aʊ", ay: "aɪ",
  b: "b", ch: "tʃ", d: "d", dh: "ð", eh: "ɛ",
  ey: "eɪ", f: "f", g: "g", hh: "h", ih: "ɪ", iy: "i",
  jh: "dʒ", k: "k", l: "l", m: "m", n: "n", ng: "ŋ",
  ow: "oʊ", oy: "ɔɪ", p: "p", r: "r", s: "s", sh: "ʃ",
  t: "t", th: "θ", uh: "ʊ", uw: "u", v: "v", w: "w",
  y: "j", z: "z", zh: "ʒ",
};

const STRESS_DEPENDENT = {
  ah: { stressed: "ʌ", unstressed: "ə" },
  er: { stressed: "ɜr", unstressed: "ər" },
};

let _cmuDict = null;

async function loadCmuDict() {
  if (_cmuDict) return _cmuDict;
  const res = await fetch("data/cmu_dict.json");
  _cmuDict = await res.json();
  return _cmuDict;
}

function wordToIpa(word, cmuDict) {
  const entries = cmuDict[word.toLowerCase()];
  if (!entries || !entries.length) return null;

  const raw = entries[0].split(" ");
  const bases = [];
  const stresses = [];
  for (const ph of raw) {
    const m = ph.match(/^([a-z]+)([0-2])?$/);
    if (!m) continue;
    bases.push(m[1]);
    stresses.push(m[2] || null);
  }

  // Dat dau trong am ngay truoc phu am dau cua am tiet (dung quy uoc tu dien)
  const marks = new Array(bases.length).fill("");
  for (let i = 0; i < stresses.length; i++) {
    const s = stresses[i];
    if (s === "1" || s === "2") {
      const mark = s === "1" ? "ˈ" : "ˌ";
      let j = i;
      while (j > 0 && stresses[j - 1] === null) j--;
      marks[j] += mark;
    }
  }

  let out = "";
  for (let i = 0; i < bases.length; i++) {
    const base = bases[i];
    let sym;
    if (STRESS_DEPENDENT[base]) {
      const key = stresses[i] === "1" || stresses[i] === "2" ? "stressed" : "unstressed";
      sym = STRESS_DEPENDENT[base][key];
    } else {
      sym = ARPABET_TO_IPA[base] || base;
    }
    out += marks[i] + sym;
  }
  return out;
}

async function toIpa(englishText) {
  if (!englishText) return "";
  const cmuDict = await loadCmuDict();
  const words = englishText.match(/[A-Za-z']+/g);
  if (!words) return "";
  const parts = words.map((w) => wordToIpa(w, cmuDict) || w);
  return parts.join(" ");
}
