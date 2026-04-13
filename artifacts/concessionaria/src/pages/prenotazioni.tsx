import { useState, useMemo } from "react";
import {
  useListPrenotazioni, useCreatePrenotazione, useUpdatePrenotazione, useDeletePrenotazione,
  getListPrenotazioniQueryKey, useListVetture, useListClienti
} from "@workspace/api-client-react";
import {
  Plus, Search, Calendar as CalendarIcon, XCircle, Clock, Pencil, Trash2,
  CheckCircle2, Calculator, ChevronRight, AlertTriangle, Car, FilePlus,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, parseISO } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// ─── Tipi form ────────────────────────────────────────────────────────────────

interface PrenotazioneFormValues {
  vetturaId: number;
  clienteId: number;
  nomeLiberoMode: boolean;
  nomeLibero: string;
  cognomeLibero: string;
  dataInizio: string;
  dataFine: string;
  stato: string;
  note: string;
  // --- Rientro ---
  dataRientroEffettiva: string;
  kmPartenza: string;
  kmRientro: string;
  danni: string;
  // --- Prezzi ---
  prezzoGiornaliero: string;
  kmInclusi: string;
  costoExtraKm: string;
  cauzione: string;
  sconto: string;
}

const emptyForm = (): PrenotazioneFormValues => ({
  vetturaId: 0,
  clienteId: 0,
  nomeLiberoMode: false,
  nomeLibero: "",
  cognomeLibero: "",
  dataInizio: new Date().toISOString().split("T")[0],
  dataFine: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
  stato: "attiva",
  note: "",
  dataRientroEffettiva: "",
  kmPartenza: "",
  kmRientro: "",
  danni: "",
  prezzoGiornaliero: "",
  kmInclusi: "",
  costoExtraKm: "",
  cauzione: "",
  sconto: "",
});

// ─── Calcola totale prezzi ─────────────────────────────────────────────────────

function calcolaTotale(form: PrenotazioneFormValues) {
  const inizio = form.dataInizio ? parseISO(form.dataInizio) : null;
  const fine = form.dataFine ? parseISO(form.dataFine) : null;
  const giorni = inizio && fine ? Math.max(0, differenceInDays(fine, inizio)) : 0;

  const tariffaGiorno = parseFloat(form.prezzoGiornaliero) || 0;
  const kmInc = parseInt(form.kmInclusi) || 0;
  const costoKm = parseFloat(form.costoExtraKm) || 0;
  const kmPart = parseInt(form.kmPartenza) || 0;
  const kmRient = parseInt(form.kmRientro) || 0;
  const cauz = parseFloat(form.cauzione) || 0;
  const sco = parseFloat(form.sconto) || 0;

  const subtotaleGiorni = tariffaGiorno * giorni;
  const kmPercorsi = kmRient > kmPart ? kmRient - kmPart : 0;
  const kmExtra = kmPercorsi > kmInc ? kmPercorsi - kmInc : 0;
  const costoExtra = kmExtra * costoKm;
  const subtotale = subtotaleGiorni + costoExtra + cauz;
  const totale = Math.max(0, subtotale - sco);

  return { giorni, subtotaleGiorni, kmPercorsi, kmExtra, costoExtra, subtotale, totale, tariffaGiorno, kmInc, costoKm, cauz, sco };
}

// ─── Badge stato ─────────────────────────────────────────────────────────────

function getStatoBadge(s: string) {
  switch (s) {
    case "attiva":     return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200">Attiva</Badge>;
    case "in_corso":   return <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 border-blue-200"><Clock className="w-3 h-3 mr-1" />In Corso</Badge>;
    case "completata": return <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />Completata</Badge>;
    case "annullata":  return <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50"><XCircle className="w-3 h-3 mr-1" />Annullata</Badge>;
    default:           return <Badge>{s}</Badge>;
  }
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Prenotazioni() {
  const [stato, setStato] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PrenotazioneFormValues>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formTab, setFormTab] = useState("base");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: prenotazioni, isLoading } = useListPrenotazioni({ stato: stato !== "all" ? stato : undefined });
  const { data: vetture } = useListVetture();
  const { data: clienti } = useListClienti();

  const createPrenotazione = useCreatePrenotazione();
  const updatePrenotazione = useUpdatePrenotazione();
  const deletePrenotazione = useDeletePrenotazione();

  const filtered = prenotazioni?.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.vettura.targa.toLowerCase().includes(q) ||
      p.cliente.nome.toLowerCase().includes(q) ||
      p.cliente.cognome.toLowerCase().includes(q) ||
      (p.cliente.telefono ?? "").includes(q)
    );
  });

  const calc = useMemo(() => calcolaTotale(form), [form]);

  function setF(partial: Partial<PrenotazioneFormValues>) {
    setForm(f => ({ ...f, ...partial }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormTab("base");
    setFormOpen(true);
  }

  function openEdit(p: NonNullable<typeof prenotazioni>[0]) {
    const isNomeLibero = p.cliente.id == null;
    setEditingId(p.id);
    setForm({
      vetturaId: p.vettura.id,
      clienteId: isNomeLibero ? 0 : (p.cliente.id ?? 0),
      nomeLiberoMode: isNomeLibero,
      nomeLibero: isNomeLibero ? p.cliente.nome : "",
      cognomeLibero: isNomeLibero ? p.cliente.cognome : "",
      dataInizio: (p.dataInizio ?? "").split("T")[0],
      dataFine: (p.dataFine ?? "").split("T")[0],
      stato: p.stato,
      note: p.note ?? "",
      dataRientroEffettiva: p.dataRientroEffettiva ?? "",
      kmPartenza: p.kmPartenza != null ? String(p.kmPartenza) : "",
      kmRientro: p.kmRientro != null ? String(p.kmRientro) : "",
      danni: p.danni ?? "",
      prezzoGiornaliero: p.prezzoGiornaliero != null ? String(p.prezzoGiornaliero) : "",
      kmInclusi: p.kmInclusi != null ? String(p.kmInclusi) : "",
      costoExtraKm: p.costoExtraKm != null ? String(p.costoExtraKm) : "",
      cauzione: p.cauzione != null ? String(p.cauzione) : "",
      sconto: p.sconto != null ? String(p.sconto) : "",
    });
    setFormTab("base");
    setFormOpen(true);
  }

  function buildPayload() {
    const tot = calcolaTotale(form);
    return {
      vetturaId: form.vetturaId,
      clienteId: form.nomeLiberoMode ? null : (form.clienteId || null),
      nomeLibero: form.nomeLiberoMode ? (form.nomeLibero || null) : null,
      cognomeLibero: form.nomeLiberoMode ? (form.cognomeLibero || null) : null,
      dataInizio: form.dataInizio,
      dataFine: form.dataFine,
      stato: form.stato as "attiva" | "in_corso" | "completata" | "annullata",
      note: form.note || null,
      dataRientroEffettiva: form.dataRientroEffettiva || null,
      kmPartenza: form.kmPartenza ? parseInt(form.kmPartenza) : null,
      kmRientro: form.kmRientro ? parseInt(form.kmRientro) : null,
      danni: form.danni || null,
      prezzoGiornaliero: form.prezzoGiornaliero ? parseFloat(form.prezzoGiornaliero) : null,
      kmInclusi: form.kmInclusi ? parseInt(form.kmInclusi) : null,
      costoExtraKm: form.costoExtraKm ? parseFloat(form.costoExtraKm) : null,
      cauzione: form.cauzione ? parseFloat(form.cauzione) : null,
      sconto: form.sconto ? parseFloat(form.sconto) : null,
      prezzoTotale: tot.totale > 0 ? tot.totale : null,
    };
  }

  function handleSave() {
    if (!form.vetturaId) {
      toast({ title: "Seleziona una vettura", variant: "destructive" });
      return;
    }
    if (form.nomeLiberoMode && !form.nomeLibero.trim() && !form.cognomeLibero.trim()) {
      toast({ title: "Inserisci almeno nome o cognome", variant: "destructive" });
      return;
    }
    if (!form.nomeLiberoMode && !form.clienteId) {
      toast({ title: "Seleziona un cliente", variant: "destructive" });
      return;
    }
    const payload = buildPayload();

    if (editingId) {
      updatePrenotazione.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
          setFormOpen(false);
          toast({ title: "Prenotazione aggiornata" });
        },
        onError: () => toast({ title: "Errore aggiornamento", variant: "destructive" }),
      });
    } else {
      createPrenotazione.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
          setFormOpen(false);
          toast({ title: "Prenotazione creata" });
        },
        onError: () => toast({ title: "Errore creazione", variant: "destructive" }),
      });
    }
  }

  function handleDelete() {
    if (!deleteId) return;
    deletePrenotazione.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
        setDeleteId(null);
        toast({ title: "Prenotazione eliminata" });
      },
      onError: () => toast({ title: "Errore eliminazione", variant: "destructive" }),
    });
  }

  function handleQuickStatus(id: number, newStato: string) {
    updatePrenotazione.mutate({ id, data: { stato: newStato as "attiva" | "in_corso" | "completata" | "annullata" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
        toast({ title: "Stato aggiornato" });
      },
      onError: () => toast({ title: "Errore", variant: "destructive" }),
    });
  }

  const isPending = createPrenotazione.isPending || updatePrenotazione.isPending;

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden gap-4">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestione Prenotazioni</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Lista impegni, allocazione flotta e calcolo prezzi.</p>
        </div>
        <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Nuova Prenotazione</Button>
      </div>

      <Card className="shrink-0 bg-muted/40">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-9 bg-background h-9 text-sm" placeholder="Targa, cliente, telefono..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Select value={stato} onValueChange={setStato}>
            <SelectTrigger className="bg-background w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="attiva">Attiva</SelectItem>
              <SelectItem value="in_corso">In Corso</SelectItem>
              <SelectItem value="completata">Completata</SelectItem>
              <SelectItem value="annullata">Annullata</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || stato !== "all") && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setSearchQuery(""); setStato("all"); }}>Azzera</Button>
          )}
        </CardContent>
      </Card>

      <div className="bg-card border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Periodo</TableHead>
              <TableHead>Vettura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Importo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Caricamento...</TableCell></TableRow>
            ) : !filtered || filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Nessuna prenotazione trovata.</TableCell></TableRow>
            ) : (
              filtered.map(p => {
                const giorni = differenceInDays(parseISO(p.dataFine), parseISO(p.dataInizio));
                const inRitardo = p.dataRientroEffettiva && p.dataRientroEffettiva > p.dataFine;
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarIcon className="w-3 h-3" />
                          {format(parseISO(p.dataInizio), "dd/MM/yy")}
                          <span className="opacity-40">→</span>
                          {format(parseISO(p.dataFine), "dd/MM/yy")}
                        </div>
                        <div className="text-xs text-muted-foreground/70 mt-0.5">{giorni}gg</div>
                      </div>
                      {inRitardo && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-1">
                          <Clock className="w-3 h-3" /> Rientro ritardato
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{p.vettura.marca} {p.vettura.modello}</div>
                      <div className="font-mono text-xs text-muted-foreground">{p.vettura.targa}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{p.cliente.nome} {p.cliente.cognome}</div>
                      {p.cliente.telefono && <div className="text-xs text-muted-foreground">{p.cliente.telefono}</div>}
                    </TableCell>
                    <TableCell>
                      {p.prezzoTotale != null ? (
                        <span className="font-bold text-sm">€ {p.prezzoTotale.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                      ) : p.prezzoGiornaliero != null ? (
                        <span className="text-xs text-muted-foreground">€{p.prezzoGiornaliero}/gg</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                      {p.danni && (
                        <div className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Danni
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select value={p.stato} onValueChange={v => handleQuickStatus(p.id, v)}>
                        <SelectTrigger className="h-7 w-[130px] border-transparent bg-transparent px-1 hover:bg-muted focus:ring-0 shadow-none">
                          <SelectValue>{getStatoBadge(p.stato)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="attiva">Attiva</SelectItem>
                          <SelectItem value="in_corso">In Corso</SelectItem>
                          <SelectItem value="completata">Completata</SelectItem>
                          <SelectItem value="annullata">Annullata</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10 gap-1 px-2"
                          title="Crea contratto da questa prenotazione"
                          onClick={() => navigate(`/contratti?prenotazioneId=${p.id}`)}
                        >
                          <FilePlus className="w-3.5 h-3.5" />
                          Contratto
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Modifica" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Elimina" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Form dialog ── */}
      <Dialog open={formOpen} onOpenChange={open => !open && setFormOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? "Modifica Prenotazione" : "Nuova Prenotazione"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab}>
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="base">Dati base</TabsTrigger>
              <TabsTrigger value="prezzi" className="gap-1.5"><Calculator className="w-3.5 h-3.5" />Prezzi</TabsTrigger>
              <TabsTrigger value="rientro">Rientro e danni</TabsTrigger>
            </TabsList>

            {/* ── Tab: Dati base ── */}
            <TabsContent value="base" className="space-y-4 min-h-[280px]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Cliente</Label>
                  <div className="flex rounded-md overflow-hidden border text-xs">
                    <button
                      type="button"
                      onClick={() => setF({ nomeLiberoMode: false, nomeLibero: "", cognomeLibero: "" })}
                      className={`px-2.5 py-1 font-medium transition-colors ${!form.nomeLiberoMode ? "bg-foreground text-background" : "hover:bg-muted"}`}
                    >
                      Cliente esistente
                    </button>
                    <button
                      type="button"
                      onClick={() => setF({ nomeLiberoMode: true, clienteId: 0 })}
                      className={`px-2.5 py-1 font-medium transition-colors border-l ${form.nomeLiberoMode ? "bg-foreground text-background" : "hover:bg-muted"}`}
                    >
                      Nome libero
                    </button>
                  </div>
                </div>
                {form.nomeLiberoMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nome"
                      value={form.nomeLibero}
                      onChange={e => setF({ nomeLibero: e.target.value })}
                      autoComplete="off"
                    />
                    <Input
                      placeholder="Cognome"
                      value={form.cognomeLibero}
                      onChange={e => setF({ cognomeLibero: e.target.value })}
                      autoComplete="off"
                    />
                  </div>
                ) : (
                  <Select value={form.clienteId ? form.clienteId.toString() : ""} onValueChange={v => setF({ clienteId: Number(v) })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                    <SelectContent>
                      {clienti?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.nome} {c.cognome}{c.codiceFiscale ? ` (${c.codiceFiscale})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Vettura</Label>
                <Select value={form.vetturaId ? form.vetturaId.toString() : ""} onValueChange={v => {
                  const vett = vetture?.find(x => x.id === Number(v));
                  setF({
                    vetturaId: Number(v),
                    prezzoGiornaliero: vett?.prezzo != null && !form.prezzoGiornaliero ? String(Math.round(vett.prezzo / 30)) : form.prezzoGiornaliero,
                  });
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleziona vettura" /></SelectTrigger>
                  <SelectContent>
                    {vetture?.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.marca} {v.modello} — {v.targa}{v.disponibile ? "" : " [non disp.]"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Dal</Label>
                  <Input type="date" value={form.dataInizio} onChange={e => setF({ dataInizio: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Al</Label>
                  <Input type="date" value={form.dataFine} onChange={e => setF({ dataFine: e.target.value })} />
                </div>
              </div>
              {calc.giorni > 0 && (
                <p className="text-xs text-muted-foreground">Durata: <b>{calc.giorni} giorni</b></p>
              )}
              <div className="space-y-1.5">
                <Label>Stato</Label>
                <Select value={form.stato} onValueChange={v => setF({ stato: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attiva">Attiva</SelectItem>
                    <SelectItem value="in_corso">In Corso</SelectItem>
                    <SelectItem value="completata">Completata</SelectItem>
                    <SelectItem value="annullata">Annullata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input placeholder="Note interne..." value={form.note} onChange={e => setF({ note: e.target.value })} />
              </div>
            </TabsContent>

            {/* ── Tab: Prezzi ── */}
            <TabsContent value="prezzi" className="min-h-[280px]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Tariffa giornaliera (€/giorno)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="es. 45.00" value={form.prezzoGiornaliero} onChange={e => setF({ prezzoGiornaliero: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Km inclusi nel contratto</Label>
                    <Input type="number" min="0" placeholder="es. 200" value={form.kmInclusi} onChange={e => setF({ kmInclusi: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Costo extra km (€/km)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="es. 0.25" value={form.costoExtraKm} onChange={e => setF({ costoExtraKm: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cauzione (€)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="es. 300.00" value={form.cauzione} onChange={e => setF({ cauzione: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sconto (€)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="es. 50.00" value={form.sconto} onChange={e => setF({ sconto: e.target.value })} />
                  </div>
                </div>

                {/* ── Riepilogo calcolo ── */}
                <div className="bg-muted/40 rounded-lg p-4 border space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 font-semibold mb-3">
                    <Calculator className="w-4 h-4 text-primary" />
                    Riepilogo preventivo
                  </div>
                  <RigaCalcolo label={`${calc.giorni} gg × €${calc.tariffaGiorno}`} value={calc.subtotaleGiorni} />
                  {calc.kmPercorsi > 0 && (
                    <>
                      <RigaCalcolo label={`Km percorsi`} value={null} suffix={`${calc.kmPercorsi.toLocaleString()} km`} />
                      {calc.kmExtra > 0 && (
                        <RigaCalcolo label={`Extra km (${calc.kmExtra} km × €${calc.costoKm})`} value={calc.costoExtra} accent="amber" />
                      )}
                    </>
                  )}
                  {calc.cauz > 0 && <RigaCalcolo label="Cauzione" value={calc.cauz} />}
                  {(calc.subtotaleGiorni > 0 || calc.costoExtra > 0 || calc.cauz > 0) && (
                    <div className="border-t pt-2 mt-1">
                      <RigaCalcolo label="Subtotale" value={calc.subtotale} />
                    </div>
                  )}
                  {calc.sco > 0 && <RigaCalcolo label="Sconto" value={-calc.sco} accent="green" />}
                  <Separator />
                  <div className="flex justify-between items-center font-bold text-base pt-1">
                    <span>Totale</span>
                    <span className="text-primary">€ {calc.totale.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {calc.totale === 0 && (
                    <p className="text-xs text-muted-foreground italic">Inserisci tariffa e date per calcolare il preventivo.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Tab: Rientro e danni ── */}
            <TabsContent value="rientro" className="space-y-4 min-h-[280px]">
              <div className="space-y-1.5">
                <Label>Data rientro effettiva</Label>
                <Input type="date" value={form.dataRientroEffettiva} onChange={e => setF({ dataRientroEffettiva: e.target.value })} />
                {form.dataRientroEffettiva && form.dataFine && form.dataRientroEffettiva > form.dataFine && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Rientro in ritardo di {differenceInDays(parseISO(form.dataRientroEffettiva), parseISO(form.dataFine))} giorni
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Km alla partenza</Label>
                  <Input type="number" min="0" placeholder="es. 23500" value={form.kmPartenza} onChange={e => setF({ kmPartenza: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Km al rientro</Label>
                  <Input type="number" min="0" placeholder="es. 23850" value={form.kmRientro} onChange={e => setF({ kmRientro: e.target.value })} />
                </div>
              </div>
              {form.kmPartenza && form.kmRientro && parseInt(form.kmRientro) > parseInt(form.kmPartenza) && (
                <p className="text-xs text-muted-foreground">Km percorsi: <b>{parseInt(form.kmRientro) - parseInt(form.kmPartenza)}</b></p>
              )}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  Danni rilevati al rientro
                </Label>
                <textarea
                  className="w-full min-h-[80px] p-2.5 rounded-md border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Descrivere eventuali danni rilevati al rientro del veicolo..."
                  value={form.danni}
                  onChange={e => setF({ danni: e.target.value })}
                />
                {form.danni && (
                  <p className="text-xs text-red-600">I danni saranno registrati nel profilo del cliente.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvataggio..." : editingId ? "Salva Modifiche" : "Crea Prenotazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la prenotazione?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione è irreversibile. La prenotazione verrà eliminata definitivamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} disabled={deletePrenotazione.isPending}>
              {deletePrenotazione.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Helper riepilogo ─────────────────────────────────────────────────────────

function RigaCalcolo({ label, value, suffix, accent }: {
  label: string;
  value: number | null;
  suffix?: string;
  accent?: "amber" | "green";
}) {
  const colorCls = accent === "amber"
    ? "text-amber-600"
    : accent === "green"
    ? "text-emerald-600"
    : "text-foreground";

  return (
    <div className={`flex justify-between items-center text-sm ${colorCls}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${colorCls}`}>
        {suffix ?? (value != null ? `€ ${value.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "—")}
      </span>
    </div>
  );
}
