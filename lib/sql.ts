import sql from "mssql";

type SqlPool = sql.ConnectionPool;

let pool: SqlPool | null = null;
let connecting: Promise<SqlPool> | null = null;

const parseBoolean = (value: string | undefined, fallback = false) => {
  if (value === undefined) return fallback;
  return ["true", "1", "yes"].includes(value.toLowerCase());
};

const getConfig = (): sql.config => {
  const server = process.env.SQL_SERVER;
  const database = process.env.SQL_DATABASE;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;

  if (!server || !database || !user || !password) {
    throw new Error("SQL configuration is missing required environment variables.");
  }

  const port = Number(process.env.SQL_PORT ?? "1433");
  const encrypt = parseBoolean(process.env.SQL_ENCRYPT, false);

  return {
    server,
    database,
    user,
    password,
    port,
    options: {
      encrypt,
      trustServerCertificate: !encrypt,
    },
    pool: {
      max: Number(process.env.SQL_POOL_MAX ?? 50),
      min: Number(process.env.SQL_POOL_MIN ?? 5),
      idleTimeoutMillis: Number(process.env.SQL_POOL_IDLE ?? 30000),
    },
  };
};

/**
 * Returns a singleton SQL Server connection pool.
 * Uses lazy initialization and preserves the pool across hot reloads.
 */
export async function getSqlPool(): Promise<SqlPool> {
  if (pool && pool.connected) {
    return pool;
  }

  if (connecting) {
    return connecting;
  }

  connecting = sql
    .connect(getConfig())
    .then((connectedPool) => {
      pool = connectedPool;
      connecting = null;
      return connectedPool;
    })
    .catch((err) => {
      connecting = null;
      console.error("Failed to connect to SQL Server:", err);
      throw err;
    });

  return connecting;
}

export { sql };
