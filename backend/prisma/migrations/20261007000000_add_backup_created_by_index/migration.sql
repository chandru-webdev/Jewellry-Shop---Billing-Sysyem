-- This index was in schema.prisma but was never created: ensureSchema syncs
-- tables and columns only, not indexes, so the database had drifted by exactly
-- one index. IF NOT EXISTS keeps it safe on environments where a prior
-- `prisma db push` already made it.
CREATE INDEX IF NOT EXISTS "Backup_createdById_idx" ON "Backup"("createdById");
