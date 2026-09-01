# Thiết kế: Đổi chart "Xu hướng thu chi" sang pie chart Thu/Chi theo kỳ

## Trạng thái

- Spec nhỏ, sửa trên tính năng Reports v2 đã code (xem `docs/superpowers/specs/2026-08-31-bao-cao-nang-cao-design.md`).
- Chưa có implementation plan.

## Bối cảnh

Màn `ReportsScreen` (`src/features/finance/screens/reports-screen.tsx`) hiện có 2 section chart:

1. **"Xu hướng thu chi"** (`reportsTrendTitle`) — `ReportTrendChart.tsx`: `LineChart` (react-native-gifted-charts) vẽ 2 đường thu/chi qua **nhiều kỳ** (tuần/tháng/quý/năm gần nhất), dữ liệu từ use case `GetReportTrend` (`src/core/application/finance/get-report-trend.ts`). Chỉ hiển thị khi `showTrend` true (period kind khác `custom`).
2. **"Chi tiêu theo danh mục"** (`reportsCategoryTitle`) — `ReportCategoryChart.tsx`: donut `PieChart` + legend (icon, nhãn, %) thể hiện cơ cấu chi tiêu theo danh mục **trong 1 kỳ đang chọn**.

Yêu cầu: đổi section (1) từ line chart nhiều kỳ sang **pie/donut chart Thu vs Chi trong đúng 1 kỳ đang chọn** — không phải theo danh mục (section (2) đã làm việc đó), mà là tỷ trọng Thu so với Chi.

Số liệu thu/chi của kỳ đang chọn đã có sẵn (`report.income`, `report.expense` từ `GetReport.execute`, đang dùng cho summary card phía trên) — không cần use case mới cho biểu đồ này. Việc này khiến `GetReportTrend` (chuỗi nhiều kỳ) không còn nơi nào gọi.

## Không thuộc phạm vi

- Không đổi section "Chi tiêu theo danh mục" (`ReportCategoryChart`).
- Không thêm lại tính năng "xu hướng nhiều kỳ" dưới hình thức nào khác trong spec này — nếu sau này cần biểu đồ trend nhiều kỳ trở lại, đó là một feature/spec riêng, viết lại `GetReportTrend`-tương tự từ đầu.
- Không đổi `GetReport`, `resolveCurrentRange`, `previousPeriodOfSameLength`, hay bất kỳ logic tính income/expense hiện có.

## Thiết kế

### 1. Component chart

Đổi tên `src/components/finance/ReportTrendChart.tsx` → `src/components/finance/ReportIncomeExpenseChart.tsx`, thay nội dung:

- Props: `{ income: number; expense: number; incomeLabel: string; expenseLabel: string; emptyLabel: string }`.
- Donut `PieChart` 2 lát: Thu (`colors.status.positive`), Chi (`colors.status.negative`) — cùng kích thước donut với `ReportCategoryChart` (`innerRadius={56}`, `radius={88}`) để đồng bộ 2 section.
- % mỗi lát tính trong component (hoặc nhận sẵn từ props, xem mục 2) dựa trên `income / (income + expense)` và ngược lại.
- Legend bên dưới: 2 dòng — chấm màu tròn (kiểu `LegendDot` cũ trong `ReportTrendChart.tsx`) + nhãn (Thu nhập/Chi tiêu) + % + số tiền (`formatVnd`). Không dùng `CategoryIcon` avatar vì đây không phải danh mục, chỉ 2 mục cố định.
- Empty state: khi `income === 0 && expense === 0`, hiện `emptyLabel` (giữ nguyên hành vi rỗng như cũ).
- Toàn bộ style dùng token từ `@/theme` (`colors`, `radius`, `spacing`, `shadows`, `typography`), theo đúng convention của `ReportCategoryChart.tsx`.

### 2. `use-reports.ts`

- Xóa: `trendKind`, `TREND_KIND_BY_PERIOD_KIND`, `showTrend` (khỏi `ReportsViewModel` và state), `trendPoints`, type `ReportTrendChartPoint`, hàm `trendPointLabel`, lệnh gọi `dependencies.getReportTrend.execute(...)` trong `load()`.
- Thêm vào state: `incomeExpenseChart: { income: number; expense: number }` (raw number, lấy trực tiếp từ `report.income`/`report.expense` đã tính trong `load()` — không gọi thêm use case). Format nhãn tiền + % tính trong component chart (mục 1), không tính sẵn trong view-model, để tránh trùng logic phần trăm.

### 3. `reports-screen.tsx`

- Thay import/usage `ReportTrendChart` → `ReportIncomeExpenseChart`.
- Bỏ điều kiện `{props.showTrend ? ... : null}` — luôn render section này (kể cả khi period kind là `custom`, trước đây không có trend chart cho custom).
- Đổi text tiêu đề section: key `reportsTrendTitle` — nội dung tiếng Việt đổi từ "Xu hướng thu chi" → **"Tỷ trọng thu chi"** (và cập nhật bản tiếng Anh tương ứng trong `src/i18n/locales/en.ts`, ví dụ "Income vs expense").

### 4. Dọn dead code

Vì `GetReportTrend` không còn nơi nào gọi sau thay đổi này (đã xác nhận với user — xóa hẳn thay vì để lại phòng hờ):

- Xóa `src/core/application/finance/get-report-trend.ts`.
- Xóa wiring trong `src/features/finance/finance-dependencies.ts` (biến/field `getReportTrend` và import liên quan).
- Xóa `tests/core/finance/get-report-trend.test.ts`.

### 5. Test khác cần cập nhật

- `tests/features/finance/reports.test.tsx`: bỏ assertion liên quan `trendPoints`/`showTrend`/trend use case mock; thêm/sửa assertion cho `incomeExpenseChart`.
- `tests/components/finance/report-charts.test.tsx`: thay test `ReportTrendChart` bằng test `ReportIncomeExpenseChart` (2 lát pie, legend %, empty state).
- `tests/i18n/reports-component-keys.test.ts`: cập nhật danh sách key nếu có đổi tên key hoặc kỳ vọng nội dung.

## Câu hỏi mở

- Không còn — user đã xác nhận: nội dung pie là Thu vs Chi (không phải theo danh mục), và xóa hẳn `GetReportTrend` thay vì giữ lại không dùng.
