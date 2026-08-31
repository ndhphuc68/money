# Offline-First Sync-Ready Mobile Codebase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold an Expo SDK 54 mobile-only app with Clean Architecture, SQLite/Drizzle local persistence, and a file-based sync protocol that can later be replaced by a backend transport.

**Architecture:** Keep domain entities, use cases, repository ports, and sync contracts framework-independent. Implement local persistence with `expo-sqlite` and Drizzle, and isolate Expo filesystem, document picker, sharing, and device identity behind infrastructure adapters. Use an append-only change log with idempotent operations and tombstones.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Expo Router, expo-sqlite, Drizzle ORM, Drizzle Kit, Jest with jest-expo, Expo DocumentPicker, Expo Sharing, Expo FileSystem, Expo SecureStore.

**Spec:** `docs/superpowers/specs/2026-08-24-offline-first-sync-design.md`

## Global Constraints

- The app targets iOS and Android only; do not add a web/PWA target.
- Pin the project to Expo SDK 54.
- The initial development workflow must run in Expo Go on a physical Android device using `npx expo start` and QR scanning.
- Do not require custom native code or a development build for the first CRUD and file/share milestones.
- Use UUIDs for syncable records and operation IDs; never use auto-increment IDs for sync identity.
- Use tombstones for syncable deletes.
- Never synchronize SQLite database files directly; synchronize versioned operations.
- Core domain and application code must not import React, Expo, SQLite, Drizzle, or platform APIs.
- Production code must be introduced through a failing test first, except generated/configuration files.

### Task 1: Scaffold the Expo SDK 54 mobile project

**Files:**

- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `app/`, `assets/`, and Expo-generated files from the SDK 54 template
- Create: `src/core/`, `src/data/`, `src/infrastructure/`, `src/features/`
- Create: `jest.config.js`, `tests/smoke/app-starts.test.ts`
- Modify: `package.json` scripts and dependency versions as needed for SDK 54

**Interfaces:**

- Produces the app entrypoint and TypeScript path aliases consumed by every later task.

- [ ] **Step 1: Initialize the Expo SDK 54 project**

Run from the repository root:

```powershell
npx create-expo-app@latest . --template default@sdk-54
```

If the CLI presents an Expo Go template selection, select SDK 54 and keep the TypeScript default.

- [ ] **Step 2: Add the source-layer directories and aliases**

Configure `tsconfig.json` with `@/*` mapped to `src/*`, and create the empty layer directories. Keep Expo Router's `app/` directory at the project root.

- [ ] **Step 3: Add the test harness and write the first smoke test**

Create `tests/smoke/app-starts.test.ts`:

```ts
describe('application foundation', () => {
  it('exposes the expected source layers', () => {
    expect(true).toBe(true);
  });
});
```

Configure `jest-expo` and add the script:

```json
{
  "scripts": {
    "test": "jest --runInBand",
    "typecheck": "tsc --noEmit",
    "start": "expo start"
  }
}
```

- [ ] **Step 4: Run the smoke test and typecheck**

Run:

```powershell
npm test -- tests/smoke/app-starts.test.ts
npm run typecheck
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 5: Verify Expo Go Android startup**

Run `npx expo start`, scan the QR code in Expo Go on a physical Android device, and confirm the default screen renders.

### Task 2: Define framework-independent domain and sync contracts

**Files:**

- Create: `src/core/domain/sync/sync-operation.ts`
- Create: `src/core/domain/sync/sync-package.ts`
- Create: `src/core/domain/sync/syncable-record.ts`
- Create: `src/core/application/ports/sync-transport.ts`
- Create: `src/core/application/ports/repository.ts`
- Create: `src/core/application/use-cases/apply-sync-package.ts`
- Create: `tests/core/sync/sync-package.test.ts`
- Create: `tests/core/sync/sync-operation.test.ts`

**Interfaces:**

- `SyncOperation`: `{ operationId, entityType, entityId, operation, payload, originDeviceId, revision, createdAt }`.
- `SyncPackage`: `{ format: 'app-sync', formatVersion: 1, appVersion, schemaVersion, sourceDeviceId, exportedAt, changes, checksum }`.
- `SyncTransport`: `exportChanges(): Promise<SyncPackage>` and `importChanges(pkg: SyncPackage): Promise<ImportSummary>`.
- `SyncableRecord`: `{ id, createdAt, updatedAt, deletedAt, revision, originDeviceId }`.

- [ ] **Step 1: Write failing tests for operation validation and package round-trip**

Test that a valid operation round-trips through serialization, that an invalid operation ID is rejected, and that a package with the wrong format or version is rejected.

- [ ] **Step 2: Run the focused tests and verify they fail because contracts are missing**

Run:

```powershell
npm test -- tests/core/sync/sync-package.test.ts tests/core/sync/sync-operation.test.ts
```

- [ ] **Step 3: Implement the smallest pure TypeScript contracts and validators**

Use explicit discriminated unions for `create`, `update`, and `delete`. Validate non-empty UUID strings, ISO timestamps, non-negative revisions, and the package format/version.

- [ ] **Step 4: Run focused tests and typecheck**

Expected: all focused tests PASS and `npm run typecheck` succeeds.

### Task 3: Add SQLite schema, Drizzle migrations, and local repositories

**Files:**

- Create: `src/data/local/db/client.ts`
- Create: `src/data/local/db/provider.tsx`
- Create: `src/data/local/schema/sync-meta.ts`
- Create: `src/data/local/schema/change-log.ts`
- Create: `src/data/local/schema/example-records.ts`
- Create: `src/data/local/repositories/change-log-repository.ts`
- Create: `src/data/local/repositories/example-record-repository.ts`
- Create: `drizzle.config.ts`
- Create: `drizzle/` generated migration files
- Create: `tests/data/local/change-log-repository.test.ts`
- Create: `tests/data/local/example-record-repository.test.ts`

**Interfaces:**

- `ChangeLogRepository.append(operation): Promise<void>`
- `ChangeLogRepository.hasOperation(operationId): Promise<boolean>`
- `ChangeLogRepository.listPending(): Promise<SyncOperation[]>`
- `ExampleRecordRepository.save(record): Promise<void>`
- `ExampleRecordRepository.findById(id): Promise<SyncableRecord | null>`
- `ExampleRecordRepository.listActive(): Promise<SyncableRecord[]>`

- [ ] **Step 1: Write failing repository tests**

Cover inserting a record, updating its revision, writing a change-log entry, preserving a tombstone after delete, and rejecting a duplicate `operationId`.

- [ ] **Step 2: Run the tests and verify the expected missing-schema failure**

Run:

```powershell
npm test -- tests/data/local/change-log-repository.test.ts tests/data/local/example-record-repository.test.ts
```

- [ ] **Step 3: Install and configure SQLite/Drizzle dependencies**

Run:

```powershell
npx expo install expo-sqlite
npm install drizzle-orm
npm install --save-dev drizzle-kit
```

Configure Drizzle Kit against `src/data/local/schema`, and use Expo SQLite's provider/initialization path for migrations.

- [ ] **Step 4: Implement schema and repositories with transaction boundaries**

Create the metadata, change-log, and example syncable table. All business writes that produce a sync operation must update the business table and append the change log in one SQLite transaction.

- [ ] **Step 5: Generate migrations and run the repository tests**

Run:

```powershell
npx drizzle-kit generate
npm test -- tests/data/local/change-log-repository.test.ts tests/data/local/example-record-repository.test.ts
npm run typecheck
```

Expected: PASS with migration files generated and no type errors.

### Task 4: Implement deterministic merge and idempotent sync application

**Files:**

- Create: `src/data/sync/conflict-resolution/last-write-wins.ts`
- Create: `src/data/sync/sync-engine/sync-engine.ts`
- Create: `src/data/sync/serializers/sync-package-serializer.ts`
- Create: `src/core/application/use-cases/export-sync-package.ts`
- Create: `src/core/application/use-cases/import-sync-package.ts`
- Create: `tests/data/sync/last-write-wins.test.ts`
- Create: `tests/data/sync/sync-engine.test.ts`
- Create: `tests/core/sync/sync-package-serializer.test.ts`

**Interfaces:**

- `ConflictResolver.resolve(local, incoming): ConflictResolution`
- `SyncEngine.exportPending(): Promise<SyncPackage>`
- `SyncEngine.import(pkg): Promise<ImportSummary>`
- `ImportSummary`: `{ applied, skipped, conflicted, rejected }`.

- [ ] **Step 1: Write failing merge and idempotency tests**

Test that newer `(updatedAt, originDeviceId)` wins, a tombstone participates in comparison, duplicate operations are skipped, and accepted operations are applied atomically.

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```powershell
npm test -- tests/data/sync tests/core/sync/sync-package-serializer.test.ts
```

- [ ] **Step 3: Implement the pure conflict resolver and package serializer**

Use stable JSON key ordering before checksum calculation so equivalent packages produce the same checksum. Keep the checksum implementation isolated from the transport.

- [ ] **Step 4: Implement the sync engine transaction flow**

Validate the package, skip known operation IDs, resolve each entity conflict, apply accepted changes, and append imported operations in a single transaction. Never mutate data before validation completes.

- [ ] **Step 5: Run all sync tests**

Expected: PASS for validation, serialization, merge, tombstones, duplicate operations, and transaction behavior.

### Task 5: Add file export/import and system sharing adapters

**Files:**

- Create: `src/infrastructure/expo/file-system/sync-package-file.ts`
- Create: `src/infrastructure/expo/sharing/system-share.ts`
- Create: `src/infrastructure/expo/file-system/system-file-picker.ts`
- Create: `src/infrastructure/expo/secure-store/secure-storage.ts`
- Create: `src/infrastructure/expo/device-identity/device-identity.ts`
- Create: `src/data/sync/transports/file-sync-transport.ts`
- Create: `tests/data/sync/file-sync-transport.test.ts`

**Interfaces:**

- `SyncPackageFile.write(pkg): Promise<string>`
- `SyncPackageFile.read(uri): Promise<SyncPackage>`
- `SystemShare.shareFile(uri): Promise<void>`
- `SystemFilePicker.pickSyncPackage(): Promise<string | null>`
- `FileSyncTransport` implements `SyncTransport`.

- [ ] **Step 1: Write failing transport tests**

Test writing a versioned package to a temporary URI, reading it back, rejecting malformed content, and preserving the package checksum.

- [ ] **Step 2: Install Expo adapters**

Run:

```powershell
npx expo install expo-file-system expo-document-picker expo-sharing expo-secure-store expo-crypto
```

- [ ] **Step 3: Implement adapters behind interfaces**

Keep Expo imports only inside `src/infrastructure/expo`. Do not let UI components call `DocumentPicker` or `Sharing` directly.

- [ ] **Step 4: Run transport tests and typecheck**

Expected: PASS and no TypeScript errors. Verify the app still launches in Expo Go Android.

### Task 6: Wire the app shell and document the developer workflow

**Files:**

- Create: `app/_layout.tsx`
- Create: `app/index.tsx`
- Create: `src/features/sync/screens/sync-screen.tsx`
- Create: `src/features/sync/view-models/use-sync.ts`
- Create: `README.md`
- Create: `tests/smoke/navigation.test.tsx`

**Interfaces:**

- The screen consumes `ExportSyncPackage` and `ImportSyncPackage` use cases through a view model; it does not access SQLite or Expo APIs directly.

- [ ] **Step 1: Write the failing navigation smoke test**

Assert that the root route renders the app title and exposes import/export actions through the sync feature boundary.

- [ ] **Step 2: Implement the minimal Expo Router shell**

Create a root layout, a single home screen, and a sync screen. Keep visual design minimal; this task is wiring and dependency direction, not product UI.

- [ ] **Step 3: Add the Android Expo Go workflow to README**

Document Node LTS, `npm install`, `npx expo start`, QR scanning in Expo Go, test/typecheck commands, migration generation, and the later development-build boundary for SQLCipher.

- [ ] **Step 4: Run the full verification suite**

Run:

```powershell
npm test -- --runInBand
npm run typecheck
npx expo start
```

Expected: all tests pass, typecheck succeeds, and the app opens in Expo Go on Android.
