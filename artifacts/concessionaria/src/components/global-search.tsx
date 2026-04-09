import { useState, useEffect, useRef } from "react";
import { useListVetture, useListClienti, useListPrenotazioni } from "@workspace/api-client-react";
import { Search, Car, Users, Calendar, X } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Result =
  | { type: "vettura"; id: number; label: string; sublabel: string; href: string }
  | { type: "cliente"; id: number; label: string; sublabel: string; href: string }
  | { type: "prenotazione"; id: number; label: string; sublabel: string; href: string };

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: vetture } = useListVetture();
  const { data: clienti } = useListClienti();
  const { data: prenotazioni } = useListPrenotazioni({});

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const q = query.trim().toLowerCase();

  const results: Result[] = [];

  if (q.length >= 1) {
    vetture?.forEach(v => {
      if (
        v.targa.toLowerCase().includes(q) ||
        v.marca.toLowerCase().includes(q) ||
        v.modello.toLowerCase().includes(q)
      ) {
        results.push({
          type: "vettura",
          id: v.id,
          label: `${v.marca} ${v.modello}`,
          sublabel: v.targa,
          href: "/inventario",
        });
      }
    });

    clienti?.forEach(c => {
      if (
        c.nome.toLowerCase().includes(q) ||
        c.cognome.toLowerCase().includes(q) ||
        (c.telefono ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.codiceFiscale ?? "").toLowerCase().includes(q)
      ) {
        results.push({
          type: "cliente",
          id: c.id,
          label: `${c.nome} ${c.cognome}`,
          sublabel: c.telefono ?? c.email ?? c.codiceFiscale ?? "",
          href: "/clienti",
        });
      }
    });

    prenotazioni?.forEach(p => {
      const targaMatch = p.vettura.targa.toLowerCase().includes(q);
      const clienteMatch =
        p.cliente.nome.toLowerCase().includes(q) ||
        p.cliente.cognome.toLowerCase().includes(q) ||
        (p.cliente.telefono ?? "").includes(q);
      if (targaMatch || clienteMatch) {
        const dal = format(new Date(p.dataInizio), "dd/MM/yyyy");
        const al = format(new Date(p.dataFine), "dd/MM/yyyy");
        results.push({
          type: "prenotazione",
          id: p.id,
          label: `${p.cliente.nome} ${p.cliente.cognome} — ${p.vettura.targa}`,
          sublabel: `${dal} → ${al}`,
          href: "/prenotazioni",
        });
      }
    });
  }

  const handleSelect = (r: Result) => {
    navigate(r.href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      handleSelect(results[selected]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => setSelected(0), [results.length]);

  if (!open) return null;

  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    vettura: Car,
    cliente: Users,
    prenotazione: Calendar,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cerca targa, cliente, telefono..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground hidden sm:block">ESC</kbd>
        </div>

        {/* Results */}
        {q.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Digita una targa, nome cliente o numero di telefono
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nessun risultato per "<strong>{query}</strong>"
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((r, i) => {
              const Icon = icons[r.type];
              return (
                <li key={`${r.type}-${r.id}-${i}`}>
                  <button
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      i === selected ? "bg-muted" : "hover:bg-muted/50"
                    )}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => handleSelect(r)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.sublabel}</div>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize shrink-0">
                      {r.type === "vettura" ? "veicolo" : r.type === "cliente" ? "cliente" : "prenotazione"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded border border-border">↑↓</kbd> naviga</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded border border-border">↵</kbd> apri</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded border border-border">ESC</kbd> chiudi</span>
        </div>
      </div>
    </div>
  );
}
