# CloudOrbix

CloudOrbix is a React and Vite application for CIS professional-services operations. It includes client management, project tracking, reporting, audit logs, Excel imports, role-based access, and an Express API.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 14 or newer

The API currently uses PostgreSQL through the `pg` package. `DATABASE_URL` must therefore be a PostgreSQL connection string; SQLite URLs such as `sqlite:./cloudorbix.sqlite` are not supported by the current database layer.

## Install

```bash
npm install
```

The main runtime dependencies are:

- React and React DOM for the frontend
- Vite and Tailwind CSS for the client build
- Express, CORS, Helmet, and rate limiting for the API
- `pg` for PostgreSQL access
- `bcryptjs` and `jsonwebtoken` for authentication
- ExcelJS for spreadsheet imports
- Azure Blob Storage for document storage
- Recharts for analytics visualizations

## Configuration

Create a `.env` file in the project root:

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/cloudorbix
PORT=4000
CORS_ORIGINS=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
```

For the one-time administrator setup, also provide:

```env
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-password-of-at-least-12-characters
```

Do not commit `.env` files or production secrets.

## Database setup

Create the PostgreSQL database, then apply the schema migrations:

```bash
npm run migrate
```

Create the initial administrator account once:

```bash
npm run bootstrap-admin
```

## Run locally

Start the API and frontend together:

```bash
npm run dev
```

Or start them separately:

```bash
npm run dev:server
npm run dev:client
```

The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:4000` by default.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend and API in development mode |
| `npm run dev:client` | Start the Vite frontend |
| `npm run dev:server` | Start the Express API with Nodemon |
| `npm run migrate` | Apply pending PostgreSQL migrations |
| `npm run bootstrap-admin` | Create the initial administrator |
| `npm run build` | Create a production frontend build |
| `npm test` | Run server unit tests |
| `npm run preview` | Preview the production frontend build |
| `npm run format` | Format the project with oxfmt |

## Project structure

```text
server/       Express API, database access, migrations, and routes
src/          React application and UI components
public/       Static frontend assets
```

## Health check

With the API running, open `http://localhost:4000/api/health`. A healthy server returns a JSON response with `ok: true`.
