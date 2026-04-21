-- ============================================================
--  Smartrack — PostgreSQL Init Script
--  Dijalankan sekali saat container postgres pertama kali start
-- ============================================================

-- Aktifkan TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Aktifkan uuid-ossp untuk uuid generation di level DB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tuning performa dasar
ALTER SYSTEM SET shared_preload_libraries    = 'timescaledb';
ALTER SYSTEM SET max_connections             = '200';
ALTER SYSTEM SET shared_buffers              = '256MB';
ALTER SYSTEM SET effective_cache_size        = '1GB';
ALTER SYSTEM SET maintenance_work_mem        = '128MB';
ALTER SYSTEM SET checkpoint_completion_target= '0.9';
ALTER SYSTEM SET wal_buffers                 = '16MB';
ALTER SYSTEM SET default_statistics_target   = '100';
ALTER SYSTEM SET log_min_duration_statement  = '1000'; -- log query > 1 detik

SELECT pg_reload_conf();
