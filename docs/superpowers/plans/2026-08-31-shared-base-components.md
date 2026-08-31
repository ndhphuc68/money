# Base Component Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce `src/components/base/` as the shared, domain-agnostic UI layer (Card, IconButton, PrimaryButton, ListRow, PillChip, Sheet, Dropdown), refactor the highest-duplication finance/gold components to compose it, and add the base-vs-feature-specific component rule to `CLAUDE.md`.

**Architecture:** Six new presentational components live in `src/components/base/` with their own render/behavior tests. Existing feature components in `src/components/finance/` and `src/components/gold/` keep their exported names and prop types unchanged; only their internals are rewritten to compose the new base components instead of hand-rolled `StyleSheet` blocks. Existing prop/text-based tests (not snapshots) are the regression safety net — they must keep passing unchanged throughout.

**Tech Stack:** React Native (Expo SDK ~54), TypeScript (strict), Jest + `@testing-library/react-native`, ESLint (`eslint-config-expo`) + Prettier via `npx expo lint`.

## Global Constraints

- Icons: only `lucide-react-native` components, never emoji or Unicode glyphs as icon substitutes (`CLAUDE.md` → Icons).
- Lint/format: run `npx expo lint` before any task is considered done (`CLAUDE.md` → ESLint và Prettier).
- Type check: run `npx tsc --noEmit` — the project has `strict: true`.
- No raw hex colors in screens outside of `src/theme/colors.ts` — existing hardcoded gold-tone hex values (`#FFF4D6`, `#A96308`) are pre-existing and out of scope for this plan (tracked as backlog in the new CLAUDE.md rule); do not introduce *new* raw hex values.
- Every feature component's exported name, file path, and prop types must stay identical to today — only internals change. This is what lets the existing test suite (`tests/components/finance/*.test.tsx`) serve as the regression check.
- Do not touch: `BottomNav`'s overall 5-item layout, `UndoBanner`, `DateField`'s date-parsing logic, `GoldActionPickerSheet`'s buy/sell tiles, `FilterBar`'s month-shift logic, `TransactionForm`'s validation/submit logic, `SegmentedControl`, the gold-tone badge colors, `ProgressBar`-shaped code in `GoalCard`/`BudgetRow`, or field error-text styling — these are explicitly out of scope per the design spec.
- Design spec: `docs/superpowers/specs/2026-08-31-shared-base-components-design.md`.

---

## Task 1: Scaffold `src/components/base/` and move `Dropdown`

**Files:**
- Create: `src/components/base/Dropdown.tsx` (moved from `src/components/shared/Dropdown.tsx`, content unchanged)
- Create: `src/components/base/index.ts`
- Modify: `src/components/gold/GoldFormSheet.tsx:6` (import path)
- Delete: `src/components/shared/Dropdown.tsx`, `src/components/shared/index.ts`

**Interfaces:**
- Produces: `Dropdown` component and `DropdownOption`/`DropdownProps` types, now exported from `@/components/base`.

- [ ] **Step 1: Confirm the only consumer of the old path**

Run: `grep -rn "@/components/shared" src`
Expected output: only `src/components/gold/GoldFormSheet.tsx:6:import { Dropdown, type DropdownOption } from '@/components/shared';`

- [ ] **Step 2: Move the file**

```bash
mkdir -p src/components/base
git mv src/components/shared/Dropdown.tsx src/components/base/Dropdown.tsx
git rm src/components/shared/index.ts
```

- [ ] **Step 3: Create the barrel file**

`src/components/base/index.ts`:

```ts
export { Dropdown } from './Dropdown';
export type { DropdownOption, DropdownProps } from './Dropdown';
```

- [ ] **Step 4: Update the consumer import**

In `src/components/gold/GoldFormSheet.tsx`, change:

```ts
import { Dropdown, type DropdownOption } from '@/components/shared';
```

to:

```ts
import { Dropdown, type DropdownOption } from '@/components/base';
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: no errors; full suite passes (baseline, unaffected by this move).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move Dropdown into src/components/base"
```

---

## Task 2: Create `base/Card`

**Files:**
- Create: `src/components/base/Card.tsx`
- Create: `tests/components/base/card.test.tsx`
- Modify: `src/components/base/index.ts`

**Interfaces:**
- Produces: `Card` component, `CardProps` type — `{ children, elevation?, radius?, padding?, backgroundColor?, style? }`.

- [ ] **Step 1: Write the failing test**

`tests/components/base/card.test.tsx`:

```tsx
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { Card } from '@/components/base';

describe('Card', () => {
  it('renders its children', () => {
    const screen = render(
      <Card>
        <Text>Card content</Text>
      </Card>,
    );

    expect(screen.getByText('Card content')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/base/card.test.tsx`
Expected: FAIL — `Card` is not exported from `@/components/base`.

- [ ] **Step 3: Implement `Card`**

`src/components/base/Card.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

export type CardProps = {
  children: ReactNode;
  elevation?: 'none' | 'card' | 'elevated';
  radius?: keyof typeof radius;
  padding?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  elevation = 'card',
  radius: radiusKey = 'lg',
  padding = spacing[4],
  backgroundColor = colors.surface.primary,
  style,
}: CardProps) {
  const elevationStyle =
    elevation === 'card' ? shadows.card : elevation === 'elevated' ? shadows.elevated : undefined;

  return (
    <View
      style={[elevationStyle, { backgroundColor, borderRadius: radius[radiusKey], padding }, style]}>
      {children}
    </View>
  );
}
```

- [ ] **Step 4: Export it from the barrel**

`src/components/base/index.ts` — add:

```ts
export { Card } from './Card';
export type { CardProps } from './Card';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/components/base/card.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/base/Card.tsx src/components/base/index.ts tests/components/base/card.test.tsx
git commit -m "feat: add base Card component"
```

---

## Task 3: Create `base/IconButton`

**Files:**
- Create: `src/components/base/IconButton.tsx`
- Create: `tests/components/base/icon-button.test.tsx`
- Modify: `src/components/base/index.ts`

**Interfaces:**
- Produces: `IconButton` component, `IconButtonProps` type — `{ icon, onPress?, size?, radius?, backgroundColor?, pressedBackgroundColor?, accessibilityLabel, disabled?, style? }`.

- [ ] **Step 1: Write the failing test**

`tests/components/base/icon-button.test.tsx`:

```tsx
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { IconButton } from '@/components/base';

describe('IconButton', () => {
  it('renders its icon and reports presses', () => {
    const onPress = jest.fn();
    const screen = render(
      <IconButton accessibilityLabel="Close" icon={<Text>X</Text>} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not report presses while disabled', () => {
    const onPress = jest.fn();
    const screen = render(
      <IconButton accessibilityLabel="Close" disabled icon={<Text>X</Text>} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/base/icon-button.test.tsx`
Expected: FAIL — `IconButton` is not exported from `@/components/base`.

- [ ] **Step 3: Implement `IconButton`**

`src/components/base/IconButton.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '@/theme';

export type IconButtonProps = {
  icon: ReactNode;
  onPress?: () => void;
  size?: number;
  radius?: keyof typeof radius;
  backgroundColor?: string;
  pressedBackgroundColor?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  onPress,
  size = 44,
  radius: radiusKey = 'circle',
  backgroundColor,
  pressedBackgroundColor,
  accessibilityLabel,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: size,
          width: size,
          borderRadius: radius[radiusKey],
          backgroundColor: pressed && pressedBackgroundColor ? pressedBackgroundColor : backgroundColor,
        },
        style,
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 4: Export it from the barrel**

`src/components/base/index.ts` — add:

```ts
export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/components/base/icon-button.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/base/IconButton.tsx src/components/base/index.ts tests/components/base/icon-button.test.tsx
git commit -m "feat: add base IconButton component"
```

---

## Task 4: Create `base/PrimaryButton`

**Files:**
- Create: `src/components/base/PrimaryButton.tsx`
- Create: `tests/components/base/primary-button.test.tsx`
- Modify: `src/components/base/index.ts`

**Interfaces:**
- Produces: `PrimaryButton` component, `PrimaryButtonProps` type — `{ label, onPress, disabled?, backgroundColor?, pressedBackgroundColor?, textColor?, textStyle?, radius?, minHeight?, style? }`.

- [ ] **Step 1: Write the failing test**

`tests/components/base/primary-button.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/base';

describe('PrimaryButton', () => {
  it('renders the label as the accessible name and reports presses', () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryButton label="Save" onPress={onPress} />);

    expect(screen.getByText('Save')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks itself disabled and does not report presses', () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryButton disabled label="Save" onPress={onPress} />);

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState).toEqual({
      disabled: true,
    });
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/base/primary-button.test.tsx`
Expected: FAIL — `PrimaryButton` is not exported from `@/components/base`.

- [ ] **Step 3: Implement `PrimaryButton`**

`src/components/base/PrimaryButton.tsx`:

```tsx
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, radius, typography } from '@/theme';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor?: string;
  pressedBackgroundColor?: string;
  textColor?: string;
  textStyle?: StyleProp<TextStyle>;
  radius?: keyof typeof radius;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  backgroundColor = colors.content.primary,
  pressedBackgroundColor,
  textColor = colors.content.inverse,
  textStyle,
  radius: radiusKey = 'lg',
  minHeight = 52,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radius[radiusKey],
          minHeight,
          backgroundColor:
            pressed && !disabled && pressedBackgroundColor ? pressedBackgroundColor : backgroundColor,
        },
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.text, { color: textColor }, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 4: Export it from the barrel**

`src/components/base/index.ts` — add:

```ts
export { PrimaryButton } from './PrimaryButton';
export type { PrimaryButtonProps } from './PrimaryButton';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/components/base/primary-button.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/base/PrimaryButton.tsx src/components/base/index.ts tests/components/base/primary-button.test.tsx
git commit -m "feat: add base PrimaryButton component"
```

---

## Task 5: Create `base/ListRow`

**Files:**
- Create: `src/components/base/ListRow.tsx`
- Create: `tests/components/base/list-row.test.tsx`
- Modify: `src/components/base/index.ts`

**Interfaces:**
- Produces: `ListRow` component, `ListRowProps` type — `{ leading?, title, subtitle?, trailing?, showDivider?, dividerColor?, onPress?, accessibilityLabel?, gap?, minHeight?, titleStyle?, subtitleStyle?, style? }`.

- [ ] **Step 1: Write the failing test**

`tests/components/base/list-row.test.tsx`:

```tsx
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ListRow } from '@/components/base';

describe('ListRow', () => {
  it('renders title, subtitle, leading, and trailing content', () => {
    const screen = render(
      <ListRow
        leading={<Text>L</Text>}
        subtitle="Subtitle"
        title="Title"
        trailing={<Text>T</Text>}
      />,
    );

    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Subtitle')).toBeTruthy();
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByText('T')).toBeTruthy();
  });

  it('is pressable and reports presses only when onPress is given', () => {
    const onPress = jest.fn();
    const screen = render(<ListRow onPress={onPress} title="Tap me" />);

    fireEvent.press(screen.getByRole('button', { name: 'Tap me' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button when onPress is omitted', () => {
    const screen = render(<ListRow title="Static row" />);

    expect(screen.queryByRole('button', { name: 'Static row' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/base/list-row.test.tsx`
Expected: FAIL — `ListRow` is not exported from `@/components/base`.

- [ ] **Step 3: Implement `ListRow`**

`src/components/base/ListRow.tsx`:

```tsx
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, typography } from '@/theme';

export type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  showDivider?: boolean;
  dividerColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  gap?: number;
  minHeight?: number;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  showDivider = false,
  dividerColor = colors.border.subtle,
  onPress,
  accessibilityLabel,
  gap = 12,
  minHeight = 56,
  titleStyle,
  subtitleStyle,
  style,
}: ListRowProps) {
  const rowStyle = [
    styles.row,
    { gap, minHeight },
    showDivider ? { borderBottomColor: dividerColor, borderBottomWidth: 1 } : null,
    style,
  ];

  const content = (
    <>
      {leading}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, titleStyle]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, subtitleStyle]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...rowStyle, pressed && styles.rowPressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  rowPressed: {
    backgroundColor: colors.surface.muted,
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 4: Export it from the barrel**

`src/components/base/index.ts` — add:

```ts
export { ListRow } from './ListRow';
export type { ListRowProps } from './ListRow';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/components/base/list-row.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/base/ListRow.tsx src/components/base/index.ts tests/components/base/list-row.test.tsx
git commit -m "feat: add base ListRow component"
```

---

## Task 6: Create `base/PillChip`

**Files:**
- Create: `src/components/base/PillChip.tsx`
- Create: `tests/components/base/pill-chip.test.tsx`
- Modify: `src/components/base/index.ts`

**Interfaces:**
- Produces: `PillChip` component, `PillChipProps` type — `{ label, active, onPress }`.

- [ ] **Step 1: Write the failing test**

`tests/components/base/pill-chip.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';

import { PillChip } from '@/components/base';

describe('PillChip', () => {
  it('reflects active state via accessibilityState and reports presses', () => {
    const onPress = jest.fn();
    const screen = render(<PillChip active label="Cash" onPress={onPress} />);

    expect(screen.getByRole('button', { name: 'Cash' }).props.accessibilityState).toEqual({
      selected: true,
    });
    fireEvent.press(screen.getByRole('button', { name: 'Cash' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/base/pill-chip.test.tsx`
Expected: FAIL — `PillChip` is not exported from `@/components/base`.

- [ ] **Step 3: Implement `PillChip`**

`src/components/base/PillChip.tsx` (identical shape to the duplicated `PickerChip` in `AccountPicker`/`CategoryPicker`):

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type PillChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function PillChip({ label, active, onPress }: PillChipProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.chipPressed,
      ]}>
      <Text numberOfLines={1} style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing[4],
  },
  chipActive: {
    backgroundColor: colors.content.primary,
  },
  chipPressed: {
    backgroundColor: colors.border.subtle,
  },
  chipText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  chipTextActive: {
    color: colors.content.inverse,
    fontWeight: typography.weights.bold,
  },
});
```

- [ ] **Step 4: Export it from the barrel**

`src/components/base/index.ts` — add:

```ts
export { PillChip } from './PillChip';
export type { PillChipProps } from './PillChip';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/components/base/pill-chip.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/base/PillChip.tsx src/components/base/index.ts tests/components/base/pill-chip.test.tsx
git commit -m "feat: add base PillChip component"
```

---

## Task 7: Create `base/Sheet`

**Files:**
- Create: `src/components/base/Sheet.tsx`
- Create: `tests/components/base/sheet.test.tsx`
- Modify: `src/components/base/index.ts`

**Interfaces:**
- Consumes: `IconButton` from Task 3 (`src/components/base/IconButton.tsx`).
- Produces: `Sheet` component, `SheetProps` type — `{ visible, onClose, title?, subtitle?, closeLabel?, variant?, showHandle?, applyBottomInset?, closeButtonBackgroundColor?, onBodyPress?, style?, children }`.

- [ ] **Step 1: Write the failing test**

`tests/components/base/sheet.test.tsx`:

```tsx
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { Sheet } from '@/components/base';

describe('Sheet', () => {
  it('renders the title, subtitle, and children, and closes via the close button', () => {
    const onClose = jest.fn();
    const screen = render(
      <Sheet closeLabel="Close" onClose={onClose} subtitle="Subtitle" title="Title" visible>
        <Text>Body</Text>
      </Sheet>,
    );

    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Subtitle')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the header entirely when no title is given', () => {
    const screen = render(
      <Sheet onClose={jest.fn()} visible>
        <Text>Body only</Text>
      </Sheet>,
    );

    expect(screen.getByText('Body only')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/base/sheet.test.tsx`
Expected: FAIL — `Sheet` is not exported from `@/components/base`.

- [ ] **Step 3: Implement `Sheet`**

`src/components/base/Sheet.tsx`:

```tsx
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme';

import { IconButton } from './IconButton';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  closeLabel?: string;
  variant?: 'bottomSheet' | 'dialog';
  showHandle?: boolean;
  applyBottomInset?: boolean;
  closeButtonBackgroundColor?: string;
  onBodyPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  closeLabel,
  variant = 'bottomSheet',
  showHandle = variant === 'bottomSheet',
  applyBottomInset = true,
  closeButtonBackgroundColor = colors.surface.primary,
  onBodyPress,
  style,
  children,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const isDialog = variant === 'dialog';
  const bottomInset = applyBottomInset ? insets.bottom : 0;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        onPress={onClose}
        style={[
          styles.backdrop,
          isDialog ? { padding: spacing[5], paddingBottom: spacing[5] + bottomInset } : null,
        ]}>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onBodyPress?.();
          }}
          style={[
            isDialog ? styles.dialogSheet : styles.bottomSheet,
            !isDialog ? { paddingBottom: spacing[5] + bottomInset } : null,
            style,
          ]}>
          {showHandle ? <View style={styles.handle} /> : null}
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <IconButton
                accessibilityLabel={closeLabel ?? ''}
                backgroundColor={closeButtonBackgroundColor}
                icon={<X color={colors.content.primary} size={20} strokeWidth={2.2} />}
                onPress={onClose}
              />
            </View>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.32)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '86%',
    padding: spacing[5],
  },
  dialogSheet: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.xl,
    padding: spacing[5],
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border.strong,
    borderRadius: radius.sm,
    height: 5,
    marginBottom: spacing[3],
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 4: Export it from the barrel**

`src/components/base/index.ts` — add:

```ts
export { Sheet } from './Sheet';
export type { SheetProps } from './Sheet';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/components/base/sheet.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/base/Sheet.tsx src/components/base/index.ts tests/components/base/sheet.test.tsx
git commit -m "feat: add base Sheet component"
```

---

## Task 8: Refactor `StatCard`, `BalanceCard`, `GoalCard` onto `Card`/`IconButton`

**Files:**
- Modify: `src/components/finance/StatCard.tsx`, `src/components/finance/BalanceCard.tsx`, `src/components/finance/GoalCard.tsx`
- Test (existing, unchanged): `tests/components/finance/cards.test.tsx`

**Interfaces:**
- Consumes: `Card` (Task 2), `IconButton` (Task 3).

- [ ] **Step 1: Confirm the baseline test passes before touching anything**

Run: `npx jest tests/components/finance/cards.test.tsx`
Expected: PASS (pre-existing).

- [ ] **Step 2: Rewrite `StatCard.tsx`**

```tsx
import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/base';
import { colors, spacing, typography } from '@/theme';

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
};

export function StatCard({ label, value, tone = 'positive' }: StatCardProps) {
  return (
    <Card padding={14} radius="md" style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color: tone === 'positive' ? colors.status.positive : colors.status.negative },
        ]}>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 68,
  },
  label: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[2] - 2,
  },
  value: {
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 3: Rewrite `BalanceCard.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { Card, IconButton } from '@/components/base';
import { colors, spacing, typography } from '@/theme';

type BalanceCardProps = {
  label: string;
  balance: string;
  cardNumber: string;
  expiry: string;
  masked?: boolean;
  maskedText?: string;
  onToggleMask?: () => void;
  showBalanceLabel: string;
  hideBalanceLabel: string;
};

export function BalanceCard({
  label,
  balance,
  cardNumber,
  expiry,
  masked = false,
  maskedText = '•• ••• •••',
  onToggleMask,
  showBalanceLabel,
  hideBalanceLabel,
}: BalanceCardProps) {
  return (
    <Card backgroundColor={colors.gradient.balance[0]} elevation="elevated" padding={22} radius="xl">
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <IconButton
          accessibilityLabel={masked ? showBalanceLabel : hideBalanceLabel}
          backgroundColor="rgba(255, 255, 255, 0.15)"
          icon={
            masked ? (
              <Eye color={colors.content.inverse} size={18} />
            ) : (
              <EyeOff color={colors.content.inverse} size={18} />
            )
          }
          onPress={onToggleMask}
          pressedBackgroundColor="rgba(255, 255, 255, 0.25)"
        />
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>
        {masked ? maskedText : balance}
      </Text>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.cardNumber}>
          {cardNumber}
        </Text>
        <Text style={styles.expiry}>{expiry}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  balance: {
    color: colors.content.inverse,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.display,
    marginBottom: spacing[5],
    marginTop: spacing[3],
  },
  cardNumber: {
    color: colors.content.inverse,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    letterSpacing: 2,
    opacity: 0.9,
  },
  expiry: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    opacity: 0.75,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    opacity: 0.8,
  },
});
```

- [ ] **Step 4: Rewrite `GoalCard.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

type GoalCardProps = {
  name: string;
  initials: string;
  color?: string;
  due: string;
  percent: number;
  saved: string;
  target: string;
  accessibilityLabel: string;
};

export function GoalCard({
  name,
  initials,
  color = colors.brand.primary,
  due,
  percent,
  saved,
  target,
  accessibilityLabel,
}: GoalCardProps) {
  const normalizedPercent = Math.max(0, Math.min(percent, 100));

  return (
    <Card>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text style={styles.due}>{due}</Text>
        </View>
        <Text style={styles.percent}>{normalizedPercent}%</Text>
      </View>
      <View accessibilityLabel={accessibilityLabel} style={styles.track}>
        <View
          style={[styles.progress, { backgroundColor: color, width: `${normalizedPercent}%` }]}
        />
      </View>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.footerText}>
          {saved}
        </Text>
        <Text numberOfLines={1} style={styles.footerText}>
          {target}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: radius.circle,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  due: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  footerText: {
    color: colors.content.muted,
    flexShrink: 1,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  name: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  percent: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  progress: {
    borderRadius: 3,
    height: 6,
  },
  track: {
    backgroundColor: colors.surface.muted,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
});
```

- [ ] **Step 5: Run the existing test to verify it still passes**

Run: `npx jest tests/components/finance/cards.test.tsx`
Expected: PASS, unchanged assertions.

- [ ] **Step 6: Type check and lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: no errors (watch for now-unused `shadows`/`radius` imports in these three files — remove any that lint flags).

- [ ] **Step 7: Commit**

```bash
git add src/components/finance/StatCard.tsx src/components/finance/BalanceCard.tsx src/components/finance/GoalCard.tsx
git commit -m "refactor: compose StatCard, BalanceCard, GoalCard from base Card/IconButton"
```

---

## Task 9: Refactor `GoldOverviewCard` onto `Card`

**Files:**
- Modify: `src/components/gold/GoldOverviewCard.tsx`

**Interfaces:**
- Consumes: `Card` (Task 2).

- [ ] **Step 1: Rewrite `GoldOverviewCard.tsx`**

```tsx
// src/components/gold/GoldOverviewCard.tsx
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldOverviewCardProps = {
  title: string;
  subtitle: string;
  quantityLabel: string;
  quantityValue: string;
  costBasisLabel: string;
  costBasisValue: string;
};

export function GoldOverviewCard({
  title,
  subtitle,
  quantityLabel,
  quantityValue,
  costBasisLabel,
  costBasisValue,
}: GoldOverviewCardProps) {
  return (
    <Card backgroundColor={colors.category.gold} elevation="none" padding={spacing[5]} radius="xl">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Au</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{quantityLabel}</Text>
          <Text numberOfLines={1} style={styles.statValue}>
            {quantityValue}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{costBasisLabel}</Text>
          <Text numberOfLines={1} style={styles.statValue}>
            {costBasisValue}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  badgeText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  stat: {
    minWidth: 0,
  },
  statLabel: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[1],
    opacity: 0.92,
  },
  statValue: {
    color: colors.content.inverse,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[5],
  },
  subtitle: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.small,
    opacity: 0.9,
  },
  title: {
    color: colors.content.inverse,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    marginBottom: spacing[1],
  },
});
```

- [ ] **Step 2: Type check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no errors; no regressions (there is no dedicated `GoldOverviewCard` test — the full suite run is the safety net here).

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/gold/GoldOverviewCard.tsx
git commit -m "refactor: compose GoldOverviewCard from base Card"
```

---

## Task 10: Refactor `AmountInput`, `FilterBar`, `TransactionForm` onto `Card`/`PrimaryButton`

**Files:**
- Modify: `src/components/finance/AmountInput.tsx`, `src/components/finance/FilterBar.tsx`, `src/components/finance/TransactionForm.tsx`
- Test (existing, unchanged): `tests/components/finance/entry-controls.test.tsx`

**Interfaces:**
- Consumes: `Card` (Task 2), `PrimaryButton` (Task 4).

- [ ] **Step 1: Confirm the baseline test passes**

Run: `npx jest tests/components/finance/entry-controls.test.tsx`
Expected: PASS (pre-existing).

- [ ] **Step 2: Rewrite `AmountInput.tsx`**

```tsx
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/base';
import { formatVnd, parseVndInput } from '@/core/domain/finance/money';
import { colors, spacing, typography } from '@/theme';

type AmountInputProps = {
  value: number | null;
  onChange: (amount: number | null) => void;
  label: string;
  placeholder: string;
  invalidMessage: string;
  /**
   * External validation error (e.g. "amount is required") shown only while
   * the field has no parse error of its own, so the two sources never
   * render two error lines at once.
   */
  errorMessage?: string | null;
};

function formatAmountDisplay(amount: number): string {
  return formatVnd(amount).replace(/\s₫$/, '');
}

export function AmountInput({
  value,
  onChange,
  label,
  placeholder,
  invalidMessage,
  errorMessage = null,
}: AmountInputProps) {
  const [text, setText] = useState(value != null ? formatAmountDisplay(value) : '');
  const [error, setError] = useState<string | null>(null);
  const displayedError = error ?? errorMessage;

  function handleChangeText(nextText: string) {
    if (nextText.trim() === '') {
      setText('');
      setError(null);
      onChange(null);
      return;
    }

    const parsed = parseVndInput(nextText);
    if (parsed === null || parsed <= 0) {
      setError(invalidMessage);
      onChange(null);
      return;
    }

    setError(null);
    setText(formatAmountDisplay(parsed));
    onChange(parsed);
  }

  function handleBlur() {
    if (value != null) {
      setText(formatAmountDisplay(value));
    }
  }

  return (
    <Card style={[styles.container, displayedError && styles.containerError]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="numeric"
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.content.placeholder}
          style={styles.input}
          value={text}
        />
      </View>
      {displayedError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {displayedError}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  containerError: {
    borderColor: colors.status.negative,
    borderWidth: 1,
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  input: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    minHeight: 52,
    padding: 0,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
});
```

- [ ] **Step 3: Rewrite `FilterBar.tsx`**

```tsx
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ChevronRight, ListChecks } from 'lucide-react-native';
import { useState } from 'react';

import { Card } from '@/components/base';
import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import type { TransactionType } from '@/core/domain/finance/transaction';
import { colors, radius, spacing, typography } from '@/theme';

import { AccountPicker } from './AccountPicker';
import { CategoryPicker } from './CategoryPicker';

export type TransactionTypeFilter = 'all' | TransactionType;

const TYPE_OPTIONS: readonly TransactionTypeFilter[] = ['all', 'income', 'expense', 'transfer'];
type FilterBarProps = {
  compact?: boolean;
  month: string;
  onMonthChange: (month: string) => void;
  type: TransactionTypeFilter;
  onTypeChange: (type: TransactionTypeFilter) => void;
  categories: readonly Category[];
  categoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  accounts: readonly Account[];
  accountId: string | null;
  onAccountChange: (id: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
  labels: {
    all: string;
    income: string;
    expense: string;
    transfer: string;
    previousMonth: string;
    nextMonth: string;
    month: string;
    category: string;
    account: string;
    searchLabel: string;
    searchPlaceholder: string;
    advanced?: string;
  };
};

function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const next = new Date(year, monthIndex - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string, monthLabel: string): string {
  const [year, monthIndex] = month.split('-');
  return `${monthLabel} ${Number(monthIndex)}/${year}`;
}

export function FilterBar({
  month,
  onMonthChange,
  type,
  onTypeChange,
  categories,
  categoryId,
  onCategoryChange,
  accounts,
  accountId,
  onAccountChange,
  search,
  onSearchChange,
  labels,
  compact = false,
}: FilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const typeLabels: Record<TransactionTypeFilter, string> = {
    all: labels.all,
    income: labels.income,
    expense: labels.expense,
    transfer: labels.transfer,
  };
  const categoryType = type === 'all' ? 'all' : type === 'income' ? 'income' : 'expense';
  const visibleOptions = compact
    ? TYPE_OPTIONS.filter((option) => option !== 'transfer')
    : TYPE_OPTIONS;

  const body = (
    <>
      {!compact ? (
        <View style={styles.monthRow}>
          <Pressable
            accessibilityLabel={labels.previousMonth}
            accessibilityRole="button"
            onPress={() => onMonthChange(shiftMonth(month, -1))}
            style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}>
            <ChevronLeft color={colors.content.primary} size={20} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonth(month, labels.month)}</Text>
          <Pressable
            accessibilityLabel={labels.nextMonth}
            accessibilityRole="button"
            onPress={() => onMonthChange(shiftMonth(month, 1))}
            style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}>
            <ChevronRight color={colors.content.primary} size={20} />
          </Pressable>
        </View>
      ) : null}

      <View style={compact ? styles.compactTypeRow : styles.typeRow}>
        {visibleOptions.map((option) => {
          const active = option === type;
          return (
            <Pressable
              accessibilityLabel={typeLabels[option]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option}
              onPress={() => onTypeChange(option)}
              style={({ pressed }) => [
                styles.typeChip,
                compact && styles.compactTypeChip,
                active && styles.typeChipActive,
                pressed && !active && styles.typeChipPressed,
              ]}>
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                {typeLabels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {compact ? (
        <Pressable
          accessibilityLabel={labels.advanced ?? 'Bộ lọc nâng cao'}
          accessibilityRole="button"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen((open) => !open)}
          style={({ pressed }) => [styles.advancedToggle, pressed && styles.advancedTogglePressed]}>
          <ListChecks color={colors.content.muted} size={16} strokeWidth={2} />
          <Text style={styles.advancedToggleText}>{labels.advanced ?? 'Bộ lọc nâng cao'}</Text>
          <Text style={styles.advancedToggleValue}>{advancedOpen ? 'Ẩn' : 'Hiện'}</Text>
        </Pressable>
      ) : null}

      {(!compact || advancedOpen) && type !== 'transfer' ? (
        <CategoryPicker
          allLabel={labels.all}
          allowUnselect
          categories={categories}
          label={labels.category}
          onSelect={onCategoryChange}
          selectedId={categoryId}
          type={categoryType}
        />
      ) : null}

      {!compact || advancedOpen ? (
        <AccountPicker
          allLabel={labels.all}
          allowUnselect
          accounts={accounts}
          label={labels.account}
          onSelect={onAccountChange}
          selectedId={accountId}
        />
      ) : null}

      {!compact || advancedOpen ? (
        <TextInput
          accessibilityLabel={labels.searchLabel}
          onChangeText={onSearchChange}
          placeholder={labels.searchPlaceholder}
          placeholderTextColor={colors.content.placeholder}
          style={styles.searchInput}
          value={search}
        />
      ) : null}
    </>
  );

  return compact ? (
    <View style={styles.compactContainer}>{body}</View>
  ) : (
    <Card style={styles.container}>{body}</Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  compactContainer: {
    gap: spacing[2],
  },
  compactTypeRow: {
    backgroundColor: colors.surface.muted,
    borderRadius: 16,
    flexDirection: 'row',
    gap: spacing[1],
    minHeight: 44,
    padding: spacing[1],
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  monthButtonPressed: {
    backgroundColor: colors.border.subtle,
  },
  monthLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  monthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  advancedToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 44,
    paddingHorizontal: spacing[1],
  },
  advancedTogglePressed: {
    opacity: 0.6,
  },
  advancedToggleText: {
    color: colors.content.muted,
    flex: 1,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  advancedToggleValue: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  typeChip: {
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing[3],
  },
  compactTypeChip: {
    alignItems: 'center',
    flex: 1,
    minHeight: 32,
    paddingHorizontal: spacing[2],
  },
  typeChipActive: {
    backgroundColor: colors.content.primary,
  },
  typeChipPressed: {
    backgroundColor: colors.border.subtle,
  },
  typeChipText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  typeChipTextActive: {
    color: colors.content.inverse,
    fontWeight: typography.weights.bold,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
```

- [ ] **Step 4: Rewrite `TransactionForm.tsx`**

```tsx
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton } from '@/components/base';
import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import {
  validateTransactionInput,
  type TransactionInput,
  type TransactionType,
} from '@/core/domain/finance/transaction';
import type { Translate } from '@/i18n/translations';
import { colors, radius, spacing, typography } from '@/theme';

import { AccountPicker } from './AccountPicker';
import { AmountInput } from './AmountInput';
import { CategoryPicker } from './CategoryPicker';
import { DateField } from './DateField';
import { SegmentedControl } from './SegmentedControl';

type FormErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
  categoryId?: string;
  destinationAccountId?: string;
  /** Catch-all for domain-validation failures not already covered by a field-specific check above (e.g. an invalid date). */
  form?: string;
};

type TransactionFormProps = {
  accounts: readonly Account[];
  categories: readonly Category[];
  initialDate?: string;
  onSubmit: (input: TransactionInput) => void;
  t: Translate;
};

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionForm({
  accounts,
  categories,
  initialDate,
  onSubmit,
  t,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(initialDate ?? todayIso());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const isTransfer = type === 'transfer';
  const typeLabels: Record<TransactionType, string> = {
    income: t('transactionTypeIncome'),
    expense: t('transactionTypeExpense'),
    transfer: t('transactionTypeTransfer'),
  };

  function handleSubmit() {
    const nextErrors: FormErrors = {};

    if (name.trim() === '') {
      nextErrors.name = t('transactionFormNameRequired');
    }
    if (amount === null || amount <= 0) {
      nextErrors.amount = t('transactionFormAmountRequired');
    }
    if (accountId === null) {
      nextErrors.accountId = t('transactionFormAccountRequired');
    }
    if (isTransfer) {
      if (destinationAccountId === null) {
        nextErrors.destinationAccountId = t('transactionFormDestinationRequired');
      } else if (destinationAccountId === accountId) {
        nextErrors.destinationAccountId = t('transactionFormDestinationSame');
      }
    } else if (categoryId === null) {
      nextErrors.categoryId = t('transactionFormCategoryRequired');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const input: TransactionInput = isTransfer
      ? {
          type: 'transfer',
          amount: amount as number,
          accountId: accountId as string,
          destinationAccountId: destinationAccountId as string,
          date,
          name: name.trim(),
          note: note.trim() === '' ? null : note.trim(),
        }
      : {
          type,
          amount: amount as number,
          accountId: accountId as string,
          categoryId: categoryId as string,
          date,
          name: name.trim(),
          note: note.trim() === '' ? null : note.trim(),
        };

    try {
      validateTransactionInput(input);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : t('transactionFormGenericError'),
      });
      return;
    }

    onSubmit(input);
  }

  return (
    <Card style={styles.container}>
      <SegmentedControl
        onChange={(option: string) =>
          setType(
            (Object.keys(typeLabels) as TransactionType[]).find(
              (key) => typeLabels[key] === option,
            ) ?? 'expense',
          )
        }
        options={Object.values(typeLabels)}
        value={typeLabels[type]}
      />

      <NameField
        errorMessage={errors.name}
        label={t('transactionFormNameLabel')}
        onChange={setName}
        placeholder={t('transactionFormNamePlaceholder')}
        value={name}
      />

      <AmountInput
        errorMessage={amount === null ? (errors.amount ?? null) : null}
        invalidMessage={t('amountInvalid')}
        label={t('transactionFormAmountLabel')}
        onChange={setAmount}
        placeholder={t('amountPlaceholder')}
        value={amount}
      />

      <AccountPicker
        accounts={accounts}
        errorMessage={errors.accountId ?? null}
        label={t('transactionFormAccountLabel')}
        onSelect={setAccountId}
        selectedId={accountId}
      />

      {isTransfer ? (
        <AccountPicker
          accounts={accounts}
          errorMessage={errors.destinationAccountId ?? null}
          label={t('transactionFormDestinationLabel')}
          onSelect={setDestinationAccountId}
          selectedId={destinationAccountId}
        />
      ) : (
        <CategoryPicker
          categories={categories}
          errorMessage={errors.categoryId ?? null}
          label={t('transactionFormCategoryLabel')}
          onSelect={setCategoryId}
          selectedId={categoryId}
          type={type === 'income' ? 'income' : 'expense'}
        />
      )}

      <DateField
        confirmLabel={t('dateFieldConfirmLabel')}
        label={t('dateTransactionLabel')}
        onChange={setDate}
        value={date}
      />

      <NoteField
        label={t('transactionFormNoteLabel')}
        onChange={setNote}
        placeholder={t('transactionFormNoteLabel')}
        value={note}
      />

      {errors.form ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errors.form}
        </Text>
      ) : null}

      <PrimaryButton
        label={t('transactionFormSave')}
        onPress={handleSubmit}
        pressedBackgroundColor="#243247"
        radius="sm"
        textStyle={styles.saveButtonText}
      />
    </Card>
  );
}

function NameField({
  value,
  onChange,
  errorMessage,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string;
  label: string;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.content.placeholder}
        style={[styles.input, errorMessage && styles.inputError]}
        value={value}
      />
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

function NoteField({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.content.placeholder}
        style={[styles.input, styles.noteInput]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  field: {
    gap: spacing[1],
  },
  input: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.semibold,
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  inputError: {
    borderColor: colors.status.negative,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  noteInput: {
    minHeight: 72,
    paddingTop: spacing[3],
    textAlignVertical: 'top',
  },
  saveButtonText: {
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
});
```

- [ ] **Step 5: Run the existing test to verify it still passes**

Run: `npx jest tests/components/finance/entry-controls.test.tsx`
Expected: PASS, unchanged assertions (including the `'Lưu giao dịch'` button-name checks).

- [ ] **Step 6: Type check and lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: no errors; remove any now-unused `shadows` imports flagged by lint.

- [ ] **Step 7: Commit**

```bash
git add src/components/finance/AmountInput.tsx src/components/finance/FilterBar.tsx src/components/finance/TransactionForm.tsx
git commit -m "refactor: compose AmountInput, FilterBar, TransactionForm from base Card/PrimaryButton"
```

---

## Task 11: Refactor `AccountPicker`, `CategoryPicker` onto `PillChip`

**Files:**
- Modify: `src/components/finance/AccountPicker.tsx`, `src/components/finance/CategoryPicker.tsx`
- Test (existing, unchanged): `tests/components/finance/entry-controls.test.tsx`

**Interfaces:**
- Consumes: `PillChip` (Task 6).

- [ ] **Step 1: Confirm the baseline test passes**

Run: `npx jest tests/components/finance/entry-controls.test.tsx`
Expected: PASS (pre-existing).

- [ ] **Step 2: Rewrite `AccountPicker.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { PillChip } from '@/components/base';
import type { Account } from '@/core/domain/finance/account';
import { colors, spacing, typography } from '@/theme';

type AccountPickerProps = {
  accounts: readonly Account[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label?: string;
  allowUnselect?: boolean;
  allLabel?: string;
  errorMessage?: string | null;
};

export function AccountPicker({
  accounts,
  selectedId,
  onSelect,
  label,
  allowUnselect = false,
  allLabel,
  errorMessage = null,
}: AccountPickerProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.list}>
        {allowUnselect && allLabel ? (
          <PillChip active={selectedId === null} label={allLabel} onPress={() => onSelect(null)} />
        ) : null}
        {accounts.map((account) => (
          <PillChip
            active={account.id === selectedId}
            key={account.id}
            label={account.name}
            onPress={() => onSelect(account.id)}
          />
        ))}
      </View>
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
```

- [ ] **Step 3: Rewrite `CategoryPicker.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { PillChip } from '@/components/base';
import type { Category, CategoryType } from '@/core/domain/finance/category';
import { colors, spacing, typography } from '@/theme';

type CategoryPickerProps = {
  categories: readonly Category[];
  /** Pass 'all' to show both income and expense categories together (e.g. an unfiltered list view). */
  type: CategoryType | 'all';
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label?: string;
  allowUnselect?: boolean;
  allLabel?: string;
  errorMessage?: string | null;
};

export function CategoryPicker({
  categories,
  type,
  selectedId,
  onSelect,
  label,
  allowUnselect = false,
  allLabel,
  errorMessage = null,
}: CategoryPickerProps) {
  const visible = categories.filter(
    (category) => (type === 'all' || category.type === type) && !category.isArchived,
  );

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.list}>
        {allowUnselect && allLabel ? (
          <PillChip active={selectedId === null} label={allLabel} onPress={() => onSelect(null)} />
        ) : null}
        {visible.map((category) => (
          <PillChip
            active={category.id === selectedId}
            key={category.id}
            label={category.name}
            onPress={() => onSelect(category.id)}
          />
        ))}
      </View>
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
```

- [ ] **Step 4: Run the existing test to verify it still passes**

Run: `npx jest tests/components/finance/entry-controls.test.tsx`
Expected: PASS, unchanged assertions.

- [ ] **Step 5: Type check and lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/finance/AccountPicker.tsx src/components/finance/CategoryPicker.tsx
git commit -m "refactor: compose AccountPicker, CategoryPicker from base PillChip"
```

---

## Task 12: Refactor `TransactionRow`, `SettingsList` onto `ListRow`

**Files:**
- Modify: `src/components/finance/TransactionRow.tsx`, `src/components/finance/SettingsList.tsx`
- Test (existing, unchanged): `tests/components/finance/cards.test.tsx`, `tests/components/finance/navigation.test.tsx`

**Interfaces:**
- Consumes: `ListRow` (Task 5).

- [ ] **Step 1: Confirm the baseline tests pass**

Run: `npx jest tests/components/finance/cards.test.tsx tests/components/finance/navigation.test.tsx`
Expected: PASS (pre-existing).

- [ ] **Step 2: Rewrite `TransactionRow.tsx`**

```tsx
import { StyleSheet, Text } from 'react-native';

import { ListRow } from '@/components/base';
import { colors, spacing, typography } from '@/theme';

import { CategoryIcon, type CategoryIconName } from './icons';

type TransactionRowProps = {
  name: string;
  category: string;
  meta: string;
  amount: string;
  positive: boolean;
  icon: CategoryIconName;
  showDivider?: boolean;
};

export function TransactionRow({
  name,
  category,
  meta,
  amount,
  positive,
  icon,
  showDivider = true,
}: TransactionRowProps) {
  return (
    <ListRow
      dividerColor={colors.divider}
      gap={spacing[2] + 2}
      leading={<CategoryIcon name={icon} />}
      minHeight={56}
      showDivider={showDivider}
      style={styles.row}
      subtitle={`${category} · ${meta}`}
      subtitleStyle={styles.subtitle}
      title={name}
      titleStyle={styles.title}
      trailing={
        <Text
          numberOfLines={1}
          style={[
            styles.amount,
            { color: positive ? colors.status.positive : colors.status.negative },
          ]}>
          {amount}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    lineHeight: 15,
    marginLeft: spacing[2],
    maxWidth: 126,
  },
  row: {
    paddingVertical: spacing[2],
  },
  subtitle: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.body,
  },
  title: {
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.body,
  },
});
```

- [ ] **Step 3: Rewrite `SettingsList.tsx`**

```tsx
import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow } from '@/components/base';
import { colors, spacing, typography } from '@/theme';

type SettingsItem = {
  label: string;
  iconColor: string;
};

type SettingsListProps = {
  items: readonly SettingsItem[];
  onSelect?: (index: number) => void;
};

export function SettingsList({ items, onSelect }: SettingsListProps) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <ListRow
          dividerColor="rgba(60, 60, 67, 0.12)"
          gap={spacing[3]}
          key={`${item.label}-${index}`}
          leading={
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.icon, { backgroundColor: item.iconColor }]}
            />
          }
          minHeight={52}
          onPress={() => onSelect?.(index)}
          showDivider={index < items.length - 1}
          style={styles.row}
          title={item.label}
          titleStyle={styles.title}
          trailing={
            <ChevronRight
              accessibilityElementsHidden
              color="rgba(60, 60, 67, 0.3)"
              importantForAccessibility="no"
              size={22}
              strokeWidth={2.2}
            />
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    borderRadius: 7,
    height: 30,
    width: 30,
  },
  list: {
    backgroundColor: colors.surface.primary,
    borderRadius: 26,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing[4],
  },
  title: {
    color: colors.content.primary,
    flex: 1,
    fontSize: 17,
    fontWeight: typography.weights.regular,
  },
});
```

- [ ] **Step 4: Run the existing tests to verify they still pass**

Run: `npx jest tests/components/finance/cards.test.tsx tests/components/finance/navigation.test.tsx`
Expected: PASS, unchanged assertions (including the `'Coffee'` / `'Food · Today'` and `'Currency'` checks).

- [ ] **Step 5: Type check and lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/finance/TransactionRow.tsx src/components/finance/SettingsList.tsx
git commit -m "refactor: compose TransactionRow, SettingsList from base ListRow"
```

---

## Task 13: Refactor `GoldHistoryList` onto `Card`/`ListRow`

**Files:**
- Modify: `src/components/gold/GoldHistoryList.tsx`

**Interfaces:**
- Consumes: `Card` (Task 2), `ListRow` (Task 5).

- [ ] **Step 1: Rewrite `GoldHistoryList.tsx`**

```tsx
// src/components/gold/GoldHistoryList.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListRow } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldHistoryRowKind = 'lot' | 'sale';

export type GoldHistoryItem = {
  kind: GoldHistoryRowKind;
  id: string;
  title: string;
  subtitle: string;
  amountLabel: string;
  amountTone: 'neutral' | 'positive';
};

export type GoldHistoryListProps = {
  items: GoldHistoryItem[];
  emptyLabel: string;
  historyTitle: string;
  trashLabel: string;
  onSelectItem(item: GoldHistoryItem): void;
  onOpenTrash(): void;
};

export function GoldHistoryList({
  items,
  emptyLabel,
  historyTitle,
  trashLabel,
  onSelectItem,
  onOpenTrash,
}: GoldHistoryListProps) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{historyTitle}</Text>
        <Pressable accessibilityLabel={trashLabel} accessibilityRole="button" onPress={onOpenTrash}>
          <Text style={styles.trashLink}>{trashLabel}</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Card padding={spacing[5]}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </Card>
      ) : (
        <Card padding={0} style={styles.card}>
          {items.map((item, index) => (
            <ListRow
              gap={spacing[3]}
              key={`${item.kind}-${item.id}`}
              leading={
                <View
                  style={[
                    styles.rowBadge,
                    item.kind === 'sale' ? styles.rowBadgeSale : styles.rowBadgeLot,
                  ]}>
                  <Text style={[styles.rowBadgeText, item.kind === 'sale' && styles.rowBadgeTextSale]}>
                    {item.kind === 'sale' ? '↗' : 'Au'}
                  </Text>
                </View>
              }
              minHeight={64}
              onPress={() => onSelectItem(item)}
              showDivider={index < items.length - 1}
              style={styles.row}
              subtitle={item.subtitle}
              subtitleStyle={styles.rowSubtitle}
              title={item.title}
              trailing={
                <Text
                  style={[styles.rowAmount, item.amountTone === 'positive' && styles.rowAmountPositive]}>
                  {item.amountLabel}
                </Text>
              }
            />
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[4],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  headerTitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    paddingVertical: spacing[3],
  },
  rowAmount: {
    color: colors.content.primary,
    flexShrink: 0,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    textAlign: 'right',
  },
  rowAmountPositive: {
    color: colors.status.positive,
  },
  rowBadge: {
    alignItems: 'center',
    borderRadius: radius.circle,
    flexShrink: 0,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowBadgeLot: {
    backgroundColor: '#FFF4D6',
  },
  rowBadgeSale: {
    backgroundColor: colors.status.positiveSoft,
  },
  rowBadgeText: {
    color: '#A96308',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  rowBadgeTextSale: {
    color: colors.status.positive,
  },
  rowSubtitle: {
    marginTop: spacing[1],
  },
  trashLink: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 2: Type check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no errors; no regressions (there is no dedicated `GoldHistoryList` test).

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/gold/GoldHistoryList.tsx
git commit -m "refactor: compose GoldHistoryList from base Card/ListRow"
```

---

## Task 14: Refactor `BottomNav`'s FAB onto `IconButton`

**Files:**
- Modify: `src/components/finance/BottomNav.tsx`
- Test (existing, unchanged): `tests/components/finance/navigation.test.tsx`

**Interfaces:**
- Consumes: `IconButton` (Task 3).

- [ ] **Step 1: Confirm the baseline test passes**

Run: `npx jest tests/components/finance/navigation.test.tsx`
Expected: PASS (pre-existing).

- [ ] **Step 2: Rewrite `BottomNav.tsx`**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useContext } from 'react';
import { Plus } from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { IconButton } from '@/components/base';
import { colors, shadows, spacing, typography } from '@/theme';

import { NavIcon, type NavIconName } from './icons';

export type BottomNavItem = {
  key: string;
  label: string;
  icon: NavIconName;
};

type BottomNavProps = {
  items: readonly BottomNavItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  onAdd?: () => void;
  addAccessibilityLabel: string;
};

export function BottomNav({
  items,
  activeKey,
  onChange,
  onAdd,
  addAccessibilityLabel,
}: BottomNavProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0 };
  const firstItems = items.slice(0, 2);
  const lastItems = items.slice(2);

  return (
    <View style={[styles.nav, { paddingBottom: Math.max(26, insets.bottom + 10) }]}>
      {firstItems.map((item) => (
        <NavItem active={item.key === activeKey} item={item} key={item.key} onChange={onChange} />
      ))}
      <IconButton
        accessibilityLabel={addAccessibilityLabel}
        backgroundColor={colors.content.primary}
        icon={<Plus color={colors.content.inverse} size={28} strokeWidth={2.6} />}
        onPress={onAdd}
        pressedBackgroundColor="#243247"
        size={52}
        style={styles.addButton}
      />
      {lastItems.map((item) => (
        <NavItem active={item.key === activeKey} item={item} key={item.key} onChange={onChange} />
      ))}
    </View>
  );
}

function NavItem({
  item,
  active,
  onChange,
}: {
  item: BottomNavItem;
  active: boolean;
  onChange?: (key: string) => void;
}) {
  const iconColor = active ? colors.brand.primary : colors.content.faint;
  const textColor = active ? colors.content.primary : colors.content.muted2;

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => onChange?.(item.key)}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <NavIcon color={iconColor} name={item.icon} />
      <Text numberOfLines={1} style={[styles.itemText, { color: textColor }]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    ...shadows.fab,
    marginTop: -30,
  },
  item: {
    alignItems: 'center',
    gap: spacing[1],
    justifyContent: 'center',
    minHeight: 44,
    width: 64,
  },
  itemPressed: {
    opacity: 0.72,
  },
  itemText: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
    lineHeight: 18,
  },
  nav: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 88,
    paddingBottom: 26,
    paddingHorizontal: spacing[2],
    paddingTop: spacing[3] - 2,
  },
});
```

- [ ] **Step 3: Run the existing test to verify it still passes**

Run: `npx jest tests/components/finance/navigation.test.tsx`
Expected: PASS, unchanged assertions (including `'Add transaction'` button-name checks).

- [ ] **Step 4: Type check and lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: no errors; `radius` import should be removed from `BottomNav.tsx` since it's no longer used directly.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/BottomNav.tsx
git commit -m "refactor: compose BottomNav FAB from base IconButton"
```

---

## Task 15: Refactor `DateField`'s iOS sheet onto `Sheet`/`PrimaryButton`

**Files:**
- Modify: `src/components/finance/DateField.tsx`
- Test (existing, unchanged): `tests/components/finance/entry-controls.test.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 7), `PrimaryButton` (Task 4).

- [ ] **Step 1: Confirm the baseline test passes**

Run: `npx jest tests/components/finance/entry-controls.test.tsx`
Expected: PASS (pre-existing).

- [ ] **Step 2: Rewrite `DateField.tsx`**

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet, PrimaryButton } from '@/components/base';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type DateFieldProps = {
  value: string;
  onChange: (isoDate: string) => void;
  label?: string;
  confirmLabel?: string;
};

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDmy(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function DateField({ value, onChange, label, confirmLabel }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseIsoDate(value));
  const formatted = formatDmy(value);

  const openPicker = () => {
    setDraftDate(parseIsoDate(value));
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${formatted}`}
        accessibilityRole="button"
        onPress={openPicker}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}>
        <Text style={styles.value}>{formatted}</Text>
        <CalendarDays color={colors.content.secondary} size={18} strokeWidth={2} />
      </Pressable>

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          mode="date"
          onChange={(_event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              onChange(toIsoDate(selectedDate));
            }
          }}
          value={draftDate}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Sheet
          applyBottomInset={false}
          onClose={() => setShowPicker(false)}
          style={shadows.card}
          visible={showPicker}>
          <DateTimePicker
            display="inline"
            mode="date"
            onChange={(_event, selectedDate) => {
              if (selectedDate) {
                setDraftDate(selectedDate);
              }
            }}
            value={draftDate}
          />
          <PrimaryButton
            backgroundColor={colors.brand.primary}
            label={confirmLabel ?? ''}
            minHeight={50}
            onPress={() => {
              onChange(toIsoDate(draftDate));
              setShowPicker(false);
            }}
            style={styles.pickerConfirmSpacing}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  fieldPressed: {
    backgroundColor: colors.surface.muted,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  pickerConfirmSpacing: {
    marginTop: spacing[3],
  },
  value: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
});
```

- [ ] **Step 3: Run the existing test to verify it still passes**

Run: `npx jest tests/components/finance/entry-controls.test.tsx`
Expected: PASS, unchanged assertions (the `DateField` describe block only exercises the closed-state label/button, so the iOS sheet internals aren't asserted on directly).

- [ ] **Step 4: Type check and lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/DateField.tsx
git commit -m "refactor: compose DateField's iOS sheet from base Sheet/PrimaryButton"
```

---

## Task 16: Refactor `GoldActionPickerSheet` onto `Sheet` (dialog variant)

**Files:**
- Modify: `src/components/gold/GoldActionPickerSheet.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 7).

- [ ] **Step 1: Rewrite `GoldActionPickerSheet.tsx`**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldActionPickerSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  buyTitle: string;
  buySubtitle: string;
  sellTitle: string;
  sellSubtitle: string;
  sellDisabled: boolean;
  sellDisabledHint: string;
  closeLabel: string;
  onSelectBuy(): void;
  onSelectSell(): void;
  onClose(): void;
};

export function GoldActionPickerSheet({
  visible,
  title,
  subtitle,
  buyTitle,
  buySubtitle,
  sellTitle,
  sellSubtitle,
  sellDisabled,
  sellDisabledHint,
  closeLabel,
  onSelectBuy,
  onSelectSell,
  onClose,
}: GoldActionPickerSheetProps) {
  return (
    <Sheet
      closeButtonBackgroundColor={colors.surface.muted}
      closeLabel={closeLabel}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      variant="dialog"
      visible={visible}>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onSelectBuy} style={styles.buyAction}>
          <Text style={styles.buyActionTitle}>{buyTitle}</Text>
          <Text style={styles.buyActionSubtitle}>{buySubtitle}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: sellDisabled }}
          disabled={sellDisabled}
          onPress={onSelectSell}
          style={[styles.sellAction, sellDisabled && styles.sellActionDisabled]}>
          <Text style={styles.sellActionTitle}>{sellTitle}</Text>
          <Text style={styles.sellActionSubtitle}>
            {sellDisabled ? sellDisabledHint : sellSubtitle}
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  buyAction: {
    backgroundColor: '#FFF4D6',
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 96,
    padding: spacing[4],
  },
  buyActionSubtitle: {
    color: '#A96308',
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  buyActionTitle: {
    color: '#A96308',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  sellAction: {
    backgroundColor: colors.status.positiveSoft,
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 96,
    padding: spacing[4],
  },
  sellActionDisabled: {
    opacity: 0.5,
  },
  sellActionSubtitle: {
    color: colors.status.positive,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  sellActionTitle: {
    color: colors.status.positive,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 2: Type check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no errors; no regressions (there is no dedicated `GoldActionPickerSheet` test).

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/gold/GoldActionPickerSheet.tsx
git commit -m "refactor: compose GoldActionPickerSheet from base Sheet dialog variant"
```

---

## Task 17: Refactor `GoldBrandManageSheet` onto `Sheet`/`IconButton`/`ListRow`/`PrimaryButton`

**Files:**
- Modify: `src/components/gold/GoldBrandManageSheet.tsx`

**Interfaces:**
- Consumes: `Sheet`, `IconButton`, `ListRow`, `PrimaryButton`, `Card` (Tasks 2–7).

- [ ] **Step 1: Rewrite `GoldBrandManageSheet.tsx`**

```tsx
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';

import { Card, IconButton, ListRow, PrimaryButton, Sheet } from '@/components/base';
import type { GoldBrand } from '@/core/domain/gold/gold-brand';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldBrandManageSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  brands: GoldBrand[];
  deleteBrandLabel: string;
  onDeleteBrand(id: string): void;
  newBrandName: string;
  onChangeNewBrandName(text: string): void;
  addBrandLabel: string;
  addBrandPlaceholder: string;
  addDisabled: boolean;
  saveBrandLabel: string;
  onAddBrand(): void;
  onClose(): void;
};

export function GoldBrandManageSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  brands,
  deleteBrandLabel,
  onDeleteBrand,
  newBrandName,
  onChangeNewBrandName,
  addBrandLabel,
  addBrandPlaceholder,
  addDisabled,
  saveBrandLabel,
  onAddBrand,
  onClose,
}: GoldBrandManageSheetProps) {
  return (
    <Sheet closeLabel={closeLabel} onClose={onClose} subtitle={subtitle} title={title} visible={visible}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Card padding={0} style={styles.card}>
          {brands.map((brand, index) => (
            <ListRow
              gap={spacing[3]}
              key={brand.id}
              leading={
                <View style={styles.rowBadge}>
                  <Text style={styles.rowBadgeText}>{brand.name.slice(0, 2).toUpperCase()}</Text>
                </View>
              }
              minHeight={60}
              showDivider={index < brands.length - 1}
              title={brand.name}
              trailing={
                <IconButton
                  accessibilityLabel={deleteBrandLabel}
                  backgroundColor={colors.status.negativeSoft}
                  icon={<X color={colors.status.negative} size={16} strokeWidth={2.2} />}
                  onPress={() => onDeleteBrand(brand.id)}
                  radius="md"
                  size={36}
                  style={styles.deleteButton}
                />
              }
            />
          ))}
        </Card>

        <View style={styles.field}>
          <Text style={styles.label}>{addBrandLabel}</Text>
          <TextInput
            accessibilityLabel={addBrandLabel}
            onChangeText={onChangeNewBrandName}
            placeholder={addBrandPlaceholder}
            placeholderTextColor={colors.content.placeholder}
            style={styles.input}
            value={newBrandName}
          />
        </View>

        <PrimaryButton
          backgroundColor={colors.category.gold}
          disabled={addDisabled}
          label={saveBrandLabel}
          minHeight={54}
          onPress={onAddBrand}
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  deleteButton: {
    flexShrink: 0,
  },
  field: {
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  input: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    height: 48,
    paddingHorizontal: spacing[3],
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  rowBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF4D6',
    borderRadius: radius.circle,
    flexShrink: 0,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowBadgeText: {
    color: '#A96308',
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
});
```

- [ ] **Step 2: Type check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no errors; no regressions (there is no dedicated `GoldBrandManageSheet` test).

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/gold/GoldBrandManageSheet.tsx
git commit -m "refactor: compose GoldBrandManageSheet from base Sheet/IconButton/ListRow/PrimaryButton"
```

---

## Task 18: Refactor `GoldFormSheet` onto `Sheet`/`PrimaryButton`

**Files:**
- Modify: `src/components/gold/GoldFormSheet.tsx`

**Interfaces:**
- Consumes: `Sheet`, `PrimaryButton`, `Dropdown` (already imported from `@/components/base` since Task 1).

- [ ] **Step 1: Rewrite `GoldFormSheet.tsx`**

```tsx
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Dropdown, PrimaryButton, Sheet, type DropdownOption } from '@/components/base';
import { AmountInput, DateField } from '@/components/finance';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldDropdownOption = DropdownOption;

export type GoldFormSheetProps = {
  visible: boolean;
  formType: 'buy' | 'sell';
  title: string;
  subtitle: string;
  closeLabel: string;
  dateLabel: string;
  dateValue: string;
  dateConfirmLabel: string;
  onChangeDate(iso: string): void;
  brandFieldLabel: string;
  brandValueLabel: string;
  brandDropdownOpen: boolean;
  brandOptions: GoldDropdownOption[];
  addNewBrandLabel: string;
  onToggleBrandDropdown(): void;
  onSelectBrand(key: string): void;
  onSelectAddNewBrand(): void;
  lotFieldLabel: string;
  lotValueLabel: string;
  lotDropdownOpen: boolean;
  lotOptions: GoldDropdownOption[];
  onToggleLotDropdown(): void;
  onSelectLot(key: string): void;
  quantityLabel: string;
  quantityValue: string;
  onChangeQuantity(text: string): void;
  unitFieldLabel: string;
  unitValueLabel: string;
  unitDropdownOpen: boolean;
  unitOptions: GoldDropdownOption[];
  onToggleUnitDropdown(): void;
  onSelectUnit(key: string): void;
  totalLabel: string;
  totalPlaceholder: string;
  totalAmount: number | null;
  onChangeTotalAmount(amount: number | null): void;
  totalInvalidMessage: string;
  saveLabel: string;
  errorMessage: string | null;
  onSave(): void;
  onClose(): void;
  onCloseDropdowns(): void;
};

export function GoldFormSheet(props: GoldFormSheetProps) {
  const { visible, title, subtitle, closeLabel, onSave, onClose, onCloseDropdowns, formType } = props;

  return (
    <Sheet
      closeLabel={closeLabel}
      onBodyPress={onCloseDropdowns}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      visible={visible}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <DateField
            confirmLabel={props.dateConfirmLabel}
            label={props.dateLabel}
            onChange={props.onChangeDate}
            value={props.dateValue}
          />
        </View>

        {formType === 'buy' ? (
          <Dropdown
            extraOption={{ label: props.addNewBrandLabel, onSelect: props.onSelectAddNewBrand }}
            fieldLabel={props.brandFieldLabel}
            onSelect={props.onSelectBrand}
            onToggle={props.onToggleBrandDropdown}
            open={props.brandDropdownOpen}
            options={props.brandOptions}
            valueLabel={props.brandValueLabel}
          />
        ) : (
          <Dropdown
            fieldLabel={props.lotFieldLabel}
            onSelect={props.onSelectLot}
            onToggle={props.onToggleLotDropdown}
            open={props.lotDropdownOpen}
            options={props.lotOptions}
            valueLabel={props.lotValueLabel}
          />
        )}

        {formType === 'buy' ? (
          <View style={[styles.row, props.unitDropdownOpen && styles.rowOpen]}>
            <View style={[styles.field, styles.rowField]}>
              <Text style={styles.label}>{props.quantityLabel}</Text>
              <TextInput
                accessibilityLabel={props.quantityLabel}
                keyboardType="numeric"
                onChangeText={props.onChangeQuantity}
                style={styles.quantityInput}
                value={props.quantityValue}
              />
            </View>
            <View style={styles.rowField}>
              <Dropdown
                fieldLabel={props.unitFieldLabel}
                onSelect={props.onSelectUnit}
                onToggle={props.onToggleUnitDropdown}
                open={props.unitDropdownOpen}
                options={props.unitOptions}
                valueLabel={props.unitValueLabel}
              />
            </View>
          </View>
        ) : null}

        <AmountInput
          errorMessage={null}
          invalidMessage={props.totalInvalidMessage}
          label={props.totalLabel}
          onChange={props.onChangeTotalAmount}
          placeholder={props.totalPlaceholder}
          value={props.totalAmount}
        />

        {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}

        <PrimaryButton
          backgroundColor={colors.category.gold}
          label={props.saveLabel}
          minHeight={54}
          onPress={onSave}
          style={styles.saveButtonSpacing}
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  field: {
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  quantityInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    height: 48,
    paddingHorizontal: spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  rowField: {
    flex: 1,
  },
  rowOpen: {
    elevation: 20,
    zIndex: 20,
  },
  saveButtonSpacing: {
    marginTop: spacing[4],
  },
});
```

Note: the original body Pressable called `onCloseDropdowns()` on every tap inside the sheet (not just the backdrop). `Sheet`'s `onBodyPress` prop (added in Task 7) reproduces exactly that: it fires after `stopPropagation()` on the inner sheet-body `Pressable`, same as the original's inline handler.

- [ ] **Step 2: Type check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no errors; no regressions (there is no dedicated `GoldFormSheet` test).

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/gold/GoldFormSheet.tsx
git commit -m "refactor: compose GoldFormSheet from base Sheet/PrimaryButton"
```

---

## Task 19: Refactor `GoldTrashSheet` onto `Sheet`/`IconButton`/`ListRow`

**Files:**
- Modify: `src/components/gold/GoldTrashSheet.tsx`

**Interfaces:**
- Consumes: `Sheet`, `IconButton`, `ListRow`, `Card` (Tasks 2–7).

- [ ] **Step 1: Rewrite `GoldTrashSheet.tsx`**

```tsx
import { X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Card, IconButton, ListRow, Sheet } from '@/components/base';
import type { LotHistoryRow, SaleHistoryRow } from '@/features/gold/view-models/gold-presentation';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldTrashSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  restoreLabel: string;
  purgeLabel: string;
  trashedLots: LotHistoryRow[];
  trashedSales: SaleHistoryRow[];
  onRestoreLot(id: string): void;
  onRestoreSale(id: string): void;
  onPurgeLot(id: string): void;
  onPurgeSale(id: string): void;
  onClose(): void;
};

type TrashRow = {
  key: string;
  title: string;
  subtitle: string;
  onRestore(): void;
  onPurge(): void;
};

export function GoldTrashSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  restoreLabel,
  purgeLabel,
  trashedLots,
  trashedSales,
  onRestoreLot,
  onRestoreSale,
  onPurgeLot,
  onPurgeSale,
  onClose,
}: GoldTrashSheetProps) {
  const rows: TrashRow[] = [
    ...trashedLots.map((lot) => ({
      key: `lot-${lot.id}`,
      title: lot.title,
      subtitle: lot.subtitle,
      onRestore: () => onRestoreLot(lot.id),
      onPurge: () => onPurgeLot(lot.id),
    })),
    ...trashedSales.map((sale) => ({
      key: `sale-${sale.id}`,
      title: sale.title,
      subtitle: sale.subtitle,
      onRestore: () => onRestoreSale(sale.id),
      onPurge: () => onPurgeSale(sale.id),
    })),
  ];

  return (
    <Sheet closeLabel={closeLabel} onClose={onClose} subtitle={subtitle} title={title} visible={visible}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card padding={0} style={styles.card}>
          {rows.map((row, index) => (
            <ListRow
              gap={spacing[3]}
              key={row.key}
              minHeight={68}
              showDivider={index < rows.length - 1}
              subtitle={row.subtitle}
              subtitleStyle={styles.rowSubtitle}
              title={row.title}
              titleStyle={styles.rowTitle}
              trailing={
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={row.onRestore}
                    style={styles.restoreButton}>
                    <Text style={styles.restoreButtonText}>{restoreLabel}</Text>
                  </Pressable>
                  <IconButton
                    accessibilityLabel={purgeLabel}
                    backgroundColor={colors.status.negativeSoft}
                    icon={<X color={colors.status.negative} size={18} strokeWidth={2.2} />}
                    onPress={row.onPurge}
                    radius="md"
                    style={styles.purgeButton}
                  />
                </>
              }
            />
          ))}
        </Card>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[4],
  },
  purgeButton: {
    flexShrink: 0,
  },
  restoreButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.md,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  restoreButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  rowSubtitle: {
    marginTop: spacing[1],
  },
  rowTitle: {
    fontSize: typography.sizes.caption,
  },
});
```

- [ ] **Step 2: Type check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no errors; no regressions (there is no dedicated `GoldTrashSheet` test).

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/gold/GoldTrashSheet.tsx
git commit -m "refactor: compose GoldTrashSheet from base Sheet/IconButton/ListRow"
```

---

## Task 20: Refactor `GoldDetailSheet` onto `Sheet`/`PrimaryButton`

**Files:**
- Modify: `src/components/gold/GoldDetailSheet.tsx`

**Interfaces:**
- Consumes: `Sheet`, `PrimaryButton` (Tasks 4, 7).

- [ ] **Step 1: Rewrite `GoldDetailSheet.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Sheet } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldDetailSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  weightLabel: string;
  weightValue: string;
  totalLabel: string;
  totalValue: string;
  extraLabel: string;
  extraValue: string;
  blockedMessage: string | null;
  deleteDisabled: boolean;
  deleteLabel: string;
  onMoveToTrash(): void;
  onClose(): void;
};

export function GoldDetailSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  weightLabel,
  weightValue,
  totalLabel,
  totalValue,
  extraLabel,
  extraValue,
  blockedMessage,
  deleteDisabled,
  deleteLabel,
  onMoveToTrash,
  onClose,
}: GoldDetailSheetProps) {
  return (
    <Sheet closeLabel={closeLabel} onClose={onClose} subtitle={subtitle} title={title} visible={visible}>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={styles.rowLabel}>{weightLabel}</Text>
          <Text style={styles.rowValue}>{weightValue}</Text>
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={styles.rowLabel}>{totalLabel}</Text>
          <Text style={styles.rowValue}>{totalValue}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{extraLabel}</Text>
          <Text style={styles.rowValue}>{extraValue}</Text>
        </View>
      </View>

      {blockedMessage ? (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>{blockedMessage}</Text>
        </View>
      ) : null}

      <PrimaryButton
        backgroundColor={colors.status.negative}
        disabled={deleteDisabled}
        label={deleteLabel}
        onPress={onMoveToTrash}
        style={styles.deleteButtonSpacing}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  blockedBanner: {
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.md,
    marginTop: spacing[4],
    padding: spacing[3],
  },
  blockedBannerText: {
    color: colors.status.negative,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.small,
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  deleteButtonSpacing: {
    marginTop: spacing[4],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  rowValue: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
});
```

- [ ] **Step 2: Type check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no errors; no regressions (there is no dedicated `GoldDetailSheet` test).

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/gold/GoldDetailSheet.tsx
git commit -m "refactor: compose GoldDetailSheet from base Sheet/PrimaryButton"
```

---

## Task 21: Add the base-component rule to `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append the new rule section**

Add after the existing "ESLint và Prettier" section in `CLAUDE.md`:

```markdown

## Component: Base & Feature-specific

Component chia làm 2 lớp:

- **Base component** (`src/components/base/`): building block UI thuần, không phụ thuộc domain logic, dùng chung cho toàn dự án (Card, IconButton, PrimaryButton, ListRow, PillChip, Sheet, Dropdown...).
- **Feature component** (`src/components/finance/`, `src/components/gold/`...): đặc thù cho 1 tính năng, compose lại từ base component qua props (`style`, `variant`, màu sắc...) thay vì copy-paste style riêng.

- Trước khi viết 1 UI element mới (card, button, list row, sheet, chip...), kiểm tra `src/components/base/` trước; nếu đã có pattern tương tự thì compose lại thay vì viết lại từ đầu.
- Nếu phát hiện ≥2 chỗ dùng cùng 1 pattern UI mà chưa có trong `base/`, tách nó ra `base/` ngay, không chờ lặp lần 3.
- Khi cần custom giao diện cho 1 base component ở 1 chỗ cụ thể, truyền prop để override, không tạo bản sao file khác.

Backlog (chưa tách trong đợt refactor hiện tại, cân nhắc tách khi đụng tới): hợp nhất SegmentedControl/FilterBar chip, Badge tròn màu (đang hardcode `#FFF4D6`/`#A96308` ở 3 chỗ), ProgressBar (GoalCard/BudgetRow), error text dưới field.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add base vs feature-specific component rule to CLAUDE.md"
```

---

## Task 22: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS, 0 failures.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint and format**

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 4: Manual smoke check**

Start the app (`npx expo start`) and, per project convention for UI changes, walk through:
- A finance screen showing `StatCard`/`BalanceCard`/`GoalCard`/`TransactionRow` (e.g. the overview/transactions screen) — confirm balance mask toggle, transaction rows, and goal progress bar render and behave as before.
- The transaction entry form (`AmountInput`, `AccountPicker`/`CategoryPicker` chips, `DateField`, save button) — confirm validation errors and submit still work.
- The gold management screen: open the action picker (buy/sell dialog), the buy/sell form sheet (date field, brand/lot/unit dropdowns, save), the brand-manage sheet (add/delete brand), the detail sheet (view + move-to-trash), and the trash sheet (restore/purge) — confirm every sheet opens, closes (via backdrop tap and the close button), and its actions still fire.
- Settings screen's `SettingsList` rows and the `BottomNav` (including the center add FAB) — confirm navigation and the add action still work.

Note any visual drift found and fix it in the relevant task's file before considering this plan complete.

- [ ] **Step 5: Final commit (only if Step 4 required fixes)**

```bash
git add -A
git commit -m "fix: address manual smoke-test findings after base component refactor"
```
