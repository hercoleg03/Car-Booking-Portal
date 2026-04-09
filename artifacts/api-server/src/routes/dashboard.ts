import { Router, type IRouter } from "express";
import { eq, count, and, gte, lte } from "drizzle-orm";
import { db, vettureTable, clientiTable, prenotazioniTable, contrattiTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetPrenotazioniCalendarioQueryParams,
  GetPrenotazioniCalendarioResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [totaleVetture] = await db.select({ count: count() }).from(vettureTable);
  const [vettureDisponibili] = await db.select({ count: count() }).from(vettureTable).where(eq(vettureTable.disponibile, true));
  const [totaleClienti] = await db.select({ count: count() }).from(clientiTable);
  const [prenotazioniAttive] = await db.select({ count: count() }).from(prenotazioniTable).where(eq(prenotazioniTable.stato, "attiva"));
  const [vetturePrenotate] = await db.select({ count: count() }).from(prenotazioniTable).where(eq(prenotazioniTable.stato, "in_corso"));
  const [contrattiTotali] = await db.select({ count: count() }).from(contrattiTable);
  const [contrattiArchiviati] = await db.select({ count: count() }).from(contrattiTable).where(eq(contrattiTable.archiviato, true));

  const now = new Date();
  const primoMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoGiorno = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ultimoMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(ultimoGiorno.getDate()).padStart(2, "0")}`;
  const [prenotazioniMese] = await db
    .select({ count: count() })
    .from(prenotazioniTable)
    .where(and(gte(prenotazioniTable.dataInizio, primoMese), lte(prenotazioniTable.dataFine, ultimoMese)));

  // Ripartizione per carburante
  const carburanteRows = await db
    .select({ carburante: vettureTable.carburante, count: count() })
    .from(vettureTable)
    .groupBy(vettureTable.carburante);

  // Ripartizione per stato
  const statoRows = await db
    .select({ stato: vettureTable.stato, count: count() })
    .from(vettureTable)
    .groupBy(vettureTable.stato);

  res.json(GetDashboardStatsResponse.parse({
    totaleVetture: totaleVetture.count,
    vettureDisponibili: vettureDisponibili.count,
    vetturePrenotate: vetturePrenotate.count,
    totaleClienti: totaleClienti.count,
    prenotazioniAttive: prenotazioniAttive.count,
    prenotazioniMese: prenotazioniMese.count,
    contrattiTotali: contrattiTotali.count,
    contrattiArchiviati: contrattiArchiviati.count,
    ripartizioneCarburante: carburanteRows.map(r => ({ carburante: r.carburante, count: r.count })),
    ripartizioneStato: statoRows.map(r => ({ stato: r.stato, count: r.count })),
  }));
});

router.get("/dashboard/prenotazioni-calendario", async (req, res): Promise<void> => {
  const parsed = GetPrenotazioniCalendarioQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date();
  const anno = parsed.data.anno ?? now.getFullYear();
  const mese = parsed.data.mese ?? (now.getMonth() + 1);

  const primoGiorno = `${anno}-${String(mese).padStart(2, "0")}-01`;
  const ultimoGiorno = new Date(anno, mese, 0);
  const ultimoGiornoStr = `${anno}-${String(mese).padStart(2, "0")}-${String(ultimoGiorno.getDate()).padStart(2, "0")}`;

  const prenotazioni = await db
    .select({
      id: prenotazioniTable.id,
      vetturaId: prenotazioniTable.vetturaId,
      clienteId: prenotazioniTable.clienteId,
      dataInizio: prenotazioniTable.dataInizio,
      dataFine: prenotazioniTable.dataFine,
      stato: prenotazioniTable.stato,
      marca: vettureTable.marca,
      modello: vettureTable.modello,
      targa: vettureTable.targa,
      nomeCliente: clientiTable.nome,
      cognomeCliente: clientiTable.cognome,
    })
    .from(prenotazioniTable)
    .leftJoin(vettureTable, eq(prenotazioniTable.vetturaId, vettureTable.id))
    .leftJoin(clientiTable, eq(prenotazioniTable.clienteId, clientiTable.id))
    .where(
      and(
        lte(prenotazioniTable.dataInizio, ultimoGiornoStr),
        gte(prenotazioniTable.dataFine, primoGiorno),
      )
    )
    .orderBy(prenotazioniTable.dataInizio);

  res.json(GetPrenotazioniCalendarioResponse.parse(
    prenotazioni.map(p => ({
      id: p.id,
      vetturaId: p.vetturaId,
      clienteId: p.clienteId,
      dataInizio: p.dataInizio,
      dataFine: p.dataFine,
      stato: p.stato,
      vetturaNome: `${p.marca ?? ""} ${p.modello ?? ""}`.trim(),
      clienteNome: `${p.nomeCliente ?? ""} ${p.cognomeCliente ?? ""}`.trim(),
      targa: p.targa ?? "",
    }))
  ));
});

export default router;
