import { useState } from "react";
import { useListVetture, useCreateVettura, getListVettureQueryKey } from "@workspace/api-client-react";
import { Plus, Search, Car as CarIcon, Settings2, CheckCircle2, XCircle, MoreVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const vetturaSchema = z.object({
  marca: z.string().min(1, "Marca richiesta"),
  modello: z.string().min(1, "Modello richiesto"),
  anno: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  targa: z.string().min(1, "Targa richiesta"),
  carburante: z.enum(["benzina", "diesel", "elettrica", "ibrida", "gpl"]),
  stato: z.enum(["nuova", "usata", "km0"]),
  colore: z.string().optional().nullable(),
  prezzo: z.coerce.number().optional().nullable(),
  km: z.coerce.number().optional().nullable(),
  disponibile: z.boolean().default(true),
  note: z.string().optional().nullable(),
});

type VetturaFormValues = z.infer<typeof vetturaSchema>;

export default function Inventario() {
  const [carburante, setCarburante] = useState<string>("all");
  const [stato, setStato] = useState<string>("all");
  const [disponibile, setDisponibile] = useState<string>("all");
  const [searchTarga, setSearchTarga] = useState("");
  const [marca, setMarca] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    ...(carburante !== "all" && { carburante }),
    ...(stato !== "all" && { stato }),
    ...(disponibile !== "all" && { disponibile }),
    ...(marca && { marca }),
  };

  const { data: vetture, isLoading } = useListVetture(params);
  const createVettura = useCreateVettura();

  const form = useForm<VetturaFormValues>({
    resolver: zodResolver(vetturaSchema),
    defaultValues: {
      marca: "",
      modello: "",
      anno: new Date().getFullYear(),
      targa: "",
      carburante: "benzina",
      stato: "nuova",
      colore: "",
      prezzo: 0,
      km: 0,
      disponibile: true,
      note: "",
    },
  });

  const filteredVetture = vetture?.filter(v => 
    !searchTarga || v.targa.toLowerCase().includes(searchTarga.toLowerCase())
  );

  function onSubmit(data: VetturaFormValues) {
    createVettura.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVettureQueryKey() });
        setIsAddOpen(false);
        form.reset();
        toast({ title: "Vettura aggiunta con successo" });
      },
      onError: () => {
        toast({ title: "Errore durante l'aggiunta", variant: "destructive" });
      }
    });
  }

  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario Vetture</h1>
          <p className="text-muted-foreground mt-1">Gestione flotta e disponibilità.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuova Vettura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Aggiungi Nuova Vettura</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="marca" render={({ field }) => (
                    <FormItem><FormLabel>Marca</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="modello" render={({ field }) => (
                    <FormItem><FormLabel>Modello</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="targa" render={({ field }) => (
                    <FormItem><FormLabel>Targa</FormLabel><FormControl><Input {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="anno" render={({ field }) => (
                    <FormItem><FormLabel>Anno</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="carburante" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carburante</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="benzina">Benzina</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="elettrica">Elettrica</SelectItem>
                          <SelectItem value="ibrida">Ibrida</SelectItem>
                          <SelectItem value="gpl">GPL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stato" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="nuova">Nuova</SelectItem>
                          <SelectItem value="usata">Usata</SelectItem>
                          <SelectItem value="km0">Km 0</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="km" render={({ field }) => (
                    <FormItem><FormLabel>Chilometraggio</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="prezzo" render={({ field }) => (
                    <FormItem><FormLabel>Prezzo (€)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Annulla</Button>
                  <Button type="submit" disabled={createVettura.isPending}>
                    {createVettura.isPending ? "Salvataggio..." : "Salva Vettura"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6 shrink-0 bg-muted/40">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Search className="w-4 h-4" /> Cerca per Targa
              </label>
              <Input 
                placeholder="es. AB123CD" 
                value={searchTarga} 
                onChange={(e) => setSearchTarga(e.target.value)}
                className="bg-background"
              />
            </div>
            
            <div className="space-y-1.5 min-w-[150px]">
              <label className="text-sm font-medium text-muted-foreground">Marca</label>
              <Input 
                placeholder="es. Fiat" 
                value={marca} 
                onChange={(e) => setMarca(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5 min-w-[150px]">
              <label className="text-sm font-medium text-muted-foreground">Carburante</label>
              <Select value={carburante} onValueChange={setCarburante}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="benzina">Benzina</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="elettrica">Elettrica</SelectItem>
                  <SelectItem value="ibrida">Ibrida</SelectItem>
                  <SelectItem value="gpl">GPL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-[150px]">
              <label className="text-sm font-medium text-muted-foreground">Stato</label>
              <Select value={stato} onValueChange={setStato}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="nuova">Nuova</SelectItem>
                  <SelectItem value="usata">Usata</SelectItem>
                  <SelectItem value="km0">Km 0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-[150px]">
              <label className="text-sm font-medium text-muted-foreground">Disponibilità</label>
              <Select value={disponibile} onValueChange={setDisponibile}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="true">Disponibile</SelectItem>
                  <SelectItem value="false">Non Disponibile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" className="shrink-0" onClick={() => {
              setCarburante("all"); setStato("all"); setDisponibile("all"); setSearchTarga(""); setMarca("");
            }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead>Vettura</TableHead>
              <TableHead>Targa</TableHead>
              <TableHead>Carburante / Stato</TableHead>
              <TableHead>Prezzo / Km</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Caricamento inventario...</TableCell></TableRow>
            ) : filteredVetture?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Nessuna vettura trovata con questi filtri.</TableCell></TableRow>
            ) : (
              filteredVetture?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <CarIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{v.marca} {v.modello}</div>
                        <div className="text-sm text-muted-foreground">Anno {v.anno} {v.colore ? `• ${v.colore}` : ''}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono bg-muted/50 text-base">{v.targa}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="secondary" className="capitalize">{v.carburante}</Badge>
                      <Badge variant="outline" className="capitalize text-muted-foreground">{v.stato}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{v.prezzo ? `€ ${v.prezzo.toLocaleString()}` : '-'}</div>
                    <div className="text-sm text-muted-foreground">{v.km ? `${v.km.toLocaleString()} km` : '-'}</div>
                  </TableCell>
                  <TableCell>
                    {v.disponibile ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200 gap-1.5 px-2 py-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Disponibile
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 border-rose-200 gap-1.5 px-2 py-0.5" variant="outline">
                        <XCircle className="w-3.5 h-3.5" /> Occupata
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Modifica</DropdownMenuItem>
                        <DropdownMenuItem>Vedi Storico</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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