import { Router, type IRouter } from "express";
import { eq, and, gte, lte, type SQL } from "drizzle-orm";
import { db, prenotazioniTable, vettureTable, clientiTable, contrattiTable } from "@workspace/db";
import {
  ListPrenotazioniQueryParams,
  ListPrenotazioniResponse,
  CreatePrenotazioneBody,
  GetPrenotazioneParams,
  GetPrenotazioneResponse,
  UpdatePrenotazioneParams,
  UpdatePrenotazioneBody,
  UpdatePrenotazioneResponse,
  DeletePrenotazioneParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const withJoin = () =>
  db
    .select({
      id: prenotazioniTable.id,
      vetturaId: prenotazioniTable.vetturaId,
      clienteId: prenotazioniTable.clienteId,
      nomeLibero: prenotazioniTable.nomeLibero,
      cognomeLibero: prenotazioniTable.cognomeLibero,
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
        id: vettureTable.id,
        marca: vettureTable.marca,
        modello: vettureTable.modello,
        anno: vettureTable.anno,
        targa: vettureTable.targa,
        carburante: vettureTable.carburante,
        stato: vettureTable.stato,
        colore: vettureTable.colore,
        prezzo: vettureTable.prezzo,
        km: vettureTable.km,
        disponibile: vettureTable.disponibile,
        note: vettureTable.note,
        createdAt: vettureTable.createdAt,
        updatedAt: vettureTable.updatedAt,
      },
      cliente: {
        id: clientiTable.id,
        nome: clientiTable.nome,
        cognome: clientiTable.cognome,
        email: clientiTable.email,
        telefono: clientiTable.telefono,
        codiceFiscale: clientiTable.codiceFiscale,
        indirizzo: clientiTable.indirizzo,
        note: clientiTable.note,
        etichetta: clientiTable.etichetta,
        createdAt: clientiTable.createdAt,
        updatedAt: clientiTable.updatedAt,
      },
    })
    .from(prenotazioniTable)
    .leftJoin(vettureTable, eq(prenotazioniTable.vetturaId, vettureTable.id))
    .leftJoin(clientiTable, eq(prenotazioniTable.clienteId, clientiTable.id));

const parseNum = (v: string | null | undefined) => (v != null ? parseFloat(v) : null);

const mapPrenotazione = (p: Awaited<ReturnType<typeof withJoin>>[0]) => ({
  ...p,
  prezzoGiornaliero: parseNum(p.prezzoGiornaliero),
  costoExtraKm: parseNum(p.costoExtraKm),
  cauzione: parseNum(p.cauzione),
  sconto: parseNum(p.sconto),
  prezzoTotale: parseNum(p.prezzoTotale),
  vettura: p.vettura ? { ...p.vettura, prezzo: parseNum(p.vettura.prezzo) } : p.vettura,
  cliente: p.cliente?.id != null
    ? p.cliente
    : {
        id: null,
        nome: p.nomeLibero ?? "",
        cognome: p.cognomeLibero ?? "",
        email: null,
        telefono: null,
        codiceFiscale: null,
        indirizzo: null,
        note: null,
        etichetta: null,
        createdAt: null,
        updatedAt: null,
      },
});

router.get("/prenotazioni", async (req, res): Promise<void> => {
  const parsed = ListPrenotazioniQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { vetturaId, clienteId, stato, dal, al } = parsed.data;

  const conditions: SQL[] = [];
  if (vetturaId) conditions.push(eq(prenotazioniTable.vetturaId, vetturaId));
  if (clienteId) conditions.push(eq(prenotazioniTable.clienteId, clienteId));
  if (stato) conditions.push(eq(prenotazioniTable.stato, stato));
  if (dal) conditions.push(gte(prenotazioniTable.dataInizio, dal));
  if (al) conditions.push(lte(prenotazioniTable.dataFine, al));

  const prenotazioni = await withJoin()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(prenotazioniTable.dataInizio);

  res.json(ListPrenotazioniResponse.parse(prenotazioni.map(mapPrenotazione)));
});

router.post("/prenotazioni", async (req, res): Promise<void> => {
  const parsed = CreatePrenotazioneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clienteId, nomeLibero, cognomeLibero } = parsed.data;
  const hasCliente = clienteId != null;
  const hasNomeLibero = (nomeLibero ?? "").trim() !== "" || (cognomeLibero ?? "").trim() !== "";
  if (!hasCliente && !hasNomeLibero) {
    res.status(400).json({ error: "Specificare un cliente esistente oppure un nome libero." });
    return;
  }

  const [inserted] = await db.insert(prenotazioniTable).values(parsed.data as never).returning();
  const [p] = await withJoin().where(eq(prenotazioniTable.id, inserted.id));
  res.status(201).json(GetPrenotazioneResponse.parse(mapPrenotazione(p)));
});

router.get("/prenotazioni/:id", async (req, res): Promise<void> => {
  const params = GetPrenotazioneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [p] = await withJoin().where(eq(prenotazioniTable.id, params.data.id));
  if (!p) {
    res.status(404).json({ error: "Prenotazione non trovata" });
    return;
  }

  res.json(GetPrenotazioneResponse.parse(mapPrenotazione(p)));
});

// ── Helpers per cascade date ───────────────────────────────────────────────

/** Sposta una data YYYY-MM-DD di N giorni (positivi o negativi) */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Differenza in giorni interi tra due date YYYY-MM-DD */
function diffDays(a: string, b: string): number {
  const msA = new Date(a + "T00:00:00Z").getTime();
  const msB = new Date(b + "T00:00:00Z").getTime();
  return Math.round((msA - msB) / 86_400_000);
}

router.patch("/prenotazioni/:id", async (req, res): Promise<void> => {
  const params = UpdatePrenotazioneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePrenotazioneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Legge la prenotazione originale per calcolare lo scostamento date
  const [original] = await db
    .select({ dataInizio: prenotazioniTable.dataInizio, dataFine: prenotazioniTable.dataFine })
    .from(prenotazioniTable)
    .where(eq(prenotazioniTable.id, params.data.id));

  if (!original) {
    res.status(404).json({ error: "Prenotazione non trovata" });
    return;
  }

  const NULLABLE_FIELDS = new Set(["clienteId", "nomeLibero", "cognomeLibero"]);
  const updateData: Record<string, unknown> = {};
  Object.entries(parsed.data).forEach(([k, v]) => {
    if (v !== undefined) {
      if (v !== null || NULLABLE_FIELDS.has(k)) {
        updateData[k] = v;
      }
    }
  });

  const updated = await db
    .update(prenotazioniTable)
    .set(updateData)
    .where(eq(prenotazioniTable.id, params.data.id))
    .returning();

  if (!updated.length) {
    res.status(404).json({ error: "Prenotazione non trovata" });
    return;
  }

  // ── Cascata sui contratti collegati ──────────────────────────────────────
  const newInizio = (parsed.data as Record<string, unknown>)["dataInizio"] as string | undefined;
  const newFine   = (parsed.data as Record<string, unknown>)["dataFine"]   as string | undefined;

  if ((newInizio || newFine) && original.dataInizio) {
    // Scostamento in giorni basato sulla dataInizio (o dataFine se solo quella è cambiata)
    const offsetGiorni = newInizio
      ? diffDays(newInizio, original.dataInizio)
      : newFine && original.dataFine
      ? diffDays(newFine, original.dataFine)
      : 0;

    if (offsetGiorni !== 0) {
      // Trova i contratti collegati a questa prenotazione
      const contratti = await db
        .select({ id: contrattiTable.id, dataContratto: contrattiTable.dataContratto })
        .from(contrattiTable)
        .where(eq(contrattiTable.prenotazioneId, params.data.id));

      // Aggiorna la dataContratto di ciascuno con lo stesso offset
      for (const c of contratti) {
        const nuovaData = shiftDate(c.dataContratto, offsetGiorni);
        await db
          .update(contrattiTable)
          .set({ dataContratto: nuovaData })
          .where(eq(contrattiTable.id, c.id));
      }
    }
  }

  const [p] = await withJoin().where(eq(prenotazioniTable.id, params.data.id));
  res.json(UpdatePrenotazioneResponse.parse(mapPrenotazione(p)));
});

router.delete("/prenotazioni/:id", async (req, res): Promise<void> => {
  const params = DeletePrenotazioneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [p] = await db.delete(prenotazioniTable).where(eq(prenotazioniTable.id, params.data.id)).returning();
  if (!p) {
    res.status(404).json({ error: "Prenotazione non trovata" });
    return;
  }

  res.sendStatus(204);
});

export default router;
