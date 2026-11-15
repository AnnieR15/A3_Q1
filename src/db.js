// db.js
// Sets up the connection to PostgreSQL. Every other module imports the
// shared `pool` from here, so the connection settings live in one place.

import 'dotenv/config'; // loads the variables in .env into process.env
import pg from 'pg';

// By default the driver converts DATE columns into JavaScript Date objects,
// which carry a time and a time zone and can display as the wrong day.
// A DATE has neither, so keep it as the plain 'YYYY-MM-DD' text PostgreSQL sends.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

// Connection settings come from the environment (.env file), falling back
// to the usual defaults of a local PostgreSQL installation.
export const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'students_db',
});

// If the server drops an idle connection (for example, PostgreSQL is
// restarted while the menu is open), report it instead of crashing.
pool.on('error', (err) => {
  console.error(`Lost connection to PostgreSQL: ${err.message}`);
});
