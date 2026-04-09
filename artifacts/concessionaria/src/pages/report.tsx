import { useGetDashboardReport } from "@workspace/api-client-react";
import { BarChart2, TrendingUp, FileText, Euro, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const TIPO_COLORS: Record<string, string> = {
  vendita: "#6366f1",
  noleggio: "#10b981",
  leasing: "#f59e0b",
  permuta: "#8b5cf6",
};

const TIPO_LABELS: Record<string, string> = {
  vendita: "Vendita",
  noleggio: "Noleggio",
  leasing: "Leasing",
  permuta: "Permuta",
};

const FALLBACK_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function formatEuro(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatMonthLabel(mese: string): string {
  const [year, month] = mese.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("it-IT", { month: "short", year: "2-digit" });
}

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  loading: boolean;
}

function KpiCard({ title, value, icon: Icon, color, bg, loading }: KpiCardProps) {
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
              <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${bg.replace("/15", "/60").replace("/10", "/50")}`} />
      </CardContent>
    </Card>
  );
}

export default function Report() {
  const { data, isLoading } = useGetDashboardReport();

  const kpiCards = [
    {
      title: "Fatturato Totale",
      value: data ? formatEuro(data.kpi.totale_fatturato) : "—",
      icon: Euro,
      color: "text-indigo-700",
      bg: "bg-indigo-500/15",
    },
    {
      title: "Numero Contratti",
      value: data ? String(data.kpi.numero_contratti) : "—",
      icon: FileText,
      color: "text-emerald-700",
      bg: "bg-emerald-500/15",
    },
    {
      title: "Importo Medio",
      value: data ? formatEuro(data.kpi.media_importo) : "—",
      icon: TrendingUp,
      color: "text-amber-700",
      bg: "bg-amber-500/15",
    },
  ];

  const barData = (data?.fatturatoMensile ?? []).map((m) => ({
    name: formatMonthLabel(m.mese),
    fatturato: m.fatturato,
  }));

  const pieData = (data?.distribuzioneTipo ?? []).map((t) => ({
    name: TIPO_LABELS[t.tipo] ?? t.tipo,
    value: t.count,
    tipo: t.tipo,
  }));

  return (
    <div className="p-8 flex flex-col h-full overflow-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Report</h1>
        </div>
        <p className="text-muted-foreground mt-1 ml-12">Statistiche e performance degli ultimi 12 mesi.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} loading={isLoading} />
        ))}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fatturato mensile */}
          <Card className="border shadow-sm lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Fatturato Mensile — Ultimi 12 Mesi</h2>
              </div>
              {barData.every((d) => d.fatturato === 0) ? (
                <p className="text-muted-foreground text-sm italic">Nessun dato disponibile.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => [formatEuro(value), "Fatturato"]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="fatturato" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Distribuzione per tipo */}
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Distribuzione per Tipo Contratto</h2>
              </div>
              {pieData.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Nessun dato disponibile.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.tipo}
                          fill={TIPO_COLORS[entry.tipo] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top 5 veicoli */}
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Top 5 Veicoli per Contratti</h2>
              </div>
              {!data?.topVeicoli || data.topVeicoli.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Nessun dato disponibile.</p>
              ) : (
                <div className="space-y-4">
                  {data.topVeicoli.map((v, i) => {
                    const max = data.topVeicoli[0]?.count ?? 1;
                    const pct = Math.round((v.count / max) * 100);
                    const rankColors = ["bg-indigo-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
                    return (
                      <div key={v.vetturaId}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 ${rankColors[i] ?? "bg-primary"}`}>
                              {i + 1}
                            </span>
                            <span className="font-medium">{v.marca} {v.modello}</span>
                            <span className="text-muted-foreground text-xs">({v.targa})</span>
                          </div>
                          <span className="text-muted-foreground font-medium">{v.count} contratti</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${rankColors[i] ?? "bg-primary"}`}
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
