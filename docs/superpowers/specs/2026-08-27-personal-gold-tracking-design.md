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

- ngày mua;
- thương hiệu hoặc nơi mua;
- khối lượng và đơn vị nhập gốc;
- khối lượng chuẩn hóa theo gram;
- tổng tiền mua;
- ghi chú tùy chọn;
- metadata local-first/sync theo convention hiện tại.

Giá vốn ban đầu của lô bằng tổng tiền mua do người dùng nhập trực tiếp; hệ thống không lưu đơn giá mua riêng và không tự tính hay đối chiếu tổng tiền từ khối lượng × đơn giá. Do MVP không tính phí và tiền công, mọi kết quả lời/lỗ phải kèm nhãn `Chưa bao gồm phí và tiền công`.

### Giao dịch bán

Mỗi giao dịch bán liên kết đích danh tới đúng một lô mua và luôn bán toàn bộ khối lượng còn lại của lô đó; không hỗ trợ bán một phần lô hoặc gộp nhiều lô trong cùng một giao dịch bán. Muốn bán một phần khối lượng của một lô, người dùng phải tách lô đó thành các giao dịch mua nhỏ hơn từ trước. Giao dịch bán lưu:

- ngày bán;
- lô mua được chọn để bán;
- tổng tiền thực nhận;
- ghi chú tùy chọn;
- metadata local-first/sync.

Không dùng FIFO hoặc bình quân gia quyền để tự chọn lô; người dùng luôn tự chọn đích danh lô cần bán.

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

Mỗi lô chỉ ở một trong hai trạng thái: `Đang nắm giữ` (chưa có giao dịch bán liên kết) hoặc `Đã bán` (có đúng một giao dịch bán liên kết, khối lượng còn lại bằng 0). Vì mỗi giao dịch bán luôn bán toàn bộ một lô, không cần công thức phân bổ tỉ lệ theo khối lượng.

Với một lô đang nắm giữ:

```text
Giá vốn = Tổng tiền mua

Giá trị tham chiếu =
  Khối lượng của lô × Giá mua vào hiện tại đã quy về cùng đơn vị

Lời/lỗ chưa thực hiện =
  Giá trị tham chiếu - Giá vốn
```

Với một giao dịch bán:

```text
Lời/lỗ đã thực hiện =
  Tổng tiền thực nhận - Giá vốn của lô đã bán
```

Các phép tính tiền và khối lượng không dùng số thực nhị phân thiếu kiểm soát. Quy tắc làm tròn phải nhất quán; tiền hiển thị làm tròn tới VNĐ, còn khối lượng giữ đủ độ chính xác cho mục đích đối soát.

## Luồng thêm giao dịch mua

Người dùng chọn `Thêm giao dịch` rồi `Mua vàng`, nhập ngày mua, thương hiệu/nơi mua (chọn từ danh sách thương hiệu đã lưu hoặc thêm thương hiệu mới), khối lượng, đơn vị, tổng tiền mua và ghi chú tùy chọn.

Tổng tiền do người dùng nhập trực tiếp là giá vốn của lô; hệ thống không lưu đơn giá mua riêng, không tự tính tổng tiền từ khối lượng × đơn giá và không hiển thị cảnh báo chênh lệch.

Khi lưu:

1. Kiểm tra ngày, thương hiệu, khối lượng và tổng tiền hợp lệ.
2. Yêu cầu khối lượng và tổng tiền lớn hơn 0.
3. Chuẩn hóa khối lượng về gram.
4. Tạo lô mua.
5. Tính lại tồn kho, giá vốn và số liệu tổng hợp.
6. Lấy hoặc gắn dữ liệu giá tham chiếu mà không chặn việc lưu local.

### Quản lý thương hiệu

Danh sách thương hiệu/nơi mua được lưu như một danh mục riêng trong Cài đặt, dùng chung cho mọi giao dịch mua. Người dùng có thể thêm thương hiệu mới trực tiếp từ dropdown chọn thương hiệu khi đang thêm giao dịch mua, hoặc từ màn quản lý thương hiệu riêng; xóa một thương hiệu khỏi danh sách không xóa hay thay đổi các lô mua đã lưu trước đó với thương hiệu đó.

## Luồng thêm giao dịch bán

Người dùng chọn `Thêm giao dịch` rồi `Bán vàng`, chọn đúng một lô đang nắm giữ từ danh sách các lô còn vàng (`Vàng đã mua`). Giao dịch bán luôn áp dụng cho toàn bộ khối lượng của lô được chọn — không nhập khối lượng bán riêng và không chọn nhiều lô trong cùng một giao dịch. Sau đó người dùng nhập ngày bán, tổng tiền thực nhận và ghi chú.

Quy tắc:

- Chỉ hiển thị trong danh sách chọn các lô đang ở trạng thái `Đang nắm giữ` (chưa có giao dịch bán liên kết).
- Ngày bán không được sớm hơn ngày mua của lô được chọn.
- Tổng tiền thực nhận là cơ sở tính lời/lỗ đã thực hiện.
- Sau khi lưu, lô chuyển sang trạng thái `Đã bán` và không còn xuất hiện trong danh sách chọn để bán tiếp.

Việc lưu giao dịch bán, liên kết tới lô, thay đổi tồn và change log phải cùng thành công hoặc cùng rollback trong một SQLite transaction.

## Lịch sử và chi tiết

Lịch sử chung hiển thị giao dịch mua và bán theo thứ tự mới nhất trước. Mỗi dòng hiển thị:

- loại `Mua` hoặc `Bán`;
- ngày giao dịch;
- thương hiệu hoặc nơi giao dịch;
- khối lượng;
- tổng tiền;
- lời/lỗ đã thực hiện nếu là giao dịch bán.

Chi tiết giao dịch mua hiển thị khối lượng, giá vốn và trạng thái lô (`Đang nắm giữ` hoặc `Đã bán`, kèm giao dịch bán liên quan nếu có). Chi tiết giao dịch bán hiển thị lô nguồn, khối lượng đã bán và lời/lỗ đã thực hiện.

Ngoài phạm vi MVP hiện tại (dự kiến cho phase sau, chưa có trong thiết kế UI): bộ lọc lịch sử theo loại giao dịch/khoảng ngày/thương hiệu, và sửa giao dịch mua hoặc bán đã lưu. Ở bản MVP này, một giao dịch mua hoặc bán sai chỉ có thể được xử lý bằng cách đưa vào thùng rác rồi thêm lại giao dịch mới.

## Thùng rác

Xóa từ lịch sử là xóa mềm: giao dịch được chuyển vào Thùng rác và bị loại ngay khỏi tồn kho, giá vốn, giá trị tham chiếu và lời/lỗ.

### Đưa giao dịch mua vào thùng rác

- Chỉ được phép khi không có giao dịch bán đang hoạt động liên kết tới lô.
- Nếu có liên kết, chặn thao tác, liệt kê giao dịch bán liên quan và hướng dẫn người dùng đưa các giao dịch bán đó vào thùng rác trước.
- Không tự động xóa dây chuyền và không giữ giao dịch bán ở trạng thái thiếu giá vốn.

### Đưa giao dịch bán vào thùng rác

- Cho phép sau hộp thoại xác nhận.
- Liên kết bán ngừng hoạt động và lô mua nguồn trở lại trạng thái `Đang nắm giữ`.
- Tính lại tồn kho và lời/lỗ.

## Khôi phục và xóa vĩnh viễn

### Khôi phục giao dịch mua

Khôi phục lô mua và tính lại số liệu. Vì giao dịch mua chỉ được đưa vào thùng rác khi không có giao dịch bán hoạt động phụ thuộc vào nó, khôi phục không tự động khôi phục giao dịch bán cũ.

### Khôi phục giao dịch bán

Trước khi khôi phục, hệ thống kiểm tra:

- lô mua liên quan vẫn đang hoạt động (không nằm trong thùng rác);
- lô mua liên quan chưa được liên kết với một giao dịch bán khác kể từ khi giao dịch này bị đưa vào thùng rác;
- ngày bán vẫn hợp lệ so với ngày mua.

Nếu bất kỳ điều kiện nào không đạt, không khôi phục; hiển thị lô và lý do gây xung đột. Nếu hợp lệ, khôi phục toàn bộ giao dịch và liên kết trong một SQLite transaction.

### Xóa vĩnh viễn

- Chỉ thực hiện từ Thùng rác.
- Luôn yêu cầu xác nhận rằng thao tác không thể hoàn tác.
- Giao dịch mua không được xóa vĩnh viễn nếu còn bất kỳ giao dịch bán đang hoạt động liên kết.
- Xóa vĩnh viễn giao dịch trong Thùng rác không thay đổi số liệu tổng hợp vì giao dịch đó đã bị loại khỏi phép tính.
- Việc xóa phải ghi change log/tombstone cần thiết để không làm giao dịch xuất hiện lại khi dùng cơ chế sync-package hiện có.

## Tính lại và tính nhất quán

Nguồn sự thật là các giao dịch mua và giao dịch bán đang hoạt động. Số tổng hợp không được chỉnh tay.

Sau mọi thao tác thêm, đưa vào thùng rác, khôi phục hoặc xóa vĩnh viễn, hệ thống xác định lại:

1. trạng thái (`Đang nắm giữ`/`Đã bán`) của từng lô;
2. tổng khối lượng đang nắm giữ;
3. tổng giá vốn đang nắm giữ;
4. giá trị tham chiếu theo các lô có giá hợp lệ;
5. lời/lỗ chưa thực hiện;
6. lời/lỗ đã thực hiện.

Không cho trạng thái một lô bị liên kết với nhiều hơn một giao dịch bán đang hoạt động, hoặc một giao dịch bán đang hoạt động thiếu lô nguồn. Các cập nhật nghiệp vụ liên quan phải nguyên tử.

## Cấu trúc màn hình

### Tổng quan Vàng của tôi

Bản UI MVP hiện tại chỉ hiển thị:

- Tổng khối lượng đang nắm giữ.
- Tổng giá vốn.
- Hành động `Thêm giao dịch`.

Các mục sau nằm trong mục tiêu sản phẩm nhưng chưa có trong bản UI hiện tại, dự kiến bổ sung ở phase sau khi tích hợp nguồn giá tham chiếu:

- Giá trị tham chiếu hiện tại.
- Lời/lỗ chưa thực hiện.
- Lời/lỗ đã thực hiện.
- Trạng thái nguồn và thời điểm cập nhật giá.
- Số lô chưa có giá hiện tại hoặc đang dùng giá thay thế.

Khi các mục trên được bổ sung: nếu chỉ một phần danh mục có giá hiện tại, giao diện không được trình bày tổng tham chiếu như giá trị của toàn bộ tài sản; phải nêu rõ phần khối lượng đã và chưa được định giá.

### Lịch sử

- Dòng thời gian mua/bán, mới nhất trước.
- Mở chi tiết để đưa vào thùng rác.
- Bộ lọc theo loại giao dịch, khoảng ngày và thương hiệu/nơi giao dịch: ngoài phạm vi MVP hiện tại, dự kiến cho phase sau.

### Thùng rác

- Danh sách giao dịch đã xóa mềm.
- Khôi phục.
- Xóa vĩnh viễn.
- Hiển thị lý do nếu giao dịch không thể khôi phục.

Khi màn hình có hiển thị giá tham chiếu hoặc lời/lỗ (phase sau), phải kèm nhãn `Thông tin theo dõi tài sản, không phải khuyến nghị đầu tư` và `Chưa bao gồm phí và tiền công`.

## Kiến trúc triển khai

- Domain/application định nghĩa lô mua, giao dịch bán, danh mục thương hiệu, giá tham chiếu, công thức và validation; không phụ thuộc React Native, SQLite hoặc nguồn giá cụ thể.
- Repository port nằm ở application; implementation local nằm ở data layer.
- Price provider là một port riêng. Adapter theo thương hiệu ánh xạ dữ liệu nguồn về record giá chuẩn; SJC là adapter fallback.
- UI gọi use case/view model, không truy cập database hoặc website giá trực tiếp.
- Mọi entity nghiệp vụ giữ metadata local-first/sync phù hợp convention hiện tại.
- Tạo/xóa mềm/khôi phục giao dịch và change log phải nằm trong cùng transaction.
- Làm mới giá chạy độc lập với transaction giao dịch local và không được chặn người dùng quản lý lịch sử.

## Xử lý lỗi

- Dữ liệu form không hợp lệ: giữ nguyên dữ liệu đã nhập và hiển thị lỗi cạnh trường.
- Ngày bán sớm hơn ngày mua của lô: không ghi giao dịch.
- Nguồn giá lỗi/timeout/sai cấu trúc: giữ dữ liệu local, ghi trạng thái nguồn, thử fallback SJC.
- Fallback SJC lỗi: hiển thị `Chưa có giá`; không tạo lời/lỗ giả.
- Xung đột khi khôi phục: không khôi phục; nêu rõ giao dịch hoặc lô gây lỗi.
- Lỗi database giữa transaction: rollback giao dịch và change log.

## Kiểm thử chấp nhận

- Tạo giao dịch mua hợp lệ bằng lượng/cây, chỉ, phân và gram; khối lượng chuẩn hóa đúng.
- Từ nhiều lô mua, tổng khối lượng và tổng giá vốn đang nắm giữ đúng.
- Giá đúng thương hiệu và chiều mua vào được dùng để định giá lô.
- Thiếu giá thương hiệu thì dùng giá mua vào nhẫn 9999 SJC và hiển thị `Giá thay thế SJC`.
- Thiếu cả hai nguồn thì hiển thị `Chưa có giá` và không cộng lô vào tổng giá trị theo giá hiện tại.
- Tạo giao dịch bán từ đúng một lô đang nắm giữ; lô chuyển sang trạng thái `Đã bán` và không còn xuất hiện trong danh sách chọn để bán.
- Không cho chọn bán một lô đã ở trạng thái `Đã bán`, hoặc bán trước ngày mua của lô.
- Lời/lỗ đã thực hiện của giao dịch bán đúng theo công thức đã duyệt (tổng tiền thực nhận trừ giá vốn của lô).
- Mọi kết quả lời/lỗ hiển thị cảnh báo chưa gồm phí/tiền công (khi tính năng lời/lỗ được bổ sung).
- Không cho đưa lô mua có giao dịch bán hoạt động vào thùng rác.
- Đưa giao dịch bán vào thùng rác trả lô nguồn về trạng thái `Đang nắm giữ` và cập nhật số liệu.
- Khôi phục giao dịch bán chỉ thành công khi lô nguồn còn tồn tại và chưa được bán lại.
- Giao dịch trong thùng rác không tham gia bất kỳ số tổng hợp nào.
- Xóa vĩnh viễn yêu cầu xác nhận và giữ tombstone cần thiết cho sync.
- Giao dịch và change log cùng commit hoặc cùng rollback.
- Giá online lỗi không ngăn thêm, bán hoặc xem dữ liệu local.
- Thêm thương hiệu mới từ dropdown chọn thương hiệu khi đang thêm giao dịch mua hoạt động đúng, và thương hiệu mới hiển thị ngay trong danh sách chọn.
- Xóa một thương hiệu khỏi danh mục không làm thay đổi hay ẩn các lô mua đã lưu trước đó với thương hiệu đó.

## Nguồn nghiên cứu

Requirement nghiệp vụ và nguồn chính thống được tổng hợp tại `research/personal-gold-tracking-research.md`, gồm quy đổi đơn vị, hai chiều giá, quy định niêm yết và các ranh giới theo dõi tài sản.
