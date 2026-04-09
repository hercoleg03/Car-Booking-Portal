import { Router, type IRouter } from "express";
import { eq, count, and, gte, lte, or, inArray } from "drizzle-orm";
import { db, vettureTable, clientiTable, prenotazioniTable, contrattiTable, manutenzioniTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetPrenotazioniCalendarioQueryParams,
  GetPrenotazioniCalendarioResponse,
  GetFleetStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = todayStr();

  const [totaleVetture] = await db.select({ count: count() }).from(vettureTable);
  const [vettureDisponibili] = await db.select({ count: count() }).from(vettureTable).where(eq(vettureTable.disponibile, true));
  const [totaleClienti] = await db.select({ count: count() }).from(clientiTable);
  const [prenotazioniAttive] = await db.select({ count: count() }).from(prenotazioniTable).where(eq(prenotazioniTable.stato, "attiva"));
  const [vetturePrenotate] = await db.select({ count: count() }).from(prenotazioniTable).where(eq(prenotazioniTable.stato, "in_corso"));
  const [contrattiTotali] = await db.select({ count: count() }).from(contrattiTable);
  const [contrattiArchiviati] = await db.select({ count: count() }).from(contrattiTable).where(eq(contrattiTable.archiviato, true));
  const [contrattiAttivi] = await db.select({ count: count() }).from(contrattiTable).where(eq(contrattiTable.archiviato, false));

  const now = new Date();
  const primoMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoGiorno = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ultimoMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(ultimoGiorno.getDate()).padStart(2, "0")}`;
  const [prenotazioniMese] = await db
    .select({ count: count() })
    .from(prenotazioniTable)
    .where(and(gte(prenotazioniTable.dataInizio, primoMese), lte(prenotazioniTable.dataFine, ultimoMese)));

  const [vettureInRientroOggi] = await db
    .select({ count: count() })
    .from(prenotazioniTable)
    .where(and(
      eq(prenotazioniTable.dataFine, today),
      or(eq(prenotazioniTable.stato, "in_corso"), eq(prenotazioniTable.stato, "attiva"))
    ));

  const [prenotazioniInizioOggi] = await db
    .select({ count: count() })
    .from(prenotazioniTable)
    .where(and(
      eq(prenotazioniTable.dataInizio, today),
      or(eq(prenotazioniTable.stato, "attiva"), eq(prenotazioniTable.stato, "in_corso"))
    ));

  const carburanteRows = await db
    .select({ carburante: vettureTable.carburante, count: count() })
    .from(vettureTable)
    .groupBy(vettureTable.carburante);

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
    contrattiAttivi: contrattiAttivi.count,
    vettureInRientroOggi: vettureInRientroOggi.count,
    prenotazioniInizioOggi: prenotazioniInizioOggi.count,
    ripartizioneCarburante: carburanteRows.map(r => ({ carburante: r.carburante, count: r.count })),
    ripartizioneStato: statoRows.map(r => ({ stato: r.stato, count: r.count })),
  }));
});

router.get("/dashboard/fleet-status", async (_req, res): Promise<void> => {
  const today = todayStr();

  const vetture = await db.select().from(vettureTable).orderBy(vettureTable.marca, vettureTable.modello);

  const prenotazioniAttive = await db
    .select({
      id: prenotazioniTable.id,
      vetturaId: prenotazioniTable.vetturaId,
      stato: prenotazioniTable.stato,
      dataInizio: prenotazioniTable.dataInizio,
      dataFine: prenotazioniTable.dataFine,
      clienteId: prenotazioniTable.clienteId,
      nomeCliente: clientiTable.nome,
      cognomeCliente: clientiTable.cognome,
    })
    .from(prenotazioniTable)
    .leftJoin(clientiTable, eq(prenotazioniTable.clienteId, clientiTable.id))
    .where(
      and(
        inArray(prenotazioniTable.stato, ["in_corso", "attiva"]),
        lte(prenotazioniTable.dataInizio, today),
        gte(prenotazioniTable.dataFine, today)
      )
    );

  const futurePrenotazioni = await db
    .select({
      vetturaId: prenotazioniTable.vetturaId,
      stato: prenotazioniTable.stato,
      dataInizio: prenotazioniTable.dataInizio,
      dataFine: prenotazioniTable.dataFine,
      id: prenotazioniTable.id,
      nomeCliente: clientiTable.nome,
      cognomeCliente: clientiTable.cognome,
    })
    .from(prenotazioniTable)
    .leftJoin(clientiTable, eq(prenotazioniTable.clienteId, clientiTable.id))
    .where(
      and(
        eq(prenotazioniTable.stato, "attiva"),
        gte(prenotazioniTable.dataInizio, today)
      )
    )
    .orderBy(prenotazioniTable.dataInizio);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 14);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];
  const manutenzioniProssime = await db
    .select({ vetturaId: manutenzioniTable.vetturaId, data: manutenzioniTable.data, tipo: manutenzioniTable.tipo })
    .from(manutenzioniTable)
    .where(and(gte(manutenzioniTable.data, today), lte(manutenzioniTable.data, nextWeekStr)));

  const prenotazioniByVettura = new Map<number, typeof prenotazioniAttive[0]>();
  for (const p of prenotazioniAttive) {
    if (p.vetturaId && !prenotazioniByVettura.has(p.vetturaId)) {
      prenotazioniByVettura.set(p.vetturaId, p);
    }
  }

  const futureByVettura = new Map<number, typeof futurePrenotazioni[0]>();
  for (const p of futurePrenotazioni) {
    if (p.vetturaId && !futureByVettura.has(p.vetturaId)) {
      futureByVettura.set(p.vetturaId, p);
    }
  }

  const manutenzioniByVettura = new Map<number, typeof manutenzioniProssime[0]>();
  for (const m of manutenzioniProssime) {
    if (!manutenzioniByVettura.has(m.vetturaId)) {
      manutenzioniByVettura.set(m.vetturaId, m);
    }
  }

  const result = vetture.map(v => {
    const attiva = prenotazioniByVettura.get(v.id);
    const futura = futureByVettura.get(v.id);
    const manutenzione = manutenzioniByVettura.get(v.id);

    let statoOperativo = "disponibile";
    let clienteNome: string | null = null;
    let dataFine: string | null = null;
    let dataInizio: string | null = null;
    let prenotazioneId: number | null = null;

    if (attiva) {
      statoOperativo = attiva.stato === "in_corso" ? "noleggiata" : "prenotata";
      clienteNome = `${attiva.nomeCliente ?? ""} ${attiva.cognomeCliente ?? ""}`.trim() || null;
      dataFine = attiva.dataFine;
      dataInizio = attiva.dataInizio;
      prenotazioneId = attiva.id;
    } else if (futura) {
      statoOperativo = "prenotata";
      clienteNome = `${futura.nomeCliente ?? ""} ${futura.cognomeCliente ?? ""}`.trim() || null;
      dataFine = futura.dataFine;
      dataInizio = futura.dataInizio;
      prenotazioneId = futura.id;
    } else if (manutenzione) {
      statoOperativo = "manutenzione";
      dataInizio = manutenzione.data;
    }

    return {
      id: v.id,
      marca: v.marca,
      modello: v.modello,
      targa: v.targa,
      colore: v.colore ?? null,
      statoOperativo,
      clienteNome,
      dataFine,
      dataInizio,
      prenotazioneId,
    };
  });

  res.json(GetFleetStatusResponse.parse(result));
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
