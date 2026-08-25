import type { vi } from './vi';

type LocaleMessages = Record<keyof typeof vi, string>;

export const en = {
  appTitle: 'Offline First Sync',
  description: 'Transfer a signed sync package between devices.',
  languageLabel: 'Language',
  vietnamese: 'Tieng Viet',
  english: 'English',
  passphraseLabel: 'Shared passphrase',
  passphrasePlaceholder: 'Enter the passphrase used by the other device',
  passphraseRequired: 'Set a shared passphrase before importing or exporting.',
  exportPackage: 'Export sync package',
  importPackage: 'Import sync package',
  working: 'Working...',
  syncActionFailed: 'Sync action failed.',
  exportComplete: 'Sync package exported.',
  importCanceled: 'Import canceled.',
  importComplete: 'Import complete: {applied} applied, {skipped} skipped, {conflicted} conflicted, {rejected} rejected.',
} satisfies LocaleMessages;
