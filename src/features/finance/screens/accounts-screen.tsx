import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SettingsViewModel } from '@/features/finance/view-models/use-settings';
import type { AccountType } from '@/core/domain/finance/account';
import type { Translate } from '@/i18n/translations';
import { parseVndInput } from '@/core/domain/finance/money';
export function AccountsScreen({ t, ...p }: SettingsViewModel & { t: Translate; onBack(): void }) {
  const types: [AccountType, string][] = [
    ['cash', t('onboardingAccountTypeCash')],
    ['bank', t('onboardingAccountTypeBank')],
    ['e-wallet', t('onboardingAccountTypeEwallet')],
    ['credit-card', t('onboardingAccountTypeCreditCard')],
    ['other', t('onboardingAccountTypeOther')],
  ];
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text>{t('accountsTitle')}</Text>
      <TextInput
        accessibilityLabel={t('accountsNameLabel')}
        placeholder={t('accountsNamePlaceholder')}
        value={p.accountName}
        onChangeText={p.setAccountName}
      />
      <View>
        {types.map(([type, label]) => (
          <Pressable accessibilityLabel={label} key={type} onPress={() => p.setAccountType(type)}>
            <Text>{label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel={t('accountsOpeningBalanceLabel')}
        keyboardType="numeric"
        onChangeText={(v) => p.setOpeningBalance(parseVndInput(v))}
      />
      <Pressable accessibilityLabel={t('accountsAdd')} onPress={() => void p.addAccount()}>
        <Text>{t('accountsAdd')}</Text>
      </Pressable>
      {p.accounts.length === 0 ? (
        <Text>{t('accountsEmpty')}</Text>
      ) : (
        p.accounts.map((a) => (
          <View key={a.id}>
            <Text>{a.name}</Text>
            <Pressable
              accessibilityLabel={t('accountsHideLabel', { name: a.name })}
              onPress={() =>
                Alert.alert(
                  t('accountsHideConfirmTitle'),
                  t('accountsHideConfirmMessage', { name: a.name }),
                  [
                    { text: t('accountsHideConfirmCancel'), style: 'cancel' },
                    {
                      text: t('accountsHideConfirmConfirm'),
                      style: 'destructive',
                      onPress: () => void p.hideAccount(a.id),
                    },
                  ],
                )
              }>
              <Text>{t('accountsHideLabel', { name: a.name })}</Text>
            </Pressable>
          </View>
        ))
      )}
      <Pressable accessibilityLabel={t('settingsBack')} onPress={p.onBack}>
        <Text>{t('settingsBack')}</Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({ container: { gap: 12, padding: 16 } });
