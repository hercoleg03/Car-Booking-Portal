import { useState } from "react";
import {
  useListPrenotazioni, useCreatePrenotazione, useUpdatePrenotazione, useDeletePrenotazione,
  getListPrenotazioniQueryKey, useListVetture, useListClienti
} from "@workspace/api-client-react";
import { Plus, Search, Calendar as CalendarIcon, XCircle, Clock, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface PrenotazioneFormValues {
  vetturaId: number;
  clienteId: number;
  dataInizio: string;
  dataFine: string;
  stato: string;
  note: string;
}

const emptyForm = (): PrenotazioneFormValues => ({
  vetturaId: 0,
  clienteId: 0,
  dataInizio: new Date().toISOString().split("T")[0],
  dataFine: new Date(Date.now() + 86400000).toISOString().split("T")[0],
  stato: "attiva",
  note: "",
});

function getStatoBadge(s: string) {
  switch (s) {
    case "attiva":
      return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200">Attiva</Badge>;
    case "in_corso":
      return <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 border-rose-200"><Clock className="w-3 h-3 mr-1" /> In Corso</Badge>;
    case "completata":
      return <Badge variant="outline" className="text-slate-600 bg-slate-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Completata</Badge>;
    case "annullata":
      return <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50"><XCircle className="w-3 h-3 mr-1" /> Annullata</Badge>;
    default:
      return <Badge>{s}</Badge>;
  }
}

export default function Prenotazioni() {
  const [stato, setStato] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PrenotazioneFormValues>(emptyForm());

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: prenotazioni, isLoading } = useListPrenotazioni({
    stato: stato !== "all" ? stato : undefined,
  });
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

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(p: NonNullable<typeof prenotazioni>[0]) {
    setEditingId(p.id);
    setForm({
      vetturaId: p.vettura.id,
      clienteId: p.cliente.id,
      dataInizio: p.dataInizio.split("T")[0],
      dataFine: p.dataFine.split("T")[0],
      stato: p.stato,
      note: "",
    });
    setFormOpen(true);
  }

  function handleSave() {
    if (!form.vetturaId || !form.clienteId) {
      toast({ title: "Compila vettura e cliente", variant: "destructive" });
      return;
    }
    const payload = {
      vetturaId: form.vetturaId,
      clienteId: form.clienteId,
      dataInizio: form.dataInizio + "T00:00:00",
      dataFine: form.dataFine + "T00:00:00",
      stato: form.stato as "attiva" | "in_corso" | "completata" | "annullata",
      note: form.note || null,
    };

    if (editingId) {
      updatePrenotazione.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
            setFormOpen(false);
            toast({ title: "Prenotazione aggiornata" });
          },
          onError: () => toast({ title: "Errore aggiornamento", variant: "destructive" }),
        }
      );
    } else {
      createPrenotazione.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
            setFormOpen(false);
            toast({ title: "Prenotazione creata" });
          },
          onError: () => toast({ title: "Errore creazione", variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete() {
    if (!deleteId) return;
    deletePrenotazione.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
          setDeleteId(null);
          toast({ title: "Prenotazione eliminata" });
        },
        onError: () => toast({ title: "Errore eliminazione", variant: "destructive" }),
      }
    );
  }

  function handleQuickStatus(id: number, newStato: string) {
    updatePrenotazione.mutate(
      { id, data: { stato: newStato as "attiva" | "in_corso" | "completata" | "annullata" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
          toast({ title: "Stato aggiornato" });
        },
        onError: () => toast({ title: "Errore", variant: "destructive" }),
      }
    );
  }

  const isPending = createPrenotazione.isPending || updatePrenotazione.isPending;

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden gap-4">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestione Prenotazioni</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Lista impegni e allocazione flotta.</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuova Prenotazione
        </Button>
      </div>

      {/* Filters */}
      <Card className="shrink-0 bg-muted/40">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-9 bg-background h-9 text-sm"
              placeholder="Targa, cliente, telefono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={stato} onValueChange={setStato}>
            <SelectTrigger className="bg-background w-[160px] h-9">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="attiva">Attiva</SelectItem>
              <SelectItem value="in_corso">In Corso</SelectItem>
              <SelectItem value="completata">Completata</SelectItem>
              <SelectItem value="annullata">Annullata</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || stato !== "all") && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground"
              onClick={() => { setSearchQuery(""); setStato("all"); }}>
              Azzera
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <div className="bg-card border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Periodo</TableHead>
              <TableHead>Vettura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Caricamento...</TableCell>
              </TableRow>
            ) : !filtered || filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Nessuna prenotazione trovata.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{format(new Date(p.dataInizio), "dd/MM/yyyy")}</span>
                        <span className="text-muted-foreground/50">→</span>
                        <span>{format(new Date(p.dataFine), "dd/MM/yyyy")}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-sm">{p.vettura.marca} {p.vettura.modello}</div>
                    <div className="font-mono text-xs text-muted-foreground">{p.vettura.targa}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{p.cliente.nome} {p.cliente.cognome}</div>
                    {p.cliente.telefono && (
                      <div className="text-xs text-muted-foreground">{p.cliente.telefono}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={p.stato}
                      onValueChange={v => handleQuickStatus(p.id, v)}
                    >
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
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Modifica"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Elimina"
                        onClick={() => setDeleteId(p.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={formOpen} onOpenChange={open => !open && setFormOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifica Prenotazione" : "Nuova Prenotazione"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={form.clienteId ? form.clienteId.toString() : ""}
                onValueChange={v => setForm(f => ({ ...f, clienteId: Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                <SelectContent>
                  {clienti?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nome} {c.cognome} ({c.codiceFiscale})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Vettura</Label>
              <Select
                value={form.vetturaId ? form.vetturaId.toString() : ""}
                onValueChange={v => setForm(f => ({ ...f, vetturaId: Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleziona vettura" /></SelectTrigger>
                <SelectContent>
                  {vetture?.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.marca} {v.modello} — {v.targa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dal</Label>
                <Input
                  type="date"
                  value={form.dataInizio}
                  onChange={e => setForm(f => ({ ...f, dataInizio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Al</Label>
                <Input
                  type="date"
                  value={form.dataFine}
                  onChange={e => setForm(f => ({ ...f, dataFine: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select
                value={form.stato}
                onValueChange={v => setForm(f => ({ ...f, stato: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attiva">Attiva (Futura)</SelectItem>
                  <SelectItem value="in_corso">In Corso</SelectItem>
                  <SelectItem value="completata">Completata</SelectItem>
                  <SelectItem value="annullata">Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvataggio..." : editingId ? "Salva Modifiche" : "Crea Prenotazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la prenotazione?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. La prenotazione verrà eliminata definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deletePrenotazione.isPending}
            >
              {deletePrenotazione.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
