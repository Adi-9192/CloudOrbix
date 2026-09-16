# CloudOrbix Azure Deployment Guide

This guide deploys CloudOrbix with Azure Database for PostgreSQL Flexible Server, an Azure App Service API, and a separately hosted Vite frontend or same-origin frontend deployment.

## Architecture

Recommended production components:

- Azure Database for PostgreSQL Flexible Server for application data
- Azure App Service for the Node.js/Express API
- Azure Static Web Apps or Azure App Service for the Vite frontend
- Azure Key Vault for secrets
- Application Insights or Sentry for monitoring
- Azure Blob Storage for project documents
- HTTPS through Azure-managed certificates or an approved reverse proxy

The repository no longer seeds demo users or demo clients. A new database must be migrated and bootstrapped with an administrator before anyone can log in.

## Prerequisites

Install or have access to:

- Azure CLI
- Node.js 22 or later
- npm
- Git
- Access to an Azure subscription
- Permission to create resource groups, databases, App Services, storage, and Key Vault resources

Confirm the tools:

```powershell
az version
node --version
npm --version
git --version
```

Log in and select the subscription:

```powershell
az login
az account list --output table
az account set --subscription "<subscription-id-or-name>"
```

## 1. Set deployment variables

Use a PowerShell session for the deployment variables. Do not commit these values or place them in source control.

```powershell
$ResourceGroup = "cloudorbix-prod-rg"
$Location = "eastus"
$PostgresServer = "cloudorbix-prod-db"
$DatabaseName = "cloudorbix"
$AppServicePlan = "cloudorbix-prod-plan"
$ApiAppName = "cloudorbix-prod-api"
$StorageAccount = "cloudorbixprod<unique-suffix>"
$KeyVaultName = "cloudorbix-prod-kv<unique-suffix>"
```

Resource names must be globally unique where Azure requires it. Storage account names may contain only lowercase letters and numbers.

## 2. Create the resource group

```powershell
az group create `
  --name $ResourceGroup `
  --location $Location
```

## 3. Create PostgreSQL Flexible Server

Create a strong database administrator password outside the repository. Use a password manager or secret generator.

```powershell
$DbAdmin = "cloudorbixadmin"
$DbAdminPassword = Read-Host "Enter the PostgreSQL administrator password" -AsSecureString
$DbAdminPasswordPlain = [System.Net.NetworkCredential]::new("", $DbAdminPassword).Password
```

Create the server:

```powershell
az postgres flexible-server create `
  --resource-group $ResourceGroup `
  --name $PostgresServer `
  --location $Location `
  --admin-user $DbAdmin `
  --admin-password $DbAdminPasswordPlain `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --storage-size 32 `
  --version 16 `
  --public-access 0.0.0.0
```

Create the application database:

```powershell
az postgres flexible-server db create `
  --resource-group $ResourceGroup `
  --server-name $PostgresServer `
  --database-name $DatabaseName
```

The temporary public access rule is useful for the initial migration. Restrict it before production traffic is enabled. Prefer private networking for a mature production environment.

The connection string format is:

```text
postgresql://<user>:<url-encoded-password>@<server>.postgres.database.azure.com:5432/<database>?sslmode=require
```

For this deployment:

```powershell
$DatabaseUrl = "postgresql://$DbAdmin`:$DbAdminPasswordPlain@$PostgresServer.postgres.database.azure.com:5432/$DatabaseName?sslmode=require"
```

If the password contains `@`, `:`, `/`, `#`, or other URL-reserved characters, URL-encode it before constructing the connection string.

## 4. Create the database schema

From the repository root, install dependencies and run the controlled migration:

```powershell
npm ci
$env:DATABASE_URL = $DatabaseUrl
$env:NODE_ENV = "production"
npm run migrate
```

The migration command:

- Creates the application tables
- Creates the `schema_migrations` table
- Applies each SQL file in `server/migrations` once
- Does not create demo users
- Does not create demo clients
- Does not run automatically when the API starts

Verify the migration through Node.js if `psql` is unavailable:

```powershell
node --input-type=module -e "import pg from 'pg'; const {Pool}=pg; const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true}}); const r=await pool.query(\"select table_name from information_schema.tables where table_schema='public' order by table_name\"); console.log(r.rows.map(x=>x.table_name).join('\\n')); await pool.end();"
```

Expected tables include:

```text
audit_logs
client_services
clients
excel_import_logs
project_documents
project_risks
project_tasks
project_updates
roles
schema_migrations
services
status_history
user_roles
users
```

## 5. Create the first administrator

A new database contains roles but no user accounts. Create the first administrator with the one-time bootstrap command:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = "your-admin@yourcompany.com"
$env:BOOTSTRAP_ADMIN_PASSWORD = Read-Host "Enter the first administrator password"
npm run bootstrap-admin
```

The password must be at least 12 characters. The command hashes it with bcrypt, assigns the `Admin` role, and refuses to overwrite an existing email address.

After successful creation, remove the bootstrap values from the session:

```powershell
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD
```

The first login is now:

```text
Email: your-admin@yourcompany.com
Password: the password entered during bootstrap
```

Do not put the bootstrap password in an App Service setting that remains after deployment. If the command is run from a CI/CD release job, delete the temporary pipeline variables immediately after the job completes.

## 6. Create Azure Key Vault

Create the vault:

```powershell
az keyvault create `
  --resource-group $ResourceGroup `
  --name $KeyVaultName `
  --location $Location `
  --enable-rbac-authorization true
```

Generate a strong JWT secret:

```powershell
$JwtSecret = node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Store production secrets:

```powershell
az keyvault secret set --vault-name $KeyVaultName --name DatabaseUrl --value $DatabaseUrl
az keyvault secret set --vault-name $KeyVaultName --name JwtSecret --value $JwtSecret
```

Do not print the values after storing them. Grant the App Service managed identity permission to read secrets after the App Service is created.

## 7. Create Blob Storage for documents

Create the storage account:

```powershell
az storage account create `
  --resource-group $ResourceGroup `
  --name $StorageAccount `
  --location $Location `
  --sku Standard_LRS `
  --kind StorageV2 `
  --https-only true `
  --min-tls-version TLS1_2
```

Create the document container:

```powershell
az storage container create `
  --account-name $StorageAccount `
  --name cloudorbix-project-documents `
  --auth-mode login
```

For production, prefer managed identity and Azure RBAC over a long-lived storage connection string. The current application accepts `AZURE_STORAGE_CONNECTION_STRING`; keep that value in Key Vault if it is used.

## 8. Create the API App Service

Create a Linux App Service plan:

```powershell
az appservice plan create `
  --resource-group $ResourceGroup `
  --name $AppServicePlan `
  --is-linux `
  --sku B1
```

Create the Node.js App Service:

```powershell
az webapp create `
  --resource-group $ResourceGroup `
  --plan $AppServicePlan `
  --name $ApiAppName `
  --runtime "NODE:22-lts"
```

Enable the managed identity:

```powershell
az webapp identity assign `
  --resource-group $ResourceGroup `
  --name $ApiAppName
```

Retrieve the identity principal ID:

```powershell
$PrincipalId = az webapp identity show `
  --resource-group $ResourceGroup `
  --name $ApiAppName `
  --query principalId `
  --output tsv
```

Grant Key Vault secret-read access:

```powershell
az role assignment create `
  --assignee-object-id $PrincipalId `
  --assignee-principal-type ServicePrincipal `
  --role "Key Vault Secrets User" `
  --scope "/subscriptions/<subscription-id>/resourceGroups/$ResourceGroup/providers/Microsoft.KeyVault/vaults/$KeyVaultName"
```

## 9. Configure API settings

The API requires these settings in production:

```text
NODE_ENV=production
PORT=8080
DATABASE_URL=<PostgreSQL connection string>
JWT_SECRET=<random secret, at least 32 characters>
CORS_ORIGINS=https://<frontend-domain>
VITE_ADMIN_EMAIL=<administrator support email>
SENTRY_DSN=<optional Sentry DSN>
AZURE_STORAGE_CONTAINER=cloudorbix-project-documents
```

Set non-secret settings directly:

```powershell
az webapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $ApiAppName `
  --settings `
    NODE_ENV=production `
    PORT=8080 `
    CORS_ORIGINS="https://<frontend-domain>" `
    VITE_ADMIN_EMAIL="your-admin@yourcompany.com" `
    AZURE_STORAGE_CONTAINER="cloudorbix-project-documents"
```

For a first deployment, set the database and JWT values as App Service settings only if Key Vault references are not yet configured. Key Vault references are preferred for production.

Example direct settings:

```powershell
az webapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $ApiAppName `
  --settings `
    DATABASE_URL="$DatabaseUrl" `
    JWT_SECRET="$JwtSecret"
```

The API validates `DATABASE_URL`, `CORS_ORIGINS`, and `JWT_SECRET` in production. It will refuse to start if required configuration is missing.

## 10. Configure App Service security

```powershell
az webapp config set `
  --resource-group $ResourceGroup `
  --name $ApiAppName `
  --always-on true `
  --http20-enabled true `
  --min-tls-version 1.2 `
  --ftps-state Disabled
```

The application also applies:

- Helmet security headers
- API rate limiting
- Authentication rate limiting
- HTTPS redirection behind a trusted proxy
- Request correlation IDs
- Production-safe error responses
- No database credential logging

Use Azure networking controls to limit database access to the API and migration runner. Do not leave PostgreSQL open to the entire internet after initial setup.

## 11. Deploy the API

The API must run migrations before the new version starts. A recommended CI/CD sequence is:

```powershell
npm ci
npm test
npm run build
npm run migrate
```

Deploy the repository using GitHub Actions, Azure DevOps, or ZIP deployment. For ZIP deployment from the repository root:

```powershell
Compress-Archive -Path * -DestinationPath cloudorbix-api.zip -Force
az webapp deploy `
  --resource-group $ResourceGroup `
  --name $ApiAppName `
  --src-path cloudorbix-api.zip `
  --type zip
```

Set the App Service startup command:

```powershell
az webapp config set `
  --resource-group $ResourceGroup `
  --name $ApiAppName `
  --startup-file "npm run server"
```

Do not run `npm run migrate` from normal application startup. Run it as a controlled release step using a migration-capable database identity.

## 12. Frontend deployment options

The frontend currently calls relative endpoints such as `/api/auth/login` and `/api/dashboard`.

### Option A: Same-origin deployment

Serve the Vite `dist` output from the same public origin as the Express API. This keeps the existing relative `/api` calls unchanged and avoids browser CORS complexity.

Before using this option, configure Express to serve the built `dist` directory and add a fallback to `dist/index.html` for the client-side routes. The current repository separates the Vite dev server and API, so this is a small deployment integration step.

### Option B: Separate Static Web App

Deploy the Vite frontend to Azure Static Web Apps and expose the API at a separate HTTPS hostname. In that model, the frontend request helper must prepend a production API base URL, for example:

```text
VITE_API_URL=https://<api-app-name>.azurewebsites.net
```

Update frontend API calls to use that base URL, then set the API's `CORS_ORIGINS` to the exact Static Web Apps hostname. Do not use `*` for production CORS.

Build the frontend:

```powershell
npm ci
npm run build
```

Deploy the generated `dist` directory through the Static Web Apps GitHub integration or Azure deployment workflow.

## 13. Custom domain and HTTPS

Add the production hostname to the API and frontend services. Use an Azure-managed certificate or an approved certificate authority.

Verify:

```powershell
curl.exe -I http://<frontend-domain>
curl.exe -I https://<frontend-domain>
curl.exe -I https://<api-domain>/api/health
```

Expected behavior:

- HTTP redirects to HTTPS
- HTTPS returns a valid certificate
- API health endpoint responds successfully
- CORS allows only the configured frontend origin

## 14. Monitoring and logs

Configure Application Insights for the App Service, or set `SENTRY_DSN` for Sentry error capture.

Check live application logs:

```powershell
az webapp log config `
  --resource-group $ResourceGroup `
  --name $ApiAppName `
  --application-logging filesystem `
  --level information

az webapp log tail `
  --resource-group $ResourceGroup `
  --name $ApiAppName
```

Confirm logs do not contain:

- `DATABASE_URL`
- Database passwords
- JWT secrets
- User passwords
- Authorization bearer tokens

## 15. Post-deployment verification

Health check:

```powershell
curl.exe https://<api-domain>/api/health
```

Verify the following in the browser:

1. The first administrator can log in.
2. The dashboard loads database-backed KPIs and charts.
3. The administrator can create another user with a supplied password.
4. A non-admin cannot access Admin routes.
5. Pending client changes require approval.
6. Non-admin users cannot delete clients.
7. Project tasks, risks, updates, and documents work.
8. Reports export correctly.
9. HTTPS is enforced.
10. Notifications and errors are based on live data.
11. CORS rejects an unapproved origin.
12. Rate limits respond with HTTP 429 after the configured threshold.

Run the repository checks before each release:

```powershell
npm ci
npm test
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

## 16. Backups and rollback

Enable PostgreSQL backups and point-in-time restore in Azure. Before a production migration:

1. Create or verify a database backup.
2. Run the migration in a staging database.
3. Confirm `schema_migrations` contains the expected version.
4. Deploy the API code.
5. Monitor errors and health checks.

To roll back application code, redeploy the previous known-good artifact. Do not manually delete migration records or reverse schema changes without a reviewed rollback migration.

## 17. Production checklist

- [ ] `.env` is not committed.
- [ ] Local database password and JWT secret have been rotated.
- [ ] A unique production `JWT_SECRET` is stored in Key Vault.
- [ ] PostgreSQL uses TLS and restricted network access.
- [ ] Application database user is separate from the PostgreSQL administrator.
- [ ] `npm run migrate` has been run against the intended production database.
- [ ] First admin was created with `npm run bootstrap-admin`.
- [ ] Bootstrap environment variables were removed after use.
- [ ] `CORS_ORIGINS` contains only the real frontend origin.
- [ ] HTTPS and TLS 1.2 or higher are enabled.
- [ ] FTPS is disabled.
- [ ] Backups and point-in-time restore are enabled.
- [ ] Monitoring is configured.
- [ ] Rate limiting is enabled.
- [ ] No demo users or demo data are present.
- [ ] Tests, TypeScript checks, build, and dependency audit have run.
- [ ] A rollback artifact and migration plan are available.
