# Thiết kế MVP quản lý nhẫn trơn 9999

## Trạng thái

- Đã duyệt thiết kế trong phiên trao đổi ngày 2026-08-27.
- Đây là spec sản phẩm và kiến trúc; chưa bao gồm implementation plan.
- Phạm vi MVP: một cá nhân, nhẫn trơn 9999 vật chất, dữ liệu local-first và tiền tệ VNĐ.
- Giá thị trường là dữ liệu tham chiếu, không phải báo giá cam kết hoặc khuyến nghị đầu tư.

## Mục tiêu

Cho phép người dùng ghi lại từng lần mua nhẫn trơn 9999, biết lượng vàng và giá vốn còn nắm giữ, ước tính lời/lỗ theo giá mua vào hiện tại, ghi nhận việc bán từ các lô mua cụ thể và quản lý đầy đủ lịch sử thêm, sửa, đưa vào thùng rác, khôi phục và xóa vĩnh viễn.

## Phạm vi sản phẩm

MVP chỉ hỗ trợ nhẫn trơn 9999. Không dùng cùng mô hình giá để định giá vàng miếng, vàng trang sức, đá quý hoặc sản phẩm có độ tinh khiết khác. Mỗi giao dịch sử dụng VNĐ và một trong các đơn vị khối lượng: lượng/cây, chỉ, phân hoặc gram.

Quy đổi chuẩn:

```text
1 lượng (1 cây) = 10 chỉ = 100 phân = 37,5 gram
1 chỉ = 10 phân = 3,75 gram
1 phân = 0,375 gram
```

Hệ thống giữ cả số lượng và đơn vị người dùng nhập để đối soát, đồng thời chuẩn hóa khối lượng nội bộ về gram bằng kiểu số thập phân chính xác.

## Không thuộc MVP

- Vàng miếng, vàng trang sức, đá quý hoặc vàng không phải nhẫn trơn 9999.
- Mua bán vàng trực tiếp trong ứng dụng.
- Dự báo giá, tín hiệu hoặc khuyến nghị mua/bán.
- Phí, tiền công, hao hụt, thuế hoặc chi phí thanh lý.
- OCR hóa đơn và lưu ảnh chứng từ.
- Nhập dữ liệu từ bảng tính hoặc kết nối tài khoản của doanh nghiệp vàng.
- Tự động xử lý nghiệp vụ đổi vàng; nếu phát sinh, người dùng ghi một giao dịch bán và một giao dịch mua riêng.

## Khái niệm nghiệp vụ

### Lô mua

Mỗi giao dịch mua tạo một lô riêng. Lô lưu:

- ngày và giờ mua;
- thương hiệu hoặc nơi mua;
- khối lượng và đơn vị nhập gốc;
- khối lượng chuẩn hóa theo gram;
- đơn giá mua theo đơn vị nhập;
- tổng tiền mua;
- ghi chú tùy chọn;
- metadata local-first/sync theo convention hiện tại.

Giá vốn ban đầu của lô bằng tổng tiền mua. Do MVP không tính phí và tiền công, mọi kết quả lời/lỗ phải kèm nhãn `Chưa bao gồm phí và tiền công`.

### Giao dịch bán

Mỗi giao dịch bán liên kết đích danh tới một hoặc nhiều lô mua. Với mỗi lô, giao dịch lưu khối lượng được lấy từ lô đó. Giao dịch bán còn lưu:

- ngày và giờ bán;
- nơi bán;
- đơn giá bán thực tế;
- tổng tiền thực nhận;
- ghi chú tùy chọn;
- metadata local-first/sync.

Không dùng FIFO hoặc bình quân gia quyền để tự chọn lô.

### Giá tham chiếu

Giá tham chiếu là record riêng, không ghi đè giá mua hoặc giá bán lịch sử. Record lưu tối thiểu:

- nguồn và thương hiệu;
- tên/dòng sản phẩm nhẫn trơn 9999;
- chiều giá `BUY_IN`;
- giá trị và đơn vị niêm yết;
- địa bàn nếu nguồn phân biệt theo địa bàn;
- thời điểm giá có hiệu lực hoặc được công bố;
- thời điểm hệ thống lấy dữ liệu;
- trạng thái giá chính xác hoặc giá thay thế.

## Nguồn giá và quy tắc fallback

Với từng lô còn nắm giữ, hệ thống ưu tiên giá mua vào online của đúng thương hiệu hoặc nơi đã mua và đúng sản phẩm nhẫn trơn 9999. Giá mua vào được dùng vì gần với số tiền người sở hữu có thể nhận khi thanh lý; không dùng giá bán ra hoặc trung bình hai chiều.

Nếu nguồn chính không có bảng giá online, lỗi truy cập hoặc không tìm thấy đúng sản phẩm, hệ thống dùng giá mua vào nhẫn 9999 của SJC. Giá này phải được gắn nhãn `Giá thay thế SJC`, hiển thị nguồn và thời điểm cập nhật. Không được trình bày giá thay thế như giá mua lại chắc chắn của nơi mua ban đầu.

Nếu cả nguồn chính và SJC đều không cung cấp được giá hợp lệ, lô vẫn tồn tại nhưng có trạng thái `Chưa có giá`. Hệ thống không tính giá trị tham chiếu hoặc lời/lỗ chưa thực hiện cho phần dữ liệu thiếu giá và không tự dùng dữ liệu cũ như giá hiện tại. Nếu hiển thị giá cache gần nhất, phải ghi rõ đó là giá cũ cùng thời điểm của nó và loại khỏi tổng “theo giá hiện tại”.

Việc lấy giá online không được làm hỏng thao tác thêm, sửa, bán hoặc xem lịch sử local. Lỗi nguồn giá được xử lý như trạng thái dữ liệu tham chiếu, không phải lỗi giao dịch vàng của người dùng.

## Công thức

Với một lô:

```text
Khối lượng còn lại = Khối lượng mua ban đầu - Tổng khối lượng đã bán đang hoạt động

Giá vốn phần đã bán từ lô =
  Giá vốn ban đầu của lô
  × Khối lượng bán từ lô
  ÷ Khối lượng mua ban đầu

Giá vốn còn lại =
  Giá vốn ban đầu của lô - Tổng giá vốn đã phân bổ cho phần bán

Giá trị tham chiếu =
  Khối lượng còn lại × Giá mua vào hiện tại đã quy về cùng đơn vị

Lời/lỗ chưa thực hiện =
  Giá trị tham chiếu - Giá vốn còn lại
```

Với một giao dịch bán:

```text
Lời/lỗ đã thực hiện =
  Tổng tiền thực nhận - Tổng giá vốn được phân bổ từ các lô đã chọn
```

Các phép tính tiền và khối lượng không dùng số thực nhị phân thiếu kiểm soát. Quy tắc làm tròn phải nhất quán; tiền hiển thị làm tròn tới VNĐ, còn khối lượng giữ đủ độ chính xác để tổng phần bán không vượt khối lượng mua.

## Luồng thêm giao dịch mua

Người dùng chọn `Thêm giao dịch` rồi `Mua vàng`, nhập ngày giờ, thương hiệu/nơi mua, khối lượng, đơn vị, đơn giá mua, tổng tiền và ghi chú tùy chọn.

Hệ thống tự tính tổng tiền từ khối lượng và đơn giá để hỗ trợ đối chiếu. Vì đơn vị niêm yết có thể khác đơn vị khối lượng nhập, giao diện phải nêu rõ đơn vị của đơn giá. Nếu người dùng sửa tổng tiền khác kết quả tự tính, tổng tiền đã xác nhận là giá vốn của lô và ứng dụng hiển thị cảnh báo chênh lệch trước khi lưu.

Khi lưu:

1. Kiểm tra ngày, thương hiệu, khối lượng, đơn giá và tổng tiền hợp lệ.
2. Yêu cầu khối lượng, đơn giá và tổng tiền lớn hơn 0.
3. Chuẩn hóa khối lượng về gram.
4. Tạo lô mua.
5. Tính lại tồn kho, giá vốn và số liệu tổng hợp.
6. Lấy hoặc gắn dữ liệu giá tham chiếu mà không chặn việc lưu local.

## Luồng thêm giao dịch bán

Người dùng chọn `Thêm giao dịch` rồi `Bán vàng`, chọn một hoặc nhiều lô còn vàng và nhập khối lượng lấy từ từng lô. Sau đó người dùng nhập ngày giờ bán, nơi bán, đơn giá bán, tổng tiền thực nhận và ghi chú.

Quy tắc:

- Không cho bán vượt khối lượng còn lại của bất kỳ lô nào.
- Ngày bán không được sớm hơn ngày mua của mọi lô được chọn.
- Mỗi phân bổ bán phải có khối lượng lớn hơn 0.
- Tổng khối lượng bán bằng tổng các phân bổ theo lô.
- Tổng tiền thực nhận là cơ sở tính lời/lỗ đã thực hiện.
- Trước khi xác nhận, hiển thị các lô bị trừ, khối lượng, giá vốn phân bổ và lời/lỗ dự kiến.

Việc lưu giao dịch bán, các liên kết lô, thay đổi tồn và change log phải cùng thành công hoặc cùng rollback trong một SQLite transaction.

## Lịch sử và chi tiết

Lịch sử chung hiển thị giao dịch mua và bán theo thứ tự mới nhất trước. Mỗi dòng hiển thị:

- loại `Mua` hoặc `Bán`;
- ngày giao dịch;
- thương hiệu hoặc nơi giao dịch;
- khối lượng;
- tổng tiền;
- lời/lỗ đã thực hiện nếu là giao dịch bán.

Danh sách hỗ trợ lọc theo loại giao dịch, khoảng ngày và thương hiệu/nơi giao dịch. Chi tiết giao dịch mua hiển thị khối lượng ban đầu, đã bán, còn lại, giá vốn, giá tham chiếu và các giao dịch bán liên quan. Chi tiết giao dịch bán hiển thị từng lô nguồn, khối lượng và giá vốn được phân bổ.

## Sửa giao dịch

### Sửa giao dịch mua

- Không cho giảm khối lượng mua xuống thấp hơn tổng khối lượng đã bán đang hoạt động.
- Thay đổi tổng tiền mua làm tính lại giá vốn còn lại và lời/lỗ của mọi giao dịch bán liên quan.
- Thay đổi thương hiệu/nơi mua làm hệ thống tìm lại nguồn giá tham chiếu.
- Thay đổi ngày mua phải tiếp tục thỏa mãn ngày mua không sau ngày của giao dịch bán liên quan.

### Sửa giao dịch bán

- Giải phóng các phân bổ cũ trong cùng phép tính kiểm tra, sau đó kiểm tra các phân bổ mới.
- Không cho phân bổ mới vượt lượng khả dụng của từng lô.
- Ngày bán phải không sớm hơn ngày mua của tất cả lô mới.
- Sau khi lưu, tính lại tồn kho, giá vốn và lời/lỗ đã thực hiện.

Trước khi xác nhận sửa, giao diện hiển thị tác động dự kiến đến tồn kho và lời/lỗ. Thay đổi nghiệp vụ và change log phải nằm trong cùng SQLite transaction.

## Thùng rác

Xóa từ lịch sử là xóa mềm: giao dịch được chuyển vào Thùng rác và bị loại ngay khỏi tồn kho, giá vốn, giá trị tham chiếu và lời/lỗ.

### Đưa giao dịch mua vào thùng rác

- Chỉ được phép khi không có giao dịch bán đang hoạt động liên kết tới lô.
- Nếu có liên kết, chặn thao tác, liệt kê giao dịch bán liên quan và hướng dẫn người dùng đưa các giao dịch bán đó vào thùng rác trước.
- Không tự động xóa dây chuyền và không giữ giao dịch bán ở trạng thái thiếu giá vốn.

### Đưa giao dịch bán vào thùng rác

- Cho phép sau hộp thoại xác nhận.
- Các phân bổ bán ngừng hoạt động và khối lượng được trả lại đúng lô mua.
- Tính lại tồn kho, giá vốn còn lại và lời/lỗ.

## Khôi phục và xóa vĩnh viễn

### Khôi phục giao dịch mua

Khôi phục lô mua và tính lại số liệu. Vì giao dịch mua chỉ được đưa vào thùng rác khi không có giao dịch bán hoạt động phụ thuộc vào nó, khôi phục không tự động khôi phục các giao dịch bán cũ.

### Khôi phục giao dịch bán

Trước khi khôi phục, hệ thống kiểm tra:

- tất cả lô mua liên quan đang hoạt động;
- mỗi lô còn đủ khối lượng tại trạng thái hiện tại;
- ngày bán vẫn hợp lệ so với ngày mua.

Nếu bất kỳ điều kiện nào không đạt, không khôi phục một phần; hiển thị lô và lý do gây xung đột. Nếu hợp lệ, khôi phục toàn bộ giao dịch và các phân bổ trong một SQLite transaction.

### Xóa vĩnh viễn

- Chỉ thực hiện từ Thùng rác.
- Luôn yêu cầu xác nhận rằng thao tác không thể hoàn tác.
- Giao dịch mua không được xóa vĩnh viễn nếu còn bất kỳ giao dịch bán đang hoạt động liên kết.
- Xóa vĩnh viễn giao dịch trong Thùng rác không thay đổi số liệu tổng hợp vì giao dịch đó đã bị loại khỏi phép tính.
- Việc xóa phải ghi change log/tombstone cần thiết để không làm giao dịch xuất hiện lại khi dùng cơ chế sync-package hiện có.

## Tính lại và tính nhất quán

Nguồn sự thật là các giao dịch mua, giao dịch bán và phân bổ bán đang hoạt động. Số tổng hợp không được chỉnh tay.

Sau mọi thao tác thêm, sửa, đưa vào thùng rác, khôi phục hoặc xóa vĩnh viễn, hệ thống xác định lại:

1. khối lượng còn lại của từng lô;
2. tổng khối lượng đang nắm giữ;
3. giá vốn còn lại;
4. giá trị tham chiếu theo các lô có giá hợp lệ;
5. lời/lỗ chưa thực hiện;
6. lời/lỗ đã thực hiện.

Không cho trạng thái có khối lượng lô âm, phân bổ bán mồ côi hoặc giao dịch bán thiếu giá vốn. Các cập nhật nghiệp vụ liên quan phải nguyên tử.

## Cấu trúc màn hình

### Tổng quan Vàng của tôi

- Tổng khối lượng đang nắm giữ.
- Tổng giá vốn còn lại.
- Giá trị tham chiếu hiện tại.
- Lời/lỗ chưa thực hiện.
- Lời/lỗ đã thực hiện.
- Trạng thái nguồn và thời điểm cập nhật giá.
- Số lô chưa có giá hiện tại hoặc đang dùng giá thay thế.
- Hành động `Thêm giao dịch`.

Nếu chỉ một phần danh mục có giá hiện tại, giao diện không trình bày tổng tham chiếu như giá trị của toàn bộ tài sản; phải nêu rõ phần khối lượng đã và chưa được định giá.

### Lịch sử

- Dòng thời gian mua/bán.
- Bộ lọc loại, ngày và thương hiệu/nơi giao dịch.
- Mở chi tiết để sửa hoặc đưa vào thùng rác.

### Thùng rác

- Danh sách giao dịch đã xóa mềm.
- Khôi phục.
- Xóa vĩnh viễn.
- Hiển thị lý do nếu giao dịch không thể khôi phục.

Mọi màn hình có giá hoặc lời/lỗ phải hiển thị `Thông tin theo dõi tài sản, không phải khuyến nghị đầu tư` và `Chưa bao gồm phí và tiền công`.

## Kiến trúc triển khai

- Domain/application định nghĩa lô mua, giao dịch bán, phân bổ bán, giá tham chiếu, công thức và validation; không phụ thuộc React Native, SQLite hoặc nguồn giá cụ thể.
- Repository port nằm ở application; implementation local nằm ở data layer.
- Price provider là một port riêng. Adapter theo thương hiệu ánh xạ dữ liệu nguồn về record giá chuẩn; SJC là adapter fallback.
- UI gọi use case/view model, không truy cập database hoặc website giá trực tiếp.
- Mọi entity nghiệp vụ giữ metadata local-first/sync phù hợp convention hiện tại.
- Tạo/sửa/xóa mềm/khôi phục giao dịch, phân bổ và change log phải nằm trong cùng transaction.
- Làm mới giá chạy độc lập với transaction giao dịch local và không được chặn người dùng quản lý lịch sử.

## Xử lý lỗi

- Dữ liệu form không hợp lệ: giữ nguyên dữ liệu đã nhập và hiển thị lỗi cạnh trường.
- Bán vượt tồn hoặc ngày không hợp lệ: không ghi bất kỳ phần nào của giao dịch.
- Nguồn giá lỗi/timeout/sai cấu trúc: giữ dữ liệu local, ghi trạng thái nguồn, thử fallback SJC.
- Fallback SJC lỗi: hiển thị `Chưa có giá`; không tạo lời/lỗ giả.
- Xung đột khi khôi phục: không khôi phục một phần; nêu rõ giao dịch hoặc lô gây lỗi.
- Lỗi database giữa transaction: rollback giao dịch, phân bổ và change log.

## Kiểm thử chấp nhận

- Tạo giao dịch mua hợp lệ bằng lượng/cây, chỉ, phân và gram; khối lượng chuẩn hóa đúng.
- Từ nhiều lô mua, tổng khối lượng và tổng giá vốn đúng.
- Giá đúng thương hiệu và chiều mua vào được dùng để định giá lô.
- Thiếu giá thương hiệu thì dùng giá mua vào nhẫn 9999 SJC và hiển thị `Giá thay thế SJC`.
- Thiếu cả hai nguồn thì hiển thị `Chưa có giá` và không cộng lô vào tổng giá trị theo giá hiện tại.
- Tạo giao dịch bán từ một hoặc nhiều lô và phân bổ giá vốn đúng theo tỷ lệ.
- Không cho bán vượt lượng còn lại hoặc bán trước ngày mua.
- Lời/lỗ chưa thực hiện và đã thực hiện đúng theo công thức đã duyệt.
- Mọi kết quả lời/lỗ hiển thị cảnh báo chưa gồm phí/tiền công.
- Sửa lượng mua không được thấp hơn lượng đã bán.
- Sửa giá mua tính lại lời/lỗ của các giao dịch bán liên quan.
- Sửa giao dịch bán giải phóng phân bổ cũ và áp dụng phân bổ mới nguyên tử.
- Không cho đưa lô mua có giao dịch bán hoạt động vào thùng rác.
- Đưa giao dịch bán vào thùng rác trả lượng về đúng lô và cập nhật số liệu.
- Khôi phục giao dịch bán chỉ thành công khi tất cả lô còn tồn tại và đủ lượng.
- Giao dịch trong thùng rác không tham gia bất kỳ số tổng hợp nào.
- Xóa vĩnh viễn yêu cầu xác nhận và giữ tombstone cần thiết cho sync.
- Giao dịch, phân bổ và change log cùng commit hoặc cùng rollback.
- Lịch sử lọc đúng theo loại, khoảng ngày và thương hiệu/nơi giao dịch.
- Giá online lỗi không ngăn thêm, sửa, bán hoặc xem dữ liệu local.

## Nguồn nghiên cứu

Requirement nghiệp vụ và nguồn chính thống được tổng hợp tại `research/personal-gold-tracking-research.md`, gồm quy đổi đơn vị, hai chiều giá, quy định niêm yết và các ranh giới theo dõi tài sản.
