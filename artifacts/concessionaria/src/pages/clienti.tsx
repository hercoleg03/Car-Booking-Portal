import { useState } from "react";
import {
  useListClienti, useCreateCliente, getListClientiQueryKey,
  useGetClienteProfilo, getGetClienteProfiloQueryKey,
  useUpdateClienteEtichetta,
  useUpdateCliente,
} from "@workspace/api-client-react";
import {
  Plus, Search, User, Mail, Phone, MapPin, FileText,
  Calendar as CalendarIcon, AlertTriangle, CheckCircle2,
  Clock, Car, TrendingUp, ShieldCheck, ShieldAlert, ShieldX,
  Edit2, ChevronDown, ChevronsUpDown, TriangleAlert, Wrench
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Etichetta = "affidabile" | "da_monitorare" | "problematico" | null;

const etichettaConfig = {
  affidabile:    { label: "Affidabile",    icon: ShieldCheck, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800" },
  da_monitorare: { label: "Da monitorare", icon: ShieldAlert,  cls: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800" },
  problematico:  { label: "Problematico",  icon: ShieldX,      cls: "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800" },
};

function EtichettaBadge({ etichetta }: { etichetta: Etichetta }) {
  if (!etichetta) return <span className="text-muted-foreground text-sm">—</span>;
  const cfg = etichettaConfig[etichetta];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 font-medium ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" /> {cfg.label}
    </Badge>
  );
}

// ─── Schema form ──────────────────────────────────────────────────────────────

const clienteSchema = z.object({
  nome: z.string().min(1, "Nome richiesto"),
  cognome: z.string().min(1, "Cognome richiesto"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  telefono: z.string().optional().nullable(),
  codiceFiscale: z.string().toUpperCase().length(16, "CF deve essere 16 caratteri").optional().or(z.literal("")),
  indirizzo: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});
type ClienteFormValues = z.infer<typeof clienteSchema>;

// ─── Calcola stato pagamenti ──────────────────────────────────────────────────

function calcPagamenti(contratti: Array<{ importo?: number | null; archiviato?: boolean | null; tipo?: string | null }>) {
  const attivi = contratti.filter(c => !c.archiviato);
  const totale = attivi.reduce((s, c) => s + (c.importo ?? 0), 0);
  const archiviati = contratti.filter(c => c.archiviato);
  const pagato = archiviati.reduce((s, c) => s + (c.importo ?? 0), 0);
  return { attivi: attivi.length, totale, pagato, inSospeso: attivi.length > 0 };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Clienti() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clienti, isLoading } = useListClienti({ search: search || undefined });
  const createCliente = useCreateCliente();

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { nome: "", cognome: "", email: "", telefono: "", codiceFiscale: "", indirizzo: "", note: "" },
  });

  function onSubmit(data: ClienteFormValues) {
    createCliente.mutate({ data: { ...data, email: data.email || null, codiceFiscale: data.codiceFiscale || null } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientiQueryKey() });
        setIsAddOpen(false);
        form.reset();
        toast({ title: "Cliente aggiunto con successo" });
      },
      onError: () => toast({ title: "Errore nella creazione del cliente", variant: "destructive" })
    });
  }

  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anagrafica Clienti</h1>
          <p className="text-muted-foreground mt-1">Gestione clienti, etichette di affidabilità e storico noleggi.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nuovo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Aggiungi Cliente</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="nome" render={({ field }) => (
                    <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cognome" render={({ field }) => (
                    <FormItem><FormLabel>Cognome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="telefono" render={({ field }) => (
                    <FormItem><FormLabel>Telefono</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="codiceFiscale" render={({ field }) => (
                  <FormItem><FormLabel>Codice Fiscale</FormLabel><FormControl><Input {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="indirizzo" render={({ field }) => (
                  <FormItem><FormLabel>Indirizzo</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Annulla</Button>
                  <Button type="submit" disabled={createCliente.isPending}>Salva Cliente</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-4 shrink-0 bg-muted/40">
        <CardContent className="p-4 flex items-end gap-4">
          <div className="space-y-1.5 flex-1 max-w-md">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="w-4 h-4" /> Ricerca
            </label>
            <Input placeholder="Nome, cognome, email, codice fiscale..." value={search} onChange={e => setSearch(e.target.value)} className="bg-background" />
          </div>
          {clienti && (
            <div className="text-sm text-muted-foreground pb-1">
              {clienti.length} {clienti.length === 1 ? "cliente" : "clienti"}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-card border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Etichetta</TableHead>
              <TableHead>Contatti</TableHead>
              <TableHead>Codice Fiscale</TableHead>
              <TableHead>Registrazione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                </TableRow>
              ))
            ) : clienti?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Nessun cliente trovato.</TableCell></TableRow>
            ) : (
              clienti?.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(c.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {c.nome[0]}{c.cognome[0]}
                      </div>
                      <span className="font-semibold">{c.nome} {c.cognome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <EtichettaBadge etichetta={c.etichetta as Etichetta} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                      {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {c.email}</div>}
                      {c.telefono && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {c.telefono}</div>}
                      {!c.email && !c.telefono && "—"}
                    </div>
                  </TableCell>
                  <TableCell><span className="font-mono text-sm">{c.codiceFiscale || "—"}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(c.createdAt), "dd/MM/yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClienteProfiloSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

// ─── Sheet profilo completo ───────────────────────────────────────────────────

function ClienteProfiloSheet({ id, onClose }: { id: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editNote, setEditNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");

  const { data: profilo, isLoading } = useGetClienteProfilo(id!, {
    query: { enabled: !!id, queryKey: id ? getGetClienteProfiloQueryKey(id) : [] },
  });

  const updateEtichetta = useUpdateClienteEtichetta();
  const updateCliente = useUpdateCliente();

  function onEtichettaChange(val: string) {
    if (!id) return;
    const etichetta = val === "__auto__" ? null : val;
    updateEtichetta.mutate({ id, data: { etichetta } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClienteProfiloQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListClientiQueryKey() });
        toast({ title: "Etichetta aggiornata" });
      },
      onError: () => toast({ title: "Errore aggiornamento etichetta", variant: "destructive" }),
    });
  }

  function saveNote() {
    if (!id) return;
    updateCliente.mutate({ id, data: { note: noteValue } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClienteProfiloQueryKey(id) });
        setEditNote(false);
        toast({ title: "Note aggiornate" });
      }
    });
  }

  const stats = profilo?.stats;
  const cliente = profilo?.cliente;

  return (
    <Sheet open={!!id} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[680px] sm:max-w-none overflow-y-auto p-0">
        {isLoading || !profilo ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div>
            {/* ── Header ── */}
            <div className="p-6 border-b bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                    {cliente!.nome[0]}{cliente!.cognome[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{cliente!.nome} {cliente!.cognome}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {cliente!.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {cliente!.email}</span>}
                      {cliente!.telefono && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {cliente!.telefono}</span>}
                      {cliente!.indirizzo && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {cliente!.indirizzo}</span>}
                      {cliente!.codiceFiscale && <span className="flex items-center gap-1 font-mono"><User className="w-3.5 h-3.5" /> {cliente!.codiceFiscale}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Etichetta ── */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Etichetta:</span>
                <EtichettaBadge etichetta={cliente!.etichetta as Etichetta} />
                {stats?.suggerimentoEtichetta && stats.suggerimentoEtichetta !== cliente!.etichetta && (
                  <span className="text-xs text-muted-foreground italic">
                    (suggerito: {etichettaConfig[stats.suggerimentoEtichetta as keyof typeof etichettaConfig]?.label ?? stats.suggerimentoEtichetta})
                  </span>
                )}
                <Select
                  value={cliente!.etichetta ?? "__auto__"}
                  onValueChange={onEtichettaChange}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">Automatica</SelectItem>
                    <SelectItem value="affidabile">Affidabile</SelectItem>
                    <SelectItem value="da_monitorare">Da monitorare</SelectItem>
                    <SelectItem value="problematico">Problematico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── KPI Cards ── */}
            {stats && (
              <div className="grid grid-cols-4 gap-3 p-5 border-b">
                <KpiCard label="Noleggi totali" value={stats.totalePrenotazioni} icon={CalendarIcon} color="blue" />
                <KpiCard label="Completati" value={stats.completate} icon={CheckCircle2} color="green" />
                <KpiCard label="Ritardi" value={stats.ritardi} icon={Clock} color={stats.ritardi > 0 ? "amber" : "neutral"} />
                <KpiCard label="Danni" value={stats.danniSegnalati} icon={AlertTriangle} color={stats.danniSegnalati > 0 ? "red" : "neutral"} />
              </div>
            )}

            {/* ── Tabs: Storico / Prezzi / Contratti / Note ── */}
            <Tabs defaultValue="storico" className="p-5">
              <TabsList className="mb-4">
                <TabsTrigger value="storico">Storico noleggi</TabsTrigger>
                <TabsTrigger value="contratti">Contratti e pagamenti</TabsTrigger>
                <TabsTrigger value="note">Note</TabsTrigger>
              </TabsList>

              {/* ── Tab Storico ── */}
              <TabsContent value="storico" className="space-y-3">
                {stats && (
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">
                      {stats.completate} completati · {stats.annullate} annullati · {stats.inCorso} in corso · {stats.attive} attivi
                    </span>
                    {stats.mediaGiorni > 0 && (
                      <span className="text-muted-foreground">Media: {stats.mediaGiorni} gg/noleggio</span>
                    )}
                  </div>
                )}
                {profilo.prenotazioni.length === 0 ? (
                  <EmptyState icon={CalendarIcon} testo="Nessun noleggio nello storico." />
                ) : (
                  <div className="space-y-2">
                    {[...profilo.prenotazioni].reverse().map(p => {
                      const giorni = differenceInDays(parseISO(p.dataFine), parseISO(p.dataInizio));
                      const inRitardo = p.dataRientroEffettiva && p.dataRientroEffettiva > p.dataFine;
                      const giorniRitardo = inRitardo
                        ? differenceInDays(parseISO(p.dataRientroEffettiva!), parseISO(p.dataFine))
                        : 0;
                      return (
                        <Card key={p.id} className="bg-muted/20 hover:bg-muted/40 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="font-semibold truncate">{p.vettura?.marca} {p.vettura?.modello}</span>
                                  <span className="text-xs font-mono text-muted-foreground shrink-0">({p.vettura?.targa})</span>
                                </div>
                                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                                  <span>{format(parseISO(p.dataInizio), "dd/MM/yyyy")} → {format(parseISO(p.dataFine), "dd/MM/yyyy")} ({giorni}gg)</span>
                                  {p.kmPartenza != null && p.kmRientro != null && (
                                    <span>{(p.kmRientro - p.kmPartenza).toLocaleString()} km percorsi</span>
                                  )}
                                </div>
                                {/* Avvisi */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {inRitardo && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-0.5">
                                      <Clock className="w-3 h-3" /> Rientro in ritardo di {giorniRitardo}gg
                                    </span>
                                  )}
                                  {p.danni && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded px-2 py-0.5">
                                      <TriangleAlert className="w-3 h-3" /> {p.danni}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <StatoBadge stato={p.stato} />
                                {p.prezzoTotale != null && (
                                  <span className="font-bold text-base">€ {p.prezzoTotale.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                                )}
                                {p.prezzoTotale == null && p.prezzoGiornaliero != null && (
                                  <span className="text-xs text-muted-foreground">€{p.prezzoGiornaliero}/gg</span>
                                )}
                              </div>
                            </div>

                            {/* Dettaglio prezzo */}
                            {(p.prezzoGiornaliero != null || p.cauzione != null) && (
                              <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                {p.prezzoGiornaliero != null && <span>Tariffa giornaliera: <b>€{p.prezzoGiornaliero}</b></span>}
                                {p.kmInclusi != null && <span>Km inclusi: <b>{p.kmInclusi.toLocaleString()}</b></span>}
                                {p.costoExtraKm != null && <span>Costo extra km: <b>€{p.costoExtraKm}/km</b></span>}
                                {p.cauzione != null && <span>Cauzione: <b>€{p.cauzione.toLocaleString()}</b></span>}
                                {p.sconto != null && p.sconto > 0 && <span>Sconto: <b>-€{p.sconto.toLocaleString()}</b></span>}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Totale speso */}
                {stats && stats.totaleSpeso > 0 && (
                  <Card className="bg-primary/5 border-primary/20 mt-4">
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Totale fatturato
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        € {stats.totaleSpeso.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                      </span>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── Tab Contratti e pagamenti ── */}
              <TabsContent value="contratti" className="space-y-3">
                {profilo.contratti.length === 0 ? (
                  <EmptyState icon={FileText} testo="Nessun contratto nello storico." />
                ) : (
                  <>
                    {(() => {
                      const pg = calcPagamenti(profilo.contratti);
                      return (
                        <div className={`rounded-lg border p-4 mb-4 flex items-center justify-between ${pg.inSospeso ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"}`}>
                          <div className="flex items-center gap-2">
                            {pg.inSospeso
                              ? <AlertTriangle className="w-5 h-5 text-amber-600" />
                              : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                            <div>
                              <p className={`font-semibold ${pg.inSospeso ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}`}>
                                {pg.inSospeso ? `${pg.attivi} contratt${pg.attivi > 1 ? "i" : "o"} in corso` : "Tutti i contratti archiviati"}
                              </p>
                              <p className="text-xs text-muted-foreground">Totale valore contratti attivi: € {pg.totale.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {[...profilo.contratti].reverse().map(c => (
                      <Card key={c.id} className="bg-muted/20">
                        <CardContent className="p-4 text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-semibold">N. {c.numero}</span>
                              <Badge variant="secondary" className="ml-2 text-xs capitalize">{c.tipo}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">{format(parseISO(c.dataContratto), "dd/MM/yyyy")}</span>
                              {c.archiviato
                                ? <Badge variant="outline" className="text-xs">Archiviato</Badge>
                                : <Badge className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-200">Attivo</Badge>}
                            </div>
                          </div>
                          <div className="text-muted-foreground mb-2">
                            {c.vettura?.marca} {c.vettura?.modello} <span className="font-mono text-xs">({c.vettura?.targa})</span>
                          </div>
                          {c.importo != null && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Importo</span>
                              <span className="font-bold text-lg">€ {c.importo.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {c.note && <p className="mt-2 text-xs text-muted-foreground italic">{c.note}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>

              {/* ── Tab Note ── */}
              <TabsContent value="note">
                {editNote ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full min-h-[120px] p-3 rounded-lg border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                      value={noteValue}
                      onChange={e => setNoteValue(e.target.value)}
                      placeholder="Note sul cliente..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveNote} disabled={updateCliente.isPending}>Salva</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditNote(false)}>Annulla</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {cliente!.note ? (
                      <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground whitespace-pre-wrap">{cliente!.note}</div>
                    ) : (
                      <EmptyState icon={FileText} testo="Nessuna nota per questo cliente." />
                    )}
                    <Button
                      variant="outline" size="sm" className="mt-3 gap-1.5"
                      onClick={() => { setNoteValue(cliente!.note ?? ""); setEditNote(true); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" /> {cliente!.note ? "Modifica note" : "Aggiungi note"}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.FC<{ className?: string }>; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${colors[color] ?? colors.neutral}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function StatoBadge({ stato }: { stato: string }) {
  const map: Record<string, string> = {
    attiva: "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800",
    in_corso: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800",
    completata: "bg-gray-500/10 text-gray-700 border-gray-200 dark:text-gray-400 dark:border-gray-700",
    annullata: "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800",
  };
  const labels: Record<string, string> = {
    attiva: "Attiva", in_corso: "In corso", completata: "Completata", annullata: "Annullata"
  };
  return (
    <Badge variant="outline" className={`text-xs ${map[stato] ?? ""}`}>{labels[stato] ?? stato}</Badge>
  );
}

function EmptyState({ icon: Icon, testo }: { icon: React.FC<{ className?: string }>; testo: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="w-8 h-8 mb-2 opacity-30" />
      <p className="text-sm italic">{testo}</p>
    </div>
  );
}
