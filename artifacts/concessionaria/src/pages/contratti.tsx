import { useState, useEffect } from "react";
import {
  useListContratti, useCreateContratto, useUpdateContratto, useDeleteContratto,
  getListContrattiQueryKey, useListVetture, useListClienti,
} from "@workspace/api-client-react";
import {
  Plus, FileText, Archive, Download, User, UserPlus, Pencil, Trash2,
  CalendarDays, Car, Search, ChevronDown,
} from "lucide-react";
import { generaContrattoNoleggioPDF } from "@/lib/genera-contratto-pdf";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  nomeLiberoMode: z.boolean(),
  clienteId: z.coerce.number().optional().nullable(),
  nomeLibero: z.string().optional().nullable(),
  cognomeLibero: z.string().optional().nullable(),
  vetturaId: z.coerce.number().min(1, "Vettura richiesta"),
  numero: z.string().min(1, "Numero richiesto"),
  tipo: z.enum(["vendita", "noleggio", "leasing", "permuta"]),
  dataContratto: z.string().min(1, "Data richiesta"),
  dataInizio: z.string().optional().nullable(),
  dataFine: z.string().optional().nullable(),
  stato: z.string().optional().nullable(),
  importo: z.coerce.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

function emptyForm(): FormValues {
  return {
    nomeLiberoMode: false,
    clienteId: null,
    nomeLibero: "",
    cognomeLibero: "",
    vetturaId: 0,
    numero: "",
    tipo: "noleggio",
    dataContratto: new Date().toISOString().split("T")[0],
    dataInizio: "",
    dataFine: "",
    stato: "attiva",
    importo: null,
    note: "",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  vendita: "Vendita", noleggio: "Noleggio", leasing: "Leasing", permuta: "Permuta",
};
const STATO_COLORS: Record<string, string> = {
  attiva:     "bg-blue-500/10 text-blue-700 border-blue-200",
  in_corso:   "bg-green-500/10 text-green-700 border-green-200",
  completata: "bg-gray-500/10 text-gray-600 border-gray-200",
  annullata:  "bg-red-500/10 text-red-600 border-red-200",
};
const STATO_LABEL: Record<string, string> = {
  attiva: "Attiva", in_corso: "In corso", completata: "Completata", annullata: "Annullata",
};

function nomeCliente(c: any): string {
  if ((c as any).nomeLibero || (c as any).cognomeLibero) {
    return `${(c as any).nomeLibero ?? ""} ${(c as any).cognomeLibero ?? ""}`.trim();
  }
  const cl = (c as any).cliente;
  if (cl?.nome || cl?.cognome) return `${cl.nome ?? ""} ${cl.cognome ?? ""}`.trim();
  return "—";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: it }); } catch { return d; }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Contratti() {
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroStato, setFiltroStato] = useState("all");
  const [filtroArchiviato, setFiltroArchiviato] = useState("false");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contratti, isLoading } = useListContratti({
    archiviato: filtroArchiviato !== "all" ? filtroArchiviato : undefined,
  });
  const { data: vetture } = useListVetture();
  const { data: clienti } = useListClienti();

  const createContratto = useCreateContratto();
  const updateContratto = useUpdateContratto();
  const deleteContratto = useDeleteContratto();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm(),
  });

  const tipo = form.watch("tipo");
  const nomeLiberoMode = form.watch("nomeLiberoMode");
  const hasDate = tipo === "noleggio" || tipo === "leasing";

  useEffect(() => {
    if (!dialogOpen) {
      form.reset(emptyForm());
      setEditingId(null);
    }
  }, [dialogOpen]);

  function openEdit(c: any) {
    const isLibero = !c.clienteId || c.clienteId == null;
    form.reset({
      nomeLiberoMode: isLibero,
      clienteId: isLibero ? null : c.clienteId,
      nomeLibero: c.nomeLibero ?? "",
      cognomeLibero: c.cognomeLibero ?? "",
      vetturaId: c.vetturaId,
      numero: c.numero,
      tipo: c.tipo,
      dataContratto: c.dataContratto?.split("T")[0] ?? "",
      dataInizio: c.dataInizio ?? "",
      dataFine: c.dataFine ?? "",
      stato: c.stato ?? "attiva",
      importo: c.importo ?? null,
      note: c.note ?? "",
    });
    setEditingId(c.id);
    setDialogOpen(true);
  }

  function onSubmit(data: FormValues) {
    if (data.nomeLiberoMode) {
      if (!data.nomeLibero?.trim() && !data.cognomeLibero?.trim()) {
        toast({ title: "Inserisci nome o cognome del cliente", variant: "destructive" });
        return;
      }
    } else {
      if (!data.clienteId || data.clienteId <= 0) {
        toast({ title: "Seleziona un cliente", variant: "destructive" });
        return;
      }
    }

    const { nomeLiberoMode, ...rest } = data;
    const payload = {
      ...rest,
      clienteId: nomeLiberoMode ? null : (rest.clienteId ?? null),
      nomeLibero: nomeLiberoMode ? (rest.nomeLibero || null) : null,
      cognomeLibero: nomeLiberoMode ? (rest.cognomeLibero || null) : null,
      dataContratto: new Date(rest.dataContratto).toISOString(),
      dataInizio: hasDate && rest.dataInizio ? rest.dataInizio : null,
      dataFine: hasDate && rest.dataFine ? rest.dataFine : null,
      stato: rest.stato || null,
      archiviato: false,
    };

    if (editingId) {
      updateContratto.mutate({ id: editingId, data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContrattiQueryKey() });
          setDialogOpen(false);
          toast({ title: "Contratto aggiornato" });
        },
        onError: () => toast({ title: "Errore nell'aggiornamento", variant: "destructive" }),
      });
    } else {
      createContratto.mutate({ data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContrattiQueryKey() });
          setDialogOpen(false);
          toast({ title: "Contratto creato" });
        },
        onError: () => toast({ title: "Errore nella creazione", variant: "destructive" }),
      });
    }
  }

  function handleArchivia(id: number, archiviato: boolean) {
    updateContratto.mutate({ id, data: { archiviato } as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContrattiQueryKey() });
        toast({ title: archiviato ? "Contratto archiviato" : "Contratto ripristinato" });
      },
    });
  }

  function handleSetStato(id: number, stato: string) {
    updateContratto.mutate({ id, data: { stato } as any }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListContrattiQueryKey() }),
    });
  }

  function handleDelete(id: number) {
    deleteContratto.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContrattiQueryKey() });
        toast({ title: "Contratto eliminato" });
      },
      onError: () => toast({ title: "Errore nell'eliminazione", variant: "destructive" }),
    });
  }

  const filtered = contratti?.filter(c => {
    const q = search.toLowerCase();
    const nome = nomeCliente(c).toLowerCase();
    const targa = (c as any).vettura?.targa?.toLowerCase() ?? "";
    const num = c.numero?.toLowerCase() ?? "";
    const matchSearch = !q || nome.includes(q) || targa.includes(q) || num.includes(q);
    const matchTipo = filtroTipo === "all" || c.tipo === filtroTipo;
    const stato = (c as any).stato ?? "";
    const matchStato = filtroStato === "all" || stato === filtroStato;
    return matchSearch && matchTipo && matchStato;
  });

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden gap-4">

      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratti</h1>
          <p className="text-muted-foreground mt-1">Gestione noleggi, vendite e pratiche.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Nuovo Contratto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifica Contratto" : "Nuovo Contratto"}</DialogTitle>
              <DialogDescription>Compila i dati del contratto.</DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-2">

                {/* Tipo + Numero + Data */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="noleggio">Noleggio</SelectItem>
                          <SelectItem value="vendita">Vendita</SelectItem>
                          <SelectItem value="leasing">Leasing</SelectItem>
                          <SelectItem value="permuta">Permuta</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="numero" render={({ field }) => (
                    <FormItem>
                      <FormLabel>N. Pratica / Contratto</FormLabel>
                      <FormControl><Input placeholder="es. 2025/001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="dataContratto" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data contratto</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stato" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "attiva"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="attiva">Attiva</SelectItem>
                          <SelectItem value="in_corso">In corso</SelectItem>
                          <SelectItem value="completata">Completata</SelectItem>
                          <SelectItem value="annullata">Annullata</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <Separator />

                {/* Date noleggio (solo per noleggio/leasing) */}
                {hasDate && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" /> Periodo noleggio
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="dataInizio" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data inizio</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="dataFine" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data fine</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}

                <Separator />

                {/* Cliente */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Cliente</span>
                    <div className="flex rounded-md border text-xs overflow-hidden">
                      <button type="button"
                        onClick={() => form.setValue("nomeLiberoMode", false)}
                        className={`flex items-center gap-1 px-2.5 py-1 font-medium transition-colors ${!nomeLiberoMode ? "bg-foreground text-background" : "hover:bg-muted"}`}
                      >
                        <User className="w-3 h-3" /> Salvato
                      </button>
                      <button type="button"
                        onClick={() => form.setValue("nomeLiberoMode", true)}
                        className={`flex items-center gap-1 px-2.5 py-1 font-medium transition-colors border-l ${nomeLiberoMode ? "bg-foreground text-background" : "hover:bg-muted"}`}
                      >
                        <UserPlus className="w-3 h-3" /> Nome libero
                      </button>
                    </div>
                  </div>
                  {!nomeLiberoMode ? (
                    <FormField control={form.control} name="clienteId" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() ?? ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {clienti?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.nome} {c.cognome}{c.codiceFiscale ? ` (${c.codiceFiscale})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="nomeLibero" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="Nome" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="cognomeLibero" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="Cognome" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                    </div>
                  )}
                </div>

                {/* Vettura */}
                <FormField control={form.control} name="vetturaId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Vettura</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleziona vettura" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vetture?.map(v => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            {v.marca} {v.modello} — {v.targa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator />

                {/* Importo + Note */}
                <FormField control={form.control} name="importo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo totale (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value === "" ? null : e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="note" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
                  <Button type="submit" disabled={createContratto.isPending || updateContratto.isPending}>
                    {editingId ? "Salva modifiche" : "Crea contratto"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtri */}
      <Card className="shrink-0 bg-muted/40">
        <CardContent className="p-3 flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9 bg-background"
              placeholder="Cerca cliente, targa, n. contratto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Tipo</label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-9 w-36 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="noleggio">Noleggio</SelectItem>
                <SelectItem value="vendita">Vendita</SelectItem>
                <SelectItem value="leasing">Leasing</SelectItem>
                <SelectItem value="permuta">Permuta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Stato</label>
            <Select value={filtroStato} onValueChange={setFiltroStato}>
              <SelectTrigger className="h-9 w-36 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="attiva">Attiva</SelectItem>
                <SelectItem value="in_corso">In corso</SelectItem>
                <SelectItem value="completata">Completata</SelectItem>
                <SelectItem value="annullata">Annullata</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Archivio</label>
            <Select value={filtroArchiviato} onValueChange={setFiltroArchiviato}>
              <SelectTrigger className="h-9 w-36 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Attivi</SelectItem>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="true">Archiviati</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabella */}
      <div className="bg-card border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Contratto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vettura</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Importo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Caricamento...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Nessun contratto trovato.</TableCell></TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id} className={(c.archiviato ? "opacity-60 " : "") + "group"}>
                <TableCell>
                  <div className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    N.&nbsp;{c.numero}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="capitalize text-xs py-0 h-5">
                      {TIPO_LABEL[c.tipo] ?? c.tipo}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{fmtDate(c.dataContratto)}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="font-medium">{nomeCliente(c)}</div>
                  {(c as any).cliente?.codiceFiscale && (
                    <div className="text-xs text-muted-foreground font-mono">{(c as any).cliente.codiceFiscale}</div>
                  )}
                  {((c as any).nomeLibero || (c as any).cognomeLibero) && (
                    <div className="text-[11px] text-muted-foreground italic">nome libero</div>
                  )}
                </TableCell>

                <TableCell>
                  <div className="font-medium">{(c as any).vettura?.marca} {(c as any).vettura?.modello}</div>
                  <div className="text-xs text-muted-foreground font-mono">{(c as any).vettura?.targa}</div>
                </TableCell>

                <TableCell>
                  {(c as any).dataInizio && (c as any).dataFine ? (
                    <div className="text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <CalendarDays className="w-3 h-3" />
                        {fmtDate((c as any).dataInizio)}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <ChevronDown className="w-3 h-3" />
                        {fmtDate((c as any).dataFine)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>

                <TableCell className="font-medium">
                  {c.importo ? `€ ${Number(c.importo).toLocaleString("it-IT")}` : "—"}
                </TableCell>

                <TableCell>
                  {c.archiviato ? (
                    <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Archiviato</Badge>
                  ) : (
                    <Select
                      value={(c as any).stato ?? "attiva"}
                      onValueChange={(v) => handleSetStato(c.id, v)}
                    >
                      <SelectTrigger className={`h-7 text-xs w-32 border ${STATO_COLORS[(c as any).stato ?? ""] ?? "bg-background"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attiva">Attiva</SelectItem>
                        <SelectItem value="in_corso">In corso</SelectItem>
                        <SelectItem value="completata">Completata</SelectItem>
                        <SelectItem value="annullata">Annullata</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm"
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10 gap-1.5 h-7 text-xs"
                      onClick={() => {
                        generaContrattoNoleggioPDF({
                          ...c as any,
                          dataInizio: (c as any).dataInizio ?? null,
                          dataFine: (c as any).dataFine ?? null,
                        });
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Modifica" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!c.archiviato ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                        title="Archivia" onClick={() => handleArchivia(c.id, true)}>
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-green-600"
                        title="Ripristina" onClick={() => handleArchivia(c.id, false)}>
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Elimina" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Conferma eliminazione */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo contratto?</AlertDialogTitle>
            <AlertDialogDescription>L'operazione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}>
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
