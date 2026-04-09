import { useState } from "react";
import { useGetPrenotazioniCalendario } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: prenotazioni, isLoading } = useGetPrenotazioniCalendario({ anno: year, mese: month });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const vettureMap = new Map<number, { nome: string, targa: string, prenotazioni: any[] }>();
  
  if (prenotazioni) {
    prenotazioni.forEach(p => {
      if (!vettureMap.has(p.vetturaId)) {
        vettureMap.set(p.vetturaId, { nome: p.vetturaNome, targa: p.targa, prenotazioni: [] });
      }
      vettureMap.get(p.vetturaId)!.prenotazioni.push(p);
    });
  }

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'attiva': return 'bg-emerald-500 border-emerald-600 text-emerald-950';
      case 'in_corso': return 'bg-blue-500 border-blue-600 text-blue-950';
      case 'completata': return 'bg-slate-400 border-slate-500 text-slate-900';
      case 'annullata': return 'bg-rose-500 border-rose-600 text-rose-950';
      default: return 'bg-primary border-primary text-primary-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-6 border-b border-border shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendario Impegni</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visualizzazione planning mensile della flotta.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500"></div> Attiva</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div> In corso</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-400"></div> Completata</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-500"></div> Annullata</span>
          </div>

          <div className="flex items-center bg-card border border-border rounded-md">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 rounded-r-none border-r border-border">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={today} className="h-9 rounded-none font-medium w-36 text-sm">
              {format(currentDate, "MMMM yyyy", { locale: it }).toUpperCase()}
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 rounded-l-none border-l border-border">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid — fills remaining height */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Caricamento calendario...
          </div>
        ) : vettureMap.size === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">Nessuna prenotazione trovata per {format(currentDate, "MMMM yyyy", { locale: it })}.</p>
          </div>
        ) : (
          <div className="min-w-max" style={{ paddingLeft: "250px" }}>
            {/* Sticky header giorni */}
            <div className="flex border-b sticky top-0 bg-muted/80 backdrop-blur z-20 h-10">
              <div className="w-[250px] bg-card border-r border-b px-4 flex items-center font-medium text-xs text-muted-foreground absolute left-0 top-0 h-10 z-30">
                Vettura
              </div>
              {daysInMonth.map((day, i) => (
                <div
                  key={i}
                  className={`flex-1 min-w-[40px] border-r flex items-center justify-center text-xs font-medium ${
                    isSameDay(day, new Date()) ? 'bg-foreground/8 text-foreground font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {format(day, "d")}
                </div>
              ))}
            </div>

            {/* Righe vetture */}
            {Array.from(vettureMap.entries()).map(([vetturaId, data]) => (
              <div key={vetturaId} className="flex border-b group relative h-14 hover:bg-muted/30 transition-colors">
                <div className="w-[250px] bg-card border-r px-4 py-2 absolute left-0 flex flex-col justify-center z-10">
                  <div className="font-semibold text-sm truncate">{data.nome}</div>
                  <div className="text-xs text-muted-foreground font-mono">{data.targa}</div>
                </div>
                
                <div className="flex flex-1 relative">
                  {daysInMonth.map((day, i) => (
                    <div
                      key={i}
                      className={`flex-1 min-w-[40px] border-r ${
                        isSameDay(day, new Date()) ? 'bg-foreground/5' : ''
                      }`}
                    />
                  ))}

                  {data.prenotazioni.map((p) => {
                    const start = parseISO(p.dataInizio);
                    const end = parseISO(p.dataFine);
                    
                    const startIdx = daysInMonth.findIndex(d => isSameDay(d, start) || (d > start && isSameDay(d, startOfMonth(currentDate))));
                    const endIdx = daysInMonth.findIndex(d => isSameDay(d, end) || (d < end && isSameDay(d, endOfMonth(currentDate))));
                    
                    if (startIdx === -1 && endIdx === -1) return null;

                    const actualStartIdx = startIdx === -1 ? 0 : startIdx;
                    const actualEndIdx = endIdx === -1 ? daysInMonth.length - 1 : endIdx;
                    const span = actualEndIdx - actualStartIdx + 1;

                    return (
                      <Tooltip key={p.id}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`absolute top-2 bottom-2 rounded border shadow-sm flex items-center px-2 truncate text-xs font-medium cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-md ${getStatusColor(p.stato)}`}
                            style={{ 
                              left: `calc((100% / ${daysInMonth.length}) * ${actualStartIdx} + 2px)`, 
                              width: `calc((100% / ${daysInMonth.length}) * ${span} - 4px)`
                            }}
                          >
                            {span > 1 && <span className="truncate">{p.clienteNome}</span>}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 max-w-xs">
                          <div className="font-semibold mb-1">{p.clienteNome}</div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {format(start, "dd/MM/yyyy")} — {format(end, "dd/MM/yyyy")}
                          </div>
                          <div className="text-xs uppercase font-semibold">{p.stato.replace('_', ' ')}</div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
