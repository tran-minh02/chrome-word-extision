# 📚 English Vocabulary Saver

> **Chrome & Brave Extension** – Tiện ích mở rộng hỗ trợ lưu và quản lý từ vựng tiếng Anh trực tiếp khi lướt web. Tích hợp bôi đen lưu nhanh qua chuột phải, tra từ điển tự động, quản lý dạng bảng trực quan, phát âm chuẩn và sao lưu dữ liệu dạng JSON.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Brave%20%7C%20Edge-orange.svg)](#hướng-dẫn-cài-đặt-lên-trình-duyệt)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🌟 Tính Năng Nổi Bật

- 🖱️ **Lưu từ 1-Click qua Chuột phải (Context Menu)**:
  - Bôi đen bất kỳ từ hoặc cụm từ tiếng Anh nào trên trang web -> Click chuột phải -> Chọn **"Lưu từ vựng này"**.
  - Tự động trích xuất câu ngữ cảnh (context sentence) thực tế giúp ghi nhớ sâu và lâu hơn.
- 📖 **Tra cứu siêu tốc & Song ngữ (Hybrid Dictionary)**:
  - Kết hợp Google Translate (`dict-chrome-ex` + `gtx`) và Free Dictionary API.
  - Tự động lấy phiên âm quốc tế (IPA), từ loại, file audio phát âm chuẩn và câu ví dụ.
  - Tùy chọn hiển thị song song **Nghĩa tiếng Việt** kèm **Định nghĩa chi tiết tiếng Anh**.
- 📊 **Bảng Quản Lý Từ Vựng Trực Quan (Dashboard Table View)**:
  - Giao diện Glassmorphism / Dark UI hiện đại, responsive và tinh tế.
  - Đầy đủ thông tin: *STT, Từ vựng, Phiên âm, Nghĩa tiếng Việt & EN, Câu ví dụ, Ngày lưu, Trạng thái, Thao tác*.
  - **Inline Editing**: Double-click vào bất kỳ ô nghĩa hoặc ví dụ nào để chỉnh sửa trực tiếp.
  - **Thao tác hàng loạt (Batch Actions)**: Chọn nhiều từ để chuyển thành *Đang học*, *Đã thuộc* hoặc *Xóa hàng loạt*.
- ☁️ **Đồng bộ Đám mây 2 Chiều (Two-Way Cloud Sync - Supabase)**:
  - Đồng bộ mượt mà dữ liệu giữa nhiều trình duyệt (Chrome, Brave, Edge).
  - **Mô hình 3 trạng thái**: Dữ liệu cục bộ (`☁️↑`), Dữ liệu đã đồng bộ (`☁️✓`), Dữ liệu tải về từ Cloud.
  - **Thuật toán Last-Write-Wins (LWW)**: So sánh timestamp `updatedAt` để tự động gộp dữ liệu mới nhất, không lo bị ghi đè dữ liệu cũ.
  - **Xóa 2 chiều chuẩn xác (Tombstone Pattern)**: Xóa từ vựng trên Cloud ngay khi đăng nhập; tự động xóa ở local nếu Cloud đã xóa; chống tuyệt đối hiện tượng "hồi sinh" từ đã xóa.
- 🔐 **Bảo mật 2 Lớp (TOTP Authenticator)**:
  - Hỗ trợ mã xác thực 2 bước (Google Authenticator, Microsoft Authenticator, Authy) bằng chuẩn RFC 6238.
  - Kiến trúc Zero-Dependency (thuần native `fetch`), siêu nhẹ và không phụ thuộc thư viện nặng nề.
- 🛡️ **Quét Bảo Mật Tự Động (Gitleaks CI/CD)**:
  - Tích hợp GitHub Actions tự động quét phát hiện lộ lọt API key, token hoặc bí mật mã nguồn mỗi khi `push` hoặc tạo `pull_request`.
- 🔊 **Phát âm chuẩn (Audio & Web Speech API)**:
  - Ưu tiên file âm thanh phát âm bản xứ từ từ điển, fallback sang Web Speech API.
- 💾 **Sao lưu JSON & Nhập liệu linh hoạt**:
  - Hỗ trợ Xuất/Nhập file JSON để sao lưu ngoại tuyến hoặc di chuyển dữ liệu nhanh chóng.

---

## 🚀 Hướng Dẫn Cài Đặt Lên Trình Duyệt

Extension tương thích hoàn toàn với **Google Chrome**, **Brave Browser**, **Microsoft Edge**, **Cốc Cốc** và các trình duyệt nhân Chromium.

### Bước 1: Chuẩn bị thư mục Extension
Đảm bảo bạn đã clone hoặc tải mã nguồn về máy tính:
```bash
git clone https://github.com/tran-minh02/chrome-word-extision.git
cd chrome-word-extision
```
*(Thư mục chứa file `manifest.json` chính là thư mục extension để tải lên).*

### Bước 2: Bật chế độ Nhà phát triển (Developer Mode)
1. Mở trình duyệt của bạn và truy cập vào trang quản lý tiện ích:
   - **Google Chrome / Cốc Cốc**: Nhập `chrome://extensions` vào thanh địa chỉ.
   - **Brave Browser**: Nhập `brave://extensions` vào thanh địa chỉ.
   - **Microsoft Edge**: Nhập `edge://extensions` vào thanh địa chỉ.
2. Gạt công tắc **"Developer mode" (Chế độ cho nhà phát triển)** ở góc trên bên phải màn hình sang trạng thái **BẬT (ON)**.

### Bước 3: Nạp Extension vào trình duyệt (Load Unpacked)
1. Bấm nút **"Load unpacked" (Tải tiện ích đã giải nén)** ở góc trên bên trái.
2. Chọn thư mục dự án (nơi chứa file `manifest.json`, ví dụ: `b:\Workspace\eng-extension`).
3. Extension **English Vocabulary Saver** sẽ ngay lập tức xuất hiện trong danh sách tiện ích của bạn!
4. *(Khuyên dùng)*: Bấm vào biểu tượng mảnh ghép (Extensions) trên thanh công cụ trình duyệt và **Ghim (Pin)** icon English Vocabulary Saver để thao tác nhanh hơn.

---

## 📖 Hướng Dẫn Sử Dụng Chi Tiết

### 1. Lưu từ vựng khi đọc báo, lướt web
1. Dùng chuột bôi đen một từ tiếng Anh bạn muốn học trên bất kỳ trang web nào (ví dụ: *serendipity*).
2. Nhấp chuột phải -> chọn **"Lưu từ vựng: 'serendipity'"**.
3. Một thông báo nhỏ sẽ xuất hiện báo từ vựng đã được lưu thành công cùng ngữ cảnh câu!

### 2. Mở Bảng Quản Lý (Dashboard)
Có 3 cách đơn giản để mở bảng quản lý từ vựng:
- **Cách 1**: Nhấp vào biểu tượng Extension trên thanh công cụ -> Chọn **"Mở bảng quản lý"**.
- **Cách 2**: Nhấp chuột phải vào trang web -> Chọn **"Mở Bảng quản lý từ vựng"**.
- **Cách 3**: Chuột phải vào biểu tượng Extension trên thanh công cụ -> Chọn **"Tùy chọn" (Options)**.

### 3. Đồng bộ dữ liệu Đám mây (Supabase Cloud)
1. Bấm vào nút **"Đồng bộ Cloud"** trên thanh công cụ Dashboard.
2. Đăng nhập hoặc tạo tài khoản mới (hỗ trợ bật bảo mật 2FA Authenticator).
3. Bấm **"Đồng bộ dữ liệu ngay"**: Hệ thống sẽ tự động đối soát, cập nhật từ mới, đồng bộ trạng thái học và xóa bỏ các từ đã xóa giữa tất cả thiết bị của bạn.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
eng-extension/
├── manifest.json              # Khai báo cấu hình Extension (Manifest V3)
├── background.js              # Service Worker: Context Menu, tra cứu API, lưu trữ ngầm
├── content.js                 # Content Script: trích xuất câu ngữ cảnh trên trang web
├── .gitleaks.toml             # Cấu hình quét mã nguồn bí mật Gitleaks & Allowlist
├── .github/
│   └── workflows/
│       └── gitleaks.yml       # GitHub Actions CI/CD tự động quét rò rỉ bảo mật
├── popup/                     # Giao diện Popup khi bấm icon extension
│   ├── popup.html             # Cấu trúc HTML popup
│   ├── popup.css              # Giao diện popup hiện đại
│   └── popup.js               # Thống kê, thêm từ nhanh, sửa nhanh ghi chú, toggle EN
├── dashboard/                 # Trang Bảng quản lý từ vựng chính (Full tab)
│   ├── dashboard.html         # Giao diện Dashboard quản lý dạng bảng
│   ├── dashboard.css          # Giao diện Glassmorphism / Dark UI hiện đại
│   ├── dashboard.js           # CRUD từ vựng, phát âm, lọc, xuất/nhập JSON, batch actions
│   └── sync.js                # Module đồng bộ Cloud Supabase 2 chiều + 2FA TOTP (Zero-dependency)
├── icons/                     # Bộ biểu tượng extension (16x16, 32x32, 48x48, 128x128)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── docs/                      # Tài liệu kỹ thuật chuyên sâu
│   ├── sync_architecture.md   # Kiến trúc đồng bộ 2 chiều, Last-Write-Wins & Tombstone
│   ├── database_design.md     # Thiết kế bảng CSDL, quan hệ & chính sách RLS Supabase
│   ├── supabase_setup.md      # Hướng dẫn kích hoạt kết nối & cấu hình Supabase Cloud
│   ├── security_gitleaks.md   # Hướng dẫn quét bảo mật mã nguồn với Gitleaks
│   └── distribution_and_packaging.md # Hướng dẫn đóng gói .CRX & cơ chế phân phối
├── scripts/                   # Script hỗ trợ phát triển
│   └── generate_icons.js      # Tạo bộ icon PNG tự động
├── testcase/                  # Dữ liệu mẫu & server test local
│   ├── sample_vocabularies.json
│   ├── serve.js
│   └── test_supabase.js
├── CONTRIBUTING.md            # Hướng dẫn đóng góp phát triển dự án
├── LICENSE                    # Giấy phép nguồn mở MIT
└── README.md                  # Tài liệu tổng quan dự án
```

---

## 📋 Cấu Trúc Dữ Liệu Từ Vựng (JSON Schema)

Dữ liệu từ vựng được lưu trữ và xuất ra file JSON theo định dạng chuẩn sau:

```json
[
  {
    "id": "vocab_1726315200000_abc12",
    "word": "resilient",
    "phonetic": "/rɪˈzɪl.jənt/",
    "meaning": "Có khả năng phục hồi nhanh chóng, kiên cường",
    "example": "Local people have been very resilient despite the hardships.",
    "sourceUrl": "https://example.com/article",
    "dateAdded": "2026-09-14T12:00:00.000Z",
    "status": "learning"
  }
]
```

---

## 🛠️ Công Nghệ Sử Dụng

- **Chrome Extension API**: Manifest V3, `chrome.contextMenus`, `chrome.storage.local`, `chrome.notifications`.
- **Vanilla JavaScript (ES6+)**: Xử lý logic phi tập trung, bất đồng bộ (`async/await`), không phụ thuộc thư viện nặng nề giúp extension khởi động tức thì và siêu nhẹ.
- **CSS3 hiện đại**: Thiết kế giao diện Glassmorphism / Slate Clean UI, CSS Variables, Flexbox & Grid, hỗ trợ hiển thị sắc nét trên mọi độ phân giải.
- **Free Dictionary API**: Tự động lấy phiên âm IPA và định nghĩa mẫu tiếng Anh.
- **Web Speech API (`SpeechSynthesis`)**: Phát âm chuẩn ngữ điệu bản xứ mà không cần tải thêm file audio.

---

## 🤝 Đóng Góp (Contributing)

Mọi đóng góp, ý kiến đóng góp tính năng hoặc báo lỗi đều rất được hoan nghênh!  
Vui lòng tham khảo tài liệu [CONTRIBUTING.md](CONTRIBUTING.md) để biết thêm chi tiết về quy chuẩn code, quy trình tạo nhánh và gửi Pull Request.

---

## 📄 Bản Quyền (License)

Dự án được phân phối dưới giấy phép **MIT License**. Xem file [LICENSE](LICENSE) để biết thêm thông tin chi tiết.