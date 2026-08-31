# Thiết kế MVP chức năng thu–chi

## Trạng thái

- Đã duyệt thiết kế trong phiên trao đổi ngày 2026-08-25.
- Đây là spec sản phẩm và kiến trúc; chưa bao gồm implementation plan.
- Phạm vi MVP: một cá nhân, nhập thủ công, dữ liệu lưu local, đơn vị tiền tệ VNĐ.

## Mục tiêu

Cho phép một người quản lý thu nhập, chi tiêu, chuyển tiền giữa nhiều tài khoản/ví và xem tình hình tài chính theo tháng hiện tại. MVP ưu tiên dữ liệu đúng, có thể truy vết và đủ nền tảng để mở rộng cho household/cặp đôi/vợ chồng.

## Không thuộc MVP

- Import CSV/Excel hoặc kết nối ngân hàng.
- Đồng bộ nhiều thiết bị.
- Household/cộng tác nhiều người.
- Giao dịch định kỳ tự động.
- Ngân sách và mục tiêu tài chính.
- PIN/sinh trắc học.
- Đa tiền tệ; MVP chỉ dùng VNĐ.

## Mô hình dữ liệu

### Accounts

Đại diện cho tài khoản hoặc ví tiền: tiền mặt, ngân hàng, ví điện tử, thẻ tín dụng nếu cần. Mỗi account có số dư ban đầu, trạng thái đang dùng/ẩn và metadata sync theo convention hiện tại.

### Categories

Danh mục có loại `income` hoặc `expense`. App cung cấp danh mục mặc định; người dùng được thêm, sửa và ẩn danh mục. Không xóa danh mục đã được giao dịch sử dụng.

### Transactions

Mỗi transaction có:

- loại: `income`, `expense` hoặc `transfer`;
- số tiền nguyên VNĐ, lớn hơn 0;
- account nguồn;
- account đích nếu là transfer;
- category nếu là income/expense;
- ngày giao dịch;
- tên giao dịch/người nhận;
- ghi chú tùy chọn;
- metadata local-first/sync: id, createdAt, updatedAt, deletedAt, revision, originDeviceId.

Tên giao dịch là trường bắt buộc theo spec đã duyệt; danh mục cũng là trường bắt buộc với giao dịch thu/chi. Việc giảm số thao tác nhập liệu là bài toán UX mở, không thay đổi quy tắc nghiệp vụ hiện tại.

### Profile settings

Lưu tên hiển thị, trạng thái ẩn/hiện số tiền và trạng thái onboarding. Dữ liệu này chỉ thuộc thiết bị hiện tại trong MVP.

## Quy tắc nghiệp vụ

Số dư tài khoản được tính:

```text
Số dư = số dư ban đầu + tổng income - tổng expense - transfer đi + transfer đến
```

- Transfer không có category và không được tính vào tổng thu, tổng chi hoặc dòng tiền ròng.
- Giao dịch bị xóa mềm không được tính vào số dư và báo cáo.
- Xóa giao dịch phải hiện hộp thoại xác nhận; sau đó hiển thị hành động `Hoàn tác`.
- Sửa giao dịch phải cập nhật nhất quán số dư, danh sách và báo cáo.
- Không cho lưu số tiền bằng 0 hoặc âm.
- Không cho transfer đến cùng account nguồn.
- Account nguồn và account đích phải khác nhau.
- Tạo/sửa/xóa nghiệp vụ và ghi change log phải nằm trong cùng SQLite transaction.

## Onboarding

Onboarding là wizard nhiều bước, không phải một form dài:

1. Tên người dùng.
2. Tạo account/ví đầu tiên.
3. Nhập số dư ban đầu.
4. Xác nhận danh mục mặc định.

Người dùng bắt buộc phải có ít nhất một account/ví. Tên người dùng và danh mục mặc định có thể bỏ qua hoặc chỉnh sửa. Nếu thoát giữa chừng, app tiếp tục từ bước còn dang dở.

## Luồng chính

### Thêm thu/chi

Người dùng bấm nút `+` ở chính giữa thanh điều hướng, chọn Thu nhập hoặc Chi tiêu, nhập số tiền, chọn account, category, tên giao dịch, ngày và ghi chú tùy chọn, rồi xác nhận lưu. Ngày mặc định là hôm nay. Sau khi lưu, app cập nhật danh sách, số dư, dashboard, báo cáo và change log.

### Chuyển khoản

Người dùng chọn Chuyển khoản, account nguồn, account đích, số tiền, ngày và ghi chú tùy chọn. Transfer không cho chọn category và không ảnh hưởng tổng thu/chi.

### Sửa và xóa

Chạm giao dịch để mở chi tiết và sửa các trường được phép. Xóa là xóa mềm sau xác nhận, có thể hoàn tác trong thời gian ngắn.

## Cấu trúc màn hình

### Dashboard mặc định

- Số dư tổng.
- Tổng thu tháng hiện tại.
- Tổng chi tháng hiện tại.
- Dòng tiền ròng.
- Biểu đồ thu/chi theo tháng.
- Chi tiêu theo category.
- Giao dịch gần đây.
- Nút ẩn/hiện tiền.

### Giao dịch

- Danh sách theo ngày.
- Lọc theo tháng, loại, category và account.
- Tìm kiếm theo tên giao dịch.
- Mở chi tiết để sửa hoặc xóa.

### Điều hướng

- Dashboard là màn hình mặc định.
- Nút `+` nằm chính giữa thanh điều hướng dưới.
- Các khu vực còn lại gồm Giao dịch, Báo cáo và Cài đặt/tài khoản.

### Báo cáo

- Mặc định theo tháng hiện tại.
- Chuyển được sang tháng trước/sau.
- Tổng thu, tổng chi, dòng tiền ròng.
- Chi tiêu theo category và account.

### Cài đặt

- Quản lý account/ví.
- Quản lý category.
- Tên người dùng.
- Ẩn/hiện tiền.
- Thông tin dữ liệu local.

## Kiến trúc triển khai

- Domain/application định nghĩa entity, rule và use case; không phụ thuộc React Native, SQLite hoặc Drizzle.
- Repository port nằm ở application; repository implementation nằm ở data layer.
- UI screen gọi view model/use case, không truy cập database trực tiếp.
- Business table và change log ghi trong một transaction.
- Giữ metadata sync hiện tại trên các entity nghiệp vụ để có thể mở rộng sync sau này.
- Chưa thêm account/household member hoặc quyền cộng tác vào MVP; chỉ giữ boundary ownership có thể mở rộng về sau.

## Kiểm thử chấp nhận

- Tạo được income, expense và transfer hợp lệ.
- Từ số dư ban đầu, số dư đúng sau income, expense, transfer đi và transfer đến.
- Không cho transfer cùng account hoặc số tiền không hợp lệ.
- Sửa amount/account/category/date cập nhật đúng số dư và báo cáo.
- Xóa mềm loại giao dịch khỏi số dư/báo cáo; hoàn tác khôi phục đúng.
- Transfer không xuất hiện trong tổng thu/chi.
- Báo cáo tháng hiện tại và tháng trước/sau cho kết quả đúng.
- Giao dịch và change log cùng commit hoặc cùng rollback.
- Category đang được sử dụng không bị xóa vật lý.
- Onboarding chạy từng bước, bắt buộc có account đầu tiên và tiếp tục được sau khi thoát.
- Trạng thái ẩn/hiện tiền không làm thay đổi dữ liệu.
- Migration database chạy thành công trên database mới và database hiện có.

## Quyết định UX còn mở

Người dùng đã xác nhận giữ nguyên các trường bắt buộc trong spec. Tuy nhiên, tốc độ nhập liệu là rủi ro adoption quan trọng vì người dùng thường bỏ các app thu–chi khi form quá dài. Khi triển khai UI, cần prototype và đo số thao tác; không tự ý nới lỏng validation nếu chưa có quyết định sản phẩm mới.
