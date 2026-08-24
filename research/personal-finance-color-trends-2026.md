# Nghiên cứu màu sắc cho app quản lý tài chính cá nhân

**Ngày:** 2026-08-24  
**Phạm vi:** mobile-first, React Native/Expo, app cá nhân có dashboard, ngân sách, giao dịch và biểu đồ.  
**Lưu ý:** “xu hướng” dưới đây là tổng hợp từ sản phẩm và guideline chính thống; không phải khảo sát định lượng toàn thị trường.

## Kết luận nhanh

Xu hướng phù hợp nhất hiện nay không phải là dùng thật nhiều màu, mà là:

1. Nền trung tính và bề mặt phân cấp rõ.
2. Một màu thương hiệu chính có sắc xanh/indigo để tạo cảm giác tin cậy nhưng vẫn hiện đại.
3. Màu semantic riêng cho trạng thái: positive, warning, danger, info.
4. Accent sáng như lavender, lime hoặc coral chỉ dùng để tạo điểm nhấn.
5. Light/dark mode dùng cùng semantic token, không đảo màu cơ học.

## Tín hiệu từ các sản phẩm hiện tại

### Copilot Money: premium, calm, data-first

Copilot tự định vị là app premium với giao diện “polished” và “deliberately calm”, đặt dữ liệu tài chính ở trung tâm. Copilot cũng có dark mode, accessible colors và dùng green/orange/red để biểu diễn tiến độ chi tiêu so với mức lý tưởng. Điều này ủng hộ hướng nền trung tính, typography rõ, accent tiết chế và semantic colors nhất quán.

Nguồn: [Copilot Money FAQ](https://www.copilot.money/faq), [Dashboard line colors](https://help.copilot.money/en/articles/10309907-dashboard-line-colors), [Settings overview](https://help.copilot.money/en/articles/11062072-settings-overview).

### Monarch: warmth và approachability

Monarch mô tả brand refresh của họ là tăng contrast nhưng vẫn giữ một diện mạo vibrant, warm và approachable. Đây là tín hiệu cho thấy app tài chính có thể thân thiện hơn màu xanh ngân hàng truyền thống, miễn là hierarchy và contrast vẫn rõ.

Nguồn: [Monarch’s refreshed look](https://www.monarch.com/monarch-brand-refresh).

### YNAB: màu là ngôn ngữ trạng thái

YNAB dùng green cho trạng thái đang đi đúng hướng, yellow cho thiếu/ cần chú ý, red cho overspending và gray cho trạng thái bằng 0 hoặc trung tính. Họ kết hợp màu với icon và text, thay vì để màu là tín hiệu duy nhất.

Nguồn: [YNAB colors and icons in the plan](https://support.ynab.com/en_us/colors-and-icons-in-your-plan-HJQv_XHko), [YNAB account register colors](https://support.ynab.com/en_us/colors-and-icons-in-your-account-register-Hk_w6UBki).

## Nguyên tắc nền tảng cần giữ

- Apple khuyến nghị dùng màu nhất quán cho cùng một ý nghĩa, hỗ trợ light/dark/increased-contrast và không dùng màu đơn độc để truyền đạt trạng thái. Nên đặt tên token theo semantic role thay vì tên màu hình thức.
- Apple cũng khuyến nghị màu biểu đồ phải có mô tả, legend hoặc nhãn thay thế; chart không nên bắt người dùng chỉ dựa vào màu để hiểu dữ liệu.
- WCAG/Material khuyến nghị contrast tối thiểu 4.5:1 cho text nhỏ và 3:1 cho text lớn. Các màu accent sáng không nên dùng trực tiếp cho text nhỏ trên nền trắng.

Nguồn: [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color), [Apple HIG — Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [Material accessibility](https://m1.material.io/usability/accessibility.html), [Material Design 3](https://m3.material.io/).

## Ba palette đáng cân nhắc

### Khuyến nghị: Premium Indigo

Phù hợp với hướng Bento Premium hiện tại: hiện đại, tin cậy, có tính sản phẩm cao và không quá giống app ngân hàng.

```text
brand.primary      #536DFF   dùng cho hero, active state, CTA lớn
brand.secondary    #7C5CFC   dùng cho gradient/accent có kiểm soát
brand.soft         #E9EDFF   icon background, selected surface
surface.canvas     #EEF1F7   nền toàn app
surface.primary    #FFFFFF   card chính
content.primary    #17213B   text và số liệu chính
content.secondary  #63718E   label phụ
status.positive    #218B6C   đang tốt / tiết kiệm / thu vào
status.warning     #B86800   gần vượt ngân sách
status.negative    #C0393B   vượt ngân sách / lỗi
status.info        #2E64C5   cần review / thông tin
```

### Phương án B: Calm Teal

Phù hợp nếu muốn cảm giác an toàn, bền vững, bớt “tech startup”. Dùng teal làm brand thay vì xanh dương, kết hợp cream hoặc warm gray để tạo chất premium.

```text
brand.primary      #087F73
brand.secondary    #2AA889
brand.soft         #DDF4EE
surface.canvas     #F4F7F4
surface.primary    #FFFFFF
content.primary    #16332E
content.secondary  #667873
status.positive    #218B6C
status.warning     #A86400
status.negative    #B23A48
status.info        #2867A8
```

### Phương án C: Graphite + Lime

Phù hợp power-user và dark-first. Graphite tạo nền sang, lime tạo điểm nhấn mạnh cho số liệu/CTA. Cần kiểm soát saturation để tránh cảm giác crypto trading.

```text
brand.primary      #B7F34A
brand.secondary    #78D6B0
surface.canvas     #0D1216
surface.primary    #151E22
surface.raised     #202D32
content.primary    #E9F2EF
content.secondary  #AAB9B4
status.positive    #B7F34A
status.warning     #F2B84B
status.negative    #FF7B7B
status.info        #8FB8FF
```

## Quyết định đề xuất cho project

Chọn **Premium Indigo** làm master palette cho `Money`, vì nó nối tiếp variant Bento Premium, giữ được cảm giác hiện đại và cao cấp, đồng thời dễ mở rộng sang dark mode. Teal có thể là theme phụ hoặc màu cho mục tiêu tiết kiệm; lime chỉ nên dùng trong một theme dark/power-user.

Quan trọng: không dùng `green = income` và `red = expense` một cách tuyệt đối. Income/expense nên được phân biệt bằng sign, label, icon và layout; green/red dành cho trạng thái sức khỏe ngân sách, cảnh báo và lỗi. Điều này giảm rủi ro người dùng hiểu “chi tiêu” là lỗi chỉ vì màu đỏ.

## Token cần đưa vào design system khi coding

```ts
type SemanticColor =
  | 'brand.primary'
  | 'brand.secondary'
  | 'surface.canvas'
  | 'surface.primary'
  | 'surface.raised'
  | 'content.primary'
  | 'content.secondary'
  | 'status.positive'
  | 'status.warning'
  | 'status.negative'
  | 'status.info';
```

Mỗi token nên có biến thể `light`, `dark` và `highContrast`. Các chart series cần thêm pattern/label/legend để không phụ thuộc vào màu. Việc kiểm tra contrast cần được tự động hóa khi palette được đưa vào component thật.
