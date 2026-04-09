import { useState } from "react";
import {
  useListManutenzioni,
  useCreateManutenzione,
  useUpdateManutenzione,
  useDeleteManutenzione,
  useListVetture,
  getListManutenzioniQueryKey,
} from "@workspace/api-client-react";
import { Plus, Search, Wrench, Pencil, Trash2, CalendarClock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TIPI = ["tagliando", "revisione", "riparazione", "carrozzeria", "altro"] as const;

const manutenzioneSchema = z.object({
  vetturaId: z.coerce.number().min(1, "Vettura richiesta"),
  tipo: z.enum(TIPI),
  data: z.string().min(1, "Data richiesta"),
  costo: z.coerce.number().optional().nullable(),
  descrizione: z.string().optional().nullable(),
  prossimaManutenzione: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

type ManutenzioneFormValues = z.infer<typeof manutenzioneSchema>;

const tipoColors: Record<string, string> = {
  tagliando: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  revisione: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  riparazione: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  carrozzeria: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  altro: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700",
};

export default function Manutenzioni() {
  const [filterVetturaId, setFilterVetturaId] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: manutenzioni, isLoading } = useListManutenzioni({
    vetturaId: filterVetturaId !== "all" ? parseInt(filterVetturaId) : undefined,
    tipo: filterTipo !== "all" ? filterTipo : undefined,
  });

  const { data: vetture } = useListVetture();

  const createManutenzione = useCreateManutenzione();
  const updateManutenzione = useUpdateManutenzione();
  const deleteManutenzione = useDeleteManutenzione();

  const form = useForm<ManutenzioneFormValues>({
    resolver: zodResolver(manutenzioneSchema),
    defaultValues: {
      vetturaId: undefined,
      tipo: "tagliando",
      data: "",
      costo: null,
      descrizione: null,
      prossimaManutenzione: null,
      note: null,
    },
  });

  function openAdd() {
    setEditingId(null);
    form.reset({
      vetturaId: undefined,
      tipo: "tagliando",
      data: new Date().toISOString().slice(0, 10),
      costo: null,
      descrizione: null,
      prossimaManutenzione: null,
      note: null,
    });
    setIsFormOpen(true);
  }

  function openEdit(m: NonNullable<typeof manutenzioni>[number]) {
    setEditingId(m.id);
    form.reset({
      vetturaId: m.vetturaId,
      tipo: m.tipo as typeof TIPI[number],
      data: m.data,
      costo: m.costo ?? null,
      descrizione: m.descrizione ?? null,
      prossimaManutenzione: m.prossimaManutenzione ?? null,
      note: m.note ?? null,
    });
    setIsFormOpen(true);
  }

  async function onSubmit(values: ManutenzioneFormValues) {
    try {
      const payload = {
        ...values,
        costo: values.costo || null,
        descrizione: values.descrizione || null,
        prossimaManutenzione: values.prossimaManutenzione || null,
        note: values.note || null,
      };

      if (editingId) {
        await updateManutenzione.mutateAsync({ id: editingId, data: payload });
        toast({ title: "Manutenzione aggiornata" });
      } else {
        await createManutenzione.mutateAsync({ data: payload });
        toast({ title: "Manutenzione registrata" });
      }

      queryClient.invalidateQueries({ queryKey: getListManutenzioniQueryKey() });
      setIsFormOpen(false);
    } catch {
      toast({ title: "Errore", description: "Operazione fallita", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteManutenzione.mutateAsync({ id: deleteId });
      toast({ title: "Manutenzione eliminata" });
      queryClient.invalidateQueries({ queryKey: getListManutenzioniQueryKey() });
    } catch {
      toast({ title: "Errore", description: "Eliminazione fallita", variant: "destructive" });
    }
    setDeleteId(null);
  }

  const filtered = manutenzioni?.filter(m => {
    if (!search) return true;
    const vetturaLabel = `${m.vettura?.marca} ${m.vettura?.modello} ${m.vettura?.targa}`.toLowerCase();
    return (
      vetturaLabel.includes(search.toLowerCase()) ||
      m.tipo.toLowerCase().includes(search.toLowerCase()) ||
      (m.descrizione ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Manutenzioni</h1>
          <p className="text-muted-foreground mt-1">Storico interventi e tagliandi per ogni veicolo</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuova Manutenzione
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca vettura, tipo, descrizione..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterVetturaId} onValueChange={setFilterVetturaId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tutte le vetture" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le vetture</SelectItem>
              {vetture?.map(v => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.marca} {v.modello} — {v.targa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tutti i tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              {TIPI.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">Caricamento...</div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Wrench className="w-12 h-12 mb-3 opacity-20" />
              <p>Nessuna manutenzione trovata.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vettura</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Prossimo intervento</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(m => {
                  const dataStr = m.data;
                  const prossimaStr = m.prossimaManutenzione ?? null;

                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.vettura?.marca} {m.vettura?.modello}</div>
                        <div className="text-xs text-muted-foreground font-mono">{m.vettura?.targa}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${tipoColors[m.tipo] ?? tipoColors.altro}`}>
                          {m.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {dataStr ? format(new Date(dataStr), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {m.costo != null ? `€ ${m.costo.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {m.descrizione ?? "—"}
                      </TableCell>
                      <TableCell>
                        {prossimaStr ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                            {format(new Date(prossimaStr), "dd/MM/yyyy")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(m.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifica Manutenzione" : "Nuova Manutenzione"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Aggiorna i dettagli dell'intervento di manutenzione." : "Registra un nuovo intervento di manutenzione per una vettura."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vetturaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vettura *</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona vettura..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vetture?.map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.marca} {v.modello} — {v.targa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPI.map(t => (
                            <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="costo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prossimaManutenzione"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prossimo intervento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descrizione"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Descrizione intervento..."
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Note aggiuntive..."
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createManutenzione.isPending || updateManutenzione.isPending}>
                  {editingId ? "Salva modifiche" : "Registra"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina manutenzione</AlertDialogTitle>
            <AlertDialogDescription>
              Questa operazione è irreversibile. Vuoi davvero eliminare questa manutenzione?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
