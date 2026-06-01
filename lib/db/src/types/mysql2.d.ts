declare module 'mysql2/promise' {
  import type { Pool, PoolOptions } from 'mysql2';
  const mysql: {
    createPool(config?: string | PoolOptions): Pool & { promise?: any };
  };
  export default mysql;
}

declare module 'mysql2' {
  export type Pool = any;
  export type PoolOptions = any;
  export type Connection = any;
}
