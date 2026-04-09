import { useGetDashboardStats } from "@workspace/api-client-react";
import { Car, CheckCircle2, Calendar, FileText, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  description: string;
  loading: boolean;
}

function KpiCard({ title, value, icon: Icon, color, bg, description, loading }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            {loading ? (
              <div className="h-9 flex items-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
              </div>
            ) : (
              <p className={`text-4xl font-black tracking-tight ${color}`}>{value ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${bg.replace('/15', '/60').replace('/10', '/50')}`} />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  const kpiCards = [
    {
      title: "Vetture Totali",
      value: stats?.totaleVetture,
      icon: Car,
      color: "text-indigo-700",
      bg: "bg-indigo-500/15",
      description: "Totale flotta registrata",
    },
    {
      title: "Vetture Disponibili",
      value: stats?.vettureDisponibili,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-500/15",
      description: "Pronte per prenotazione",
    },
    {
      title: "Prenotazioni Attive",
      value: stats?.prenotazioniAttive,
      icon: Calendar,
      color: "text-amber-700",
      bg: "bg-amber-500/15",
      description: "In corso o confermate",
    },
    {
      title: "Contratti Attivi",
      value: stats?.contrattiAttivi ?? 0,
      icon: FileText,
      color: "text-violet-700",
      bg: "bg-violet-500/15",
      description: "Contratti non archiviati",
    },
  ];

  return (
    <div className="p-8 flex flex-col h-full overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Panoramica in tempo reale della concessionaria.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} loading={isLoading} />
        ))}
      </div>

      {!isLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ripartizione carburante */}
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Ripartizione Carburante</h2>
              </div>
              {stats.ripartizioneCarburante.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Nessun dato disponibile.</p>
              ) : (
                <div className="space-y-3">
                  {stats.ripartizioneCarburante.map((r) => {
                    const pct = stats.totaleVetture > 0 ? Math.round((r.count / stats.totaleVetture) * 100) : 0;
                    return (
                      <div key={r.carburante}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="capitalize font-medium">{r.carburante}</span>
                          <span className="text-muted-foreground">{r.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ripartizione stato */}
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Car className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Ripartizione per Stato</h2>
              </div>
              {stats.ripartizioneStato.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Nessun dato disponibile.</p>
              ) : (
                <div className="space-y-3">
                  {stats.ripartizioneStato.map((r) => {
                    const pct = stats.totaleVetture > 0 ? Math.round((r.count / stats.totaleVetture) * 100) : 0;
                    const colors: Record<string, string> = { nuova: "bg-emerald-500", usata: "bg-amber-500", km0: "bg-blue-500" };
                    return (
                      <div key={r.stato}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="capitalize font-medium">{r.stato === "km0" ? "Km 0" : r.stato}</span>
                          <span className="text-muted-foreground">{r.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${colors[r.stato] ?? "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
