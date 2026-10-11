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

// Ensure global BigInt serialization fallback so JSON.stringify never throws
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

export function normalizeDuckDBValue(val: any): any {
  if (val === null || val === undefined) {
    return val;
  }
  if (typeof val === 'bigint') {
    return Number(val);
  }
  if (typeof val === 'object') {
    // DuckDB timestamp with .micros
    if (typeof val.micros === 'bigint') {
      const ms = Number(val.micros / 1000n);
      return new Date(ms).toISOString();
    }
    // DuckDB date with .days
    if (typeof val.days === 'number') {
      const ms = val.days * 86400000;
      return new Date(ms).toISOString().split('T')[0];
    }
    if (Array.isArray(val)) {
      return val.map(normalizeDuckDBValue);
    }
    // DuckDB list/array or struct with items
    if (val.items && Array.isArray(val.items)) {
      return val.items.map(normalizeDuckDBValue);
    }
    // If it's a DuckDB object with custom toString
    if (val.constructor?.name?.startsWith('DuckDB') && typeof val.toString === 'function') {
      return val.toString();
    }
    const copy: any = {};
    for (const [k, v] of Object.entries(val)) {
      copy[k] = normalizeDuckDBValue(v);
    }
    return copy;
  }
  return val;
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
        obj[colNames[i]] = normalizeDuckDBValue(row[i]);
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
