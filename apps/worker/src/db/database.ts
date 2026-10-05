export interface D1PreparedStatementCompat {
  bind(...values: unknown[]): D1PreparedStatementCompat;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean; meta?: Record<string, unknown> }>;
}

export interface D1DatabaseCompat {
  prepare(query: string): D1PreparedStatementCompat;
  batch<T = unknown>(statements: D1PreparedStatementCompat[]): Promise<Array<{ results?: T[]; success: boolean }>>;
  exec(query: string): Promise<void>;
}

interface RowRecord {
  [key: string]: unknown;
}

/**
 * In-memory D1 compatible database implementation for local development,
 * testing, and CI without external dependencies.
 */
export class MemoryD1Database implements D1DatabaseCompat {
  private tables: Map<string, RowRecord[]> = new Map();

  constructor() {
    this.tables.set('mailboxes', []);
    this.tables.set('email_messages', []);
    this.tables.set('webhook_requests', []);
  }

  async exec(query: string): Promise<void> {
    // Basic table creator parsing for schema setup
    const lines = query.split(';');
    for (const raw of lines) {
      const match = raw.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        const tbl = match[1].toLowerCase();
        if (!this.tables.has(tbl)) {
          this.tables.set(tbl, []);
        }
      }
    }
  }

  prepare(query: string): D1PreparedStatementCompat {
    return new MemoryPreparedStatement(this, query);
  }

  async batch<T = unknown>(statements: D1PreparedStatementCompat[]): Promise<Array<{ results?: T[]; success: boolean }>> {
    const results: Array<{ results?: T[]; success: boolean }> = [];
    for (const stmt of statements) {
      const res = await stmt.all<T>();
      results.push(res);
    }
    return results;
  }

  // Internal storage helpers
  getTable(name: string): RowRecord[] {
    const lower = name.toLowerCase();
    if (!this.tables.has(lower)) {
      this.tables.set(lower, []);
    }
    return this.tables.get(lower)!;
  }
}

class MemoryPreparedStatement implements D1PreparedStatementCompat {
  private boundArgs: unknown[] = [];

  constructor(private db: MemoryD1Database, private query: string) {}

  bind(...values: unknown[]): D1PreparedStatementCompat {
    this.boundArgs = values;
    return this;
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const all = await this.all<T>();
    if (all.results.length === 0) return null;
    const firstRow = all.results[0] as Record<string, unknown>;
    if (colName && typeof firstRow === 'object' && firstRow !== null) {
      return (firstRow[colName] as T) ?? null;
    }
    return firstRow as T;
  }

  async all<T = unknown>(): Promise<{ results: T[]; success: boolean }> {
    const q = this.query.trim();

    // SELECT handling
    if (/^SELECT/i.test(q)) {
      const fromMatch = q.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      if (!fromMatch) return { results: [], success: true };
      const tableName = fromMatch[1].toLowerCase();
      let rows = [...this.db.getTable(tableName)];

      // WHERE clause matching
      const whereMatch = q.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        rows = rows.filter((row) => this.evalWhere(row, whereClause, this.boundArgs));
      }

      // ORDER BY
      const orderMatch = q.match(/ORDER\s+BY\s+([a-zA-Z0-9_]+)\s*(ASC|DESC)?/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const desc = (orderMatch[2] || 'ASC').toUpperCase() === 'DESC';
        rows.sort((a, b) => {
          const valA = a[col] as number | string;
          const valB = b[col] as number | string;
          if (valA === valB) return 0;
          if (desc) return valA > valB ? -1 : 1;
          return valA < valB ? -1 : 1;
        });
      }

      // LIMIT
      const limitMatch = q.match(/LIMIT\s+(\?|\d+)/i);
      if (limitMatch) {
        let limit = 100;
        if (limitMatch[1] === '?') {
          limit = Number(this.boundArgs[this.boundArgs.length - 1] ?? 100);
        } else {
          limit = parseInt(limitMatch[1], 10);
        }
        rows = rows.slice(0, limit);
      }

      // Handle COUNT(*)
      if (/SELECT\s+COUNT\(\*\)\s+(?:as\s+([a-zA-Z0-9_]+))?/i.test(q)) {
        const countAlias = q.match(/SELECT\s+COUNT\(\*\)\s+as\s+([a-zA-Z0-9_]+)/i)?.[1] || 'count';
        return {
          results: [{ [countAlias]: rows.length } as unknown as T],
          success: true
        };
      }

      return { results: rows as unknown as T[], success: true };
    }

    return { results: [], success: true };
  }

  async run(): Promise<{ success: boolean; meta?: Record<string, unknown> }> {
    const q = this.query.trim();

    // INSERT INTO table (cols) VALUES (?, ?, ...)
    if (/^INSERT\s+INTO/i.test(q)) {
      const match = q.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (!match) return { success: false };
      const table = match[1].toLowerCase();
      const cols = match[2].split(',').map((c) => c.trim());
      const valTokens = match[3].split(',').map((v) => v.trim());
      const row: RowRecord = {};
      let boundIdx = 0;

      cols.forEach((col, idx) => {
        const raw = valTokens[idx];
        if (raw === '?') {
          row[col] = this.boundArgs[boundIdx++];
        } else if (raw && raw.startsWith("'") && raw.endsWith("'")) {
          row[col] = raw.slice(1, -1);
        } else if (raw === 'NULL' || raw === 'null') {
          row[col] = null;
        } else if (raw !== undefined && !isNaN(Number(raw))) {
          row[col] = Number(raw);
        } else {
          row[col] = this.boundArgs[boundIdx++];
        }
      });

      const list = this.db.getTable(table);
      // Remove any existing if primary key 'id' exists
      if (row.id) {
        const existingIdx = list.findIndex((r) => r.id === row.id);
        if (existingIdx !== -1) {
          list.splice(existingIdx, 1);
        }
      }
      list.push(row);
      return { success: true };
    }

    // UPDATE table SET col = ? WHERE ...
    if (/^UPDATE/i.test(q)) {
      const match = q.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (!match) return { success: false };
      const table = match[1].toLowerCase();
      const setClause = match[2];
      const whereClause = match[3];

      const setAssignments = setClause.split(',').map((s) => s.trim());
      const list = this.db.getTable(table);
      let argIndex = 0;

      const updates: Record<string, unknown> = {};
      for (const assignment of setAssignments) {
        const col = assignment.split('=')[0].trim();
        updates[col] = this.boundArgs[argIndex++];
      }

      const whereArgs = this.boundArgs.slice(argIndex);
      let updatedCount = 0;

      for (let i = 0; i < list.length; i++) {
        if (!whereClause || this.evalWhere(list[i], whereClause, whereArgs)) {
          Object.assign(list[i], updates);
          updatedCount++;
        }
      }

      return { success: true, meta: { changes: updatedCount } };
    }

    // DELETE FROM table WHERE ...
    if (/^DELETE\s+FROM/i.test(q)) {
      const match = q.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
      if (!match) return { success: false };
      const table = match[1].toLowerCase();
      const whereClause = match[2];

      const list = this.db.getTable(table);
      const remaining: RowRecord[] = [];
      let deletedCount = 0;

      for (const row of list) {
        if (!whereClause || this.evalWhere(row, whereClause, this.boundArgs)) {
          deletedCount++;
        } else {
          remaining.push(row);
        }
      }

      // If mailboxes were deleted, cascade to messages and webhooks if id matched
      if (table === 'mailboxes') {
        const deletedIds = list.filter((r) => !remaining.includes(r)).map((r) => r.id);
        if (deletedIds.length > 0) {
          const emails = this.db.getTable('email_messages');
          this.db.getTable('email_messages').length = 0;
          this.db.getTable('email_messages').push(...emails.filter((e) => !deletedIds.includes(e.mailbox_id)));

          const hooks = this.db.getTable('webhook_requests');
          this.db.getTable('webhook_requests').length = 0;
          this.db.getTable('webhook_requests').push(...hooks.filter((h) => !deletedIds.includes(h.mailbox_id)));
        }
      }

      list.length = 0;
      list.push(...remaining);

      return { success: true, meta: { changes: deletedCount } };
    }

    return { success: true };
  }

  private evalWhere(row: RowRecord, whereClause: string, args: unknown[]): boolean {
    const parts = whereClause.split(/\s+AND\s+/i);
    let argIdx = 0;

    for (const part of parts) {
      const clean = part.trim();
      const opMatch = clean.match(/([a-zA-Z0-9_]+)\s*(=|<|>|<=|>=|!=|<>\s*)\s*(\?|\d+|'[^']*')/);
      if (!opMatch) continue;

      const col = opMatch[1];
      const op = opMatch[2].trim();
      const rawVal = opMatch[3];

      let targetVal: unknown;
      if (rawVal === '?') {
        targetVal = args[argIdx++];
      } else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
        targetVal = rawVal.slice(1, -1);
      } else {
        targetVal = Number(rawVal);
      }

      const rowVal = row[col];

      switch (op) {
        case '=':
          if (rowVal != targetVal) return false;
          break;
        case '!=':
        case '<>':
          if (rowVal == targetVal) return false;
          break;
        case '<':
          if (!(Number(rowVal) < Number(targetVal))) return false;
          break;
        case '<=':
          if (!(Number(rowVal) <= Number(targetVal))) return false;
          break;
        case '>':
          if (!(Number(rowVal) > Number(targetVal))) return false;
          break;
        case '>=':
          if (!(Number(rowVal) >= Number(targetVal))) return false;
          break;
      }
    }

    return true;
  }
}
