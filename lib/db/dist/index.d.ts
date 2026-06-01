import * as schema from "./schema";
export declare const pool: any;
export declare const db: import("drizzle-orm/mysql2").MySql2Database<typeof schema> & {
    $client: import("drizzle-orm/mysql2").AnyMySql2Connection extends TClient ? import("mysql2").Pool : TClient;
};
export * from "./schema";
