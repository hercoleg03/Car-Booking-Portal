import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vettureTable } from "./vetture";
import { clientiTable } from "./clienti";
import { prenotazioniTable } from "./prenotazioni";

export const contrattiTable = pgTable("contratti", {
  id: serial("id").primaryKey(),
  vetturaId: integer("vettura_id").notNull().references(() => vettureTable.id),
  clienteId: integer("cliente_id").references(() => clientiTable.id),
  prenotazioneId: integer("prenotazione_id").references(() => prenotazioniTable.id),
  nomeLibero: text("nome_libero"),
  cognomeLibero: text("cognome_libero"),
  numero: text("numero").notNull(),
  tipo: text("tipo").notNull(), // vendita | noleggio | leasing | permuta
  dataContratto: text("data_contratto").notNull(), // YYYY-MM-DD
  importo: numeric("importo", { precision: 10, scale: 2 }),
  archiviato: boolean("archiviato").notNull().default(false),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContrattoSchema = createInsertSchema(contrattiTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContratto = z.infer<typeof insertContrattoSchema>;
export type Contratto = typeof contrattiTable.$inferSelect;
