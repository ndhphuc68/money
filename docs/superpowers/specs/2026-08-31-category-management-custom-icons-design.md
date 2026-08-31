# Category Management with Custom Icons & Colors — Design Spec

**Goal:** Triển khai tính năng Quản lý danh mục thu chi toàn diện theo ngôn ngữ thiết kế **Vela Design System**, cho phép người dùng tùy biến icon (hỗ trợ đầy đủ các mạng xã hội & thương hiệu hot hiện nay như TikTok, Spotify, YouTube, Netflix, Facebook, Instagram,... cùng các biểu tượng đời sống) và bảng màu badge trực quan, tích hợp mượt mà và đồng bộ trên toàn bộ ứng dụng.

**Non-goal:** Không hỗ trợ upload ảnh bitmap tùy ý từ thư viện ảnh máy (để đảm bảo tính đồng nhất về mặt đồ họa vector stroke/fill của ứng dụng và tối ưu dung lượng sync offline-first).

---

## 1. Context & Yêu cầu người dùng

- **Trải nghiệm hiện tại**: Màn hình `CategoriesScreen` còn ở dạng sơ khai (chỉ có text input đơn giản và danh sách phẳng), chưa có icon hay màu sắc được lưu trong cơ sở dữ liệu (hiện tại `resolveCategoryIcon` chỉ đoán icon dựa trên từ khóa tên danh mục).
- **Mong muốn của người dùng**:
  - Quản lý danh mục: Xem danh sách danh mục theo 2 tab Thu / Chi, thêm mới, sửa tên, đổi icon, đổi màu, ẩn/xóa danh mục.
  - Chọn icon có phân nhóm theo chủ đề (Mạng xã hội & Giải trí, Ăn uống, Di chuyển, Hóa đơn, Mua sắm, Sức khỏe, Thu nhập/Đầu tư,...) và có thanh tìm kiếm (gõ từ khóa tiếng Việt hoặc tiếng Anh để lọc icon tức thì).
  - Thư viện icon phong phú, chứa đầy đủ các icon thương hiệu / mạng xã hội (TikTok, Spotify, Netflix, YouTube, Facebook, Instagram, Apple, Discord, Google, Steam, v.v.).
  - Tùy chọn màu nền badge từ bảng màu 16 màu chuẩn Vela, có Live Preview badge ngay khi chọn.
  - Tích hợp hiển thị icon & màu custom trên toàn app (Transaction list, Transaction detail, Transaction form, Reports, Recurring).

---

## 2. Kiến trúc Data Model & Database

### a. Domain Model `Category` (`src/core/domain/finance/category.ts`)
Mở rộng type `Category`:
```ts
export type CategoryType = 'income' | 'expense';

export type Category = FinanceRecord & {
  name: string;
  type: CategoryType;
  icon: string;   // Identifier định dạng 'library:icon-name', vd: 'fa6:tiktok', 'fa6:spotify', 'mci:silverware-fork-knife', 'lucide:coffee'
  color: string;  // Mã màu hex, vd: '#1DB954', '#F2734A', '#22C55E', '#010101'
  isArchived: boolean;
};
```

### b. Database Schema (`src/data/local/schema/categories.ts`)
Thêm 2 cột `icon` và `color` với giá trị mặc định fallback:
```ts
export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    icon: text('icon').notNull().default('lucide:shapes'),
    color: text('color').notNull().default('#2F6FED'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    revision: integer('revision').notNull(),
    originDeviceId: text('origin_device_id').notNull(),
  },
  (table) => [check('categories_type_check', sql`${table.type} in ('income', 'expense')`)],
);
```

### c. Input Ports & Repository
- `CreateCategoryInput`: bổ sung `icon?: string`, `color?: string` (tự động gán default nếu không truyền).
- `UpdateCategoryInput`: bổ sung `icon?: string`, `color?: string`.
- `finance-record-mappers.ts`: map 2 chiều giữa DB row và Entity có fallback an toàn.
- `finance-payload-validators.ts`: kiểm tra `icon` và `color` (dạng chuỗi hợp lệ) trong payload sync.

### d. Seed Categories Mặc định (`src/core/application/finance/default-categories.ts`)
Cập nhật 11 danh mục mặc định ban đầu với icon và màu sắc tương ứng:
- **Ăn uống**: `icon: 'mci:silverware-fork-knife'`, `color: '#F59E0B'` (Amber)
- **Di chuyển**: `icon: 'fa6:car-side'`, `color: '#8B5CF6'` (Violet)
- **Nhà ở**: `icon: 'fa6:house'`, `color: '#06B6D4'` (Cyan)
- **Hóa đơn & tiện ích**: `icon: 'mci:receipt-text'`, `color: '#3B82F6'` (Blue)
- **Mua sắm**: `icon: 'fa6:bag-shopping'`, `color: '#EC4899'` (Pink)
- **Giải trí**: `icon: 'fa6:gamepad'`, `color: '#6366F1'` (Indigo)
- **Sức khỏe**: `icon: 'fa6:heart-pulse'`, `color: '#EF4444'` (Red)
- **Chi tiêu khác**: `icon: 'fa6:shapes'`, `color: '#64748B'` (Slate)
- **Lương**: `icon: 'fa6:money-bill-wave'`, `color: '#10B981'` (Emerald)
- **Thưởng**: `icon: 'fa6:gift'`, `color: '#F59E0B'` (Amber)
- **Thu nhập khác**: `icon: 'fa6:wallet'`, `color: '#2F6FED'` (Vela Blue)

---

## 3. Icon Engine & Color Palette

### a. Icon Registry (`src/components/finance/category-icon-registry.ts`)
Xây dựng registry danh mục icon phong phú gồm ~60–80 icon tuyển chọn, phân theo 8 nhóm chủ đề, có gán tags tiếng Việt và tiếng Anh để phục vụ tìm kiếm:
1. **Mạng xã hội & Giải trí (`brands_media`)**:
   - `fa6:tiktok` (TikTok - video, mxh, giải trí, xu hướng)
   - `fa6:spotify` (Spotify - nhạc, podcast, streaming)
   - `fa6:youtube` (YouTube - video, clip, phim, giải trí)
   - `fa6:facebook` (Facebook - fb, mxh, bạn bè)
   - `fa6:instagram` (Instagram - insta, ảnh, story)
   - `fa6:apple` (Apple - icloud, app store, apple music, itunes)
   - `fa6:google` (Google - drive, mail, youtube, play)
   - `fa6:discord` (Discord - chat, game, voice, server)
   - `fa6:steam` (Steam - game, nạp game, bản quyền)
   - `fa6:twitch` (Twitch - stream, livestream, game)
   - `fa6:film` (Netflix / Phim ảnh - rạp chiếu, rạp phim, điện ảnh)
   - `fa6:gamepad` (Chơi game - ps5, nintendo, pc game)
   - `fa6:music` (Âm nhạc - tai nghe, hòa nhạc, vé xem show)
2. **Ăn uống & Cà phê (`food_drink`)**:
   - `mci:silverware-fork-knife` (Ăn tiệm, nhà hàng, quán ăn)
   - `fa6:mug-hot` (Cà phê, trà, trà sữa, cafe, highland, phúc long)
   - `fa6:burger` (Fast food, đồ ăn nhanh, bánh mì, gà rán)
   - `fa6:pizza-slice` (Pizza, đồ âu, tiệc tùng)
   - `fa6:beer-mug-empty` (Bia, nhậu, bar, pub, liên hoan)
   - `mci:cupcake` (Bánh ngọt, đồ tráng miệng, ăn vặt)
   - `mci:fruit-cherries` (Trái cây, hoa quả, đồ tươi)
3. **Di chuyển & Phương tiện (`transport`)**:
   - `fa6:motorcycle` (Xe máy, honda, yamaha, gửi xe, sửa xe)
   - `fa6:car-side` (Ô tô, taxi, grabcar, be, dịch vụ xe)
   - `fa6:gas-pump` (Xăng dầu, cây xăng, bảo dưỡng)
   - `fa6:bus` (Xe buýt, bus, xe khách)
   - `fa6:plane` (Máy bay, vé máy bay, du lịch, công tác)
   - `fa6:train` (Tàu hỏa, metro, đường sắt)
4. **Hóa đơn & Tiện ích (`bills_utilities`)**:
   - `fa6:bolt` (Tiền điện, điện sinh hoạt)
   - `fa6:faucet-drip` (Tiền nước, nước sạch)
   - `fa6:wifi` (Internet, mạng wifi, cước viễn thông)
   - `fa6:mobile-screen` (Điện thoại, nạp thẻ cào, 4G/5G)
   - `fa6:house` (Tiền thuê nhà, chung cư, dịch vụ tòa nhà)
   - `mci:shield-check` (Bảo hiểm, nhân thọ, y tế, xe máy)
5. **Mua sắm & Đời sống (`shopping_lifestyle`)**:
   - `fa6:cart-shopping` (Siêu thị, chợ, bách hóa, go, winmart)
   - `fa6:bag-shopping` (Mua sắm, shop, đồ dùng, shopee, lazada, tiktok shop)
   - `fa6:shirt` (Quần áo, thời trang, phụ kiện, may mặc)
   - `mci:shoe-sneaker` (Giày dép, thể thao, sneakers)
   - `mci:spray-bottle` (Mỹ phẩm, skincare, làm đẹp, cắt tóc, spa)
   - `fa6:couch` (Nội thất, đồ gia dụng, trang trí nhà)
   - `fa6:laptop` (Đồ công nghệ, laptop, linh kiện)
6. **Sức khỏe & Giáo dục (`health_education`)**:
   - `fa6:heart-pulse` (Sức khỏe, khám bệnh, thuốc men, nhà thuốc)
   - `fa6:dumbbell` (Phòng gym, thể hình, yoga, thể thao)
   - `fa6:book-open` (Sách vở, giáo trình, học tập)
   - `fa6:graduation-cap` (Học phí, khóa học, chứng chỉ)
   - `fa6:paw` (Thú cưng, chó mèo, thức ăn thú cưng, thú y)
7. **Thu nhập & Đầu tư (`income_finance`)**:
   - `fa6:money-bill-wave` (Tiền lương, thu nhập chính)
   - `fa6:gift` (Tiền thưởng, lì xì, quà tặng)
   - `fa6:chart-line` (Đầu tư, chứng khoán, cổ phiếu, quỹ)
   - `fa6:coins` (Tiền lãi, tiết kiệm, cổ tức)
   - `fa6:building-columns` (Ngân hàng, chuyển khoản, kiều hối)
   - `fa6:gem` (Vàng bạc, trang sức, tài sản quý)
   - `fa6:briefcase` (Làm thêm, freelance, dự án ngoài)

### b. Unified Component `CategoryIcon` (`src/components/finance/icons.tsx`)
Render icon động dựa vào chuỗi `icon: string` và `color: string`:
- Nếu `icon` bắt đầu bằng `fa6:` -> Render từ `FontAwesome6` (`@expo/vector-icons`).
- Nếu `icon` bắt đầu bằng `mci:` -> Render từ `MaterialCommunityIcons` (`@expo/vector-icons`).
- Fallback: icon Lucide hoặc Category default.
- Badge bo tròn `radius.circle`, màu nền `color`, kích thước tùy biến (mặc định 40x40, icon trắng size 18–20).

### c. Vela Color Palette (`src/theme/colors.ts` & `src/components/finance/category-colors.ts`)
Danh sách 16 mã màu chuẩn Vela:
```ts
export const VELA_CATEGORY_COLORS = [
  '#F2734A', // Vela Coral
  '#2F6FED', // Vela Blue
  '#10B981', // Emerald Green
  '#F59E0B', // Amber Gold
  '#8B5CF6', // Purple Violet
  '#EC4899', // Rose Pink
  '#06B6D4', // Cyan Teal
  '#6366F1', // Indigo
  '#EA580C', // Deep Orange
  '#010101', // Pure Dark / TikTok
  '#1DB954', // Spotify Green
  '#FF0000', // YouTube Red
  '#1877F2', // Facebook Blue
  '#0EA5E9', // Sky Blue
  '#E11D48', // Crimson Red
  '#64748B', // Slate Muted
] as const;
```

---

## 4. Thiết kế Giao diện & Luồng Người dùng (UI/UX Flow)

### a. Màn hình `CategoriesScreen` (`src/features/finance/screens/categories-screen.tsx`)
- **Header**:
  - Nút Back hình tròn bo góc mềm, bóng card (`shadows.card`).
  - Tiêu đề "Danh mục thu chi".
  - Nút "+ Thêm mới" (Primary button thu gọn hoặc FAB).
- **Segmented Tabs**: Hai tab "Chi tiêu" và "Thu nhập" sử dụng pill chips chuẩn Vela.
- **Danh sách Danh mục**:
  - Render theo thẻ Card trắng bo góc 18px.
  - Mỗi dòng (Row) gồm:
    - Badge tròn hiển thị icon + màu nền custom.
    - Tên danh mục (Font Manrope Semibold/Bold).
    - Cụm nút hành động: Nút Edit (icon bút chì) và Nút Hide/Delete (icon thùng rác).
  - Nhấn vào hàng hoặc nút Edit sẽ mở `CategoryFormSheet` ở chế độ chỉnh sửa.
  - Nhấn Hide sẽ hiển thị `Alert.alert` xác nhận ẩn danh mục khỏi danh sách lựa chọn mà vẫn bảo lưu lịch sử giao dịch.

### b. Form Bottom Sheet `CategoryFormSheet` (`src/components/finance/CategoryFormSheet.tsx`)
Sử dụng component `Sheet` từ `@/components/base`:
1. **Live Preview Header**:
   - Hiển thị badge icon lớn ở giữa cùng màu nền người dùng vừa chọn.
   - Text preview tên danh mục cập nhật realtime khi gõ phím.
2. **Loại danh mục**: Segmented Control chuyển đổi nhanh Chi tiêu / Thu nhập.
3. **Tên danh mục**: Ô nhập text chuẩn Vela (Label "Tên danh mục", Placeholder "vd: Cà phê, Spotify, Tiền phòng...").
4. **Nút Chọn Icon**:
   - Khung chọn icon trực quan hiển thị icon hiện tại và nhãn "Đổi biểu tượng" -> Nhấn vào sẽ mở `IconPickerSheet`.
5. **Bảng Chọn Màu (Color Palette)**:
   - Lưới 8x2 các chấm màu tròn 36px.
   - Chấm màu đang chọn sẽ có vòng viền trắng + shadow/outline active rõ nét.
6. **Nút Hành động**:
   - Nút "Lưu danh mục" (Primary button).
   - Nút "Ẩn danh mục này" (Destructive text/button) hiển thị khi ở chế độ Edit.

### c. Sheet Chọn Icon `IconPickerSheet` (`src/components/finance/IconPickerSheet.tsx`)
- **Search Bar**: Ô tìm kiếm có icon kính lúp, hỗ trợ tìm theo từ khóa không dấu / có dấu (vd: gõ "tik", "fb", "an", "ca phe", "dien", "xe").
- **Tabs Phân nhóm**: Thanh cuộn ngang các tab chủ đề: "Tất cả", "Mạng xã hội", "Ăn uống", "Di chuyển", "Hóa đơn", "Mua sắm", "Sức khỏe", "Thu nhập".
- **Lưới Icon**: Lưới 5 cột các icon dạng nút tròn hoặc bo góc mềm. Chạm vào bất kỳ icon nào sẽ chọn ngay lập tức và đóng sheet (hoặc cập nhật live preview).

---

## 5. Tích hợp & Đồng bộ trên Toàn Ứng dụng

1. **`TransactionRow.tsx` & `transaction-presentation.ts`**:
   - Hàm `buildTransactionListItem` lấy trực tiếp `category.icon` và `category.color` từ `Category` đã lưu để truyền vào `TransactionRow`.
2. **`CategoryPicker.tsx`**:
   - Hiển thị các danh mục dạng chip hoặc thẻ có icon badge nhỏ màu sắc tương ứng bên cạnh tên.
3. **`TransactionDetailSheet.tsx`**:
   - Hiển thị badge tròn to với icon + màu nền custom của danh mục đã chọn cho giao dịch.
4. **`ReportsScreen.tsx` & `BudgetRow.tsx` & `RecurringManagementScreen.tsx`**:
   - Hiển thị màu và icon chính xác của từng danh mục.

---

## 6. Kế hoạch Kiểm thử & Xác minh (Verification Plan)

### a. Automated Tests
- **Data & Migration Tests**: Kiểm tra `CategoryRepository` create/update lưu đúng `icon` và `color`; kiểm tra `finance-record-mappers` map chính xác; kiểm tra `parseCategoryPayload` validate hợp lệ.
- **View Model Tests**: Kiểm tra `useSettings` thực hiện add/edit/hide danh mục với `icon` và `color`.
- **Component Tests**:
  - Test `CategoryIcon` render đúng các prefix `fa6:`, `mci:`, fallback.
  - Test `IconPickerSheet` tìm kiếm lọc đúng icon theo từ khóa.
  - Test `CategoryFormSheet` và `CategoriesScreen` hiển thị danh sách và xử lý thao tác thêm/sửa/ẩn.

### b. Typecheck & Lint
- Chạy `npm run typecheck` đảm bảo không có lỗi TypeScript.
- Chạy `npm run lint` đảm bảo code tuân thủ chuẩn ESLint và Prettier.
