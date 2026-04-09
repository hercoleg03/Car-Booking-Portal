-- Migration: Add manutenzioni table for vehicle maintenance tracking
CREATE TABLE IF NOT EXISTS manutenzioni (
  id SERIAL PRIMARY KEY,
  vettura_id INTEGER NOT NULL REFERENCES vetture(id),
  tipo TEXT NOT NULL,
  data TEXT NOT NULL,
  costo NUMERIC(10, 2),
  descrizione TEXT,
  prossima_manutenzione TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
