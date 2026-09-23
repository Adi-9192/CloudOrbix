import fs from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const pool = new sql.ConnectionPool(databaseUrl);

try {
  await pool.connect();

  console.log('Connected to Azure SQL Database.');

  // Create migration tracking table if it does not already exist.
  await pool.request().query(`
    IF OBJECT_ID(N'schema_migrations', N'U') IS NULL
    BEGIN
      CREATE TABLE schema_migrations (
        version NVARCHAR(255) PRIMARY KEY,
        applied_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      )
    END
  `);

  const migrationDirectory = path.join(
    process.cwd(),
    'server',
    'migrations'
  );

  const files = (await fs.readdir(migrationDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await pool
      .request()
      .input('version', sql.NVarChar(255), file)
      .query(`
        SELECT 1
        FROM schema_migrations
        WHERE version = @version
      `);

    if (applied.recordset.length) {
      console.log(`Skipping already applied migration ${file}`);
      continue;
    }

    console.log(`Applying migration ${file}...`);

    const sqlText = await fs.readFile(
      path.join(migrationDirectory, file),
      'utf8'
    );

    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const migrationRequest = new sql.Request(transaction);
      await migrationRequest.query(sqlText);

      const trackingRequest = new sql.Request(transaction);

      await trackingRequest
        .input('version', sql.NVarChar(255), file)
        .query(`
          INSERT INTO schema_migrations(version)
          VALUES(@version)
        `);

      await transaction.commit();

      console.log(`Applied migration ${file}`);
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error(
          `Rollback failed for ${file}:`,
          rollbackError.message
        );
      }

      console.error(`Migration failed: ${file}`);
      throw error;
    }
  }

  console.log('All database migrations completed successfully.');
} finally {
  await pool.close();
}
