import { Pool } from 'pg';

// Prefer DATABASE_URL if provided (e.g., Neon.tech), otherwise fall back to discrete vars
const useConnectionString = !!process.env.DATABASE_URL;

const pool = useConnectionString
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // Neon and many hosted PG instances require SSL
      ssl: process.env.NODE_ENV === 'production' || /neon\.tech/.test(process.env.DATABASE_URL!)
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

// Тестовое соединение при запуске
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
