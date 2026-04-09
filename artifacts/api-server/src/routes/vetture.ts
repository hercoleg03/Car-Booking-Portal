import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, vettureTable, prenotazioniTable, contrattiTable, clientiTable } from "@workspace/db";
import {
  ListVettureQueryParams,
  ListVettureResponse,
  CreateVetturaBody,
  GetVetturaParams,
  GetVetturaResponse,
  UpdateVetturaParams,
  UpdateVetturaBody,
  UpdateVetturaResponse,
  DeleteVetturaParams,
  GetVetturaStoricoParams,
  GetVetturaStoricoResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vetture", async (req, res): Promise<void> => {
  const parsed = ListVettureQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { carburante, stato, marca, disponibile } = parsed.data;

  const conditions: SQL[] = [];
  if (carburante) conditions.push(eq(vettureTable.carburante, carburante));
  if (stato) conditions.push(eq(vettureTable.stato, stato));
  if (marca) conditions.push(eq(vettureTable.marca, marca));
  if (disponibile !== null && disponibile !== undefined) {
    conditions.push(eq(vettureTable.disponibile, disponibile === "true"));
  }

  const vetture = await db
    .select()
    .from(vettureTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(vettureTable.marca);

  res.json(ListVettureResponse.parse(vetture.map(v => ({
    ...v,
    prezzo: v.prezzo ? parseFloat(v.prezzo) : null,
  }))));
});

router.post("/vetture", async (req, res): Promise<void> => {
  const parsed = CreateVetturaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { prezzo, ...rest } = parsed.data;
  const [vettura] = await db.insert(vettureTable).values({
    ...rest,
    prezzo: prezzo != null ? String(prezzo) : null,
  }).returning();

  res.status(201).json(GetVetturaResponse.parse({
    ...vettura,
    prezzo: vettura.prezzo ? parseFloat(vettura.prezzo) : null,
  }));
});

router.get("/vetture/:id", async (req, res): Promise<void> => {
  const params = GetVetturaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vettura] = await db.select().from(vettureTable).where(eq(vettureTable.id, params.data.id));
  if (!vettura) {
    res.status(404).json({ error: "Vettura non trovata" });
    return;
  }

  res.json(GetVetturaResponse.parse({
    ...vettura,
    prezzo: vettura.prezzo ? parseFloat(vettura.prezzo) : null,
  }));
});

router.patch("/vetture/:id", async (req, res): Promise<void> => {
  const params = UpdateVetturaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateVetturaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const { prezzo, ...rest } = parsed.data;
  Object.entries(rest).forEach(([k, v]) => { if (v !== null && v !== undefined) updateData[k] = v; });
  if (prezzo !== null && prezzo !== undefined) updateData["prezzo"] = String(prezzo);

  const [vettura] = await db
    .update(vettureTable)
    .set(updateData)
    .where(eq(vettureTable.id, params.data.id))
    .returning();

  if (!vettura) {
    res.status(404).json({ error: "Vettura non trovata" });
    return;
  }

  res.json(UpdateVetturaResponse.parse({
    ...vettura,
    prezzo: vettura.prezzo ? parseFloat(vettura.prezzo) : null,
  }));
});

router.delete("/vetture/:id", async (req, res): Promise<void> => {
  const params = DeleteVetturaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vettura] = await db.delete(vettureTable).where(eq(vettureTable.id, params.data.id)).returning();
  if (!vettura) {
    res.status(404).json({ error: "Vettura non trovata" });
    return;
  }

  res.sendStatus(204);
});

router.get("/vetture/:id/storico", async (req, res): Promise<void> => {
  const params = GetVetturaStoricoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vettura] = await db.select().from(vettureTable).where(eq(vettureTable.id, params.data.id));
  if (!vettura) {
    res.status(404).json({ error: "Vettura non trovata" });
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
        createdAt: clientiTable.createdAt,
        updatedAt: clientiTable.updatedAt,
      },
    })
    .from(prenotazioniTable)
    .leftJoin(vettureTable, eq(prenotazioniTable.vetturaId, vettureTable.id))
    .leftJoin(clientiTable, eq(prenotazioniTable.clienteId, clientiTable.id))
    .where(eq(prenotazioniTable.vetturaId, params.data.id))
    .orderBy(prenotazioniTable.dataInizio);

  const contratti = await db
    .select({
      id: contrattiTable.id,
      vetturaId: contrattiTable.vetturaId,
      clienteId: contrattiTable.clienteId,
      prenotazioneId: contrattiTable.prenotazioneId,
      numero: contrattiTable.numero,
      tipo: contrattiTable.tipo,
      dataContratto: contrattiTable.dataContratto,
      importo: contrattiTable.importo,
      archiviato: contrattiTable.archiviato,
      note: contrattiTable.note,
      createdAt: contrattiTable.createdAt,
      updatedAt: contrattiTable.updatedAt,
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
        createdAt: clientiTable.createdAt,
        updatedAt: clientiTable.updatedAt,
      },
    })
    .from(contrattiTable)
    .leftJoin(vettureTable, eq(contrattiTable.vetturaId, vettureTable.id))
    .leftJoin(clientiTable, eq(contrattiTable.clienteId, clientiTable.id))
    .where(eq(contrattiTable.vetturaId, params.data.id))
    .orderBy(contrattiTable.dataContratto);

  res.json(GetVetturaStoricoResponse.parse({
    vettura: { ...vettura, prezzo: vettura.prezzo ? parseFloat(vettura.prezzo) : null },
    prenotazioni: prenotazioni.map(p => ({
      ...p,
      vettura: p.vettura ? { ...p.vettura, prezzo: p.vettura.prezzo ? parseFloat(p.vettura.prezzo) : null } : p.vettura,
      cliente: p.cliente,
    })),
    contratti: contratti.map(c => ({
      ...c,
      importo: c.importo ? parseFloat(c.importo) : null,
      vettura: c.vettura ? { ...c.vettura, prezzo: c.vettura.prezzo ? parseFloat(c.vettura.prezzo) : null } : c.vettura,
      cliente: c.cliente,
    })),
  }));
});

export default router;
