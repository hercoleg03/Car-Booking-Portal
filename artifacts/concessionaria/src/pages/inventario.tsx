import { useState, useRef, useCallback } from "react";
import { useListVetture, useCreateVettura, getListVettureQueryKey } from "@workspace/api-client-react";
import { Plus, Search, Car as CarIcon, CheckCircle2, XCircle, MoreVertical, Upload, X, Image as ImageIcon } from "lucide-react";
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
import { getApiBaseUrl } from "@/lib/api-base";

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

interface PhotoFile {
  file: File;
  preview: string;
}

function PhotoUploadArea({
  photos,
  onAdd,
  onRemove,
}: {
  photos: PhotoFile[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) onAdd(files);
    },
    [onAdd]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">
          Trascina le foto qui o <span className="text-primary">clicca per selezionare</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">Massimo 5 foto per volta, solo immagini</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onAdd(files);
            e.target.value = "";
          }}
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative group aspect-square">
              <img
                src={p.preview}
                alt={`Anteprima ${i + 1}`}
                className="w-full h-full object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Inventario() {
  const [carburante, setCarburante] = useState<string>("all");
  const [stato, setStato] = useState<string>("all");
  const [disponibile, setDisponibile] = useState<string>("all");
  const [searchTarga, setSearchTarga] = useState("");
  const [marca, setMarca] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [createdVetturaId, setCreatedVetturaId] = useState<number | null>(null);
  const [step, setStep] = useState<"form" | "photos">("form");

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

  function handleAddPhotos(files: File[]) {
    const newPhotos: PhotoFile[] = files.slice(0, 5 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }

  function onSubmit(data: VetturaFormValues) {
    createVettura.mutate({ data }, {
      onSuccess: (vettura) => {
        setCreatedVetturaId(vettura.id);
        setStep("photos");
      },
      onError: () => {
        toast({ title: "Errore durante l'aggiunta", variant: "destructive" });
      }
    });
  }

  async function handleUploadPhotos() {
    if (!createdVetturaId) return;

    if (photos.length === 0) {
      finishAndClose();
      return;
    }

    setIsUploadingPhotos(true);
    try {
      const formData = new FormData();
      photos.forEach((p) => formData.append("foto", p.file));

      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/vetture/${createdVetturaId}/foto`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Errore upload foto");

      queryClient.invalidateQueries({ queryKey: getListVettureQueryKey() });
      toast({ title: `Vettura aggiunta con ${photos.length} foto` });
      finishAndClose();
    } catch {
      toast({ title: "Errore durante l'upload delle foto. Riprova.", variant: "destructive" });
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  function finishAndClose() {
    queryClient.invalidateQueries({ queryKey: getListVettureQueryKey() });
    setIsAddOpen(false);
    form.reset();
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setStep("form");
    setCreatedVetturaId(null);
    if (step === "form") {
      toast({ title: "Vettura aggiunta con successo" });
    }
  }

  function handleDialogChange(open: boolean) {
    if (!open) {
      form.reset();
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setStep("form");
      setCreatedVetturaId(null);
    }
    setIsAddOpen(open);
  }

  const apiBase = getApiBaseUrl();

  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Inventario Vetture</h1>
          <p className="text-muted-foreground mt-1">Gestione flotta e disponibilità.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4" />
              Nuova Vettura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {step === "form" ? "Aggiungi Nuova Vettura" : "Carica Foto Vettura"}
              </DialogTitle>
              {step === "photos" && (
                <p className="text-sm text-muted-foreground">
                  Vettura creata. Ora puoi caricare fino a 5 foto oppure saltare questo passaggio.
                </p>
              )}
            </DialogHeader>

            {step === "form" ? (
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
                    <Button type="submit" disabled={createVettura.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {createVettura.isPending ? "Salvataggio..." : "Avanti: Aggiungi Foto →"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <PhotoUploadArea
                  photos={photos}
                  onAdd={handleAddPhotos}
                  onRemove={handleRemovePhoto}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={finishAndClose}>
                    Salta
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUploadPhotos}
                    disabled={isUploadingPhotos}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isUploadingPhotos
                      ? "Caricamento..."
                      : photos.length === 0
                      ? "Salva senza foto"
                      : `Carica ${photos.length} foto`}
                  </Button>
                </DialogFooter>
              </div>
            )}
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
              filteredVetture?.map((v) => {
                const primaFoto = v.foto && v.foto.length > 0 ? v.foto[0] : null;
                const fotoUrl = primaFoto ? `${apiBase}${primaFoto}` : null;
                return (
                  <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border bg-muted flex items-center justify-center shrink-0">
                          {fotoUrl ? (
                            <img
                              src={fotoUrl}
                              alt={`${v.marca} ${v.modello}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CarIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{v.marca} {v.modello}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                            Anno {v.anno} {v.colore ? `• ${v.colore}` : ''}
                            {v.foto && v.foto.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-indigo-500">
                                <ImageIcon className="w-3 h-3" />
                                {v.foto.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-muted/50 text-base">{v.targa}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="secondary" className="capitalize bg-indigo-500/10 text-indigo-700 border-indigo-200 hover:bg-indigo-500/20">{v.carburante}</Badge>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
