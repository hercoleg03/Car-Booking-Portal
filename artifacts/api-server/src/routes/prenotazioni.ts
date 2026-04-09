import { Router, type IRouter } from "express";
import { eq, and, gte, lte, type SQL } from "drizzle-orm";
import { db, prenotazioniTable, vettureTable, clientiTable } from "@workspace/db";
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
  cliente: p.cliente,
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

  const updateData: Record<string, unknown> = {};
  Object.entries(parsed.data).forEach(([k, v]) => {
    if (v !== null && v !== undefined) updateData[k] = v;
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
