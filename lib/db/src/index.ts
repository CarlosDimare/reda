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
  db = new Proxy({} as any, {
    get(_, prop) {
      return (...args: any[]) => {
        console.log(
          `[DB Mock] ${String(prop)} called with`,
          JSON.stringify(args).slice(0, 200),
        );
        return Promise.resolve([]);
      };
    },
  });
}

export { pool, db };
export * from "./schema";
