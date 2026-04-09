import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Car, Lock, User, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f1729 0%, #1a2744 50%, #0e2038 100%)" }}
      >
        {/* decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #e63946, transparent)" }} />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #e63946, transparent)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#e63946" }}>
              <Car className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">AutoFlotta</div>
              <div className="text-xs font-medium opacity-60 tracking-widest uppercase">Gestione Concessionaria</div>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-black leading-tight mb-4">
              Il tuo parco auto,<br />
              <span style={{ color: "#e63946" }}>sempre sotto controllo.</span>
            </h2>
            <p className="text-base opacity-70 leading-relaxed max-w-sm">
              Gestisci inventario, prenotazioni, contratti e clienti in un unico portale professionale progettato per la tua concessionaria.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Inventario", desc: "Vetture e disponibilità" },
              { label: "Calendario", desc: "Prenotazioni visive" },
              { label: "Contratti", desc: "Archivio pratiche" },
              { label: "Storico", desc: "Clienti e veicoli" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl p-4 border border-white/10"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-sm font-bold mb-0.5">{f.label}</div>
                <div className="text-xs opacity-50">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 flex items-center gap-2 text-xs opacity-40">
          <ShieldCheck className="w-4 h-4" />
          <span>Accesso protetto — solo personale autorizzato</span>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8"
        style={{ background: "#f8f9fc" }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#e63946" }}>
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900">AutoFlotta</div>
              <div className="text-xs text-gray-500 tracking-widest uppercase">Gestione Concessionaria</div>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-1">Accedi</h1>
            <p className="text-gray-500 text-sm">Inserisci le tue credenziali per continuare</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Nome utente
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium text-gray-900 placeholder-gray-300 outline-none transition-all"
                  style={{
                    background: "white",
                    borderColor: error ? "#e63946" : "#e5e7eb",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#e63946"; e.target.style.boxShadow = "0 0 0 3px rgba(230,57,70,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = error ? "#e63946" : "#e5e7eb"; e.target.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border text-sm font-medium text-gray-900 placeholder-gray-300 outline-none transition-all"
                  style={{
                    background: "white",
                    borderColor: error ? "#e63946" : "#e5e7eb",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#e63946"; e.target.style.boxShadow = "0 0 0 3px rgba(230,57,70,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = error ? "#e63946" : "#e5e7eb"; e.target.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: "rgba(230,57,70,0.08)", color: "#e63946", border: "1px solid rgba(230,57,70,0.2)" }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 rounded-xl text-sm font-bold text-white tracking-wide transition-all mt-2"
              style={{
                background: loading || !username || !password ? "#d1d5db" : "#e63946",
                cursor: loading || !username || !password ? "not-allowed" : "pointer",
                boxShadow: loading || !username || !password ? "none" : "0 4px 16px rgba(230,57,70,0.35)",
              }}
            >
              {loading ? "Accesso in corso..." : "Accedi al portale"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Accesso riservato al personale autorizzato.<br />
            Contatta l'amministratore per le credenziali.
          </p>
        </div>
      </div>
    </div>
  );
}
