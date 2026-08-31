import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Card, PrimaryButton, Sheet } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

import { DateField } from './DateField';

export type PeriodKind = 'week' | 'month' | 'quarter' | 'year' | 'custom';

const KIND_ORDER: readonly PeriodKind[] = ['week', 'month', 'quarter', 'year', 'custom'];

export type PeriodSelectorLabels = {
  week: string;
  month: string;
  quarter: string;
  year: string;
  custom: string;
  previous: string;
  next: string;
  customFrom: string;
  customTo: string;
  apply: string;
  close: string;
};

export type PeriodSelectorProps = {
  kind: PeriodKind;
  onKindChange: (kind: PeriodKind) => void;
  rangeLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (isoDate: string) => void;
  onCustomToChange: (isoDate: string) => void;
  labels: PeriodSelectorLabels;
};

export function PeriodSelector({
  kind,
  onKindChange,
  rangeLabel,
  onPrevious,
  onNext,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  labels,
}: PeriodSelectorProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const kindLabels: Record<PeriodKind, string> = {
    week: labels.week,
    month: labels.month,
    quarter: labels.quarter,
    year: labels.year,
    custom: labels.custom,
  };

  const handleKindPress = (next: PeriodKind) => {
    onKindChange(next);
    if (next === 'custom') {
      setSheetOpen(true);
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.kindRow}>
        {KIND_ORDER.map((option) => {
          const active = option === kind;
          return (
            <Pressable
              accessibilityLabel={kindLabels[option]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option}
              onPress={() => handleKindPress(option)}
              style={({ pressed }) => [
                styles.kindChip,
                active && styles.kindChipActive,
                pressed && !active && styles.kindChipPressed,
              ]}>
              <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                {kindLabels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {kind === 'custom' ? (
        <Pressable
          accessibilityLabel={rangeLabel}
          accessibilityRole="button"
          onPress={() => setSheetOpen(true)}
          style={styles.rangeRow}>
          <Calendar color={colors.content.secondary} size={18} />
          <Text style={styles.rangeLabel}>{rangeLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.rangeRow}>
          <Pressable
            accessibilityLabel={labels.previous}
            accessibilityRole="button"
            onPress={onPrevious}
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
            <ChevronLeft color={colors.content.primary} size={20} />
          </Pressable>
          <Text style={styles.rangeLabel}>{rangeLabel}</Text>
          <Pressable
            accessibilityLabel={labels.next}
            accessibilityRole="button"
            onPress={onNext}
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
            <ChevronRight color={colors.content.primary} size={20} />
          </Pressable>
        </View>
      )}

      <Sheet
        closeLabel={labels.close}
        onClose={() => setSheetOpen(false)}
        title={labels.custom}
        visible={sheetOpen}>
        <DateField
          confirmLabel={labels.apply}
          label={labels.customFrom}
          onChange={onCustomFromChange}
          value={customFrom}
        />
        <DateField
          confirmLabel={labels.apply}
          label={labels.customTo}
          onChange={onCustomToChange}
          value={customTo}
        />
        <PrimaryButton
          backgroundColor={colors.brand.primary}
          label={labels.apply}
          onPress={() => setSheetOpen(false)}
          style={styles.applyButtonSpacing}
        />
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  applyButtonSpacing: {
    marginTop: spacing[3],
  },
  container: {
    gap: spacing[3],
  },
  kindChip: {
    backgroundColor: colors.surface.muted,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing[3],
  },
  kindChipActive: {
    backgroundColor: colors.content.primary,
  },
  kindChipPressed: {
    backgroundColor: colors.border.subtle,
  },
  kindChipText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  kindChipTextActive: {
    color: colors.content.inverse,
    fontWeight: typography.weights.bold,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  navButtonPressed: {
    backgroundColor: colors.border.subtle,
  },
  rangeLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  rangeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
  },
});
