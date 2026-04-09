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
} from "@workspace/api-zod";

const router: IRouter = Router();

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
    .where(eq(prenotazioniTable.clienteId, params.data.id))
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
    .where(eq(contrattiTable.clienteId, params.data.id))
    .orderBy(contrattiTable.dataContratto);

  res.json(GetClienteStoricoResponse.parse({
    cliente,
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
