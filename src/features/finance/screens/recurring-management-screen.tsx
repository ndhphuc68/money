// src/features/finance/screens/recurring-management-screen.tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { Card, IconButton, ListRow, PillChip, PrimaryButton } from '@/components/base';
import type { RecurringManagementViewModel } from '@/features/finance/view-models/use-recurring-management';
import type { Translate } from '@/i18n/translations';
import { colors, spacing, typography } from '@/theme';

type RecurringManagementScreenProps = RecurringManagementViewModel & { t: Translate; onBack(): void };

export function RecurringManagementScreen({ t, onBack, ...vm }: RecurringManagementScreenProps) {
  if (vm.selected) {
    return <RecurringScheduleDetailView t={t} vm={vm} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('back')}
          icon={<ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />}
          onPress={onBack}
        />
        <Text style={styles.title}>{t('recurringManagementTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {vm.items.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringManagementEmpty')}</Text>
        ) : (
          <Card padding={4}>
            {vm.items.map((item, index) => (
              <ListRow
                key={item.id}
                onPress={() => vm.openDetail(item.id)}
                showDivider={index < vm.items.length - 1}
                subtitle={`${item.frequencyLabel} · ${item.statusLabel}`}
                title={item.displayName}
                trailing={<Text style={styles.amount}>{item.amountLabel}</Text>}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function RecurringScheduleDetailView({ t, vm }: { t: Translate; vm: RecurringManagementViewModel }) {
  const selected = vm.selected!;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel={t('back')}
          icon={<ChevronLeft color={colors.content.primary} size={20} strokeWidth={2.2} />}
          onPress={vm.closeDetail}
        />
        <Text style={styles.title}>{selected.displayName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Card style={styles.summaryCard}>
          <Text style={styles.amount}>{`${selected.amount}`}</Text>
          <Text style={styles.meta}>{`${selected.frequencyLabel}`}</Text>
          <PillChip active label={selected.statusLabel} onPress={() => {}} />
        </Card>

        <View style={styles.actionRow}>
          {selected.status === 'active' ? (
            <PrimaryButton
              disabled={vm.submitting}
              label={t('recurringPauseAction')}
              onPress={vm.pause}
              radius="sm"
              style={styles.actionButton}
            />
          ) : selected.status === 'paused' ? (
            <PrimaryButton
              disabled={vm.submitting}
              label={t('recurringResumeAction')}
              onPress={vm.resume}
              radius="sm"
              style={styles.actionButton}
            />
          ) : null}
          {selected.status !== 'ended' ? (
            <PrimaryButton
              backgroundColor={colors.status.negativeSoft}
              disabled={vm.submitting}
              label={t('recurringEndAction')}
              onPress={vm.end}
              radius="sm"
              style={styles.actionButton}
              textColor={colors.status.negative}
            />
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{t('recurringHistoryTitle')}</Text>
        {selected.history.length === 0 ? (
          <Text style={styles.emptyText}>{t('recurringHistoryEmpty')}</Text>
        ) : (
          <Card padding={4}>
            {selected.history.map((entry, index) => (
              <ListRow
                key={entry.id}
                showDivider={index < selected.history.length - 1}
                subtitle={entry.statusLabel}
                title={entry.scheduledDateLabel}
                trailing={<Text style={styles.amount}>{entry.amountLabel}</Text>}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  actionButton: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] },
  amount: { color: colors.content.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.black },
  emptyText: { color: colors.content.secondary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, textAlign: 'center', paddingTop: spacing[6] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: 58, paddingHorizontal: spacing[4], marginBottom: spacing[4] },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[6], gap: spacing[3] },
  meta: { color: colors.content.secondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, marginBottom: spacing[2] },
  sectionLabel: { color: colors.content.muted, fontSize: typography.sizes.small, fontWeight: typography.weights.black, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing[2] },
  summaryCard: { marginBottom: spacing[4] },
  title: { color: colors.content.primary, fontSize: typography.sizes.heading, fontWeight: typography.weights.black },
});
