-- Wipes all tables and migration history in the public schema.
DROP SCHEMA IF EXISTS "public" CASCADE;
CREATE SCHEMA "public";
GRANT ALL ON SCHEMA "public" TO public;
