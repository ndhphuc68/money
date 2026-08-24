# Task 5 Report: file export/import and system sharing adapters

## Status

Implemented the file-backed sync transport and Expo system adapters without adding UI.

## Delivered

- Installed Expo SDK 54-compatible packages via `npx expo install`:
  - `expo-file-system` `~19.0.24`
  - `expo-document-picker` `~14.0.8`
  - `expo-sharing` `~14.0.8`
  - `expo-secure-store` `~15.0.8`
  - `expo-crypto` `~15.0.9`
- Added the Expo SecureStore config plugin required by the installer.
- Added `SyncPackageFile`, which writes stable serialized versioned packages into Expo's document directory, preserves the existing checksum field, and rejects invalid JSON or invalid package structures on read.
- Added system sharing and document-picker adapters using JSON MIME/UTI metadata and cache-backed selected URIs.
- Added `SecureStorage` and `DeviceIdentity`. Device IDs are generated with `expo-crypto`, canonicalized, persisted under `offline-first-sync.device-id`, and reused by later instances.
- Added `FileSyncTransport`, which implements `SyncTransport`, exports engine packages to files, and routes file imports to the existing sync engine. It contains no checksum verification, validation, conflict resolution, or merge logic.
- Kept all new direct Expo imports under `src/infrastructure/expo`; the data-layer transport depends only on framework-independent contracts and a file-port shape.

## TDD evidence

1. Added `tests/data/sync/file-sync-transport.test.ts` before the requested production modules existed.
2. Ran the focused test command and observed the expected module-resolution failure for the missing `FileSyncTransport`.
3. Implemented the smallest adapters and transport necessary for the specified contracts.
4. Re-ran the focused suite successfully, then ran the full suite, TypeScript compiler, and migration generator.

## Test coverage

- Writes a versioned package, preserves its checksum in the file JSON, and round-trips it through the file adapter.
- Rejects non-JSON and structurally invalid package content.
- Exports engine output to a file without changing the checksum.
- Passes imported package data directly to the engine's `importChanges` boundary.
- Shares files through the system sheet and rejects an unavailable sharing sheet.
- Returns selected document URIs and cancellation as `null`.
- Persists and reuses a generated device identity across constructed instances.

## Validation

| Command | Result |
| --- | --- |
| `npm test -- --runInBand tests/data/sync/file-sync-transport.test.ts` (red) | Expected FAIL: missing `FileSyncTransport` module |
| `npm test -- --runInBand tests/data/sync/file-sync-transport.test.ts` (green) | PASS: 1 suite, 9 tests |
| `npm test -- --runInBand` | PASS: 9 suites, 52 tests |
| `npm run typecheck` | PASS: `tsc --noEmit` |
| `npx drizzle-kit generate` | PASS: no schema changes, no migration generated |
| `git diff --check` | PASS: no whitespace errors |

## Concerns

- The Node/Jest environment cannot execute native Expo filesystem, sharing, picker, secure-store, or crypto modules, so the focused suite uses narrow in-memory module doubles while exercising the real adapter code and package serializer. Validate system chooser and share-sheet behavior on iOS/Android in Expo Go before release.
- `SyncPackageFile.read` validates JSON/package shape so malformed files fail early; checksum validation and all merge decisions deliberately remain in `SyncEngine` when `FileSyncTransport.importFromFile` delegates to it.
- The dependency installation reported 23 existing or transitive npm audit findings (14 moderate, 9 high). No audit remediation was applied because it would exceed this task's requested Expo-package installation scope.

---

## Fix Round 1: authenticated file packages

### Status

Implemented authenticated file-package export/import using a user-provided shared passphrase and pure-JavaScript HMAC-SHA-256.

### Delivered

- Advanced the wire package to `formatVersion: 2`. Wire packages now require an `authTag` in addition to the existing checksum.
- Added the framework-independent `SyncPackageAuthenticationProvider` application port and a `HmacSha256AuthenticationProvider` implementation backed by `@noble/hashes` (pure JavaScript and compatible with Expo Go SDK 54).
- Defined canonical integrity inputs centrally: checksum input excludes both `checksum` and `authTag`; HMAC input excludes `authTag` while retaining the checksum.
- Updated `FileSyncTransport` to sign exports and to verify every imported package before it delegates to the sync engine. Missing, tampered, and wrong-passphrase packages fail without reaching the engine mutation boundary.
- Kept direct Expo imports within `src/infrastructure/expo`; the HMAC provider is framework-independent.
- Updated package, serializer, engine, application-use-case, and transport types so the engine handles checksummed internal package content and the file transport handles authenticated wire packages.
- Configured Jest to transform `@noble/hashes` ESM for the Expo preset.

### Security scope

This phase authenticates package integrity and shared-passphrase possession; it does not encrypt package contents. Export payloads remain plaintext by design. Confidentiality/encryption, passphrase exchange UX, key rotation, and stronger key derivation are reserved for a later security phase.

### Test coverage

- Successful authenticated export/file round-trip.
- Content tampering rejection before engine invocation.
- Wrong-passphrase rejection before engine invocation.
- Missing auth-tag rejection before engine invocation.
- SHA-256 HMAC known-answer and wrong-key verification tests.

### Concerns

- Version-1 package files are intentionally rejected because they lack authenticated wire metadata; users must re-export them as version 2.
- All parties sharing a package must exchange the passphrase through a trusted channel. HMAC does not provide confidentiality while payloads remain plaintext.
