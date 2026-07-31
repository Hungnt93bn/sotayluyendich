/* Dong bo du lieu qua mot repo GitHub RIENG TU (private), dung GitHub Contents
   API + Personal Access Token (PAT) - don gian hon nhieu so voi Google OAuth
   (khong can Client ID, khong can consent screen, khong can mo trinh duyet
   moi lan dong bo).

   Nguoi dung tu tao 1 repo private tren GitHub (vd "sotayluyendich-data") va
   1 fine-grained PAT chi co quyen Contents Read/Write tren repo do, roi dien
   vao khung Cai dat dong bo trong app (luu trong localStorage, khong bao gio
   gui di dau khac ngoai api.github.com). */

const SYNC_CONFIG_KEY = "gh_sync_config";
const SYNC_FILE_PATH_DEFAULT = "sotayluyendich_sync.json";

function getSyncConfig() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSyncConfig(cfg) {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(cfg));
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

async function ghApiFetch(path, cfg, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      ...(options.headers || {}),
    },
  });
  return res;
}

async function downloadSyncFile(cfg) {
  const filePath = cfg.path || SYNC_FILE_PATH_DEFAULT;
  const res = await ghApiFetch(`/contents/${encodeURIComponent(filePath)}`, cfg);
  if (res.status === 404) return { sha: null, data: { version: 1, records: [] } };
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API lỗi ${res.status}: ${text}`);
  }
  const json = await res.json();
  const content = base64ToUtf8(json.content);
  return { sha: json.sha, data: JSON.parse(content) };
}

async function uploadSyncFile(cfg, content, sha) {
  const filePath = cfg.path || SYNC_FILE_PATH_DEFAULT;
  const body = {
    message: `Đồng bộ từ PWA lúc ${new Date().toISOString()}`,
    content: utf8ToBase64(JSON.stringify(content, null, 2)),
  };
  if (sha) body.sha = sha;
  const res = await ghApiFetch(`/contents/${encodeURIComponent(filePath)}`, cfg, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API lỗi ${res.status}: ${text}`);
  }
}

function isNewer(a, b) {
  // So sanh theo GIA TRI THOI GIAN THUC (Date.parse), khong so sanh chuoi
  // truc tiep - vi timestamp tu Python (UTC "...Z") va JS (UTC "...Z") co
  // the co do dai phan thap phan khac nhau (milliseconds vs microseconds
  // tu du lieu cu chua migrate).
  const ta = a ? Date.parse(a) : 0;
  const tb = b ? Date.parse(b) : 0;
  return ta > tb;
}

function mergeRecords(localRecords, remoteRecords) {
  const map = new Map();
  for (const r of remoteRecords) map.set(r.uuid, r);
  for (const l of localRecords) {
    const r = map.get(l.uuid);
    if (!r || isNewer(l.updated_at, r.updated_at)) map.set(l.uuid, l);
  }
  return Array.from(map.values());
}

async function runSync(silent) {
  const statusEl = document.getElementById("sync-status");
  const cfg = getSyncConfig();
  if (!cfg || !cfg.token || !cfg.owner || !cfg.repo) {
    if (!silent) openSyncSettings();
    return;
  }
  if (!silent) statusEl.textContent = "⏳ Đang đồng bộ...";
  try {
    const { sha, data } = await downloadSyncFile(cfg);
    const remote = data.records || [];
    const local = await listAllForSync();
    const merged = mergeRecords(local, remote);

    await uploadSyncFile(cfg, { version: 1, records: merged }, sha);
    for (const rec of merged) {
      await upsertFromSync(rec);
    }

    statusEl.textContent = `✅ Đã đồng bộ (${merged.length} mục) lúc ${new Date().toLocaleTimeString("vi-VN")}`;
    await loadSentenceList();
    await refreshStats();
  } catch (err) {
    console.error("Sync error:", err);
    statusEl.textContent = "❌ Lỗi đồng bộ: " + err.message;
  }
}

function openSyncSettings() {
  const cfg = getSyncConfig() || {};
  document.getElementById("gh-owner").value = cfg.owner || "";
  document.getElementById("gh-repo").value = cfg.repo || "";
  document.getElementById("gh-token").value = cfg.token || "";
  document.getElementById("gh-path").value = cfg.path || SYNC_FILE_PATH_DEFAULT;
  document.getElementById("sync-settings-modal").classList.add("active");
}

function closeSyncSettings() {
  document.getElementById("sync-settings-modal").classList.remove("active");
}

function saveSyncSettingsFromForm() {
  const owner = document.getElementById("gh-owner").value.trim();
  const repo = document.getElementById("gh-repo").value.trim();
  const token = document.getElementById("gh-token").value.trim();
  const path = document.getElementById("gh-path").value.trim() || SYNC_FILE_PATH_DEFAULT;
  if (!owner || !repo || !token) {
    alert("Cần điền đủ Tên tài khoản GitHub, Tên repo và Token.");
    return;
  }
  saveSyncConfig({ owner, repo, token, path });
  closeSyncSettings();
  runSync(false);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("sync-settings-btn").addEventListener("click", openSyncSettings);
  document.getElementById("sync-settings-cancel").addEventListener("click", closeSyncSettings);
  document.getElementById("sync-settings-save").addEventListener("click", saveSyncSettingsFromForm);

  // Dong bo tu dong (im lang) 1.5s sau khi mo app, chi khi da co cau hinh -
  // khong con can dang nhap moi lan nhu OAuth truoc day.
  setTimeout(() => runSync(true), 1500);
});
