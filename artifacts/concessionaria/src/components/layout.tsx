import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Car, Calendar, ClipboardList, FileText, Users,
  History, Wrench, LogOut, Sun, Moon, Search, GanttChart, BarChart2,
  GripVertical, Menu, FileBadge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import GlobalSearch from "./global-search";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Nav items definition ─────────────────────────────────────────────────────

const DEFAULT_NAV_ITEMS = [
  { href: "/dashboard",      label: "Dashboard",       icon: "LayoutDashboard", match: ["/", "/dashboard"] },
  { href: "/inventario",     label: "Inventario",      icon: "Car",             match: ["/inventario"] },
  { href: "/contratti",      label: "Contratti",       icon: "FileText",        match: ["/contratti"] },
  { href: "/calendario",     label: "Calendario",      icon: "Calendar",        match: ["/calendario"] },
  { href: "/clienti",        label: "Clienti",         icon: "Users",           match: ["/clienti"] },
  { href: "/storico-vetture",label: "Storico Vetture", icon: "History",         match: ["/storico-vetture"] },
  { href: "/manutenzioni",   label: "Manutenzioni",    icon: "Wrench",          match: ["/manutenzioni"] },
  { href: "/timeline",       label: "Timeline Flotta", icon: "GanttChart",      match: ["/timeline"] },
  { href: "/report",         label: "Report",          icon: "BarChart2",       match: ["/report"] },
  { href: "/documento-vendita", label: "Documento Vendita", icon: "FileBadge",   match: ["/documento-vendita"] },
];

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Car, Calendar, ClipboardList,
  FileText, Users, History, Wrench, GanttChart, BarChart2, FileBadge,
};

const LS_KEY = "concessionaria_nav_order";

function loadNavOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) return parsed;
  } catch { /* ignore */ }
  return null;
}

function saveNavOrder(order: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(order)); } catch { /* ignore */ }
}

function getOrderedItems(savedOrder: string[] | null) {
  if (!savedOrder) return DEFAULT_NAV_ITEMS;
  const map = Object.fromEntries(DEFAULT_NAV_ITEMS.map((item) => [item.href, item]));
  const ordered = savedOrder.filter((href) => map[href]).map((href) => map[href]);
  const missing  = DEFAULT_NAV_ITEMS.filter((item) => !savedOrder.includes(item.href));
  return [...ordered, ...missing];
}

// ─── Nav item types ───────────────────────────────────────────────────────────

interface NavItem { href: string; label: string; icon: string; match: string[] }

interface NavItemContentProps {
  item: NavItem;
  isActive: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onNavClick?: () => void;
}

// ─── Nav item components ──────────────────────────────────────────────────────

function NavItemContent({ item, isActive, isDragging, dragHandleProps, onNavClick }: NavItemContentProps) {
  const IconComponent = ICON_MAP[item.icon];
  return (
    <Link href={item.href} onClick={onNavClick}>
      <div className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group",
        isActive
          ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/20"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent",
        isDragging && "shadow-lg ring-1 ring-indigo-500/30",
      )}>
        <button
          {...dragHandleProps}
          className="opacity-0 group-hover/nav:opacity-40 hover:!opacity-70 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1 p-0.5 touch-none"
          onClick={(e) => e.preventDefault()}
          tabIndex={-1}
          aria-label="Trascina per riordinare"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <IconComponent className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-indigo-500" : "opacity-70")} />
        <span className="text-sm flex-1">{item.label}</span>
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
      </div>
    </Link>
  );
}

function SortableNavItem({ item, isActive, onNavClick }: { item: NavItem; isActive: boolean; onNavClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.href });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }} className="relative group/nav">
      <NavItemContent item={item} isActive={isActive} dragHandleProps={{ ...attributes, ...listeners }} onNavClick={onNavClick} />
    </div>
  );
}

function DragOverlayNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <div className="relative group/nav">
      <NavItemContent item={item} isActive={isActive} isDragging />
    </div>
  );
}

// ─── Sidebar inner content (shared between desktop aside and mobile Sheet) ────

function SidebarInner({
  user, theme, toggleTheme, logout, navItems, setNavItems, onNavClick,
}: {
  user: { username?: string } | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
  navItems: NavItem[];
  setNavItems: React.Dispatch<React.SetStateAction<NavItem[]>>;
  onNavClick?: () => void;
}) {
  const [location]  = useLocation();
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragEnd   = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setNavItems((items) => {
        const oldIndex = items.findIndex((i) => i.href === active.id);
        const newIndex = items.findIndex((i) => i.href === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        saveNavOrder(newItems.map((i) => i.href));
        return newItems;
      });
    }
  };

  const activeItem = activeId ? navItems.find((i) => i.href === activeId) : null;

  return (
    <>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 via-indigo-400 to-violet-500 z-10" />

      {/* Logo + Theme toggle */}
      <div className="pl-4 pr-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <Car className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black tracking-tight">AutoFlotta</div>
            <div className="text-[10px] font-medium opacity-40 tracking-widest uppercase">Concessionaria</div>
          </div>
          <button
            onClick={toggleTheme}
            title={theme === "light" ? "Passa a tema scuro" : "Passa a tema chiaro"}
            className="p-1.5 rounded-md opacity-60 hover:opacity-100 hover:bg-sidebar-accent transition-all shrink-0"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search button */}
      <div className="pl-4 pr-3 pt-3 pb-1">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground bg-sidebar-accent/50 border border-sidebar-border hover:bg-sidebar-accent transition-colors"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Cerca...</span>
          <kbd className="text-[10px] bg-background/50 px-1 py-0.5 rounded border border-sidebar-border opacity-60">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 pl-4 pr-3 py-2 space-y-0.5 overflow-y-auto">
        <div className="px-3 py-2 mb-1">
          <span className="text-[10px] font-semibold opacity-40 tracking-widest uppercase">Menu principale</span>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={navItems.map((i) => i.href)} strategy={verticalListSortingStrategy}>
            {navItems.map((item) => (
              <SortableNavItem
                key={item.href}
                item={item}
                isActive={item.match.includes(location)}
                onNavClick={onNavClick}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeItem ? <DragOverlayNavItem item={activeItem} isActive={activeItem.match.includes(location)} /> : null}
          </DragOverlay>
        </DndContext>
      </nav>

      {/* User + Logout */}
      <div className="pl-4 pr-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            {user?.username?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.username ?? "Utente"}</div>
            <div className="text-[10px] opacity-40">Amministratore</div>
          </div>
          <button onClick={logout} title="Esci" className="p-1.5 rounded-md opacity-50 hover:opacity-100 hover:bg-sidebar-accent transition-all">
            <LogOut className="w-3.5 h-3.5 text-sidebar-foreground" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [navItems, setNavItems]       = useState<NavItem[]>(() => getOrderedItems(loadNavOrder()));
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [location] = useLocation();

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Keyboard shortcut for global search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const sharedProps = { user: user as { username?: string } | null, theme, toggleTheme, logout, navItems, setNavItems };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col shrink-0 relative">
        <SidebarInner {...sharedProps} />
      </aside>

      {/* ── Mobile drawer (< md) ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border [&>button]:hidden">
          <div className="flex flex-col h-full relative">
            <SidebarInner {...sharedProps} onNavClick={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-sidebar text-sidebar-foreground shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            aria-label="Apri menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Car className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-black tracking-tight">AutoFlotta</span>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            aria-label="Cerca"
          >
            <Search className="w-4 h-4 opacity-60" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors opacity-60"
            aria-label="Cambia tema"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </header>

        <main className="flex-1 overflow-auto flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
