import { Pool, PoolClient, QueryResultRow } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const maxConnectionAttempts = Number(process.env.DB_CONNECT_RETRIES ?? 5);
const connectionRetryDelayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 1000);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5000)
});

function isConnectionStartupError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    code === "57P03" ||
    code === "08006"
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(): Promise<PoolClient> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxConnectionAttempts; attempt++) {
    try {
      return await pool.connect();
    } catch (error) {
      lastError = error;

      if (!isConnectionStartupError(error) || attempt === maxConnectionAttempts) {
        break;
      }

      console.warn(
        `Database connection failed during startup, retrying (${attempt}/${maxConnectionAttempts})`
      );
      await wait(connectionRetryDelayMs);
    }
  }

  throw lastError;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await connectWithRetry();

  try {
    const result = await client.query<T>(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await connectWithRetry();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
