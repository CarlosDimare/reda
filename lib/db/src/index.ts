import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import * as schema from "./schema";

const { Pool } = pg;

const TABLE_NAME_SYM = Symbol.for("drizzle:Name");

function tableName(table: any): string {
  if (table?.[TABLE_NAME_SYM]) return table[TABLE_NAME_SYM];
  if (table?.name) return table.name;
  return "unknown";
}

function extractEq(condition: any): { col: string; val: any } | null {
  if (!condition?.queryChunks) return null;
  const col = condition.queryChunks[0];
  if (!col?.name) return null;
  for (const chunk of condition.queryChunks) {
    if (
      chunk &&
      typeof chunk === "object" &&
      "value" in chunk &&
      "encoder" in chunk
    ) {
      return { col: col.name, val: chunk.value };
    }
  }
  return null;
}

function extractDesc(c: any): { col: string; desc: boolean } {
  if (c?.name) return { col: c.name, desc: false };
  if (c?.queryChunks) {
    const name = c.queryChunks[0]?.name;
    if (name) {
      const hasDesc = c.queryChunks.some(
        (ch: any) =>
          ch?.value &&
          Array.isArray(ch.value) &&
          ch.value.some((s: string) => s.includes("desc")),
      );
      return { col: name, desc: hasDesc };
    }
  }
  return { col: "id", desc: false };
}

function eqMatches(
  row: any,
  conditions: Array<{ col: string; val: any }>,
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => row[c.col] === c.val);
}

class MockChain {
  private _op: "select" | "insert" | "update" | "delete" = "select";
  private _table = "";
  private _data: any = null;
  private _projection: any = null;
  private _wheres: Array<{ col: string; val: any }> = [];
  private _orderByCol: string | null = null;
  private _orderByDesc = false;
  private _limit: number | null = null;

  select(projection?: any) {
    this._op = "select";
    this._projection = projection || null;
    return this;
  }
  insert() {
    this._op = "insert";
    return this;
  }
  update() {
    this._op = "update";
    return this;
  }
  delete() {
    this._op = "delete";
    return this;
  }
  from(table: any) {
    this._table = tableName(table);
    return this;
  }
  where(condition: any) {
    if (condition) {
      const eq = extractEq(condition);
      if (eq) this._wheres.push(eq);
    }
    return this;
  }
  orderBy(col: any) {
    const info = extractDesc(col);
    this._orderByCol = info.col;
    this._orderByDesc = info.desc;
    return this;
  }
  limit(n: number) {
    this._limit = n;
    return this;
  }
  offset() {
    return this;
  }
  values(data: any) {
    this._data = data;
    return this;
  }
  set(data: any) {
    this._data = data;
    return this;
  }
  returning(projection?: any) {
    this._projection = projection || true;
    return this;
  }

  private _execSelect(store: any[]): any[] {
    let rows = store.filter((r) => eqMatches(r, this._wheres));
    if (this._orderByCol) {
      rows.sort((a, b) => {
        const va = a[this._orderByCol!];
        const vb = b[this._orderByCol!];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (va < vb) return this._orderByDesc ? 1 : -1;
        if (va > vb) return this._orderByDesc ? -1 : 1;
        return 0;
      });
    }
    if (this._limit !== null) {
      rows = rows.slice(0, this._limit);
    }
    if (this._projection && typeof this._projection === "object") {
      return rows.map((row) => {
        const obj: any = {};
        for (const [key, col] of Object.entries(this._projection)) {
          if (col && typeof col === "object" && "name" in col) {
            obj[key] = row[(col as any).name] ?? "";
          } else {
            obj[key] = "";
          }
        }
        return obj;
      });
    }
    return rows;
  }

  private _execInsert(store: any[]): any[] {
    if (!this._data) return [];
    const seqKey = this._table;
    const seq = ((globalThis as any).__mock_seq ??= {});
    seq[seqKey] = (seq[seqKey] || 0) + 1;
    const newId = seq[seqKey];
    const row = {
      id: newId,
      ...this._data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.push(row);
    if (this._projection === true) return [row];
    if (this._projection && typeof this._projection === "object") {
      const obj: any = {};
      for (const [key, col] of Object.entries(this._projection)) {
        if (col && typeof col === "object" && "name" in col) {
          obj[key] = row[(col as any).name];
        } else {
          obj[key] = "";
        }
      }
      return [obj];
    }
    return [];
  }

  private _execUpdate(store: any[]): any[] {
    if (!this._data) return [];
    const updated: any[] = [];
    for (let i = 0; i < store.length; i++) {
      if (!eqMatches(store[i], this._wheres)) continue;
      store[i] = { ...store[i], ...this._data, updatedAt: new Date() };
      updated.push(store[i]);
    }
    if (this._projection === true) return updated;
    if (this._projection && typeof this._projection === "object") {
      return updated.map((r) => {
        const obj: any = {};
        for (const [key, col] of Object.entries(this._projection)) {
          if (col && typeof col === "object" && "name" in col) {
            obj[key] = r[(col as any).name];
          } else {
            obj[key] = "";
          }
        }
        return obj;
      });
    }
    return [];
  }

  private _execDelete(store: any[]): any[] {
    const deleted: any[] = [];
    for (let i = store.length - 1; i >= 0; i--) {
      if (!eqMatches(store[i], this._wheres)) continue;
      deleted.push(store.splice(i, 1)[0]);
    }
    if (this._projection === true) return deleted;
    if (this._projection && typeof this._projection === "object") {
      return deleted.map((r) => {
        const obj: any = {};
        for (const [key, col] of Object.entries(this._projection)) {
          if (col && typeof col === "object" && "name" in col) {
            obj[key] = r[(col as any).name];
          } else {
            obj[key] = "";
          }
        }
        return obj;
      });
    }
    return [];
  }

  private _execute(): any {
    const store = (globalThis as any).__mock_store?.[this._table];
    if (!store) return [];
    switch (this._op) {
      case "select":
        return this._execSelect(store);
      case "insert":
        return this._execInsert(store);
      case "update":
        return this._execUpdate(store);
      case "delete":
        return this._execDelete(store);
    }
  }

  then(resolve?: any, reject?: any) {
    try {
      const result = this._execute();
      if (resolve) return Promise.resolve(resolve(result));
      return Promise.resolve(result);
    } catch (e) {
      if (reject) return Promise.resolve(reject(e));
      return Promise.reject(e);
    }
  }
  catch(reject?: any) {
    return this.then(undefined, reject);
  }
  finally(cb: any) {
    return this.then(
      (r: any) => {
        cb();
        return r;
      },
      (e: any) => {
        cb();
        throw e;
      },
    );
  }
}

function loadPersistedData(): {
  acciones: any[];
  coberturas: any[];
} {
  const accionesFile = resolve(process.cwd(), "data", "acciones.json");
  const coberturasFile = resolve(process.cwd(), "data", "coberturas.json");
  let acciones: any[] = [];
  let coberturas: any[] = [];
  try {
    if (existsSync(accionesFile))
      acciones = JSON.parse(readFileSync(accionesFile, "utf8"));
  } catch {}
  try {
    if (existsSync(coberturasFile))
      coberturas = JSON.parse(readFileSync(coberturasFile, "utf8"));
  } catch {}
  return { acciones, coberturas };
}

function initMockStore() {
  const persisted = loadPersistedData();
  const store: Record<string, any[]> = {};
  const now = new Date();
  store["redaccion_agentes"] = [
    {
      id: 1,
      nombre: "Corresponsal Internacional",
      tareas: [
        "Seguir conflictos activos",
        "Reportar cumbres diplomáticas",
        "Analizar geopolítica",
      ],
      agenteId: "internacionales",
      activo: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      nombre: "Cronista Argentina",
      tareas: [
        "Cubrir protestas sociales",
        "Investigar medidas de gobierno",
        "Documentar movimientos sindicales",
      ],
      agenteId: "protestas_ar",
      activo: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      nombre: "Editor de Datos",
      tareas: [
        "Verificar cifras",
        "Cruzar fuentes estadísticas",
        "Preparar infografías",
      ],
      agenteId: null,
      activo: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      nombre: "Reportero de Campo",
      tareas: [
        "Entrevistas en terreno",
        "Cobertura de eventos",
        "Material audiovisual",
      ],
      agenteId: null,
      activo: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
  store["coberturas"] = persisted.coberturas.map((r: any, i: number) => ({
    ...r,
    createdAt: new Date(r.createdAt || now),
    updatedAt: new Date(r.updatedAt || now),
  }));
  store["conversations"] = [];
  store["messages"] = [];
  store["acciones_colectivas"] = persisted.acciones.map(
    (r: any, i: number) => ({
      ...r,
      createdAt: new Date(r.createdAt || now),
      updatedAt: new Date(r.updatedAt || now),
    }),
  );
  (globalThis as any).__mock_store = store;
  (globalThis as any).__mock_seq = {
    redaccion_agentes: 4,
    coberturas: persisted.coberturas.length,
    conversations: 0,
    messages: 0,
    acciones_colectivas: persisted.acciones.length,
  };
}

let pool: any = null;
let db: any;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  initMockStore();
  db = new MockChain();
}

export { pool, db };
export * from "./schema";
