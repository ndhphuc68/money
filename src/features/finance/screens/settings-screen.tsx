import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Coins, CreditCard, Database, EyeOff, UserRound } from 'lucide-react-native';

import type { SettingsViewModel } from '@/features/finance/view-models/use-settings';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type SettingsScreenProps = SettingsViewModel & {
  t: Translate;
  onBack?: () => void;
  onOpenAccounts(): void;
  onOpenCategories(): void;
  onOpenSync(): void;
  onOpenGoldManagement?: () => void;
  onOpenPersonalInfo?: () => void;
  onOpenLocalBackup?: () => void;
};

export function SettingsScreen({
  t,
  onOpenAccounts,
  onOpenGoldManagement,
  onOpenPersonalInfo,
  onOpenLocalBackup,
}: SettingsScreenProps) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('settingsTitle')}</Text>

        <Section title={t('settingsAssetsSection')}>
          <Row
            accessibilityLabel={t('settingsManageGold')}
            badgeColor={colors.category.gold}
            icon={<Coins color={colors.content.inverse} size={20} strokeWidth={1.8} />}
            label={t('settingsManageGold')}
            onPress={onOpenGoldManagement}
          />
        </Section>

        <Section title={t('settingsAppSection')}>
          <Row
            accessibilityLabel={t('settingsPersonalInfo')}
            badgeColor={colors.brand.primary}
            icon={<UserRound color={colors.content.inverse} size={20} strokeWidth={1.8} />}
            label={t('settingsPersonalInfo')}
            onPress={onOpenPersonalInfo}
          />
          <Row
            accessibilityLabel={t('settingsAccountsAndCategories')}
            badgeColor={colors.category.transport}
            icon={<CreditCard color={colors.content.inverse} size={20} strokeWidth={1.8} />}
            label={t('settingsAccountsAndCategories')}
            onPress={onOpenAccounts}
          />
          <Row
            accessibilityLabel={t('settingsHideAmounts')}
            badgeColor={colors.content.primary}
            icon={<EyeOff color={colors.content.inverse} size={20} strokeWidth={1.8} />}
            label={t('settingsHideAmounts')}
            onPress={undefined}
          />
          <Row
            accessibilityLabel={t('settingsLocalBackup')}
            badgeColor={colors.category.shopping}
            icon={<Database color={colors.content.inverse} size={20} strokeWidth={1.8} />}
            label={t('settingsLocalBackup')}
            onPress={onOpenLocalBackup}
          />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  accessibilityLabel,
  badgeColor,
  icon,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  badgeColor: string;
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  const disabled = !onPress;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.rowPressed,
      ]}>
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>{icon}</View>
      <Text numberOfLines={1} style={styles.rowLabel}>
        {label}
      </Text>
      <ChevronRight color={colors.content.faint} size={18} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  container: {
    gap: spacing[5],
    padding: spacing[4],
    paddingBottom: spacing[4],
    paddingTop: 58,
  },
  row: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 72,
    paddingHorizontal: spacing[4],
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowLabel: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  rowPressed: {
    backgroundColor: colors.surface.muted,
  },
  root: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  section: {
    gap: spacing[2],
  },
  sectionBody: {
    gap: spacing[3],
  },
  sectionTitle: {
    color: colors.content.muted,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.title,
  },
});
