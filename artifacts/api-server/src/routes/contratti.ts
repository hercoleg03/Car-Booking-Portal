import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, contrattiTable, vettureTable, clientiTable } from "@workspace/db";
import {
  ListContrattiQueryParams,
  ListContrattiResponse,
  CreateContrattoBody,
  GetContrattoParams,
  GetContrattoResponse,
  UpdateContrattoParams,
  UpdateContrattoBody,
  UpdateContrattoResponse,
  DeleteContrattoParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const withJoin = () =>
  db
    .select({
      id: contrattiTable.id,
      vetturaId: contrattiTable.vetturaId,
      clienteId: contrattiTable.clienteId,
      nomeLibero: contrattiTable.nomeLibero,
      cognomeLibero: contrattiTable.cognomeLibero,
      numero: contrattiTable.numero,
      tipo: contrattiTable.tipo,
      dataContratto: contrattiTable.dataContratto,
      dataInizio: contrattiTable.dataInizio,
      dataFine: contrattiTable.dataFine,
      stato: contrattiTable.stato,
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
    .leftJoin(clientiTable, eq(contrattiTable.clienteId, clientiTable.id));

const mapContratto = (c: Awaited<ReturnType<typeof withJoin>>[0]) => ({
  ...c,
  importo: c.importo ? parseFloat(c.importo) : null,
  vettura: c.vettura ? { ...c.vettura, prezzo: c.vettura.prezzo ? parseFloat(c.vettura.prezzo) : null } : c.vettura,
  cliente: c.cliente ?? { id: null, nome: c.nomeLibero ?? "", cognome: c.cognomeLibero ?? "", email: null, telefono: null, codiceFiscale: null, indirizzo: null, note: null, createdAt: new Date(), updatedAt: new Date() },
});

router.get("/contratti", async (req, res): Promise<void> => {
  const parsed = ListContrattiQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { vetturaId, clienteId, archiviato } = parsed.data;

  const conditions: SQL[] = [];
  if (vetturaId) conditions.push(eq(contrattiTable.vetturaId, vetturaId));
  if (clienteId) conditions.push(eq(contrattiTable.clienteId, clienteId));
  if (archiviato !== null && archiviato !== undefined) {
    conditions.push(eq(contrattiTable.archiviato, archiviato === "true"));
  }

  const contratti = await withJoin()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(contrattiTable.dataContratto);

  res.json(ListContrattiResponse.parse(contratti.map(mapContratto)));
});

router.post("/contratti", async (req, res): Promise<void> => {
  const parsed = CreateContrattoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { importo, ...rest } = parsed.data;
  const [inserted] = await db.insert(contrattiTable).values({
    ...rest,
    clienteId: rest.clienteId ?? null,
    importo: importo != null ? String(importo) : null,
  }).returning();

  const [c] = await withJoin().where(eq(contrattiTable.id, inserted.id));
  res.status(201).json(GetContrattoResponse.parse(mapContratto(c)));
});

router.get("/contratti/:id", async (req, res): Promise<void> => {
  const params = GetContrattoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [c] = await withJoin().where(eq(contrattiTable.id, params.data.id));
  if (!c) {
    res.status(404).json({ error: "Contratto non trovato" });
    return;
  }

  res.json(GetContrattoResponse.parse(mapContratto(c)));
});

router.patch("/contratti/:id", async (req, res): Promise<void> => {
  const params = UpdateContrattoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateContrattoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const { importo, ...rest } = parsed.data;
  Object.entries(rest).forEach(([k, v]) => { if (v !== undefined) updateData[k] = v; });
  if (importo !== null && importo !== undefined) updateData["importo"] = String(importo);
  if (parsed.data.archiviato !== null && parsed.data.archiviato !== undefined) updateData["archiviato"] = parsed.data.archiviato;

  const updated = await db
    .update(contrattiTable)
    .set(updateData)
    .where(eq(contrattiTable.id, params.data.id))
    .returning();

  if (!updated.length) {
    res.status(404).json({ error: "Contratto non trovato" });
    return;
  }

  const [c] = await withJoin().where(eq(contrattiTable.id, params.data.id));
  res.json(UpdateContrattoResponse.parse(mapContratto(c)));
});

router.delete("/contratti/:id", async (req, res): Promise<void> => {
  const params = DeleteContrattoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [c] = await db.delete(contrattiTable).where(eq(contrattiTable.id, params.data.id)).returning();
  if (!c) {
    res.status(404).json({ error: "Contratto non trovato" });
    return;
  }

  res.sendStatus(204);
});

export default router;
