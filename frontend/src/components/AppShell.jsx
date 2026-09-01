import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Radar, ClipboardCheck, BarChart3, BookOpen,
  Database, ScrollText, Settings as SettingsIcon, Search, Bell, Sun, Moon,
  PanelLeftClose, PanelLeft, LogOut, ChevronRight, Radio,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/Logo";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { StudentAvatar, SeverityBadge } from "@/components/common";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/signals", label: "Risk Signals", icon: Radar },
  { to: "/reviews", label: "Reviews", icon: ClipboardCheck },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/data-sources", label: "Data Sources", icon: Database },
  { to: "/audit-log", label: "Audit Log", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const boxRef = useRef(null);

  useEffect(() => {
    if (!q) { setRes(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`);
        setRes(data); setOpen(true);
      } catch {}
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const go = (path) => { setOpen(false); setQ(""); nav(path); };
  const hasResults = res && (res.students.length || res.signals.length || res.courses.length);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        data-testid="global-search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
        placeholder="Search students, signals, courses…"
        className="w-full h-9 rounded-lg border border-border bg-background/60 pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
      />
      {open && q && (
        <div data-testid="search-results" className="absolute top-11 left-0 right-0 z-50 rounded-xl border border-border bg-popover shadow-xl overflow-hidden animate-fade-up">
          {!hasResults && <div className="p-4 text-sm text-muted-foreground">No results for "{q}"</div>}
          {res?.students?.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Students</p>
              {res.students.map((s) => (
                <button key={s.id} data-testid={`search-student-${s.id}`} onClick={() => go(`/students/${s.id}`)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted text-left">
                  <StudentAvatar src={s.avatar} name={s.name} size={26} />
                  <span className="text-sm text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto font-mono">{s.student_id}</span>
                </button>
              ))}
            </div>
          )}
          {res?.signals?.length > 0 && (
            <div className="p-2 border-t border-border">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Signals</p>
              {res.signals.map((s) => (
                <button key={s.id} onClick={() => go(`/signals/${s.id}`)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted text-left">
                  <Radar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{s.signal_type}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{s.student_name} · {s.course_code}</span>
                </button>
              ))}
            </div>
          )}
          {res?.courses?.length > 0 && (
            <div className="p-2 border-t border-border">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Courses</p>
              {res.courses.map((c) => (
                <button key={c.code} onClick={() => go(`/courses/${c.code}`)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted text-left">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{c.code} — {c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const [items, setItems] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    api.get("/overview").then(({ data }) => setItems(data.recent_signals || [])).catch(() => {});
  }, []);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-testid="notifications-button" className="relative h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {items.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Signals requiring attention</span>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
        <div className="max-h-80 overflow-auto">
          {items.map((s) => (
            <button key={s.id} onClick={() => nav(`/signals/${s.id}`)}
              className="w-full text-left px-4 py-3 hover:bg-muted border-b border-border/60 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{s.student_name}</span>
                <SeverityBadge severity={s.severity} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{s.signal_type} · {s.course_code} · {s.detected}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const doLogout = async () => { await logout(); nav("/login"); };

  const SidebarInner = (
    <>
      <div className={cn("h-16 flex items-center border-b border-border", collapsed ? "justify-center px-2" : "px-5")}>
        <Logo collapsed={collapsed} />
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} data-testid={`nav-${label.toLowerCase().replace(/ /g, "-")}`}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="profile-menu-trigger" className={cn("w-full flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors", collapsed && "justify-center")}>
              <StudentAvatar src={user?.picture} name={user?.name} size={32} />
              {!collapsed && (
                <div className="min-w-0 text-left flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">Northbridge University</p>
                </div>
              )}
              {!collapsed && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav("/settings")}>
              <SettingsIcon className="h-4 w-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={doLogout} data-testid="logout-button">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className={cn("hidden lg:flex flex-col border-r border-border bg-card/40 backdrop-blur-xl transition-all duration-300 sticky top-0 h-screen",
        collapsed ? "w-16" : "w-64")}>
        {SidebarInner}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col border-r border-border bg-card h-full">{SidebarInner}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center gap-3 px-4 lg:px-6">
          <button data-testid="sidebar-toggle" onClick={() => { setCollapsed((c) => !c); setMobileOpen((o) => !o); }}
            className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-muted transition-colors">
            <span className="hidden lg:block">{collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</span>
            <span className="lg:hidden"><PanelLeft className="h-4 w-4" /></span>
          </button>
          <div className="flex-1 flex justify-center lg:justify-start"><GlobalSearch /></div>
          <div className="hidden md:flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-medium text-primary" data-testid="demo-badge">
            <Radio className="h-3 w-3" /> DEMO ENVIRONMENT
          </div>
          <Notifications />
          <button data-testid="theme-toggle" onClick={toggle}
            className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-muted transition-colors">
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
          <div className="hidden sm:block"><StudentAvatar src={user?.picture} name={user?.name} size={32} /></div>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
