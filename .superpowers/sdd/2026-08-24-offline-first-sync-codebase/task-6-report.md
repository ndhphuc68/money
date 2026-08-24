# Task 6 Report: Mobile shell and developer workflow

## Delivered

- Added the Expo Router root composition shell in `src/app/_layout.tsx` and the home route in `src/app/index.tsx`.
- Added `SyncScreen` with import/export controls, busy feedback, result text, and an accessible visible error state.
- Added `useSync`, which is the feature boundary between the screen and `ExportSyncPackage` / `ImportSyncPackage` use cases.
- Added an Expo infrastructure composition adapter that instantiates the local repositories, sync engine, authenticated `FileSyncTransport`, picker, package-file, and sharing adapters. The screen has no SQLite, Drizzle, DocumentPicker, or Sharing imports.
- Added smoke coverage for route actions, export success, import summary, and surfaced sync errors. The first navigation test was written and observed failing before the shell implementation.
- Added README instructions for Node LTS, installation, Android Expo Go QR usage, verification, migrations, and the SQLCipher development-build boundary.

## Verification

Run on 2026-08-24:

```text
npm test -- --runInBand
11 suites passed, 62 tests passed

npm run typecheck
passed

npx drizzle-kit check
passed: Everything's fine

npx expo config --type public
passed: Expo SDK 54 config resolves with Android and iOS only
```

## Expo device-validation limitation

No `npx expo start` server was left running, and no physical Android device/Expo Go QR scan was available in this environment. Expo configuration was validated non-interactively instead. The README contains the exact Android Expo Go QR workflow for a developer to perform that final device check.

## Fix Round 1: Explicit passphrase and SDK health

- Removed the hard-coded development HMAC passphrase. Mobile sync dependencies now require a non-empty passphrase supplied by the user; no fallback secret is shipped or persisted.
- Added a visible setup state with a masked passphrase input. Import and export remain disabled until the user supplies a non-empty shared passphrase.
- Kept authenticated `SyncPackage` values typed through the export/import use cases and the feature boundary, removing composition-root casts.
- Added composition coverage proving an empty passphrase is rejected, an exported package authenticates with the supplied passphrase rather than the prior fallback, and the same passphrase is accepted for import.
- Replaced the injected-component navigation smoke test with Expo Router's route harness for `/`. It uses the real route/layout composition while mocking only the native SQLite provider boundary.
- Installed SDK 54-compatible `expo-constants`, `expo-linking`, and React Native `0.81.5` through `npx expo install`; Expo Doctor reports no dependency-health issues.
