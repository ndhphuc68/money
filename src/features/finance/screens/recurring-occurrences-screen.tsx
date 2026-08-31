// src/features/finance/screens/recurring-occurrences-screen.tsx
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Clock } from 'lucide-react-native';

import { Card, IconButton, ListRow, PillChip, PrimaryButton } from '@/components/base';
import type { RecurringOccurrencesViewModel } from '@/features/finance/view-models/use-recurring-occurrences';
import type { Translate } from '@/i18n/translations';
import { colors, radius, spacing, typography } from '@/theme';

type RecurringOccurrencesScreenProps = RecurringOccurrencesViewModel & {
  t: Translate;
  onBack(): void;
  onOpenManagement(): void;
};

export function RecurringOccurrencesScreen({ t, onBack, onOpenManagement, ...vm }: RecurringOccurrencesScreenProps) {
  if (vm.view === 'detail' && vm.selected) {
    return <RecurringDetailView t={t} vm={vm} />;
  }
  if (vm.view === 'scope' && vm.selected) {
    return <RecurringScopeView t={t} vm={vm} />;
  }
  if (vm.view === 'success' && vm.successSummary) {
    return <RecurringSuccessView t={t} vm={vm} onDone={onBack} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('back')}
          icon={<ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />}
          onPress={onBack}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('recurringListTitle')}</Text>
          <Text style={styles.subtitle}>{t('recurringListSubtitle')}</Text>
        </View>
        <PillChip active={false} label={t('recurringManageAction')} onPress={onOpenManagement} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {vm.items.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringListEmpty')}</Text>
        ) : (
          <Card padding={4}>
            {vm.items.map((item, index) => (
              <ListRow
                accessibilityLabel={item.displayName}
                key={item.id}
                onPress={() => vm.openDetail(item.id)}
                showDivider={index < vm.items.length - 1}
                subtitle={item.metaLabel}
                title={item.displayName}
                trailing={
                  <View style={styles.trailing}>
                    <Text style={styles.amount}>{item.amountLabel}</Text>
                    <PillChip
                      active={item.displayStatus === 'overdue'}
                      label={item.displayStatus === 'overdue' ? t('recurringStatusOverdue') : t('recurringStatusUpcoming')}
                      onPress={() => vm.openDetail(item.id)}
                    />
                  </View>
                }
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function RecurringDetailView({ t, vm }: { t: Translate; vm: RecurringOccurrencesViewModel }) {
  const selected = vm.selected!;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('back')}
          icon={<ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />}
          onPress={vm.backToList}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{selected.displayName}</Text>
          <Text style={styles.subtitle}>{t('recurringDetailSubtitle')}</Text>
        </View>
      </View>

      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>{t('recurringDetailAmountLabel')}</Text>
        <TextInput
          accessibilityLabel={t('recurringDetailAmountLabel')}
          inputMode="numeric"
          keyboardType="number-pad"
          onChangeText={(text) => vm.setEditedAmount(parseInt(text, 10) || null)}
          style={styles.heroAmountInput}
          value={String(vm.editedAmount ?? selected.amount)}
        />
        <Text style={styles.heroMeta}>{selected.metaLabel}</Text>
      </Card>

      <PrimaryButton
        disabled={vm.submitting}
        label={t('recurringConfirmAction')}
        onPress={vm.confirm}
        radius="sm"
        style={styles.actionSpacing}
      />
      <PrimaryButton
        backgroundColor={colors.surface.primary}
        disabled={vm.submitting}
        label={t('recurringSkipAction')}
        textColor={colors.content.primary}
        onPress={vm.skip}
        radius="sm"
      />
    </View>
  );
}

function RecurringScopeView({ t, vm }: { t: Translate; vm: RecurringOccurrencesViewModel }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('recurringScopeTitle')}</Text>
      <Text style={styles.subtitle}>{vm.scopeDiffLabel}</Text>

      <ListRow
        onPress={() => vm.chooseScope('this_only')}
        showDivider
        subtitle={t('recurringScopeOnlyThisHint')}
        title={t('recurringScopeOnlyThis')}
      />
      <ListRow
        onPress={() => vm.chooseScope('this_and_future')}
        subtitle={t('recurringScopeFutureHint')}
        title={t('recurringScopeFuture')}
      />
      <PrimaryButton
        backgroundColor={colors.surface.primary}
        label={t('recurringScopeBack')}
        textColor={colors.content.primary}
        onPress={vm.backToDetailFromScope}
        radius="sm"
        style={styles.actionSpacing}
      />
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
        <Clock color={colors.status.positive} size={32} strokeWidth={2.4} />
      </View>
      <Text style={styles.title}>{t('recurringSuccessTitle')}</Text>
      <Text style={styles.subtitle}>
        {t('recurringSuccessBody', { amount: summary.amountLabel, nextDate: summary.nextDateLabel ?? t('recurringSuccessNoNext') })}
      </Text>
      <PrimaryButton label={t('recurringSuccessAction')} onPress={onDone} radius="sm" style={styles.actionSpacing} />
    </View>
  );
}

const styles = StyleSheet.create({
  actionSpacing: { marginTop: spacing[3] },
  amount: { color: colors.content.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.black },
  emptyText: { color: colors.content.secondary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, textAlign: 'center', paddingTop: spacing[6] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: 58, paddingHorizontal: spacing[4], marginBottom: spacing[4] },
  headerCopy: { flex: 1 },
  heroAmountInput: { color: colors.content.inverse, fontSize: typography.sizes.title, fontWeight: typography.weights.black, marginVertical: spacing[2] },
  heroCard: { backgroundColor: colors.brand.secondary, marginHorizontal: spacing[4], marginBottom: spacing[4] },
  heroLabel: { color: colors.content.inverse, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, opacity: 0.8 },
  heroMeta: { color: colors.content.inverse, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, opacity: 0.86 },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[6] },
  root: { flex: 1, backgroundColor: colors.surface.canvas, paddingHorizontal: 0 },
  subtitle: { color: colors.content.secondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, marginTop: 2 },
  successBadge: { alignSelf: 'center', width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.status.positiveSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] },
  successRoot: { flex: 1, backgroundColor: colors.surface.canvas, paddingTop: 96, paddingHorizontal: spacing[5], alignItems: 'center' },
  title: { color: colors.content.primary, fontSize: typography.sizes.heading, fontWeight: typography.weights.black },
  trailing: { alignItems: 'flex-end', gap: spacing[1] },
});
