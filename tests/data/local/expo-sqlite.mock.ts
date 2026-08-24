import BetterSqlite3 from 'better-sqlite3';

type BindParameters = unknown[] | Record<string, unknown>;

const openDatabases = new Map<string, BetterSqlite3.Database>();

class TestSQLiteStatement {
  constructor(private readonly statement: BetterSqlite3.Statement) {}

  executeSync(parameters: BindParameters = []): TestSQLiteExecuteResult<Record<string, unknown>> {
    if (this.statement.reader) {
      return new TestSQLiteExecuteResult(this.statement.all(parameters) as Record<string, unknown>[]);
    }

    const result = this.statement.run(parameters);
    return new TestSQLiteExecuteResult([], result.changes, Number(result.lastInsertRowid));
  }

  executeForRawResultSync(parameters: BindParameters = []): TestSQLiteExecuteResult<unknown[]> {
    const rows = this.statement.reader
      ? (this.statement.raw(true).all(parameters) as unknown[][])
      : [];
    return new TestSQLiteExecuteResult(rows);
  }
}

class TestSQLiteExecuteResult<T> implements IterableIterator<T> {
  private index = 0;

  constructor(
    private readonly rows: T[],
    readonly changes = 0,
    readonly lastInsertRowId = 0,
  ) {}

  getFirstSync(): T | null {
    return this.rows[0] ?? null;
  }

  getAllSync(): T[] {
    return this.rows;
  }

  next(): IteratorResult<T> {
    const value = this.rows[this.index];
    this.index += 1;
    return value === undefined ? { done: true, value: undefined } : { done: false, value };
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this;
  }
}

class TestSQLiteDatabase {
  constructor(private readonly database: BetterSqlite3.Database) {}

  prepareSync(sql: string): TestSQLiteStatement {
    return new TestSQLiteStatement(this.database.prepare(sql));
  }

  closeSync(): void {
    this.database.close();
  }
}

export function openDatabaseSync(databaseName: string): TestSQLiteDatabase {
  const database = new BetterSqlite3(':memory:');
  openDatabases.set(databaseName, database);
  return new TestSQLiteDatabase(database);
}

export function deleteDatabaseSync(databaseName: string): void {
  const database = openDatabases.get(databaseName);
  if (database?.open) {
    database.close();
  }
  openDatabases.delete(databaseName);
}
