import { Link, useLocation } from "wouter";
import { Car, Calendar, ClipboardList, FileText, Users, History, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/inventario", label: "Inventario", icon: Car, match: ["/", "/inventario"] },
    { href: "/calendario", label: "Calendario", icon: Calendar, match: ["/calendario"] },
    { href: "/prenotazioni", label: "Prenotazioni", icon: ClipboardList, match: ["/prenotazioni"] },
    { href: "/contratti", label: "Contratti", icon: FileText, match: ["/contratti"] },
    { href: "/clienti", label: "Clienti", icon: Users, match: ["/clienti"] },
    { href: "/storico-vetture", label: "Storico Vetture", icon: History, match: ["/storico-vetture"] },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#e63946" }}>
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-white">AutoFlotta</div>
              <div className="text-[10px] font-medium opacity-40 tracking-widest uppercase">Concessionaria</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 py-2 mb-1">
            <span className="text-[10px] font-semibold opacity-40 tracking-widest uppercase">Menu principale</span>
          </div>
          {navItems.map((item) => {
            const isActive = item.match.includes(location);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "" : "opacity-70")} />
                  <span className="text-sm flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: "#e63946" }}>
              {user?.username?.charAt(0).toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.username ?? "Utente"}</div>
              <div className="text-[10px] opacity-40">Amministratore</div>
            </div>
            <button
              onClick={handleLogout}
              title="Esci"
              className="p-1.5 rounded-md opacity-50 hover:opacity-100 hover:bg-sidebar-accent transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-sidebar-foreground" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
