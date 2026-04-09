import { useState } from "react";
import { useListClienti, useCreateCliente, getListClientiQueryKey, useGetClienteStorico } from "@workspace/api-client-react";
import { Plus, Search, User, Mail, Phone, MapPin, FileText, Calendar as CalendarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

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

export default function Clienti() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clienti, isLoading } = useListClienti({ search: search || undefined });
  const createCliente = useCreateCliente();

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: "", cognome: "", email: "", telefono: "", codiceFiscale: "", indirizzo: "", note: ""
    },
  });

  function onSubmit(data: ClienteFormValues) {
    createCliente.mutate({ data: { ...data, email: data.email || null, codiceFiscale: data.codiceFiscale || null } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientiQueryKey() });
        setIsAddOpen(false);
        form.reset();
        toast({ title: "Cliente aggiunto con successo" });
      },
      onError: () => toast({ title: "Errore", variant: "destructive" })
    });
  }

  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anagrafica Clienti</h1>
          <p className="text-muted-foreground mt-1">Gestione clienti, contatti e storico attività.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nuovo Cliente
            </Button>
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

      <Card className="mb-6 shrink-0 bg-muted/40">
        <CardContent className="p-4 flex items-end gap-4">
          <div className="space-y-1.5 flex-1 max-w-md">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="w-4 h-4" /> Ricerca Libera
            </label>
            <Input placeholder="Nome, cognome, email, CF..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-background" />
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contatti</TableHead>
              <TableHead>Codice Fiscale</TableHead>
              <TableHead>Registrazione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Caricamento clienti...</TableCell></TableRow>
            ) : clienti?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Nessun cliente trovato.</TableCell></TableRow>
            ) : (
              clienti?.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClienteId(c.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-semibold text-primary">{c.nome[0]}{c.cognome[0]}</span>
                      </div>
                      <div className="font-semibold text-foreground">{c.nome} {c.cognome}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {c.email}</div>}
                      {c.telefono && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {c.telefono}</div>}
                      {!c.email && !c.telefono && "-"}
                    </div>
                  </TableCell>
                  <TableCell><span className="font-mono text-sm">{c.codiceFiscale || '-'}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(c.createdAt), "dd/MM/yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClienteStoricoSheet id={selectedClienteId} onClose={() => setSelectedClienteId(null)} />
    </div>
  );
}

function ClienteStoricoSheet({ id, onClose }: { id: number | null, onClose: () => void }) {
  const { data: storico, isLoading } = useGetClienteStorico(id!, { query: { enabled: !!id, queryKey: id ? getGetClienteStoricoQueryKey(id) : [] } });

  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-none overflow-y-auto">
        {isLoading || !storico ? (
          <div className="space-y-4 pt-8"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : (
          <div className="space-y-8">
            <SheetHeader>
              <SheetTitle className="text-2xl">{storico.cliente.nome} {storico.cliente.cognome}</SheetTitle>
              <div className="flex flex-col gap-2 mt-4 text-sm text-muted-foreground">
                {storico.cliente.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {storico.cliente.email}</div>}
                {storico.cliente.telefono && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {storico.cliente.telefono}</div>}
                {storico.cliente.indirizzo && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {storico.cliente.indirizzo}</div>}
                {storico.cliente.codiceFiscale && <div className="flex items-center gap-2"><User className="w-4 h-4" /> {storico.cliente.codiceFiscale}</div>}
              </div>
            </SheetHeader>

            <Separator />

            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-primary" /> Prenotazioni</h3>
              {storico.prenotazioni.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nessuna prenotazione nello storico.</p>
              ) : (
                <div className="space-y-3">
                  {storico.prenotazioni.map(p => (
                    <Card key={p.id} className="bg-muted/30">
                      <CardContent className="p-3 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{p.vettura.marca} {p.vettura.modello} <span className="text-muted-foreground">({p.vettura.targa})</span></span>
                          <Badge variant="outline" className={
                            p.stato === 'attiva' ? 'bg-green-500/10 text-green-700' :
                            p.stato === 'completata' ? 'bg-gray-500/10 text-gray-700' :
                            p.stato === 'in_corso' ? 'bg-blue-500/10 text-blue-700' :
                            'bg-red-500/10 text-red-700'
                          }>{p.stato}</Badge>
                        </div>
                        <div className="text-muted-foreground">
                          {format(new Date(p.dataInizio), "dd/MM/yyyy")} - {format(new Date(p.dataFine), "dd/MM/yyyy")}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Contratti</h3>
              {storico.contratti.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nessun contratto nello storico.</p>
              ) : (
                <div className="space-y-3">
                  {storico.contratti.map(c => (
                    <Card key={c.id} className="bg-muted/30">
                      <CardContent className="p-3 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">N. {c.numero} <Badge variant="secondary" className="ml-2 capitalize">{c.tipo}</Badge></span>
                          <span className="text-muted-foreground">{format(new Date(c.dataContratto), "dd/MM/yyyy")}</span>
                        </div>
                        <div className="mb-2">{c.vettura.marca} {c.vettura.modello} <span className="text-muted-foreground font-mono">({c.vettura.targa})</span></div>
                        <div className="flex justify-between font-medium">
                          <span>Importo: {c.importo ? `€ ${c.importo.toLocaleString()}` : '-'}</span>
                          {c.archiviato ? <Badge variant="outline">Archiviato</Badge> : <Badge>Attivo</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}