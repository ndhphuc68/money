# Offline-First Sync-Ready Mobile App Design

**Date:** 2026-08-24  
**Status:** Draft for review  
**Platform:** iOS and Android  
**Primary runtime:** React Native with Expo SDK 54

## Goal

Build a mobile-only application whose data is stored locally first, can initially be shared and merged between devices without a backend, and can later add a backend sync transport without changing domain use cases or local data contracts.

## Decisions

- Use React Native with Expo, TypeScript, and Expo Router.
- Pin the initial project to Expo SDK 54 so Android development can use Expo Go and QR-code scanning.
- Use `expo-sqlite` as the local database.
- Use Drizzle ORM and Drizzle Kit for typed queries and migrations.
- Use UUIDs for all syncable entity identifiers.
- Represent deletes as tombstones using `deletedAt`; do not immediately hard-delete syncable records.
- Record every create, update, and delete in an append-only `change_log`.
- Start with a file/share sync transport; add an HTTP/backend transport later.
- Keep domain and application code independent from Expo, SQLite, Drizzle, and filesystem APIs.
- Do not use CRDTs unless the product later requires simultaneous collaborative editing or field-level conflict merging.

## Non-goals

- No backend, authentication service, realtime sync, or cloud database in the initial implementation.
- No web or PWA target.
- No automatic conflict resolution for arbitrary rich-text or collaborative editing.
- No direct synchronization of the SQLite database file between devices.

## Development constraints

- The initial development workflow must work with Expo Go on a physical Android device by running `npx expo start` and scanning the QR code.
- Dependencies must be compatible with Expo SDK 54 and its bundled React Native version.
- Do not require custom native code or a development build for the first local CRUD and file/share milestones.
- SQLCipher and other modules unavailable in Expo Go remain optional follow-up work that requires an Expo development build.

## Architecture

```text
src/
├── core/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── errors/
│   ├── application/
│   │   ├── ports/
│   │   └── use-cases/
│   └── shared/
├── data/
│   ├── local/
│   │   ├── db/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── repositories/
│   └── sync/
│       ├── sync-engine/
│       ├── conflict-resolution/
│       ├── transports/
│       └── serializers/
├── infrastructure/
│   └── expo/
│       ├── file-system/
│       ├── sharing/
│       ├── secure-store/
│       └── device-identity/
├── features/
│   └── [feature-name]/
│       ├── screens/
│       ├── components/
│       ├── hooks/
│       └── view-models/
└── app/
    ├── _layout.tsx
    └── ...
```

The dependency direction is:

```text
UI → application use case → repository/sync port → SQLite/Drizzle or file/share adapter
```

The `core` layer must not import React, Expo, SQLite, Drizzle, or platform APIs.

## Local data model

Every syncable business table must include:

```text
id              UUID primary key
createdAt       UTC timestamp
updatedAt       UTC timestamp
deletedAt       UTC timestamp nullable
revision        integer
originDeviceId  UUID
```

The initial schema also includes a device metadata record and an append-only change log:

```text
change_log
├── operationId      UUID primary key
├── entityType       string
├── entityId         UUID
├── operation        create | update | delete
├── payload          serialized operation payload
├── originDeviceId   UUID
├── revision         integer
├── createdAt        UTC timestamp
└── appliedAt        UTC timestamp nullable
```

`operationId` is unique and makes import idempotent. A repeated import must not apply the same operation twice.

## Sync protocol

The first transport is a versioned file package shared through the operating system. It is not a database snapshot.

```ts
type SyncPackage = {
  format: 'app-sync';
  formatVersion: 1;
  appVersion: string;
  schemaVersion: number;
  sourceDeviceId: string;
  exportedAt: string;
  changes: SyncOperation[];
  checksum: string;
};
```

The sync engine must expose transport-independent operations:

```ts
type SyncTransport = {
  exportChanges(): Promise<SyncPackage>;
  importChanges(pkg: SyncPackage): Promise<ImportSummary>;
};
```

The import pipeline is:

1. Read and parse the package.
2. Validate format, schema version, checksum, operation shape, and entity identifiers.
3. Stage operations without mutating business tables.
4. Ignore operations whose `operationId` already exists locally.
5. Resolve conflicts according to the entity's explicit policy.
6. Apply accepted changes and change-log entries in one SQLite transaction.
7. Return an import summary with applied, skipped, conflicted, and rejected counts.

The initial conflict policy is deterministic last-write-wins by `(updatedAt, originDeviceId)` for ordinary scalar records, with tombstones taking part in comparison. Conflict policies must be isolated behind an interface so a feature can later choose a domain-specific merge policy.

## Future backend migration

The backend must speak the same logical operation format as the file transport. The app will later add an `HttpSyncTransport` implementing the same application port. Domain entities, use cases, repositories, and local schema should not depend on HTTP, authentication, or a specific cloud provider.

The future backend must preserve operation idempotency using `operationId`, support cursor-based exchange of changes, and return an authoritative acknowledgement/cursor. Those requirements are reserved for the backend phase and are not implemented in the initial mobile-only phase.

## Security and backup

- Keep small secrets such as encryption keys or device credentials in `expo-secure-store`.
- Do not use AsyncStorage as the primary database.
- If the product contains sensitive data, evaluate SQLCipher through an Expo development build rather than Expo Go.
- Export packages should support encryption before sharing when the product's data classification requires it.
- Add an explicit user-facing export/import flow; device backup is not treated as cross-device sync.

## Testing strategy

- Unit-test domain entities, value objects, conflict policies, operation validation, and serialization without Expo.
- Integration-test repositories against SQLite migrations and transactions.
- Test import idempotency, tombstones, duplicate operations, schema mismatch, invalid checksums, and deterministic conflicts.
- Test the file transport with real temporary packages rather than mocking the entire sync engine.
- Test platform adapters separately for file picking and sharing.

## Research basis

- Expo documents `expo-sqlite` as persistent on-device storage and provides migrations, transactions, database backup, serialization, and SQLCipher support: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).
- Expo's project guide documents selecting SDK 54 when using Expo Go during the SDK transition: [Create a project](https://docs.expo.dev/get-started/create-a-project/).
- Expo documents local-first architectures and Yjs as an option when syncable collaborative data requires it: [Expo Local-first](https://docs.expo.dev/guides/local-first/).
- Expo documents file selection and sharing APIs for Android and iOS: [DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/) and [Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/).
- Drizzle documents Expo SQLite integration and migration execution: [Drizzle Expo SQLite](https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite).
- Expo distinguishes SQLite for structured persistent data from AsyncStorage for small key-value preferences: [Store data](https://docs.expo.dev/develop/user-interface/store-data/).
