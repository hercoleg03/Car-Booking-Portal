import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  useListVetture, useListPrenotazioni, useListClienti,
  useUpdatePrenotazione, getListPrenotazioniQueryKey,
} from "@workspace/api-client-react";
import {
  addDays, addHours, startOfDay, format, parseISO,
  startOfWeek, differenceInCalendarDays,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, GanttChart, Clock, CalendarDays, CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types & Config ───────────────────────────────────────────────────────────

type ZoomLevel = "giornaliero" | "settimanale" | "mensile";

interface ZoomConfig {
  label: string;
  icon: React.ElementType;
  daysVisible: number;
  cellWidthPx: number;  // px per hour (giornaliero) or per day (other)
  unitMs: number;
  showWeekends: boolean;
}

const ZOOM: Record<ZoomLevel, ZoomConfig> = {
  giornaliero: {
    label: "Giornaliero",
    icon: Clock,
    daysVisible: 5,
    cellWidthPx: 60,    // 60px/hour
    unitMs: 3_600_000,
    showWeekends: true,
  },
  settimanale: {
    label: "Settimanale",
    icon: CalendarDays,
    daysVisible: 14,
    cellWidthPx: 80,    // 80px/day
    unitMs: 86_400_000,
    showWeekends: true,
  },
  mensile: {
    label: "Mensile",
    icon: CalendarRange,
    daysVisible: 30,
    cellWidthPx: 40,    // 40px/day
    unitMs: 86_400_000,
    showWeekends: true,
  },
};

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  attiva:      { bg: "bg-blue-500",    border: "border-blue-600",    text: "text-white" },
  in_corso:    { bg: "bg-emerald-500", border: "border-emerald-600", text: "text-white" },
  completata:  { bg: "bg-slate-400",   border: "border-slate-500",   text: "text-white" },
  annullata:   { bg: "bg-red-400",     border: "border-red-500",     text: "text-white" },
};

const LEFT_COL  = 196;
const ROW_H     = 52;
const SUB_H     = 24;
const HDR_H     = 36;
const TOTAL_HDR = SUB_H + HDR_H;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Timeline() {
  const [zoom, setZoom]           = useState<ZoomLevel>("settimanale");
  const [startDate, setStartDate] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [tooltipId, setTooltipId]       = useState<number | null>(null);
  const [tooltipPos, setTooltipPos]     = useState({ x: 0, y: 0 });

  const dragRef = useRef<{
    bookingId: number;
    originalInizio: string;
    originalFine: string;
    startX: number;
  } | null>(null);

  const { data: vetture = [] }      = useListVetture();
  const { data: prenotazioni = [] } = useListPrenotazioni();
  const { data: clienti = [] }      = useListClienti();
  const updatePren                  = useUpdatePrenotazione();
  const queryClient                 = useQueryClient();
  const { toast }                   = useToast();

  const cfg = ZOOM[zoom];

  // client map for name lookup
  const clienteMap = useMemo<Record<number, string>>(() => {
    const m: Record<number, string> = {};
    clienti.forEach(c => {
      if (c.id) m[c.id] = `${c.nome} ${c.cognome}`;
    });
    return m;
  }, [clienti]);

  // total timeline width in px
  const totalCells = zoom === "giornaliero"
    ? cfg.daysVisible * 24
    : cfg.daysVisible;
  const totalWidth = totalCells * cfg.cellWidthPx;

  const endDate = addDays(startDate, cfg.daysVisible);

  // ─── Navigation ───────────────────────────────────────────────────────────

  const navigate = (dir: 1 | -1) => {
    const step = Math.max(1, Math.floor(cfg.daysVisible / 2));
    setStartDate(d => addDays(d, dir * step));
  };

  const goToday = () => {
    const now = startOfDay(new Date());
    if (zoom === "settimanale") setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
    else setStartDate(now);
  };

  // ─── Time cells ───────────────────────────────────────────────────────────

  const timeCells = useMemo<{ date: Date; label: string }[]>(() => {
    const cells: { date: Date; label: string }[] = [];
    if (zoom === "giornaliero") {
      for (let d = 0; d < cfg.daysVisible; d++) {
        for (let h = 0; h < 24; h++) {
          const dt = addHours(addDays(startDate, d), h);
          cells.push({ date: dt, label: format(dt, "HH") });
        }
      }
    } else {
      for (let d = 0; d < cfg.daysVisible; d++) {
        const dt = addDays(startDate, d);
        cells.push({ date: dt, label: format(dt, "d") });
      }
    }
    return cells;
  }, [zoom, startDate, cfg.daysVisible]);

  // sub-headers (month/day grouping)
  const subHeaders = useMemo<{ label: string; cells: number }[]>(() => {
    const groups: { label: string; cells: number }[] = [];
    let cur = "";
    let count = 0;
    const getKey = (dt: Date) =>
      zoom === "giornaliero"
        ? format(dt, "EEE d MMM", { locale: it })
        : format(dt, "MMMM yyyy", { locale: it });

    timeCells.forEach((c, i) => {
      const k = getKey(c.date);
      if (k !== cur) {
        if (cur) groups.push({ label: cur, cells: count });
        cur = k;
        count = 1;
      } else {
        count++;
      }
      if (i === timeCells.length - 1) groups.push({ label: cur, cells: count });
    });
    return groups;
  }, [timeCells, zoom]);

  // ─── Position helpers ──────────────────────────────────────────────────────

  const msPerPx = (endDate.getTime() - startDate.getTime()) / totalWidth;

  const dateToLeft = (d: Date) =>
    (d.getTime() - startDate.getTime()) / msPerPx;

  const getBarStyle = (
    inizio: string,
    fine: string,
    extraPx = 0,
  ): { left: number; width: number } | null => {
    const s = parseISO(inizio).getTime();
    const e = parseISO(fine).getTime() + 86_400_000; // include last day
    const viewStart = startDate.getTime();
    const viewEnd   = endDate.getTime();
    if (e <= viewStart || s >= viewEnd) return null;

    const clampS = Math.max(s, viewStart);
    const clampE = Math.min(e, viewEnd);
    const left  = (clampS - viewStart) / msPerPx + extraPx;
    const width = Math.max((clampE - clampS) / msPerPx, 8);
    return { left, width };
  };

  // today indicator
  const todayLeft = dateToLeft(new Date());
  const todayVisible = todayLeft >= 0 && todayLeft <= totalWidth;

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const startDrag = (e: React.MouseEvent, p: { id?: number | null; dataInizio?: string | null; dataFine?: string | null }) => {
    if (!p.id || !p.dataInizio || !p.dataFine) return;
    e.preventDefault();
    dragRef.current = {
      bookingId: p.id,
      originalInizio: p.dataInizio,
      originalFine: p.dataFine,
      startX: e.clientX,
    };
    setDragOffsetPx(0);
    setTooltipId(null);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    setDragOffsetPx(e.clientX - dragRef.current.startX);
  }, []);

  const handleMouseUp = useCallback(async () => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag) { setDragOffsetPx(0); return; }

    const rawPx = dragOffsetPx;
    const dxMs  = rawPx * msPerPx;
    const giorni = Math.round(dxMs / 86_400_000);

    setDragOffsetPx(0);
    if (giorni === 0) return;

    const newInizio = format(addDays(parseISO(drag.originalInizio), giorni), "yyyy-MM-dd");
    const newFine   = format(addDays(parseISO(drag.originalFine),   giorni), "yyyy-MM-dd");

    try {
      await updatePren.mutateAsync({
        id: drag.bookingId,
        data: { dataInizio: newInizio, dataFine: newFine } as never,
      });
      await queryClient.invalidateQueries({ queryKey: getListPrenotazioniQueryKey() });
      const dir = giorni > 0 ? "avanti" : "indietro";
      toast({ title: "Prenotazione spostata", description: `${Math.abs(giorni)} g ${dir}` });
    } catch {
      toast({ title: "Errore", description: "Impossibile aggiornare la prenotazione", variant: "destructive" });
    }
  }, [dragOffsetPx, msPerPx, updatePren, queryClient, toast]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ─── Tooltip data ─────────────────────────────────────────────────────────

  const tooltipPren = tooltipId ? prenotazioni.find(p => p.id === tooltipId) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  const today = startOfDay(new Date());
  const isDragging = dragRef.current !== null;

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-background">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0">
        <GanttChart className="w-5 h-5 text-indigo-500" />
        <div>
          <h1 className="text-lg font-bold leading-none">Timeline Flotta</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Trascina le barre per spostare le prenotazioni
          </p>
        </div>
        <div className="flex-1" />

        {/* Zoom selector */}
        <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
          {(["giornaliero", "settimanale", "mensile"] as ZoomLevel[]).map(z => {
            const Icon = ZOOM[z].icon;
            return (
              <button
                key={z}
                onClick={() => { setZoom(z); goToday(); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  zoom === z
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {ZOOM[z].label}
              </button>
            );
          })}
        </div>

        {/* Navigate */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs px-3" onClick={goToday}>
            Oggi
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 overflow-auto relative">
        <div style={{ minWidth: LEFT_COL + totalWidth }}>

          {/* Sticky header block */}
          <div className="sticky top-0 z-20 flex" style={{ height: TOTAL_HDR }}>

            {/* Corner */}
            <div
              className="sticky left-0 z-30 bg-muted/60 border-r border-b flex items-end px-3 pb-1 shrink-0 backdrop-blur"
              style={{ width: LEFT_COL, height: TOTAL_HDR }}
            >
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Vettura
              </span>
            </div>

            {/* Sub-headers + time cells stacked */}
            <div className="flex flex-col flex-1" style={{ height: TOTAL_HDR }}>
              {/* Month / day group row */}
              <div className="flex border-b bg-muted/40 backdrop-blur" style={{ height: SUB_H }}>
                {subHeaders.map((sh, i) => (
                  <div
                    key={i}
                    className="border-r flex items-center px-2 overflow-hidden shrink-0"
                    style={{ width: sh.cells * cfg.cellWidthPx }}
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate capitalize">
                      {sh.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day / hour row */}
              <div className="flex border-b bg-background/95 backdrop-blur" style={{ height: HDR_H }}>
                {timeCells.map((cell, i) => {
                  const isTodayCell = zoom !== "giornaliero"
                    ? format(cell.date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
                    : format(cell.date, "yyyy-MM-dd HH") === format(new Date(), "yyyy-MM-dd HH");
                  const isWeekend = [0, 6].includes(cell.date.getDay()) && zoom !== "giornaliero";
                  return (
                    <div
                      key={i}
                      className={cn(
                        "border-r flex items-center justify-center shrink-0 text-[11px] font-medium",
                        isTodayCell
                          ? "bg-indigo-500/10 text-indigo-500 font-bold"
                          : isWeekend
                          ? "bg-muted/50 text-muted-foreground/60"
                          : "text-muted-foreground",
                      )}
                      style={{ width: cfg.cellWidthPx }}
                    >
                      {cell.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rows */}
          {vetture.map((v, vi) => {
            const vPren = prenotazioni.filter(p => p.vetturaId === v.id);
            const isAlt = vi % 2 === 1;

            return (
              <div key={v.id} className="flex" style={{ height: ROW_H }}>
                {/* Left sticky cell */}
                <div
                  className={cn(
                    "sticky left-0 z-10 flex items-center gap-2 px-3 border-r border-b shrink-0",
                    isAlt ? "bg-muted/20" : "bg-background",
                  )}
                  style={{ width: LEFT_COL }}
                >
                  <div className={cn(
                    "w-1.5 h-8 rounded-full shrink-0",
                    v.disponibile ? "bg-emerald-500" : "bg-red-400",
                  )} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate leading-tight">
                      {v.marca} {v.modello}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono leading-tight">
                      {v.targa}
                    </div>
                  </div>
                </div>

                {/* Timeline cells area */}
                <div
                  className={cn("relative border-b flex-1", isAlt ? "bg-muted/10" : "")}
                  style={{ width: totalWidth }}
                >
                  {/* Grid lines */}
                  {timeCells.map((cell, i) => {
                    const isWeekend = [0, 6].includes(cell.date.getDay()) && zoom !== "giornaliero";
                    const isTodayCol = zoom !== "giornaliero"
                      ? format(cell.date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
                      : false;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "absolute inset-y-0 border-r",
                          isTodayCol ? "bg-indigo-500/5 border-indigo-300/30"
                          : isWeekend ? "bg-muted/30"
                          : "border-border/30",
                        )}
                        style={{ left: i * cfg.cellWidthPx, width: cfg.cellWidthPx }}
                      />
                    );
                  })}

                  {/* Today vertical line */}
                  {todayVisible && (
                    <div
                      className="absolute inset-y-0 w-px bg-indigo-500/60 z-10 pointer-events-none"
                      style={{ left: todayLeft }}
                    />
                  )}

                  {/* Booking bars */}
                  {vPren.map(p => {
                    const isDrag = dragRef.current?.bookingId === p.id;
                    const extraPx = isDrag ? dragOffsetPx : 0;
                    const bar = getBarStyle(p.dataInizio!, p.dataFine!, extraPx);
                    if (!bar) return null;

                    const colors = STATUS_STYLE[p.stato ?? "attiva"] ?? STATUS_STYLE.attiva;
                    const nomeCliente = clienteMap[p.clienteId!] ?? `#${p.clienteId}`;
                    const giorni = differenceInCalendarDays(parseISO(p.dataFine!), parseISO(p.dataInizio!)) + 1;

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "absolute top-2 bottom-2 rounded-md border flex items-center px-2 overflow-hidden",
                          "cursor-grab active:cursor-grabbing transition-shadow",
                          colors.bg, colors.border, colors.text,
                          isDrag
                            ? "shadow-2xl opacity-90 z-30 scale-y-110"
                            : "hover:shadow-lg hover:z-20 z-10",
                        )}
                        style={{
                          left: bar.left,
                          width: bar.width,
                          transition: isDrag ? "none" : "box-shadow 0.15s",
                        }}
                        onMouseDown={e => startDrag(e, p)}
                        onMouseEnter={e => {
                          if (!dragRef.current) {
                            setTooltipId(p.id ?? null);
                            setTooltipPos({ x: e.clientX, y: e.clientY });
                          }
                        }}
                        onMouseMove={e => {
                          if (!dragRef.current && tooltipId === p.id) {
                            setTooltipPos({ x: e.clientX, y: e.clientY });
                          }
                        }}
                        onMouseLeave={() => setTooltipId(null)}
                      >
                        {bar.width > 24 && (
                          <span className="text-[10px] font-semibold whitespace-nowrap truncate leading-none">
                            {bar.width > 80 ? nomeCliente : nomeCliente.split(" ")[0]}
                            {bar.width > 120 && (
                              <span className="opacity-70 ml-1">· {giorni}g</span>
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {vetture.length === 0 && (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Nessuna vettura in inventario
            </div>
          )}
        </div>
      </div>

      {/* ── Drag cursor overlay ── */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-grabbing" />
      )}

      {/* ── Tooltip ── */}
      {tooltipPren && !isDragging && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border border-border rounded-xl shadow-xl p-3 space-y-1.5 text-xs"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 90 }}
        >
          <div className="font-bold text-sm">
            {clienteMap[tooltipPren.clienteId!] ?? `Cliente #${tooltipPren.clienteId}`}
          </div>
          <div className="text-muted-foreground">
            {format(parseISO(tooltipPren.dataInizio!), "d MMM", { locale: it })}
            {" → "}
            {format(parseISO(tooltipPren.dataFine!), "d MMM yyyy", { locale: it })}
            {" · "}
            {differenceInCalendarDays(parseISO(tooltipPren.dataFine!), parseISO(tooltipPren.dataInizio!)) + 1}g
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] capitalize border",
                STATUS_STYLE[tooltipPren.stato ?? "attiva"]?.bg,
                STATUS_STYLE[tooltipPren.stato ?? "attiva"]?.text,
                "border-transparent",
              )}
            >
              {tooltipPren.stato}
            </Badge>
            {tooltipPren.prezzoTotale != null && (
              <span className="text-muted-foreground">
                €{Number(tooltipPren.prezzoTotale).toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground/60 italic">
            Trascina per spostare
          </div>
        </div>
      )}
    </div>
  );
}
