import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, UserPlus, ListBullets } from "@phosphor-icons/react";

const MEETING_TYPES = [
  "Reunião Administrativa",
  "Conselho",
  "Diretoria",
  "Comitê",
  "Comissão",
  "Assembleia",
  "Grupo de Trabalho",
  "Reunião Técnica",
  "Outros",
];

export default function NewMeeting() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    meeting_type: "Reunião Administrativa",
    date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "10:30",
    location: "",
    responsible: "",
    secretary: "",
    president: "",
  });
  const [participants, setParticipants] = useState([{ name: "", role: "", email: "", institution: "", present: true }]);
  const [agenda, setAgenda] = useState([{ title: "Aprovação da ata anterior" }]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/templates").then((r) => setTemplates(r.data));
  }, []);

  const applyTemplate = (tplId) => {
    setSelectedTemplate(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) setAgenda(tpl.agenda.map((a) => ({ title: a.title })));
  };

  const change = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const handleParticipant = (i, key, val) => {
    setParticipants((arr) => arr.map((p, idx) => (idx === i ? { ...p, [key]: val } : p)));
  };

  const handleAgenda = (i, val) => {
    setAgenda((arr) => arr.map((a, idx) => (idx === i ? { ...a, title: val } : a)));
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Informe o título");
    if (agenda.filter((a) => a.title.trim()).length === 0) return toast.error("Adicione ao menos um item na pauta");

    setSaving(true);
    try {
      const payload = {
        ...form,
        participants: participants.filter((p) => p.name.trim()),
        agenda: agenda
          .filter((a) => a.title.trim())
          .map((a, i) => ({ title: a.title, description: "", order: i, status: "pending" })),
      };
      const { data } = await api.post("/meetings", payload);
      toast.success("Reunião criada!");
      navigate(`/meetings/${data.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao criar reunião");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="new-meeting-page">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4" data-testid="back-btn">
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="label-eyebrow mb-2">Cadastro</div>
      <h1 className="font-display font-black text-4xl tracking-tight mb-8">Nova Reunião</h1>

      <Card className="p-6 mb-6 border-slate-200 shadow-none">
        <h2 className="font-display text-xl font-bold mb-5 flex items-center gap-2">
          <ListBullets size={20} className="text-[#0055FF]" /> Informações gerais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold">Título *</Label>
            <Input value={form.title} onChange={change("title")} className="mt-1.5 h-10" data-testid="meeting-title-input" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Tipo de Reunião</Label>
            <Select value={form.meeting_type} onValueChange={(v) => setForm((s) => ({ ...s, meeting_type: v }))}>
              <SelectTrigger className="mt-1.5 h-10" data-testid="meeting-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEETING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Local</Label>
            <Input value={form.location} onChange={change("location")} className="mt-1.5 h-10" data-testid="meeting-location-input" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Data</Label>
            <Input type="date" value={form.date} onChange={change("date")} className="mt-1.5 h-10" data-testid="meeting-date-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Início</Label>
              <Input type="time" value={form.start_time} onChange={change("start_time")} className="mt-1.5 h-10" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Término</Label>
              <Input type="time" value={form.end_time} onChange={change("end_time")} className="mt-1.5 h-10" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Presidente / Coordenador</Label>
            <Input value={form.president} onChange={change("president")} className="mt-1.5 h-10" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Secretário</Label>
            <Input value={form.secretary} onChange={change("secretary")} className="mt-1.5 h-10" />
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6 border-slate-200 shadow-none">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <UserPlus size={20} className="text-[#0055FF]" /> Participantes
          </h2>
          <Button variant="outline" size="sm" onClick={() => setParticipants((p) => [...p, { name: "", role: "", email: "", institution: "", present: true }])} data-testid="add-participant-btn">
            <Plus size={14} /> Adicionar
          </Button>
        </div>
        <div className="space-y-3">
          {participants.map((p, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
              <Input placeholder="Nome" value={p.name} onChange={(e) => handleParticipant(i, "name", e.target.value)} className="h-10" data-testid={`participant-name-${i}`} />
              <Input placeholder="Cargo" value={p.role} onChange={(e) => handleParticipant(i, "role", e.target.value)} className="h-10" />
              <Input placeholder="E-mail" value={p.email} onChange={(e) => handleParticipant(i, "email", e.target.value)} className="h-10" />
              <Input placeholder="Instituição" value={p.institution} onChange={(e) => handleParticipant(i, "institution", e.target.value)} className="h-10" />
              <Button variant="ghost" size="icon" onClick={() => setParticipants((arr) => arr.filter((_, idx) => idx !== i))} data-testid={`remove-participant-${i}`}>
                <X size={16} />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 mb-6 border-slate-200 shadow-none">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <ListBullets size={20} className="text-[#0055FF]" /> Ordem do dia
          </h2>
          <div className="flex items-center gap-2">
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger className="h-9 w-56 text-sm" data-testid="template-select">
                <SelectValue placeholder="Usar modelo…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setAgenda((a) => [...a, { title: "" }])} data-testid="add-agenda-btn">
              <Plus size={14} /> Tópico
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {agenda.map((a, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2" data-testid={`agenda-row-${i}`}>
              <div className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-xs font-mono text-slate-500">{i + 1}</div>
              <Input
                value={a.title}
                onChange={(e) => handleAgenda(i, e.target.value)}
                placeholder={`Tópico ${i + 1}`}
                className="h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                data-testid={`agenda-input-${i}`}
              />
              <Button variant="ghost" size="icon" onClick={() => setAgenda((arr) => arr.filter((_, idx) => idx !== i))} data-testid={`remove-agenda-${i}`}>
                <X size={16} />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/")} data-testid="cancel-btn">Cancelar</Button>
        <Button onClick={submit} disabled={saving} className="bg-[#0055FF] hover:bg-[#0044CC]" data-testid="submit-meeting-btn">
          {saving ? "Salvando…" : "Criar Reunião"}
        </Button>
      </div>
    </div>
  );
}
