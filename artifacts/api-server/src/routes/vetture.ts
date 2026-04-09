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
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads", "vetture");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { files: 5, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo file immagine sono ammessi"));
  },
});

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

router.post("/vetture/:id/foto", upload.array("foto", 5), async (req, res): Promise<void> => {
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

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: "Nessun file caricato" });
    return;
  }

  const nuoveFoto = files.map(f => `/api/uploads/vetture/${f.filename}`);
  const fotoPrecedenti = (vettura.foto as string[]) ?? [];
  const fotoAggiornate = [...fotoPrecedenti, ...nuoveFoto];

  const [updated] = await db
    .update(vettureTable)
    .set({ foto: fotoAggiornate })
    .where(eq(vettureTable.id, params.data.id))
    .returning();

  res.json({
    foto: updated.foto,
    message: `${files.length} foto caricate con successo`,
  });
});

router.delete("/vetture/:id/foto/:index", async (req, res): Promise<void> => {
  const params = GetVetturaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0) {
    res.status(400).json({ error: "Indice foto non valido" });
    return;
  }

  const [vettura] = await db.select().from(vettureTable).where(eq(vettureTable.id, params.data.id));
  if (!vettura) {
    res.status(404).json({ error: "Vettura non trovata" });
    return;
  }

  const foto = (vettura.foto as string[]) ?? [];
  if (index >= foto.length) {
    res.status(400).json({ error: "Indice foto fuori range" });
    return;
  }

  const fotoUrl = foto[index];
  const filename = path.basename(fotoUrl);
  const filePath = path.join(uploadsDir, filename);
  try { fs.unlinkSync(filePath); } catch { /* ignore if not found */ }

  const nuoveFoto = foto.filter((_, i) => i !== index);
  await db.update(vettureTable).set({ foto: nuoveFoto }).where(eq(vettureTable.id, params.data.id));

  res.json({ foto: nuoveFoto });
});

export default router;
