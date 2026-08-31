# Release Vimo miễn phí trên Android và iOS — Nghiên cứu

**Ngày nghiên cứu và truy cập nguồn:** 2026-08-28
**Phạm vi:** Ứng dụng Vimo — Expo managed workflow (SDK ~54, RN 0.81.5, expo-router, expo-sqlite, expo-secure-store, new architecture), chưa có `ios/`/`android/` native folder, chưa có `eas.json`, chưa có `eas-cli`/`expo-dev-client` trong `package.json`.

## Tóm tắt (Tiếng Việt)

Câu hỏi "release free thì dùng gì" có hai nghĩa khác nhau, và câu trả lời khác hẳn nhau:

- **(A) Free = không tốn tiền công cụ build/publish** (chỉ để test trên máy thật, chưa cần lên store công khai): **làm được, gần như 0 đồng**, dùng Expo Go + EAS Build free tier + Internal Distribution. Giới hạn: 15 build Android + 15 build iOS/tháng, 1 build chạy đồng thời, hàng đợi ưu tiên thấp. [Expo Pricing](https://expo.dev/pricing)
- **(B) Free = app miễn phí tải trên App Store/Google Play công khai**: **app được miễn phí, nhưng tài khoản nhà phát triển thì KHÔNG miễn phí** trên cả hai nền tảng. Đây là phí bắt buộc, không liên quan gì đến việc app tính tiền người dùng hay không:
  - **Apple Developer Program: 99 USD/năm**, bắt buộc để dùng TestFlight và để nộp app lên App Store. [Apple Developer Program](https://developer.apple.com/programs/)
  - **Google Play Console: 25 USD một lần** (đăng ký một lần, không phải hàng năm). [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/6112435)

Kết luận: **không có cách nào phát hành công khai trên cả hai store mà 0 đồng tuyệt đối** — tối thiểu phải trả 99 USD (Apple, hàng năm) + 25 USD (Google, một lần) = khoảng 124 USD cho năm đầu, sau đó 99 USD/năm nếu muốn duy trì trên App Store. Android có đường vòng thực sự miễn phí: phát hành APK để người dùng tự tải/cài trực tiếp (sideload), không cần qua Google Play và không cần trả phí gì — nhưng đây không phải "trên Google Play Store", chỉ là "cài được trên điện thoại Android". iOS thì không có đường vòng tương đương cho người dùng công khai — Apple bắt buộc ký code qua tài khoản trả phí cho bất kỳ hình thức phân phối nào ngoài "cài trên chính thiết bị của bạn qua Xcode" (miễn phí nhưng giới hạn 3 thiết bị/nền tảng, provisioning hết hạn sau 7 ngày). [Apple — Compare Memberships](https://developer.apple.com/support/compare-memberships/)

**Đường đi rẻ nhất để có bản cài được trên điện thoại thật ngay hôm nay (test/dev, chưa lên store):**

1. Cài Expo Go miễn phí trên điện thoại Android/iOS thật (tải free từ Play Store/App Store). `expo-sqlite` và `expo-secure-store` — hai module Vimo đang dùng — đều là module built-in trong Expo Go, chạy được ngay không cần custom dev client. [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
2. Chạy `npx expo start`, quét QR bằng Expo Go — không tốn tiền, không cần tài khoản Apple/Google trả phí.
3. Khi cần build binary thật (ví dụ để test native config sâu hơn hoặc chia sẻ file cài đặt cho người khác không cần Expo Go), dùng `eas build --profile preview` (Internal Distribution) trong free tier của EAS — 15 build Android/tháng free, tạo file APK cài trực tiếp, không cần tài khoản Apple/Google trả phí cho phía Android. [EAS Internal Distribution](https://docs.expo.dev/build/internal-distribution/)
4. Cho iOS, Internal Distribution (ad-hoc) vẫn cần **tài khoản Apple Developer Program trả phí 99 USD/năm** để đăng ký UDID thiết bị thử nghiệm — đây là chi phí không tránh được nếu muốn build cài trên iPhone thật ngoài Xcode-personal-team. [EAS Internal Distribution — iOS](https://docs.expo.dev/build/internal-distribution/)

**Đường đi rẻ nhất để lên store công khai:** trả 99 USD Apple + 25 USD Google, tạo `eas.json` bằng `eas build:configure`, build production bằng `eas build --platform all`, rồi `eas submit` để đẩy lên cả hai store — toàn bộ chạy được từ Windows, không cần máy Mac. [EAS Submit](https://docs.expo.dev/submit/introduction/)

**Đề xuất bước tiếp theo cụ thể cho repo này** (chưa có eas.json/EAS project): xem mục "Khuyến nghị hành động" ở cuối tài liệu.

---

## 1. EAS Build & EAS Submit — chi phí và giới hạn (docs.expo.dev)

### EAS Build free tier

Theo trang giá chính thức của Expo: [Expo Pricing](https://expo.dev/pricing)

| Hạng mục                     | Free                              | Starter ($19/tháng)                  | Production ($199/tháng)               |
| ---------------------------- | --------------------------------- | ------------------------------------ | ------------------------------------- |
| Build/tháng                  | 15 Android + 15 iOS               | $45 build credit rồi tính theo usage | $225 build credit rồi tính theo usage |
| Build đồng thời              | 1                                 | 1 (thêm $50/build đến tối đa 5)      | 2 (thêm $50/build đến tối đa 5)       |
| Build timeout                | 45 phút                           | —                                    | —                                     |
| Hàng đợi                     | Ưu tiên thấp                      | —                                    | —                                     |
| EAS Update MAU               | 1.000 MAU                         | 3.000 MAU rồi tính theo usage        | 50.000 MAU rồi tính theo usage        |
| EAS Update bandwidth/storage | 100 GiB bandwidth, 20 GiB storage | —                                    | —                                     |

Giá build lẻ khi vượt free tier: Android medium $1, Android large $2, iOS medium $2, iOS large $4 (theo [Expo Pricing](https://expo.dev/pricing)).

**Kết luận:** với một app cá nhân như Vimo, free tier (15 build Android + 15 build iOS/tháng, 1 build đồng thời) thừa đủ cho vòng đời phát triển bình thường — chỉ cần build lại khi build mới thật sự cần thiết (thêm native module, đổi app.json plugin, chuẩn bị nộp store), không phải build cho mỗi lần sửa JS (JS thay đổi thì dùng Expo Go hoặc EAS Update, không cần build lại binary).

### EAS Build là gì, cách hoạt động

"EAS Build is a hosted service for building app binaries for your Expo and React Native projects" — build native binary trên cloud của Expo, không cần máy Mac để build iOS. [EAS Build Introduction](https://docs.expo.dev/build/introduction/)

Yêu cầu: cài `eas-cli` và có file `eas.json` ở root project (được sinh ra khi chạy `eas build:configure` lần đầu). [EAS Build Introduction](https://docs.expo.dev/build/introduction/), [EAS JSON](https://docs.expo.dev/build/eas-json/)

Lệnh cơ bản: `eas build --platform all` build cả Android lẫn iOS trên cloud, EAS tự quản lý provisioning profile, distribution certificate, keystore nếu để Expo lo (managed credentials). [EAS Build Introduction](https://docs.expo.dev/build/introduction/)

### EAS Submit

"EAS Submit provides an overview of how to submit your app to the Google Play Store and Apple App Store" — upload binary đã ký (.aab cho Android, .ipa cho iOS) lên Google Play Console / App Store Connect bằng một lệnh. Chạy được từ macOS, Linux, **và Windows** — không cần Mac để submit iOS. [EAS Submit Introduction](https://docs.expo.dev/submit/introduction/)

Điều kiện bắt buộc cho iOS: "A paid Apple Developer account is required to submit apps to the Apple App Store" — không có cách lách. [Submit to Apple App Store with EAS Submit](https://docs.expo.dev/submit/ios/)

## 2. Expo Go vs. Development Build vs. Production Build

### Expo Go

- Expo Go là app **miễn phí**, tải trực tiếp từ App Store/Google Play, không cần tài khoản Apple Developer Program trả phí để cài hay dùng nó (xác nhận từ chính App Store listing của Expo Go: giá "Free"). [Expo Go trên App Store](https://apps.apple.com/us/app/expo-go/id982107779)
- Expo Go là "sandbox app" chứa sẵn một tập module SDK cố định; nếu cần native module ngoài tập đó thì phải build development build riêng (`expo-dev-client`), không thể thêm native code tùy ý vào Expo Go. [Introduction to development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- **`expo-sqlite` và `expo-secure-store` — cả hai module Vimo đang dùng — đều nằm trong tập SDK built-in, chạy được trực tiếp trong Expo Go**, không cần dev build riêng cho các tính năng cơ bản. [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) — lưu ý một giới hạn nhỏ: option `requireAuthentication` (sinh trắc học) của SecureStore không hoạt động đầy đủ trong Expo Go do thiếu `NSFaceIDUsageDescription` mà chỉ có trong custom build mới khai báo được.
- **Kết luận cho Vimo:** vì app chỉ dùng expo-sqlite, expo-secure-store, drizzle-orm (JS-only ORM layer, không phải native module riêng) và các package Expo chuẩn, **Expo Go đủ dùng cho toàn bộ vòng lặp phát triển hiện tại** — không bắt buộc phải build development build ngay.

### Development build

Development build = "bản Expo Go của riêng bạn", cho phép dùng bất kỳ thư viện native nào và tùy chỉnh cấu hình native — khuyến nghị khi chuẩn bị release lên store hoặc khi cần native module ngoài Expo Go. [Introduction to development builds](https://docs.expo.dev/develop/development-builds/introduction/)

### Internal Distribution (chia sẻ build cài đặt không qua store)

Đặt `"distribution": "internal"` trong build profile của `eas.json`. [Internal distribution](https://docs.expo.dev/build/internal-distribution/)

- **Android:** build ra file APK, cài trực tiếp qua USB, tải web, hay gửi qua tin nhắn; người dùng phải chấp nhận cảnh báo bảo mật cho app ngoài Play Store. **Không yêu cầu tài khoản trả phí nào.** [Internal distribution](https://docs.expo.dev/build/internal-distribution/)
- **iOS:** dùng ad-hoc provisioning, yêu cầu **tài khoản Apple Developer Program trả phí** (giới hạn phân phối tối đa 100 iPhone/năm), phải đăng ký UDID từng thiết bị test bằng `eas device:create`, và Apple có thể mất 24–72 giờ xử lý thiết bị mới đăng ký trên membership mới. [Internal distribution](https://docs.expo.dev/build/internal-distribution/)
- Link internal distribution build "available to anybody with the URL" (có thể bật yêu cầu đăng nhập tài khoản Expo tùy chọn) — đây là cách chia sẻ bản test nhanh cho vài người dùng mà không cần TestFlight/Play Console. [Internal distribution](https://docs.expo.dev/build/internal-distribution/)

## 3. Chi phí và yêu cầu phía Apple

### Apple Developer Program — 99 USD/năm

Nguồn chính thức: [Apple Developer Program](https://developer.apple.com/programs/) — "The Apple Developer Program costs $99 per year."

Đi kèm: TestFlight (mời tối đa 10.000 external tester), quyền phân phối lên App Store, analytics/sales report, technical support từ Apple.

### Tài khoản Apple ID miễn phí — giới hạn gì

So sánh chính thức tại [Apple — Compare Memberships](https://developer.apple.com/support/compare-memberships/):

|                                                                  | Free Apple ID                                                                                                          | Apple Developer Program ($99/năm) |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Test app trên thiết bị của chính bạn qua Xcode                   | Có, nhưng tối đa 3 thiết bị test/nền tảng, App ID/provisioning profile hết hạn sau **7 ngày** (phải build lại/cài lại) | Có, không giới hạn 7 ngày         |
| TestFlight (mời người khác test)                                 | Không                                                                                                                  | Có                                |
| Phân phối App Store                                              | Không                                                                                                                  | Có                                |
| Ad-hoc distribution (chia sẻ build cho thiết bị đã đăng ký UDID) | Không                                                                                                                  | Có                                |

**Kết luận:** tài khoản Apple free cho phép **bạn tự cài app lên chính iPhone của mình miễn phí qua Xcode** (personal team), nhưng không dùng được cho bất kỳ hình thức chia sẻ nào cho người khác (không TestFlight, không ad-hoc, không App Store) — những cái đó bắt buộc 99 USD/năm.

## 4. Chi phí và yêu cầu phía Google

### Google Play Console — 25 USD một lần

Nguồn chính thức: [Google Play Console Help — Đăng ký tài khoản nhà phát triển](https://support.google.com/googleplay/android-developer/answer/6112435) — phí đăng ký là "US$25", thu **một lần** khi đăng ký (không phải phí hàng năm như Apple).

Yêu cầu khác: đủ 18 tuổi, chấp nhận Google Play Developer Distribution Agreement, xác minh danh tính. Từ 13/11/2023, tài khoản cá nhân (personal account) mới phải hoàn tất testing requirement trước khi được publish app công khai; từ đầu 2024, tài khoản cá nhân mới phải xác minh có quyền truy cập một thiết bị Android qua Play Console mobile app trước khi publish.

### Sideloading APK trên Android — hoàn toàn miễn phí, không cần tài khoản

Android cho phép cài file APK trực tiếp (không qua Play Store) mà không cần bất kỳ tài khoản nhà phát triển nào — đây chính là cơ chế Internal Distribution của EAS Build dùng (mục 2). Người dùng chỉ cần bật "cài từ nguồn không xác định" và chấp nhận cảnh báo bảo mật.

## 5. Đường vòng phân phối miễn phí — so sánh Android vs iOS

|                                                       | Android                                                                                                                            | iOS                                                                                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cài trên chính thiết bị của bạn                       | Miễn phí, không cần tài khoản gì                                                                                                   | Miễn phí qua Xcode + free Apple ID, nhưng giới hạn 3 thiết bị, hết hạn 7 ngày [Apple — Compare Memberships](https://developer.apple.com/support/compare-memberships/)  |
| Chia sẻ bản cài cho người khác test (không qua store) | Miễn phí — gửi file APK trực tiếp, không cần tài khoản [Internal distribution](https://docs.expo.dev/build/internal-distribution/) | **Bắt buộc** Apple Developer Program 99 USD/năm cho ad-hoc/TestFlight — không có cách lách [Internal distribution](https://docs.expo.dev/build/internal-distribution/) |
| Phát hành công khai trên store chính thức             | Google Play Console 25 USD một lần                                                                                                 | Apple Developer Program 99 USD/năm                                                                                                                                     |

Kết luận quan trọng: **Android có "APK sideloading" như một con đường thực sự miễn phí và không giới hạn thời gian để đưa app tới bất kỳ ai có file APK.** iOS **không có** cơ chế tương đương cho người dùng công khai bất kỳ — mọi hình thức chia sẻ ngoài "tự cài lên máy mình qua Xcode" đều đòi hỏi ký code bằng tài khoản trả phí, do chính sách code-signing bắt buộc của Apple (xác nhận qua chính tài liệu Apple so sánh membership và tài liệu EAS Internal Distribution).

## 6. EAS Update (OTA) — cập nhật JS miễn phí/giá rẻ sau khi phát hành

"EAS Update is a cloud service that serves updates for projects using the expo-updates library" — đẩy update cho phần JS/style/ảnh mà không cần submit lại binary qua store, hữu ích để fix bug nhanh giữa các lần release native. [EAS Update Introduction](https://docs.expo.dev/eas-update/introduction/)

Free tier: 1.000 MAU (monthly active users nhận ít nhất 1 update/chu kỳ billing), 100 GiB bandwidth, 20 GiB storage — theo [Expo Pricing](https://expo.dev/pricing). Với quy mô app cá nhân/early-stage, free tier này thường đủ dùng một thời gian dài trước khi cần nâng cấp.

Lưu ý: EAS Update chỉ cập nhật được phần JS-only — không thay thế được việc phải build lại + submit lại khi thay đổi native code, app icon, permission, hoặc nâng cấp SDK Expo.

## Khuyến nghị hành động cho repo này

Repo hiện chưa có `eas.json`, chưa cài `eas-cli`, chưa có EAS project liên kết. Thứ tự việc cần làm, theo đúng chi phí tăng dần:

1. **Ngay bây giờ, 0 đồng:** cài Expo Go trên điện thoại Android và iPhone thật, chạy `npx expo start`, quét QR để test Vimo trực tiếp. Không cần EAS, không cần tài khoản trả phí nào.
2. **Khi cần build binary để test kỹ hơn (native config, kiểm tra behavior gần với production) hoặc chia sẻ cho người dùng thử ngoài Expo Go:**
   - `npm install -g eas-cli` (hoặc `npx eas-cli`), `eas login`, `eas build:configure` để sinh `eas.json` và liên kết project với tài khoản Expo (miễn phí để tạo tài khoản Expo).
   - Thêm build profile `preview` với `"distribution": "internal"`.
   - `eas build --profile preview --platform android` — free tier, ra APK cài trực tiếp, không cần tài khoản Google/Apple trả phí.
   - Muốn bản iOS tương đương để cài lên iPhone người khác thử (không phải máy bạn) thì bắt buộc phải trả 99 USD Apple Developer Program trước, sau đó `eas device:create` đăng ký UDID rồi build ad-hoc.
3. **Khi quyết định phát hành công khai:**
   - Trả 99 USD Apple Developer Program + 25 USD Google Play Console (đăng ký một lần cho Google).
   - Điền `ios.bundleIdentifier` và `android.package` trong `app.json` (hiện đang thiếu, theo mô tả repo).
   - `eas build --profile production --platform all` rồi `eas submit --platform all` — chạy được toàn bộ từ Windows, không cần Mac.
4. **Sau khi lên store:** dùng `eas update` (EAS Update) cho các bản vá JS nhỏ giữa các lần release native, tránh phải chờ review store cho mỗi thay đổi nhỏ.

Tổng chi phí tối thiểu để **có mặt công khai trên cả hai store**: **99 USD (Apple, hàng năm) + 25 USD (Google, một lần)** ở năm đầu — không có cách hợp pháp nào để bỏ qua hai khoản này nếu mục tiêu là App Store + Google Play chính thức. Nếu mục tiêu chỉ là "cài được trên điện thoại", Android miễn phí hoàn toàn qua APK; iOS miễn phí nếu chỉ cài lên máy của chính bạn qua Xcode.

## Nguồn tham khảo

- [Expo Pricing](https://expo.dev/pricing)
- [EAS Build — Introduction](https://docs.expo.dev/build/introduction/)
- [EAS JSON](https://docs.expo.dev/build/eas-json/)
- [EAS Build — Internal distribution](https://docs.expo.dev/build/internal-distribution/)
- [EAS Submit — Introduction](https://docs.expo.dev/submit/introduction/)
- [Submit to the Apple App Store with EAS Submit](https://docs.expo.dev/submit/ios/)
- [EAS Update — Introduction](https://docs.expo.dev/eas-update/introduction/)
- [Introduction to development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Go — App Store listing](https://apps.apple.com/us/app/expo-go/id982107779)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [Apple — Compare Memberships (Free vs Paid)](https://developer.apple.com/support/compare-memberships/)
- [Google Play Console Help — Đăng ký tài khoản nhà phát triển](https://support.google.com/googleplay/android-developer/answer/6112435)
