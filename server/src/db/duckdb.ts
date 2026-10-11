import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api';
import { config } from '../config.js';
import { INIT_SCHEMA_SQL } from './schema.js';

let instancePromise: Promise<DuckDBInstance> | null = null;
let connPromise: Promise<DuckDBConnection> | null = null;

export async function getDb(): Promise<{ instance: DuckDBInstance; conn: DuckDBConnection }> {
  if (!instancePromise) {
    instancePromise = DuckDBInstance.create(config.duckdbPath);
  }
  const instance = await instancePromise;

  if (!connPromise) {
    connPromise = instance.connect();
  }
  const conn = await connPromise;

  return { instance, conn };
}

export async function initDatabase(): Promise<void> {
  const { conn } = await getDb();
  // Split statements and execute individually
  const statements = INIT_SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await conn.run(statement);
    } catch (err) {
      console.error(`[DuckDB] Error executing schema statement: "${statement.slice(0, 80)}..."`, err);
      throw err;
    }
  }
  console.log('[DuckDB] Schema successfully initialized.');
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { conn } = await getDb();
  try {
    let reader;
    if (params.length === 0) {
      reader = await conn.runAndReadAll(sql);
    } else {
      const stmt = await conn.prepare(sql);
      for (let i = 0; i < params.length; i++) {
        stmt.bindValue(i + 1, params[i]);
      }
      reader = await stmt.runAndReadAll();
    }

    const colNames = reader.columnNames();
    const rows = reader.getRows();

    return rows.map((row) => {
      const obj: any = {};
      for (let i = 0; i < colNames.length; i++) {
        const val = row[i];
        // Handle BigInt serialization
        obj[colNames[i]] = typeof val === 'bigint' ? Number(val) : val;
      }
      return obj as T;
    });
  } catch (err) {
    console.error(`[DuckDB] Query error in: "${sql.slice(0, 100)}..."`, err);
    throw err;
  }
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function exec(sql: string, params: any[] = []): Promise<void> {
  const { conn } = await getDb();
  try {
    if (params.length === 0) {
      await conn.run(sql);
      return;
    }
    const stmt = await conn.prepare(sql);
    for (let i = 0; i < params.length; i++) {
      stmt.bindValue(i + 1, params[i]);
    }
    await stmt.run();
  } catch (err) {
    console.error(`[DuckDB] Exec error in: "${sql.slice(0, 100)}..."`, err);
    throw err;
  }
}

export async function closeDatabase(): Promise<void> {
  if (connPromise) {
    const conn = await connPromise;
    conn.disconnectSync();
    connPromise = null;
  }
  instancePromise = null;
  console.log('[DuckDB] Database closed.');
}
