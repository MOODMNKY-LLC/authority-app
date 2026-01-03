-- Enable all required PostgreSQL extensions for Authority app
-- This ensures consistent extension availability across all environments

-- UUID generation (already enabled via 017, but ensuring it's here)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector similarity search for AI/ML features
CREATE EXTENSION IF NOT EXISTS vector;

-- Full-text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Additional useful extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";




