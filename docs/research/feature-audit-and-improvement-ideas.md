# Audit tính năng & Ý tưởng cải tiến — Vela

**Ngày:** 2026-09-01
**Mục đích:** Tài liệu chuẩn bị dựa trên bằng chứng thực tế cho một phiên `superpowers:brainstorming` về việc nên làm gì tiếp theo. Mọi nhận định bên dưới đều được truy vết về một file cụ thể (kèm số dòng khi cần thiết). Đọc `docs/superpowers/STATUS.md` để biết bảng theo dõi spec/plan/code chính thức — nhưng xem mục §0, bảng này đang bị lệch (cũ) ở hai chỗ phát hiện được trong lần audit này.

---

## 0. Đính chính STATUS.md (phát hiện trong lần audit này)

`docs/superpowers/STATUS.md` là nguồn theo dõi chính thức, nhưng đang lỗi thời ở hai điểm tính đến thời điểm audit:

1. **Chi tiêu định kỳ bị ghi "❌ Chưa code" nhưng thực ra đã được cài đặt đầy đủ và tích hợp vào app.** Bằng chứng: `src/core/domain/finance/recurring-schedule.ts`, `recurring-occurrence.ts`, `recurring-date.ts`; các use case `src/core/application/finance/{create-recurring-expense,get-recurring-overview,confirm-recurring-occurrence,skip-recurring-occurrence,manage-recurring-schedule,sync-recurring-notifications}.ts`; repository `src/data/local/repositories/recurring-*.ts`; bộ lập lịch thông báo `src/infrastructure/expo/notifications/recurring-notification-scheduler.ts`; các màn hình `src/features/finance/screens/recurring-management-screen.tsx` (361 dòng) và `recurring-occurrences-screen.tsx` (731 dòng); cùng phần routing/composition trong `src/app/index.tsx:21-30,59-60,83,278-297,478-513`. Settings cũng có mục "Quản lý định kỳ" trỏ vào đây (`src/features/finance/screens/settings-screen.tsx:75-81`). Lịch sử git có 2 commit tính năng (`5155a1a`, `c84efca`). **Việc cần làm: cập nhật lại STATUS.md.**
2. **Cặp spec/plan "category-management-custom-icons" (`docs/superpowers/specs/2026-08-31-category-management-custom-icons-design.md` / `docs/superpowers/plans/2026-08-31-category-management-custom-icons.md`) không hề có dòng nào trong bảng STATUS.md**, nhưng thực tế đã được code đầy đủ: có cột `icon`/`color` trong schema danh mục (`src/data/local/schema/categories.ts:10-11`), một registry icon 554 dòng (`src/components/finance/category-icon-registry.ts`) dùng icon từ FontAwesome6/MaterialCommunityIcons/Lucide, `CategoryFormSheet.tsx` (263 dòng), và `categories-screen.tsx` (283 dòng) với tab quản lý thu/chi riêng. **Việc cần làm: bổ sung một dòng vào STATUS.md.**

Hệ quả: số lượng tính năng thực sự "đã xong" cao hơn con số STATUS.md đang thể hiện — nên sửa lại trước khi dùng nó để lên kế hoạch cho spec tiếp theo, tránh mất công scope lại việc đã làm xong rồi.

---

## 1. Kiểm kê tính năng hiện có

| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| Giao dịch (CRUD thu/chi) | Đã hoàn thiện | `src/features/finance/screens/transactions-screen.tsx`, `src/core/domain/finance/transaction.ts`, spec `docs/superpowers/specs/2026-08-25-income-expense-design.md` (✅ trong STATUS.md) |
| Dashboard/Tổng quan (số dư, thống kê thu/chi, giao dịch gần đây, chi tiêu theo danh mục) | Đã hoàn thiện | `src/features/finance/screens/dashboard-screen.tsx` (300 dòng), plan `docs/superpowers/plans/2026-08-26-overview-screen-ui-coding-plan.md` (✅) |
| Tài khoản (Accounts) | Đã có, còn sơ sài | `src/features/finance/screens/accounts-screen.tsx` (71 dòng), domain `src/core/domain/finance/account.ts` (12 dòng) — model domain rất mỏng, có vẻ chỉ có tên/số dư |
| Danh mục kèm icon/màu tuỳ chỉnh | Đã hoàn thiện (chưa được ghi vào STATUS.md, xem §0) | `src/features/finance/screens/categories-screen.tsx`, `src/components/finance/category-icon-registry.ts`, `src/data/local/schema/categories.ts:10-11` |
| Chi tiêu định kỳ (lịch trình, xác nhận/bỏ qua kỳ phát sinh, thông báo) | Đã hoàn thiện (STATUS.md bị cũ, xem §0) | Xem danh sách file ở §0 |
| Theo dõi vàng (lô vàng, thương hiệu, mua/bán, lịch sử, thùng rác/hoàn tác) | Đã hoàn thiện | `src/components/gold/*` (7 component: OverviewCard, HistoryList, BrandManageSheet, ActionPickerSheet, FormSheet, TrashSheet, DetailSheet), domain `src/core/domain/gold/*`, spec `2026-08-27-personal-gold-tracking-design.md` + `2026-08-29-gold-management-screen-design.md` (cả hai ✅ theo STATUS, cái sau "gần done") |
| Lịch xem vàng (vẽ tuỳ chỉnh) | **Chưa cài đặt** | STATUS.md ghi chú thiếu `GoldCalendarModal.tsx` + view-model `gold-calendar.ts`; `GoldFormSheet.tsx` vẫn dùng `DateField` mặc định thay vì lịch tuỳ chỉnh như spec đề ra |
| Báo cáo (chọn kỳ, tổng hợp thu/chi có so sánh kỳ trước, biểu đồ theo danh mục, biểu đồ donut thu/chi) | Đã hoàn thiện | `src/features/finance/screens/reports-screen.tsx` (237 dòng), `src/components/finance/{ReportCategoryChart,ReportIncomeExpenseChart,PeriodSelector}.tsx`, spec `2026-08-31-bao-cao-nang-cao-design.md` + `2026-09-01-reports-income-expense-pie-chart-design.md` (cả hai ✅) |
| Biểu đồ xu hướng nhiều kỳ | **Đã bị gỡ bỏ chủ động** | Dòng STATUS.md ngày 2026-09-01: `GetReportTrend` "đã bị xóa hẳn" — thay bằng donut một kỳ. Hiện Reports chỉ hiển thị một kỳ tại một thời điểm, không còn đường xu hướng nhiều kỳ. |
| Reports có bao gồm chi tiêu định kỳ / ngân sách / mục tiêu | **Chủ động nằm ngoài phạm vi**, theo thiết kế | Dòng STATUS.md ngày 2026-08-31: "Tổng hợp chi tiêu định kỳ ... và Budget/Goal vẫn ngoài phạm vi" |
| Lưu trữ cục bộ offline-first (SQLite + Drizzle) | Đã hoàn thiện | `src/data/local/db`, `src/data/local/schema`, `src/data/local/repositories`, spec `2026-08-24-offline-first-sync-design.md` (✅) |
| Đồng bộ giữa các thiết bị (file/share transport, gói export/import, xử lý xung đột) | Đã hoàn thiện | `src/data/sync/{transports,conflict-resolution,serializers,sync-engine,authentication}`, use case `src/core/application/use-cases/{export,import,apply}-sync-package.ts`, màn hình `src/app/sync.tsx` + `src/features/sync/screens/sync-screen.tsx` (237 dòng) |
| Onboarding | Đã hoàn thiện | `src/features/finance/screens/onboarding-screen.tsx` (744 dòng — flow khá đầy đủ) |
| Đa ngôn ngữ (Việt + Anh) | Đã có | `src/i18n/locales/{vi,en}.ts` |
| Thư viện base component dùng chung | Đã hoàn thiện, được áp dụng | Spec `2026-08-31-shared-base-components-design.md` (✅, "19 file finance/gold đã import thật từ src/components/base") |
| Ngân sách (Budgets) | **Chưa phải tính năng thật — chỉ có UI chết** | Xem §2 bên dưới |
| Mục tiêu tiết kiệm (Savings goals) | **Chưa phải tính năng thật — chỉ có UI chết** | Xem §2 bên dưới |
| Xuất sao kê giao dịch (CSV/Excel/PDF) | **Chưa cài đặt** | Không có kết quả nào cho export csv/excel ngoài định dạng gói đồng bộ giữa thiết bị; export đồng bộ (`export-sync-package.ts`) là backup toàn bộ DB, không phải sao kê dễ đọc cho người dùng |
| Đa tiền tệ | **Chưa cài đặt** | `src/core/domain/finance/money.ts` hardcode định dạng/parse theo VND (`formatVnd`, `parseVndInput`); không có trường tiền tệ hay khái niệm tỷ giá nào trong `src/core/domain` |
| Khoá app bằng sinh trắc học/PIN | **Chưa cài đặt** | Không có `expo-local-authentication` hay thư viện tương tự trong `package.json`; có `expo-secure-store` nhưng chỉ dùng cho đồng bộ/định danh thiết bị (`src/infrastructure/expo/secure-store`), chưa dùng để khoá app |

## 2. Lỗ hổng và điểm gồ ghề phát hiện trong code thực tế

- **`GoalCard` và `BudgetRow` là component chết, không có tính năng thật đứng sau.** `src/components/finance/GoalCard.tsx` và `BudgetRow.tsx` được export từ `src/components/finance/index.ts:5,13` nhưng grep cho thấy **không có màn hình, view-model, hay kiểu domain nào import/render chúng** — không có entity `Budget`/`Goal` nào trong `src/core/domain/finance/`, không có repository, không có use case. Đây trông giống component mockup/prototype còn sót lại từ giai đoạn thiết kế ban đầu, không phải tính năng đang làm dở. Điều này khớp với ghi chú backlog trong CLAUDE.md về việc tách `ProgressBar` dùng chung cho "GoalCard/BudgetRow" — nhưng vấn đề gốc còn cơ bản hơn: cả hai component đều chưa hề được dùng. Cần một quyết định: xây tính năng thật đứng sau chúng, hay xoá code chết này.
- **Ba mục trong Settings bị hỏng/vô hiệu.** Trong `src/features/finance/screens/settings-screen.tsx`:
  - `onPress={undefined}` bị hardcode cho mục "Ẩn số dư" (Hide Amounts) ở dòng 87 — hàng này luôn bị vô hiệu, và trùng lặp chức năng đã hoạt động sẵn qua nút ẩn/hiện của Dashboard (`toggleAmountsHidden` trong `use-dashboard`, hiển thị ở `dashboard-screen.tsx:79-84`). Đây là UI chết gây rối, nằm cạnh một tính năng đã tồn tại ở nơi khác.
  - Các prop `onOpenPersonalInfo` và `onOpenLocalBackup` được khai báo và render (hàng "Thông tin cá nhân", "Sao lưu cục bộ") nhưng **chưa bao giờ được truyền handler** trong `src/app/index.tsx` (`ConfiguredSettingsScreen`, khoảng dòng 381-388) — cả hai hàng luôn hiển thị ở trạng thái vô hiệu/xám màu. Nên hoàn thiện việc gắn logic (Local Backup có thể tái sử dụng luôn use case export/import đồng bộ đã có sẵn) hoặc gỡ bỏ hai hàng này.
- **Màn hình quản lý vàng đang "gần done"** theo STATUS.md: còn thiếu `GoldCalendarModal.tsx` + `gold-calendar.ts`, và `GoldFormSheet.tsx` vẫn dùng date picker mặc định thay vì lịch tuỳ chỉnh như spec — một khoảng trống về tính nhất quán thiết kế chỉ xảy ra ở một màn hình.
- **Model domain của Tài khoản (Accounts) khá mỏng** (`src/core/domain/finance/account.ts`, 12 dòng) — nên kiểm tra trong buổi brainstorming xem hiện đã hỗ trợ những thứ như loại tài khoản (tiền mặt/ngân hàng/ví điện tử), điều chỉnh số dư ban đầu, hay lưu trữ (archive) chưa, vì người dùng Việt Nam thường theo dõi riêng biệt nhiều ví/tài khoản ngân hàng/ví điện tử.
- **Reports đã mất đường xu hướng nhiều kỳ** (dòng STATUS.md ngày 2026-09-01: code `GetReportTrend` đã bị xoá) để đổi lấy biểu đồ donut một kỳ. Đây là một bước lùi tính năng thực sự đối với ai muốn xem xu hướng chi tiêu theo thời gian (ví dụ 6 tháng gần nhất), chứ không chỉ tỷ lệ thu/chi của một kỳ — đáng lưu ý vì đây là một sự loại bỏ có chủ đích gần đây, không phải sơ suất.

## 3. Ý tưởng cải tiến cho tính năng hiện có

1. **Bổ sung lại view xu hướng nhiều kỳ cho Reports, nhưng là một biểu đồ thực sự tách biệt với donut hiện tại**, vì `GetReportTrend` đã bị gỡ bỏ chủ động thay vì được gộp lại (STATUS.md ngày 2026-09-01). Lý do: người dùng muốn đánh giá "tôi có đang chi tiêu nhiều hơn tháng trước không" cần một xu hướng nhiều điểm dữ liệu, và donut (một kỳ, thu vs chi) không thể hiện được điều đó; đây là khôi phục lại chức năng đã từng được lên kế hoạch, không phải scope mới.
2. **Gắn "Sao lưu cục bộ" trong Settings vào các use case export/import đồng bộ đã có sẵn** (`export-sync-package.ts` / `import-sync-package.ts`) thay vì để hàng này chết. Lý do: logic backend cho đồng bộ giữa thiết bị đã tồn tại; một điểm vào kiểu "sao lưu ra file / khôi phục từ file" gần như miễn phí để thêm vào và phục vụ trực tiếp cho người dùng lo mất dữ liệu, khác với luồng đồng bộ đa thiết bị.
3. **Mở rộng tính năng Chi tiêu định kỳ để bao gồm cả thu nhập định kỳ, nếu chưa tổng quát hoá sẵn** — nên kiểm tra trong `src/core/domain/finance/recurring-schedule.ts` xem kiểu lịch trình có độc lập với loại giao dịch (thu/chi) hay không; nếu chỉ dành cho chi tiêu, các khoản thu định kỳ như lương/tiền cho thuê là một mở rộng tự nhiên, chi phí thấp trên hạ tầng đã xây (bộ lập lịch thông báo, UI xác nhận/bỏ qua kỳ đã có sẵn).
4. **Tăng cường tính năng Tài khoản** (chuyển tiền giữa các tài khoản, số dư luỹ kế theo từng tài khoản trong Reports/Dashboard) vì model domain hiện chỉ có 12 dòng — nhiều khả năng đang thiếu tính năng chuyển tiền giữa các tài khoản, vốn là một trong những yêu cầu phổ biến hàng đầu trong app tài chính cá nhân khi có >1 tài khoản.
5. **Hoàn thiện hoặc gỡ bỏ view lịch vàng tuỳ chỉnh** — vì đây là hạng mục đã spec nhưng còn thiếu rõ ràng nhất (`GoldCalendarModal.tsx` chưa có), nên xử lý dứt điểm trước khi thêm tính năng vàng mới, tránh để module này ở trạng thái "gần done" mãi mãi.

## 4. Ý tưởng tính năng mới

Đối chiếu với `docs/superpowers/STATUS.md` và các spec — mục đánh dấu "đã có spec" nghĩa là đã có tài liệu thiết kế; mục đánh dấu "hoàn toàn mới" nghĩa là không có dấu vết nào trong `docs/superpowers/specs/`.

1. **Ngân sách (giới hạn chi tiêu theo danh mục/kỳ) — hoàn toàn mới**, dù UI `BudgetRow.tsx` đã tồn tại như một khung sườn chưa dùng (§2). Chưa có model domain, use case, hay spec nào. Đây là một trong những tính năng lõi được yêu cầu nhiều nhất ở app tài chính, và phần khung UI đã có sẵn nhưng chưa dùng — ứng viên tự nhiên cho spec tiếp theo.
2. **Mục tiêu tiết kiệm — hoàn toàn mới**, tình trạng tương tự như Ngân sách (`GoalCard.tsx` chưa dùng). Chưa có domain/spec nào.
3. **Khoá app (sinh trắc học/PIN) — hoàn toàn mới.** Chưa có dependency `expo-local-authentication`, chưa có màn hình khoá hay logic domain khoá nào trong `src/`. Vì app lưu dữ liệu tài chính hoàn toàn offline-first trên thiết bị (`src/data/local`), màn hình khoá là kỳ vọng hợp lý mà người dùng Việt Nam thường có với app tài chính, và `expo-secure-store` đã là dependency sẵn có (hiện chỉ dùng cho key đồng bộ) nên nền tảng lưu trữ/mã hoá đã có sẵn trong app.
4. **Đọc SMS/thông báo từ ngân hàng/ví điện tử để tự động nhập giao dịch — hoàn toàn mới.** Rất phổ biến trong các app tài chính Việt Nam (ví dụ Money Lover, Sổ Thu Chi) để giảm công sức nhập liệu thủ công; không có dấu vết nào trong spec hay `src/`. Đây sẽ là một khoản đầu tư lớn hơn (cần quyền truy cập notification-listener trên Android, không hoạt động tốt trên iOS) — nên đánh dấu là một canh bạc lớn, không phải một chiến thắng nhanh.
5. **Theo dõi nợ/vay (ai nợ ai, hoặc lịch trình vay cá nhân) — hoàn toàn mới.** Chưa có model domain nào; là tính năng phụ phổ biến trong app tài chính Việt Nam bên cạnh theo dõi vàng (vốn đã có sẵn cho khái niệm "tài sản phi tiền mặt" tương tự — có thể tái sử dụng pattern UI từ `src/components/gold/`).
6. **Xuất sao kê (CSV/PDF) cho một kỳ — hoàn toàn mới.** Gói export đồng bộ (`export-sync-package.ts`) là định dạng backup toàn bộ DB, không phải sao kê giao dịch dễ đọc/chia sẻ cho con người; `expo-sharing` đã là dependency sẵn có nên việc gắn xuất CSV/PDF vào bộ chọn kỳ hiện có của Reports sẽ tương đối ít công sức.
7. **Hỗ trợ đa tiền tệ — hoàn toàn mới, công sức lớn hơn.** `money.ts` được thiết kế chỉ dành cho VND (báo lỗi với số không nguyên, hardcode hậu tố `₫`); cần một đợt thiết kế thật sự, không phải bổ sung nhanh — chỉ liên quan nếu nhóm người dùng mục tiêu được kỳ vọng có tài khoản USD/quy đổi vàng/ngoại tệ (lưu ý: theo dõi vàng đã tồn tại như một dạng "kho lưu trữ giá trị phi tiền tệ" tương tự VND, có thể làm giảm mức độ cấp thiết của tính năng này với người dùng Việt Nam điển hình).
8. **Tích hợp chi tiêu định kỳ vào Reports và một widget "hoá đơn sắp tới" trên màn hình chính — mới, nhưng xây trực tiếp trên hạ tầng chi tiêu định kỳ đã có sẵn.** STATUS.md ghi rõ việc tích hợp chi tiêu định kỳ vào Reports nằm ngoài phạm vi của phần việc Reports ngày 2026-08-31; vì bản thân chi tiêu định kỳ giờ đã được code đầy đủ (§0), việc hiển thị "sắp đến hạn tuần này" trên Dashboard là một bước nối tiếp rẻ, không phải hạ tầng mới.

---

*Tổng hợp bằng cách đọc `docs/superpowers/STATUS.md`, toàn bộ file trong `docs/superpowers/specs/` và `docs/superpowers/plans/`, `package.json`, và source code trong `src/app`, `src/core`, `src/data`, `src/features`, `src/components` ngày 2026-09-01.*
