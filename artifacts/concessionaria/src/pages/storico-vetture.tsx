import { useGetVetturaStorico, useListVetture } from "@workspace/api-client-react";
import { Car, History, FileText, Calendar, ArrowRight, Images } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/api-base";

export default function StoricoVetture() {
  const [selectedVetturaId, setSelectedVetturaId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: vetture, isLoading: isLoadingVetture } = useListVetture();
  const { data: storico, isLoading: isLoadingStorico } = useGetVetturaStorico(selectedVetturaId!, {
    query: { enabled: !!selectedVetturaId }
  });

  const filteredVetture = vetture?.filter(v =>
    v.targa.toLowerCase().includes(search.toLowerCase()) ||
    v.marca.toLowerCase().includes(search.toLowerCase()) ||
    v.modello.toLowerCase().includes(search.toLowerCase())
  );

  const apiBase = getApiBaseUrl();
  const fotoList = (storico?.vettura?.foto ?? []).filter(Boolean) as string[];

  function closeLightbox() { setLightboxIndex(null); }

  return (
    <div className="p-8 flex h-full gap-6 overflow-hidden">
      {/* Lista Vetture Sidebar */}
      <Card className="w-1/3 max-w-sm flex flex-col shrink-0 bg-muted/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Vetture</CardTitle>
          <Input
            placeholder="Cerca targa o modello..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 bg-background"
          />
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0 px-2 pb-4 space-y-1">
          {isLoadingVetture ? (
            <div className="p-4 text-center text-muted-foreground">Caricamento...</div>
          ) : (
            filteredVetture?.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVetturaId(v.id)}
                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors border ${
                  selectedVetturaId === v.id
                    ? 'bg-indigo-500/10 border-indigo-500/20'
                    : 'border-transparent hover:bg-muted'
                }`}
              >
                <div>
                  <div className={`font-semibold ${selectedVetturaId === v.id ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                    {v.marca} {v.modello}
                  </div>
                  <div className="text-sm opacity-70 font-mono mt-0.5">{v.targa}</div>
                </div>
                <ArrowRight className={`w-4 h-4 ${selectedVetturaId === v.id ? 'text-indigo-500' : 'text-muted-foreground opacity-50'}`} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dettaglio Storico */}
      <Card className="flex-1 overflow-auto bg-card">
        {!selectedVetturaId ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <History className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Seleziona una vettura per visualizzarne lo storico.</p>
          </div>
        ) : isLoadingStorico || !storico ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">Caricamento storico...</div>
        ) : (
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-2">{storico.vettura.marca} {storico.vettura.modello}</h2>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-base px-3 py-1 bg-muted/50">{storico.vettura.targa}</Badge>
                  <Badge className="capitalize" variant="secondary">{storico.vettura.stato}</Badge>
                </div>
              </div>
              <div className="text-right text-muted-foreground">
                <div className="text-sm">Immatricolata</div>
                <div className="font-medium text-foreground">{storico.vettura.anno}</div>
              </div>
            </div>

            {/* Galleria Foto */}
            {fotoList.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-xl mb-4 flex items-center gap-2 text-foreground">
                    <Images className="w-5 h-5 text-indigo-500" /> Galleria Foto
                    <span className="text-sm font-normal text-muted-foreground">({fotoList.length})</span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {fotoList.map((url, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxIndex(i)}
                      >
                        <img
                          src={`${apiBase}${url}`}
                          alt={`Foto ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-12">
              {/* Prenotazioni */}
              <div>
                <h3 className="font-semibold text-xl mb-4 flex items-center gap-2 text-foreground">
                  <Calendar className="w-5 h-5 text-indigo-500" /> Prenotazioni
                </h3>
                {storico.prenotazioni.length === 0 ? (
                  <p className="text-muted-foreground italic">Nessuna prenotazione passata.</p>
                ) : (
                  <div className="space-y-4">
                    {storico.prenotazioni.map(p => (
                      <div key={p.id} className="border rounded-lg p-4 bg-muted/10 relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${p.stato === 'attiva' ? 'bg-emerald-500' : p.stato === 'completata' ? 'bg-slate-400' : 'bg-indigo-500'}`} />
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">{p.cliente.nome} {p.cliente.cognome}</span>
                          <Badge variant="outline" className="capitalize text-xs">{p.stato.replace('_', ' ')}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(p.dataInizio), "dd/MM/yyyy")} → {format(new Date(p.dataFine), "dd/MM/yyyy")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contratti */}
              <div>
                <h3 className="font-semibold text-xl mb-4 flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5 text-indigo-500" /> Contratti
                </h3>
                {storico.contratti.length === 0 ? (
                  <p className="text-muted-foreground italic">Nessun contratto registrato.</p>
                ) : (
                  <div className="space-y-4">
                    {storico.contratti.map(c => (
                      <div key={c.id} className="border rounded-lg p-4 bg-muted/10 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-mono text-sm text-muted-foreground mb-1">Pratica N. {c.numero}</div>
                            <div className="font-semibold">{c.cliente.nome} {c.cliente.cognome}</div>
                          </div>
                          <Badge variant={c.archiviato ? "outline" : "default"} className="capitalize">
                            {c.tipo}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-end mt-4 text-sm">
                          <div className="text-muted-foreground">Stipula: {format(new Date(c.dataContratto), "dd/MM/yyyy")}</div>
                          <div className="font-semibold text-base">{c.importo ? `€ ${c.importo.toLocaleString()}` : '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Lightbox */}
      {lightboxIndex !== null && fotoList.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={`${apiBase}${fotoList[lightboxIndex]}`}
              alt={`Foto ${lightboxIndex + 1}`}
              className="w-full h-full object-contain rounded-lg max-h-[80vh]"
            />
            <div className="absolute top-2 right-6 text-white/60 text-sm">
              {lightboxIndex + 1} / {fotoList.length}
            </div>
            {fotoList.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {fotoList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === lightboxIndex ? 'bg-white' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-light w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
          >
            ✕
          </button>
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 text-white/80 hover:text-white text-2xl font-light w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              ‹
            </button>
          )}
          {lightboxIndex < fotoList.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 text-white/80 hover:text-white text-2xl font-light w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
