# Thiết kế Báo cáo nâng cao (Reports v2)

## Trạng thái

- Spec sản phẩm và kiến trúc; chưa có implementation plan.
- **Đây KHÔNG phải tính năng hoàn toàn mới.** App đã có một màn `ReportsScreen` (`src/features/finance/screens/reports-screen.tsx`) đăng ký trong bottom nav (`navReports`, `src/app/index.tsx:229-241,344,398,556,603`) và dùng chung với các chip filter (`FilterBar`). Bản hiện tại chỉ hiển thị **một tháng** dạng text: thu/chi/chênh lệch + 2 danh sách tổng theo danh mục và theo tài khoản (`src/features/finance/screens/reports-screen.tsx:9-98`), không có biểu đồ, không có time-range ngoài tháng trước/sau, không so sánh kỳ, không xuất file. Spec này mô tả **Reports v2**: nâng cấp UI (biểu đồ, khoảng thời gian linh hoạt) trên nền use case `GetReport` đã có, mở rộng dần use case đó khi cần.

## Mục tiêu

Cho người dùng cái nhìn phân tích sâu hơn về tài chính cá nhân thay vì chỉ xem tổng số: xu hướng thu/chi theo thời gian, cơ cấu chi tiêu theo danh mục dưới dạng biểu đồ, so sánh giữa các kỳ, và bộ lọc khoảng thời gian linh hoạt (tuần/tháng/quý/năm/tùy chọn) — tái dùng tối đa hạ tầng `GetReport`, `FilterBar`, `CategoryIcon`, theme tokens đã có thay vì viết lại từ đầu.

## Không thuộc phạm vi (v1 của Reports v2)

- **Ngân sách (Budget) và Mục tiêu (Goal)**: Codebase hiện **không có** domain model, schema hay repository cho Budget/Goal — chỉ tồn tại 2 component thuần trình bày `BudgetRow.tsx` và `GoalCard.tsx` (`src/components/finance/BudgetRow.tsx`, `src/components/finance/GoalCard.tsx`), **không được import/sử dụng ở bất kỳ đâu khác trong `src/`** (đã grep xác nhận). Không có bảng `budgets`/`goals` trong `src/data/local/schema/`. Vì vậy "Hiệu suất ngân sách" và "Tiến độ mục tiêu" **không thể** làm trong v1 — cần một spec/feature Budget & Goal riêng (data model + CRUD) trước, xem mục Câu hỏi mở.
- Xuất PDF/CSV.
- Dự báo (forecast) chi tiêu định kỳ sắp tới dựa trên `RecurringSchedule`.
- So sánh nhiều kỳ cùng lúc (>2 kỳ) trên cùng biểu đồ.
- Đa tiền tệ (app chỉ dùng VNĐ, theo `RecurringSchedule` MVP note tương tự — xem `docs/superpowers/specs/2026-08-28-recurring-expense-design.md:23`).

## Thuộc phạm vi v1

1. **Bộ chọn khoảng thời gian**: Tuần / Tháng (mặc định, giữ hành vi hiện tại) / Quý / Năm / Tùy chọn (from-to). `GetReport.execute` đã nhận `ReportPeriod = { from, to } | { month }` (`src/core/application/finance/get-report.ts:13`) nên chỉ cần UI mới sinh đúng `{ from, to }` cho tuần/quý/năm/tùy chọn — không cần đổi use case cho phần này.
2. **Biểu đồ xu hướng thu/chi theo thời gian**: line/bar chart nhiều điểm trong kỳ đang xem (ví dụ 6 tháng gần nhất khi xem theo tháng, tương tự `DashboardChartPoint`/`chartSeries` đã có trong `GetDashboard` — `src/core/application/finance/get-dashboard.ts:16-21,120-130`). Cần thêm hàm tương tự `chartSeries` vào `GetReport` (hoặc một use case `GetReportTrend` mới) vì `GetReport` hiện chỉ trả 1 kỳ, không có chuỗi thời gian.
3. **Biểu đồ cơ cấu chi tiêu theo danh mục** (pie/donut hoặc thanh ngang có màu): dùng trực tiếp `categoryTotals` đã có (`AggregateTotal[]`, `src/core/application/finance/get-report.ts:25`), tô màu theo `category.color` (đã map trong `ReportTotalItem.color`, `src/features/finance/view-models/use-reports.ts:21-27,100-111`) — không cần đổi domain, chỉ đổi UI render từ list text sang chart.
4. **So sánh kỳ hiện tại và kỳ trước** (kỳ trước liền kề cùng độ dài): hiển thị % tăng/giảm cho thu nhập, chi tiêu, chênh lệch. Yêu cầu gọi `GetReport.execute` 2 lần (kỳ hiện tại + kỳ trước) — không cần đổi use case, chỉ đổi view-model `use-reports.ts` để gọi thêm 1 lần.
5. **Tổng hợp chi tiêu định kỳ trong kỳ**: liệt kê tổng số tiền các giao dịch có nguồn gốc từ `RecurringSchedule` trong kỳ đang xem. Cần kiểm tra khả năng: hiện `Transaction` không có cờ đánh dấu "đến từ recurring" trực tiếp — liên kết duy nhất là `RecurringSchedule.firstTransactionId` (giao dịch kỳ đầu, `src/core/domain/finance/recurring-schedule.ts:22`) và `RecurringOccurrence.transactionId` sau khi xác nhận (theo `docs/superpowers/specs/2026-08-28-recurring-expense-design.md:64`). Muốn tổng hợp chính xác "tổng chi định kỳ tháng này" cần JOIN qua `recurring_occurrences.transactionId` hoặc `recurringSchedules.firstTransactionId`, không suy ra được chỉ từ `Transaction` — xem Câu hỏi mở #3.
6. **Bộ lọc kèm theo**: tái dùng `FilterBar` (`src/components/finance/FilterBar.tsx`) ở chế độ compact cho loại giao dịch, danh mục (đa chọn — đã hỗ trợ `categoryIds`, xem `FilterBar.tsx:26,88-89` và tính năng "multiple category selection" vừa thêm ở commit `494f352`), tài khoản.

## Phase sau (không làm trong v1)

- Budget & Goal (cần feature riêng dựng data model trước).
- Export PDF/CSV.
- Dự báo chi tiêu định kỳ sắp tới trên biểu đồ.
- So sánh year-over-year nhiều năm.
- Đặt "Sắp chi" (recurring occurrence pending) hiển thị dự kiến trên biểu đồ xu hướng — đã được note là "bài toán UX phase sau" ngay trong spec recurring (`docs/superpowers/specs/2026-08-28-recurring-expense-design.md:130`).

## Dữ liệu & Data Requirements

### Nguồn dữ liệu hiện có (không đổi)

- **Transaction** (`src/core/domain/finance/transaction.ts:5-28`): `amount` (integer VNĐ, luôn dương), `type: 'income'|'expense'|'transfer'`, `accountId`, `categoryId` (chỉ income/expense), `date` (ISO `YYYY-MM-DD`), `destinationAccountId` (chỉ transfer), soft-delete qua `deletedAt` (kế thừa từ `FinanceRecord`).
- **Category** (`src/data/local/schema/categories.ts:40-56` + `src/core/domain/finance/category.ts`): `id`, `name`, `type: 'income'|'expense'`, `icon` (dạng `'fa6:...'`/`'mci:...'`/`'lucide:...'`), `color` (hex), `isArchived`.
- **Account**: dùng qua `AccountRepository.findById`/`listActive` (đã dùng trong `use-reports.ts:112-121`, `get-dashboard.ts:104-112`).
- **RecurringSchedule** (`src/core/domain/finance/recurring-schedule.ts:7-26`): `frequency`, `amount`, `firstTransactionId`, `generatedCount`, `status`. Chưa có repository/UI hoàn thiện (theo `docs/superpowers/STATUS.md` dòng recurring-expense: "❌ Chưa code" tính đến 2026-08-31) — nghĩa là mục "Tổng hợp chi tiêu định kỳ" (mục 5 ở trên) phụ thuộc vào tính năng recurring được code xong trước, không chỉ phụ thuộc report.

### Aggregation logic tái dùng

- `calculatePeriodSummary(transactions, from, to)` (`src/core/domain/finance/finance-calculations.ts:50-89`): tính `income`, `expense`, `netCashFlow` trong khoảng `[from, to]` inclusive, loại `transfer` và `deletedAt !== null`.
- `aggregateExpenseTotals(transactions, keyOf)` (`src/core/application/finance/get-dashboard.ts:72-92`): tổng độ lớn chi tiêu (chỉ `type === 'expense'`) theo key (category hoặc account), sort giảm dần. **Lưu ý quan trọng đã ghi trong code** (comment tại dòng 60-71): không tái dùng `byCategory`/`byAccount` (net có dấu) của `calculatePeriodSummary` cho báo cáo "chi theo X" vì account có thể vừa nhận income vừa expense → sai dấu.
- `GetReport.execute(period, filters)` (`src/core/application/finance/get-report.ts:41-70`): entry point hiện tại, nhận `ReportPeriod` (`{from,to}` hoặc `{month}`) và `ReportFilters` (`type`, `categoryId`, `accountId`, `query` — subset của `TransactionListFilter`), trả `ReportView { income, expense, netCashFlow, categoryTotals, accountTotals }`.
- `resolveMonthRange(month)` / `shiftMonth(month, delta)` (`src/core/application/finance/get-dashboard.ts:45-58`): helper convert `YYYY-MM` ↔ `{from,to}`; cần helper tương tự cho tuần/quý/năm (chưa tồn tại — phải viết mới, ví dụ `resolveWeekRange`, `resolveQuarterRange`, `resolveYearRange`).

### Việc cần làm ở tầng application (khi lên plan coding)

- Thêm hàm resolve range cho week/quarter/year vào cạnh `resolveMonthRange` (cùng file `get-dashboard.ts` hoặc tách file `report-periods.ts` dùng chung giữa `GetDashboard` và `GetReport`).
- Thêm khả năng trả về chuỗi nhiều điểm thời gian (trend) từ `GetReport` hoặc use case mới `GetReportTrend`, tương tự cách `GetDashboard.execute` build `chartSeries` bằng vòng lặp `shiftMonth` (`get-dashboard.ts:120-130`) — nhưng tổng quát hóa cho cả tuần/quý/năm.
- `ReportFilters` hiện chưa có `categoryIds` (chỉ `categoryId` số ít, theo `Pick<TransactionListFilter, 'type'|'categoryId'|'accountId'|'query'>` tại `get-report.ts:15-18`) trong khi `TransactionListFilter` đã hỗ trợ `categoryIds` (`finance-repositories.ts:85`) và `FilterBar`/`use-transactions.ts` đã dùng đa chọn danh mục. Cần mở rộng `ReportFilters` thêm `categoryIds` để Reports v2 filter đa danh mục nhất quán với màn Giao dịch.

## UI/UX Outline

- **Base components tái dùng**: `Card`, `Sheet`, `PrimaryButton` (`@/components/base`, theo convention "Base component" trong `CLAUDE.md`) cho khung card báo cáo và sheet bộ lọc nâng cao — đã dùng đúng cách trong `FilterBar.tsx:5`.
- **FilterBar**: dùng lại `src/components/finance/FilterBar.tsx` ở chế độ `compact` cho type/category/account; bổ sung UI chọn khoảng thời gian (tuần/tháng/quý/năm/tùy chọn) — hiện `FilterBar` chỉ có prev/next tháng (`FilterBar.tsx:94-110`), cần thêm segmented control kỳ hoặc tách riêng component `PeriodSelector` mới trong `src/components/finance/` (feature-specific, theo quy tắc component 2 lớp trong `CLAUDE.md`).
- **CategoryIcon**: badge tròn icon+màu, đã dùng đúng trong `Totals` hiện tại của `ReportsScreen` (`reports-screen.tsx:86`) — giữ nguyên khi thay list bằng chart, dùng làm legend/label cho pie chart.
- **Category colors**: `category.color` (hex, 16 màu chuẩn Vela — `VELA_CATEGORY_COLORS`, theo `docs/superpowers/specs/2026-08-31-category-management-custom-icons-design.md:154-171`) đã sẵn có cho từng danh mục — dùng trực tiếp làm màu series biểu đồ, không cần bảng màu riêng.
- **Theme tokens**: `@/theme` export `colors`, `radius`, `shadows`, `spacing`, `typography` (`src/theme/index.ts`, các file `colors.ts`/`radius.ts`/`shadows.ts`/`spacing.ts`/`typography.ts`) — màn `ReportsScreen` hiện tại đã dùng đúng token (`colors.surface.primary`, `spacing[4]`, `typography.weights.bold`, v.v., `reports-screen.tsx:100-136`). Thiết kế UI chi tiết (kiểu chart, layout) sẽ làm riêng qua skill `vela-design`, spec này chỉ xác nhận token đã sẵn sàng, không tự quyết định thư viện chart hay pixel-level layout.
- **Thư viện chart**: chưa có thư viện chart nào trong `package.json` hiện tại (đã grep "chart" trong `src/` — không có kết quả ngoài các file domain/report kể trên); cần chọn thư viện RN chart (ví dụ `victory-native`, `react-native-svg`-based, hoặc `react-native-gifted-charts`) ở bước lên plan — xem Câu hỏi mở #1.

## Navigation / Entry points

- Route hiện tại: view `'reports'` trong state machine điều hướng đơn-file `src/app/index.tsx` (không dùng file-based routing của Expo Router cho các tab chính — app dùng 1 `index.tsx` với `useState<View>` để switch màn, chỉ `sync.tsx` là route Expo Router riêng biệt theo `src/app/sync.tsx`).
- Đăng ký sẵn trong bottom nav ở nhiều nơi: `src/app/index.tsx:344,398,556,603` (`{ key: 'reports', label: t('navReports'), icon: 'reports' }`) và xử lý bấm chuyển view tại dòng 405, 562, 609.
- Composition: `ConfiguredReportsScreen` (`src/app/index.tsx:232-241` gọi component định nghĩa gần đó) lắp `useReports({ dependencies, t })` (`src/features/finance/view-models/use-reports.ts:88`) vào `ReportsScreen`. `dependencies.getReport` được khởi tạo tại `src/features/finance/finance-dependencies.ts:124` (`new GetReport({ transactionRepository })`).
- Reports v2 **không cần thêm route mới** — chỉ thay nội dung `ReportsScreen`/`useReports`, giữ nguyên entry point.

## Câu hỏi mở

1. **Thư viện chart**: chọn thư viện nào (Victory Native, react-native-gifted-charts, tự vẽ bằng `react-native-svg`)? Cần cân nhắc bundle size, tương thích Expo SDK 54 (New Architecture), theme dark/light nếu app có hỗ trợ.
2. **Budget/Goal**: có cần một feature Budget & Goal riêng (data model + CRUD) trước khi Reports v2 có thể hiển thị "Hiệu suất ngân sách"? Đề xuất: viết spec riêng `budget-goal-design.md`, Reports v2 chỉ tiêu thụ dữ liệu đó sau khi có.
3. **Liên kết Recurring ↔ Transaction cho báo cáo**: có cần thêm cột/flag trực tiếp trên `transactions` (ví dụ `recurringScheduleId`) để truy vấn nhanh "tổng chi định kỳ trong kỳ" thay vì JOIN qua `recurring_occurrences`/`firstTransactionId`? Ảnh hưởng schema, cần bàn với owner recurring feature (hiện recurring cũng chưa code xong theo STATUS.md).
4. **Khoảng thời gian tùy chọn (custom range)**: dùng date picker nào? App hiện có `DateField` (native) được nhắc tới trong STATUS.md (dòng gold-management) — cần xác nhận có tái dùng được cho việc chọn from/to hay cần picker kiểu range riêng.
5. **Trend chart bao nhiêu điểm mặc định** khi xem theo tuần/quý/năm (tương tự `CHART_MONTHS = 6` cho tháng, `get-dashboard.ts:38`)? Cần quyết định số kỳ hiển thị hợp lý cho từng loại.
6. **Có cần lưu "kỳ đang xem gần nhất"** (giống `month` mặc định hiện tại) qua lần mở app tiếp theo, hay luôn reset về kỳ hiện tại?

## Kiến trúc triển khai (định hướng, không chi tiết task)

- Domain/application: mở rộng `get-report.ts` (`ReportFilters` thêm `categoryIds`) và thêm use case/hàm trend mới; thêm helper `resolveWeekRange`/`resolveQuarterRange`/`resolveYearRange` cạnh `resolveMonthRange`. Không đổi schema/DB — mọi thứ đọc từ `transactions`/`categories`/`accounts` hiện có qua `TransactionRepository.list` (đã hỗ trợ `from`/`to`/`categoryIds`, `finance-repositories.ts:76-89`).
- UI: thay nội dung `ReportsScreen` bằng chart + `PeriodSelector` mới, giữ `useReports` là entry chính nhưng mở rộng để gọi 2 kỳ (hiện tại + trước) và có thể gọi thêm hàm trend.
- Theo quy tắc component 2 lớp (`CLAUDE.md`): `PeriodSelector`, `ReportTrendChart`, `ReportCategoryChart` là feature component đặt ở `src/components/finance/`, compose từ `Card`/`Sheet` trong `src/components/base/`.

## Kiểm thử chấp nhận (đề xuất, sẽ chi tiết hóa ở plan coding)

- Chọn kỳ Tuần/Tháng/Quý/Năm/Tùy chọn → `GetReport` (hoặc use case mới) trả đúng tổng thu/chi/chênh lệch cho đúng khoảng `[from, to]`.
- Biểu đồ cơ cấu danh mục hiển thị đúng màu `category.color` và đúng % tương ứng `categoryTotals`.
- Biểu đồ xu hướng hiển thị đúng số điểm mặc định theo loại kỳ đang chọn.
- So sánh kỳ hiện tại vs kỳ trước liền kề hiển thị đúng % tăng/giảm (bao gồm trường hợp kỳ trước = 0).
- Bộ lọc đa danh mục trong Reports hoạt động nhất quán với hành vi đã có ở màn Giao dịch (`use-transactions.ts:176-190`).
- Giao dịch `transfer` và giao dịch `deletedAt !== null` không xuất hiện trong bất kỳ tổng nào (kế thừa hành vi `calculatePeriodSummary`/`aggregateExpenseTotals`).

## Test hiện có liên quan

- `tests/features/finance/reports.test.tsx` — test hiện tại cho `ReportsScreen`/`useReports`, cần đọc và giữ tương thích (hoặc cập nhật có chủ đích) khi làm plan coding cho v2.
- `tests/core/finance/finance-domain.test.ts` — test cho `calculatePeriodSummary`/`calculateAccountBalance`.
