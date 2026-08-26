# Research: quản lý vàng cá nhân cho app local-first

## Kết luận nghiệp vụ cho MVP

Màn Cá nhân nên trở thành điểm vào của một module “Vàng của tôi”, tách khỏi
thu–chi thông thường. MVP tập trung vào ghi nhận thủ công các lần mua vàng và
cho phép xem lại lịch sử theo ngày, loại vàng, nơi mua và giá vốn.

Mỗi lần mua nên lưu tối thiểu: ngày mua, loại sản phẩm, khối lượng, độ tinh
khiết/tuổi vàng nếu có, đơn giá, tổng tiền, nơi mua và ghi chú. Khối lượng và
đơn giá cần là hai trường riêng để có thể tính giá vốn bình quân; không nên chỉ
lưu một chuỗi mô tả. World Gold Council mô tả giá vàng theo nhiều đơn vị khối
lượng và lưu ý rằng sản phẩm bán lẻ thường cần thông tin về khối lượng/khối
lượng vàng để người mua tính giá trị nóng chảy. [World Gold Council — Gold Price
Methodology](https://www.gold.org/data/gold-price/methodology), [World Gold
Council — RGI Principles](https://www.gold.org/download/file/16998/RGI-Principles-EN.pdf)

Không nên tự động gọi đây là “lãi/lỗ thực tế” khi chưa có giá bán. MVP chỉ nên
hiển thị “giá vốn”, “khối lượng đang nắm giữ” và, nếu người dùng nhập giá tham
chiếu thủ công, “giá trị tham chiếu”/“chênh lệch ước tính”. Giá mua/bán thực tế
có thể có premium, chi phí gia công, vận chuyển, chênh lệch mua lại và khác
biệt theo độ tinh khiết; các yếu tố này được World Gold Council nêu trong
phần thảo luận về cách hình thành giá vàng. [World Gold Council — Central Bank
Considerations When Pricing ASGM Purchases](https://www.gold.org/goldhub/research/central-bank-considerations-when-pricing-asgm-purchases)

Vì app hiện local-only và chưa có login, dữ liệu vàng thuộc cùng thiết bị và
không cần màn đăng nhập/đăng xuất. Nên ưu tiên thao tác “Thêm lần mua”, xem
chi tiết, sửa, lưu trữ (archive) thay vì xóa cứng; cách này giữ lịch sử và
phù hợp với mô hình local database/change-log đang có.

## Đề xuất mô hình dữ liệu

`gold_holdings` hoặc `gold_purchases` nên có: `id`, `purchaseDate`,
`productType`, `weightGrams`, `purity`, `unitPrice`, `totalCost`, `seller`,
`note`, `createdAt`, `updatedAt`, `deletedAt`, `revision`, `originDeviceId`.

Các loại sản phẩm ban đầu có thể gồm `nhan-tron`, `vang-mieng`, `trang-suc`,
`khac`. Để tránh làm sai dữ liệu, không tự suy luận độ tinh khiết từ tên sản
phẩm; cho phép bỏ trống purity và hiển thị “Chưa nhập”. Nếu có dữ liệu giá
tham chiếu sau này, cần lưu rõ nguồn, thời điểm, đơn vị tiền tệ và đơn vị khối
lượng. WGC cũng lưu ý giá spot có thể được quy đổi tiền tệ và hiển thị theo
nhiều đơn vị/truy vấn tần suất, nên không nên trộn giá spot với giá mua tại
tiệm trong cùng một trường. [World Gold Council — Gold Price Methodology](https://www.gold.org/data/gold-price/methodology)

## Đề xuất luồng UI

1. Cá nhân: header tên người dùng và nhóm cài đặt hiện có; thêm card “Vàng của
   tôi” với tổng khối lượng, tổng giá vốn và CTA “Thêm lần mua”.
2. Danh sách lịch sử: nhóm theo tháng hoặc ngày, mỗi row hiển thị loại vàng,
   ngày mua, khối lượng và tổng tiền; có filter loại vàng và khoảng thời gian.
3. Thêm/sửa lần mua: ngày mua, loại vàng, khối lượng (gram/chỉ/lượng), giá
   mua, tổng tiền tự tính nhưng cho phép kiểm tra/chỉnh nếu hóa đơn có phí,
   nơi mua và ghi chú.
4. Chi tiết: breakdown giá vốn, dữ liệu đầu vào và hành động sửa/lưu trữ.

## Không đưa vào MVP

- Đồng bộ giá vàng online hoặc tự động lấy giá theo tiệm.
- Kết luận lời/lỗ chính thức, thuế/phí bán, portfolio đa tài sản.
- Tài khoản người dùng, đăng nhập, chia sẻ dữ liệu.
- Nhập hóa đơn/ảnh OCR và giao dịch bán/đổi vàng; có thể mở rộng sau khi mô
  hình mua thủ công ổn định.

## Gợi ý UI/accessibility

Giữ visual system hiện tại: nền sáng, card bo góc, Manrope, icon Lucide và
màu semantic. Card vàng nên dùng màu nhấn vàng có contrast đủ, không dùng màu
vàng để truyền đạt duy nhất trạng thái; số liệu vẫn cần label rõ. Các nút icon
phải có accessible label và vùng chạm tối thiểu 44pt; form cần label hiển thị,
helper/error gần trường. Đây là các ràng buộc đã được áp dụng trong design
system native hiện tại.
