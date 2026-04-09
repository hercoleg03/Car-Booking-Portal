import { useState } from "react";
import { useListContratti, useCreateContratto, getListContrattiQueryKey, useListVetture, useListClienti, useUpdateContratto } from "@workspace/api-client-react";
import { Plus, Search, FileText, CheckCircle2, Archive, Handshake } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const contrattoSchema = z.object({
  vetturaId: z.coerce.number().min(1, "Vettura richiesta"),
  clienteId: z.coerce.number().min(1, "Cliente richiesto"),
  numero: z.string().min(1, "Numero contratto richiesto"),
  tipo: z.enum(["vendita", "noleggio", "leasing", "permuta"]),
  dataContratto: z.string(),
  importo: z.coerce.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

type ContrattoFormValues = z.infer<typeof contrattoSchema>;

export default function Contratti() {
  const [archiviato, setArchiviato] = useState<string>("false");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contratti, isLoading } = useListContratti({ 
    archiviato: archiviato !== "all" ? archiviato : undefined 
  });
  const { data: vetture } = useListVetture();
  const { data: clienti } = useListClienti();
  
  const createContratto = useCreateContratto();
  const updateContratto = useUpdateContratto();

  const form = useForm<ContrattoFormValues>({
    resolver: zodResolver(contrattoSchema),
    defaultValues: {
      vetturaId: 0,
      clienteId: 0,
      numero: "",
      tipo: "vendita",
      dataContratto: new Date().toISOString().split("T")[0],
      importo: 0,
      note: ""
    }
  });

  function onSubmit(data: ContrattoFormValues) {
    createContratto.mutate({ 
      data: { ...data, archiviato: false, dataContratto: new Date(data.dataContratto).toISOString() } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContrattiQueryKey() });
        setIsAddOpen(false);
        form.reset();
        toast({ title: "Contratto creato" });
      },
      onError: () => toast({ title: "Errore", variant: "destructive" })
    });
  }

  function handleArchivia(id: number) {
    updateContratto.mutate({ id, data: { archiviato: true } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContrattiQueryKey() });
        toast({ title: "Contratto archiviato" });
      }
    });
  }

  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Contratti</h1>
          <p className="text-muted-foreground mt-1">Tracciamento vendite, noleggi e pratiche.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nuovo Contratto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registra Contratto</DialogTitle>
              <DialogDescription>Compila i dati per registrare un nuovo contratto.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="numero" render={({ field }) => (
                  <FormItem><FormLabel>Numero Pratica / Contratto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="vendita">Vendita</SelectItem>
                          <SelectItem value="noleggio">Noleggio</SelectItem>
                          <SelectItem value="leasing">Leasing</SelectItem>
                          <SelectItem value="permuta">Permuta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dataContratto" render={({ field }) => (
                    <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="clienteId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {clienti?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome} {c.cognome} ({c.codiceFiscale})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="vetturaId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vettura</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleziona vettura" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vetture?.filter(v => v.disponibile).map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.marca} {v.modello} - {v.targa}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="importo" render={({ field }) => (
                  <FormItem><FormLabel>Importo (€)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Annulla</Button>
                  <Button type="submit" disabled={createContratto.isPending}>Salva Contratto</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6 shrink-0 bg-muted/40">
        <CardContent className="p-4 flex items-end gap-4">
          <div className="space-y-1.5 min-w-[200px]">
            <label className="text-sm font-medium text-muted-foreground">Stato</label>
            <Select value={archiviato} onValueChange={setArchiviato}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="false">Attivi</SelectItem>
                <SelectItem value="true">Archiviati</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Contratto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vettura</TableHead>
              <TableHead>Importo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Caricamento...</TableCell></TableRow>
            ) : contratti?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Nessun contratto trovato.</TableCell></TableRow>
            ) : (
              contratti?.map((c) => (
                <TableRow key={c.id} className={c.archiviato ? "opacity-60" : ""}>
                  <TableCell>
                    <div className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" /> N. {c.numero}
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-2 items-center mt-1">
                      <Badge variant="secondary" className="capitalize text-xs py-0 h-5">{c.tipo}</Badge>
                      {format(new Date(c.dataContratto), "dd/MM/yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{c.cliente.nome} {c.cliente.cognome}</div>
                    <div className="text-sm text-muted-foreground font-mono">{c.cliente.codiceFiscale}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{c.vettura.marca} {c.vettura.modello}</div>
                    <div className="text-sm text-muted-foreground font-mono">{c.vettura.targa}</div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.importo ? `€ ${c.importo.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>
                    {c.archiviato ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Archiviato</Badge>
                    ) : (
                      <Badge className="bg-blue-500/15 text-blue-700 border-blue-200 hover:bg-blue-500/25">Attivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!c.archiviato && (
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2" onClick={() => handleArchivia(c.id)}>
                        <Archive className="w-4 h-4" /> Archivia
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}