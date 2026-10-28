# Production Security

Required environment variables are documented in `.env.example`. Store actual values in the deployment secret manager; never commit `.env` files or print connection strings.

Run `npm run migrate` as a release step using a migration-only database identity. The API process must not own schema changes. Place the API behind an HTTPS reverse proxy and set `CORS_ORIGINS` to the exact frontend origins.

After the first migration on a new database, create the first administrator once with `npm run bootstrap-admin`, supplying `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` through the deployment secret environment. The command refuses to overwrite an existing email; remove those bootstrap variables immediately after it succeeds.

`xlsx` currently has high-severity advisories without an upstream fix. Treat uploaded workbooks as untrusted, keep the configured upload limits, isolate the import worker or replace SheetJS before production ingestion is enabled, and review `npm audit` during every release.