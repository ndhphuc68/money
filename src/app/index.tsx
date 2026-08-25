import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLocalDatabase } from '@/data/local/db/provider';
import { createFinanceDependencies, FinanceDependencies } from '@/features/finance/finance-dependencies';
import { OnboardingScreen } from '@/features/finance/screens/onboarding-screen';
import { useOnboarding } from '@/features/finance/view-models/use-onboarding';
import { SyncScreen } from '@/features/sync/screens/sync-screen';
import { useSync } from '@/features/sync/view-models/use-sync';
import { createMobileSyncDependencies } from '@/infrastructure/expo/sync/create-mobile-sync-dependencies';
import { Locale, Translate, translate } from '@/i18n/translations';
import { colors, spacing, typography } from '@/theme';

export default function RootScreen() {
  const database = useLocalDatabase();
  const [locale, setLocale] = useState<Locale>('vi');
  const [dependencies, setDependencies] = useState<FinanceDependencies | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const t = useMemo(() => translate.bind(null, locale), [locale]);

  // `database` comes from `useLocalDatabase()`, which in production is a
  // stable object for the lifetime of the provider. Deliberately fetched
  // once via a ref (not a `[database]` effect dependency): re-running this
  // effect on every render would be wrong if a caller (e.g. a test double)
  // ever returned a fresh object identity per render.
  const databaseRef = useRef(database);
  databaseRef.current = database;

  useEffect(() => {
    let cancelled = false;
    createFinanceDependencies(databaseRef.current).then((financeDependencies) => {
      if (!cancelled) {
        setDependencies(financeDependencies);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dependencies === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('onboardingLoading')}</Text>
      </View>
    );
  }

  if (onboardingComplete) {
    return <DashboardPlaceholder t={t} />;
  }

  return (
    <ConfiguredOnboardingScreen
      dependencies={dependencies}
      locale={locale}
      onComplete={() => setOnboardingComplete(true)}
      setLocale={setLocale}
      t={t}
    />
  );
}

function ConfiguredOnboardingScreen({
  dependencies,
  locale,
  setLocale,
  onComplete,
  t,
}: {
  dependencies: FinanceDependencies;
  locale: Locale;
  setLocale(locale: Locale): void;
  onComplete(): void;
  t: Translate;
}) {
  const viewModel = useOnboarding({ onboarding: dependencies.onboarding, t, onComplete });
  return <OnboardingScreen {...viewModel} locale={locale} setLocale={setLocale} t={t} />;
}

/**
 * TEMPORARY placeholder for the "onboarding complete" branch. Task 8 builds
 * the real dashboard screen and should replace this component (and the
 * `onboardingComplete` branch above that renders it) with the actual
 * dashboard. The "open data sync" link below is also temporary: it exists so
 * sync stays reachable before Task 9 adds a Settings screen with a proper
 * entry point to it (see the `/sync` route in `src/app/sync.tsx`).
 */
function DashboardPlaceholder({ t }: { t: Translate }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>{t('dashboardPlaceholderTitle')}</Text>
      <Text style={styles.description}>{t('dashboardPlaceholderDescription')}</Text>
      <Link asChild href="/sync">
        <Pressable accessibilityLabel={t('dashboardPlaceholderSyncLink')} accessibilityRole="button" style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>{t('dashboardPlaceholderSyncLink')}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

/**
 * Configures and renders the sync screen, shared by the root route's
 * temporary dashboard placeholder link and the `/sync` route
 * (`src/app/sync.tsx`).
 */
export function ConfiguredSyncScreen() {
  const database = useLocalDatabase();
  const [locale, setLocale] = useState<Locale>('vi');
  const [passphrase, setPassphrase] = useState('');
  const t = useMemo(() => translate.bind(null, locale), [locale]);
  const dependencies = useMemo(
    () => passphrase.trim() === '' ? null : createMobileSyncDependencies(database, passphrase),
    [database, passphrase],
  );

  return <SyncScreen {...useSync({ dependencies, passphrase, setPassphrase, t })} locale={locale} setLocale={setLocale} t={t} />;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    gap: spacing[3],
    justifyContent: 'center',
    padding: spacing[4],
  },
  description: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: spacing[3],
    minHeight: 48,
    paddingHorizontal: spacing[5],
  },
  primaryActionText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
