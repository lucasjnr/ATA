import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Plus,
  MagnifyingGlass,
  CalendarBlank,
  CheckCircle,
  Clock,
  ArrowRight,
  Microphone,
  FileText,
} from "@phosphor-icons/react";

const STATUS_LABELS = {
  scheduled: { label: "Agendada", color: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "Em andamento", color: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Concluída", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  approved: { label: "Aprovada", color: "bg-violet-50 text-violet-700 border-violet-200" },
};

function KPI({ label, value, icon: Icon, accent, testid }) {
  return (
    <Card className="p-6 border-slate-200 shadow-none hover:shadow-sm transition-shadow" data-testid={testid}>
      <div className="flex items-start justify-between mb-4">
        <div className="label-eyebrow">{label}</div>
        <div className={`w-9 h-9 rounded flex items-center justify-center ${accent}`}>
          <Icon size={18} weight="bold" />
        </div>
      </div>
      <div className="font-display font-black text-5xl tracking-tight text-slate-900">{value}</div>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/meetings", { params: search ? { search } : {} }),
      ]);
      setStats(s.data);
      setMeetings(m.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = meetings.filter((m) => m.status === "scheduled" || m.status === "in_progress");
  const history = meetings.filter((m) => m.status === "completed" || m.status === "approved");
  const filtered = (list) =>
    !search
      ? list
      : list.filter((m) =>
          [m.title, m.meeting_type, m.location, String(m.number)]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
        );

  return (
    <div className="p-8 max-w-7xl mx-auto" data-testid="dashboard-page">
      <header className="flex items-end justify-between mb-10">
        <div>
          <div className="label-eyebrow mb-2">Painel</div>
          <h1 className="font-display font-black text-4xl tracking-tight">Bem-vindo de volta</h1>
          <p className="text-slate-600 mt-1">Gerencie reuniões, atas e deliberações com IA.</p>
        </div>
        <Button
          onClick={() => navigate("/meetings/new")}
          className="bg-[#0055FF] hover:bg-[#0044CC] h-11 px-5"
          data-testid="new-meeting-btn"
        >
          <Plus size={18} weight="bold" /> Nova Reunião
        </Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPI label="Total de Reuniões" value={stats.total_meetings ?? 0} icon={CalendarBlank} accent="bg-blue-50 text-blue-700" testid="kpi-total-meetings" />
        <KPI label="Próximas" value={stats.upcoming_meetings ?? 0} icon={Clock} accent="bg-amber-50 text-amber-700" testid="kpi-upcoming-meetings" />
        <KPI label="Concluídas" value={stats.completed_meetings ?? 0} icon={CheckCircle} accent="bg-emerald-50 text-emerald-700" testid="kpi-completed-meetings" />
        <KPI label="Deliberações Abertas" value={stats.pending_deliberations ?? 0} icon={FileText} accent="bg-rose-50 text-rose-700" testid="kpi-pending-deliberations" />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por título, tipo, local ou número…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            data-testid="meetings-search-input"
          />
        </div>
      </div>

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl font-bold tracking-tight">Reuniões Agendadas</h2>
          <span className="text-sm text-slate-500">{filtered(upcoming).length} reuniões</span>
        </div>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando…</div>
          ) : filtered(upcoming).length === 0 ? (
            <div className="p-12 text-center" data-testid="empty-upcoming">
              <div className="text-slate-400 mb-2">Nenhuma reunião agendada</div>
              <Button variant="outline" onClick={() => navigate("/meetings/new")} className="mt-2">
                <Plus size={16} /> Criar primeira reunião
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="upcoming-meetings-table">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-3 label-eyebrow">Nº</th>
                  <th className="px-4 py-3 label-eyebrow">Título</th>
                  <th className="px-4 py-3 label-eyebrow">Data/Hora</th>
                  <th className="px-4 py-3 label-eyebrow">Local</th>
                  <th className="px-4 py-3 label-eyebrow">Tipo</th>
                  <th className="px-4 py-3 label-eyebrow">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered(upcoming).map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`meeting-row-${m.id}`}>
                    <td className="px-4 py-4 font-mono text-slate-500">#{String(m.number).padStart(3, "0")}</td>
                    <td className="px-4 py-4 font-semibold">{m.title}</td>
                    <td className="px-4 py-4 text-slate-600">{m.date} · {m.start_time}</td>
                    <td className="px-4 py-4 text-slate-600">{m.location || "—"}</td>
                    <td className="px-4 py-4 text-slate-600">{m.meeting_type}</td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className={STATUS_LABELS[m.status]?.color}>
                        {STATUS_LABELS[m.status]?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {m.status === "in_progress" ? (
                        <Button size="sm" onClick={() => navigate(`/meetings/${m.id}/conduct`)} className="bg-[#FF3B30] hover:bg-[#E0342A]" data-testid={`continue-${m.id}`}>
                          <Microphone size={14} weight="fill" /> Continuar
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/meetings/${m.id}`)} data-testid={`open-${m.id}`}>
                          Abrir <ArrowRight size={14} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl font-bold tracking-tight">Histórico de Atas</h2>
          <span className="text-sm text-slate-500">{filtered(history).length} atas</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {filtered(history).length === 0 ? (
            <div className="md:col-span-2 p-12 text-center text-slate-500 border border-slate-200 rounded-lg bg-white" data-testid="empty-history">
              Nenhuma ata concluída ainda.
            </div>
          ) : (
            filtered(history).map((m) => (
              <Card key={m.id} className="p-5 border-slate-200 shadow-none hover:shadow-sm transition-all" data-testid={`history-card-${m.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs font-mono text-slate-500">ATA #{String(m.number).padStart(3, "0")}</div>
                    <h3 className="font-bold text-slate-900 mt-0.5">{m.title}</h3>
                  </div>
                  <Badge variant="outline" className={STATUS_LABELS[m.status]?.color}>
                    {STATUS_LABELS[m.status]?.label}
                  </Badge>
                </div>
                <div className="text-sm text-slate-600 space-y-1 mb-4">
                  <div>{m.date} · {m.meeting_type}</div>
                  <div>{m.location}</div>
                </div>
                <Link to={`/meetings/${m.id}/ata`} className="text-sm font-semibold text-[#0055FF] hover:underline flex items-center gap-1" data-testid={`view-ata-${m.id}`}>
                  Ver ata <ArrowRight size={14} />
                </Link>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
