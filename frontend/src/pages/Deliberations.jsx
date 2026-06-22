import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "aberto", label: "Aberto", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "em_andamento", label: "Em andamento", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "concluido", label: "Concluído", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "cancelado", label: "Cancelado", color: "bg-slate-100 text-slate-600 border-slate-200" },
];

export default function Deliberations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/deliberations");
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/deliberations/${id}`, { status });
      toast.success("Status atualizado");
      setItems((arr) => arr.map((d) => (d.id === id ? { ...d, status } : d)));
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto" data-testid="deliberations-page">
      <div className="label-eyebrow mb-2">Acompanhamento</div>
      <h1 className="font-display font-black text-4xl tracking-tight mb-8">Deliberações</h1>

      <Card className="border-slate-200 shadow-none overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500" data-testid="empty-deliberations">
            Nenhuma deliberação registrada ainda. Realize uma reunião e a IA registrará automaticamente as decisões.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="deliberations-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 label-eyebrow">Ata #</th>
                <th className="px-4 py-3 label-eyebrow">Tópico</th>
                <th className="px-4 py-3 label-eyebrow">Decisão</th>
                <th className="px-4 py-3 label-eyebrow">Responsável</th>
                <th className="px-4 py-3 label-eyebrow">Prazo</th>
                <th className="px-4 py-3 label-eyebrow">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const opt = STATUS_OPTIONS.find((s) => s.value === d.status);
                return (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`deliberation-${d.id}`}>
                    <td className="px-4 py-4 font-mono text-slate-500">#{String(d.meeting_number).padStart(3, "0")}</td>
                    <td className="px-4 py-4 font-semibold">{d.topic_title}</td>
                    <td className="px-4 py-4 text-slate-700 max-w-md">{d.decision}</td>
                    <td className="px-4 py-4 text-slate-600">{d.responsible || "—"}</td>
                    <td className="px-4 py-4 text-slate-600">{d.deadline || "—"}</td>
                    <td className="px-4 py-4">
                      <Select value={d.status} onValueChange={(v) => updateStatus(d.id, v)}>
                        <SelectTrigger className={`h-8 w-36 border ${opt?.color}`} data-testid={`status-select-${d.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
