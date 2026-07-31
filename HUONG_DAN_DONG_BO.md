# Hướng dẫn bật đồng bộ (qua GitHub)

Đồng bộ giữa app máy tính và app điện thoại (PWA) dùng một **repo GitHub
riêng tư (private)** làm nơi trung chuyển dữ liệu, và một **Personal Access
Token (PAT)** để 2 app đọc/ghi file dữ liệu đó. Cách này đơn giản hơn Google
Drive OAuth — không cần Client ID, không cần màn hình xin quyền, không cần
mở trình duyệt đăng nhập mỗi lần.

## 1. Tạo repo GitHub riêng tư để chứa dữ liệu

1. Đăng nhập https://github.com , bấm "+" ở góc trên → "New repository".
2. Đặt tên, ví dụ `sotayluyendich-data`.
3. **Chọn "Private"** (bắt buộc — đây là nơi chứa câu/từ bạn đã lưu, không
   nên để public).
4. Không cần tick thêm gì khác (không cần README). Bấm "Create repository".

Repo này chỉ dùng để chứa 1 file JSON dữ liệu — không liên quan tới repo
`sotayluyendich` (chứa code, để public để host GitHub Pages).

## 2. Tạo Personal Access Token (PAT)

1. Vào https://github.com/settings/personal-access-tokens/new (hoặc
   Settings → Developer settings → Personal access tokens → Fine-grained
   tokens → "Generate new token").
2. Đặt tên, ví dụ `sotayluyendich-sync`.
3. "Expiration": chọn thời hạn tuỳ ý (ví dụ 1 năm, hoặc "No expiration" nếu
   muốn khỏi phải tạo lại).
4. "Repository access" → chọn "Only select repositories" → chọn đúng repo
   `sotayluyendich-data` vừa tạo (**không** chọn repo code public).
5. "Permissions" → mục "Repository permissions" → tìm dòng "Contents" → đổi
   thành **"Read and write"**. Các quyền khác để mặc định "No access".
6. Bấm "Generate token" ở cuối trang. **Copy token ngay** (dạng
   `github_pat_...`) — GitHub chỉ hiện 1 lần, không xem lại được sau khi rời
   trang.

## 3. Điền cấu hình vào app máy tính

1. Mở app desktop (`SoTayLuyenDich.exe`), bấm nút "⚙️" cạnh nút "☁️ Đồng bộ".
2. Điền:
   - Tên tài khoản GitHub (owner): tên tài khoản GitHub của bạn.
   - Tên repo: `sotayluyendich-data` (hoặc tên bạn đã đặt).
   - Personal Access Token: dán token đã copy ở bước 2.6.
   - Đường dẫn file: để mặc định `sotayluyendich_sync.json`.
3. Bấm "Lưu". Từ giờ bấm "☁️ Đồng bộ" là chạy được ngay, không cần đăng nhập
   gì thêm.

## 4. Điền cấu hình vào PWA (điện thoại/trình duyệt)

1. Mở PWA, bấm nút "⚙️" cạnh nút "☁️".
2. Điền đúng 4 thông tin như bước 3.2 (cùng 1 token/repo với máy tính).
3. Bấm "Lưu và đồng bộ".

## 5. Host PWA qua HTTPS (dùng GitHub Pages — miễn phí)

Điện thoại Android/Chrome chỉ cho cài "app từ web" (PWA) và chạy Service
Worker khi trang được phục vụ qua **HTTPS thật** — cách đơn giản nhất là
GitHub Pages, dùng chính repo code public `sotayluyendich`.

1. Đẩy toàn bộ nội dung thư mục `d:\Study\StudyProgram\pwa\` lên repo
   `sotayluyendich` (nhánh `main`), giữ nguyên cấu trúc thư mục.
2. Vào repo trên GitHub → "Settings" → "Pages" → mục "Build and deployment"
   → Source: "Deploy from a branch" → Branch: `main` / `/ (root)` → "Save".
3. Chờ 1-2 phút, GitHub sẽ cấp địa chỉ dạng:
   `https://<ten-tai-khoan-github>.github.io/sotayluyendich/`

## 6. Cài PWA lên điện thoại Android

1. Mở Chrome trên điện thoại, vào đúng địa chỉ ở bước 5.3.
2. Chrome sẽ hiện gợi ý "Thêm vào Màn hình chính" / "Cài đặt ứng dụng"
   (hoặc vào menu ⋮ → "Cài đặt ứng dụng"). Bấm cài.
3. Mở app vừa cài, làm bước 4 để cấu hình đồng bộ.

## Lưu ý

- Token có quyền ghi vào đúng 1 repo bạn chỉ định — kể cả bị lộ, người khác
  cũng không đụng được vào Drive/tài khoản Google hay bất kỳ repo nào khác
  của bạn.
- Muốn thu hồi token: vào lại
  https://github.com/settings/personal-access-tokens , bấm "Revoke" — cả 2
  app sẽ ngừng đồng bộ được cho tới khi bạn tạo token mới và điền lại qua
  nút "⚙️".
- File `github_sync_config.json` (chứa token) được lưu cạnh `data.db` trên
  máy tính — không chia sẻ file này cho ai, và không đưa vào git.
