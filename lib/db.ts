import { Pool, PoolConfig } from 'pg';

let poolConfig: PoolConfig;

if (process.env.DB_PASSWORD) {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'hospital_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
} else if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
} else {
  // Default fallback for this local hospital_db setup
  poolConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Shams@1234',
    database: 'hospital_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

// Global singleton pool for development hot-reloading
declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

const pool: Pool = global.__dbPool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  global.__dbPool = pool;
}

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SQL Query] (${duration}ms):`, text.trim().slice(0, 100), params || '');
    }
    return { rows: res.rows, rowCount: res.rowCount };
  } catch (error: any) {
    console.error(`[SQL Error] in query:`, text, params, error?.message);
    throw error;
  }
}

export { pool };
export default pool;
