import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { DATABASE_URL } from "./config";
import * as schema from "./schema";

// mysql2's createPool accepts a connection string or config object.
export const pool = mysql.createPool(DATABASE_URL);
export const db = drizzle(pool, { schema, mode: 'default' });

export * from "./schema";

// Re-export commonly-used drizzle helpers so consumers import them from
// the same package instance as the schema/db. This avoids TypeScript type
// incompatibilities when multiple copies of `drizzle-orm` exist across
// workspace packages.
export {
    and, desc, eq, inArray,
    isNull, or, sql
} from "drizzle-orm";

