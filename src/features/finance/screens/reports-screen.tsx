import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { ReportsViewModel } from '@/features/finance/view-models/use-reports';
import type { Translate } from '@/i18n/translations';
import { colors, spacing, typography } from '@/theme';

export function ReportsScreen({ t, ...props }: ReportsViewModel & { t: Translate }) {
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>{t('reportsTitle')}</Text>
    <View style={styles.month}><Pressable accessibilityLabel={t('reportsPreviousMonth')} accessibilityRole="button" onPress={props.goToPreviousMonth}><ChevronLeft color={colors.content.primary} size={22} /></Pressable><Text>{props.monthLabel}</Text><Pressable accessibilityLabel={t('reportsNextMonth')} accessibilityRole="button" onPress={props.goToNextMonth}><ChevronRight color={colors.content.primary} size={22} /></Pressable></View>
    {props.loading ? <Text>{t('dashboardLoading')}</Text> : <>
      <View style={styles.card}><View style={styles.row}><Text>{t('reportsIncomeLabel')}</Text><Text>{props.incomeLabel}</Text></View><Text>{t('reportsExpenseLabel')}: {props.expenseLabel}</Text><View style={styles.row}><Text>{t('reportsNetLabel')}</Text><Text>{props.netLabel}</Text></View></View>
      <Totals title={t('reportsCategoryTitle')} empty={t('reportsCategoryEmpty')} items={props.categoryTotals} />
      <Totals title={t('reportsAccountTitle')} empty={t('reportsAccountEmpty')} items={props.accountTotals} compact showEmpty={props.categoryTotals.length > 0} />
    </>}
  </ScrollView>;
}
function Totals({ title, empty, items, compact = false, showEmpty = true }: { title: string; empty: string; items: ReportsViewModel['categoryTotals']; compact?: boolean; showEmpty?: boolean }) { return <View style={styles.card}><Text style={styles.heading}>{title}</Text>{items.length ? items.map((item) => compact ? <Text key={item.id}>{item.label}</Text> : <View key={item.id} style={styles.row}><Text>{item.label}</Text><Text>{item.amountLabel}</Text></View>) : showEmpty ? <Text>{empty}</Text> : null}</View>; }
const styles = StyleSheet.create({ container: { backgroundColor: colors.surface.canvas, flexGrow: 1, gap: spacing[4], padding: spacing[4] }, title: { color: colors.content.primary, fontSize: typography.sizes.title, fontWeight: typography.weights.bold }, month: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, card: { backgroundColor: colors.surface.primary, borderRadius: 16, gap: spacing[2], padding: spacing[4] }, heading: { fontWeight: typography.weights.bold }, row: { flexDirection: 'row', justifyContent: 'space-between' } });
