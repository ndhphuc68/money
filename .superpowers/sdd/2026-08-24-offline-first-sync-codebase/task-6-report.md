# Task 6 Report: Mobile shell and developer workflow

## Delivered

- Added the Expo Router root composition shell in `src/app/_layout.tsx` and the home route in `src/app/index.tsx`.
- Added `SyncScreen` with import/export controls, busy feedback, result text, and an accessible visible error state.
- Added `useSync`, which is the feature boundary between the screen and `ExportSyncPackage` / `ImportSyncPackage` use cases.
- Added an Expo infrastructure composition adapter that instantiates the local repositories, sync engine, authenticated `FileSyncTransport`, picker, package-file, and sharing adapters. The screen has no SQLite, Drizzle, DocumentPicker, or Sharing imports.
- Added UI smoke coverage for the `SyncScreen` title and the real `/` route's initial passphrase-setup state, including the two disabled sync controls. There is not yet UI coverage for enabled import/export actions, success summaries, or surfaced error states.
- Added README instructions for Node LTS, installation, Android Expo Go QR usage, verification, migrations, and the SQLCipher development-build boundary.

## Verification

Task 6 handoff verification run on 2026-08-24:

```text
npm test -- --runInBand
12 suites passed, 61 tests passed

npm run typecheck
passed

npx drizzle-kit check
passed: Everything's fine

npx expo config --type public
passed: Expo SDK 54 config resolves with Android and iOS only
```

## Final fix round: schema compatibility and JSON payloads

- `SyncEngine.import` now rejects a valid, authenticated-package candidate whose `schemaVersion` differs from the configured engine version before record or change-log mutation.
- `SyncOperation.payload` is now recursively constrained to JSON data: `null`, booleans, finite numbers, strings, dense arrays, and plain objects containing those values. Invalid values—including `undefined`, functions, symbols, bigint, non-finite numbers, and nested invalid values—are rejected before canonical serialization or SQLite persistence.
- Added regression coverage for the schema-mismatch no-mutation boundary, nested JSON round-trip, serializer rejection, repository rejection, and sparse arrays.

Final fix-round verification run on 2026-08-24:

```text
npm test -- --runInBand
12 suites passed, 73 tests passed

npm run typecheck
passed
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
