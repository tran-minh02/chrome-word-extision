# Hướng Dẫn Kích Hoạt Đồng Bộ Supabase Cloud & Bảo Mật 2 Lớp (TOTP)

Hệ thống đồng bộ dữ liệu đám mây trực tiếp qua **Supabase Cloud** (`https://htfckygwvjmbarftauww.supabase.co`) đã được tích hợp hoàn tất vào Dashboard của Extension.

---

## 1. Kết Quả Kiểm Thử Local (Đã Xác Minh Hoạt Động)

Đã khởi chạy local test server tại: **`http://localhost:8080/dashboard/dashboard.html`**

![Cloud Sync Modal](C:\Users\ADMIN\.gemini\antigravity-ide\brain\74f49497-444b-4da8-8823-3967efe3949f\cloud_sync_modal_1789786593822.png)

- **Polyfill Chrome Storage**: Đã tích hợp shim tự động chuyển hướng sang `localStorage` khi mở ngoài trình duyệt thông thường, cho phép test full giao diện mà không cần cài file `.crx`.
- **Nút "Đồng bộ Cloud"**: Hoạt động mượt mà, modal hiển thị đầy đủ các ô nhập Anon Key, Email, Password, Đăng ký và Đăng nhập.
- **Kiểm tra kết nối Supabase**: Đã test lệnh fetch tới `https://htfckygwvjmbarftauww.supabase.co` và nhận phản hồi sẵn sàng từ auth service worker.

---

## 2. Các Bước Kích Hoạt Trên Supabase Dashboard (Chỉ làm 1 lần)

1. Mở trang quản trị dự án Supabase: [https://supabase.com/dashboard/project/htfckygwvjmbarftauww](https://supabase.com/dashboard/project/htfckygwvjmbarftauww).
2. Vào mục **SQL Editor** -> Tạo New Query -> Copy toàn bộ nội dung file [database_design.md](file:///b:/Workspace/eng-extension/database_design.md) dán vào và nhấn **Run** (đặc biệt lưu ý các dòng `GRANT ALL ON TABLE public.vocabularies TO authenticated;`).
3. Vào mục **Authentication** -> **MFA** -> Đảm bảo tùy chọn **App Authenticator (TOTP)** đang được kích hoạt (mặc định đã bật trên Supabase).

---

## 3. Các Bước Thao Tác Trên Chrome Extension Dashboard

1. Mở trang Dashboard của Extension (`dashboard.html` hoặc link local `http://localhost:8080/dashboard/dashboard.html`).
2. Nhấn vào nút **Đồng bộ Cloud** trên thanh công cụ.
3. **Đăng ký / Đăng nhập:**
   - Nhập Email & Mật khẩu -> Nhấn **Đăng ký** (nếu chưa có tài khoản) hoặc **Đăng nhập**. (Key đã được nhúng sẵn, người dùng không cần nhập key).
4. **Kích hoạt bảo mật 2 lớp (Authenticator App):**
   - Nhấn **Cài đặt bảo mật 2 lớp (Authenticator)**.
   - Mã QR sẽ hiển thị trực tiếp trong modal.
   - Dùng Google Authenticator, Microsoft Authenticator hoặc Authy trên điện thoại quét mã.
   - Nhập mã 6 số từ app -> Nhấn **Xác nhận**.
5. **Đồng bộ dữ liệu:**
   - Nhấn **Đồng bộ dữ liệu ngay**: Extension sẽ tự động gộp dữ liệu từ vựng giữa máy tính và Supabase (2 chiều).
