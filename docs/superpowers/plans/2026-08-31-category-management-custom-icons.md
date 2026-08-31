# Category Management with Custom Icons & Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tính năng Quản lý danh mục thu chi toàn diện theo chuẩn **Vela Design System**, hỗ trợ tùy chọn icon phong phú (bao gồm mạng xã hội/thương hiệu hot và biểu tượng đời sống) và bảng màu badge 16 màu, tích hợp và đồng bộ trên toàn bộ ứng dụng.

**Architecture:** Mở rộng domain model `Category` và SQLite schema để lưu trữ `icon` và `color`. Xây dựng icon registry phân nhóm theo chủ đề hỗ trợ tìm kiếm từ khóa tiếng Việt/Anh, kết hợp `@expo/vector-icons` (FontAwesome6 Brands + MaterialCommunityIcons) và Lucide. Tạo component `CategoryIcon`, `IconPickerSheet`, `CategoryFormSheet`, nâng cấp `CategoriesScreen` theo chuẩn Vela Design, và đồng bộ hiển thị icon/màu custom sang toàn bộ các màn hình giao dịch, báo cáo, định kỳ.

**Tech Stack:** React Native (Expo SDK 54), `@expo/vector-icons` (FontAwesome6, MaterialCommunityIcons), `lucide-react-native`, TypeScript, Drizzle ORM (expo-sqlite / better-sqlite3), Jest, React Native Testing Library.

**Spec:** [`docs/superpowers/specs/2026-08-31-category-management-custom-icons-design.md`](file:///Users/phucndh/PhucNDH/money/docs/superpowers/specs/2026-08-31-category-management-custom-icons-design.md)

## Global Constraints

- Mọi icon hiển thị trên badge tròn `radius.circle` với màu nền custom và icon màu trắng `#FFFFFF` (`colors.content.inverse`).
- Tên copy tiếng Việt thân thiện, rõ ràng, font Manrope, không emoji thô sơ trong văn bản.
- Tất cả thay đổi schema SQLite phải có fallback giá trị mặc định cho dữ liệu hiện có (`icon: 'mci:shapes'`, `color: '#2F6FED'`).
- Mọi thao tác ẩn danh mục (soft delete/hide) không làm mất lịch sử giao dịch liên kết.
- Giữ vững toàn bộ các test hiện có và thêm test mới với độ bao phủ cao.

---

### Task 1: Cài đặt `@expo/vector-icons` & Xây dựng Icon Registry, Color Palette, Dynamic `CategoryIcon`

**Files:**
- Modify: `package.json`
- Create: `src/components/finance/category-colors.ts`
- Create: `src/components/finance/category-icon-registry.ts`
- Modify: `src/components/finance/icons.tsx`
- Modify: `src/components/finance/index.ts`
- Test: `tests/components/finance/category-icons.test.tsx`

**Interfaces:**
- Consumes: `@expo/vector-icons`, `src/theme/index.ts`
- Produces:
  - `VELA_CATEGORY_COLORS`: readonly string[] (16 mã màu chuẩn Vela)
  - `CategoryIconDefinition`: `{ id: string; nameVi: string; nameEn: string; category: IconGroup; library: 'fa6' | 'mci' | 'lucide'; iconName: string; tags: string[] }`
  - `CATEGORY_ICON_REGISTRY`: readonly CategoryIconDefinition[]
  - `CategoryIcon`: `({ icon, color, size, iconSize }: { icon: string; color?: string; size?: number; iconSize?: number }) => JSX.Element`

- [ ] **Step 1: Write the failing test for CategoryIcon & Icon Registry**

```tsx
// tests/components/finance/category-icons.test.tsx
import { render } from '@testing-library/react-native';
import { CategoryIcon } from '@/components/finance/icons';
import { CATEGORY_ICON_REGISTRY } from '@/components/finance/category-icon-registry';
import { VELA_CATEGORY_COLORS } from '@/components/finance/category-colors';

describe('CategoryIcon & Registries', () => {
  it('has 16 colors in VELA_CATEGORY_COLORS', () => {
    expect(VELA_CATEGORY_COLORS.length).toBe(16);
    expect(VELA_CATEGORY_COLORS).toContain('#F2734A');
    expect(VELA_CATEGORY_COLORS).toContain('#1DB954');
    expect(VELA_CATEGORY_COLORS).toContain('#010101');
  });

  it('contains social and brand icons in CATEGORY_ICON_REGISTRY', () => {
    const ids = CATEGORY_ICON_REGISTRY.map((i) => i.id);
    expect(ids).toContain('fa6:tiktok');
    expect(ids).toContain('fa6:spotify');
    expect(ids).toContain('fa6:youtube');
    expect(ids).toContain('fa6:facebook');
    expect(ids).toContain('fa6:instagram');
  });

  it('renders CategoryIcon with fa6 icon and custom color', () => {
    const { getByTestId } = render(
      <CategoryIcon color="#1DB954" icon="fa6:spotify" testID="cat-icon-spotify" />,
    );
    expect(getByTestId('cat-icon-spotify')).toBeTruthy();
  });

  it('renders CategoryIcon with legacy fallback icon name', () => {
    const { getByTestId } = render(
      <CategoryIcon color="#F59E0B" icon="food" testID="cat-icon-food" />,
    );
    expect(getByTestId('cat-icon-food')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/finance/category-icons.test.tsx`
Expected: FAIL

- [ ] **Step 3: Install `@expo/vector-icons` and implement registries & CategoryIcon**

Run: `npx expo install @expo/vector-icons`
Implement:
- `src/components/finance/category-colors.ts`
- `src/components/finance/category-icon-registry.ts`
- `src/components/finance/icons.tsx`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/finance/category-icons.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/finance/ tests/components/finance/
git commit -m "feat(categories): add expo vector icons, category icon registry, and dynamic CategoryIcon component"
```

---

### Task 2: Cập nhật Domain Model, SQLite Schema, Repository & Sync Validator

**Files:**
- Modify: `src/core/domain/finance/category.ts`
- Modify: `src/core/application/ports/finance-repositories.ts`
- Modify: `src/core/application/finance/manage-categories.ts`
- Modify: `src/core/application/finance/default-categories.ts`
- Modify: `src/data/local/schema/categories.ts`
- Modify: `src/data/local/repositories/finance-record-mappers.ts`
- Modify: `src/data/local/repositories/category-repository.ts`
- Modify: `src/data/sync/sync-engine/finance-payload-validators.ts`
- Test: `tests/data/local/repositories/category-repository.test.ts`
- Test: `tests/data/sync/sync-engine/finance-payload-validators.test.ts`

**Interfaces:**
- `Category`: `{ id: string; name: string; type: CategoryType; icon: string; color: string; isArchived: boolean; ... }`
- `CreateCategoryInput`: `{ id: string; name: string; type: CategoryType; icon?: string; color?: string; ... }`
- `UpdateCategoryInput`: `{ name?: string; type?: CategoryType; icon?: string; color?: string; }`

- [ ] **Step 1: Write the failing tests for category repository and validator**

Add tests asserting that `CategoryRepository.create` and `update` persist and retrieve `icon` and `color`, and `parseCategoryPayload` validates `icon` and `color`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/data/local/repositories/category-repository.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement domain, schema, mapper, repo, and validator updates**

Update `category.ts`, `finance-repositories.ts`, `schema/categories.ts`, `finance-record-mappers.ts`, `category-repository.ts`, `manage-categories.ts`, `default-categories.ts`, and `finance-payload-validators.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/data/local/repositories/category-repository.test.ts tests/data/sync/sync-engine/finance-payload-validators.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/ src/data/ tests/data/
git commit -m "feat(categories): extend category domain model, sqlite schema, and sync validator with icon and color"
```

---

### Task 3: Xây dựng Component `ColorPicker` và `IconPickerSheet`

**Files:**
- Create: `src/components/finance/ColorPicker.tsx`
- Create: `src/components/finance/IconPickerSheet.tsx`
- Modify: `src/components/finance/index.ts`
- Test: `tests/components/finance/icon-picker-sheet.test.tsx`

**Interfaces:**
- `ColorPicker`: `({ selectedColor, onSelectColor }: { selectedColor: string; onSelectColor: (color: string) => void }) => JSX.Element`
- `IconPickerSheet`: `({ visible, selectedIcon, selectedColor, onSelectIcon, onClose }: IconPickerSheetProps) => JSX.Element`

- [ ] **Step 1: Write the failing test for IconPickerSheet & ColorPicker**

Test search filtering (e.g. searching "tiktok" shows TikTok icon, searching "cà phê" shows Coffee icon), group tabs filtering, and selecting color/icon.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/finance/icon-picker-sheet.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ColorPicker and IconPickerSheet**

Build:
- `ColorPicker.tsx`: Grid 8x2 displaying 16 colors with active ring and pressable feedback.
- `IconPickerSheet.tsx`: Using `Sheet` from `@/components/base`, search input with clear button, horizontal scroll tabs for categories, 5-column grid of icons.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/finance/icon-picker-sheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/ tests/components/finance/
git commit -m "feat(categories): implement ColorPicker and IconPickerSheet components"
```

---

### Task 4: Xây dựng Component `CategoryFormSheet` & Nâng cấp View Model `useSettings`

**Files:**
- Create: `src/components/finance/CategoryFormSheet.tsx`
- Modify: `src/features/finance/view-models/use-settings.ts`
- Modify: `src/components/finance/index.ts`
- Test: `tests/components/finance/category-form-sheet.test.tsx`
- Test: `tests/features/finance/view-models/use-settings.test.ts`

**Interfaces:**
- `useSettings`: provides `categoryIcon`, `categoryColor`, `setCategoryIcon(icon)`, `setCategoryColor(color)`, `saveCategory()`, `beginEditCategory(cat)`, `addCategory()`, etc.
- `CategoryFormSheet`: `({ visible, editingCategory, onClose, onSave, onHide }: CategoryFormSheetProps) => JSX.Element`

- [ ] **Step 1: Write failing tests for CategoryFormSheet & useSettings**

Verify live preview badge, icon change trigger, color selection, name input, and save execution.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/finance/category-form-sheet.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement CategoryFormSheet and update useSettings**

Implement `CategoryFormSheet.tsx` with Live Preview, Name input, Type SegmentedControl, Icon selector, ColorPicker, and PrimaryButton. Update `use-settings.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/finance/category-form-sheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/CategoryFormSheet.tsx src/features/finance/view-models/use-settings.ts tests/
git commit -m "feat(categories): add CategoryFormSheet with live preview and integrate into useSettings"
```

---

### Task 5: Thiết kế lại `CategoriesScreen` theo chuẩn Vela Design System

**Files:**
- Modify: `src/features/finance/screens/categories-screen.tsx`
- Modify: `src/i18n/locales/vi.ts`
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/features/finance/screens/settings-screen.tsx` (Thêm hàng chuyển đến Quản lý danh mục)
- Test: `tests/features/finance/screens/categories-screen.test.tsx`

**Interfaces:**
- `CategoriesScreen`: `({ t, onBack, ...settingsViewModel }: CategoriesScreenProps) => JSX.Element`

- [ ] **Step 1: Write failing tests for redesigned CategoriesScreen**

Test header navigation, switching Expense/Income tabs, opening CategoryFormSheet on add / edit, and confirming hide category.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/finance/screens/categories-screen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement CategoriesScreen according to Vela Design System**

Implement:
- Top bar with rounded Back button, Title, "+ Thêm" button.
- SegmentedControl for "Chi tiêu" / "Thu nhập".
- Card list container with `CategoryIcon` badge, category name, Edit & Delete/Hide buttons.
- CategoryFormSheet integration.
- Update `vi.ts` & `en.ts` with all copy.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/finance/screens/categories-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/screens/ src/i18n/ tests/
git commit -m "feat(categories): redesign CategoriesScreen with Vela Design System"
```

---

### Task 6: Đồng bộ Hiển thị Custom Icon & Color trên toàn Ứng dụng

**Files:**
- Modify: `src/features/finance/view-models/transaction-presentation.ts`
- Modify: `src/components/finance/TransactionRow.tsx`
- Modify: `src/components/finance/CategoryPicker.tsx`
- Modify: `src/components/finance/TransactionDetailSheet.tsx`
- Modify: `src/components/finance/BudgetRow.tsx`
- Modify: `src/features/finance/screens/recurring-management-screen.tsx`
- Modify: `src/app/index.tsx`
- Test: `tests/features/finance/view-models/transaction-presentation.test.ts`
- Test: `tests/components/finance/cards.test.tsx`

- [ ] **Step 1: Write failing tests for app-wide category presentation**

Ensure `buildTransactionListItem` resolves icon and color from `category.icon` and `category.color`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/finance/view-models/transaction-presentation.test.ts`
Expected: FAIL

- [ ] **Step 3: Update presentation helpers and components**

Update `transaction-presentation.ts`, `TransactionRow.tsx`, `CategoryPicker.tsx`, `TransactionDetailSheet.tsx`, `BudgetRow.tsx`, `recurring-management-screen.tsx`.

- [ ] **Step 4: Run test to verify all tests pass**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ tests/
git commit -m "feat(categories): synchronize custom category icons and colors across all app screens"
```

---

### Task 7: Toàn bộ Verification & Lint

- [ ] **Step 1: Run typecheck**
Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Run linter**
Run: `npm run lint`
Expected: 0 lint errors.

- [ ] **Step 3: Run full test suite**
Run: `npm test`
Expected: 100% tests passing.
