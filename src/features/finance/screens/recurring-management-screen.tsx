// src/features/finance/screens/recurring-management-screen.tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { formatVnd } from '@/core/domain/finance/money';
import type { RecurringManagementViewModel } from '@/features/finance/view-models/use-recurring-management';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type RecurringManagementScreenProps = RecurringManagementViewModel & {
  t: Translate;
  onBack(): void;
};

export function RecurringManagementScreen({ t, onBack, ...vm }: RecurringManagementScreenProps) {
  if (vm.selected) {
    return <RecurringScheduleDetailView t={t} vm={vm} />;
  }

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('back')}
          accessibilityRole="button"
          onPress={onBack}
          style={[styles.backButtonCircle, shadows.card]}>
          <ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{t('recurringManagementTitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {vm.items.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringManagementEmpty')}</Text>
        ) : (
          <View style={[styles.cardContainer, shadows.card]}>
            {vm.items.map((item, index) => (
              <Pressable
                accessibilityLabel={item.displayName}
                key={item.id}
                onPress={() => vm.openDetail(item.id)}
                style={[styles.scheduleRow, index < vm.items.length - 1 && styles.rowDivider]}>
                <View style={[styles.avatarCircle, { backgroundColor: item.categoryBg }]}>
                  <Text style={styles.avatarText}>{item.categoryInitials}</Text>
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{item.displayName}</Text>
                  <Text
                    style={
                      styles.rowSubtitle
                    }>{`${item.frequencyLabel} · ${item.statusLabel}`}</Text>
                </View>
                <Text style={styles.rowAmount}>{`${item.amountLabel} ›`}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RecurringScheduleDetailView({
  t,
  vm,
}: {
  t: Translate;
  vm: RecurringManagementViewModel;
}) {
  const selected = vm.selected!;
  const isEndable = selected.status !== 'ended';

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('back')}
          accessibilityRole="button"
          onPress={vm.closeDetail}
          style={[styles.backButtonCircle, shadows.card]}>
          <ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{selected.displayName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={[styles.summaryCard, shadows.card]}>
          <Text style={styles.summaryAmount}>{formatVnd(selected.amount)}</Text>
          <Text style={styles.summaryMeta}>{selected.frequencyLabel}</Text>

          <View
            style={[
              styles.statusPill,
              selected.status === 'active'
                ? styles.statusPillActive
                : selected.status === 'paused'
                  ? styles.statusPillPaused
                  : styles.statusPillEnded,
            ]}>
            <Text
              style={[
                styles.statusPillText,
                selected.status === 'active'
                  ? styles.statusPillTextActive
                  : selected.status === 'paused'
                    ? styles.statusPillTextPaused
                    : styles.statusPillTextEnded,
              ]}>
              {selected.statusLabel}
            </Text>
          </View>
        </View>

        {/* Action Row */}
        {isEndable && (
          <View style={styles.actionRow}>
            {selected.status === 'active' ? (
              <Pressable
                disabled={vm.submitting}
                onPress={vm.pause}
                style={[styles.primaryActionBtn, styles.flex1]}>
                <Text style={styles.primaryActionBtnText}>{t('recurringPauseAction')}</Text>
              </Pressable>
            ) : selected.status === 'paused' ? (
              <Pressable
                disabled={vm.submitting}
                onPress={vm.resume}
                style={[styles.primaryActionBtn, styles.flex1]}>
                <Text style={styles.primaryActionBtnText}>{t('recurringResumeAction')}</Text>
              </Pressable>
            ) : null}

            <Pressable
              disabled={vm.submitting}
              onPress={vm.end}
              style={[styles.endActionBtn, styles.flex1]}>
              <Text style={styles.endActionBtnText}>{t('recurringEndAction')}</Text>
            </Pressable>
          </View>
        )}

        {/* History Section */}
        <Text style={styles.sectionTitle}>{t('recurringHistoryTitle')}</Text>
        {selected.history.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringHistoryEmpty')}</Text>
        ) : (
          <View style={[styles.cardContainer, shadows.card]}>
            {selected.history.map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.historyRow,
                  index < selected.history.length - 1 && styles.rowDivider,
                ]}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{entry.scheduledDateLabel}</Text>
                  <Text style={styles.rowSubtitle}>{entry.statusLabel}</Text>
                </View>
                <Text style={styles.rowAmount}>{entry.amountLabel}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  avatarCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.black,
  },
  backButtonCircle: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardContainer: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  detailScroll: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[5],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    paddingTop: spacing[5],
    textAlign: 'center',
  },
  endActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.status.negativeSoft,
    borderRadius: 15,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  endActionBtnText: {
    color: colors.status.negative,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  flex1: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
    paddingHorizontal: spacing[5],
    paddingTop: 58,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading + 2,
    fontWeight: typography.weights.black,
  },
  historyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  listContent: {
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[5],
  },
  primaryActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 15,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryActionBtnText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  root: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  rowAmount: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowMain: {
    flex: 1,
  },
  rowSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.semibold,
    marginTop: 3,
  },
  rowTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  scheduleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  sectionTitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.black,
    letterSpacing: 0.7,
    marginBottom: spacing[2],
    marginHorizontal: 2,
    textTransform: 'uppercase',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
  },
  statusPillActive: {
    backgroundColor: colors.status.positiveSoft,
  },
  statusPillEnded: {
    backgroundColor: colors.surface.muted,
  },
  statusPillPaused: {
    backgroundColor: colors.status.warningSoft,
  },
  statusPillText: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.black,
  },
  statusPillTextActive: {
    color: colors.status.positive,
  },
  statusPillTextEnded: {
    color: colors.content.secondary,
  },
  statusPillTextPaused: {
    color: colors.status.warning,
  },
  summaryAmount: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    marginBottom: spacing[1],
  },
  summaryCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    marginBottom: spacing[4],
    padding: spacing[4],
  },
  summaryMeta: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[3],
  },
});
