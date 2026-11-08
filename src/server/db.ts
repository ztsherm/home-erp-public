import "dotenv/config";
import path from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: any;
  pglite?: any;
};

const databaseUrl = process.env.DATABASE_URL;

function createPool() {
  if (!databaseUrl || databaseUrl.startsWith("pglite") || databaseUrl === "embedded") {
    // Embedded PGlite instance for zero-config local testing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require("@electric-sql/pglite");
    
    const rawPath = databaseUrl?.startsWith("pglite://")
      ? databaseUrl.replace("pglite://", "")
      : "./pgdata";
    const pglitePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);

    const getDb = () => {
      if (!globalForPrisma.pglite) {
        try {
          globalForPrisma.pglite = new PGlite(pglitePath);
        } catch (err) {
          console.error("Failed to open PGlite data directory, falling back to memory:", err);
          globalForPrisma.pglite = new PGlite();
        }
      }
      return globalForPrisma.pglite;
    };

    const proxyPool = Object.create(pg.Pool.prototype);
    proxyPool.options = {};
    proxyPool.query = async (config: any, values?: any) => {
      const db = getDb();
      if (db.waitReady) {
        await db.waitReady;
      }
      const text = typeof config === "string" ? config : config.text;
      const params = typeof config === "string" ? values : config.values;
      const rowMode = typeof config === "object" ? config.rowMode : undefined;
      const res = await db.query(text, params, { rowMode });
      return {
        rows: res.rows,
        fields: res.fields,
        rowCount: res.affectedRows ?? res.rows.length,
      };
    };
    proxyPool.connect = async () => ({
      query: (config: any, values?: any) => proxyPool.query(config, values),
      release: () => {},
      on: () => {},
      removeListener: () => {},
    });
    proxyPool.on = () => {};
    proxyPool.removeListener = () => {};
    proxyPool.end = async () => {};
    return proxyPool;
  }

  const configuredPoolMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "5", 10);
  const poolMax = Number.isFinite(configuredPoolMax) && configuredPoolMax > 0 ? configuredPoolMax : 5;
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    idleTimeoutMillis: 30000,
    keepAlive: true,
    max: poolMax,
  });
}

const pool = globalForPrisma.pool ?? createPool();
const schema = databaseUrl && !databaseUrl.startsWith("pglite") && databaseUrl !== "embedded"
  ? (new URL(databaseUrl).searchParams.get("schema") ?? undefined)
  : undefined;
const adapter = new PrismaPg(pool, { schema });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

function isClosedConnectionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string; name?: string };
  return (
    maybeError.code === "P1017" ||
    maybeError.code === "P2039" ||
    maybeError.code === "58P01" ||
    maybeError.code === "ECONNREFUSED" ||
    maybeError.name === "ErrnoError" ||
    maybeError.message?.includes("could not seek to end of file") ||
    maybeError.message?.includes("Connection terminated unexpectedly") ||
    maybeError.message?.includes("Server has closed the connection")
  );
}

export async function withPrismaRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isClosedConnectionError(error)) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}
