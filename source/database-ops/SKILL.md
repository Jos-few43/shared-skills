---
name: database-ops
description: Use when working with databases — migrations, queries, schema design, backups, and troubleshooting. Covers SQLite, PostgreSQL, and container-based database services.
---

# Database Operations

## Supported Databases

### SQLite
- Default for local development and small projects
- No container needed — runs in-process
- Data files typically at `~/<project>/data/*.db`

### PostgreSQL
- Run in a dedicated container or via podman
- Default port: 5432

```bash
# Start PostgreSQL in podman
podman run -d --name postgres \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 \
  -v ~/data/postgres:/var/lib/postgresql/data \
  postgres:16

# Connect
podman exec -it postgres psql -U postgres
```

## Migrations

### Best Practices
- Always use migration files (never manual schema changes)
- Name migrations descriptively: `001_create_users_table.sql`
- Include both `up` and `down` migrations
- Test rollback before deploying
- Keep migrations idempotent where possible

### Common Tools
- **Drizzle** (TypeScript): `npx drizzle-kit generate && npx drizzle-kit migrate`
- **Alembic** (Python): `alembic revision --autogenerate -m "description" && alembic upgrade head`
- **golang-migrate** (Go): `migrate -path ./migrations -database $DB_URL up`
- **sqlx** (Rust): `sqlx migrate run`

## Schema Design

- Use UUIDs for primary keys in distributed systems, auto-increment for simple apps
- Always add `created_at` and `updated_at` timestamps
- Index foreign keys and frequently-queried columns
- Use `NOT NULL` with sensible defaults over nullable columns
- Normalize to 3NF, denormalize only with measured performance need

## Backups

```bash
# PostgreSQL
pg_dump -U postgres -d mydb > backup_$(date +%Y%m%d).sql
pg_dump -U postgres -Fc -d mydb > backup_$(date +%Y%m%d).dump  # compressed

# SQLite
sqlite3 mydb.db ".backup backup_$(date +%Y%m%d).db"

# Restore PostgreSQL
pg_restore -U postgres -d mydb backup.dump

# Restore SQLite
cp backup.db mydb.db
```

## Query Optimization

- Use `EXPLAIN ANALYZE` to check query plans
- Add indexes for columns in WHERE, JOIN, ORDER BY
- Avoid `SELECT *` — specify needed columns
- Use pagination with `LIMIT/OFFSET` or cursor-based pagination
- Batch inserts with multi-row VALUES or COPY

## Troubleshooting

### Connection Issues
1. Check container is running: `podman ps | grep postgres`
2. Check port binding: `podman port postgres`
3. Test connection: `psql -h localhost -U postgres -c '\l'`

### Slow Queries
1. Enable query logging: `SET log_min_duration_statement = 100;`
2. Run `EXPLAIN ANALYZE` on the slow query
3. Check for missing indexes: `\di` in psql
4. Check table statistics: `ANALYZE <table>;`

### Lock Issues
- Check locks: `SELECT * FROM pg_locks WHERE NOT granted;`
- Kill stuck queries: `SELECT pg_terminate_backend(<pid>);`
