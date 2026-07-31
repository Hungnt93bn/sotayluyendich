# Hướng dẫn bật đồng bộ Google Drive

Cần làm 2 việc một lần duy nhất: (1) tạo project + OAuth Client ID trên Google
Cloud Console, (2) host thư mục `pwa/` qua HTTPS để cài lên điện thoại Android.
Sau đó app máy tính và app điện thoại sẽ tự đồng bộ qua nhau (mỗi bên có nút
"☁️ Đồng bộ" / "Đồng bộ").

## 1. Tạo project trên Google Cloud Console

1. Vào https://console.cloud.google.com/ , đăng nhập bằng tài khoản Google của bạn.
2. Góc trên bên trái, bấm chọn project → "New Project". Đặt tên tuỳ ý, ví dụ
   `SoTayLuyenDich`. Bấm "Create".
3. Chờ vài giây rồi chọn project vừa tạo (dropdown ở góc trên).

## 2. Bật Google Drive API

1. Menu bên trái → "APIs & Services" → "Library".
2. Tìm "Google Drive API" → bấm vào → bấm "Enable".

## 3. Cấu hình màn hình xin quyền (OAuth consent screen)

1. Menu bên trái → "APIs & Services" → "OAuth consent screen".
2. Chọn "External" → "Create".
3. Điền tên app (`Sổ Tay Luyện Dịch`), email hỗ trợ (email của bạn), email
   liên hệ ở cuối trang. Bấm "Save and Continue" qua các bước Scopes/Test
   users (không cần thêm gì, để mặc định) tới khi xong.
4. Ở mục "Test users" (vì app ở chế độ "Testing", chưa public), bấm "+ Add
   users" và thêm chính email Google bạn sẽ dùng để đăng nhập trong app
   (`taihung.bn@gmail.com` nếu đó là tài khoản bạn dùng). **Bắt buộc** — nếu
   không thêm, Google sẽ từ chối đăng nhập.

## 4. Tạo 2 OAuth Client ID

Menu bên trái → "APIs & Services" → "Credentials" → "+ Create Credentials" →
"OAuth client ID". Tạo **2 client riêng biệt**:

### Client cho PWA (dùng trên điện thoại/trình duyệt)
- Loại: **Web application**
- Tên: `SoTayLuyenDich - PWA`
- "Authorized JavaScript origins": thêm đúng domain bạn sẽ host PWA, ví dụ
  `https://<ten-user>.github.io` (xem bước 6 để lấy domain này trước, hoặc
  quay lại sửa sau khi đã host xong — có thể sửa credential bất cứ lúc nào).
- Bấm "Create". Copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`).
- Mở [drive-sync.js](drive-sync.js), dán vào biến `GOOGLE_CLIENT_ID` (dòng 9),
  thay cho `"DIEN_CLIENT_ID_CUA_BAN_VAO_DAY.apps.googleusercontent.com"`.

### Client cho ứng dụng máy tính (Desktop)
- Loại: **Desktop app**
- Tên: `SoTayLuyenDich - Desktop`
- Bấm "Create". Copy **Client ID**.
- Mở [../desktop/drive_sync.py](../desktop/drive_sync.py), dán vào biến
  `GOOGLE_CLIENT_ID` (gần đầu file), thay cho
  `"DIEN_CLIENT_ID_DESKTOP_CUA_BAN_VAO_DAY.apps.googleusercontent.com"`.

Không cần "Client secret" cho loại Desktop app — luồng đăng nhập dùng PKCE
nên không cần giữ bí mật.

## 5. Host PWA qua HTTPS (dùng GitHub Pages — miễn phí)

Điện thoại Android/Chrome chỉ cho cài "app từ web" (PWA) và chạy Service
Worker khi trang được phục vụ qua **HTTPS thật** (không phải mở trực tiếp
file trên máy, không phải IP nội bộ thường). Cách đơn giản nhất: GitHub Pages.

1. Tạo tài khoản GitHub (nếu chưa có): https://github.com/signup
2. Tạo repository mới, ví dụ tên `sotayluyendich`, để **Public**.
3. Đẩy toàn bộ nội dung thư mục `d:\Study\StudyProgram\pwa\` lên repo đó
   (nhánh `main`), giữ nguyên cấu trúc thư mục.
4. Vào repo trên GitHub → "Settings" → "Pages" → mục "Build and deployment"
   → Source: "Deploy from a branch" → Branch: `main` / `/ (root)` → "Save".
5. Chờ 1-2 phút, GitHub sẽ cấp một địa chỉ dạng:
   `https://<ten-tai-khoan-github>.github.io/sotayluyendich/`
6. Quay lại bước 4, cập nhật "Authorized JavaScript origins" của Client PWA
   thành đúng domain đó (chỉ phần gốc, không có đường dẫn con), ví dụ
   `https://<ten-tai-khoan-github>.github.io`.

## 6. Cài PWA lên điện thoại Android

1. Mở Chrome trên điện thoại, vào đúng địa chỉ ở bước 5.6.
2. Chrome sẽ hiện gợi ý "Thêm vào Màn hình chính" / "Cài đặt ứng dụng"
   (hoặc vào menu ⋮ → "Cài đặt ứng dụng"). Bấm cài.
3. Mở app vừa cài, bấm nút đồng bộ, đăng nhập Google (chọn đúng tài khoản đã
   thêm ở bước 3.4), đồng ý cấp quyền.

## 7. Đồng bộ trên máy tính

1. Mở lại app desktop (`SoTayLuyenDich.exe`), bấm nút "☁️ Đồng bộ" ở đầu
   cửa sổ.
2. Trình duyệt mặc định sẽ tự mở ra để đăng nhập Google (chọn đúng tài khoản
   ở bước 3.4), đồng ý cấp quyền. Sau khi thấy dòng "Đã đăng nhập Google
   thành công", có thể đóng tab đó và quay lại app — app sẽ tự tiếp tục.
3. Từ lần sau, app tự làm mới token, không cần mở trình duyệt lại (trừ khi
   token bị thu hồi hoặc hết hạn refresh token).

## Lưu ý

- Chỉ cần làm bước 1-6 **một lần**. Sau đó chỉ cần bấm nút đồng bộ ở 2 bên
  mỗi khi muốn cập nhật qua lại.
- Vì app đang ở chế độ OAuth "Testing", chỉ tài khoản được thêm ở bước 3.4
  mới đăng nhập được. Muốn thêm người dùng khác, quay lại "OAuth consent
  screen" → "Test users" → thêm email của họ.
- Dữ liệu đồng bộ nằm trong `appDataFolder` riêng của app trên Drive của
  chính bạn — không hiện trong giao diện Google Drive bình thường, không ai
  khác truy cập được ngoài chính app này.
