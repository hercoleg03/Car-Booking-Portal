import { useState, useRef } from "react";
import {
  useGetPrenotazioniCalendario, useUpdatePrenotazione, useListVetture, useListClienti,
  useCreatePrenotazione, getGetPrenotazioniCalendarioQueryKey,
} from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, GripHorizontal } from "lucide-react";
import {
  addMonths, subMonths, addWeeks, subWeeks, format, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, parseISO, addDays, differenceInDays,
  startOfWeek, endOfWeek
} from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type ViewMode = "month" | "week";

interface EditDialog {
  open: boolean;
  prenotazioneId: number | null;
  vetturaId: number;
  clienteId: number;
  dataInizio: string;
  dataFine: string;
  stato: string;
  note: string;
  isNew: boolean;
}

const defaultEdit = (): EditDialog => ({
  open: false,
  prenotazioneId: null,
  vetturaId: 0,
  clienteId: 0,
  dataInizio: new Date().toISOString().split("T")[0],
  dataFine: addDays(new Date(), 1).toISOString().split("T")[0],
  stato: "attiva",
  note: "",
  isNew: true,
});

const STATO_COLORS: Record<string, { bar: string; badge: string }> = {
  attiva:     { bar: "bg-amber-400 border-amber-500 text-amber-950 dark:text-amber-900",      badge: "bg-amber-100 text-amber-700 border-amber-300" },
  in_corso:   { bar: "bg-rose-500 border-rose-600 text-white",                                badge: "bg-rose-100 text-rose-700 border-rose-300" },
  completata: { bar: "bg-slate-400 border-slate-500 text-slate-900",                          badge: "bg-slate-100 text-slate-600 border-slate-300" },
  annullata:  { bar: "bg-slate-300 border-slate-400 text-slate-600 opacity-60",               badge: "bg-slate-100 text-slate-500 border-slate-200" },
};

function getColors(stato: string) {
  return STATO_COLORS[stato] ?? { bar: "bg-indigo-500 border-indigo-600 text-white", badge: "" };
}

export default function Calendario() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialog, setDialog] = useState<EditDialog>(defaultEdit());
  const [dragging, setDragging] = useState<{ id: number; durationDays: number } | null>(null);
  const containerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: prenotazioni, isLoading } = useGetPrenotazioniCalendario({ anno: year, mese: month });
  const { data: vetture } = useListVetture();
  const { data: clienti } = useListClienti();
  const updatePrenotazione = useUpdatePrenotazione();
  const createPrenotazione = useCreatePrenotazione();

  const goBack = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };
  const goForward = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const daysArr: Date[] =
    viewMode === "month"
      ? eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
      : eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) });

  const periodStart = daysArr[0];
  const periodEnd = daysArr[daysArr.length - 1];

  const vettureMap = new Map<number, { nome: string; targa: string; prenotazioni: NonNullable<typeof prenotazioni>[0][] }>();

  if (prenotazioni) {
    prenotazioni.forEach(p => {
      const pStart = parseISO(p.dataInizio);
      const pEnd = parseISO(p.dataFine);
      if (pEnd < periodStart || pStart > periodEnd) return;
      if (!vettureMap.has(p.vetturaId)) {
        vettureMap.set(p.vetturaId, { nome: p.vetturaNome, targa: p.targa, prenotazioni: [] });
      }
      vettureMap.get(p.vetturaId)!.prenotazioni.push(p);
    });
  }

  const headerLabel =
    viewMode === "month"
      ? format(currentDate, "MMMM yyyy", { locale: it }).toUpperCase()
      : `${format(daysArr[0], "d MMM", { locale: it })} – ${format(daysArr[6], "d MMM yyyy", { locale: it })}`.toUpperCase();

  const CELL_W = viewMode === "week" ? 80 : 40;

  function openNewBooking(vetturaId: number, day: Date) {
    setDialog({
      open: true,
      prenotazioneId: null,
      vetturaId,
      clienteId: 0,
      dataInizio: format(day, "yyyy-MM-dd"),
      dataFine: format(addDays(day, 1), "yyyy-MM-dd"),
      stato: "attiva",
      note: "",
      isNew: true,
    });
  }

  function openEditBooking(p: NonNullable<typeof prenotazioni>[0]) {
    setDialog({
      open: true,
      prenotazioneId: p.id,
      vetturaId: p.vetturaId,
      clienteId: p.clienteId,
      dataInizio: p.dataInizio,
      dataFine: p.dataFine,
      stato: p.stato,
      note: "",
      isNew: false,
    });
  }

  function handleDrop(vetturaId: number, dayIdx: number) {
    if (!dragging) return;
    const newStart = daysArr[dayIdx];
    if (!newStart) return;
    const newEnd = addDays(newStart, dragging.durationDays);
    updatePrenotazione.mutate(
      {
        id: dragging.id,
        data: {
          dataInizio: format(newStart, "yyyy-MM-dd") + "T00:00:00",
          dataFine: format(newEnd, "yyyy-MM-dd") + "T00:00:00",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPrenotazioniCalendarioQueryKey() });
          toast({ title: "Prenotazione spostata" });
        },
        onError: () => toast({ title: "Errore spostamento", variant: "destructive" }),
      }
    );
    setDragging(null);
  }

  function handleSave() {
    if (!dialog.vetturaId || !dialog.clienteId) {
      toast({ title: "Compila tutti i campi richiesti", variant: "destructive" });
      return;
    }
    if (dialog.isNew) {
      createPrenotazione.mutate(
        {
          data: {
            vetturaId: dialog.vetturaId,
            clienteId: dialog.clienteId,
            dataInizio: dialog.dataInizio + "T00:00:00",
            dataFine: dialog.dataFine + "T00:00:00",
            stato: dialog.stato as "attiva" | "in_corso" | "completata" | "annullata",
            note: dialog.note || null,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetPrenotazioniCalendarioQueryKey() });
            setDialog(defaultEdit());
            toast({ title: "Prenotazione creata" });
          },
          onError: () => toast({ title: "Errore creazione", variant: "destructive" }),
        }
      );
    } else if (dialog.prenotazioneId) {
      updatePrenotazione.mutate(
        {
          id: dialog.prenotazioneId,
          data: {
            vetturaId: dialog.vetturaId,
            clienteId: dialog.clienteId,
            dataInizio: dialog.dataInizio + "T00:00:00",
            dataFine: dialog.dataFine + "T00:00:00",
            stato: dialog.stato as "attiva" | "in_corso" | "completata" | "annullata",
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetPrenotazioniCalendarioQueryKey() });
            setDialog(defaultEdit());
            toast({ title: "Prenotazione aggiornata" });
          },
          onError: () => toast({ title: "Errore aggiornamento", variant: "destructive" }),
        }
      );
    }
  }

  const isPending = createPrenotazione.isPending || updatePrenotazione.isPending;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center px-6 py-4 border-b border-border shrink-0 gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Calendario Impegni</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Planning prenotazioni flotta — trascina per spostare.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground mr-2">
            <span className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-amber-400" /> Attiva</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-rose-500" /> In corso</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-slate-400" /> Completata</span>
          </div>

          {/* View toggle */}
          <div className="flex rounded-md overflow-hidden border border-border text-xs">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "month" ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              Mese
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-border ${viewMode === "week" ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              Settimana
            </button>
          </div>

          {/* Nav */}
          <div className="flex items-center bg-card border border-border rounded-md">
            <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 rounded-r-none border-r border-border">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={goToday} className="h-9 rounded-none font-medium w-44 text-xs">
              {headerLabel}
            </Button>
            <Button variant="ghost" size="icon" onClick={goForward} className="h-9 w-9 rounded-l-none border-l border-border">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button size="sm" className="gap-1.5" onClick={() => setDialog({ ...defaultEdit(), open: true })}>
            <Plus className="w-3.5 h-3.5" /> Nuova
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Caricamento calendario...
          </div>
        ) : (
          <div className="min-w-max">
            {/* Day header */}
            <div className="flex border-b sticky top-0 bg-muted/80 backdrop-blur z-20 h-10">
              <div className="w-[220px] shrink-0 bg-card border-r px-4 flex items-center font-medium text-xs text-muted-foreground sticky left-0 z-30">
                Vettura
              </div>
              {daysArr.map((day, i) => (
                <div
                  key={i}
                  className={`shrink-0 border-r flex flex-col items-center justify-center text-xs font-medium
                    ${isSameDay(day, new Date()) ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold" : "text-muted-foreground"}`}
                  style={{ width: CELL_W }}
                >
                  {viewMode === "week" ? (
                    <>
                      <span className="text-[10px] opacity-60 uppercase">{format(day, "EEE", { locale: it })}</span>
                      <span>{format(day, "d")}</span>
                    </>
                  ) : (
                    <span>{format(day, "d")}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Vehicle rows */}
            {vettureMap.size === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                <CalendarIcon className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">Nessuna prenotazione nel periodo selezionato.</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setDialog({ ...defaultEdit(), open: true })}>
                  <Plus className="w-3.5 h-3.5" /> Crea prenotazione
                </Button>
              </div>
            ) : (
              Array.from(vettureMap.entries()).map(([vetturaId, rowData]) => (
                <div key={vetturaId} className="flex border-b group h-14 hover:bg-muted/20 transition-colors">
                  {/* Frozen vehicle name */}
                  <div className="w-[220px] shrink-0 bg-card border-r px-4 py-2 flex flex-col justify-center sticky left-0 z-10">
                    <div className="font-semibold text-sm truncate">{rowData.nome}</div>
                    <div className="text-xs text-muted-foreground font-mono">{rowData.targa}</div>
                  </div>

                  {/* Day cells + booking bars */}
                  <div
                    className="flex relative"
                    style={{ width: `${daysArr.length * CELL_W}px` }}
                    ref={el => { if (el) containerRefs.current.set(vetturaId, el); }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      if (!dragging) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const dayIdx = Math.max(0, Math.min(daysArr.length - 1, Math.floor(x / CELL_W)));
                      handleDrop(vetturaId, dayIdx);
                    }}
                  >
                    {/* Background day cells — click to create */}
                    {daysArr.map((day, i) => (
                      <div
                        key={i}
                        className={`shrink-0 border-r h-full transition-colors cursor-pointer
                          ${isSameDay(day, new Date()) ? "bg-indigo-500/5" : "hover:bg-muted/40"}`}
                        style={{ width: CELL_W }}
                        onClick={() => openNewBooking(vetturaId, day)}
                      />
                    ))}

                    {/* Booking bars */}
                    {rowData.prenotazioni.map(p => {
                      const pStart = parseISO(p.dataInizio);
                      const pEnd = parseISO(p.dataFine);

                      const clampedStart = pStart < periodStart ? periodStart : pStart;
                      const clampedEnd = pEnd > periodEnd ? periodEnd : pEnd;

                      const startIdx = daysArr.findIndex(d => isSameDay(d, clampedStart));
                      const endIdx = daysArr.findIndex(d => isSameDay(d, clampedEnd));

                      if (startIdx === -1 || endIdx === -1) return null;

                      const span = endIdx - startIdx + 1;
                      const durationDays = differenceInDays(parseISO(p.dataFine), parseISO(p.dataInizio));
                      const colors = getColors(p.stato);

                      return (
                        <Tooltip key={p.id}>
                          <TooltipTrigger asChild>
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "move";
                                setDragging({ id: p.id, durationDays });
                              }}
                              onDragEnd={() => setDragging(null)}
                              className={`absolute top-1.5 bottom-1.5 rounded border flex items-center px-1.5 truncate text-xs font-semibold
                                cursor-grab active:cursor-grabbing select-none transition-all hover:-translate-y-0.5 hover:shadow-md
                                ${colors.bar} ${dragging?.id === p.id ? "opacity-50 shadow-lg scale-95" : ""}`}
                              style={{
                                left: `${startIdx * CELL_W + 2}px`,
                                width: `${span * CELL_W - 4}px`,
                                zIndex: 10,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditBooking(p);
                              }}
                            >
                              <GripHorizontal className="w-3 h-3 mr-1 opacity-60 shrink-0" />
                              {span > 1 && <span className="truncate">{p.clienteNome}</span>}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-3 max-w-xs">
                            <div className="font-semibold mb-0.5">{p.clienteNome}</div>
                            <div className="text-xs text-muted-foreground mb-1.5">
                              {format(parseISO(p.dataInizio), "dd/MM/yyyy")} → {format(parseISO(p.dataFine), "dd/MM/yyyy")}
                            </div>
                            <Badge variant="outline" className={`text-xs ${colors.badge}`}>
                              {p.stato.replace("_", " ").toUpperCase()}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">Clicca per modificare · Trascina per spostare</div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit/Create dialog */}
      <Dialog open={dialog.open} onOpenChange={open => !open && setDialog(defaultEdit())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.isNew ? "Nuova Prenotazione" : "Modifica Prenotazione"}</DialogTitle>
            <DialogDescription>
              {dialog.isNew ? "Crea una nuova prenotazione selezionando vettura, cliente e date." : "Modifica i dettagli della prenotazione selezionata."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vettura</Label>
              <Select
                value={dialog.vetturaId ? dialog.vetturaId.toString() : ""}
                onValueChange={v => setDialog(d => ({ ...d, vetturaId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona vettura" />
                </SelectTrigger>
                <SelectContent>
                  {vetture?.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.marca} {v.modello} — {v.targa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={dialog.clienteId ? dialog.clienteId.toString() : ""}
                onValueChange={v => setDialog(d => ({ ...d, clienteId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clienti?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nome} {c.cognome}
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
                  value={dialog.dataInizio}
                  onChange={e => setDialog(d => ({ ...d, dataInizio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Al</Label>
                <Input
                  type="date"
                  value={dialog.dataFine}
                  onChange={e => setDialog(d => ({ ...d, dataFine: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select
                value={dialog.stato}
                onValueChange={v => setDialog(d => ({ ...d, stato: v }))}
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
            <Button variant="outline" onClick={() => setDialog(defaultEdit())}>Annulla</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvataggio..." : dialog.isNew ? "Crea Prenotazione" : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
