# Lộ trình chức năng quản lý tài chính

> Note định hướng sản phẩm. Đây là backlog dự kiến, chưa phải cam kết triển khai.

## Định hướng sản phẩm

- Giai đoạn đầu: cá nhân tự quản lý tài chính.
- Cách nhập dữ liệu ban đầu: nhập giao dịch thủ công.
- Giai đoạn sau: mở rộng cho cặp đôi, vợ chồng và household dùng chung.
- App ưu tiên local-first/offline; các chức năng mới cần giữ tương thích với SQLite, Drizzle và change log hiện tại.

## MVP đầu tiên — thu và chi thủ công

### Giao dịch

- Thêm giao dịch thu nhập.
- Thêm giao dịch chi tiêu.
- Chọn tài khoản hoặc ví tiền.
- Chọn danh mục.
- Nhập số tiền, ngày giao dịch và ghi chú tùy chọn.
- Danh sách giao dịch gần đây.
- Xem chi tiết giao dịch.
- Sửa giao dịch.
- Xóa giao dịch theo hướng an toàn, có xác nhận.
- Phân biệt giao dịch thu, chi và chuyển khoản nội bộ để không tính sai báo cáo.

### Danh mục và tài khoản

- Một bộ danh mục mặc định cho thu nhập và chi tiêu.
- Tạo, sửa, ẩn danh mục cá nhân.
- Tạo các tài khoản/ví tiền cơ bản.
- Tính số dư từ các giao dịch đã ghi nhận.

### Tổng quan và phân tích cơ bản

- Số dư hiện tại.
- Tổng thu trong kỳ.
- Tổng chi trong kỳ.
- Dòng tiền ròng.
- Danh sách chi tiêu theo danh mục.
- Bộ lọc theo tháng/khoảng thời gian, loại giao dịch, danh mục và tài khoản.
- Trạng thái rỗng, lỗi nhập liệu và xác nhận thao tác rõ ràng.

## Giai đoạn 2 — làm nhanh hơn và nhập dữ liệu lớn

### Import

- Import từ CSV/Excel.
- Mapping cột: ngày, mô tả, số tiền, loại, danh mục, tài khoản.
- Preview dữ liệu trước khi ghi vào database.
- Phát hiện dòng lỗi và cho phép sửa trước khi import.
- Quy tắc nhận diện thu/chi từ số tiền hoặc cột loại.
- Phát hiện giao dịch trùng.
- Undo một lần import.
- Lưu preset mapping cho từng nguồn dữ liệu.

### Tự động hóa nhập liệu

- Gợi ý danh mục theo mô tả/payee.
- Nhớ danh mục gần đây theo payee.
- Giao dịch định kỳ: lương, tiền nhà, hóa đơn, subscription.
- Nhân bản giao dịch.
- Quick add bằng thao tác tối giản.

## Giai đoạn 3 — ngân sách và mục tiêu cá nhân

- Ngân sách theo tháng và danh mục.
- Cảnh báo sắp vượt ngân sách.
- Theo dõi mức tiết kiệm.
- Mục tiêu tài chính: quỹ khẩn cấp, mua sắm, du lịch.
- Báo cáo xu hướng theo tháng/quý/năm.
- So sánh kế hoạch với thực tế.
- Xuất báo cáo CSV/PDF nếu cần.

## Giai đoạn 4 — cặp đôi, vợ chồng và household

### Mô hình chia sẻ

- Tạo household/workspace chung.
- Mời thành viên bằng link hoặc mã mời.
- Vai trò chủ sở hữu và thành viên.
- Phân biệt dữ liệu cá nhân với dữ liệu chung.
- Tài khoản chung và tài khoản riêng.
- Giao dịch của ai, thuộc về household hay chỉ thuộc cá nhân.
- Quyền xem/sửa/xóa theo vai trò.
- Lịch sử thay đổi và xử lý xung đột khi hai người cùng sửa.

### Phân tích household

- Tổng quan tài chính chung.
- Đóng góp của từng người.
- Chi tiêu chung theo danh mục.
- Ngân sách chung.
- Mục tiêu chung.
- Ghi chú hoặc trao đổi trên giao dịch nếu cần.

## Giai đoạn 5 — đồng bộ và kết nối dữ liệu

- Đồng bộ an toàn giữa các thiết bị của một người.
- Đồng bộ household giữa nhiều người.
- Backup/restore có mã hóa.
- Kết nối ngân hàng hoặc nhà cung cấp dữ liệu tài chính, nếu phù hợp thị trường và pháp lý.
- Import định kỳ hoặc đồng bộ tự động.
- Xử lý lỗi mạng, giao dịch pending và conflict.

## Chưa đưa vào MVP

- Import CSV/Excel.
- Kết nối ngân hàng tự động.
- Household/collaboration nhiều người.
- Ngân sách và mục tiêu nâng cao.
- OCR hóa đơn.
- AI tự phân loại hoặc tư vấn tài chính.
- Thanh toán, chuyển tiền hoặc sản phẩm đầu tư.

## Nguyên tắc giữ phạm vi

1. Mỗi giao dịch phải dễ nhập trong vài giây.
2. Không làm sai số dư và báo cáo khi sửa, xóa hoặc chuyển khoản.
3. Dữ liệu nghiệp vụ phải có thể mở rộng sang household mà không cần viết lại toàn bộ.
4. Tính năng tương lai chỉ được thêm vào MVP khi có bằng chứng người dùng thực sự cần.

