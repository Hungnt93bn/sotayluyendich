/* So khop van ban (Levenshtein) - port tu core.py, dung cho Luyen tap va Nghe chep. */

function normalizeAnswer(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[.,!?;:"'()，。！？；：""'']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

function similarityPercent(a, b) {
  const na = normalizeAnswer(a);
  const nb = normalizeAnswer(b);
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length) || 1;
  return Math.max(0, Math.round((1 - levenshtein(na, nb) / maxLen) * 100));
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
