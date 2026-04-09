import { Router, type IRouter } from "express";
import { eq, or, ilike, type SQL } from "drizzle-orm";
import { db, clientiTable, prenotazioniTable, contrattiTable, vettureTable } from "@workspace/db";
import {
  ListClientiQueryParams,
  ListClientiResponse,
  CreateClienteBody,
  GetClienteParams,
  GetClienteResponse,
  UpdateClienteParams,
  UpdateClienteBody,
  UpdateClienteResponse,
  DeleteClienteParams,
  GetClienteStoricoParams,
  GetClienteStoricoResponse,
  GetClienteProfiloParams,
  GetClienteProfiloResponse,
  UpdateClienteEtichettaParams,
  UpdateClienteEtichettaBody,
  UpdateClienteEtichettaResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const parseNum = (v: string | null | undefined) => (v != null ? parseFloat(v) : null);

function calcSuggerimentoEtichetta(ritardi: number, danni: number, annullate: number, totale: number): string | null {
  const tassoAnnullamento = totale > 0 ? annullate / totale : 0;
  if (ritardi >= 3 || danni >= 2 || tassoAnnullamento > 0.3) return "problematico";
  if (ritardi >= 1 || danni >= 1 || tassoAnnullamento > 0.1) return "da_monitorare";
  if (totale > 0) return "affidabile";
  return null;
}

router.get("/clienti", async (req, res): Promise<void> => {
  const parsed = ListClientiQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search } = parsed.data;

  let clienti;
  if (search) {
    const pattern = `%${search}%`;
    clienti = await db
      .select()
      .from(clientiTable)
      .where(
        or(
          ilike(clientiTable.nome, pattern),
          ilike(clientiTable.cognome, pattern),
          ilike(clientiTable.email, pattern),
          ilike(clientiTable.telefono, pattern),
          ilike(clientiTable.codiceFiscale, pattern),
        ) as SQL
      )
      .orderBy(clientiTable.cognome);
  } else {
    clienti = await db.select().from(clientiTable).orderBy(clientiTable.cognome);
  }

  res.json(ListClientiResponse.parse(clienti));
});

router.post("/clienti", async (req, res): Promise<void> => {
  const parsed = CreateClienteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cliente] = await db.insert(clientiTable).values(parsed.data).returning();
  res.status(201).json(GetClienteResponse.parse(cliente));
});

router.get("/clienti/:id", async (req, res): Promise<void> => {
  const params = GetClienteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cliente] = await db.select().from(clientiTable).where(eq(clientiTable.id, params.data.id));
  if (!cliente) {
    res.status(404).json({ error: "Cliente non trovato" });
    return;
  }

  res.json(GetClienteResponse.parse(cliente));
});

router.patch("/clienti/:id", async (req, res): Promise<void> => {
  const params = UpdateClienteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClienteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  Object.entries(parsed.data).forEach(([k, v]) => { if (v !== null && v !== undefined) updateData[k] = v; });

  const [cliente] = await db
    .update(clientiTable)
    .set(updateData)
    .where(eq(clientiTable.id, params.data.id))
    .returning();

  if (!cliente) {
    res.status(404).json({ error: "Cliente non trovato" });
    return;
  }

  res.json(UpdateClienteResponse.parse(cliente));
});

router.delete("/clienti/:id", async (req, res): Promise<void> => {
  const params = DeleteClienteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cliente] = await db.delete(clientiTable).where(eq(clientiTable.id, params.data.id)).returning();
  if (!cliente) {
    res.status(404).json({ error: "Cliente non trovato" });
    return;
  }

  res.sendStatus(204);
});

// ─── Storico (prenotazioni + contratti) ──────────────────────────────────────

router.get("/clienti/:id/storico", async (req, res): Promise<void> => {
  const params = GetClienteStoricoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cliente] = await db.select().from(clientiTable).where(eq(clientiTable.id, params.data.id));
  if (!cliente) {
    res.status(404).json({ error: "Cliente non trovato" });
    return;
  }

  const prenotazioni = await db
    .select({
      id: prenotazioniTable.id,
      vetturaId: prenotazioniTable.vetturaId,
      clienteId: prenotazioniTable.clienteId,
      dataInizio: prenotazioniTable.dataInizio,
      dataFine: prenotazioniTable.dataFine,
      stato: prenotazioniTable.stato,
      note: prenotazioniTable.note,
      dataRientroEffettiva: prenotazioniTable.dataRientroEffettiva,
      kmPartenza: prenotazioniTable.kmPartenza,
      kmRientro: prenotazioniTable.kmRientro,
      danni: prenotazioniTable.danni,
      prezzoGiornaliero: prenotazioniTable.prezzoGiornaliero,
      kmInclusi: prenotazioniTable.kmInclusi,
      costoExtraKm: prenotazioniTable.costoExtraKm,
      cauzione: prenotazioniTable.cauzione,
      sconto: prenotazioniTable.sconto,
      prezzoTotale: prenotazioniTable.prezzoTotale,
      createdAt: prenotazioniTable.createdAt,
      updatedAt: prenotazioniTable.updatedAt,
      vettura: {
        id: vettureTable.id, marca: vettureTable.marca, modello: vettureTable.modello,
        anno: vettureTable.anno, targa: vettureTable.targa, carburante: vettureTable.carburante,
        stato: vettureTable.stato, colore: vettureTable.colore, prezzo: vettureTable.prezzo,
        km: vettureTable.km, disponibile: vettureTable.disponibile, note: vettureTable.note,
        createdAt: vettureTable.createdAt, updatedAt: vettureTable.updatedAt,
      },
      cliente: {
        id: clientiTable.id, nome: clientiTable.nome, cognome: clientiTable.cognome,
        email: clientiTable.email, telefono: clientiTable.telefono,
        codiceFiscale: clientiTable.codiceFiscale, indirizzo: clientiTable.indirizzo,
        note: clientiTable.note, etichetta: clientiTable.etichetta,
        createdAt: clientiTable.createdAt, updatedAt: clientiTable.updatedAt,
      },
    })
    .from(prenotazioniTable)
    .leftJoin(vettureTable, eq(prenotazioniTable.vetturaId, vettureTable.id))
    .leftJoin(clientiTable, eq(prenotazioniTable.clienteId, clientiTable.id))
    .where(eq(prenotazioniTable.clienteId, params.data.id))
    .orderBy(prenotazioniTable.dataInizio);

  const contratti = await db
    .select({
      id: contrattiTable.id, vetturaId: contrattiTable.vetturaId,
      clienteId: contrattiTable.clienteId, prenotazioneId: contrattiTable.prenotazioneId,
      numero: contrattiTable.numero, tipo: contrattiTable.tipo,
      dataContratto: contrattiTable.dataContratto, importo: contrattiTable.importo,
      archiviato: contrattiTable.archiviato, note: contrattiTable.note,
      createdAt: contrattiTable.createdAt, updatedAt: contrattiTable.updatedAt,
      vettura: {
        id: vettureTable.id, marca: vettureTable.marca, modello: vettureTable.modello,
        anno: vettureTable.anno, targa: vettureTable.targa, carburante: vettureTable.carburante,
        stato: vettureTable.stato, colore: vettureTable.colore, prezzo: vettureTable.prezzo,
        km: vettureTable.km, disponibile: vettureTable.disponibile, note: vettureTable.note,
        createdAt: vettureTable.createdAt, updatedAt: vettureTable.updatedAt,
      },
      cliente: {
        id: clientiTable.id, nome: clientiTable.nome, cognome: clientiTable.cognome,
        email: clientiTable.email, telefono: clientiTable.telefono,
        codiceFiscale: clientiTable.codiceFiscale, indirizzo: clientiTable.indirizzo,
        note: clientiTable.note, etichetta: clientiTable.etichetta,
        createdAt: clientiTable.createdAt, updatedAt: clientiTable.updatedAt,
      },
    })
    .from(contrattiTable)
    .leftJoin(vettureTable, eq(contrattiTable.vetturaId, vettureTable.id))
    .leftJoin(clientiTable, eq(contrattiTable.clienteId, clientiTable.id))
    .where(eq(contrattiTable.clienteId, params.data.id))
    .orderBy(contrattiTable.dataContratto);

  res.json(GetClienteStoricoResponse.parse({
    cliente,
    prenotazioni: prenotazioni.map(p => ({
      ...p,
      prezzoGiornaliero: parseNum(p.prezzoGiornaliero),
      costoExtraKm: parseNum(p.costoExtraKm),
      cauzione: parseNum(p.cauzione),
      sconto: parseNum(p.sconto),
      prezzoTotale: parseNum(p.prezzoTotale),
      vettura: p.vettura ? { ...p.vettura, prezzo: parseNum(p.vettura.prezzo) } : p.vettura,
      cliente: p.cliente,
    })),
    contratti: contratti.map(c => ({
      ...c,
      importo: parseNum(c.importo),
      vettura: c.vettura ? { ...c.vettura, prezzo: parseNum(c.vettura.prezzo) } : c.vettura,
      cliente: c.cliente,
    })),
  }));
});

// ─── Profilo completo con statistiche ────────────────────────────────────────

router.get("/clienti/:id/profilo", async (req, res): Promise<void> => {
  const params = GetClienteProfiloParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cliente] = await db.select().from(clientiTable).where(eq(clientiTable.id, params.data.id));
  if (!cliente) {
    res.status(404).json({ error: "Cliente non trovato" });
    return;
  }

  const prenotazioni = await db
    .select({
      id: prenotazioniTable.id,
      vetturaId: prenotazioniTable.vetturaId,
      clienteId: prenotazioniTable.clienteId,
      dataInizio: prenotazioniTable.dataInizio,
      dataFine: prenotazioniTable.dataFine,
      stato: prenotazioniTable.stato,
      note: prenotazioniTable.note,
      dataRientroEffettiva: prenotazioniTable.dataRientroEffettiva,
      kmPartenza: prenotazioniTable.kmPartenza,
      kmRientro: prenotazioniTable.kmRientro,
      danni: prenotazioniTable.danni,
      prezzoGiornaliero: prenotazioniTable.prezzoGiornaliero,
      kmInclusi: prenotazioniTable.kmInclusi,
      costoExtraKm: prenotazioniTable.costoExtraKm,
      cauzione: prenotazioniTable.cauzione,
      sconto: prenotazioniTable.sconto,
      prezzoTotale: prenotazioniTable.prezzoTotale,
      createdAt: prenotazioniTable.createdAt,
      updatedAt: prenotazioniTable.updatedAt,
      vettura: {
        id: vettureTable.id, marca: vettureTable.marca, modello: vettureTable.modello,
        anno: vettureTable.anno, targa: vettureTable.targa, carburante: vettureTable.carburante,
        stato: vettureTable.stato, colore: vettureTable.colore, prezzo: vettureTable.prezzo,
        km: vettureTable.km, disponibile: vettureTable.disponibile, note: vettureTable.note,
        createdAt: vettureTable.createdAt, updatedAt: vettureTable.updatedAt,
      },
      cliente: {
        id: clientiTable.id, nome: clientiTable.nome, cognome: clientiTable.cognome,
        email: clientiTable.email, telefono: clientiTable.telefono,
        codiceFiscale: clientiTable.codiceFiscale, indirizzo: clientiTable.indirizzo,
        note: clientiTable.note, etichetta: clientiTable.etichetta,
        createdAt: clientiTable.createdAt, updatedAt: clientiTable.updatedAt,
      },
    })
    .from(prenotazioniTable)
    .leftJoin(vettureTable, eq(prenotazioniTable.vetturaId, vettureTable.id))
    .leftJoin(clientiTable, eq(prenotazioniTable.clienteId, clientiTable.id))
    .where(eq(prenotazioniTable.clienteId, params.data.id))
    .orderBy(prenotazioniTable.dataInizio);

  const contratti = await db
    .select({
      id: contrattiTable.id, vetturaId: contrattiTable.vetturaId,
      clienteId: contrattiTable.clienteId, prenotazioneId: contrattiTable.prenotazioneId,
      numero: contrattiTable.numero, tipo: contrattiTable.tipo,
      dataContratto: contrattiTable.dataContratto, importo: contrattiTable.importo,
      archiviato: contrattiTable.archiviato, note: contrattiTable.note,
      createdAt: contrattiTable.createdAt, updatedAt: contrattiTable.updatedAt,
      vettura: {
        id: vettureTable.id, marca: vettureTable.marca, modello: vettureTable.modello,
        anno: vettureTable.anno, targa: vettureTable.targa, carburante: vettureTable.carburante,
        stato: vettureTable.stato, colore: vettureTable.colore, prezzo: vettureTable.prezzo,
        km: vettureTable.km, disponibile: vettureTable.disponibile, note: vettureTable.note,
        createdAt: vettureTable.createdAt, updatedAt: vettureTable.updatedAt,
      },
      cliente: {
        id: clientiTable.id, nome: clientiTable.nome, cognome: clientiTable.cognome,
        email: clientiTable.email, telefono: clientiTable.telefono,
        codiceFiscale: clientiTable.codiceFiscale, indirizzo: clientiTable.indirizzo,
        note: clientiTable.note, etichetta: clientiTable.etichetta,
        createdAt: clientiTable.createdAt, updatedAt: clientiTable.updatedAt,
      },
    })
    .from(contrattiTable)
    .leftJoin(vettureTable, eq(contrattiTable.vetturaId, vettureTable.id))
    .leftJoin(clientiTable, eq(contrattiTable.clienteId, clientiTable.id))
    .where(eq(contrattiTable.clienteId, params.data.id))
    .orderBy(contrattiTable.dataContratto);

  // --- Calcola statistiche ---
  const totalePrenotazioni = prenotazioni.length;
  const completate = prenotazioni.filter(p => p.stato === "completata").length;
  const annullate = prenotazioni.filter(p => p.stato === "annullata").length;
  const inCorso = prenotazioni.filter(p => p.stato === "in_corso").length;
  const attive = prenotazioni.filter(p => p.stato === "attiva").length;

  // Ritardi: rientro effettivo dopo la data fine prevista
  const ritardi = prenotazioni.filter(p => {
    if (!p.dataRientroEffettiva) return false;
    return p.dataRientroEffettiva > p.dataFine;
  }).length;

  // Danni segnalati
  const danniSegnalati = prenotazioni.filter(p => p.danni && p.danni.trim() !== "").length;

  // Totale speso (da prezzoTotale delle prenotazioni o da importo contratti)
  let totaleSpeso = 0;
  prenotazioni.forEach(p => { if (p.prezzoTotale) totaleSpeso += parseFloat(p.prezzoTotale); });
  if (totaleSpeso === 0) {
    contratti.forEach(c => { if (c.importo) totaleSpeso += parseFloat(c.importo); });
  }

  // Media giorni per noleggio
  let totalGiorni = 0;
  let conteggioConGiorni = 0;
  prenotazioni.forEach(p => {
    const inizio = new Date(p.dataInizio);
    const fine = new Date(p.dataFine);
    const giorni = Math.round((fine.getTime() - inizio.getTime()) / (1000 * 60 * 60 * 24));
    if (giorni > 0) { totalGiorni += giorni; conteggioConGiorni++; }
  });
  const mediaGiorni = conteggioConGiorni > 0 ? Math.round((totalGiorni / conteggioConGiorni) * 10) / 10 : 0;

  const suggerimentoEtichetta = calcSuggerimentoEtichetta(ritardi, danniSegnalati, annullate, totalePrenotazioni);

  const mappedPrenotazioni = prenotazioni.map(p => ({
    ...p,
    prezzoGiornaliero: parseNum(p.prezzoGiornaliero),
    costoExtraKm: parseNum(p.costoExtraKm),
    cauzione: parseNum(p.cauzione),
    sconto: parseNum(p.sconto),
    prezzoTotale: parseNum(p.prezzoTotale),
    vettura: p.vettura ? { ...p.vettura, prezzo: parseNum(p.vettura.prezzo) } : p.vettura,
    cliente: p.cliente,
  }));

  const mappedContratti = contratti.map(c => ({
    ...c,
    importo: parseNum(c.importo),
    vettura: c.vettura ? { ...c.vettura, prezzo: parseNum(c.vettura.prezzo) } : c.vettura,
    cliente: c.cliente,
  }));

  res.json(GetClienteProfiloResponse.parse({
    cliente,
    stats: {
      totalePrenotazioni,
      completate,
      annullate,
      inCorso,
      attive,
      ritardi,
      danniSegnalati,
      totaleSpeso,
      mediaGiorni,
      suggerimentoEtichetta,
    },
    prenotazioni: mappedPrenotazioni,
    contratti: mappedContratti,
  }));
});

// ─── Etichetta manuale ────────────────────────────────────────────────────────

router.patch("/clienti/:id/etichetta", async (req, res): Promise<void> => {
  const params = UpdateClienteEtichettaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClienteEtichettaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cliente] = await db
    .update(clientiTable)
    .set({ etichetta: parsed.data.etichetta })
    .where(eq(clientiTable.id, params.data.id))
    .returning();

  if (!cliente) {
    res.status(404).json({ error: "Cliente non trovato" });
    return;
  }

  res.json(UpdateClienteEtichettaResponse.parse(cliente));
});

export default router;
