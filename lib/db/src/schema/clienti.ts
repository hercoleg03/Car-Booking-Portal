import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientiTable = pgTable("clienti", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cognome: text("cognome").notNull(),
  email: text("email"),
  telefono: text("telefono"),
  codiceFiscale: text("codice_fiscale"),
  indirizzo: text("indirizzo"),
  note: text("note"),
  etichetta: text("etichetta"), // affidabile | da_monitorare | problematico | null (auto-calcolata o manuale)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClienteSchema = createInsertSchema(clientiTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientiTable.$inferSelect;
