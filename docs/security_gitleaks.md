# 🛡️ Hướng Dẫn Quét Bảo Mật Rò Rỉ Mã Nguồn (Gitleaks)

Dự án đã tích hợp công cụ **Gitleaks** để tự động rà soát và ngăn chặn việc vô tình commit các thông tin nhạy cảm (API Keys, Token, Mật khẩu, Secret Keys) vào kho mã nguồn Git.

---

## 1. Cấu Hình Dự Án

* **File cấu hình**: [`.gitleaks.toml`](../.gitleaks.toml)
* **Quy tắc ngoại lệ (Allowlist)**:
  - Cho phép `sb_publishable_...` (Supabase publishable anon key - key công khai cho client).
  - Bỏ qua các thư mục kiểm thử: `testcase/`, `docs/`, `.agents/`.
* **CI/CD Workflow**: [`.github/workflows/gitleaks.yml`](../.github/workflows/gitleaks.yml)
  - Tự động kích hoạt khi có commit mới (`push`) hoặc yêu cầu gộp nhánh (`pull_request`) vào nhánh `main` và `dev`.

---

## 2. Quét Cục Bộ Trên Máy Tính (Local Scan)

### Bước 1: Cài đặt Gitleaks trên Windows
Mở PowerShell và chạy:
```powershell
winget install Gitleaks.Gitleaks
```

*(Sau khi cài đặt xong, khởi động lại Terminal hoặc chạy lệnh sau để cập nhật PATH ngay lập tức)*:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Bước 2: Kiểm tra phiên bản
```powershell
gitleaks version
```

### Bước 3: Các lệnh quét thường dùng
* **Quét toàn bộ lịch sử Git của dự án**:
  ```powershell
  gitleaks detect --config=.gitleaks.toml --verbose
  ```
* **Chỉ quét các file đang chuẩn bị commit (Staged files)**:
  ```powershell
  gitleaks protect --config=.gitleaks.toml --staged --verbose
  ```

---

## 3. Thiết Lập Tự Động Chặn Commit (Pre-commit Hook)

Để Gitleaks tự động quét mỗi khi bạn gõ lệnh `git commit`, tạo file `.git/hooks/pre-commit` bằng PowerShell:

```powershell
@"
#!/bin/sh
gitleaks protect --config=.gitleaks.toml --staged --verbose
if [ `$? -ne 0 ]; then
  echo "❌ Phát hiện secret hoặc token nhạy cảm! Hủy bỏ commit."
  exit 1
fi
"@ | Out-File -FilePath .git/hooks/pre-commit -Encoding utf8
```
