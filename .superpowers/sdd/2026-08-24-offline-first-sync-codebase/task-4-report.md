# Task 4 Report: deterministic merge and idempotent sync application

## Status

Implemented the Task 4 sync engine without adding file/share transport or UI behavior.

## Delivered

- Added deterministic last-write-wins conflict resolution for `SyncableRecord` values. It compares parsed `updatedAt` timestamps first and normalized `originDeviceId` values second; a local record wins an exact tie.
- Tombstones are normal syncable records. A newer tombstone therefore replaces a live record and remains excluded from `listActive` by the existing repository.
- Added a framework-independent core checksum/serializer port and a data-layer stable JSON serializer with a deterministic FNV-1a checksum adapter.
- `SyncEngine.exportPending()` sorts pending operations by `createdAt` then `operationId`, constructs a versioned package, and calculates its checksum.
- `SyncEngine.import()` validates the package structure, checksum, duplicate operation IDs, supported `example-record` entity type, and complete record payloads before beginning a SQLite transaction.
- Imported records must match the operation's ID, origin device ID, revision, and deletion semantics. Invalid packages return a rejected summary without business-table or change-log mutation.
- The engine writes each processed remote operation to `change_log` in the same transaction as its accepted business-record write. Remote operations are marked synced to avoid re-export; conflict losers are logged for idempotency and skipped on future imports.
- Added core `ExportSyncPackage` and `ImportSyncPackage` use cases, each depending only on a framework-independent engine boundary.

## TDD evidence

1. Added focused conflict-resolution, stable-serialization, sync-engine, and core-use-case tests before the requested modules existed.
2. Ran the focused suites. Jest failed with the expected missing-module resolution errors for the new Task 4 files.
3. Added the smallest implementations for the tests, then ran the focused suites again.
4. Added validation-before-mutation coverage for a package whose first operation is valid but whose later operation has an invalid payload. The package is rejected before either record or log entry is written.

## Test coverage

- Newer timestamp and device-ID tie-break conflict resolution.
- Tombstone replacement and active-record filtering.
- Stable key-order serialization and checksum verification.
- Deterministic export order and package checksums.
- Full-package validation before mutation.
- Re-import idempotency and prevention of imported-operation echo exports.
- Atomic rollback when an imported change-log write fails after an earlier record write.
- Core export/import use-case boundaries.

## Validation

| Command | Result |
| --- | --- |
| `npm test -- --runInBand tests/data/sync` | PASS: 3 suites, 11 tests |
| `npm test -- --runInBand tests/data/sync tests/core/sync` | PASS: 6 suites, 25 tests |
| `npx drizzle-kit generate` | PASS: no schema changes, no migration generated |
| `npm test -- --runInBand` | PASS: 8 suites, 39 tests |
| `npm run typecheck` | PASS: `tsc --noEmit` |
| `git diff --check` | PASS: no whitespace errors |

## Concerns

- Native Expo SQLite execution is unavailable in this Windows Node/Jest environment. The local integration tests use the existing test-only `better-sqlite3` Expo SQLite compatibility adapter and exercise the real Drizzle queries, migrations, uniqueness constraint, and transaction rollback. Validate on Android or iOS before release.
- The default FNV-1a adapter is a deterministic corruption checksum, not an authenticated or cryptographic integrity mechanism. If packages will cross an untrusted boundary, provide a cryptographic checksum or signature adapter through the new core port.
- Existing Task 3 pending operations must use a complete `SyncableRecord` payload for the Task 4 `example-record` importer. This is enforced to make LWW and tombstone merging unambiguous.
