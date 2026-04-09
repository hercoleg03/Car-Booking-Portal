import { Link, useLocation } from "wouter";
import { Car, Calendar, ClipboardList, FileText, Users, History } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/inventario", label: "Inventario", icon: Car, match: ["/", "/inventario"] },
    { href: "/calendario", label: "Calendario", icon: Calendar, match: ["/calendario"] },
    { href: "/prenotazioni", label: "Prenotazioni", icon: ClipboardList, match: ["/prenotazioni"] },
    { href: "/contratti", label: "Contratti", icon: FileText, match: ["/contratti"] },
    { href: "/clienti", label: "Clienti", icon: Users, match: ["/clienti"] },
    { href: "/storico-vetture", label: "Storico Vetture", icon: History, match: ["/storico-vetture"] },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-6 pb-2">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" />
            Concessionaria
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.match.includes(location);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
