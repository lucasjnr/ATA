import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, FilePdf, FileDoc, FloppyDisk, Sparkle } from "@phosphor-icons/react";

export default function AtaEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/meetings/${id}`);
    setMeeting(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (meeting && editorRef.current && !editorRef.current.dataset.initialized) {
      editorRef.current.innerHTML = meeting.ata_content || "<p>Ata ainda não gerada.</p>";
      editorRef.current.dataset.initialized = "true";
    }
  }, [meeting]);

  const save = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      await api.patch(`/meetings/${id}`, { ata_content: editorRef.current.innerHTML });
      toast.success("Ata salva");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/meetings/${id}/generate-ata`);
      if (editorRef.current) editorRef.current.innerHTML = data.ata_completa;
      toast.success("Ata regenerada pela IA");
      await load();
    } catch {
      toast.error("Erro ao regenerar");
    } finally {
      setSaving(false);
    }
  };

  const exportFile = (format) => {
    const token = localStorage.getItem("ata_token");
    fetch(`${API}/meetings/${id}/export/${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ata_${meeting.number}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const exec = (cmd) => document.execCommand(cmd, false, null);

  if (!meeting) return <div className="p-8 text-slate-500">Carregando…</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto" data-testid="ata-editor-page">
      <button onClick={() => navigate(`/meetings/${id}`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      <header className="mb-6 flex items-end justify-between">
        <div>
          <div className="label-eyebrow mb-2">Ata #{String(meeting.number).padStart(3, "0")}</div>
          <h1 className="font-display font-black text-4xl tracking-tight">{meeting.title}</h1>
          <div className="text-sm text-slate-600 mt-2">{meeting.date} · {meeting.meeting_type}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={regenerate} disabled={saving} data-testid="regenerate-ata-btn">
            <Sparkle size={16} /> Regenerar IA
          </Button>
          <Button variant="outline" onClick={() => exportFile("pdf")} data-testid="export-pdf-btn">
            <FilePdf size={16} /> PDF
          </Button>
          <Button variant="outline" onClick={() => exportFile("docx")} data-testid="export-docx-btn">
            <FileDoc size={16} /> DOCX
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[#0055FF] hover:bg-[#0044CC]" data-testid="save-ata-btn">
            <FloppyDisk size={16} /> Salvar
          </Button>
        </div>
      </header>

      <Tabs defaultValue="ata">
        <TabsList className="mb-4">
          <TabsTrigger value="ata" data-testid="tab-ata">Ata Completa</TabsTrigger>
          <TabsTrigger value="summary" data-testid="tab-summary">Resumo Executivo</TabsTrigger>
          <TabsTrigger value="next" data-testid="tab-next">Próxima Pauta</TabsTrigger>
        </TabsList>

        <TabsContent value="ata">
          <Card className="p-0 border-slate-200 shadow-none overflow-hidden">
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50">
              <Button size="sm" variant="ghost" onClick={() => exec("bold")} className="font-bold" data-testid="format-bold">B</Button>
              <Button size="sm" variant="ghost" onClick={() => exec("italic")} className="italic" data-testid="format-italic">I</Button>
              <Button size="sm" variant="ghost" onClick={() => exec("underline")} className="underline" data-testid="format-underline">U</Button>
              <div className="w-px h-5 bg-slate-300 mx-2" />
              <Button size="sm" variant="ghost" onClick={() => exec("insertUnorderedList")} data-testid="format-ul">• Lista</Button>
              <Button size="sm" variant="ghost" onClick={() => exec("insertOrderedList")} data-testid="format-ol">1. Lista</Button>
              <div className="w-px h-5 bg-slate-300 mx-2" />
              <Button size="sm" variant="ghost" onClick={() => exec("formatBlock", "h2")} data-testid="format-h2">H2</Button>
              <Button size="sm" variant="ghost" onClick={() => exec("formatBlock", "h3")} data-testid="format-h3">H3</Button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="prose max-w-none p-10 min-h-[60vh] focus:outline-none bg-white"
              style={{ fontFamily: "IBM Plex Sans, sans-serif", lineHeight: 1.7 }}
              data-testid="ata-editor"
            />
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="p-10 border-slate-200 shadow-none bg-white">
            <div className="label-eyebrow mb-3">Resumo Executivo</div>
            <p className="text-slate-800 leading-relaxed text-lg" data-testid="executive-summary">
              {meeting.executive_summary || "Resumo ainda não gerado."}
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="next">
          <Card className="p-10 border-slate-200 shadow-none bg-white">
            <div className="label-eyebrow mb-3">Sugestão de Pauta — Próxima Reunião</div>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: meeting.next_agenda || "<p>Não gerado ainda.</p>" }}
              data-testid="next-agenda"
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
