# Database Connection Guide for Chronolio

This guide addresses common database connection issues when deploying Chronolio.

## Database Connection String

Your `DATABASE_URL` environment variable should follow this format:
```
postgres://username:password@hostname:5432/database_name
```

## Common Database Issues

### 1. Connection Issues

If you're having trouble connecting to your database:

- **Check your connection string**: Make sure the hostname, port, username, password, and database name are correct.
- **Check network accessibility**: Ensure the database server is accessible from your deployment environment (Vercel/Replit).
- **Check PostgreSQL version**: Chronolio works best with PostgreSQL 13+.

### 2. SSL Certificate Issues

When deploying on Vercel, you may need to enable SSL for the database connection:

```
postgres://username:password@hostname:5432/database_name?sslmode=require
```

If you still have issues, try adding these parameters:
```
postgres://username:password@hostname:5432/database_name?sslmode=verify-ca&sslrootcert=DigiCertGlobalRootCA.crt.pem
```

### 3. Schema Mismatch Issues

If your application is showing errors about missing columns or tables:

1. Check that your database has all the required tables defined in `db/schema.ts`
2. Run the migrations to add any missing fields:
   ```
   node run-migrations.js
   node run-vendor-migrations.js
   ```

### 4. Connection Pool Issues

If you're facing connection errors under load, try adjusting the connection pool settings:

```typescript
// In db/index.ts
export const db = new PostgresJSDatabase({
  connectionString: process.env.DATABASE_URL,
  max: 5,  // Number of connections in the pool
  idleTimeoutMillis: 30000  // How long a client is allowed to remain idle before being closed
});
```

### 5. Session Store Issues

If you're experiencing issues with session persistence:

1. Check that your database has a `session` table
2. If not, the application will try to create it automatically
3. Verify session table permissions for your database user

## Testing Database Connection

You can test your database connection with:

```
node test-vercel-database.js
```

This script will:
1. Attempt to connect to your database using the `DATABASE_URL` environment variable
2. Verify that all required tables exist
3. Check for any schema mismatches

## Verifying Database Schema

To check if your database schema matches your TypeScript definitions:

```
node verify-db-schema.js
```

This will list all tables in your database and check them against your TypeScript schema definitions.

## Database Migration Scripts

We've included several scripts to help with database migrations:

- `run-migrations.js`: Runs any pending migrations
- `run-vendor-migrations.js`: Adds vendor-related fields to tables
- `update-share-table.js`: Updates the public timeline shares table

Run these scripts when deploying to a new environment or when updating your application.