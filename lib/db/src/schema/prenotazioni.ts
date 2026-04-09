import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
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

  // --- Tracking rientro / danni ---
  dataRientroEffettiva: text("data_rientro_effettiva"), // YYYY-MM-DD reale
  kmPartenza: integer("km_partenza"),
  kmRientro: integer("km_rientro"),
  danni: text("danni"), // descrizione danni rilevati al rientro

  // --- Sistema prezzi ---
  prezzoGiornaliero: numeric("prezzo_giornaliero", { precision: 10, scale: 2 }),
  kmInclusi: integer("km_inclusi"), // km inclusi nel contratto
  costoExtraKm: numeric("costo_extra_km", { precision: 8, scale: 2 }), // €/km extra
  cauzione: numeric("cauzione", { precision: 10, scale: 2 }),
  sconto: numeric("sconto", { precision: 10, scale: 2 }),
  prezzoTotale: numeric("prezzo_totale", { precision: 10, scale: 2 }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrenotazioneSchema = createInsertSchema(prenotazioniTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrenotazione = z.infer<typeof insertPrenotazioneSchema>;
export type Prenotazione = typeof prenotazioniTable.$inferSelect;
