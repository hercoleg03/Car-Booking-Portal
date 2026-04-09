import { useState } from "react";
import { useListPrenotazioni, useCreatePrenotazione, getListPrenotazioniQueryKey, useListVetture, useListClienti } from "@workspace/api-client-react";
import { Plus, Search, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const prenotazioneSchema = z.object({
  vetturaId: z.coerce.number().min(1, "Vettura richiesta"),
  clienteId: z.coerce.number().min(1, "Cliente richiesto"),
  dataInizio: z.string().min(1, "Data inizio richiesta"),
  dataFine: z.string().min(1, "Data fine richiesta"),
  stato: z.enum(["attiva", "in_corso", "completata", "annullata"]),
  note: z.string().optional().nullable(),
});

type PrenotazioneFormValues = z.infer<typeof prenotazioneSchema>;

export default function Prenotazioni() {
  const [stato, setStato] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: prenotazioni, isLoading } = useListPrenotazioni({ 
    stato: stato !== "all" ? stato : undefined 
  });
  const { data: vetture } = useListVetture();
  const { data: clienti } = useListClienti();
  
  const createPrenotazione = useCreatePrenotazione();

  const form = useForm<PrenotazioneFormValues>({
    resolver: zodResolver(prenotazioneSchema),
    defaultValues: {
      vetturaId: 0,
      clienteId: 0,
      dataInizio: new Date().toISOString().split("T")[0],
      dataFine: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      stato: "attiva",
      note: ""
    }
  });

  function onSubmit(data: PrenotazioneFormValues) {
    createPrenotazione.mutate({ 
      data: { 
        ...data, 
        dataInizio: new Date(data.dataInizio).toISOString(),
        dataFine: new Date(data.dataFine).toISOString()
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
        setIsAddOpen(false);
        form.reset();
        toast({ title: "Prenotazione creata" });
      },
      onError: () => toast({ title: "Errore", variant: "destructive" })
    });
  }

  const getStatoBadge = (s: string) => {
    switch (s) {
      case 'attiva': return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200">Attiva</Badge>;
      case 'in_corso': return <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 border-blue-200"><Clock className="w-3 h-3 mr-1"/> In Corso</Badge>;
      case 'completata': return <Badge variant="outline" className="text-slate-600 bg-slate-100">Completata</Badge>;
      case 'annullata': return <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50"><XCircle className="w-3 h-3 mr-1"/> Annullata</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Prenotazioni</h1>
          <p className="text-muted-foreground mt-1">Lista impegni e allocazione flotta.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nuova Prenotazione
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registra Prenotazione</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
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
                        {vetture?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.marca} {v.modello} - {v.targa}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="dataInizio" render={({ field }) => (
                    <FormItem><FormLabel>Dal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dataFine" render={({ field }) => (
                    <FormItem><FormLabel>Al</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="stato" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="attiva">Attiva (Futura)</SelectItem>
                        <SelectItem value="in_corso">In Corso</SelectItem>
                        <SelectItem value="completata">Completata</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Annulla</Button>
                  <Button type="submit" disabled={createPrenotazione.isPending}>Salva Prenotazione</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6 shrink-0 bg-muted/40">
        <CardContent className="p-4 flex items-end gap-4">
          <div className="space-y-1.5 min-w-[200px]">
            <label className="text-sm font-medium text-muted-foreground">Filtro Stato</label>
            <Select value={stato} onValueChange={setStato}>
              <SelectTrigger className="bg-background">
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
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Periodo</TableHead>
              <TableHead>Vettura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Caricamento...</TableCell></TableRow>
            ) : prenotazioni?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Nessuna prenotazione trovata.</TableCell></TableRow>
            ) : (
              prenotazioni?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" /> <strong>Dal:</strong> {format(new Date(p.dataInizio), "dd/MM/yyyy")}</div>
                      <div className="flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" /> <strong>Al:</strong> {format(new Date(p.dataFine), "dd/MM/yyyy")}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground">{p.vettura.marca} {p.vettura.modello}</div>
                    <div className="font-mono text-sm text-muted-foreground">{p.vettura.targa}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.cliente.nome} {p.cliente.cognome}</div>
                    {p.cliente.telefono && <div className="text-sm text-muted-foreground">{p.cliente.telefono}</div>}
                  </TableCell>
                  <TableCell>
                    {getStatoBadge(p.stato)}
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