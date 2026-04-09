import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vettureTable = pgTable("vetture", {
  id: serial("id").primaryKey(),
  marca: text("marca").notNull(),
  modello: text("modello").notNull(),
  anno: integer("anno").notNull(),
  targa: text("targa").notNull().unique(),
  carburante: text("carburante").notNull(), // benzina | diesel | elettrica | ibrida | gpl
  stato: text("stato").notNull(), // nuova | usata | km0
  colore: text("colore"),
  prezzo: numeric("prezzo", { precision: 10, scale: 2 }),
  km: integer("km"),
  disponibile: boolean("disponibile").notNull().default(true),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVetturaSchema = createInsertSchema(vettureTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVettura = z.infer<typeof insertVetturaSchema>;
export type Vettura = typeof vettureTable.$inferSelect;
