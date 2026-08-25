# Nghiên cứu: chức năng lập ngân sách cá nhân

Ngày nghiên cứu: 2026-08-25  
Phạm vi: kỳ ngân sách, spent/remaining/percent, cảnh báo và edge case cho app quản lý chi tiêu cá nhân.

## Tóm tắt quyết định đề xuất

- MVP nên dùng ngân sách theo tháng dương lịch, nhưng lưu `period_start` và `period_end` cụ thể thay vì suy ra từ tên tháng. CFPB định nghĩa ngân sách là kế hoạch thu/chi cho một khoảng thời gian; các sản phẩm phổ biến cũng tổ chức ngân sách theo tháng. [CFPB — Analyzing budgets](https://www.consumerfinance.gov/documents/8392/cfpb_building_block_activities_analyzing-budgets_guide.pdf), [Monarch — Budget Forecast](https://help.monarchmoney.com/hc/en-us/articles/360051885292-Plan-forecast)
- Mỗi danh mục cần có hạn mức kế hoạch và tổng chi thực tế độc lập. Công thức cơ bản: `spent = tổng expense hợp lệ trong kỳ`; `remaining = limit + rollover_in - spent`; `percent_used = spent / limit * 100` khi `limit > 0`. Công thức rollover tương ứng với cách Monarch tính `rollover tháng trước + planned tháng này - actual tháng này = remaining rollover tháng sau`. [Monarch — Rollover Budgets](https://help.monarchmoney.com/hc/en-us/articles/4411119762196-Rollover-budget-feature)
- Khi chưa vượt, hiển thị tiến độ; khi gần vượt, cảnh báo mềm và cho người dùng điều chỉnh; khi vượt, giữ dữ liệu chi, hiển thị số âm/over budget và đưa ra hành động khắc phục, không tự xoá hoặc chặn giao dịch. YNAB biểu diễn overspending bằng trạng thái cảnh báo và yêu cầu người dùng cover/điều chỉnh. [YNAB — Getting Out of Overdraft](https://support.ynab.com/en_us/getting-out-of-overdraft-in-ynab-a-guide-B1blkysC9)
- Cảnh báo nên có ngưỡng mặc định 80% và 100%, nhưng cho phép tắt/chỉnh theo danh mục; đây là khuyến nghị sản phẩm, không phải ngưỡng tài chính phổ quát. Android khuyến nghị xin quyền thông báo trong ngữ cảnh, cho người dùng quyền kiểm soát và dùng thông báo có trách nhiệm. [Android Developers — Notification runtime permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission), [Android Developers — Notifications](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications)
- Cần chốt sớm timezone, ngày bắt đầu kỳ, giao dịch pending/hoàn tiền, danh mục không hạn mức, rollover âm/dương và sửa giao dịch sau khi kỳ đã đóng; nếu không, cùng một giao dịch có thể làm số liệu thay đổi giữa các thiết bị hoặc sau khi chuyển kỳ. Quy tắc này là khuyến nghị mô hình dữ liệu dựa trên yêu cầu sản phẩm nêu trên.

## 1. Mô hình kỳ ngân sách

### 1.1. Mô hình MVP

Một bản ghi ngân sách nên có:

```text
BudgetPeriod
- id
- period_start       // inclusive, local date
- period_end         // exclusive, local date
- timezone           // timezone dùng để quy đổi transaction datetime
- status              // open | closed, nếu cần khóa kỳ

BudgetLimit
- id
- period_id
- category_id
- limit_amount       // số tiền không âm, theo minor unit
- rollover_mode      // off | positive_only | both
- alert_80_enabled
- alert_100_enabled

BudgetSummary (có thể tính động ở MVP)
- spent_amount
- rollover_in
- remaining_amount
- percent_used
- status
```

CFPB mô tả ngân sách/spending plan là kế hoạch cho số tiền dự kiến nhận, tiết kiệm hoặc chi trong một “given period”, nên kỳ phải là một thực thể rõ ràng chứ không chỉ là một nhãn hiển thị như “Tháng 8”. [CFPB — Analyzing budgets](https://www.consumerfinance.gov/documents/8392/cfpb_building_block_activities_analyzing_budgets_guide.pdf)

Khuyến nghị MVP chọn kỳ tháng dương lịch `YYYY-MM-01` đến ngày đầu tháng kế tiếp, theo timezone của hồ sơ người dùng. Cách này đơn giản cho màn hình “tháng này”, báo cáo năm và rollover; nếu sau này cần kỳ lương 14 ngày hoặc ngày bắt đầu tùy chỉnh, mô hình `period_start/period_end` vẫn mở rộng được. Monarch cho phép xem ngân sách theo các tháng và tổng năm, trong đó tổng năm là tổng của 12 ngân sách tháng. [Monarch — Budget Forecast](https://help.monarchmoney.com/hc/en-us/articles/360051885292-Plan-forecast)

### 1.2. Hạn mức cố định và rollover

Nên tách hai khái niệm:

1. `limit_amount`: số tiền người dùng dự định cấp cho danh mục trong kỳ hiện tại.
2. `rollover_in`: số dư được chuyển từ kỳ trước vào kỳ hiện tại.

Khi bật rollover, số dư cuối kỳ được tính:

```text
rollover_out = limit_amount + rollover_in - spent
remaining    = rollover_out
```

Nếu rollover tắt:

```text
remaining = limit_amount - spent
rollover_out = 0
```

Monarch xác nhận “remaining” là phần còn lại của danh mục và khi rollover bật, phần này được đưa vào phép tính của tháng tiếp theo; rollover âm cũng được phép biểu diễn số tiền đã vượt ở tháng trước. [Monarch — Rollover Budgets](https://help.monarchmoney.com/hc/en-us/articles/4411119762196-Rollover-budget-feature)

Khuyến nghị dùng ba chế độ để tránh buộc mọi danh mục có cùng hành vi:

- `off`: ăn uống, mua sắm thông thường; cuối kỳ không cộng dồn.
- `positive_only`: chỉ chuyển phần dư dương; phù hợp danh mục tiết kiệm cho chi phí không đều.
- `both`: chuyển cả dư dương và phần vượt âm; phù hợp khi muốn nợ ngân sách tháng trước ảnh hưởng tháng sau.

Monarch nêu rõ rollover hữu ích cho danh mục chi phí theo mùa như quần áo, quà lễ hoặc trại hè, và cho phép khoản rollover âm ảnh hưởng kỳ sau. [Monarch — Rollover Budgets](https://help.monarchmoney.com/hc/en-us/articles/4411119762196-Rollover-budget-feature)

### 1.3. Cách tính spent, remaining và percent

Định nghĩa đề xuất:

```text
spent = Σ transaction.amount
        với transaction.type = expense
        và category_id khớp
        và transaction.local_date nằm trong [period_start, period_end)
        và transaction không bị void/deleted

available = limit_amount + rollover_in
remaining  = available - spent

percent_used =
  0                         nếu available <= 0 và spent = 0
  100                       nếu available <= 0 và spent > 0
  spent / available * 100   nếu available > 0
```

Google Sheets mô tả template ngân sách theo hướng tổng hợp giao dịch theo category để tạo “actual”, còn YNAB tách target/plan khỏi việc theo dõi giao dịch thực tế. Đây là cơ sở cho việc không lấy “limit” làm spent và không tính giao dịch không có category vào một danh mục ngẫu nhiên. [Google Docs Editors Help — Budget templates](https://support.google.com/docs/answer/148833?co=GENIE.Platform%3DDesktop&hl=en), [YNAB — How to Use Targets](https://support.ynab.com/how-to-use-targets-rk5kkI9ks)

Hiển thị nên gồm cả tiền và phần trăm: `đã chi 800.000 / 1.000.000`, `còn 200.000`, `80%`. Phần trăm chỉ là chỉ báo tiến độ, không phải số tiền được phép chi thêm khi có giao dịch pending hoặc khoản rollover chưa quyết định; vì vậy số tiền còn lại phải là giá trị chính để ra quyết định. YNAB dùng progress bar/donut chart để hiển thị tiến độ target, đồng thời vẫn hiển thị số tiền cần cấp hoặc số tiền khả dụng. [YNAB — How to Use Targets](https://support.ynab.com/how-to-use-targets-rk5kkI9ks)

## 2. Ngưỡng cảnh báo và hành vi khi vượt

### 2.1. Ngưỡng đề xuất

Đề xuất cho MVP:

| Trạng thái | Điều kiện | UI/hành vi |
| --- | --- | --- |
| Bình thường | `percent_used < 80%` và `remaining >= 0` | Màu trung tính/xanh; không gửi push. |
| Sắp vượt | `80% <= percent_used < 100%` | Hiển thị cảnh báo trong danh mục; có thể gửi tối đa một push cho mỗi danh mục/kỳ. |
| Đã chạm hạn mức | `percent_used >= 100%` và `remaining >= 0` | Đổi trạng thái cảnh báo; đề nghị xem chi tiết hoặc giảm chi. |
| Vượt | `remaining < 0` | Hiển thị `vượt X`; cho phép tăng hạn mức, chuyển tiền từ danh mục khác, hoặc giữ nguyên và ghi nhận vượt. |

Các ngưỡng 80%/100% là lựa chọn sản phẩm để cảnh báo sớm và cảnh báo cứng; không nên trình bày chúng như quy tắc tài chính chung. Tính linh hoạt là cần thiết vì YNAB dùng trạng thái underfunded/overspent để thúc đẩy người dùng điều chỉnh kế hoạch, không tự suy ra một ngưỡng “đúng” cho mọi danh mục. [YNAB — How to Use Targets](https://support.ynab.com/how-to-use-targets-rk5kkI9ks), [YNAB — Getting Out of Overdraft](https://support.ynab.com/en_us/getting-out-of-overdraft-in-ynab-a-guide-B1blkysC9)

Nên cho phép người dùng chọn mức cảnh báo riêng, ví dụ 50%, 80%, 100%, hoặc tắt theo danh mục. Android Developers khuyến nghị ứng dụng cung cấp tùy chọn thông báo trong settings, giải thích rõ mục đích và tôn trọng việc người dùng từ chối quyền thông báo. [Android Developers — Notifications](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications), [Android Developers — Notification runtime permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission)

### 2.2. Không chặn giao dịch khi vượt

Khuyến nghị không chặn việc ghi nhận expense khi danh mục đã hết tiền. Giao dịch thực tế vẫn phải được lưu, còn ngân sách chuyển sang trạng thái `over_budget`; app đưa ra các lựa chọn sửa kế hoạch:

- tăng hạn mức danh mục;
- chuyển một phần hạn mức từ danh mục khác;
- bật/điều chỉnh rollover;
- giữ trạng thái vượt để người dùng thấy khoản thiếu.

YNAB mô tả overspending bằng số âm/cảnh báo và hướng người dùng cover hoặc điều chỉnh; việc cố cover khi không còn tiền khả dụng vẫn được báo là không thể, thay vì làm mất giao dịch. [YNAB — Getting Out of Overdraft](https://support.ynab.com/en_us/getting-out-of-overdraft-in-ynab-a-guide-B1blkysC9)

Khi phát sinh cảnh báo, thông báo nên có hành động rõ ràng như “Xem ngân sách” hoặc “Điều chỉnh hạn mức”. Android Developers khuyến nghị nội dung thông báo phải ngắn gọn, liên quan và làm rõ người dùng có thể làm gì tiếp theo. [Android Developers — Notifications](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications)

### 2.3. Chống spam cảnh báo

Mỗi cặp `(budget_period_id, category_id, threshold)` chỉ nên phát một cảnh báo khi trạng thái lần đầu đi qua ngưỡng; không gửi lại sau mỗi giao dịch nếu vẫn ở cùng trạng thái. Chỉ phát lại khi người dùng đã quay xuống dưới ngưỡng rồi vượt lại, hoặc khi bắt đầu kỳ mới. Đây là khuyến nghị UX suy ra từ yêu cầu Android về thông báo kịp thời, liên quan và sử dụng có trách nhiệm; hệ thống cũng cho người dùng thấy số lượng thông báo hằng ngày và có thể thu hồi quyền. [Android Developers — Notification runtime permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission)

## 3. Edge case quan trọng

### 3.1. Kỳ và thời gian

- Dùng khoảng nửa mở `[start, end)` để tránh giao dịch đúng 00:00 ngày đầu kỳ sau bị tính nhầm vào kỳ trước. Đây là quy ước triển khai được khuyến nghị để phân đoạn thời gian nhất quán.
- Lưu timezone của người dùng hoặc workspace; quy đổi `transaction.occurred_at` sang local date trước khi chọn kỳ. Nếu người dùng đổi timezone, cần quy định việc tái tính lịch sử hay giữ timezone đã chốt của kỳ.
- Nếu hỗ trợ kỳ tùy chỉnh, phải quy định ngày 29/30/31 khi sang tháng ngắn hơn; MVP nên tránh ngày bắt đầu tùy chỉnh để giảm quy tắc mơ hồ.
- Kỳ đã đóng không nên bị âm thầm thay đổi; nếu giao dịch cũ được sửa, cần cho phép tái mở/recalculate hoặc tạo adjustment có audit trail. Việc cho xem ngân sách quá khứ và dự phóng tương lai là một use case rõ ràng trong Budget Forecast của Monarch. [Monarch — Budget Forecast](https://help.monarchmoney.com/hc/en-us/articles/360051885292-Plan-forecast)

### 3.2. Loại giao dịch

- Chỉ `expense` làm tăng `spent`; `income` không làm giảm spent của danh mục.
- `transfer` giữa các tài khoản của chính người dùng không phải expense; nếu tính transfer sẽ làm phồng chi tiêu.
- Hoàn tiền/refund nên trừ khỏi danh mục gốc nếu có thể liên kết với expense ban đầu; nếu không liên kết, cho phép ghi nhận như inflow riêng và hiển thị quy tắc rõ ràng.
- Giao dịch pending/uncleared cần có lựa chọn “tính vào dự kiến” hoặc “chỉ tính khi posted”. YNAB phân biệt giao dịch uncleared với giao dịch đã ngân hàng biết và khuyến nghị ghi nhận giao dịch ngay khi xảy ra để kế hoạch không quên khoản chi. [YNAB — Glossary](https://support.ynab.com/en_us/ynab-glossary-a-guide-BJd80SORq)
- Giao dịch không có category phải nằm trong `Uncategorized`/hàng đợi cần xử lý, không tự phân bổ vào ngân sách; nếu không, tổng spent theo danh mục sẽ không truy vết được.

### 3.3. Số tiền và danh mục

- Lưu tiền theo minor unit integer hoặc decimal chính xác, không dùng floating point cho số tiền; làm tròn chỉ ở lớp hiển thị. Đây là khuyến nghị kỹ thuật để phép cộng nhiều giao dịch không tạo sai số.
- `limit_amount = 0` là trường hợp hợp lệ: nếu `spent = 0`, hiển thị `0%`; nếu có chi, hiển thị `vượt toàn bộ` thay vì chia cho 0.
- Danh mục không hạn mức nên có trạng thái `unbudgeted`, không hiển thị “0%” gây hiểu nhầm là đã hoàn thành.
- Nếu category bị đổi tên hoặc gộp, transaction phải tham chiếu ID ổn định; không truy vấn theo tên hiển thị.
- Một giao dịch chia nhiều category phải phân bổ từng phần; tổng các phần cần khớp transaction amount để tránh double count. YNAB coi category là nơi lập kế hoạch và giao dịch có thể chứa các chi tiết phân loại riêng; đây là mô hình phù hợp để suy ra yêu cầu split transaction. [YNAB — How to Add Transactions](https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi)

### 3.4. Rollover và chỉnh sửa

- Rollover dương có thể tiếp tục nhiều kỳ; cần hiển thị nguồn của `rollover_in` để người dùng hiểu vì sao hạn mức khả dụng lớn hơn kế hoạch tháng hiện tại. Monarch cho biết rollover có thể tiếp tục qua nhiều tháng và hiển thị biểu tượng khi nó được dùng trong phép tính. [Monarch — Rollover Budgets](https://help.monarchmoney.com/hc/en-us/articles/4411119762196-Rollover-budget-feature)
- Rollover âm cần có cài đặt rõ ràng; nếu tự động trừ vào tháng sau, người dùng có thể bất ngờ thấy `remaining` âm ngay đầu kỳ. Monarch xác nhận rollover âm có thể đại diện cho số đã vượt tháng trước và đi vào công thức kỳ sau. [Monarch — Rollover Budgets](https://help.monarchmoney.com/hc/en-us/articles/4411119762196-Rollover-budget-feature)
- Khi sửa `limit_amount` giữa kỳ, spent không đổi; chỉ `available`, `remaining`, `percent_used` và trạng thái cảnh báo được tính lại.
- Khi xóa/sửa giao dịch, phải tạo lại trạng thái threshold để cảnh báo không bị “kẹt” ở màu đỏ sau khi người dùng đã hoàn tác khoản chi.

## 4. Acceptance criteria đề xuất cho MVP

1. Người dùng tạo được ngân sách cho từng category của một tháng và xem `limit`, `spent`, `remaining`, `% used`.
2. Giao dịch expense trong đúng khoảng `[period_start, period_end)` được tính đúng một lần; giao dịch ngoài kỳ không ảnh hưởng.
3. `remaining` âm khi vượt và UI hiển thị số tiền vượt; việc vượt không ngăn lưu giao dịch.
4. Cảnh báo 80% và 100% chỉ phát một lần cho mỗi category/kỳ/ngưỡng, có cài đặt tắt và không phụ thuộc việc push được cấp quyền.
5. Rollover có thể bật/tắt theo category; test được cả rollover dương, rollover âm và kỳ không rollover.
6. Test riêng cho timezone, tháng 28/29/30/31 ngày, limit bằng 0, refund, transfer, pending, split transaction, category bị đổi tên và sửa giao dịch quá khứ.

## Nguồn chính đã sử dụng

- [Consumer Financial Protection Bureau — Analyzing budgets](https://www.consumerfinance.gov/documents/8392/cfpb_building_block_activities_analyzing-budgets-guide.pdf)
- [Monarch Money — Rollover Budgets](https://help.monarchmoney.com/hc/en-us/articles/4411119762196-Rollover-budget-feature)
- [Monarch Money — Budget Forecast](https://help.monarchmoney.com/hc/en-us/articles/360051885292-Plan-forecast)
- [YNAB — How to Use Targets](https://support.ynab.com/how-to-use-targets-rk5kkI9ks)
- [YNAB — Getting Out of Overdraft](https://support.ynab.com/en_us/getting-out-of-overdraft-in-ynab-a-guide-B1blkysC9)
- [YNAB — Glossary](https://support.ynab.com/en_us/ynab-glossary-a-guide-BJd80SORq)
- [Google Docs Editors Help — Budget templates](https://support.google.com/docs/answer/148833?co=GENIE.Platform%3DDesktop&hl=en)
- [Android Developers — Notification runtime permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission)
- [Android Developers — Notifications](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications)
