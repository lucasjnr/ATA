import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Microphone, FileText, Trash, Play, CalendarBlank } from "@phosphor-icons/react";

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/meetings/${id}`);
      setMeeting(data);
    } catch (err) {
      toast.error("Erro ao carregar reunião");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startMeeting = async () => {
    try {
      await api.post(`/meetings/${id}/start`);
      navigate(`/meetings/${id}/conduct`);
    } catch {
      toast.error("Erro ao iniciar reunião");
    }
  };

  const remove = async () => {
    if (!confirm("Excluir esta reunião?")) return;
    await api.delete(`/meetings/${id}`);
    toast.success("Reunião excluída");
    navigate("/");
  };

  if (!meeting) return <div className="p-8 text-slate-500">Carregando…</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="meeting-detail-page">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <div className="label-eyebrow mb-2">Reunião #{String(meeting.number).padStart(3, "0")}</div>
          <h1 className="font-display font-black text-4xl tracking-tight">{meeting.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
            <span className="flex items-center gap-1"><CalendarBlank size={14} /> {meeting.date} · {meeting.start_time}</span>
            <span>{meeting.meeting_type}</span>
            <Badge variant="outline">{meeting.status}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {meeting.status === "completed" || meeting.status === "approved" ? (
            <Button onClick={() => navigate(`/meetings/${id}/ata`)} className="bg-[#0055FF] hover:bg-[#0044CC]" data-testid="view-ata-btn">
              <FileText size={16} /> Ver Ata
            </Button>
          ) : meeting.status === "in_progress" ? (
            <Button onClick={() => navigate(`/meetings/${id}/conduct`)} className="bg-[#FF3B30] hover:bg-[#E0342A]" data-testid="continue-meeting-btn">
              <Microphone size={16} weight="fill" /> Continuar Reunião
            </Button>
          ) : (
            <Button onClick={startMeeting} className="bg-[#FF3B30] hover:bg-[#E0342A]" data-testid="start-meeting-btn">
              <Play size={16} weight="fill" /> Iniciar Reunião
            </Button>
          )}
          <Button variant="outline" onClick={remove} data-testid="delete-meeting-btn">
            <Trash size={16} />
          </Button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-slate-200 shadow-none">
          <div className="label-eyebrow mb-2">Local</div>
          <div className="font-semibold">{meeting.location || "—"}</div>
        </Card>
        <Card className="p-5 border-slate-200 shadow-none">
          <div className="label-eyebrow mb-2">Presidente</div>
          <div className="font-semibold">{meeting.president || "—"}</div>
        </Card>
        <Card className="p-5 border-slate-200 shadow-none">
          <div className="label-eyebrow mb-2">Secretário</div>
          <div className="font-semibold">{meeting.secretary || "—"}</div>
        </Card>
      </div>

      <Card className="p-6 mb-6 border-slate-200 shadow-none">
        <h2 className="font-display text-xl font-bold mb-4">Participantes ({meeting.participants.length})</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {meeting.participants.map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200" data-testid={`participant-${i}`}>
              <div>
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-slate-500">{p.role || "—"} · {p.institution || "—"}</div>
              </div>
              <Badge variant={p.present ? "default" : "outline"} className={p.present ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                {p.present ? "Presente" : "Ausente"}
              </Badge>
            </div>
          ))}
          {meeting.participants.length === 0 && <div className="text-sm text-slate-500">Sem participantes registrados.</div>}
        </div>
      </Card>

      <Card className="p-6 border-slate-200 shadow-none">
        <h2 className="font-display text-xl font-bold mb-4">Ordem do dia</h2>
        <div className="space-y-2">
          {meeting.agenda.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200" data-testid={`agenda-item-${i}`}>
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-xs font-mono font-bold">{i + 1}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{t.title}</div>
                {t.summary && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.summary}</div>}
              </div>
              <Badge variant="outline" className={
                t.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                t.status === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-slate-100 text-slate-600"
              }>
                {t.status === "completed" ? "Concluído" : t.status === "in_progress" ? "Em andamento" : "Pendente"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
