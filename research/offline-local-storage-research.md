# Nghiên cứu lưu trữ local cho React Native + Expo mobile-only

**Ngày nghiên cứu:** 2026-08-24  
**Phạm vi:** Ứng dụng iOS/Android, React Native + Expo, không có backend, dữ liệu lưu trên thiết bị.  
**Ngày truy cập các nguồn:** 2026-08-24

## Kết luận điều hành

Đề xuất chốt cho ứng dụng có dữ liệu có cấu trúc:

```text
React Native + Expo + TypeScript
        |
        +-- expo-sqlite          nền persistence chính
        +-- Drizzle ORM          schema, type-safe queries, migrations
        +-- expo-secure-store    secret nhỏ: khóa mã hóa, PIN/session/device secret
        +-- expo-file-system     file/media, export/import hoặc backup thủ công
```

`expo-sqlite` phù hợp hơn key-value storage vì dữ liệu có bảng, quan hệ, truy vấn, transaction và migration. Drizzle là lớp ORM/type-safety và công cụ sinh migration; nó không thay thế SQLite. Expo mô tả SQLite là lựa chọn tốt cho local-first app và database được lưu qua các lần khởi động lại. [Expo: SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [Expo: Local-first](https://docs.expo.dev/guides/local-first/)

Không nên dùng `AsyncStorage` làm source of truth cho dữ liệu nghiệp vụ nhiều bảng: đây là kho key-value bất đồng bộ, không mã hóa, chỉ lưu string và phù hợp hơn với preferences/app state nhỏ. [Expo: Store data](https://docs.expo.dev/develop/user-interface/store-data/), [Async Storage: API](https://react-native-async-storage.github.io/3.0/api/usage/)

`expo-secure-store` nên được giới hạn cho secret nhỏ. Nó dùng Android Keystore-backed encrypted SharedPreferences và iOS Keychain, nhưng có giới hạn kích thước, hành vi backup/uninstall khác nhau giữa hai nền tảng, và tài liệu Expo cảnh báo không dùng nó làm nguồn duy nhất cho dữ liệu quan trọng không thể thay thế. [Expo: SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

## So sánh các lựa chọn

| Lựa chọn | Dữ liệu có cấu trúc | Migration | Transaction | Offline | Bảo mật | Đánh giá cho dự án |
|---|---|---|---|---|---|---|
| `AsyncStorage` | Thấp: key-value, phải tự serialize JSON | Tự xây version/migration | Không có transaction database | Tốt cho ít dữ liệu | Không mã hóa | Chỉ dùng cho preferences, flags, UI state nhỏ |
| `expo-sqlite` trực tiếp | Cao: SQLite, SQL, index, foreign key | Có thể tự quản lý `PRAGMA user_version` và migration | Có `withTransactionAsync`/`withExclusiveTransactionAsync` | Rất tốt | SQLite mặc định không phải encrypted database; có tùy chọn SQLCipher | Nền tảng tốt, nhưng repository sẽ nhiều SQL thủ công |
| `expo-sqlite` + Drizzle | Cao | Drizzle Kit sinh SQL migration và bundling migration vào app | Dựa trên SQLite transaction | Rất tốt | Bảo mật phụ thuộc SQLite/SQLCipher và OS; ORM không tự mã hóa | **Khuyến nghị mặc định** |
| WatermelonDB | Cao, model/relational, lazy loading và observable patterns | Có schema migrations chính thức | Ghi trong `database.write`, hỗ trợ batching/reader | Tốt | Không phải lớp encryption mặc định | Hợp app lớn/high-volume; nặng hơn và setup native phức tạp hơn Expo SQLite + Drizzle |
| File JSON riêng | Thấp đến vừa | Tự version toàn file | Tự thiết kế atomic write/locking | Tốt cho document/export | Không tự mã hóa | Chỉ hợp file export, settings nhỏ hoặc tài liệu; không hợp nhiều entity/quan hệ |

Các dòng về WatermelonDB dựa trên tài liệu chính thức: database dùng SQLite adapter trên native, yêu cầu schema/migrations; mọi thay đổi phải nằm trong writer và batching được khuyến nghị để nhanh/an toàn hơn. [WatermelonDB: Setup](https://watermelondb.dev/docs/Setup), [WatermelonDB: Migrations](https://watermelondb.dev/docs/Advanced/Migrations), [WatermelonDB: Writers, Readers, Batching](https://watermelondb.dev/docs/Writers)

## Migration và transaction

Expo SQLite cung cấp ví dụ migration bằng `PRAGMA user_version`; tài liệu cũng khuyến nghị bật WAL khi tạo database. Async transaction tự commit/rollback theo kết quả callback. Khi cần cô lập tuyệt đối các ghi đồng thời, dùng `withExclusiveTransactionAsync` và thực hiện query qua transaction object. [Expo SQLite: migrations and transactions](https://docs.expo.dev/versions/latest/sdk/sqlite/)

Drizzle hỗ trợ Expo SQLite bằng native driver, Drizzle Kit và migration SQL được bundle trực tiếp vào app. Quy trình phù hợp là:

1. Định nghĩa schema TypeScript.
2. Chạy `drizzle-kit generate` để sinh migration SQL.
3. Bundle thư mục migrations vào binary.
4. Chạy `useMigrations` trước khi render màn hình phụ thuộc database.
5. Nếu migration lỗi, chặn app ở trạng thái lỗi có thể retry/khôi phục; không âm thầm xóa database.

Nguồn chính thức: [Drizzle: Expo SQLite](https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite).

Với Clean Architecture, migration thuộc infrastructure/data layer; domain không biết SQL, Drizzle hay Expo. Repository interface nằm ở domain/application, implementation nằm ở data:

```text
src/
  domain/
    entities/
    repositories/       // interface, không import Expo/Drizzle
  application/
    use-cases/           // nghiệp vụ, gọi repository interface
  data/
    db/
      client.ts         // mở SQLite, PRAGMA, lifecycle
      schema.ts         // Drizzle schema
      migrations/       // generated SQL
    repositories/       // map row <-> domain entity
  presentation/
    screens/
    hooks/
```

Quy tắc quan trọng: use case điều phối một nghiệp vụ; repository thực hiện query; transaction boundary nằm ở repository/unit-of-work khi một use case ghi nhiều bảng. Không để component gọi database trực tiếp.

## Bảo mật

- `AsyncStorage` không mã hóa; không lưu PIN, refresh token, khóa mã hóa hay dữ liệu nhạy cảm ở đó. [Expo: Store data](https://docs.expo.dev/develop/user-interface/store-data/)
- `expo-secure-store` là lựa chọn cho secret nhỏ. Trên Android dùng encrypted SharedPreferences với Keystore; trên iOS dùng Keychain. `requireAuthentication` có thể khiến item không đọc được sau thay đổi sinh trắc học, nên app phải xử lý trường hợp key bị invalidated. [Expo: SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- Nếu dữ liệu nghiệp vụ trong SQLite rất nhạy cảm, cân nhắc SQLCipher. Expo SQLite có config plugin `useSQLCipher`; cần native build/prebuild và SQLCipher không chạy trong Expo Go. Sau khi mở database phải đặt key. Đây là mã hóa database-level, khác với việc chỉ dựa vào sandbox hoặc OS file protection. [Expo SQLite: SQLCipher](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- Trên iOS, Data Protection mã hóa file trên disk và có các mức truy cập khi thiết bị khóa; file nhạy cảm có thể cần `Complete` nhưng app phải đóng/reopen file khi protected data unavailable. [Apple: Encrypting your app’s files](https://developer.apple.com/documentation/uikit/encrypting-your-app-s-files)
- Không hard-code khóa SQLCipher trong JavaScript bundle. Nếu dùng SQLCipher, cần thiết kế key lifecycle; một hướng là tạo/generate secret và giữ secret trong SecureStore, đồng thời chấp nhận rằng mất key có thể làm dữ liệu không thể giải mã.

## Backup, restore và giới hạn của “không có backend”

Không có backend nghĩa là không có server copy, đồng bộ đa thiết bị hay cơ chế khôi phục độc lập. Dữ liệu có thể mất khi người dùng xóa app, mất thiết bị, reset máy, hoặc backup không bao gồm/không giải mã được dữ liệu. Vì vậy nên xác định rõ sản phẩm cần một trong ba chính sách:

1. **Device-only:** dữ liệu cố ý không khôi phục sang thiết bị khác; hiển thị rõ cho người dùng.
2. **OS backup:** cho phép Android/iCloud backup của app data, nhưng phải kiểm thử restore trên thiết bị mới và xem xét dữ liệu nhạy cảm.
3. **User-controlled export/import:** xuất file mã hóa hoặc bản backup do người dùng lưu vào Files/Drive; đây là cách đáng tin cậy hơn để khôi phục khi không có backend.

Android Auto Backup có thể include/exclude domain `database`, `file`, `sharedpref` và cho phép điều kiện mã hóa; quota và rule backup cần được cấu hình/kiểm thử. [Android: Back up user data with Auto Backup](https://developer.android.com/identity/data/autobackup)

Apple phân biệt Documents, Application Support và các thư mục purgeable; Documents được backup và có thể hiển thị trong Files, còn dữ liệu hỗ trợ ứng dụng nên đặt ở Application Support. Apple cũng cho phép loại file khỏi iCloud backup nếu có thể tái tạo. [Apple: Using the file system effectively](https://developer.apple.com/documentation/foundation/using-the-file-system-effectively), [Apple: Optimizing your app’s data for iCloud Backup](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup)

SecureStore có backup caveat riêng: Android phải loại trừ dữ liệu SecureStore khỏi Auto Backup vì sau restore key Android có thể không còn giải mã được; iOS Keychain có thể tồn tại sau uninstall/reinstall cùng bundle ID, nhưng Expo khuyến cáo không nên dựa vào chi tiết này như một guarantee. [Expo: SecureStore — Android Auto Backup and data persistence](https://docs.expo.dev/versions/latest/sdk/securestore/)

## Recommendation chốt

### Stack

```text
expo-sqlite + drizzle-orm + drizzle-kit
expo-secure-store
expo-file-system (chỉ cho file/export/import)
```

### Vì sao không chốt WatermelonDB

WatermelonDB là lựa chọn hợp lệ nếu app có hàng chục nghìn bản ghi, cần reactive queries/lazy loading mạnh hoặc dự kiến sync backend về sau. Nhưng dự án hiện mobile-only, không backend và chưa có yêu cầu quy mô đó; WatermelonDB thêm model/decorator/native setup và abstraction cần học. Expo SQLite + Drizzle giữ gần SQLite, có migration SQL rõ ràng, type-safe schema/query và hợp với Clean Architecture hơn ở giai đoạn đầu. Đây là đánh giá kiến trúc suy ra từ capability/tài liệu của các thư viện, không phải benchmark tuyệt đối.

### Quy tắc triển khai

- Dùng SQLite cho mọi dữ liệu nghiệp vụ có cấu trúc.
- Dùng SecureStore chỉ cho secret nhỏ; không lưu cả database JSON vào SecureStore.
- Bật foreign keys và WAL khi khởi tạo; dùng prepared statements/Drizzle parameters, không nối chuỗi input vào SQL. [Expo SQLite: security and PRAGMA](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- Mọi thay đổi schema phải tạo migration; test cả fresh install và upgrade từ version trước.
- Chọn chính sách backup ngay từ đầu; nếu dữ liệu không thể mất, thêm export/import mã hóa vì OS backup không phải backend recovery.
- Nếu yêu cầu bảo mật cao, đánh giá SQLCipher trong development build/EAS build, không kiểm thử tính năng đó chỉ bằng Expo Go.

## Nguồn chính thức

- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — truy cập 2026-08-24
- [Expo Store data](https://docs.expo.dev/develop/user-interface/store-data/) — truy cập 2026-08-24
- [Expo Local-first apps](https://docs.expo.dev/guides/local-first/) — truy cập 2026-08-24
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) — truy cập 2026-08-24
- [Drizzle ORM: Expo SQLite](https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite) — truy cập 2026-08-24
- [Async Storage](https://react-native-async-storage.github.io/3.0/api/usage/) — truy cập 2026-08-24
- [WatermelonDB Setup](https://watermelondb.dev/docs/Setup) — truy cập 2026-08-24
- [WatermelonDB Migrations](https://watermelondb.dev/docs/Advanced/Migrations) — truy cập 2026-08-24
- [WatermelonDB Writers, Readers, Batching](https://watermelondb.dev/docs/Writers) — truy cập 2026-08-24
- [Android Auto Backup](https://developer.android.com/identity/data/autobackup) — truy cập 2026-08-24
- [Apple Encrypting Your App’s Files](https://developer.apple.com/documentation/uikit/encrypting-your-app-s-files) — truy cập 2026-08-24
- [Apple Using the File System Effectively](https://developer.apple.com/documentation/foundation/using-the-file-system-effectively) — truy cập 2026-08-24
- [Apple Optimizing Data for iCloud Backup](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup) — truy cập 2026-08-24
