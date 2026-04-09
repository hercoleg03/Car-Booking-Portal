import { useState } from "react";
import { useGetDashboardStats, useGetFleetStatus, useCreatePrenotazione, useListVetture, useListClienti, getListPrenotazioniQueryKey } from "@workspace/api-client-react";
import {
  Car, CheckCircle2, Calendar, FileText, Users, TrendingUp, Loader2,
  ArrowUpRight, ArrowDownLeft, Plus, AlertCircle, Wrench, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATO_CFG: Record<string, { label: string; border: string; bg: string; text: string; dot: string }> = {
  disponibile: {
    label: "Disponibile",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  prenotata: {
    label: "Prenotata",
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  noleggiata: {
    label: "In Noleggio",
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  manutenzione: {
    label: "Manutenzione",
    border: "border-neutral-500/40",
    bg: "bg-neutral-500/10",
    text: "text-neutral-700 dark:text-neutral-300",
    dot: "bg-neutral-700",
  },
};

function StatoOperativoBadge({ stato }: { stato: string }) {
  const cfg = STATO_CFG[stato] ?? { label: stato, border: "border-border", bg: "bg-muted", text: "text-foreground", dot: "bg-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function KpiCard({ title, value, icon: Icon, color, bg, description, loading }: {
  title: string; value: number | undefined; icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; description: string; loading: boolean;
}) {
  return (
    <Card className="relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
            {loading ? (
              <div className="h-8 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
              </div>
            ) : (
              <p className={`text-3xl font-black tracking-tight ${color}`}>{value ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickPrenotazioneForm {
  vetturaId: number;
  clienteId: number;
  nomeLiberoMode: boolean;
  nomeLibero: string;
  cognomeLibero: string;
  dataInizio: string;
  dataFine: string;
}

const emptyQuickForm = (): QuickPrenotazioneForm => ({
  vetturaId: 0,
  clienteId: 0,
  nomeLiberoMode: false,
  nomeLibero: "",
  cognomeLibero: "",
  dataInizio: new Date().toISOString().split("T")[0],
  dataFine: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
});

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: fleetStatus, isLoading: fleetLoading } = useGetFleetStatus();
  const { data: vetture } = useListVetture();
  const { data: clienti } = useListClienti();
  const createPrenotazione = useCreatePrenotazione();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [prenotazioneOpen, setPrenotazioneOpen] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickPrenotazioneForm>(emptyQuickForm());

  const setQF = (partial: Partial<QuickPrenotazioneForm>) => setQuickForm(f => ({ ...f, ...partial }));

  function handleQuickSave() {
    if (!quickForm.vetturaId) {
      toast({ title: "Seleziona una vettura", variant: "destructive" });
      return;
    }
    if (quickForm.nomeLiberoMode && !quickForm.nomeLibero.trim() && !quickForm.cognomeLibero.trim()) {
      toast({ title: "Inserisci almeno nome o cognome", variant: "destructive" });
      return;
    }
    if (!quickForm.nomeLiberoMode && !quickForm.clienteId) {
      toast({ title: "Seleziona un cliente", variant: "destructive" });
      return;
    }
    createPrenotazione.mutate(
      {
        data: {
          vetturaId: quickForm.vetturaId,
          clienteId: quickForm.nomeLiberoMode ? null : (quickForm.clienteId || null),
          nomeLibero: quickForm.nomeLiberoMode ? (quickForm.nomeLibero || null) : null,
          cognomeLibero: quickForm.nomeLiberoMode ? (quickForm.cognomeLibero || null) : null,
          dataInizio: quickForm.dataInizio,
          dataFine: quickForm.dataFine,
          stato: "attiva",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
          setPrenotazioneOpen(false);
          setQuickForm(emptyQuickForm());
          toast({ title: "Prenotazione creata" });
        },
        onError: () => toast({ title: "Errore creazione", variant: "destructive" }),
      }
    );
  }

  const today = new Date();
  const todayStr = format(today, "EEEE d MMMM yyyy", { locale: it });

  const disponibili = fleetStatus?.filter(v => v.statoOperativo === "disponibile") ?? [];
  const prenotate = fleetStatus?.filter(v => v.statoOperativo === "prenotata") ?? [];
  const noleggiate = fleetStatus?.filter(v => v.statoOperativo === "noleggiata") ?? [];
  const inManutenzione = fleetStatus?.filter(v => v.statoOperativo === "manutenzione") ?? [];

  const rientroOggi = stats?.vettureInRientroOggi ?? 0;
  const inizioOggi = stats?.prenotazioniInizioOggi ?? 0;

  return (
    <div className="p-6 flex flex-col h-full overflow-auto gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{todayStr}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setQuickForm(emptyQuickForm()); setPrenotazioneOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Prenotazione
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/clienti")}>
            <Plus className="w-3.5 h-3.5" /> Cliente
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/calendario")}>
            <Calendar className="w-3.5 h-3.5" /> Calendario
          </Button>
        </div>
      </div>

      {/* Today alerts row */}
      {(rientroOggi > 0 || inizioOggi > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {inizioOggi > 0 && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8 cursor-pointer hover:bg-amber-500/12 transition-colors"
              onClick={() => navigate("/prenotazioni")}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="font-semibold text-sm text-amber-700 dark:text-amber-400">
                  {inizioOggi} {inizioOggi === 1 ? "Partenza" : "Partenze"} Oggi
                </div>
                <div className="text-xs text-muted-foreground">Consegna veicoli programmata</div>
              </div>
              <AlertCircle className="w-4 h-4 text-amber-500 ml-auto shrink-0" />
            </div>
          )}
          {rientroOggi > 0 && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/8 cursor-pointer hover:bg-blue-500/12 transition-colors"
              onClick={() => navigate("/prenotazioni")}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                  {rientroOggi} {rientroOggi === 1 ? "Rientro" : "Rientri"} Oggi
                </div>
                <div className="text-xs text-muted-foreground">Restituzione veicoli prevista</div>
              </div>
              <Clock className="w-4 h-4 text-blue-500 ml-auto shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Flotta Totale" value={stats?.totaleVetture} icon={Car} color="text-indigo-700 dark:text-indigo-300" bg="bg-indigo-500/15" description="Veicoli registrati" loading={statsLoading} />
        <KpiCard title="Disponibili" value={stats?.vettureDisponibili} icon={CheckCircle2} color="text-emerald-700 dark:text-emerald-300" bg="bg-emerald-500/15" description="Pronte per noleggio" loading={statsLoading} />
        <KpiCard title="Contratti Attivi" value={stats?.contrattiAttivi ?? 0} icon={FileText} color="text-violet-700 dark:text-violet-300" bg="bg-violet-500/15" description="Non archiviati" loading={statsLoading} />
        <KpiCard title="Clienti" value={stats?.totaleClienti} icon={Users} color="text-sky-700 dark:text-sky-300" bg="bg-sky-500/15" description="Anagrafiche registrate" loading={statsLoading} />
      </div>

      {/* Fleet status board */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Car className="w-4 h-4 text-muted-foreground" /> Stato Flotta
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {Object.entries(STATO_CFG).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${v.dot}`} /> {v.label}
              </span>
            ))}
          </div>
        </div>

        {fleetLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento flotta...
          </div>
        ) : !fleetStatus || fleetStatus.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border rounded-xl">
            Nessun veicolo registrato
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {fleetStatus.map((v) => {
              const cfg = STATO_CFG[v.statoOperativo] ?? STATO_CFG.disponibile;
              return (
                <div
                  key={v.id}
                  className={`p-3.5 rounded-xl border ${cfg.border} ${cfg.bg} cursor-pointer hover:shadow-sm transition-all`}
                  onClick={() => navigate("/inventario")}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{v.marca} {v.modello}</div>
                      <div className="font-mono text-xs text-muted-foreground">{v.targa}</div>
                    </div>
                    <StatoOperativoBadge stato={v.statoOperativo} />
                  </div>
                  {v.clienteNome && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                      <Users className="w-3 h-3" />
                      <span className="truncate">{v.clienteNome}</span>
                    </div>
                  )}
                  {v.dataFine && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>fino al {format(parseISO(v.dataFine), "dd/MM/yyyy")}</span>
                    </div>
                  )}
                  {v.statoOperativo === "manutenzione" && v.dataInizio && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Wrench className="w-3 h-3" />
                      <span>{format(parseISO(v.dataInizio), "dd/MM/yyyy")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Counts summary */}
        {fleetStatus && fleetStatus.length > 0 && (
          <div className="flex gap-4 mt-3">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-emerald-600">{disponibili.length}</span> disponibili
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-amber-600">{prenotate.length}</span> prenotate
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-rose-600">{noleggiate.length}</span> in noleggio
            </span>
            {inManutenzione.length > 0 && (
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-neutral-600">{inManutenzione.length}</span> in manutenzione
              </span>
            )}
          </div>
        )}
      </div>

      {/* Charts row */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" /> Ripartizione Carburante
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats.ripartizioneCarburante.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Nessun dato disponibile.</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.ripartizioneCarburante.map((r) => {
                    const pct = stats.totaleVetture > 0 ? Math.round((r.count / stats.totaleVetture) * 100) : 0;
                    return (
                      <div key={r.carburante}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize font-medium">{r.carburante}</span>
                          <span className="text-muted-foreground">{r.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" /> Tipo Vetture
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats.ripartizioneStato.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Nessun dato disponibile.</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.ripartizioneStato.map((r) => {
                    const pct = stats.totaleVetture > 0 ? Math.round((r.count / stats.totaleVetture) * 100) : 0;
                    const colors: Record<string, string> = { nuova: "bg-emerald-500", usata: "bg-amber-500", km0: "bg-blue-500" };
                    return (
                      <div key={r.stato}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize font-medium">{r.stato === "km0" ? "Km 0" : r.stato}</span>
                          <span className="text-muted-foreground">{r.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${colors[r.stato] ?? "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Quick prenotazione modal ── */}
      <Dialog open={prenotazioneOpen} onOpenChange={open => !open && setPrenotazioneOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuova Prenotazione
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vettura</Label>
              <Select value={quickForm.vetturaId ? quickForm.vetturaId.toString() : ""} onValueChange={v => setQF({ vetturaId: Number(v) })}>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Cliente</Label>
                <div className="flex rounded-md overflow-hidden border text-xs">
                  <button
                    type="button"
                    onClick={() => setQF({ nomeLiberoMode: false, nomeLibero: "", cognomeLibero: "" })}
                    className={`px-2.5 py-1 font-medium transition-colors ${!quickForm.nomeLiberoMode ? "bg-foreground text-background" : "hover:bg-muted"}`}
                  >
                    Cliente esistente
                  </button>
                  <button
                    type="button"
                    onClick={() => setQF({ nomeLiberoMode: true, clienteId: 0 })}
                    className={`px-2.5 py-1 font-medium transition-colors border-l ${quickForm.nomeLiberoMode ? "bg-foreground text-background" : "hover:bg-muted"}`}
                  >
                    Nome libero
                  </button>
                </div>
              </div>
              {quickForm.nomeLiberoMode ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nome"
                    value={quickForm.nomeLibero}
                    onChange={e => setQF({ nomeLibero: e.target.value })}
                    autoComplete="off"
                  />
                  <Input
                    placeholder="Cognome"
                    value={quickForm.cognomeLibero}
                    onChange={e => setQF({ cognomeLibero: e.target.value })}
                    autoComplete="off"
                  />
                </div>
              ) : (
                <Select value={quickForm.clienteId ? quickForm.clienteId.toString() : ""} onValueChange={v => setQF({ clienteId: Number(v) })}>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dal</Label>
                <Input type="date" value={quickForm.dataInizio} onChange={e => setQF({ dataInizio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Al</Label>
                <Input type="date" value={quickForm.dataFine} onChange={e => setQF({ dataFine: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setPrenotazioneOpen(false)}>Annulla</Button>
            <Button onClick={handleQuickSave} disabled={createPrenotazione.isPending}>
              {createPrenotazione.isPending ? "Creazione..." : "Crea Prenotazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
