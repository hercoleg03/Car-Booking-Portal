import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vettureTable } from "./vetture";

export const manutenzioniTable = pgTable("manutenzioni", {
  id: serial("id").primaryKey(),
  vetturaId: integer("vettura_id").notNull().references(() => vettureTable.id),
  tipo: text("tipo").notNull(), // tagliando | revisione | riparazione | carrozzeria | altro
  data: text("data").notNull(), // YYYY-MM-DD
  costo: numeric("costo", { precision: 10, scale: 2 }),
  descrizione: text("descrizione"),
  prossimaManutenzione: text("prossima_manutenzione"), // YYYY-MM-DD
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertManutenzioneSchema = createInsertSchema(manutenzioniTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertManutenzione = z.infer<typeof insertManutenzioneSchema>;
export type Manutenzione = typeof manutenzioniTable.$inferSelect;
