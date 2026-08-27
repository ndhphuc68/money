# Nghiên cứu theo dõi subscription và khoản thanh toán định kỳ

> Ngày khảo sát: 2026-08-28  
> Phạm vi: nghiên cứu sản phẩm, chưa phải thiết kế hay cam kết triển khai.  
> Bối cảnh repo: ứng dụng hiện ưu tiên nhập giao dịch thủ công, local-first/offline; kết nối ngân hàng nằm ở giai đoạn sau.

## Cách đọc tài liệu

- **Bằng chứng** là hành vi được mô tả trong help/API chính thức của sản phẩm hoặc mạng thanh toán.
- **Suy luận/khuyến nghị** là kết luận dành cho sản phẩm trong repo này, không phải tuyên bố rằng nguồn đã yêu cầu cách làm đó.
- “Subscription” và “bill” có thể đều định kỳ nhưng không đồng nhất: subscription thường liên quan quyền truy cập/auto-renew; bill có thể là số tiền biến đổi, thanh toán thủ công, khoản vay hoặc thẻ.

## Tóm tắt phát hiện

1. Các sản phẩm mạnh không xem phát hiện tự động là chân lý: Monarch đưa ứng viên qua bước người dùng duyệt; Rocket Money và Copilot cho phép thêm, gỡ và liên kết giao dịch thủ công.
2. Một khoản định kỳ cần cả **lịch dự kiến** và **quy tắc khớp giao dịch**. Tên merchant, khoảng số tiền, khoảng ngày và tần suất đều có thể biến động.
3. Vòng đời thực tế rộng hơn `active/canceled`: upcoming, paid đúng dự kiến, paid lệch số tiền, missed, inactive, paused, archived/canceled, trial, grace period/account hold đều có ý nghĩa khác nhau.
4. “Đã hủy” không đồng nghĩa “hết quyền truy cập ngay” và cũng không chứng minh từ dữ liệu ngân hàng rằng merchant đã nhận yêu cầu hủy.
5. Cần giữ liên kết nhiều-nhiều hoặc ít nhất liên kết có thể sửa giữa lịch định kỳ và giao dịch; không nên xóa giao dịch lịch sử khi xóa/ẩn lịch.
6. Merchant giống nhau là nguồn nhập nhằng lớn. Hai subscription có thể cùng descriptor, ngày và số tiền; thuật toán không thể luôn phân biệt đúng.
7. Nhắc trial hết hạn, khoản sắp thu, khoản bị bỏ lỡ và biến động số tiền đem lại giá trị khác nhau, nên cần loại cảnh báo và độ chắc chắn riêng.
8. Trong bối cảnh repo chưa nối ngân hàng, phiên bản đầu hợp lý hơn nếu là lịch do người dùng tạo từ giao dịch đã có hoặc nhập tay; tự động phát hiện chỉ nên là gợi ý khi dữ liệu import/sync đủ dày.

## 1. Phát hiện khoản định kỳ

### Bằng chứng

- Rocket Money tự động phát hiện subscription bằng cách phân tích giao dịch từ tài khoản ngân hàng và thẻ đã kết nối. Nếu thanh toán bằng séc hoặc tài khoản chưa kết nối, người dùng phải thêm thủ công. Khoản không có payment được phát hiện trong tháng trước được đưa vào danh sách `Inactive` ([Rocket Money — Managing your bills and subscriptions](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions)).
- Monarch quét giao dịch mới mỗi lần tài khoản đồng bộ và “attempt to detect” khoản định kỳ. Ứng viên merchant/account được trình bày trong `Recurring Review` để người dùng chấp thuận, từ chối hoặc sửa amount, frequency, date trước khi trở thành khoản định kỳ ([Monarch — Tracking Recurring Expenses and Bills](https://help.monarchmoney.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills)).
- Copilot bắt đầu từ một hoặc nhiều giao dịch đã có, ước lượng tần suất rồi yêu cầu người dùng xác nhận. Bộ lọc có thể gồm phần tên giao dịch, khoảng số tiền, một hay nhiều ngày lân cận và tần suất ([Copilot — Creating Recurrings](https://help.copilot.money/en/articles/3760068-creating-recurrings), [Copilot — Optimizing Recurrings](https://help.copilot.money/en/articles/3783499-optimizing-recurrings)).
- Dữ liệu thanh toán phía merchant/card có thể mang chỉ báo recurring: Visa Acceptance mô tả giao dịch đầu là customer-initiated, các lần sau là merchant-initiated và dùng `commerceIndicator: recurring` cùng tham chiếu giao dịch trước. Đây là dữ liệu ở luồng xử lý thanh toán, không chứng minh rằng một ứng dụng tài chính tiêu dùng luôn nhận được các trường này từ bank feed ([Visa Acceptance — Merchant-Initiated Recurring Payments](https://developer.visaacceptance.com/docs/cybs/en-us/credentials/developer/vantivcnp/rest/credentials/credentials-recur-intro/credentials-recur-mit-pan-intro.html)).

### Suy luận/khuyến nghị

- Tách `detected candidate` khỏi `confirmed recurring`. Mỗi ứng viên nên có độ tin cậy và lý do gợi ý (ví dụ: 3 giao dịch, cách nhau khoảng 30 ngày, descriptor tương tự).
- Với dữ liệu nhập tay hiện tại, không nên hứa “tự động phát hiện” từ một giao dịch. Có thể cho phép “Đặt là định kỳ” từ giao dịch, rồi dùng giao dịch đó làm mẫu.
- Khi có import/sync, phát hiện nên ưu tiên chuỗi ít nhất 2–3 giao dịch và cho người dùng duyệt; không nên tự động ảnh hưởng ngân sách hoặc tạo cảnh báo mạnh khi chưa xác nhận.
- Chỉ báo recurring từ mạng thẻ là tín hiệu bổ sung nếu nhà cung cấp dữ liệu thực sự truyền qua; không nên coi nó là dependency của tính năng.

## 2. Dữ liệu người dùng nhập và sửa

### Bằng chứng

- Rocket Money cho nhập/chọn tên dịch vụ, tìm và chọn các giao dịch liên quan, sửa ngày đến hạn kế tiếp và số tiền ([Rocket Money — Managing your bills and subscriptions](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions)).
- Monarch cho thêm merchant thủ công và sửa recurring amount, frequency, date bất cứ lúc nào ([Monarch — Tracking Recurring Expenses and Bills](https://help.monarchmoney.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills)).
- Copilot cho sửa emoji, tên, category, filter settings và tập giao dịch; khi đổi bộ lọc, người dùng chọn áp dụng chỉ cho tương lai hay cả lịch sử ([Copilot — Editing Recurrings](https://help.copilot.money/en/articles/3783837-editing-recurrings)).
- YNAB dùng `Scheduled Transactions`: người dùng tạo giao dịch tương lai/lặp ngay trong account register; tài liệu chính thức định vị đây là cách lập kế hoạch và xem chi phí sắp tới ([YNAB — Scheduled Transactions](https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9)).

### Suy luận/khuyến nghị

- Dữ liệu cốt lõi nên gồm: tên hiển thị, merchant/payee matcher, account dự kiến, category, amount kiểu `fixed` hoặc `range/estimate`, currency, frequency, ngày/khung ngày dự kiến, ngày bắt đầu, ngày kết thúc tùy chọn, trạng thái và nguồn tạo (`manual/detected`).
- Cần phân biệt sửa **lịch từ nay về sau** với tái phân loại lịch sử. Mặc định không nên âm thầm thay đổi liên kết cũ.
- Cho phép tạo lịch chưa có giao dịch là hữu ích với tiền thuê nhà, trial sắp thu hoặc hóa đơn mới; đây là điểm Copilot hiện hạn chế vì FAQ nói recurring chỉ tạo được từ giao dịch đã tồn tại ([Copilot — Recurrings FAQ](https://help.copilot.money/en/articles/10244751-recurrings-faq)).

## 3. Trạng thái và vòng đời

### Bằng chứng

- Monarch hiển thị `Active` và `Canceled`; từng kỳ có thể là upcoming, paid as expected, paid at a different amount, hoặc missed khi quá hạn mà chưa có giao dịch khớp ([Monarch — Tracking Recurring Expenses and Bills](https://help.monarchmoney.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills)).
- Rocket Money chuyển khoản không có payment được phát hiện trong tháng trước sang `Inactive`, và chuyển lại `Active` khi phát hiện payment mới ([Rocket Money — Missing subscriptions](https://help.rocketmoney.com/en/articles/934383-missing-subscriptions)).
- Copilot có `Paused` cho gián đoạn tạm thời và tự active lại khi nhận payment mới; `Archived` dành cho khoản đã loại vĩnh viễn khỏi expected spend nhưng giữ lịch sử; xóa recurring không xóa transaction nhưng xóa vĩnh viễn recurring history ([Copilot — Pausing and Archiving Recurrings](https://help.copilot.money/en/articles/3983286-pausing-and-archiving-recurrings), [Copilot — Editing Recurrings](https://help.copilot.money/en/articles/3783837-editing-recurrings)).
- Google Play cho thấy vòng đời subscription phía nhà cung cấp phức tạp hơn giao dịch ngân hàng: trial chuyển sang billing; payment thất bại có thể vào grace period, sau đó account hold và cuối cùng tự hủy nếu không khắc phục ([Google Play — Subscribe to services or content](https://support.google.com/googleplay/answer/2476088)).

### Suy luận/khuyến nghị

- Tách trạng thái của **series** (`candidate`, `active`, `paused`, `canceled/archived`) khỏi trạng thái của **occurrence** (`upcoming`, `matched`, `matched_changed`, `missed`, `skipped`).
- `Inactive` do không thấy giao dịch không nên đồng nghĩa `Canceled`; đó chỉ là suy đoán từ dữ liệu thiếu.
- Có thể lưu `canceledAt` và `accessEndsAt/expectedFinalDate` riêng. Người dùng có thể hủy auto-renew nhưng dịch vụ vẫn hoạt động đến hết kỳ.

## 4. Lịch dự kiến, số tiền/ngày biến động và khoản bỏ lỡ

### Bằng chứng

- Rocket Money có Upcoming/All/Calendar; Upcoming sắp theo ngày thu dự kiến và cho thấy hai tuần tới ([Rocket Money — Where can I view my subscriptions and bills?](https://help.rocketmoney.com/en/articles/3117398-where-can-i-view-my-subscriptions-and-bills)).
- Monarch cho di chuyển qua tháng quá khứ/tương lai. Màu vàng là đã trả nhưng khác số tiền dự kiến; màu đỏ là quá ngày mà chưa có giao dịch khớp. Với tần suất hai lần/tháng, Monarch cố định ngày 1 và 15 rồi đưa về ngày làm việc trước nếu rơi vào cuối tuần ([Monarch — Tracking Recurring Expenses and Bills](https://help.monarchmoney.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills)).
- Copilot khuyến nghị match phần tên ổn định, cho phép nhiều ngày lân cận hoặc bất kỳ ngày nào trong tháng, và khoảng amount để xử lý charge biến động hoặc nhiều khoản cùng merchant ([Copilot — Optimizing Recurrings](https://help.copilot.money/en/articles/3783499-optimizing-recurrings)).
- YNAB tự động match giao dịch ngân hàng nhập về với giao dịch nhập tay khi **đúng số tiền** và trong vòng 10 ngày; người dùng cũng có thể match thủ công ([YNAB — Linked Accounts](https://support.ynab.com/en_us/linking-an-account-in-ynab-a-guide-ryZQQFMJo)).

### Suy luận/khuyến nghị

- Không mô hình hóa ngày dự kiến như một ngày tuyệt đối duy nhất. Cần `expectedDate` cộng tolerance hoặc tập ngày hợp lệ; xử lý cuối tuần/lễ nên là policy hiển thị, không tự đổi dữ liệu lịch sử.
- Với amount, lưu `expectedAmount` và tolerance/range; khi match khác mức dự kiến, giữ amount thực tế và đánh dấu biến động thay vì sửa baseline ngay.
- Chỉ đánh dấu `missed` sau cửa sổ trễ (grace window), vì bank feed có độ trễ và ngày posting khác ngày thanh toán. Trong app nhập tay, nên cho `Bỏ qua kỳ này` để tránh cảnh báo dai dẳng.
- Biến động lặp lại qua vài kỳ có thể tạo gợi ý cập nhật baseline; không nên tự cập nhật sau một charge do prorate, thuế hoặc khuyến mãi hết hạn.

## 5. Nhắc nhở và trial

### Bằng chứng

- Monarch gửi thông báo khi có ứng viên recurring cần review; loại email/push có thể chỉnh trong Settings. Với Bill Sync, Monarch còn báo statement mới và nhắc vài ngày trước hạn ([Monarch — Tracking Recurring Expenses and Bills](https://help.monarchmoney.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills), [Monarch — Getting Started with Bill Sync](https://help.monarchmoney.com/hc/en-us/articles/29446697869076-Getting-Started-with-Bill-Sync)).
- Google Play gửi email khi trial sắp kết thúc; hết trial sẽ tự thu theo điều khoản, và người dùng phải hủy trước khi trial hết để tránh charge ([Google Play — Subscribe to services or content](https://support.google.com/googleplay/answer/2476088)).
- Apple khuyến nghị hủy trial miễn phí/giảm giá ít nhất 24 giờ trước khi trial kết thúc ([Apple — Cancel a subscription](https://support.apple.com/en-us/118428)).

### Suy luận/khuyến nghị

- Các loại nhắc nên tách riêng: `trial ending`, `upcoming charge`, `amount changed`, `payment not observed/missed`, `candidate needs review`.
- Trial cần trường `trialEndsAt`, `firstChargeAt`, `firstChargeAmount` và trạng thái auto-renew dự kiến. Nên cho nhắc mặc định trước 3 ngày và/hoặc 24 giờ, nhưng để người dùng cấu hình.
- Với app local-first, nhắc local notification có thể hoạt động offline; cần nói rõ rằng app không thể xác nhận merchant đã hủy hay payment đã thất bại nếu chưa có giao dịch/dữ liệu nhà cung cấp.

## 6. Hủy, đã hủy và quyền truy cập còn lại

### Bằng chứng

- Rocket Money có Cancellation Assistant cho thành viên Premium và chỉ với merchant được hỗ trợ; nếu không có tùy chọn Cancel, app đưa hướng dẫn để người dùng tự hủy ([Rocket Money — How do I cancel a subscription?](https://help.rocketmoney.com/en/articles/934402-how-do-i-cancel-a-subscription-on-rocket-money)).
- Apple cho biết nếu không có nút Cancel hoặc hiện ngày hết hạn màu đỏ thì subscription đã được hủy. Nếu charge không phải do Apple, người dùng phải xem statement để xác định và liên hệ công ty thực sự thu tiền ([Apple — Cancel a subscription](https://support.apple.com/en-us/118428)).
- Google Play: hủy thường dừng gia hạn và quyền truy cập kéo dài đến cuối kỳ hiện tại; một payment plan có thể vẫn còn nghĩa vụ trả các kỳ đã cam kết dù đã tắt auto-renew ([Google Play — Cancel, pause, or change a subscription](https://support.google.com/googleplay/answer/7018481)).

### Suy luận/khuyến nghị

- Trong phiên bản chỉ theo dõi, hành động nên là `Đánh dấu đã hủy` kèm ngày và ghi chú/link hướng dẫn, không dùng từ ngữ ngụ ý app đã gửi yêu cầu hủy.
- Nên hiển thị riêng: “đã yêu cầu hủy”, “đã hủy theo người dùng”, “dự kiến hết quyền truy cập”, và “có charge sau khi hủy”.
- Nếu phát hiện charge sau `canceledAt`, tạo cảnh báo để người dùng kiểm tra; không tự active lại nếu người dùng đã xác nhận hủy, vì có thể là charge cuối kỳ hoặc tranh chấp.

## 7. Liên kết giao dịch và merchant nhập nhằng

### Bằng chứng

- Rocket Money cho tìm và chọn transaction liên quan khi thêm thủ công ([Rocket Money — Managing your bills and subscriptions](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions)).
- Copilot cho thêm/gỡ transaction khỏi recurring và thay đổi filter cho tương lai hoặc cả quá khứ. Xóa recurring không tác động transaction ([Copilot — Editing Recurrings](https://help.copilot.money/en/articles/3783837-editing-recurrings)).
- Monarch chỉ cho một recurring transaction trên mỗi merchant; khi có hai subscription cùng merchant, người dùng phải tạo merchant profile khác tên. Nếu descriptor và amount hoàn toàn giống nhau, Monarch thừa nhận không có giải pháp rule-based để tách ([Monarch — Tracking Recurring Expenses and Bills](https://help.monarchmoney.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills)).
- Copilot cho tạo nhiều recurring cùng merchant, kể cả cùng ngày và amount, nhưng setup phải giữ một payment mỗi tháng cho từng series; đây vẫn là cấu hình do người dùng hướng dẫn, không phải phân biệt chắc chắn từ dữ liệu ([Copilot — Multiple Recurrings for the Same Merchant](https://help.copilot.money/en/articles/5327632-multiple-recurrings-for-the-same-merchant)).

### Suy luận/khuyến nghị

- Lưu liên kết explicit `recurring occurrence ↔ transaction`, có nguồn (`auto/manual`) và khả năng unlink/relink.
- Không gắn recurring trực tiếp một-một với merchant. Một merchant có thể có nhiều gói; một subscription có thể đổi descriptor hoặc account thanh toán.
- Khi nhiều candidate cùng điểm match, yêu cầu người dùng chọn thay vì gán tùy ý. Các khoản giống hệt nhau có thể không giải được chỉ bằng bank transaction data.

## 8. Giới hạn và rủi ro

### Bằng chứng

- Rocket Money nêu rõ khoản có thể bị thiếu nếu account thanh toán chưa liên kết, bank không được hỗ trợ, transaction chưa xuất hiện hoặc có processing delay ([Rocket Money — Missing subscriptions](https://help.rocketmoney.com/en/articles/934383-missing-subscriptions)).
- Google Play cho thấy uninstall app không hủy subscription; trạng thái dịch vụ, payment retry và account hold không thể suy ra đầy đủ chỉ từ việc có/không có một giao dịch ([Google Play — Fix problems with subscriptions](https://support.google.com/googleplay/answer/9818348)).
- Apple yêu cầu kiểm tra receipt/statement để xác định đúng billing company; tên nền tảng hoặc app không nhất thiết là bên trực tiếp thu tiền ([Apple — Cancel a subscription](https://support.apple.com/en-us/118428)).

### Suy luận/khuyến nghị

- False positive: lặp ngẫu nhiên, mua nhiều lần cùng merchant, installment hoặc transfer bị hiểu là subscription.
- False negative: đổi tên descriptor, đổi account, charge gộp, annual chưa đủ lịch sử, payment bằng tiền mặt/chuyển khoản ngoài app, hoặc dữ liệu import thiếu.
- Sai `missed`: ngày posting trễ, cuối tuần/lễ, payment pending, đổi chu kỳ, hoặc người dùng trả sớm.
- Sai amount change: tỷ giá, thuế, phí, prorate, khuyến mãi hết hạn, usage-based bill.
- Rủi ro UX: gom bill, installment, subscription và income vào một khái niệm sẽ làm trạng thái “hủy”, “missed” và “paid” mơ hồ.
- Rủi ro riêng tư: phân tích merchant và lịch chi tiêu tạo dữ liệu nhạy cảm. Thiết kế sau này cần giữ nguyên tắc local-first, giải thích nguồn suy luận và cho xóa/ẩn lịch mà không phá giao dịch.

## Phạm vi đề xuất cho bước sản phẩm kế tiếp

Đây là khuyến nghị nghiên cứu, chưa phải thiết kế:

1. Trước mắt hỗ trợ lịch định kỳ do người dùng tạo thủ công hoặc từ một giao dịch có sẵn.
2. Có calendar/list của occurrence, amount estimate, ngày/khung ngày, frequency, category/account và nhắc local.
3. Cho `pause`, `archive/canceled`, `skip occurrence`, và liên kết/unlink giao dịch thủ công.
4. Khi có CSV/import, thêm candidate detection có review; chỉ sau khi có bank sync mới đánh giá tín hiệu pending/card recurring indicator.
5. Không đưa cancellation concierge vào phạm vi: thị trường, pháp lý, xác thực merchant và hỗ trợ vận hành khác hẳn tracking.

## Điểm chưa chắc chắn cần nghiên cứu tiếp

- Các help center không công bố thuật toán/scoring cụ thể của Rocket Money, Monarch hay Copilot; chưa biết số kỳ tối thiểu, tolerance mặc định hoặc cách xử lý seasonality.
- Chưa xác minh bank feed/API phổ biến tại Việt Nam có truyền merchant ID, card-network recurring indicator, pending/posted linkage hay chỉ có mô tả sao kê.
- Chưa có bằng chứng người dùng Việt Nam ưu tiên subscription số, hóa đơn điện/nước biến đổi, trả góp hay lịch chuyển khoản thủ công; cần phỏng vấn/đo dữ liệu trước khi chốt phạm vi.
- Chưa rõ quy tắc ngày nghỉ Việt Nam và cách ngân hàng/merchant dời ngày charge; không nên sao chép policy “ngày làm việc trước” của Monarch.
- Không thể suy ra chắc chắn trạng thái trial, grace period, account hold, quyền truy cập hoặc xác nhận hủy chỉ từ giao dịch tài chính; các trạng thái này cần người dùng nhập hoặc tích hợp trực tiếp với provider.
- Tài liệu sản phẩm có thể thay đổi; ngày cập nhật và chi tiết theo nền tảng/gói trả phí không đồng nhất.

## Danh sách nguồn sơ cấp

- Rocket Money Help Center:
  - [Managing your bills and subscriptions](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions)
  - [Missing subscriptions](https://help.rocketmoney.com/en/articles/934383-missing-subscriptions)
  - [Where can I view my subscriptions and bills?](https://help.rocketmoney.com/en/articles/3117398-where-can-i-view-my-subscriptions-and-bills)
  - [How do I cancel a subscription?](https://help.rocketmoney.com/en/articles/934402-how-do-i-cancel-a-subscription-on-rocket-money)
- Monarch Money Help:
  - [Tracking Recurring Expenses and Bills](https://help.monarchmoney.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills)
  - [Getting Started with Bill Sync](https://help.monarchmoney.com/hc/en-us/articles/29446697869076-Getting-Started-with-Bill-Sync)
- Copilot Money Help Center:
  - [Creating Recurrings](https://help.copilot.money/en/articles/3760068-creating-recurrings)
  - [Editing Recurrings](https://help.copilot.money/en/articles/3783837-editing-recurrings)
  - [Optimizing Recurrings](https://help.copilot.money/en/articles/3783499-optimizing-recurrings)
  - [Pausing and Archiving Recurrings](https://help.copilot.money/en/articles/3983286-pausing-and-archiving-recurrings)
  - [Recurrings FAQ](https://help.copilot.money/en/articles/10244751-recurrings-faq)
  - [Multiple Recurrings for the Same Merchant](https://help.copilot.money/en/articles/5327632-multiple-recurrings-for-the-same-merchant)
- YNAB Support:
  - [Scheduled Transactions](https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9)
  - [Linked Accounts](https://support.ynab.com/en_us/linking-an-account-in-ynab-a-guide-ryZQQFMJo)
- Apple Support:
  - [Cancel a subscription](https://support.apple.com/en-us/118428)
- Google Play Help:
  - [Subscribe to services or content](https://support.google.com/googleplay/answer/2476088)
  - [Cancel, pause, or change a subscription](https://support.google.com/googleplay/answer/7018481)
  - [Fix problems with subscriptions](https://support.google.com/googleplay/answer/9818348)
- Visa Acceptance Solutions:
  - [Merchant-Initiated Recurring Payments](https://developer.visaacceptance.com/docs/cybs/en-us/credentials/developer/vantivcnp/rest/credentials/credentials-recur-intro/credentials-recur-mit-pan-intro.html)
