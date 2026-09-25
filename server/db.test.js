import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeQueryForAzureSql } from './db.js';

test('normalizes PostgreSQL parameter placeholders for Azure SQL', () => {
  const { text, values } = normalizeQueryForAzureSql(
    'SELECT * FROM users WHERE LOWER(email) = $1 AND is_active = $2',
    ['admin@example.com', true],
  );

  assert.equal(text, 'SELECT * FROM users WHERE LOWER(email) = @p1 AND is_active = @p2');
  assert.deepEqual(values, ['admin@example.com', true]);
});

test('rewrites RETURNING clauses to SQL Server OUTPUT clauses', () => {
  const { text: insertText } = normalizeQueryForAzureSql(
    'INSERT INTO users(email) VALUES($1) RETURNING id',
    ['admin@example.com'],
  );

  assert.match(insertText, /INSERT INTO users\(email\) OUTPUT INSERTED\.id VALUES/i);
  assert.doesNotMatch(insertText, /RETURNING/i);

  const { text: updateText } = normalizeQueryForAzureSql(
    'UPDATE users SET email=$1 WHERE id=$2 RETURNING id',
  );
  assert.match(updateText, /SET email=@p1 OUTPUT INSERTED\.id WHERE id=@p2/i);

  const { text: deleteText } = normalizeQueryForAzureSql(
    'DELETE FROM users WHERE id=$1 RETURNING id,email',
  );
  assert.match(deleteText, /DELETE FROM users OUTPUT DELETED\.id, DELETED\.email WHERE id=@p1/i);
});

test('rewrites PostgreSQL LIMIT pagination for Azure SQL', () => {
  const { text } = normalizeQueryForAzureSql(
    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500',
  );

  assert.match(text, /OFFSET 0 ROWS FETCH NEXT 500 ROWS ONLY/i);
  assert.doesNotMatch(text, /LIMIT/i);
});

test('rewrites Postgres array aggregation for Azure SQL string aggregation', () => {
  const { text } = normalizeQueryForAzureSql(
    "SELECT COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles FROM user_roles ur LEFT JOIN roles r ON r.id = ur.role_id",
    [],
  );

  assert.match(text, /STRING_AGG\(DISTINCT r\.name/i);
  assert.doesNotMatch(text, /array_agg/i);
});

test('rewrites PostgreSQL FILTER aggregates and TO_CHAR ordering patterns for Azure SQL', () => {
  const { text } = normalizeQueryForAzureSql(
    "SELECT COUNT(*) FILTER (WHERE current_status = 'Open')::int open_risks, TO_CHAR(COALESCE(actual_onboard_date, planned_onboard_date), 'Mon') AS month FROM clients ORDER BY expected_start_date NULLS LAST",
    [],
  );

  assert.match(text, /CASE WHEN current_status = 'Open' THEN 1 ELSE 0 END/i);
  assert.match(text, /FORMAT\(COALESCE\(actual_onboard_date, planned_onboard_date\), 'MMM'\)/i);
  assert.doesNotMatch(text, /FILTER \(WHERE/i);
  assert.doesNotMatch(text, /TO_CHAR/i);
  assert.doesNotMatch(text, /NULLS LAST/i);
});
