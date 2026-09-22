import fs from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required to run migrations.');

const pool = new sql.ConnectionPool(databaseUrl);

try {
  await pool.connect();
  await pool.request().query("IF OBJECT_ID(N'schema_migrations', N'U') IS NULL CREATE TABLE schema_migrations (version NVARCHAR(255) PRIMARY KEY, applied_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME())");
  const migrationDirectory = path.join(process.cwd(), 'server', 'migrations');
  const files = (await fs.readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const applied = await pool.request().input('version', sql.NVarChar(255), file).query('SELECT 1 FROM schema_migrations WHERE version = @version');
    if (applied.recordset.length) continue;
    const sqlText = await fs.readFile(path.join(migrationDirectory, file), 'utf8');
    await pool.request().query('BEGIN TRANSACTION');
    try {
      await pool.request().query(sqlText);
      await pool.request().input('version', sql.NVarChar(255), file).query('INSERT INTO schema_migrations(version) VALUES(@version)');
      await pool.request().query('COMMIT TRANSACTION');
      console.log(`Applied migration ${file}`);
    } catch (error) {
      await pool.request().query('ROLLBACK TRANSACTION').catch(() => undefined);
      throw error;
    }
  }
} finally {
  await pool.close();
}
