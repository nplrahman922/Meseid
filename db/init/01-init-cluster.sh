#!/bin/sh
set -e

APP_PASSWORD="${APP_DB_PASSWORD:-meseid_app_secret_pass_123}"

echo ">> [Meseid] Initializing cluster extensions and roles..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- 1. Cluster / Database level extensions
  CREATE EXTENSION IF NOT EXISTS citext;
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- 2. Context roles (NOLOGIN)
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meseid_owner_ctx') THEN
      CREATE ROLE meseid_owner_ctx NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meseid_admin_ctx') THEN
      CREATE ROLE meseid_admin_ctx NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meseid_system_ctx') THEN
      CREATE ROLE meseid_system_ctx NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;

    -- 3. Application login role (LOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meseid_app') THEN
      CREATE ROLE meseid_app WITH LOGIN PASSWORD '$APP_PASSWORD' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    ELSE
      ALTER ROLE meseid_app WITH PASSWORD '$APP_PASSWORD' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
  END
  \$\$;

  -- 4. Membership: meseid_app is member of the three context roles
  GRANT meseid_owner_ctx, meseid_admin_ctx, meseid_system_ctx TO meseid_app;

  -- 5. Schema usage
  GRANT USAGE ON SCHEMA public TO meseid_app, meseid_owner_ctx, meseid_admin_ctx, meseid_system_ctx;
EOSQL

echo ">> [Meseid] Cluster initialization complete."
