import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  House,
  CalendarPlus,
  ListChecks,
  SignOut,
  WaveSawtooth,
  GearSix,
} from "@phosphor-icons/react";

const navItems = [
  { to: "/", label: "Dashboard", icon: House, testid: "nav-dashboard" },
  { to: "/meetings/new", label: "Nova Reunião", icon: CalendarPlus, testid: "nav-new-meeting" },
  { to: "/deliberations", label: "Deliberações", icon: ListChecks, testid: "nav-deliberations" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col" data-testid="sidebar-nav">
        <div className="px-6 py-7 border-b border-white/10">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group"
            data-testid="sidebar-logo"
          >
            <div className="w-9 h-9 bg-[#0055FF] rounded flex items-center justify-center">
              <WaveSawtooth size={20} weight="bold" />
            </div>
            <div className="text-left">
              <div className="font-display font-black text-lg leading-none">ATA.IA</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-slate-400 mt-1">Gestão de Reuniões</div>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={item.testid}
                className={`flex items-center gap-3 px-4 py-2.5 rounded text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-4 py-3 mb-2">
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            <div className="text-sm font-semibold truncate">{user?.name}</div>
          </div>
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <SignOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
