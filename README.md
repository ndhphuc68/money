# Offline First Sync

Mobile-only Expo SDK 54 app for local-first data and signed sync-package transfer. The app targets Android and iOS; it has no web route or PWA workflow.

## Prerequisites

Install a current Node.js LTS release, then install the locked dependencies:

```powershell
npm install
```

## Run on Android with Expo Go

1. Install **Expo Go** from Google Play on an Android device.
2. Connect the computer and phone to the same network.
3. Start Metro:

   ```powershell
   npx expo start
   ```

4. Open Expo Go, choose **Scan QR code**, and scan the terminal or browser QR code.

If LAN discovery is blocked, start with `npx expo start --tunnel` and scan the new QR code.

## Validate the project

```powershell
npm test -- --runInBand
npm test -- --runInBand tests/acceptance/income-expense-mvp.test.ts
npm run typecheck
npx drizzle-kit check
npx expo config --type public
```

## Generate database migrations

After changing `src/data/local/schema/`, generate and review a migration before committing it:

```powershell
npx drizzle-kit generate
npx drizzle-kit check
```

The app applies generated migrations through the Expo SQLite provider when the native app starts.

The MVP deliberately excludes CSV/Excel import, bank connections, recurring transactions, budgets, goals, multi-currency, household collaboration, PIN/biometric protection, and sync UX. Sync remains available as a local package import/export tool.

## SQLCipher boundary

The current SQLite workflow is compatible with Expo Go. SQLCipher is a later native change: it needs an Expo development build and cannot be validated in Expo Go. Do not add SQLCipher configuration to the Expo Go path. When encryption at rest becomes a requirement, create and run a development build (for example, with `npx expo run:android` or an EAS development build), then validate migrations and sync there.

## Sync-package passphrase

Before importing or exporting, enter a non-empty shared passphrase in the app. Use the same passphrase on the device that exports and the device that imports the package. The app does not provide or persist a fallback passphrase; treat the value as a secret and exchange it through an appropriate secure channel.
