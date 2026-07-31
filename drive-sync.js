/* Dong bo du lieu qua Google Drive, dung "appDataFolder" (khu vuc rieng cua
   app, nguoi dung khong thay trong Drive UI, chi can quyen pham vi hep
   "drive.appdata" thay vi toan bo Drive). Dung Google Identity Services
   (GIS) - hoan toan client-side, khong can server rieng.

   QUAN TRONG: phai dien GOOGLE_CLIENT_ID (xem HUONG_DAN_DONG_BO.md) va PWA
   phai duoc host qua HTTPS (hoac localhost) thi GIS moi hoat dong duoc. */

const GOOGLE_CLIENT_ID = "DIEN_CLIENT_ID_CUA_BAN_VAO_DAY.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const SYNC_FILE_NAME = "sotayluyendich_sync.json";

let _accessToken = null;
let _tokenClient = null;

function ensureGisLoaded() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google Identity Services (cần internet)"));
    document.head.appendChild(script);
  });
}

async function getAccessToken(silent) {
  if (_accessToken) return _accessToken;
  await ensureGisLoaded();
  return new Promise((resolve, reject) => {
    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        _accessToken = resp.access_token;
        resolve(_accessToken);
      },
      error_callback: (err) => reject(new Error(err.type || "Đăng nhập Google bị hủy")),
    });
    _tokenClient.requestAccessToken({ prompt: silent ? "" : "consent" });
  });
}

async function driveApiFetch(url, options, silent) {
  const token = await getAccessToken(silent);
  const res = await fetch(url, {
    ...options,
    headers: { ...(options && options.headers), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API lỗi ${res.status}: ${text}`);
  }
  return res;
}

async function findSyncFileId(silent) {
  const res = await driveApiFetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27${SYNC_FILE_NAME}%27&fields=files(id)`,
    {},
    silent
  );
  const data = await res.json();
  return data.files && data.files.length ? data.files[0].id : null;
}

async function downloadSyncFile(fileId, silent) {
  const res = await driveApiFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {},
    silent
  );
  return res.json();
}

async function uploadSyncFile(fileId, content, silent) {
  const metadata = fileId ? {} : { name: SYNC_FILE_NAME, parents: ["appDataFolder"] };
  const boundary = "-------sotayluyendich" + Date.now();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content)}` +
    `\r\n--${boundary}--`;

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  await driveApiFetch(
    url,
    { method: fileId ? "PATCH" : "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body },
    silent
  );
}

function isNewer(a, b) {
  // So sanh theo GIA TRI THOI GIAN THUC (Date.parse), khong so sanh chuoi
  // truc tiep - vi timestamp tu Python (microsecond) va JS (millisecond)
  // co do dai phan thap phan khac nhau, so sanh chuoi se sai.
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
  if (!silent) statusEl.textContent = "⏳ Đang đồng bộ...";
  try {
    const fileId = await findSyncFileId(silent);
    const remote = fileId ? (await downloadSyncFile(fileId, silent)).records || [] : [];
    const local = await listAllForSync();
    const merged = mergeRecords(local, remote);

    await uploadSyncFile(fileId, { version: 1, records: merged }, silent);
    for (const rec of merged) {
      await upsertFromSync(rec);
    }

    statusEl.textContent = `✅ Đã đồng bộ (${merged.length} mục) lúc ${new Date().toLocaleTimeString("vi-VN")}`;
    await loadSentenceList();
    await refreshStats();
  } catch (err) {
    console.error("Sync error:", err);
    if (!silent) statusEl.textContent = "❌ Lỗi đồng bộ: " + err.message;
  }
}

// Thu dong bo tu dong (im lang, khong hien loi) moi khi mo app - chi thanh
// cong neu nguoi dung DA tung dong y cap quyen truoc do trong phien trinh
// duyet nay (GIS luu session). Lan dau tien van can bam nut ☁️ de cap quyen.
window.addEventListener("load", () => {
  setTimeout(() => runSync(true), 1500);
});
