-- Migration: Add foto column to vetture table
-- Applied via drizzle push; this file documents the schema change
ALTER TABLE vetture ADD COLUMN IF NOT EXISTS foto json DEFAULT '[]'::json;
