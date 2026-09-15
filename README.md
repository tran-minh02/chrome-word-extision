# 📚 English Vocabulary Saver

> **Chrome & Brave Extension** – Tiện ích mở rộng hỗ trợ lưu và quản lý từ vựng tiếng Anh trực tiếp khi lướt web. Tích hợp bôi đen lưu nhanh qua chuột phải, tra từ điển tự động, quản lý dạng bảng trực quan, phát âm chuẩn và sao lưu dữ liệu dạng JSON.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Brave%20%7C%20Edge-orange.svg)](#hướng-dẫn-cài-đặt-lên-trình-duyệt)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🌟 Tính Năng Nổi Bật

- 🖱️ **Lưu từ 1-Click qua Chuột phải (Context Menu)**:
  - Chỉ cần bôi đen (highlight) bất kỳ từ hoặc cụm từ tiếng Anh nào trên trang web và click chuột phải -> chọn **"Lưu từ vựng này"**.
  - Tự động bắt câu/ngữ cảnh (context sentence) của từ trên trang web để giúp ghi nhớ tốt hơn.
- 📖 **Tự động tra cứu từ điển (Free Dictionary API)**:
  - Tự động tìm phiên âm quốc tế (IPA) và định nghĩa mẫu tiếng Anh khi bạn lưu từ.
  - Hoạt động mượt mà kể cả khi offline (sẽ lưu từ và cho phép bổ sung nghĩa sau).
- 📊 **Bảng Quản Lý Từ Vựng Trực Quan (Dashboard Table View)**:
  - Xem danh sách từ vựng dưới dạng bảng rõ ràng, đẹp mắt với chuẩn màu sắc hiện đại.
  - Đầy đủ thông tin: *STT, Từ vựng, Phiên âm, Nghĩa tiếng Việt, Câu ví dụ/Ngữ cảnh, Ngày lưu, Trạng thái*.
  - **Chỉnh sửa trực tiếp (Inline Edit & Modal Edit)**: Nhấp đôi vào ô hoặc bấm nút Sửa để cập nhật từ, nghĩa tiếng Việt, câu ví dụ hoặc chuyển trạng thái (*Đang học / Đã thuộc*).
- 🔊 **Phát âm chuẩn (Text-to-Speech)**:
  - Bấm vào biểu tượng loa để nghe giọng đọc phát âm tiếng Anh chuẩn bản xứ thông qua Web Speech API.
- 💾 **Lưu trữ & Sao lưu JSON linh hoạt**:
  - Dữ liệu được lưu trữ an toàn trong `chrome.storage.local`.
  - **Xuất file JSON (Export)**: Tải file `.json` về máy tính bất kỳ lúc nào để lưu trữ cá nhân hoặc chuyển sang thiết bị khác.
  - **Nhập file JSON (Import)**: Dễ dàng nạp dữ liệu từ file JSON vào extension (hỗ trợ chế độ Gộp thêm hoặc Ghi đè).
- 🔍 **Tìm kiếm & Lọc thông minh**:
  - Tìm kiếm tức thì theo từ vựng hoặc nghĩa tiếng Việt.
  - Lọc theo trạng thái: *Tất cả*, *Đang học (Learning)*, *Đã thuộc (Mastered)*.
  - Sắp xếp theo ngày lưu mới nhất / cũ nhất hoặc thứ tự bảng chữ cái A-Z.
- ⚡ **Popup tiện ích nhanh**:
  - Bấm vào icon extension trên thanh công cụ để xem thống kê nhanh số từ, thêm từ mới nhanh hoặc mở trang Dashboard đầy đủ.

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

### 3. Chỉnh sửa và cập nhật từ vựng trong Bảng
- **Chỉnh sửa nhanh (Modal)**: Bấm vào nút **Sửa (biểu tượng bút chì)** ở dòng tương ứng để cập nhật nghĩa tiếng Việt, câu ví dụ hoặc ghi chú.
- **Đổi trạng thái**: Bấm trực tiếp vào nhãn trạng thái `Đang học` hoặc `Đã thuộc` để chuyển đổi qua lại.
- **Nghe phát âm**: Bấm vào nút **Loa âm thanh** bên cạnh từ vựng để nghe đọc.
- **Xóa từ**: Bấm nút **Thùng rác** để xóa từ khỏi danh sách.

### 4. Sao lưu & Đồng bộ dữ liệu JSON
- **Xuất dữ liệu**: Bấm nút **"Xuất JSON"** ở thanh công cụ Dashboard để tải về file `vocabulary_backup_YYYY-MM-DD.json`.
- **Nạp dữ liệu**: Bấm nút **"Nhập JSON"** -> Chọn file JSON từ máy tính. Bạn có thể chọn nhập gộp hoặc nhập từ file mẫu đi kèm `sample_vocabularies.json`.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
chrome-word-extision/
├── manifest.json              # Khai báo cấu hình Extension (Manifest V3)
├── background.js              # Service Worker: xử lý Context Menu, tra cứu API, lưu trữ
├── content.js                 # Content Script: trích xuất câu ngữ cảnh trên trang web
├── popup/                     # Giao diện Popup khi bấm icon extension
│   ├── popup.html             # Cấu trúc HTML cửa sổ popup
│   ├── popup.css              # Giao diện popup hiện đại
│   └── popup.js               # Thống kê nhanh, form thêm từ nhanh
├── dashboard/                 # Trang Bảng quản lý từ vựng chính
│   ├── dashboard.html         # Giao diện Dashboard quản lý dạng bảng
│   ├── dashboard.css          # Giao diện Glassmorphism / Slate hiện đại, responsive
│   └── dashboard.js           # Logic bảng: CRUD, phát âm, lọc, xuất/nhập JSON
├── icons/                     # Bộ biểu tượng extension (16x16, 32x32, 48x48, 128x128)
├── sample_vocabularies.json   # File dữ liệu từ vựng mẫu để test tính năng
├── CONTRIBUTING.md            # Hướng dẫn đóng góp phát triển dự án
├── LICENSE                    # Giấy phép nguồn mở MIT
└── README.md                  # Tài liệu giới thiệu & hướng dẫn sử dụng
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