-- 1) Create login role if it doesn't exist
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dtaas_user') THEN
      CREATE ROLE dtaas_user LOGIN PASSWORD 'dtaas_secret';
   END IF;
END
$$;

-- Ensure the database exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'thingsboard') THEN
      CREATE DATABASE thingsboard OWNER postgres;
   END IF;
END
$$;

-- Allow the user to connect
GRANT CONNECT ON DATABASE thingsboard TO dtaas_user;

-- Switch into the database
\c thingsboard

-- Make dtaas_user the owner of the schema
ALTER SCHEMA public OWNER TO dtaas_user;

-- Grant broad access to schema
GRANT ALL ON SCHEMA public TO dtaas_user;

-- Existing objects (tables/sequences created later will inherit defaults)
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO dtaas_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dtaas_user;

-- Default privileges for newly created objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO dtaas_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO dtaas_user;
