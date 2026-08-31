# Research: chức năng thu–chi cho app quản lý tài chính

## Kết luận áp dụng cho MVP

Một giao dịch nên có loại nghiệp vụ riêng thay vì chỉ lưu số tiền có dấu. Tối thiểu cần phân biệt `income` (tiền vào), `expense` (tiền ra) và `transfer` (chuyển giữa các tài khoản). Transfer không được tính vào tổng thu/chi, nếu không báo cáo dòng tiền sẽ bị thổi phồng.

Mô hình nhập giao dịch nên có amount, type, account, date, category và một mô tả ngắn/payee. Memo/note, trạng thái đã kiểm tra và giao dịch lặp lại nên là trường mở rộng sau khi luồng cơ bản ổn định. Đây là cách tiếp cận suy ra từ luồng nhập giao dịch của YNAB: người dùng nhập amount trước, chọn loại, sau đó chọn payee, category, account và các trường bổ sung; transfer và credit-card payment có quy tắc riêng. [YNAB — How to Add Transactions](https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi?mobile-help=true)

Thu nhập, hoàn tiền và hoàn ứng không nên mặc định xử lý giống nhau. Thu nhập cần nguồn tiền/payee và nhóm inflow; hoàn tiền nên có khả năng gắn về danh mục chi ban đầu để báo cáo Income v Expense không bị sai. [YNAB — How to Add Income and Other Inflows](https://support.ynab.com/en_us/how-to-add-income-and-other-inflows-H1ZNjfZJi)

Giao dịch cần có thể sửa và xóa an toàn; khi sửa, các trường cốt lõi như amount, payee, category, date và account phải được cập nhật nhất quán. Gợi ý category theo payee có thể giảm thao tác lặp, nhưng không nên thay thế quyền xác nhận của người dùng. [YNAB — How to Edit and Delete Transactions](https://support.ynab.com/en_us/how-to-edit-and-delete-transactions-BJG4oS1s?mobile-help=true)

Việc phân tích theo category là giá trị chính của sổ thu–chi: người dùng cần xem tổng chi theo nhóm và theo khoảng thời gian, không chỉ xem danh sách giao dịch. [CFPB — Analyze Your Spending Tracker](https://files.consumerfinance.gov/f/documents/cfpb_ymyg_analyze-your-spending-tracker.pdf)

## Ràng buộc từ codebase hiện tại

- App là Expo mobile-only, local-first; SQLite + Drizzle đang là hướng lưu trữ phù hợp và đã có migration/change-log cho sync.
- Chưa có entity tài chính; `example_records` chỉ là bản ghi mẫu để kiểm thử sync.
- Business write cần giữ boundary transaction giữa bảng nghiệp vụ và change log để dữ liệu thu–chi có thể sync idempotent về sau.
- UI prototype đã có dashboard, danh sách giao dịch gần đây, màu thu/chi và các hướng visual; cần tái sử dụng thông tin model thay vì coi prototype là implementation.

## Câu hỏi cần chốt trước thiết kế

1. Người dùng chính là cá nhân độc thân hay có nhu cầu nhiều tài khoản/ví và gia đình?
2. MVP nhập thủ công hoàn toàn hay phải hỗ trợ import giao dịch ngay?
3. Đơn vị tiền tệ chính, timezone và quy tắc số thập phân là gì?
4. Có cần ngân sách, mục tiêu, giao dịch định kỳ trong phạm vi đầu tiên hay để giai đoạn sau?
