import dotenv from "dotenv";
dotenv.config();
import { Pool } from "pg";

function buildPoolConfig() {
  // Prioriza DATABASE_URL (Render) y cae a variables separadas
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Render Postgres
      max: 10
    };
  }
  const ssl =
    String(process.env.PGSSL || "").toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : undefined;

  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl,
    max: 10
  };
}

export const pool = new Pool(buildPoolConfig());

export async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
