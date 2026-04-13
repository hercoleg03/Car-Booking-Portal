import { useState } from "react";
import { FileDown, RefreshCw, User, Car, CreditCard, Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListVetture } from "@workspace/api-client-react";
import { useListClienti } from "@workspace/api-client-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VenditoreInfo {
  ragioneSociale: string;
  indirizzo: string;
  citta: string;
  cap: string;
  piva: string;
  telefono: string;
  email: string;
}

interface AcquirenteInfo {
  nome: string;
  cognome: string;
  codiceFiscale: string;
  indirizzo: string;
  citta: string;
  cap: string;
  telefono: string;
  email: string;
}

interface VeicoloInfo {
  marca: string;
  modello: string;
  anno: string;
  targa: string;
  colore: string;
  km: string;
  numeroTelaio: string;
  carburante: string;
  stato: string;
}

interface PagamentoInfo {
  prezzoVendita: string;
  acconto: string;
  modalitaPagamento: string;
  dataVendita: string;
  luogoVendita: string;
  note: string;
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
        <span className="text-indigo-500">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2 lg:col-span-3" : ""}>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultVenditore: VenditoreInfo = {
  ragioneSociale: "",
  indirizzo: "",
  citta: "",
  cap: "",
  piva: "",
  telefono: "",
  email: "",
};

const defaultAcquirente: AcquirenteInfo = {
  nome: "",
  cognome: "",
  codiceFiscale: "",
  indirizzo: "",
  citta: "",
  cap: "",
  telefono: "",
  email: "",
};

const defaultVeicolo: VeicoloInfo = {
  marca: "",
  modello: "",
  anno: "",
  targa: "",
  colore: "",
  km: "",
  numeroTelaio: "",
  carburante: "",
  stato: "",
};

const defaultPagamento: PagamentoInfo = {
  prezzoVendita: "",
  acconto: "",
  modalitaPagamento: "Bonifico bancario",
  dataVendita: new Date().toISOString().split("T")[0],
  luogoVendita: "",
  note: "",
};

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generaPDF(
  venditore: VenditoreInfo,
  acquirente: AcquirenteInfo,
  veicolo: VeicoloInfo,
  pagamento: PagamentoInfo,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const marginL = 20;
  const marginR = 190;
  const colMid = 105;

  // ── Header ──
  doc.setFillColor(15, 23, 41);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATTO DI VENDITA VEICOLO", 105, 13, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 220);
  doc.text(`Data: ${formatDate(pagamento.dataVendita)}   |   Luogo: ${pagamento.luogoVendita || "—"}`, 105, 22, { align: "center" });
  doc.setTextColor(0, 0, 0);

  let y = 42;

  // ── Numero documento / data ──
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Documento generato il ${new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}`, marginL, y);
  doc.setTextColor(0, 0, 0);

  y += 8;

  // ── Venditore + Acquirente affiancati ──
  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: 20 },
    tableWidth: "auto",
    body: [
      [
        {
          content: "VENDITORE",
          styles: { fontStyle: "bold", fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 8 },
        },
        {
          content: "ACQUIRENTE",
          styles: { fontStyle: "bold", fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 8 },
        },
      ],
      [
        formatPersona(venditore),
        formatAcquirente(acquirente),
      ],
    ],
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 85 },
    },
    styles: { fontSize: 8.5, cellPadding: 4, valign: "top", lineColor: [220, 220, 230], lineWidth: 0.3 },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Veicolo ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(79, 70, 229);
  doc.setTextColor(255, 255, 255);
  doc.rect(marginL, y, marginR - marginL, 6.5, "F");
  doc.text("DATI DEL VEICOLO", marginL + 3, y + 4.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += 8;

  const veicoloRows = [
    ["Marca", veicolo.marca || "—", "Modello", veicolo.modello || "—"],
    ["Anno", veicolo.anno || "—", "Targa", veicolo.targa || "—"],
    ["Colore", veicolo.colore || "—", "Carburante", veicolo.carburante || "—"],
    ["Km percorsi", veicolo.km ? Number(veicolo.km).toLocaleString("it-IT") + " km" : "—", "Stato", veicolo.stato || "—"],
    ["N. Telaio", veicolo.numeroTelaio || "—", "", ""],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: 20 },
    body: veicoloRows,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 250], fontSize: 8 },
      1: { cellWidth: 50, fontSize: 8.5 },
      2: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 250], fontSize: 8 },
      3: { cellWidth: 50, fontSize: 8.5 },
    },
    styles: { cellPadding: 3, lineColor: [220, 220, 230], lineWidth: 0.3 },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Condizioni economiche ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(79, 70, 229);
  doc.setTextColor(255, 255, 255);
  doc.rect(marginL, y, marginR - marginL, 6.5, "F");
  doc.text("CONDIZIONI ECONOMICHE", marginL + 3, y + 4.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += 8;

  const saldo = calcSaldo(pagamento.prezzoVendita, pagamento.acconto);

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: 20 },
    body: [
      ["Prezzo di vendita concordato", formatEuro(pagamento.prezzoVendita)],
      ["Acconto versato", formatEuro(pagamento.acconto)],
      ["Saldo da versare", saldo],
      ["Modalità di pagamento", pagamento.modalitaPagamento || "—"],
    ],
    columnStyles: {
      0: { cellWidth: 100, fontStyle: "bold", fillColor: [245, 245, 250], fontSize: 8 },
      1: { cellWidth: 70, fontSize: 9 },
    },
    styles: { cellPadding: 3.5, lineColor: [220, 220, 230], lineWidth: 0.3 },
    theme: "grid",
    didParseCell: (data) => {
      if (data.row.index === 2 && data.column.index === 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [79, 70, 229];
        data.cell.styles.fontSize = 10;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Note ──
  if (pagamento.note.trim()) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.rect(marginL, y, marginR - marginL, 6.5, "F");
    doc.text("NOTE", marginL + 3, y + 4.5);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 8;

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: 20 },
      body: [[pagamento.note]],
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: [220, 220, 230], lineWidth: 0.3 },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Clausola legale ──
  y += 4;
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "italic");
  const clausola = "Le parti dichiarano che il veicolo oggetto del presente contratto viene venduto nello stato di fatto e di diritto in cui si trova. Il venditore dichiara che il veicolo è di sua piena proprietà, libero da ipoteche, pesi e gravami di qualsiasi natura. L'acquirente dichiara di aver preso visione del veicolo e di accettarlo nelle condizioni descritte.";
  const lines = doc.splitTextToSize(clausola, marginR - marginL);
  doc.text(lines, marginL, y);
  y += lines.length * 4 + 10;

  // ── Firme ──
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  const col1 = marginL;
  const col2 = colMid + 5;
  const lineY = y + 14;

  doc.text("Firma del Venditore", col1, y);
  doc.text("Firma dell'Acquirente", col2, y);
  doc.setDrawColor(80, 80, 80);
  doc.line(col1, lineY, col1 + 70, lineY);
  doc.line(col2, lineY, col2 + 70, lineY);

  if (venditore.ragioneSociale) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(venditore.ragioneSociale, col1, lineY + 4);
  }
  if (acquirente.nome || acquirente.cognome) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`${acquirente.nome} ${acquirente.cognome}`.trim(), col2, lineY + 4);
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pagina ${i} di ${pageCount}`, 105, 290, { align: "center" });
    if (venditore.ragioneSociale) {
      doc.text(venditore.ragioneSociale, marginL, 290);
    }
  }

  const targa = veicolo.targa ? `_${veicolo.targa}` : "";
  const data = pagamento.dataVendita.replace(/-/g, "");
  doc.save(`contratto_vendita${targa}_${data}.pdf`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatEuro(val: string) {
  if (!val) return "—";
  const n = parseFloat(val.replace(",", "."));
  if (isNaN(n)) return val;
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function calcSaldo(prezzo: string, acconto: string) {
  const p = parseFloat(prezzo.replace(",", ".")) || 0;
  const a = parseFloat(acconto.replace(",", ".")) || 0;
  if (!p) return "—";
  const s = p - a;
  return s.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function formatPersona(v: VenditoreInfo) {
  const lines = [
    v.ragioneSociale,
    v.indirizzo,
    [v.cap, v.citta].filter(Boolean).join(" "),
    v.piva ? `P.IVA: ${v.piva}` : "",
    v.telefono ? `Tel: ${v.telefono}` : "",
    v.email,
  ].filter(Boolean).join("\n");
  return lines || "—";
}

function formatAcquirente(a: AcquirenteInfo) {
  const lines = [
    [a.nome, a.cognome].filter(Boolean).join(" "),
    a.codiceFiscale ? `C.F.: ${a.codiceFiscale}` : "",
    a.indirizzo,
    [a.cap, a.citta].filter(Boolean).join(" "),
    a.telefono ? `Tel: ${a.telefono}` : "",
    a.email,
  ].filter(Boolean).join("\n");
  return lines || "—";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentoVendita() {
  const [venditore, setVenditore] = useState<VenditoreInfo>(defaultVenditore);
  const [acquirente, setAcquirente] = useState<AcquirenteInfo>(defaultAcquirente);
  const [veicolo, setVeicolo] = useState<VeicoloInfo>(defaultVeicolo);
  const [pagamento, setPagamento] = useState<PagamentoInfo>(defaultPagamento);

  const { data: vetture = [] } = useListVetture({});
  const { data: clienti = [] } = useListClienti({});

  function vSet<K extends keyof VenditoreInfo>(k: K, val: string) {
    setVenditore((p) => ({ ...p, [k]: val }));
  }
  function aSet<K extends keyof AcquirenteInfo>(k: K, val: string) {
    setAcquirente((p) => ({ ...p, [k]: val }));
  }
  function veSet<K extends keyof VeicoloInfo>(k: K, val: string) {
    setVeicolo((p) => ({ ...p, [k]: val }));
  }
  function pSet<K extends keyof PagamentoInfo>(k: K, val: string) {
    setPagamento((p) => ({ ...p, [k]: val }));
  }

  function caricaVettura(id: string) {
    const v = vetture?.find((x: any) => String(x.id) === id);
    if (!v) return;
    setVeicolo({
      marca: v.marca ?? "",
      modello: v.modello ?? "",
      anno: String(v.anno ?? ""),
      targa: v.targa ?? "",
      colore: v.colore ?? "",
      km: String(v.km ?? ""),
      numeroTelaio: "",
      carburante: v.carburante ?? "",
      stato: v.stato ?? "",
    });
    if (v.prezzo) pSet("prezzoVendita", String(v.prezzo));
  }

  function caricaCliente(id: string) {
    const c = clienti?.find((x: any) => String(x.id) === id);
    if (!c) return;
    setAcquirente({
      nome: c.nome ?? "",
      cognome: c.cognome ?? "",
      codiceFiscale: c.codiceFiscale ?? "",
      indirizzo: c.indirizzo ?? "",
      citta: "",
      cap: "",
      telefono: c.telefono ?? "",
      email: c.email ?? "",
    });
  }

  function reset() {
    setVenditore(defaultVenditore);
    setAcquirente(defaultAcquirente);
    setVeicolo(defaultVeicolo);
    setPagamento({ ...defaultPagamento, dataVendita: new Date().toISOString().split("T")[0] });
  }

  const saldo = calcSaldo(pagamento.prezzoVendita, pagamento.acconto);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Documento di Vendita</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Compila i dati e genera il contratto in PDF</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Azzera
          </Button>
          <Button size="sm" onClick={() => generaPDF(venditore, acquirente, veicolo, pagamento)} className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700">
            <FileDown className="w-3.5 h-3.5" />
            Genera PDF
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* Quick load */}
        {(vetture?.length || clienti?.length) ? (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3 uppercase tracking-wide">Caricamento rapido dai dati esistenti</p>
            <div className="flex flex-wrap gap-3">
              {vetture?.length ? (
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Seleziona vettura</Label>
                  <Select onValueChange={caricaVettura}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Scegli una vettura..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vetture?.map((v: any) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.marca} {v.modello} — {v.targa || "no targa"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {clienti?.length ? (
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Seleziona acquirente</Label>
                  <Select onValueChange={caricaCliente}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Scegli un cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clienti?.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome} {c.cognome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Venditore */}
        <Section icon={<Building2 className="w-4 h-4" />} title="Venditore / Concessionaria">
          <Field label="Ragione Sociale / Nome">
            <Input value={venditore.ragioneSociale} onChange={(e) => vSet("ragioneSociale", e.target.value)} placeholder="Es. AutoFlotta S.r.l." className="h-8 text-sm" />
          </Field>
          <Field label="P.IVA / Codice Fiscale">
            <Input value={venditore.piva} onChange={(e) => vSet("piva", e.target.value)} placeholder="IT12345678901" className="h-8 text-sm" />
          </Field>
          <Field label="Telefono">
            <Input value={venditore.telefono} onChange={(e) => vSet("telefono", e.target.value)} placeholder="+39 02 1234567" className="h-8 text-sm" />
          </Field>
          <Field label="Email">
            <Input value={venditore.email} onChange={(e) => vSet("email", e.target.value)} placeholder="info@concessionaria.it" className="h-8 text-sm" />
          </Field>
          <Field label="Indirizzo">
            <Input value={venditore.indirizzo} onChange={(e) => vSet("indirizzo", e.target.value)} placeholder="Via Roma 1" className="h-8 text-sm" />
          </Field>
          <Field label="CAP">
            <Input value={venditore.cap} onChange={(e) => vSet("cap", e.target.value)} placeholder="20100" className="h-8 text-sm" />
          </Field>
          <Field label="Città">
            <Input value={venditore.citta} onChange={(e) => vSet("citta", e.target.value)} placeholder="Milano" className="h-8 text-sm" />
          </Field>
        </Section>

        {/* Acquirente */}
        <Section icon={<User className="w-4 h-4" />} title="Acquirente">
          <Field label="Nome">
            <Input value={acquirente.nome} onChange={(e) => aSet("nome", e.target.value)} placeholder="Mario" className="h-8 text-sm" />
          </Field>
          <Field label="Cognome">
            <Input value={acquirente.cognome} onChange={(e) => aSet("cognome", e.target.value)} placeholder="Rossi" className="h-8 text-sm" />
          </Field>
          <Field label="Codice Fiscale">
            <Input value={acquirente.codiceFiscale} onChange={(e) => aSet("codiceFiscale", e.target.value)} placeholder="RSSMRA80A01H501Z" className="h-8 text-sm" />
          </Field>
          <Field label="Telefono">
            <Input value={acquirente.telefono} onChange={(e) => aSet("telefono", e.target.value)} placeholder="+39 333 1234567" className="h-8 text-sm" />
          </Field>
          <Field label="Email">
            <Input value={acquirente.email} onChange={(e) => aSet("email", e.target.value)} placeholder="mario.rossi@email.it" className="h-8 text-sm" />
          </Field>
          <Field label="Indirizzo">
            <Input value={acquirente.indirizzo} onChange={(e) => aSet("indirizzo", e.target.value)} placeholder="Via Milano 5" className="h-8 text-sm" />
          </Field>
          <Field label="CAP">
            <Input value={acquirente.cap} onChange={(e) => aSet("cap", e.target.value)} placeholder="00100" className="h-8 text-sm" />
          </Field>
          <Field label="Città">
            <Input value={acquirente.citta} onChange={(e) => aSet("citta", e.target.value)} placeholder="Roma" className="h-8 text-sm" />
          </Field>
        </Section>

        {/* Veicolo */}
        <Section icon={<Car className="w-4 h-4" />} title="Dati del Veicolo">
          <Field label="Marca">
            <Input value={veicolo.marca} onChange={(e) => veSet("marca", e.target.value)} placeholder="Ferrari" className="h-8 text-sm" />
          </Field>
          <Field label="Modello">
            <Input value={veicolo.modello} onChange={(e) => veSet("modello", e.target.value)} placeholder="Roma" className="h-8 text-sm" />
          </Field>
          <Field label="Anno">
            <Input value={veicolo.anno} onChange={(e) => veSet("anno", e.target.value)} placeholder="2024" className="h-8 text-sm" />
          </Field>
          <Field label="Targa">
            <Input value={veicolo.targa} onChange={(e) => veSet("targa", e.target.value)} placeholder="AB123CD" className="h-8 text-sm" />
          </Field>
          <Field label="Colore">
            <Input value={veicolo.colore} onChange={(e) => veSet("colore", e.target.value)} placeholder="Rosso Corsa" className="h-8 text-sm" />
          </Field>
          <Field label="Carburante">
            <Select value={veicolo.carburante} onValueChange={(v) => veSet("carburante", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {["benzina", "diesel", "ibrido", "elettrico", "gpl", "metano"].map((c) => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Km percorsi">
            <Input value={veicolo.km} onChange={(e) => veSet("km", e.target.value)} placeholder="15000" type="number" className="h-8 text-sm" />
          </Field>
          <Field label="Stato">
            <Select value={veicolo.stato} onValueChange={(v) => veSet("stato", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {["nuova", "usata", "km0", "aziendale"].map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Numero Telaio (VIN)">
            <Input value={veicolo.numeroTelaio} onChange={(e) => veSet("numeroTelaio", e.target.value)} placeholder="ZFF12345678901234" className="h-8 text-sm" />
          </Field>
        </Section>

        {/* Pagamento */}
        <Section icon={<CreditCard className="w-4 h-4" />} title="Condizioni Economiche e Pagamento">
          <Field label="Prezzo di vendita (€)">
            <Input value={pagamento.prezzoVendita} onChange={(e) => pSet("prezzoVendita", e.target.value)} placeholder="25000" type="number" className="h-8 text-sm" />
          </Field>
          <Field label="Acconto versato (€)">
            <Input value={pagamento.acconto} onChange={(e) => pSet("acconto", e.target.value)} placeholder="5000" type="number" className="h-8 text-sm" />
          </Field>
          <Field label="Saldo da versare">
            <div className="h-8 flex items-center px-3 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              {saldo}
            </div>
          </Field>
          <Field label="Modalità di pagamento">
            <Select value={pagamento.modalitaPagamento} onValueChange={(v) => pSet("modalitaPagamento", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Bonifico bancario", "Contanti", "Assegno circolare", "Finanziamento", "Permuta + contanti", "Carta di credito"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data della vendita">
            <Input value={pagamento.dataVendita} onChange={(e) => pSet("dataVendita", e.target.value)} type="date" className="h-8 text-sm" />
          </Field>
          <Field label="Luogo della vendita">
            <Input value={pagamento.luogoVendita} onChange={(e) => pSet("luogoVendita", e.target.value)} placeholder="Milano" className="h-8 text-sm" />
          </Field>
          <Field label="Note aggiuntive" full>
            <Textarea
              value={pagamento.note}
              onChange={(e) => pSet("note", e.target.value)}
              placeholder="Garanzie incluse, condizioni particolari, accessori inclusi nella vendita..."
              className="text-sm resize-none"
              rows={3}
            />
          </Field>
        </Section>

        {/* Bottom action */}
        <div className="flex justify-end pb-2">
          <Button onClick={() => generaPDF(venditore, acquirente, veicolo, pagamento)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            <FileDown className="w-4 h-4" />
            Genera e scarica contratto PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
