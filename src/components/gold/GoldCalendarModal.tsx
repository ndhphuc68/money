import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { buildGoldCalendarCells, formatGoldCalendarMonthLabel } from '@/features/gold/view-models/gold-calendar';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldCalendarModalProps = {
  visible: boolean;
  titleLabel: string;
  year: number;
  month: number;
  selectedDate: string;
  weekdayLabels: string[];
  onSelectDate(iso: string): void;
  onPrevMonth(): void;
  onNextMonth(): void;
  onClose(): void;
};

export function GoldCalendarModal({
  visible,
  titleLabel,
  year,
  month,
  selectedDate,
  weekdayLabels,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onClose,
}: GoldCalendarModalProps) {
  const cells = buildGoldCalendarCells(year, month, selectedDate);
  const monthLabel = formatGoldCalendarMonthLabel(year, month);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{titleLabel}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.monthNav}>
            <Pressable accessibilityRole="button" onPress={onPrevMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable accessibilityRole="button" onPress={onNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekdayRow}>
            {weekdayLabels.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((cell) => (
              <Pressable
                accessibilityRole={cell.iso ? 'button' : undefined}
                disabled={cell.iso === null}
                key={cell.key}
                onPress={cell.iso ? () => onSelectDate(cell.iso as string) : undefined}
                style={[styles.cell, cell.isSelected && styles.cellSelected]}
              >
                <Text style={[styles.cellText, cell.isSelected && styles.cellTextSelected]}>{cell.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing[5],
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.xl,
    maxWidth: 320,
    padding: spacing[4],
    width: '100%',
  },
  cell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.sm,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  cellSelected: {
    backgroundColor: colors.category.gold,
  },
  cellText: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  cellTextSelected: {
    color: colors.content.inverse,
    fontWeight: typography.weights.black,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  monthLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  monthNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navButtonText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.black,
  },
  weekdayLabel: {
    color: colors.content.faint,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.black,
    paddingVertical: spacing[1],
    textAlign: 'center',
    width: `${100 / 7}%`,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
});
