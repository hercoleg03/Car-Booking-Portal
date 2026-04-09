import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, manutenzioniTable, vettureTable } from "@workspace/db";
import {
  ListManutenzioniQueryParams,
  ListManutenzioniResponse,
  CreateManutenzioneBody,
  GetManutenzioneParams,
  GetManutenzioneResponse,
  UpdateManutenzioneParams,
  UpdateManutenzioneBody,
  UpdateManutenzioneResponse,
  DeleteManutenzioneParams,
  GetVetturaManutenzioniParams,
  GetVetturaManutenzioniResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const withJoin = () =>
  db
    .select({
      id: manutenzioniTable.id,
      vetturaId: manutenzioniTable.vetturaId,
      tipo: manutenzioniTable.tipo,
      data: manutenzioniTable.data,
      costo: manutenzioniTable.costo,
      descrizione: manutenzioniTable.descrizione,
      prossimaManutenzione: manutenzioniTable.prossimaManutenzione,
      note: manutenzioniTable.note,
      createdAt: manutenzioniTable.createdAt,
      updatedAt: manutenzioniTable.updatedAt,
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
    })
    .from(manutenzioniTable)
    .leftJoin(vettureTable, eq(manutenzioniTable.vetturaId, vettureTable.id));

function mapRow(row: Awaited<ReturnType<typeof withJoin>>[number]) {
  return {
    ...row,
    costo: row.costo ? parseFloat(row.costo) : null,
    vettura: row.vettura
      ? { ...row.vettura, prezzo: row.vettura.prezzo ? parseFloat(row.vettura.prezzo) : null }
      : row.vettura,
  };
}

router.get("/vetture/:id/manutenzioni", async (req, res): Promise<void> => {
  const params = GetVetturaManutenzioniParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vettura] = await db.select().from(vettureTable).where(eq(vettureTable.id, params.data.id));
  if (!vettura) {
    res.status(404).json({ error: "Vettura non trovata" });
    return;
  }

  const rows = await withJoin()
    .where(eq(manutenzioniTable.vetturaId, params.data.id))
    .orderBy(manutenzioniTable.data);

  res.json(GetVetturaManutenzioniResponse.parse(rows.map(mapRow)));
});

router.get("/manutenzioni", async (req, res): Promise<void> => {
  const parsed = ListManutenzioniQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { vetturaId, tipo } = parsed.data;
  const conditions: SQL[] = [];
  if (vetturaId) conditions.push(eq(manutenzioniTable.vetturaId, vetturaId));
  if (tipo) conditions.push(eq(manutenzioniTable.tipo, tipo));

  const rows = await withJoin()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(manutenzioniTable.data);

  res.json(ListManutenzioniResponse.parse(rows.map(mapRow)));
});

router.post("/manutenzioni", async (req, res): Promise<void> => {
  const parsed = CreateManutenzioneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { costo, prossimaManutenzione, data, ...rest } = parsed.data;
  const [row] = await db
    .insert(manutenzioniTable)
    .values({
      ...rest,
      data: data instanceof Date ? data.toISOString().slice(0, 10) : String(data),
      costo: costo != null ? String(costo) : null,
      prossimaManutenzione: prossimaManutenzione instanceof Date
        ? prossimaManutenzione.toISOString().slice(0, 10)
        : (prossimaManutenzione ?? null),
    })
    .returning();

  const [joined] = await withJoin().where(eq(manutenzioniTable.id, row.id));

  res.status(201).json(GetManutenzioneResponse.parse(mapRow(joined)));
});

router.get("/manutenzioni/:id", async (req, res): Promise<void> => {
  const params = GetManutenzioneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await withJoin().where(eq(manutenzioniTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Manutenzione non trovata" });
    return;
  }

  res.json(GetManutenzioneResponse.parse(mapRow(row)));
});

router.patch("/manutenzioni/:id", async (req, res): Promise<void> => {
  const params = UpdateManutenzioneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateManutenzioneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { costo, prossimaManutenzione, data, ...rest } = parsed.data;

  const REQUIRED_FIELDS = new Set(["vetturaId", "tipo"]);
  const updateData: Record<string, unknown> = {};
  Object.entries(rest).forEach(([k, v]) => {
    if (v !== undefined && (v !== null || !REQUIRED_FIELDS.has(k))) {
      updateData[k] = v;
    }
  });
  if (data !== undefined && data !== null) {
    updateData["data"] = data;
  }
  if (costo !== undefined) updateData["costo"] = costo != null ? String(costo) : null;
  if (prossimaManutenzione !== undefined) {
    updateData["prossimaManutenzione"] = prossimaManutenzione ?? null;
  }

  const [updated] = await db
    .update(manutenzioniTable)
    .set(updateData)
    .where(eq(manutenzioniTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Manutenzione non trovata" });
    return;
  }

  const [joined] = await withJoin().where(eq(manutenzioniTable.id, updated.id));
  res.json(UpdateManutenzioneResponse.parse(mapRow(joined)));
});

router.delete("/manutenzioni/:id", async (req, res): Promise<void> => {
  const params = DeleteManutenzioneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(manutenzioniTable)
    .where(eq(manutenzioniTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Manutenzione non trovata" });
    return;
  }

  res.sendStatus(204);
});

export default router;
