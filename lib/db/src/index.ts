import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: any = null;
let db: any;

function chain(result: any = []) {
  return {
    then: (resolve: Function) => resolve(result),
    catch: () => {},
    finally: () => {},
    select: () => chain(result),
    insert: () => chain(result),
    update: () => chain(result),
    delete: () => chain(result),
    from: () => chain(result),
    where: () => chain(result),
    orderBy: () => chain(result),
    limit: () => chain(result),
    offset: () => chain(result),
    values: () => chain(result),
    set: () => chain(result),
    returning: () => Promise.resolve(result),
  };
}

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  db = chain([]);
}

export { pool, db };
export * from "./schema";
