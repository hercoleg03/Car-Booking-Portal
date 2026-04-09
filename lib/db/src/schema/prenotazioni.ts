import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vettureTable } from "./vetture";
import { clientiTable } from "./clienti";

export const prenotazioniTable = pgTable("prenotazioni", {
  id: serial("id").primaryKey(),
  vetturaId: integer("vettura_id").notNull().references(() => vettureTable.id),
  clienteId: integer("cliente_id").notNull().references(() => clientiTable.id),
  dataInizio: text("data_inizio").notNull(), // YYYY-MM-DD
  dataFine: text("data_fine").notNull(), // YYYY-MM-DD
  stato: text("stato").notNull().default("attiva"), // attiva | completata | annullata | in_corso
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrenotazioneSchema = createInsertSchema(prenotazioniTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrenotazione = z.infer<typeof insertPrenotazioneSchema>;
export type Prenotazione = typeof prenotazioniTable.$inferSelect;
