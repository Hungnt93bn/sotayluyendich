/* Luu tru cuc bo bang IndexedDB - thay the hoan toan Flask API cu, chay
   duoc offline. Moi ban ghi co "uuid" (khong phai id tu tang) de dong bo
   an toan giua nhieu thiet bi qua Google Drive (tranh trung id). */

const DB_NAME = "sotayluyendich";
const DB_VERSION = 1;
const STORE = "sentences";

const BOX_INTERVAL_DAYS = { 1: 0, 2: 2, 3: 4, 4: 8, 5: 16 };
const MAX_BOX = 5;

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function nowIso() {
  return new Date().toISOString();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "uuid" });
        store.createIndex("next_review", "next_review");
        store.createIndex("type", "type");
        store.createIndex("updated_at", "updated_at");
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function addSentence(vietnamese, english, chinese, type) {
  const db = await openDb();
  const ipa = await toIpa(english);
  const pinyin = await toPinyin(chinese);
  const record = {
    uuid: uuid(),
    vietnamese, english, chinese, pinyin, ipa,
    box: 1,
    next_review: todayStr(),
    type: type || "sentence",
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted: false,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function updateSentence(uuidVal, vietnamese, english, chinese) {
  const db = await openDb();
  const ipa = await toIpa(english);
  const pinyin = await toPinyin(chinese);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(uuidVal);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) return reject(new Error("Khong tim thay ban ghi"));
      rec.vietnamese = vietnamese;
      rec.english = english;
      rec.chinese = chinese;
      rec.ipa = ipa;
      rec.pinyin = pinyin;
      rec.updated_at = nowIso();
      store.put(rec);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function deleteSentence(uuidVal) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(uuidVal);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (rec) {
        rec.deleted = true;
        rec.updated_at = nowIso();
        store.put(rec);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function listAll(type) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      let rows = req.result.filter((r) => !r.deleted);
      if (type) rows = rows.filter((r) => r.type === type);
      rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      resolve(rows);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dueForPractice() {
  const db = await openDb();
  const today = todayStr();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = req.result.filter((r) => !r.deleted && r.next_review <= today);
      rows.sort((a, b) => (a.next_review || "").localeCompare(b.next_review || ""));
      resolve(rows);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function reviewSentence(uuidVal, remembered) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(uuidVal);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) return reject(new Error("Khong tim thay ban ghi"));
      rec.box = remembered ? Math.min(rec.box + 1, MAX_BOX) : 1;
      const d = new Date();
      d.setDate(d.getDate() + BOX_INTERVAL_DAYS[rec.box]);
      rec.next_review = d.toISOString().slice(0, 10);
      rec.updated_at = nowIso();
      store.put(rec);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function randomForDictation(lang) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = req.result.filter((r) => !r.deleted && r[lang] && r[lang].trim());
      if (!rows.length) return resolve(null);
      resolve(rows[Math.floor(Math.random() * rows.length)]);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getStats() {
  const rows = await listAll();
  const today = todayStr();
  const due = rows.filter((r) => r.next_review <= today).length;
  const learned = rows.filter((r) => r.box >= MAX_BOX).length;

  let streak = parseInt(localStorage.getItem("streak") || "0", 10);
  const lastActive = localStorage.getItem("last_active");
  if (lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    streak = lastActive === yStr ? streak + 1 : 1;
    localStorage.setItem("last_active", today);
    localStorage.setItem("streak", String(streak));
  }
  return { streak, total: rows.length, due, learned };
}

/* ---- Danh cho dong bo Google Drive (xem drive-sync.js) ---- */

async function listAllForSync() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function upsertFromSync(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}
