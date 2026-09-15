# 🤝 Hướng Dẫn Đóng Góp (Contribution Guide)

Cảm ơn bạn đã quan tâm và muốn đóng góp cho dự án **English Vocabulary Saver**! Mọi sự đóng góp của bạn—dù là sửa một lỗi chính tả nhỏ trong tài liệu, tối ưu giao diện hay thêm các tính năng học tập mới—đều có ý nghĩa to lớn đối với cộng đồng.

Tài liệu này sẽ hướng dẫn bạn toàn bộ quy trình từ thiết lập môi trường phát triển, quy chuẩn code cho đến việc gửi Pull Request (PR).

---

## 📑 Mục Lục

1. [Quy Tắc Ứng Xử (Code of Conduct)](#1-quy-tắc-ứng-xử-code-of-conduct)
2. [Thiết Lập Môi Trường Phát Triển (Local Setup)](#2-thiết-lập-môi-trường-phát-triển-local-setup)
3. [Cách Gỡ Lỗi & Kiểm Thử (Debugging Guide)](#3-cách-gỡ-lỗi--kiểm-thử-debugging-guide)
4. [Kiến Trúc & Luồng Hoạt Động (Architecture)](#4-kiến-trúc--luồng-hoạt-động-architecture)
5. [Quy Chuẩn Viết Mã (Coding Standards)](#5-quy-chuẩn-viết-mã-coding-standards)
6. [Quy Trình Làm Việc Với Git (Git Workflow)](#6-quy-trình-làm-việc-với-git-git-workflow)
7. [Quy Chuẩn Commit Message](#7-quy-chuẩn-commit-message)
8. [Quy Trình Gửi Pull Request (PR Checklist)](#8-quy-trình-gửi-pull-request-pr-checklist)
9. [Báo Lỗi & Đề Xuất Tính Năng](#9-báo-lỗi--đề-xuất-tính-năng)

---

## 1. Quy Tắc Ứng Xử (Code of Conduct)

- **Tôn trọng và cởi mở**: Luôn giữ thái độ hòa nhã, tôn trọng ý kiến đóng góp của các thành viên khác.
- **Tập trung vào chất lượng**: Đặt trải nghiệm người dùng, tính bảo mật dữ liệu và hiệu năng nhẹ nhàng của extension lên hàng đầu.
- **Sẵn sàng hỗ trợ**: Giải thích rõ ràng các thay đổi trong PR để mọi người cùng review dễ dàng.

---

## 2. Thiết Lập Môi Trường Phát Triển (Local Setup)

### Yêu cầu tiên quyết
- Một trình duyệt nhân Chromium bất kỳ: **Google Chrome**, **Brave**, **Microsoft Edge**, hoặc **Cốc Cốc**.
- **Git** đã cài đặt trên máy.
- *(Tùy chọn)*: **Node.js** (chỉ cần nếu bạn muốn chạy lại script tạo icon `generate_icons.js`).

### Các bước cài đặt
1. **Fork** repository này về tài khoản GitHub của bạn.
2. **Clone** repository về máy:
   ```bash
   git clone https://github.com/<your-username>/chrome-word-extision.git
   cd chrome-word-extision
   ```
3. Mở trình duyệt và truy cập trang quản lý extension:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
4. Bật chế độ **Developer Mode** (góc trên bên phải).
5. Bấm nút **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục `chrome-word-extision` vừa clone.
6. Mỗi khi sửa code, bạn chỉ cần bấm vào **nút Reload (biểu tượng xoay tròn)** của extension trên trang `chrome://extensions` để áp dụng thay đổi.

---

## 3. Cách Gỡ Lỗi & Kiểm Thử (Debugging Guide)

Do Chrome Extension có nhiều môi trường chạy khác nhau, hãy sử dụng đúng công cụ gỡ lỗi cho từng thành phần:

| Thành phần | File mã nguồn | Cách mở DevTools để Debug |
| :--- | :--- | :--- |
| **Service Worker** | `background.js` | Vào `chrome://extensions`, tìm extension và click vào dòng chữ xanh **"service worker"** tại mục *Inspect views*. |
| **Popup UI** | `popup/popup.html`, `popup/popup.js` | Click chuột phải vào icon extension trên thanh công cụ trình duyệt -> Chọn **Inspect popup** (Kiểm tra cửa sổ bật lên). |
| **Dashboard** | `dashboard/dashboard.html`, `dashboard/dashboard.js` | Nhấn phím `F12` hoặc click chuột phải trên trang Dashboard -> Chọn **Inspect** (Kiểm tra) như một trang web thông thường. |
| **Content Script** | `content.js` | Mở bất kỳ trang web nào (ví dụ: Wikipedia), nhấn `F12`, kiểm tra tab **Console** của trang web đó. |

> 💡 **Mẹo:** Nếu gặp hiện tượng `Context menu` không cập nhật sau khi sửa code trong `background.js`, hãy tắt extension đi và bật lại (hoặc bấm Reload tại `chrome://extensions`).

---

## 4. Kiến Trúc & Luồng Hoạt Động (Architecture)

Extension được thiết kế theo tiêu chuẩn **Manifest V3** nhẹ nhàng, bảo mật và không phụ thuộc thư viện thứ ba:

```
                      [ Trang Web Người Dùng Đang Đọc ]
                                     │
                             (Bôi đen từ vựng)
                                     │
                             (Click chuột phải)
                                     ▼
                      [ Context Menu: "Lưu từ vựng" ]
                                     │
                                     ▼
                          [ background.js ]
                     (Service Worker điều phối)
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
     [ Free Dictionary API ]                [ content.js ]
   (Lấy IPA & nghĩa tiếng Anh)       (Trích xuất câu ngữ cảnh)
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                      [ chrome.storage.local ]
                     (Lưu trữ dữ liệu JSON)
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
             [ popup/popup.html ]          [ dashboard/dashboard.html ]
            (Xem nhanh & thêm từ)          (Bảng quản lý, sửa trực tiếp,
                                            phát âm, xuất/nhập JSON)
```

---

## 5. Quy Chuẩn Viết Mã (Coding Standards)

### JavaScript
- Sử dụng **Vanilla JS (ES6+)** thuần túy: không đưa thêm jQuery, Lodash, React hay Vue vào nếu không thực sự cần thiết nhằm giữ kích thước extension siêu nhẹ.
- Xử lý bất đồng bộ bằng cú pháp `async/await` thay vì lồng nhiều callback.
- Luôn bọc các hàm gọi API hoặc `chrome.storage` trong khối `try...catch` để bắt lỗi gracefully.
- Đặt tên biến và hàm theo chuẩn `camelCase` (ví dụ: `saveVocabulary`, `fetchPhoneticFromApi`).

### CSS & Giao Diện
- Viết CSS thuần theo cấu trúc phân tầng rõ ràng, tận dụng **CSS Variables** đã định nghĩa trong `:root` (màu sắc, khoảng cách, font chữ).
- Đảm bảo giao diện phản hồi tốt (Responsive), không bị vỡ layout khi co giãn cửa sổ.
- Đảm bảo độ tương phản màu sắc đạt chuẩn, icon trực quan, có hiệu ứng `hover`, `active` mượt mà.

### An Toàn & Bảo Mật (CSP - Content Security Policy)
- **Tuyệt đối không dùng `eval()`** hoặc chèn trực tiếp chuỗi HTML chưa qua xử lý (`innerHTML`) từ dữ liệu người dùng không tin cậy. Sử dụng `textContent` hoặc hàm escape HTML an toàn để phòng tránh XSS.
- Không sử dụng inline script (`<script>code...</script>`) bên trong file HTML; luôn tách code ra file `.js` riêng theo quy định của Manifest V3.

---

## 6. Quy Trình Làm Việc Với Git (Git Workflow)

1. **Đồng bộ nhánh `main` mới nhất**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Tạo nhánh mới** cho tính năng hoặc lỗi bạn muốn xử lý:
   ```bash
   # Thêm tính năng mới
   git checkout -b feature/them-che-do-flashcard

   # Sửa lỗi
   git checkout -b fix/loi-phat-am-tieng-anh-tren-brave

   # Cập nhật tài liệu
   git checkout -b docs/cap-nhat-huong-dan-cai-dat
   ```
3. **Thực hiện thay đổi, kiểm tra cẩn thận** trên trình duyệt.
4. **Commit mã nguồn** với thông điệp rõ ràng (xem phần 7).
5. **Đẩy nhánh lên GitHub của bạn**:
   ```bash
   git push origin feature/them-che-do-flashcard
   ```
6. Truy cập GitHub và bấm **"Compare & pull request"**.

---

## 7. Quy Chuẩn Commit Message

Dự án áp dụng quy ước **Conventional Commits** để lịch sử commit luôn rõ ràng và dễ theo dõi:

```
<loại commit>(<phạm vi nếu có>): <mô tả ngắn gọn về thay đổi>
```

### Các tiền tố thông dụng:
- `feat`: Thêm tính năng mới (ví dụ: `feat(dashboard): thêm bộ lọc từ theo tags`)
- `fix`: Sửa lỗi (ví dụ: `fix(contextMenu): khắc phục lỗi không bắt được câu ngữ cảnh`)
- `docs`: Sửa đổi tài liệu hướng dẫn (ví dụ: `docs: cập nhật CONTRIBUTING.md`)
- `style`: Định dạng code, sửa khoảng trắng, CSS giao diện (không đổi logic)
- `refactor`: Tái cấu trúc mã nguồn để sạch hơn, dễ bảo trì hơn
- `perf`: Cải thiện hiệu năng xử lý
- `chore`: Cập nhật cấu hình, file phụ trợ, icon

---

## 8. Quy Trình Gửi Pull Request (PR Checklist)

Trước khi gửi Pull Request, vui lòng tự kiểm tra danh sách sau:

- [ ] Mã nguồn đã được kiểm tra trực tiếp trên Chrome hoặc Brave và hoạt động ổn định.
- [ ] Không có lỗi runtime hoặc warning phát sinh trong DevTools Console.
- [ ] Tính năng xuất (Export) và nhập (Import) JSON vẫn hoạt động bình thường, không làm hỏng cấu trúc dữ liệu cũ.
- [ ] Code tuân thủ quy chuẩn không dùng inline-script, không vi phạm CSP của Manifest V3.
- [ ] Mô tả rõ ràng trong PR:
  - Thay đổi này giải quyết vấn đề gì?
  - Các bước để người review có thể kiểm thử tính năng này?
  - Ảnh chụp màn hình hoặc GIF minh họa (nếu có thay đổi về giao diện).

---

## 9. Báo Lỗi & Đề Xuất Tính Năng

- **Báo lỗi (Bug Report)**: Nếu phát hiện lỗi, hãy mở một Issue mới trên GitHub kèm theo các thông tin: phiên bản trình duyệt, các bước tái hiện lỗi và ảnh chụp màn hình lỗi console.
- **Đề xuất tính năng (Feature Request)**: Bạn có ý tưởng thú vị (như học qua Flashcard, ôn tập ngắt quãng Spaced Repetition, đồng bộ Google Drive)? Hãy mở một Issue thảo luận để cùng nhau hiện thực hóa!

---

💖 **Cảm ơn bạn đã đồng hành và xây dựng English Vocabulary Saver ngày một tốt hơn!**
