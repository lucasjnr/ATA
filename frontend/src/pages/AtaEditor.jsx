import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  FilePdf,
  FileDoc,
  FloppyDisk,
  Sparkle,
  TextBolder,
  TextItalic,
  TextUnderline,
  ListBullets,
  ListNumbers,
  TextH,
  CalendarBlank,
  CheckCircle,
} from "@phosphor-icons/react";

export default function AtaEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const editorRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/meetings/${id}`);
    setMeeting(data);
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line

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
      toast.success("Ata salva com sucesso");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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

  const exec = (cmd, val) => document.execCommand(cmd, false, val ?? null);

  if (!meeting) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="h-8 w-32 shimmer rounded-lg mb-6" />
        <div className="h-12 w-96 shimmer rounded-xl mb-4" />
        <div className="h-96 shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto" data-testid="ata-editor-page">
      <button
        onClick={() => navigate(`/meetings/${id}`)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Voltar à reunião
      </button>

      {/* ── Header ── */}
      <header className="mb-6 flex items-start justify-between gap-4 fade-up">
        <div>
          <div className="label-eyebrow mb-2 text-slate-400">
            ATA #{String(meeting.number).padStart(3, "0")}
          </div>
          <h1 className="font-display font-black text-4xl tracking-tight text-slate-900">
            {meeting.title}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarBlank size={13} className="text-slate-400" />
              {meeting.date}
            </span>
            <span className="text-slate-300">·</span>
            <span>{meeting.meeting_type}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <Button
            variant="outline"
            onClick={regenerate}
            disabled={saving}
            className="rounded-xl border-slate-200 gap-1.5"
            data-testid="regenerate-ata-btn"
          >
            <Sparkle size={15} className="text-[#0055FF]" />
            Regenerar IA
          </Button>
          <Button
            variant="outline"
            onClick={() => exportFile("pdf")}
            className="rounded-xl border-slate-200 gap-1.5"
            data-testid="export-pdf-btn"
          >
            <FilePdf size={15} className="text-red-500" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => exportFile("docx")}
            className="rounded-xl border-slate-200 gap-1.5"
            data-testid="export-docx-btn"
          >
            <FileDoc size={15} className="text-blue-500" /> DOCX
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className={`rounded-xl shadow-lg gap-1.5 transition-all ${
              saved
                ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                : "bg-[#0055FF] hover:bg-[#0044CC] shadow-blue-500/20"
            }`}
            data-testid="save-ata-btn"
          >
            {saved ? (
              <><CheckCircle size={15} weight="fill" /> Salvo</>
            ) : saving ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando…</>
            ) : (
              <><FloppyDisk size={15} /> Salvar</>
            )}
          </Button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <Tabs defaultValue="ata" className="fade-up-delay-1">
        <TabsList className="mb-5 bg-white border border-slate-200/80 rounded-xl p-1 shadow-sm">
          <TabsTrigger
            value="ata"
            className="rounded-lg data-[state=active]:bg-[#0055FF] data-[state=active]:text-white data-[state=active]:shadow"
            data-testid="tab-ata"
          >
            Ata Completa
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="rounded-lg data-[state=active]:bg-[#0055FF] data-[state=active]:text-white data-[state=active]:shadow"
            data-testid="tab-summary"
          >
            Resumo Executivo
          </TabsTrigger>
          <TabsTrigger
            value="next"
            className="rounded-lg data-[state=active]:bg-[#0055FF] data-[state=active]:text-white data-[state=active]:shadow"
            data-testid="tab-next"
          >
            Próxima Pauta
          </TabsTrigger>
        </TabsList>

        {/* ── Full ATA ── */}
        <TabsContent value="ata">
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 flex-wrap">
              <div className="flex items-center">
                <button
                  onClick={() => exec("bold")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-600 font-bold transition-colors"
                  title="Negrito"
                  data-testid="format-bold"
                >
                  <TextBolder size={15} weight="bold" />
                </button>
                <button
                  onClick={() => exec("italic")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors italic"
                  title="Itálico"
                  data-testid="format-italic"
                >
                  <TextItalic size={15} />
                </button>
                <button
                  onClick={() => exec("underline")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors underline"
                  title="Sublinhado"
                  data-testid="format-underline"
                >
                  <TextUnderline size={15} />
                </button>
              </div>

              <div className="w-px h-5 bg-slate-200 mx-1.5" />

              <div className="flex items-center">
                <button
                  onClick={() => exec("insertUnorderedList")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Lista"
                  data-testid="format-ul"
                >
                  <ListBullets size={15} />
                </button>
                <button
                  onClick={() => exec("insertOrderedList")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Lista numerada"
                  data-testid="format-ol"
                >
                  <ListNumbers size={15} />
                </button>
              </div>

              <div className="w-px h-5 bg-slate-200 mx-1.5" />

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => exec("formatBlock", "h2")}
                  className="px-2.5 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                  title="Título H2"
                  data-testid="format-h2"
                >
                  H2
                </button>
                <button
                  onClick={() => exec("formatBlock", "h3")}
                  className="px-2.5 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                  title="Título H3"
                  data-testid="format-h3"
                >
                  H3
                </button>
                <button
                  onClick={() => exec("formatBlock", "p")}
                  className="px-2.5 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-xs text-slate-600 transition-colors"
                  title="Parágrafo"
                >
                  P
                </button>
              </div>
            </div>

            {/* Editor area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="p-10 min-h-[60vh] focus:outline-none bg-white"
              style={{
                fontFamily: "IBM Plex Sans, sans-serif",
                lineHeight: 1.75,
                color: "#334155",
                fontSize: "15px",
              }}
              data-testid="ata-editor"
            />
          </div>
        </TabsContent>

        {/* ── Executive summary ── */}
        <TabsContent value="summary">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <Sparkle size={13} className="text-[#0055FF]" weight="fill" />
              </div>
              <div className="label-eyebrow">Resumo Executivo gerado por IA</div>
            </div>
            <p
              className="text-slate-700 leading-relaxed text-lg"
              data-testid="executive-summary"
            >
              {meeting.executive_summary || (
                <span className="italic text-slate-400">
                  Resumo ainda não gerado. Gere a ata completa primeiro.
                </span>
              )}
            </p>
          </div>
        </TabsContent>

        {/* ── Next agenda ── */}
        <TabsContent value="next">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <CalendarBlank size={13} className="text-[#0055FF]" weight="bold" />
              </div>
              <div className="label-eyebrow">Sugestão de pauta — Próxima reunião</div>
            </div>
            <div
              className="text-slate-700 leading-relaxed"
              style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
              dangerouslySetInnerHTML={{
                __html: meeting.next_agenda || "<p class='text-slate-400 italic'>Não gerado ainda.</p>",
              }}
              data-testid="next-agenda"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
