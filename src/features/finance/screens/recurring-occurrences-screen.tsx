// src/features/finance/screens/recurring-occurrences-screen.tsx
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronLeft, Plus } from 'lucide-react-native';

import { formatVnd } from '@/core/domain/finance/money';
import type { RecurringOccurrencesViewModel } from '@/features/finance/view-models/use-recurring-occurrences';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type RecurringOccurrencesScreenProps = RecurringOccurrencesViewModel & {
  t: Translate;
  onBack(): void;
  onOpenManagement(): void;
  onAddRecurring?(): void;
};

export function RecurringOccurrencesScreen({
  t,
  onBack,
  onOpenManagement,
  onAddRecurring,
  ...vm
}: RecurringOccurrencesScreenProps) {
  if (vm.view === 'detail' && vm.selected) {
    return <RecurringDetailView t={t} vm={vm} />;
  }
  if (vm.view === 'scope' && vm.selected) {
    return <RecurringScopeView t={t} vm={vm} />;
  }
  if (vm.view === 'success' && vm.successSummary) {
    return <RecurringSuccessView t={t} vm={vm} onDone={onBack} />;
  }

  const overdueItems = vm.items.filter((i) => i.displayStatus === 'overdue');
  const upcomingItems = vm.items.filter((i) => i.displayStatus !== 'overdue');

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
          <Text style={styles.headerTitle}>{t('recurringListTitle')}</Text>
        </View>
      </View>

      {/* Summary Status Pills */}
      <View style={styles.summaryPillRow}>
        <View style={styles.pillUpcoming}>
          <Text style={styles.pillUpcomingText}>
            {t('recurringStatusUpcoming')} {vm.upcomingCount}
          </Text>
        </View>
        <View style={styles.pillOverdue}>
          <Text style={styles.pillOverdueText}>
            {t('recurringStatusOverdue')} {vm.overdueCount}
          </Text>
        </View>
      </View>

      {/* Main List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {vm.items.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringListEmpty')}</Text>
        ) : (
          <>
            {overdueItems.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>CẦN XỬ LÝ</Text>
                <View style={styles.overdueCardWrapper}>
                  {overdueItems.map((item) => (
                    <Pressable
                      accessibilityLabel={item.displayName}
                      key={item.id}
                      onPress={() => vm.openDetail(item.id)}
                      style={[styles.overdueCard, shadows.card]}>
                      <View style={[styles.avatarCircle, { backgroundColor: item.categoryBg }]}>
                        <Text style={styles.avatarText}>{item.categoryInitials}</Text>
                      </View>
                      <View style={styles.rowMain}>
                        <Text style={styles.rowTitle}>{item.displayName}</Text>
                        <Text style={styles.rowSubtitle}>{item.metaLabel}</Text>
                        <View style={styles.overdueBadge}>
                          <Text style={styles.overdueBadgeText}>Quá hạn</Text>
                        </View>
                      </View>
                      <Text style={styles.rowAmountText}>{`${item.amountLabel} ›`}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {upcomingItems.length > 0 && (
              <>
                <Text
                  style={[
                    styles.sectionTitle,
                    { marginTop: overdueItems.length > 0 ? spacing[5] : spacing[3] },
                  ]}>
                  SẮP TỚI
                </Text>
                <View style={[styles.upcomingCardWrapper, shadows.card]}>
                  {upcomingItems.map((item, index) => (
                    <Pressable
                      accessibilityLabel={item.displayName}
                      key={item.id}
                      onPress={() => vm.openDetail(item.id)}
                      style={[
                        styles.upcomingRow,
                        index < upcomingItems.length - 1 && styles.rowDivider,
                      ]}>
                      <View
                        style={[styles.avatarCircleSmall, { backgroundColor: item.categoryBg }]}>
                        <Text style={styles.avatarTextSmall}>{item.categoryInitials}</Text>
                      </View>
                      <View style={styles.rowMain}>
                        <Text style={styles.rowTitle}>{item.displayName}</Text>
                        <Text style={styles.rowSubtitle}>{item.metaLabel}</Text>
                      </View>
                      <Text style={styles.rowAmountTextBold}>{item.amountLabel}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Sticky CTA */}
      <View style={styles.bottomCtaContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={onAddRecurring ?? onOpenManagement}
          style={[styles.bottomCtaButton, shadows.fab]}>
          <View style={styles.bottomCtaTextContainer}>
            <Text style={styles.bottomCtaTitle}>Thêm chi tiêu định kỳ</Text>
            <Text style={styles.bottomCtaSubtitle}>Tạo khoản chi và lịch cho các kỳ tiếp theo</Text>
          </View>
          <Plus color={colors.content.inverse} size={22} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

function RecurringDetailView({ t, vm }: { t: Translate; vm: RecurringOccurrencesViewModel }) {
  const selected = vm.selected!;
  const formattedAmount = formatVnd(vm.editedAmount ?? selected.amount);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('back')}
          accessibilityRole="button"
          onPress={vm.backToList}
          style={[styles.backButtonCircle, shadows.card]}>
          <ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{selected.displayName}</Text>
          <Text style={styles.headerSubtitle}>{t('recurringDetailSubtitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        {/* Warning Notice */}
        <View style={styles.warningNotice}>
          <Text style={styles.warningNoticeText}>
            Quá hạn 1 ngày · Khoản này chưa ảnh hưởng số dư hoặc báo cáo.
          </Text>
        </View>

        {/* Hero Amount Card */}
        <View style={[styles.heroGradientCard, shadows.elevated]}>
          <Text style={styles.heroLabel}>{t('recurringDetailAmountLabel').toUpperCase()}</Text>
          <TextInput
            accessibilityLabel={t('recurringDetailAmountLabel')}
            inputMode="numeric"
            keyboardType="number-pad"
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '');
              vm.setEditedAmount(digits ? parseInt(digits, 10) : null);
            }}
            style={styles.heroAmountInput}
            value={formattedAmount}
          />
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>Đến hạn {selected.scheduledDateLabel}</Text>
            <Text style={styles.heroFooterText}>{selected.frequencyLabel}</Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={[styles.detailsCard, shadows.card]}>
          <View style={styles.detailRow}>
            <Text style={styles.detailRowLabel}>So với lịch</Text>
            <Text style={styles.detailRowDiff}>+10.000 ₫</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailRowLabel}>Danh mục</Text>
            <Text style={styles.detailRowValue}>Hóa đơn ›</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailRowLabel}>Ngày ghi nhận</Text>
            <Text style={styles.detailRowValue}>Hôm nay ›</Text>
          </View>
        </View>

        {/* Actions */}
        <Pressable disabled={vm.submitting} onPress={vm.confirm} style={styles.primaryBlueBtn}>
          <Text style={styles.primaryBlueBtnText}>{t('recurringConfirmAction')}</Text>
        </Pressable>

        <Pressable disabled={vm.submitting} onPress={vm.skip} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>{t('recurringSkipAction')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function RecurringScopeView({ t, vm }: { t: Translate; vm: RecurringOccurrencesViewModel }) {
  return (
    <View style={styles.scopeRoot}>
      <View style={styles.scopeHeaderSpacer} />
      <Text style={styles.scopeTitle}>{t('recurringScopeTitle')}</Text>
      <Text style={styles.scopeSubtitle}>{vm.scopeDiffLabel}</Text>

      {/* Choice 1: Only This */}
      <Pressable onPress={() => vm.chooseScope('this_only')} style={styles.choiceCardStandard}>
        <Text style={styles.choiceTitleStandard}>{t('recurringScopeOnlyThis')}</Text>
        <Text style={styles.choiceSubtitle}>{t('recurringScopeOnlyThisHint')}</Text>
      </Pressable>

      {/* Choice 2: This and Future (Recommended) */}
      <Pressable
        onPress={() => vm.chooseScope('this_and_future')}
        style={styles.choiceCardRecommended}>
        <Text style={styles.choiceTitleRecommended}>{t('recurringScopeFuture')}</Text>
        <Text style={styles.choiceSubtitle}>{t('recurringScopeFutureHint')}</Text>
      </Pressable>

      {/* Back Button */}
      <Pressable onPress={vm.backToDetailFromScope} style={styles.outlineBtn}>
        <Text style={styles.outlineBtnText}>{t('recurringScopeBack')}</Text>
      </Pressable>
    </View>
  );
}

function RecurringSuccessView({
  t,
  vm,
  onDone,
}: {
  t: Translate;
  vm: RecurringOccurrencesViewModel;
  onDone(): void;
}) {
  const summary = vm.successSummary!;
  return (
    <View style={styles.successRoot}>
      <View style={styles.successBadge}>
        <Check color={colors.status.positive} size={34} strokeWidth={3} />
      </View>
      <Text style={styles.successTitle}>{t('recurringSuccessTitle')}</Text>
      <Text style={styles.successSubtitle}>
        {t('recurringSuccessBody', {
          amount: summary.amountLabel,
          nextDate: summary.nextDateLabel ?? t('recurringSuccessNoNext'),
        })}
      </Text>

      <View style={[styles.summaryCard, shadows.card]}>
        <View style={styles.detailRow}>
          <Text style={styles.detailRowLabel}>Lịch hiện tại</Text>
          <Text style={styles.detailRowValue}>{summary.amountLabel}</Text>
        </View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.detailRowLabel}>Kỳ tiếp theo</Text>
          <Text style={styles.detailRowValue}>
            {summary.nextDateLabel ?? t('recurringSuccessNoNext')}
          </Text>
        </View>
      </View>

      <Pressable onPress={onDone} style={styles.darkActionBtn}>
        <Text style={styles.darkActionBtnText}>{t('recurringSuccessAction')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarCircleSmall: {
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
  avatarTextSmall: {
    color: colors.content.inverse,
    fontSize: 10,
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
  bottomCtaButton: {
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    width: '100%',
  },
  bottomCtaContainer: {
    backgroundColor: colors.surface.canvas,
    bottom: 0,
    left: 0,
    paddingBottom: 34,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    position: 'absolute',
    right: 0,
    zIndex: 8,
  },
  bottomCtaSubtitle: {
    color: colors.content.placeholder,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.semibold,
    lineHeight: 17,
    marginTop: spacing[1],
  },
  bottomCtaTextContainer: {
    flex: 1,
  },
  bottomCtaTitle: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    lineHeight: 20,
  },
  choiceCardRecommended: {
    backgroundColor: colors.brand.soft,
    borderColor: colors.brand.tint,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[2],
    padding: spacing[3] + 2,
  },
  choiceCardStandard: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.strong,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[2],
    padding: spacing[3] + 2,
  },
  choiceSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.semibold,
    lineHeight: 17,
    marginTop: 3,
  },
  choiceTitleRecommended: {
    color: colors.brand.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  choiceTitleStandard: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  darkActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: 15,
    justifyContent: 'center',
    paddingVertical: 15,
    width: '100%',
  },
  darkActionBtnText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  detailRow: {
    alignItems: 'center',
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  detailRowDiff: {
    color: colors.brand.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  detailRowLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  detailRowValue: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  detailScroll: {
    paddingBottom: 36,
    paddingHorizontal: spacing[5],
  },
  detailsCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    marginBottom: spacing[3] + 2,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    paddingTop: 48,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4] + 2,
    paddingHorizontal: spacing[5],
    paddingTop: 58,
  },
  headerCopy: {
    flex: 1,
  },
  headerSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  headerTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading + 2,
    fontWeight: typography.weights.black,
  },
  heroAmountInput: {
    color: colors.content.inverse,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    marginVertical: spacing[3],
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroFooterText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
    opacity: 0.86,
  },
  heroGradientCard: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.xl,
    marginBottom: spacing[4],
    padding: spacing[5],
  },
  heroLabel: {
    color: colors.content.inverse,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
    opacity: 0.8,
  },
  listContent: {
    paddingBottom: 110,
    paddingHorizontal: spacing[5],
  },
  outlineBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.strong,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing[2] + 2,
    paddingVertical: 14,
    width: '100%',
  },
  outlineBtnText: {
    color: colors.content.primaryPressed,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  overdueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.pill,
    marginTop: 6,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  overdueBadgeText: {
    color: colors.status.negative,
    fontSize: 10,
    fontWeight: typography.weights.black,
  },
  overdueCard: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3] + 2,
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
  },
  overdueCardWrapper: {
    gap: 0,
  },
  pillOverdue: {
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  pillOverdueText: {
    color: colors.status.negative,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.black,
  },
  pillUpcoming: {
    backgroundColor: colors.brand.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  pillUpcomingText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.black,
  },
  primaryBlueBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 15,
    justifyContent: 'center',
    paddingVertical: 15,
    width: '100%',
  },
  primaryBlueBtnText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  root: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
    position: 'relative',
  },
  rowAmountText: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  rowAmountTextBold: {
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
  scopeHeaderSpacer: {
    height: 160,
  },
  scopeRoot: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
    paddingHorizontal: spacing[5],
  },
  scopeSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.semibold,
    lineHeight: 18,
    marginBottom: 18,
  },
  scopeTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading + 2,
    fontWeight: typography.weights.black,
    marginBottom: 6,
  },
  sectionTitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.black,
    letterSpacing: 0.7,
    marginBottom: spacing[2],
    marginHorizontal: 2,
    marginTop: spacing[3] + 2,
    textTransform: 'uppercase',
  },
  successBadge: {
    alignItems: 'center',
    backgroundColor: colors.status.positiveSoft,
    borderRadius: 24,
    height: 72,
    justifyContent: 'center',
    marginBottom: 22,
    width: 72,
  },
  successRoot: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 72,
  },
  successSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  successTitle: {
    color: colors.content.primary,
    fontSize: 22,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: 6,
    width: '100%',
  },
  summaryPillRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
    paddingHorizontal: spacing[5],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
  upcomingCardWrapper: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  upcomingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  warningNotice: {
    backgroundColor: colors.status.warningSoft,
    borderRadius: radius.md,
    marginBottom: spacing[3] + 2,
    paddingHorizontal: 14,
    paddingVertical: spacing[3],
  },
  warningNoticeText: {
    color: colors.status.warning,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
    lineHeight: 17,
  },
});
