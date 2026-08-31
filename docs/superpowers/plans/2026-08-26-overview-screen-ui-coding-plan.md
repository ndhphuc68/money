# Tổng quan Screen UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đồng bộ màn hình Tổng quan React Native với prototype `design/All Screens.dc.html`, giữ nguyên dữ liệu MVP hiện có và bổ sung shell điều hướng giống thiết kế.

**Architecture:** `DashboardScreen` chịu trách nhiệm layout và interaction presentation; `useDashboard` tiếp tục là lớp chuyển aggregate thành text hiển thị; `src/app/index.tsx` sở hữu state điều hướng. Các primitive hiện có (`BalanceCard`, `StatCard`, `TransactionRow`, `BottomNav`) được tái sử dụng và chỉ tách component khi có trách nhiệm riêng.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, `lucide-react-native`, Jest và `@testing-library/react-native`.

**Spec:** `design/All Screens.dc.html` và màn hình được import từ `design/Finance App.dc.html`.

## Global Constraints

- Giữ kiến trúc local-first/offline và các interface repository/use case hiện tại.
- Không thêm dependency UI/icon mới; dùng token trong `src/theme` và icon SVG/Lucide hiện có.
- Giữ hỗ trợ tiếng Việt/English qua `Translate`; mọi text mới phải đi qua `src/i18n/translations.ts`.
- Không đưa tính năng ngân sách thật vào task UI này: codebase hiện chưa có budget domain/repository; chỉ dùng dữ liệu dashboard hiện có.
- Không ghi đè các thay đổi đang có trong worktree; các file dirty phải được merge cẩn thận.
- Touch target tối thiểu 44x44, có accessibility label/state, không phụ thuộc hover.

## UI decisions from review

- Prototype là source of truth cho hierarchy: greeting header → balance card → monthly stats → recent transactions → lower summary → bottom navigation với FAB nổi.
- Prototype có “Ngân sách theo danh mục”, nhưng MVP code chỉ có `categorySpending` và chưa có limit. Plan giữ section dữ liệu hiện tại, đổi presentation thành card/list rõ ràng; không hiển thị limit giả.
- Giữ `net` vì đây là dữ liệu MVP và roadmap yêu cầu dòng tiền ròng; layout dùng 3 stat card responsive thay vì loại bỏ dữ liệu nghiệp vụ.
- Các quick links Reports/Settings/Sync hiện đang là workaround; sau khi bottom nav được wire, bỏ chúng khỏi cuối dashboard để tránh điều hướng trùng lặp.

---

### Task 1: Chuẩn hóa dashboard presentation model và copy

**Files:**

- Modify: `src/features/finance/view-models/use-dashboard.ts`
- Modify: `src/i18n/translations.ts`
- Test: `tests/features/finance/dashboard.test.tsx`

**Interfaces:**

- Produces: dashboard labels for greeting/user identity, balance metadata, stats, category summary, recent transactions, and empty/loading states.
- Consumes: existing `GetDashboard`, account/category/profile repositories; no new repository contract.

- [ ] **Step 1: Add failing assertions for the required dashboard copy and states.** Verify that the rendered dashboard exposes greeting text, section titles, add-transaction label, and the existing net/category empty-state labels through `t()`.
- [ ] **Step 2: Run `npm test -- --runInBand tests/features/finance/dashboard.test.tsx` and confirm the new assertions fail for missing presentation data or labels.
- [ ] **Step 3: Add only the translation keys and view-model fields needed by the prototype hierarchy. Use `ProfileSettings.displayName` for the greeting and use the literal localized fallback from `t('dashboardGuestName')` when it is empty; do not add a new repository or domain field.
- [ ] **Step 4: Run `npm test -- --runInBand tests/features/finance/dashboard.test.tsx` and confirm all dashboard tests pass.
- [ ] **Step 5: Run `npm run typecheck`.

### Task 2: Rebuild the Tổng quan content layout

**Files:**

- Modify: `src/features/finance/screens/dashboard-screen.tsx`
- Modify: `src/components/finance/BalanceCard.tsx`
- Modify: `src/components/finance/StatCard.tsx`
- Modify: `src/components/finance/TransactionRow.tsx`
- Test: `tests/features/finance/dashboard.test.tsx`
- Test: `tests/components/finance/cards.test.tsx`

**Interfaces:**

- Consumes: `DashboardViewModel` labels and callbacks from Task 1; existing card component props remain backwards-compatible.
- Produces: a scrollable dashboard with prototype order, pressed states, accessible balance toggle, empty states, and no duplicate quick-link footer.

- [ ] **Step 1: Add failing component assertions for the greeting/header, three stat cards, category summary card, recent transaction action, and the absence of the old inline full-width add button.
- [ ] **Step 2: Run `npm test -- --runInBand tests/features/finance/dashboard.test.tsx tests/components/finance/cards.test.tsx` and confirm the layout assertions fail.
- [ ] **Step 3: Implement the layout using theme tokens: canvas `colors.surface.canvas`, white rounded cards, `radius.lg/xl`, existing elevated/card shadows, 20px horizontal screen padding, and spacing consistent with the prototype. Make the content bottom padding large enough for the FAB/nav safe area.
- [ ] **Step 4: Add the greeting header and avatar using text initials, and use an icon-based eye toggle in `BalanceCard` while preserving its accessible show/hide labels.
- [ ] **Step 5: Keep category spending data-driven and render a clear empty state. Do not render budget limits or progress percentages until a budget data contract exists.
- [ ] **Step 6: Make transaction rows pressable with a meaningful accessibility label containing transaction name and amount; preserve divider behavior and truncation.
- [ ] **Step 7: Run the focused tests and `npm run typecheck`.

### Task 3: Wire the prototype bottom navigation and FAB

**Files:**

- Modify: `src/app/index.tsx`
- Modify: `src/components/finance/BottomNav.tsx`
- Modify: `src/components/finance/icons.tsx` if a required nav icon is missing
- Test: `tests/components/finance/navigation.test.tsx`
- Test: `tests/smoke/app-starts.test.ts`

**Interfaces:**

- Consumes: existing `FinanceView` state and screen callbacks.
- Produces: five bottom-nav positions matching the prototype’s geometry: Tổng quan, Giao dịch, FAB Thêm giao dịch, Báo cáo, and Cá nhân. `Báo cáo` preserves the existing route where the prototype says `Mục tiêu`; `Cá nhân` opens the existing Settings screen.

- [ ] **Step 1: Add failing navigation tests that press each nav item/FAB and assert the expected `FinanceView` or form route is selected, plus `accessibilityState.selected` for the active item.
- [ ] **Step 2: Run `npm test -- --runInBand tests/components/finance/navigation.test.tsx tests/smoke/app-starts.test.ts` and confirm failures.
- [ ] **Step 3: Add the bottom nav to the authenticated app shell in `src/app/index.tsx`, outside the dashboard `ScrollView`, so it remains fixed while content scrolls.
- [ ] **Step 4: Map existing routes without creating fake screens: Tổng quan→dashboard, Giao dịch→transactions, FAB→new form, Báo cáo→reports, Cá nhân→settings. Do not create a Goals screen as part of this UI-only task.
- [ ] **Step 5: Ensure bottom-nav padding uses safe-area insets and the FAB remains at least 44x44 with a visible pressed state.
- [ ] **Step 6: Run the focused navigation tests, full `npm test -- --runInBand`, and `npm run typecheck`.

### Task 4: Verify visual behavior and accessibility against the HTML prototype

**Files:**

- Modify: `tests/features/finance/dashboard.test.tsx` if coverage gaps remain
- Modify: `tests/components/finance/navigation.test.tsx` if coverage gaps remain
- Reference: `design/All Screens.dc.html`
- Reference: `design/Finance App.dc.html`

**Interfaces:**

- Consumes: completed dashboard screen and app shell from Tasks 2–3.
- Produces: regression coverage for loading, empty data, hidden amounts, long transaction names, navigation, and actionable controls.

- [ ] **Step 1: Add tests for loading state, empty category/recent sections, hidden amount toggle persistence, long labels, and selected bottom-nav accessibility state.
- [ ] **Step 2: Run `npm test -- --runInBand` and fix only failures caused by this screen change.
- [ ] **Step 3: Run `npm run typecheck`.
- [ ] **Step 4: Manually compare the authenticated `overview` frame in `design/All Screens.dc.html` with the RN screen at narrow phone width: hierarchy, card order, spacing, color contrast, FAB/nav placement, and scroll clearance.
- [ ] **Step 5: Verify that every icon-only control has an accessible label, text remains at least 12px for captions, and the screen has no horizontal overflow or content hidden behind the fixed nav.

## Plan self-review

- Covers the prototype’s overview hierarchy, balance masking, stats, transactions, add action, navigation, responsive/touch behavior, and accessibility.
- Explicitly excludes real budgets because no budget domain/repository exists in the current codebase.
- Keeps existing MVP net cash-flow data and current Reports/Settings routes instead of inventing a Goals implementation.
- Uses only existing files/components and preserves unrelated dirty worktree changes.
