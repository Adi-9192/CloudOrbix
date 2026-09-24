import sql from 'mssql';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
 
export const appState = {
roles: [],
users: [],
services: [],
clients: [],
statusHistory: [],
auditLogs: [],
excelImportLogs: [],
notifications: [],
};
 
let pool = null;
const databaseUrl = process.env.DATABASE_URL?.trim();
 
if (databaseUrl) {
pool = new sql.ConnectionPool(databaseUrl);
}
 
function normalizeRow(row) {
if (!row || typeof row !== 'object') return row;
 
const normalized = { ...row };
 
for (const [key, value] of Object.entries(normalized)) {
if ((key === 'roles' || key === 'services') && typeof value === 'string') {
normalized[key] = value
.split(',')
.map((item) => item.trim())
.filter(Boolean);
}
}
 
return normalized;
}
 
export function normalizeQueryForAzureSql(sqlText, values = []) {
let text = String(sqlText || '').trim();
 
if (!text) {
return { text, values };
}
 
text = text.replace(/\$(\d+)/g, (_, index) => `@p${Number(index)}`);
 
text = text.replace(
/\bCURRENT_DATE\b/gi,
'CAST(GETDATE() AS date)'
);
 
text = text.replace(
/\bCURRENT_TIMESTAMP\b/gi,
'GETDATE()'
);
 
text = text.replace(
/\bNOW\(\)/gi,
'GETDATE()'
);
 
text = text.replace(
/::\s*(int|numeric|date|text)/gi,
''
);
 
text = text.replace(
/\bNULLS\s+LAST\b/gi,
''
);
 
/*
* Convert PostgreSQL array_agg syntax to Azure SQL STRING_AGG.
*
* SQL Server does not support:
*
* STRING_AGG(DISTINCT column, ',')
*
* therefore DISTINCT is intentionally not placed inside STRING_AGG.
*/
 
text = text.replace(
/COALESCE\(array_agg\(([^)]+?)\)\s*FILTER\s*\(\s*WHERE\s+([^)]*?)\s*\),\s*'\{\}'\)/gi,
(_, agg, condition) => `COALESCE(STRING_AGG(${agg}, ','), '')`
);
 
text = text.replace(
/COALESCE\(array_agg\(([^)]+?)\),\s*'\{\}'\)/gi,
(_, agg) => `COALESCE(STRING_AGG(${agg}, ','), '')`
);
 
text = text.replace(
/COUNT\(\s*\*\s*\)\s*::\s*int/gi,
'CAST(COUNT(*) AS int)'
);
 
text = text.replace(
/COUNT\(\s*DISTINCT\s+([^)]*?)\s*\)\s*::\s*int/gi,
'CAST(COUNT(DISTINCT $1) AS int)'
);
 
text = text.replace(
/\bRETURNING\b\s+([A-Za-z0-9_\*,\s]+)/gi,
(_, returningClause) => {
const identifier =
returningClause.trim() === '*'
? '*'
: returningClause
.split(',')
.map((part) => part.trim())
.filter(Boolean)
.map((part) =>
part.includes(' AS ')
? part.split(/\s+AS\s+/i).pop()
: part
)
.join(', ');
 
return `OUTPUT INSERTED.${identifier}`;
}
);
 
return { text, values };
}
 
async function ensurePoolConnected() {
if (!pool) {
throw new Error('Database is not configured.');
}
 
if (!pool.connected) {
await pool.connect();
}
}
 
async function executeQuery(sqlText, params = []) {
await ensurePoolConnected();
 
const normalized = normalizeQueryForAzureSql(
sqlText,
params
);
 
const request = pool.request();
 
const values = Array.isArray(params)
? params
: [params];
 
values.forEach((value, index) => {
request.input(`p${index + 1}`, value);
});
 
const result = await request.query(
normalized.text
);
 
return {
rows: (result.recordset || []).map(normalizeRow),
rowCount: result.recordset?.length || 0,
};
}
 
export async function initializeDatabase() {
if (!pool) {
if (process.env.NODE_ENV === 'production') {
throw new Error(
'DATABASE_URL is required in production.'
);
}
 
console.warn(
'DATABASE_URL is not configured; API data access is disabled outside production.'
);
 
return {
source: 'unconfigured',
initialized: false,
};
}
 
try {
await ensurePoolConnected();
 
await pool
.request()
.query('SELECT 1 AS ok');
 
console.log(
'Database connection successful.'
);
 
return {
source: 'azure-sql',
initialized: true,
};
} catch (error) {
await pool
.close()
.catch(() => undefined);
 
pool = null;
 
console.warn(
`Database connection failed (${error.number || 'unknown'}): ${
error.message ||
'Unable to connect to Azure SQL.'
}`
);
 
throw error;
}
}
 
export function getPool() {
if (!pool) {
return null;
}
 
return {
async query(sqlText, params = []) {
return executeQuery(
sqlText,
params
);
},
 
async end() {
if (pool && pool.connected) {
await pool.close();
}
},
};
}
 
export function getState() {
return appState;
}
 
export async function getUserByEmail(email) {
const value = email
?.trim()
.toLowerCase();
 
if (!value) {
return null;
}
 
if (pool) {
const result = await executeQuery(
`
SELECT
u.id,
u.email,
u.password_hash,
u.first_name,
u.last_name,
u.is_active,
STRING_AGG(r.name, ',') AS roles
FROM users u
LEFT JOIN user_roles ur
ON ur.user_id = u.id
LEFT JOIN roles r
ON r.id = ur.role_id
WHERE LOWER(u.email) = @p1
GROUP BY
u.id,
u.email,
u.password_hash,
u.first_name,
u.last_name,
u.is_active
`,
[value]
);
 
const row = result.rows[0];
 
if (!row) {
return null;
}
 
const roles =
typeof row.roles === 'string'
? row.roles
.split(',')
.map((item) => item.trim())
.filter(Boolean)
: Array.isArray(row.roles)
? row.roles
: [];
 
return {
id: row.id,
email: row.email,
password: row.password_hash,
firstName: row.first_name,
lastName: row.last_name,
isActive: row.is_active,
roles,
};
}
 
return null;
}
 
export function getUserProfile(user) {
if (!user) {
return null;
}
 
return {
id: user.id,
email: user.email,
firstName: user.firstName,
lastName: user.lastName,
roles: user.roles,
isActive: user.isActive,
};
}
 
export async function hashPassword(password) {
return bcrypt.hash(password, 10);
}
 
export async function verifyPassword(
password,
hash
) {
return bcrypt.compare(
password,
hash
);
}
 
export async function updateUserPassword(
userId,
password
) {
const hashedPassword =
await hashPassword(password);
 
if (pool) {
await executeQuery(
'UPDATE users SET password_hash = @p1 WHERE id = @p2',
[
hashedPassword,
userId,
]
);
 
return;
}
 
throw new Error(
'Password updates require a configured database.'
);
}
 
export async function createAuditEntry(
userEmail,
action,
oldValue,
newValue
) {
const entry = {
id: Date.now(),
userEmail,
action,
oldValue: oldValue ?? '—',
newValue: newValue ?? '—',
createdAt: new Date().toISOString(),
};
 
appState.auditLogs.unshift(entry);
 
if (pool) {
try {
await executeQuery(
`
INSERT INTO audit_logs
(
user_email,
action,
old_value,
new_value
)
VALUES
(
@p1,
@p2,
@p3,
@p4
)
`,
[
userEmail,
action,
oldValue ?? '—',
newValue ?? '—',
]
);
} catch (error) {
console.error(
'Audit persistence error:',
{
userEmail,
action,
message: error.message,
code: error.code,
number: error.number,
stack: error.stack,
}
);
}
}
}
 
export function createStatusHistory(
clientId,
previousStatus,
newStatus,
changedBy
) {
appState.statusHistory.unshift({
id: Date.now(),
clientId,
previousStatus,
newStatus,
changedBy,
changedAt: new Date().toISOString(),
});
}
 
export function createImportLog(payload) {
appState.excelImportLogs.unshift({
id: Date.now(),
fileName: payload.fileName,
totalProcessed: payload.totalProcessed,
imported: payload.imported,
updated: payload.updated,
duplicates: payload.duplicates,
failed: payload.failed,
createdAt: new Date().toISOString(),
});
}
 
export function createNotification(
userEmail,
type,
title,
message,
metadata = {}
) {
const normalizedEmail = String(
userEmail || ''
)
.trim()
.toLowerCase();
 
const entry = {
id: Date.now(),
userEmail: normalizedEmail,
type,
title,
message,
metadata,
read: false,
createdAt: new Date().toISOString(),
};
 
appState.notifications.unshift(entry);
 
return entry;
}
 
export function listNotificationsForUser(
userEmail
) {
const normalizedEmail = String(
userEmail || ''
)
.trim()
.toLowerCase();
 
return appState.notifications
.filter(
(notification) =>
notification.userEmail ===
normalizedEmail
)
.sort(
(left, right) =>
new Date(right.createdAt).valueOf() -
new Date(left.createdAt).valueOf()
);
}
