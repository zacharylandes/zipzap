import "server-only";

import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) pool = new Pool({ connectionString });
  return pool;
}
