import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: any = null;
let db: any;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  const chain = (result: any = []) =>
    new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then" || prop === "catch") return;
          if (prop === "returning")
            return (fields?: any) => Promise.resolve(result);
          if (prop === "where") return () => Promise.resolve(result);
          if (prop === "set") return () => chain(result);
          if (prop === "values") return (data: any) => chain(result);
          if (prop === "limit") return () => Promise.resolve(result);
          if (prop === "orderBy") return () => chain(result);
          if (prop === "from") return () => chain(result);
          if (prop === "insert") return (table: any) => chain(result);
          if (prop === "select") return (fields?: any) => chain(result);
          if (prop === "update") return (table: any) => chain(result);
          if (prop === "delete") return (table: any) => chain(result);
          if (prop === "eq") return () => true;
          return (...args: any[]) => chain(result);
        },
      },
    );
  db = chain([]);
  console.log("[DB Mock] Using in-memory mock database (no DATABASE_URL set)");
}

export { pool, db };
export * from "./schema";
