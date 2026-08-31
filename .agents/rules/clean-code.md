# Clean Code Rules

## Quy Tắc Giữ Codebase Sạch Sẽ (Clean Code)

1. **Xóa Hàm, Biến & Props Không Sử Dụng**:
   - Mọi hàm, biến, tham số, component prop hoặc import không được sử dụng ở bất kỳ đâu trong file hoặc project **bắt buộc phải được xóa bỏ**, không để dư thừa dưới dạng warning ESLint.
   - Không comment-out code cũ / code thừa; nếu không dùng nữa thì xóa hẳn khỏi codebase.

2. **Kiểm Tra Thường Xuyên**:
   - Trước khi hoàn thành bất kỳ task nào, luôn chạy `npm run lint` và `npm run typecheck` để đảm bảo không còn bất kỳ cảnh báo unused variable / unused import nào (`@typescript-eslint/no-unused-vars`).
