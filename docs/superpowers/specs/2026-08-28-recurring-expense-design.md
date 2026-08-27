# Thiết kế MVP chi tiêu định kỳ

## Trạng thái

- Đã duyệt thiết kế trong phiên trao đổi ngày 2026-08-28.
- Đây là spec sản phẩm và kiến trúc; chưa bao gồm implementation plan.
- Phạm vi MVP: một cá nhân, chỉ khoản **chi** định kỳ, nhập thủ công, dữ liệu local-first và tiền tệ VNĐ.

## Mục tiêu

Cho phép người dùng theo dõi các khoản chi định kỳ như subscription (YouTube Premium, Shopee VIP) hoặc hóa đơn cố định (tiền nhà). Khi tạo chi tiêu, người dùng có thể bật `Định kỳ` để lưu giao dịch hiện tại là kỳ đầu tiên và duy trì lịch cho các kỳ sau. App nhắc trước hạn, tạo giao dịch dự kiến và chỉ ghi nhận chi thật sau khi người dùng xác nhận — tránh làm sai số dư và báo cáo.

## Không thuộc MVP

- Thu nhập định kỳ (lương, v.v.).
- Tự động phát hiện định kỳ từ lịch sử giao dịch.
- Tự động ghi giao dịch thật không cần xác nhận.
- Chuyển khoản định kỳ.
- Trial, grace period, hủy subscription qua app.
- Đồng bộ ngân hàng hoặc import CSV cho detection.
- Chu kỳ tùy chỉnh (mỗi N ngày/tuần/tháng).
- Hai lần mỗi tháng, ngày làm việc cuối tháng.
- Đa tiền tệ; MVP chỉ dùng VNĐ.

## Khái niệm nghiệp vụ

### Mẫu định kỳ (RecurringSchedule)

Đại diện lịch lặp lại, dùng để sinh các kỳ dự kiến. Mỗi mẫu gắn với giao dịch chi kỳ đầu tiên đã xác nhận.

### Kỳ dự kiến (RecurringOccurrence)

Đại diện một lần chi sắp tới hoặc quá hạn. Mỗi mẫu chỉ duy trì **tối đa một** kỳ dự kiến chưa xử lý tại một thời điểm. Kỳ dự kiến **không** phải giao dịch thật và không ảnh hưởng số dư hay báo cáo cho đến khi được xác nhận.

### Giao dịch thật (Transaction)

Giao dịch chi đã ghi nhận, dùng chung mô hình `Transaction` hiện có (loại `expense`). Kỳ đầu tiên và mỗi kỳ được xác nhận đều tạo hoặc liên kết tới một giao dịch thật.

## Mô hình dữ liệu

### RecurringSchedule

- `id`, metadata local-first/sync theo convention hiện tại.
- `displayName`: tên hiển thị; mặc định lấy từ giao dịch kỳ đầu.
- `type`: `expense` (MVP chỉ chi; giữ trường để mở rộng thu sau này).
- `accountId`, `categoryId`: tài khoản và danh mục mặc định.
- `amount`: số tiền mặc định VNĐ, nguyên, lớn hơn 0.
- `frequency`: `weekly | monthly | quarterly | yearly`.
- `anchorDay`: ngày neo dùng tính kỳ sau (ngày trong tuần hoặc ngày trong tháng, tùy frequency).
- `startDate`: ngày giao dịch kỳ đầu tiên.
- `endDate` (tùy chọn) hoặc `occurrenceLimit` (tùy chọn); mặc định không giới hạn.
- `remindDaysBefore`: số ngày nhắc trước hạn; mặc định 1.
- `status`: `active | paused | ended`.
- `firstTransactionId`: liên kết tới giao dịch kỳ đầu tiên.
- `note` (tùy chọn): ghi chú mặc định cho các kỳ sau.

### RecurringOccurrence

- `id`, metadata local-first/sync.
- `scheduleId`: mẫu định kỳ cha.
- `scheduledDate`: ngày đến hạn.
- `amount`, `accountId`, `categoryId`, `displayName`, `note`: copy từ mẫu, có thể chỉnh trước khi xác nhận.
- `status`: `pending | overdue | confirmed | skipped`.
- `transactionId` (nullable): giao dịch thật sau khi xác nhận.
- `notifiedAt` (nullable): thời điểm đã gửi thông báo cho kỳ này.

Giao dịch dự kiến **không** lưu trong bảng `transactions`. Tách bảng `recurring_occurrences` để tránh làm sai số dư và báo cáo.

## Quy tắc nghiệp vụ

### Tạo lịch từ form thêm chi tiêu

1. Người dùng nhập chi tiêu và bật `Định kỳ`.
2. Cấu hình thêm: chu kỳ, nhắc trước (mặc định 1 ngày), kết thúc tùy chọn.
3. Khi lưu:
   - Tạo `Transaction` thật cho kỳ đầu tiên (ảnh hưởng số dư/báo cáo ngay).
   - Tạo `RecurringSchedule` từ giao dịch đó.
   - Sinh `RecurringOccurrence` kỳ tiếp theo ở trạng thái `pending`.
4. Giao dịch đang nhập được hiểu là **kỳ đầu tiên**, không phải giao dịch dự kiến.

### Sinh kỳ tiếp theo

- Chỉ sinh sau khi kỳ hiện tại chuyển `confirmed` hoặc `skipped`.
- Mỗi mẫu `active` chỉ có tối đa một kỳ `pending` hoặc `overdue` chưa xử lý.
- Nếu đạt `endDate` hoặc `occurrenceLimit`, chuyển mẫu sang `ended` và không sinh thêm kỳ.

### Tính ngày kỳ tiếp theo

- **Hàng tuần**: cộng 7 ngày từ ngày kỳ trước.
- **Hàng tháng / quý / năm**: giữ `anchorDay`; nếu tháng đích không có ngày tương ứng thì dùng **ngày cuối tháng** (ví dụ 31/01 → 28/02 hoặc 29/02 → 31/03 → 30/04).
- Năm nhuận: 29/02 hàng năm xử lý theo quy tắc ngày cuối tháng.

### Xử lý kỳ dự kiến

- **Xác nhận**: chỉnh mọi trường nếu cần → tạo `Transaction` thật → đánh dấu kỳ `confirmed` → sinh kỳ tiếp theo.
- **Bỏ qua kỳ này**: đánh dấu `skipped`, không ảnh hưởng số dư → sinh kỳ tiếp theo.
- Sau `scheduledDate` mà chưa xác nhận/bỏ qua: chuyển `overdue`, tiếp tục nhắc và vẫn cho xác nhận hoặc bỏ qua.

### Chỉnh sửa khi xác nhận

Nếu giá trị xác nhận khác mẫu, hỏi:

- `Chỉ kỳ này`: ghi giao dịch thật, không đổi mẫu.
- `Kỳ này và các kỳ sau`: ghi giao dịch thật và cập nhật mẫu cho các kỳ tiếp theo.

Chỉnh giao dịch dự kiến chưa xác nhận chỉ ảnh hưởng kỳ đó. Muốn chỉnh lịch hoặc các kỳ chưa tới hạn chủ động: vào **Quản lý định kỳ**.

### Quản lý định kỳ

- Sửa mẫu: áp dụng cho mẫu và kỳ dự kiến chưa xử lý; không sửa giao dịch thật đã xác nhận trong quá khứ.
- **Tạm dừng** (`paused`): không sinh kỳ mới; kỳ dự kiến hiện tại vẫn xử lý được; có thể bật lại.
- **Kết thúc** (`ended`): đóng lịch vĩnh viễn; không sinh kỳ mới; giữ lịch sử và giao dịch đã xác nhận.
- Không xóa giao dịch thật khi tạm dừng hoặc kết thúc.

### Xóa giao dịch kỳ đầu tiên

Nếu người dùng xóa giao dịch chi là kỳ đầu của một lịch, app không tự xóa lịch. Hiển thị hướng dẫn: kết thúc lịch trong Quản lý định kỳ nếu không còn muốn theo dõi. Lịch vẫn giữ liên kết tới giao dịch đã xóa mềm theo quy tắc xóa giao dịch hiện có.

### Thông báo

- Local notification theo `remindDaysBefore` của từng lịch; mặc định trước 1 ngày.
- Gửi thông báo không tự động ghi giao dịch thật.
- Nếu quyền thông báo bị tắt: vẫn hiển thị kỳ trong app; có thể nhắc bật thông báo một lần, không chặn luồng chính.
- Khi mở app: quét kỳ `pending`/`overdue` chưa gửi nhắc và gửi bù nếu cần; không gửi trùng (`notifiedAt`).

### Số dư và báo cáo

- Chỉ giao dịch thật (`Transaction` loại `expense` đã xác nhận) ảnh hưởng số dư và báo cáo.
- Giao dịch dự kiến (`pending`, `overdue`) không tính vào tổng chi, số dư hay dòng tiền ròng.
- Dashboard có thể hiển thị tổng chi định kỳ tháng hiện tại từ giao dịch thật; tùy chọn hiển thị “Sắp chi” từ kỳ dự kiến là bài toán UX phase sau.

## Luồng chính

### Thêm chi tiêu định kỳ

Người dùng bấm `+` → Chi tiêu → nhập số tiền, tài khoản, danh mục, tên, ngày, ghi chú → bật `Định kỳ` → chọn chu kỳ, nhắc trước, kết thúc tùy chọn → lưu. Ngày mặc định hôm nay. Sau khi lưu: giao dịch thật kỳ 1, mẫu định kỳ, kỳ dự kiến tiếp theo.

### Xác nhận hoặc bỏ qua kỳ

Từ thông báo hoặc danh sách kỳ sắp tới/quá hạn → mở kỳ dự kiến → chỉnh trường nếu cần → `Xác nhận` (có thể hỏi phạm vi cập nhật mẫu) hoặc `Bỏ qua kỳ này` → sinh kỳ tiếp theo nếu lịch còn `active` và chưa đạt điều kiện kết thúc.

### Quản lý lịch

Từ Cài đặt hoặc menu **Quản lý định kỳ** → danh sách lịch → chi tiết: sửa mẫu, tạm dừng, bật lại, kết thúc, xem lịch sử kỳ đã xác nhận/bỏ qua.

## Cấu trúc màn hình

### Form thêm chi tiêu (mở rộng)

- Toggle `Định kỳ`.
- Khi bật: chu kỳ, nhắc trước (ngày), kết thúc tùy chọn (không giới hạn / ngày / số kỳ).

### Giao dịch

- Badge hoặc nhóm riêng cho kỳ dự kiến (`Sắp tới`, `Quá hạn`).
- Không trộn vào tổng số dư.

### Kỳ sắp tới / Quá hạn

- Section hoặc tab con: danh sách kỳ `pending` và `overdue`.
- Thao tác: Xác nhận, Bỏ qua, Chỉnh sửa.

### Quản lý định kỳ

- Danh sách: tên, số tiền, chu kỳ, trạng thái, ngày kỳ tiếp theo.
- Chi tiết lịch: sửa mẫu, tạm dừng, bật lại, kết thúc, lịch sử kỳ.

## Kiến trúc triển khai

- Domain/application định nghĩa `RecurringSchedule`, `RecurringOccurrence`, rule tính ngày kỳ tiếp theo, chuyển trạng thái và validation; không phụ thuộc React Native, SQLite hoặc Drizzle.
- Repository port nằm ở application; implementation local nằm ở data layer.
- Use case: tạo lịch từ giao dịch, sinh kỳ, xác nhận, bỏ qua, tạm dừng, kết thúc, cập nhật mẫu.
- UI: form thêm chi tiêu mở rộng, màn quản lý định kỳ, xử lý local notification.
- Tạo lịch, xác nhận, bỏ qua, cập nhật mẫu và change log phải nằm trong cùng SQLite transaction.
- Giữ metadata sync hiện tại trên entity nghiệp vụ để mở rộng sync sau này.
- Thiết kế `type` trên mẫu để sau này mở rộng thu nhập định kỳ mà không đổi schema căn bản.

## Xử lý lỗi

- Dữ liệu form không hợp lệ: giữ dữ liệu đã nhập, hiển thị lỗi cạnh trường.
- Lịch `paused` hoặc `ended`: không sinh kỳ mới; kỳ dự kiến chưa xử lý vẫn cho xác nhận/bỏ qua.
- Xác nhận kỳ `overdue`: vẫn cho chỉnh mọi trường và hỏi phạm vi cập nhật mẫu nếu khác mẫu.
- Lỗi database giữa transaction: rollback giao dịch, kỳ và change log.
- Thông báo thất bại: kỳ vẫn hiển thị trong app; thử gửi lại khi mở app.

## Kiểm thử chấp nhận

- Tạo chi tiêu + bật định kỳ → giao dịch thật kỳ 1 + mẫu + một kỳ dự kiến `pending` kế tiếp.
- Xác nhận kỳ dự kiến → giao dịch thật, số dư/báo cáo cập nhật, sinh đúng một kỳ tiếp theo.
- Bỏ qua kỳ → không ảnh hưởng số dư, sinh kỳ tiếp theo.
- Kỳ quá hạn → trạng thái `overdue`, vẫn xác nhận/bỏ qua được.
- Chỉnh kỳ rồi xác nhận khác mẫu → hỏi `Chỉ kỳ này` / `Kỳ này và các kỳ sau` đúng hành vi.
- `Kỳ này và các kỳ sau` cập nhật mẫu; kỳ tiếp theo sinh theo mẫu mới.
- Tạm dừng / kết thúc → không sinh kỳ mới; lịch sử giao dịch thật giữ nguyên.
- Ngày neo 31 hàng tháng → các tháng thiếu ngày dùng ngày cuối tháng đúng quy tắc.
- Giao dịch dự kiến không tính vào số dư và báo cáo.
- Thông báo theo `remindDaysBefore` từng lịch; không gửi trùng.
- Đạt `endDate` hoặc `occurrenceLimit` → mẫu `ended`, không sinh thêm kỳ.
- Tạo lịch, xác nhận, bỏ qua và change log cùng commit hoặc cùng rollback.

## Nguồn nghiên cứu

Nghiên cứu sản phẩm và nguồn chính thống được tổng hợp tại `docs/2026-08-28-recurring-payments-research.md`, gồm phát hiện tự động, vòng đời, khớp giao dịch, nhắc trial/charge và giới hạn khi chưa nối ngân hàng.
