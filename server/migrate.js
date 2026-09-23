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

  await pool.request().query(`
    IF OBJECT_ID(N'schema_migrations', N'U') IS NULL
    BEGIN
      CREATE TABLE schema_migrations (
        version NVARCHAR(255) PRIMARY KEY,
        applied_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
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

  console.log(`Found ${files.length} migration file(s).`);

  for (const file of files) {
    const applied = await pool
      .request()
      .input('version', sql.NVarChar(255), file)
      .query(`
        SELECT 1
        FROM schema_migrations
        WHERE version = @version
      `);

    if (applied.recordset.length > 0) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    console.log(`Applying migration: ${file}`);

    const sqlText = await fs.readFile(
      path.join(migrationDirectory, file),
      'utf8'
    );

    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
      await transaction.begin();
      transactionStarted = true;

      const migrationRequest = new sql.Request(transaction);

      await migrationRequest.query(sqlText);

      const trackingRequest = new sql.Request(transaction);

      trackingRequest.input(
        'version',
        sql.NVarChar(255),
        file
      );

      await trackingRequest.query(`
        INSERT INTO schema_migrations (version)
        VALUES (@version)
      `);

      await transaction.commit();
      transactionStarted = false;

      console.log(`Applied migration: ${file}`);
    } catch (error) {
      if (transactionStarted) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error(
            `Rollback failed for ${file}:`,
            rollbackError.message
          );
        }
      }

      console.error(`Migration failed: ${file}`);
      throw error;
    }
  }

  console.log('All database migrations completed successfully.');
} catch (error) {
  console.error('Database migration failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.close();
}
