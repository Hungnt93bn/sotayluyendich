/* ---------- Tabs ---------- */
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

function activateTab(name) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  tabPanels.forEach((p) => p.classList.toggle("active", p.id === `tab-${name}`));
  if (name === "list") loadSentenceList();
  if (name === "practice") loadPractice();
  if (name === "dictation") loadNextDictation();
}

tabButtons.forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

/* ---------- Mic (Web Speech API) ---------- */
function getRecognition(lang) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome.");
    return null;
  }
  const r = new SpeechRecognition();
  r.lang = lang;
  r.interimResults = false;
  r.maxAlternatives = 1;
  return r;
}

function wireMicButton(btn) {
  btn.addEventListener("click", () => {
    const textarea = document.getElementById(btn.dataset.target);
    const recognition = getRecognition(btn.dataset.lang);
    if (!recognition) return;
    btn.classList.add("listening");
    btn.textContent = "🔴";
    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      textarea.value = textarea.value ? textarea.value + " " + transcript : transcript;
      textarea.dispatchEvent(new Event("input"));
    };
    recognition.onerror = (e) => console.error("Speech recognition error", e.error);
    recognition.onend = () => {
      btn.classList.remove("listening");
      btn.textContent = "🎤";
    };
  });
}
document.querySelectorAll(".mic-btn").forEach(wireMicButton);

/* ---------- Text-to-speech (giong doc trinh duyet) ---------- */
function speakText(text, lang) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "chinese" ? "zh-CN" : "en-US";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

/* ---------- Toggle Cau / Tu moi ---------- */
let currentType = "sentence";
const typeButtons = document.querySelectorAll(".type-toggle .type-btn[data-type]");
const labelVi = document.getElementById("label-vietnamese");
const labelEn = document.getElementById("label-english");
const labelZh = document.getElementById("label-chinese");

const TYPE_LABELS = {
  sentence: { vi: "Câu tiếng Việt", en: "Bản dịch tiếng Anh", zh: "Bản dịch tiếng Trung", ph: "Nhập hoặc đọc câu tiếng Việt..." },
  word: { vi: "Từ tiếng Việt", en: "Nghĩa tiếng Anh", zh: "Nghĩa tiếng Trung", ph: "Nhập hoặc đọc từ tiếng Việt..." },
};

typeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentType = btn.dataset.type;
    typeButtons.forEach((b) => b.classList.toggle("active", b === btn));
    const l = TYPE_LABELS[currentType];
    labelVi.textContent = l.vi;
    labelEn.textContent = l.en;
    labelZh.textContent = l.zh;
    document.getElementById("vietnamese").placeholder = l.ph;
  });
});

/* ---------- Stats ---------- */
async function refreshStats() {
  const s = await getStats();
  document.getElementById("stat-streak").textContent = s.streak;
  document.getElementById("stat-due").textContent = s.due;
  document.getElementById("stat-learned").textContent = s.learned;
}

/* ---------- Tab: Them cau/tu ---------- */
const inVi = document.getElementById("vietnamese");
const inEn = document.getElementById("english");
const inZh = document.getElementById("chinese");
const enPreview = document.getElementById("en-preview");
const zhPreview = document.getElementById("zh-preview");
const addStatus = document.getElementById("add-status");

let enDebounce, zhDebounce;
inEn.addEventListener("input", () => {
  clearTimeout(enDebounce);
  enDebounce = setTimeout(async () => {
    const ipa = inEn.value.trim() ? await toIpa(inEn.value.trim()) : "";
    enPreview.textContent = ipa ? `/${ipa}/` : "";
  }, 250);
});
inZh.addEventListener("input", () => {
  clearTimeout(zhDebounce);
  zhDebounce = setTimeout(async () => {
    zhPreview.textContent = inZh.value.trim() ? await toPinyin(inZh.value.trim()) : "";
  }, 250);
});

document.getElementById("save-btn").addEventListener("click", async () => {
  const vi = inVi.value.trim();
  if (!vi) {
    addStatus.style.color = "var(--incorrect)";
    addStatus.textContent = "Vui lòng nhập nội dung tiếng Việt.";
    return;
  }
  await addSentence(vi, inEn.value.trim(), inZh.value.trim(), currentType);
  clearAddForm();
  addStatus.style.color = "var(--correct)";
  addStatus.textContent = "✅ Đã lưu!";
  setTimeout(() => (addStatus.textContent = ""), 2000);
  refreshStats();
});

document.getElementById("clear-btn").addEventListener("click", clearAddForm);

function clearAddForm() {
  inVi.value = "";
  inEn.value = "";
  inZh.value = "";
  enPreview.textContent = "";
  zhPreview.textContent = "";
  addStatus.textContent = "";
}

document.getElementById("copy-ai-btn").addEventListener("click", async () => {
  const vi = inVi.value.trim();
  if (!vi) {
    addStatus.style.color = "var(--incorrect)";
    addStatus.textContent = "Vui lòng nhập nội dung tiếng Việt trước.";
    return;
  }
  const text =
    "Hãy kiểm tra bản dịch tiếng Anh và tiếng Trung sau có đúng nghĩa và đúng ngữ pháp so với câu tiếng Việt không. Nếu sai, chỉ rõ lỗi cụ thể (sai từ nào, sai ngữ pháp gì) và gợi ý sửa.\n\n" +
    `Câu tiếng Việt: ${vi}\n` +
    `Bản dịch tiếng Anh: ${inEn.value.trim() || "(chưa có)"}\n` +
    `Bản dịch tiếng Trung: ${inZh.value.trim() || "(chưa có)"}`;
  await navigator.clipboard.writeText(text);
  addStatus.style.color = "var(--correct)";
  addStatus.textContent = "📋 Đã copy! Dán vào Claude để kiểm tra.";
});

/* ---------- Tab: Danh sach ---------- */
let allSentencesCache = [];
const searchInput = document.getElementById("search-input");
searchInput.addEventListener("input", renderSentenceList);

async function loadSentenceList() {
  allSentencesCache = await listAll();
  renderSentenceList();
}

function filterSentences(items) {
  const term = searchInput.value.trim().toLowerCase();
  if (!term) return items;
  return items.filter((it) =>
    [it.vietnamese, it.english, it.chinese, it.pinyin].some((f) => (f || "").toLowerCase().includes(term))
  );
}

function renderSentenceList() {
  const container = document.getElementById("sentence-list");
  const items = filterSentences(allSentencesCache);

  if (allSentencesCache.length === 0) {
    container.innerHTML = "<p class='empty-msg'>Chưa có câu nào. Sang tab ➕ để bắt đầu!</p>";
    return;
  }
  if (items.length === 0) {
    container.innerHTML = "<p class='empty-msg'>Không tìm thấy câu/từ nào khớp.</p>";
    return;
  }

  container.innerHTML = "";
  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "sentence-item";
    div.innerHTML = `
      <span class="box-badge">hộp ${item.box}/5</span>
      <button class="edit-btn" title="Sửa">✏️</button>
      <button class="delete-btn" title="Xóa">🗑</button>
      <div class="type-badge">${item.type === "word" ? "🔤 Từ vựng" : "📝 Câu"}</div>
      <div class="vi"><span class="item-number">${index + 1}.</span> ${escapeHtml(item.vietnamese)}</div>
      <div class="en">${escapeHtml(item.english || "")}</div>
      ${item.ipa ? `<div class="ipa">/${escapeHtml(item.ipa)}/</div>` : ""}
      ${item.chinese ? `<div class="zh">${escapeHtml(item.chinese)}</div>` : ""}
      ${item.pinyin ? `<div class="pinyin">${escapeHtml(item.pinyin)}</div>` : ""}
    `;
    div.querySelector(".delete-btn").addEventListener("click", async () => {
      if (!confirm("Xóa câu/từ này?")) return;
      await deleteSentence(item.uuid);
      loadSentenceList();
      refreshStats();
    });
    div.querySelector(".edit-btn").addEventListener("click", () => openEditModal(item));
    container.appendChild(div);
  });
}

/* ---------- Modal Sua ---------- */
const editModal = document.getElementById("edit-modal");
const editVi = document.getElementById("edit-vi");
const editEn = document.getElementById("edit-en");
const editZh = document.getElementById("edit-zh");
const editEnPreview = document.getElementById("edit-en-preview");
const editZhPreview = document.getElementById("edit-zh-preview");
let editingUuid = null;

function openEditModal(item) {
  editingUuid = item.uuid;
  editVi.value = item.vietnamese;
  editEn.value = item.english || "";
  editZh.value = item.chinese || "";
  editEnPreview.textContent = item.ipa ? `/${item.ipa}/` : "";
  editZhPreview.textContent = item.pinyin || "";
  editModal.classList.add("active");
}

let editEnDebounce, editZhDebounce;
editEn.addEventListener("input", () => {
  clearTimeout(editEnDebounce);
  editEnDebounce = setTimeout(async () => {
    const ipa = editEn.value.trim() ? await toIpa(editEn.value.trim()) : "";
    editEnPreview.textContent = ipa ? `/${ipa}/` : "";
  }, 250);
});
editZh.addEventListener("input", () => {
  clearTimeout(editZhDebounce);
  editZhDebounce = setTimeout(async () => {
    editZhPreview.textContent = editZh.value.trim() ? await toPinyin(editZh.value.trim()) : "";
  }, 250);
});

document.getElementById("edit-cancel-btn").addEventListener("click", () => {
  editModal.classList.remove("active");
});
document.getElementById("edit-save-btn").addEventListener("click", async () => {
  const vi = editVi.value.trim();
  if (!vi) return alert("Vui lòng nhập nội dung tiếng Việt.");
  await updateSentence(editingUuid, vi, editEn.value.trim(), editZh.value.trim());
  editModal.classList.remove("active");
  loadSentenceList();
});

/* ---------- Xuat PDF (in qua trinh duyet) ---------- */
document.getElementById("export-pdf-btn").addEventListener("click", async () => {
  const rows = await listAll();
  const printArea = document.getElementById("print-area");
  if (rows.length === 0) {
    alert("Chưa có dữ liệu để xuất.");
    return;
  }
  printArea.innerHTML =
    "<h2>Danh sách câu/từ đã lưu</h2>" +
    rows
      .map((r, i) => {
        const label = r.type === "word" ? "[Từ vựng]" : "[Câu]";
        return `
        <div class="p-item">
          <div class="p-vi">${i + 1}. ${label} VI: ${escapeHtml(r.vietnamese)}</div>
          <div class="p-en">EN: ${escapeHtml(r.english || "")}</div>
          ${r.ipa ? `<div class="p-ipa">IPA: /${escapeHtml(r.ipa)}/</div>` : ""}
          ${r.chinese ? `<div class="p-zh">ZH: ${escapeHtml(r.chinese)}</div>` : ""}
          ${r.pinyin ? `<div class="p-pinyin">Pinyin: ${escapeHtml(r.pinyin)}</div>` : ""}
        </div>`;
      })
      .join("");
  window.print();
});

/* ---------- Tab: Luyen tap (Flashcard + Leitner) ---------- */
let practiceQueue = [];
let practiceIndex = 0;

async function loadPractice() {
  practiceQueue = await dueForPractice();
  practiceIndex = 0;
  renderPracticeCard();
}

function renderPracticeCard() {
  const area = document.getElementById("practice-area");
  const progress = document.getElementById("practice-progress");

  if (practiceQueue.length === 0) {
    progress.textContent = "";
    area.innerHTML = "<p class='empty-msg'>🎉 Không có câu nào cần ôn hôm nay!</p>";
    return;
  }
  if (practiceIndex >= practiceQueue.length) {
    progress.textContent = "";
    area.innerHTML = "<p class='empty-msg'>🏆 Bạn đã ôn xong hết câu cần ôn hôm nay!</p>";
    refreshStats();
    return;
  }

  const item = practiceQueue[practiceIndex];
  progress.textContent = `Câu ${practiceIndex + 1} / ${practiceQueue.length}`;

  area.innerHTML = `
    <div class="flashcard">
      <div class="type-badge">${item.type === "word" ? "🔤 Từ vựng" : "📝 Câu"}</div>
      <div class="vi-text">${escapeHtml(item.vietnamese)}</div>
      <div class="input-row" style="margin-top:10px;">
        <textarea id="prac-en" rows="2" spellcheck="false" placeholder="Gõ lại bản dịch tiếng Anh..."></textarea>
      </div>
      <div class="input-row" style="margin-top:8px;">
        <textarea id="prac-zh" rows="2" spellcheck="false" placeholder="输入中文翻译..."></textarea>
      </div>
      <div id="prac-result" class="feedback" style="display:none;"></div>
      <div class="reveal-actions" style="margin-top:10px;">
        <button class="flip-btn secondary-flip" id="prac-check-btn">✅ Kiểm tra</button>
        <button class="flip-btn secondary-flip" id="prac-flip-btn">🔄 Xem đáp án</button>
        <button class="flip-btn secondary-flip" id="prac-copy-btn">📋 Copy để hỏi AI</button>
      </div>
      <div id="prac-rate" class="rate-row" style="display:none;">
        <button class="rate-btn forgot" id="prac-forgot-btn">😅 Chưa nhớ</button>
        <button class="rate-btn remembered" id="prac-remembered-btn">👍 Đã nhớ</button>
      </div>
    </div>
  `;

  const resultEl = document.getElementById("prac-result");
  const rateEl = document.getElementById("prac-rate");

  function showAnswer() {
    resultEl.style.display = "block";
    resultEl.className = "feedback";
    resultEl.innerHTML =
      `<b>Đáp án Anh:</b> ${escapeHtml(item.english || "(chưa có)")}${item.ipa ? ` /${escapeHtml(item.ipa)}/` : ""}<br>` +
      `<b>Đáp án Trung:</b> ${escapeHtml(item.chinese || "(chưa có)")}${item.pinyin ? ` (${escapeHtml(item.pinyin)})` : ""}`;
    rateEl.style.display = "flex";
  }

  document.getElementById("prac-flip-btn").addEventListener("click", showAnswer);

  document.getElementById("prac-check-btn").addEventListener("click", () => {
    const parts = [];
    if (item.english) {
      const score = similarityPercent(document.getElementById("prac-en").value, item.english);
      const ok = score >= 90;
      parts.push(`${ok ? "✅" : "❌"} Anh: khớp ${score}% — đáp án: ${escapeHtml(item.english)}${item.ipa ? ` /${escapeHtml(item.ipa)}/` : ""}`);
    }
    if (item.chinese) {
      const score = similarityPercent(document.getElementById("prac-zh").value, item.chinese);
      const ok = score >= 90;
      parts.push(`${ok ? "✅" : "❌"} Trung: khớp ${score}% — đáp án: ${escapeHtml(item.chinese)}`);
    }
    resultEl.style.display = "block";
    resultEl.className = "feedback";
    resultEl.innerHTML = parts.join("<br>");
    rateEl.style.display = "flex";
  });

  document.getElementById("prac-copy-btn").addEventListener("click", async () => {
    const en = document.getElementById("prac-en").value.trim();
    const zh = document.getElementById("prac-zh").value.trim();
    const text =
      "Hãy kiểm tra bản dịch tiếng Anh và tiếng Trung sau có đúng nghĩa và đúng ngữ pháp so với câu tiếng Việt không. Nếu sai, chỉ rõ lỗi cụ thể và gợi ý sửa.\n\n" +
      `Câu tiếng Việt: ${item.vietnamese}\n` +
      `Bản dịch tiếng Anh: ${en || "(chưa gõ)"}\n` +
      `Bản dịch tiếng Trung: ${zh || "(chưa gõ)"}`;
    await navigator.clipboard.writeText(text);
    resultEl.style.display = "block";
    resultEl.className = "feedback";
    resultEl.textContent = "📋 Đã copy! Dán vào Claude để kiểm tra.";
  });

  document.getElementById("prac-forgot-btn").addEventListener("click", () => rate(item, false));
  document.getElementById("prac-remembered-btn").addEventListener("click", () => rate(item, true));
}

async function rate(item, remembered) {
  await reviewSentence(item.uuid, remembered);
  practiceIndex += 1;
  renderPracticeCard();
}

/* ---------- Tab: Nghe chep (Dictation) ---------- */
let dictationLang = "english";
let dictationItem = null;
let dictationStats = { done: 0, correct: 0 };

document.querySelectorAll(".dictation-lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    dictationLang = btn.dataset.lang;
    document.querySelectorAll(".dictation-lang-btn").forEach((b) => b.classList.toggle("active", b === btn));
    dictationStats = { done: 0, correct: 0 };
    loadNextDictation();
  });
});

async function loadNextDictation() {
  const area = document.getElementById("dictation-area");
  updateDictationStats();
  dictationItem = await randomForDictation(dictationLang);
  if (!dictationItem) {
    area.innerHTML = `<p class="empty-msg">Chưa có câu/từ nào có nội dung tiếng ${dictationLang === "english" ? "Anh" : "Trung"}.</p>`;
    return;
  }
  renderDictationCard();
}

function updateDictationStats() {
  document.getElementById("dictation-stats").textContent =
    `Đã làm: ${dictationStats.done} | Đúng: ${dictationStats.correct}`;
}

function renderDictationCard() {
  const area = document.getElementById("dictation-area");
  const target = dictationItem[dictationLang];

  area.innerHTML = `
    <div class="flashcard">
      <div class="type-badge">${dictationItem.type === "word" ? "🔤 Từ vựng" : "📝 Câu"}</div>
      <button class="flip-btn" id="play-btn">🔊 Nghe</button>
      <div class="input-row" style="margin-top:10px;">
        <textarea id="dictation-input" rows="2" spellcheck="false" placeholder="Gõ lại những gì bạn nghe được..."></textarea>
      </div>
      <div id="dictation-result"></div>
      <div class="reveal-actions" style="margin-top:10px;">
        <button class="flip-btn secondary-flip" id="check-dictation-btn">✅ Kiểm tra</button>
        <button class="flip-btn secondary-flip" id="replay-btn">🔁 Nghe lại</button>
      </div>
      <button class="flip-btn" id="next-dictation-btn">➡️ Câu tiếp theo</button>
    </div>
  `;

  document.getElementById("play-btn").addEventListener("click", () => speakText(target, dictationLang));
  document.getElementById("replay-btn").addEventListener("click", () => speakText(target, dictationLang));
  document.getElementById("next-dictation-btn").addEventListener("click", loadNextDictation);
  document.getElementById("check-dictation-btn").addEventListener("click", () => {
    const userInput = document.getElementById("dictation-input").value.trim();
    const resultEl = document.getElementById("dictation-result");
    if (!userInput) {
      resultEl.className = "feedback incorrect";
      resultEl.textContent = "Bạn chưa gõ gì cả.";
      return;
    }
    const score = similarityPercent(userInput, target);
    const isCorrect = score >= 90;
    dictationStats.done += 1;
    if (isCorrect) dictationStats.correct += 1;
    updateDictationStats();
    resultEl.className = "feedback " + (isCorrect ? "correct" : "incorrect");
    resultEl.innerHTML =
      `<div>${isCorrect ? "✅ Chính xác!" : `❌ Chưa đúng (khớp ${score}%)`}</div>` +
      `<div>Câu gốc: ${escapeHtml(target)}</div>`;
  });

  speakText(target, dictationLang);
}

/* ---------- Sync button ---------- */
document.getElementById("sync-btn").addEventListener("click", () => runSync());

/* ---------- Init ---------- */
refreshStats();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((e) => console.error("SW register failed", e));
}
