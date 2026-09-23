import sql from 'mssql';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!email || !password || password.length < 12) {
  throw new Error(
    'Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (minimum 12 characters) for this one-time command.'
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}

const pool = new sql.ConnectionPool(process.env.DATABASE_URL);

try {
  await pool.connect();

  console.log('Connected to Azure SQL Database.');

  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;

  try {
    await transaction.begin();
    transactionStarted = true;

    // Check whether the administrator already exists
    const existingRequest = new sql.Request(transaction);

    const existing = await existingRequest
      .input('email', sql.VarChar(255), email)
      .query(`
        SELECT id
        FROM dbo.users
        WHERE LOWER(email) = @email
      `);

    if (existing.recordset.length > 0) {
      throw new Error(
        `A user with ${email} already exists; no changes made.`
      );
    }

    // Generate password hash
    const passwordHash = await bcrypt.hash(password, 12);

    // Create administrator user
    const userRequest = new sql.Request(transaction);

    const user = await userRequest
      .input('email', sql.VarChar(255), email)
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .input('firstName', sql.VarChar(100), 'System')
      .input('lastName', sql.VarChar(100), 'Administrator')
      .query(`
        INSERT INTO dbo.users (
          email,
          password_hash,
          first_name,
          last_name,
          is_active
        )
        OUTPUT INSERTED.id AS id
        VALUES (
          @email,
          @passwordHash,
          @firstName,
          @lastName,
          1
        )
      `);

    const userId = user.recordset[0].id;

    // Find Admin role created by database migration
    const roleRequest = new sql.Request(transaction);

    const role = await roleRequest.query(`
      SELECT id
      FROM dbo.roles
      WHERE name = 'Admin'
    `);

    if (role.recordset.length === 0) {
      throw new Error(
        'Admin role is missing. Run npm run migrate first.'
      );
    }

    const roleId = role.recordset[0].id;

    // Assign Admin role to the new user
    const userRoleRequest = new sql.Request(transaction);

    await 
