# Nghiên cứu requirement: quản lý vàng cá nhân tại Việt Nam

Ngày cập nhật: 27/08/2026.

## Phạm vi

Tài liệu phục vụ brainstorming requirement cho tính năng **ghi nhận và theo
dõi tài sản vàng vật chất của cá nhân** tại Việt Nam, gồm đơn vị khối lượng,
hai chiều giá, dữ liệu giao dịch tối thiểu và ranh giới sản phẩm.

Đây không phải tư vấn pháp lý, kế toán, thuế hay đầu tư. App chỉ phản ánh dữ
liệu người dùng nhập và/hoặc giá tham chiếu có nguồn; không dự báo giá, xếp
hạng cơ hội hay đề xuất mua/bán.

Repo đã có quy ước lưu ghi chú tại `research/`; tài liệu vàng sẵn có được cập
nhật tại chỗ để tránh tạo hai nguồn requirement cạnh tranh.

## Phát hiện có nguồn

### Đơn vị, quy đổi và chất lượng

- Hệ thống đơn vị đo lường hợp pháp ghi **1 lượng = 37,5 g** và **1 phân =
  0,375 g**. Nguồn: [Nghị định 134/2007/NĐ-CP](https://vbpl.vn/nghean/Pages/vbpq-print.aspx?ItemID=23103).
- SJC phân loại sản phẩm theo `1L`, `5 chỉ`, `1 chỉ`, `0,5 chỉ`, `0,3 chỉ` và
  niêm yết VND/lượng, xác nhận lượng/chỉ/phân là đơn vị người dùng thực tế gặp.
  Nguồn: [Bảng giá chính thức SJC](https://sjc.com.vn/gia-vang-online).
- Quy đổi dùng cho requirement: **1 lượng (1 cây) = 10 chỉ = 100 phân = 37,5
  g**; **1 chỉ = 10 phân = 3,75 g**; **1 phân = 0,375 g**. App nên hiển thị
  công thức quy đổi để người dùng kiểm tra.
- “Hàm lượng/tuổi vàng” là tỷ lệ phần trăm theo khối lượng vàng; Kara là số
  phần vàng trong 24 phần hợp kim; độ tinh khiết là số phần vàng trong 1.000
  phần hợp kim. Khối lượng và độ tinh khiết là hai thuộc tính khác nhau.
  Nguồn: [Thông tư 22/2013/TT-BKHCN, Điều 3](https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=45945).
- Thông tư 22 yêu cầu phép đo phù hợp và khối lượng thực không nhỏ hơn khối
  lượng công bố. Dữ liệu khối lượng vì vậy phải là số có độ chính xác đủ cao,
  không phải chuỗi mô tả. Nguồn: [Thông tư 22/2013/TT-BKHCN, Điều 4](https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=45945).

### Giá mua vào, bán ra và định giá

- Doanh nghiệp vàng phải niêm yết công khai **giá mua và giá bán**; với trang
  sức còn niêm yết khối lượng và hàm lượng. Hai chiều giá là dữ liệu khác nhau.
  Nguồn: [Nghị định 24/2012/NĐ-CP, Điều 9 và 12](https://vbpl.vn/langson/Pages/vbpq-print.aspx?ItemID=27414).
- SJC trình bày hai cột **Mua/Bán**, tách theo loại/cỡ sản phẩm và hàm lượng.
  Giá tham chiếu phải gắn với nguồn, sản phẩm, hàm lượng, địa bàn nếu có, thời
  điểm, tiền tệ và đơn vị khối lượng. Nguồn: [SJC](https://sjc.com.vn/gia-vang-online).
- Theo góc nhìn người sở hữu, **giá bán ra** tham chiếu chi phí mua mới;
  **giá mua vào** gần hơn với số tiền có thể thu khi thanh lý. Đây là suy luận
  từ vai trò hai phía trong bảng giá, không phải chuẩn kế toán do SJC công bố.
- Vì app theo dõi tài sản, định giá mặc định nên dùng **giá mua vào** của đúng
  hoặc gần đúng sản phẩm. Trước khi bán, chỉ gọi là “giá trị tham chiếu” và
  “chênh lệch/lãi lỗ chưa thực hiện”. Sau khi bán, lời/lỗ thực hiện dùng tiền
  thu ròng trừ giá vốn được phân bổ.
- Không dùng trung bình giá mua/bán làm mặc định: đó không phải mức người dùng
  thường có thể nhận khi thanh lý.

### Giao dịch mua và bán tối thiểu

- Doanh nghiệp vàng có nghĩa vụ lập, sử dụng hóa đơn/chứng từ. Nguồn:
  [Nghị định 24/2012/NĐ-CP, Điều 9 và 12](https://vbpl.vn/langson/Pages/vbpq-print.aspx?ItemID=27414).
- Từ 10/10/2025, mua/bán vàng **từ 20 triệu đồng trong ngày trở lên của một
  khách hàng** phải thanh toán qua tài khoản của khách hàng và doanh nghiệp.
  Nguồn: [Nghị định 232/2025/NĐ-CP, khoản bổ sung 10 Điều 4](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-232-2025-nd-cp-sua-doi-bo-sung-nghi-dinh-24-2012-nd-cp-ve-quan-ly-hoat-dong-kinh-doanh-vang-119250829100240562.htm).
- Quy định sửa đổi yêu cầu đơn vị kinh doanh vàng miếng lưu thông tin bên
  mua/bán, **khối lượng và giá trị giao dịch**. Đây là nghĩa vụ doanh nghiệp,
  nhưng cũng xác nhận hai trường cốt lõi. Nguồn: [Nghị định 232/2025/NĐ-CP,
  phần sửa Điều 12](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-232-2025-nd-cp-sua-doi-bo-sung-nghi-dinh-24-2012-nd-cp-ve-quan-ly-hoat-dong-kinh-doanh-vang-119250829100240562.htm).
- Lần **mua** tối thiểu: ngày/giờ, loại giao dịch, sản phẩm, khối lượng + đơn
  vị gốc, khối lượng chuẩn hóa, độ tinh khiết nếu biết, đơn giá, tiền vàng,
  phí/tiền công, tổng thực trả, nơi mua, phương thức thanh toán, chứng từ.
- Lần **bán** tối thiểu: các thuộc tính nhận diện vàng, khối lượng bán, đơn giá
  mua vào thực tế, tổng tiền, phí/khấu trừ, tiền thu ròng, nơi bán, phương thức
  thanh toán, chứng từ, và lô mua/quy tắc phân bổ giá vốn.
- Sửa/xóa giao dịch quá khứ làm đổi tồn và lời/lỗ; nên lưu thời gian tạo/cập
  nhật và dùng soft-delete/nhật ký thay vì xóa không dấu vết.

### Chỉ theo dõi tài sản, không tư vấn đầu tư

- Pháp luật công nhận quyền sở hữu vàng hợp pháp; kinh doanh vàng chịu quản lý
  và một số loại hình là kinh doanh có điều kiện. Nguồn: [Ngân hàng Nhà nước —
  Quản lý hoạt động kinh doanh vàng](https://sbv.gov.vn/vi/w/sbv239142).
- App không mua bán, môi giới, nhận giữ vàng, hứa hẹn lợi nhuận hoặc phát tín
  hiệu “nên mua/nên bán”. Giá thị trường chỉ là tham chiếu có nguồn/thời điểm.
- Không triển khai giao dịch vàng trên tài khoản trong module theo dõi. NHNN
  nêu đây là hoạt động hạn chế, cần được cho phép và cấp phép. Nguồn:
  [Ngân hàng Nhà nước](https://www.sbv.gov.vn/vi/web/sbv_portal/w/cnthwebap0116211772347).

## Hệ quả cho requirement

1. Lưu chuẩn nội bộ bằng `gram` với số thập phân chính xác; giữ cả giá trị và
   đơn vị nhập gốc (`lượng/cây`, `chỉ`, `phân`, `g`) để đối soát.
2. Tách loại sản phẩm, thương hiệu/dòng và độ tinh khiết; không suy luận 9999
   hay 24K chỉ từ tên tự do.
3. Giao dịch có loại `BUY`/`SELL`; không dùng dấu của số tiền thay nghiệp vụ.
4. Tách đơn giá, tiền vàng, phí/tiền công và dòng tiền ròng.
5. Tồn lượng = tổng mua - tổng bán; không cho bán vượt tồn nếu không có giao
   dịch điều chỉnh/số dư đầu kỳ.
6. Phải chốt cách phân bổ giá vốn khi bán: ưu tiên MVP là liên kết lô đích
   danh; phương án khác là bình quân gia quyền. Không âm thầm đổi phương pháp.
7. Giá tham chiếu là record riêng gồm chiều giá, nguồn, sản phẩm, độ tinh
   khiết, địa bàn, thời điểm, VND và đơn vị; không ghi đè giá lịch sử.
8. Định giá mặc định dùng giá **mua vào** tương ứng; fallback phải mang nhãn
   “giá thay thế” và cho nhập thủ công.
9. Hiển thị riêng giá vốn, giá trị tham chiếu, chênh lệch chưa thực hiện và
   lời/lỗ đã thực hiện.
10. Cho lưu tham chiếu hóa đơn và phương thức thanh toán; có thể nhắc ngưỡng
    20 triệu nhưng không tự tuyên bố giao dịch tuân thủ pháp luật.
11. Màn có giá/lời lỗ phải ghi “Thông tin theo dõi tài sản, không phải khuyến
    nghị đầu tư”, kèm nguồn và thời điểm cập nhật.
12. Cần số dư đầu kỳ hoặc lịch sử mua trước khi tính lời/lỗ; nếu thiếu giá vốn
    phải hiển thị “không đủ dữ liệu”, không suy đoán.

## Câu hỏi còn mở

1. MVP gồm vàng miếng/nhẫn trơn hay cả nữ trang có tiền công, đá và hao hụt?
2. Giá vốn dùng liên kết lô, FIFO hay bình quân gia quyền?
3. Phí/tiền công phân bổ thế nào khi bán một phần lô?
4. Giá MVP nhập thủ công hay lấy tự động từ nguồn chính thức?
5. Nếu nhiều nguồn/địa bàn hoặc thiếu đúng sản phẩm, quy tắc fallback là gì?
6. Có lưu ảnh hóa đơn; yêu cầu mã hóa, sao lưu và xóa dữ liệu ra sao?
7. Cho phép số dư đầu kỳ “không rõ giá vốn” và ẩn lời/lỗ không?
8. “Đổi vàng” là bán + mua có liên kết hay nghiệp vụ riêng?

## Nguồn chính

- [Nghị định 134/2007/NĐ-CP — đơn vị đo lường](https://vbpl.vn/nghean/Pages/vbpq-print.aspx?ItemID=23103)
- [Thông tư 22/2013/TT-BKHCN — đo lường/chất lượng vàng](https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=45945)
- [Nghị định 24/2012/NĐ-CP — kinh doanh vàng](https://vbpl.vn/langson/Pages/vbpq-print.aspx?ItemID=27414)
- [Nghị định 232/2025/NĐ-CP — sửa đổi Nghị định 24](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-232-2025-nd-cp-sua-doi-bo-sung-nghi-dinh-24-2012-nd-cp-ve-quan-ly-hoat-dong-kinh-doanh-vang-119250829100240562.htm)
- [NHNN — nội dung cơ bản Nghị định 232](https://www.sbv.gov.vn/vi/web/sbv_portal/w/n%E1%BB%99i-dung-c%C6%A1-b%E1%BA%A3n-c%E1%BB%A7a-ngh%E1%BB%8B-%C4%91%E1%BB%8Bnh-s%E1%BB%91-232/2025/n%C4%91-cp-v%E1%BB%81-qu%E1%BA%A3n-l%C3%BD-ho%E1%BA%A1t-%C4%91%E1%BB%99ng-kinh-doanh-v%C3%A0ng)
- [SJC — bảng giá vàng trực tuyến](https://sjc.com.vn/gia-vang-online)
