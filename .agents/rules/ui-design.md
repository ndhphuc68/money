# UI Design Rules

## Sử dụng Skill `vela-design` khi thiết kế hoặc sửa UI

Bất cứ khi nào làm việc liên quan đến giao diện (thêm mới, chỉnh sửa, fix lỗi UI, tạo prototype, căn chỉnh spacing, token màu sắc, typography, component styling), **bắt buộc phải đọc và tham chiếu skill `vela-design`** (`.agents/skills/vela-design/SKILL.md` và `.agents/skills/vela-design/readme.md`).

### Các nguyên tắc cốt lõi từ Vela Design System:
- **Design Tokens**: Luôn sử dụng token từ `@/theme` (`colors`, `radius`, `spacing`, `shadows`, `typography`, `textStyles`).
- **Màu sắc**: Nền app `colors.surface.canvas` (`#F4F5FA`), bề mặt `colors.surface.primary` / `colors.surface.input` (`#FFFFFF`), màu chủ đạo `colors.brand.primary` (`#2F6FED`), viền `colors.border.strong` (`#EDEEF3`) / `colors.border.subtle`.
- **Form Fields**: Các trường nhập liệu có nhãn (`label`) phía trên dùng `typography.sizes.small` + `typography.weights.black` (hoặc bold) với `colors.content.secondary`. Khung nhập liệu có `backgroundColor: colors.surface.input`, `borderColor: colors.border.strong`, `borderRadius: radius.sm`, padding chuẩn `spacing[3]`.
- **Icons**: Dùng `lucide-react-native`, không dùng emoji hay Unicode.
- **Copy**: Ngôn ngữ Tiếng Việt, ngắn gọn, chuẩn xác.
