/* Chuyen tieng Trung sang Pinyin co dau, tra tung ky tu (port tu core.py). */

let _pinyinDict = null;

async function loadPinyinDict() {
  if (_pinyinDict) return _pinyinDict;
  const res = await fetch("data/pinyin_dict.json");
  _pinyinDict = await res.json();
  return _pinyinDict;
}

async function toPinyin(chineseText) {
  if (!chineseText) return "";
  const dict = await loadPinyinDict();
  const chars = Array.from(chineseText);
  const parts = [];
  for (const ch of chars) {
    if (ch.trim() === "") continue;
    parts.push(dict[ch] || ch);
  }
  return parts.join(" ");
}
