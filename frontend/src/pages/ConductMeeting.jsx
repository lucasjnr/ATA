import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Microphone,
  Stop,
  CheckCircle,
  CaretRight,
  Sparkle,
  ArrowRight,
} from "@phosphor-icons/react";

function WaveForm({ active }) {
  return (
    <div className="flex items-center justify-center h-10 px-3">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            animationPlayState: active ? "running" : "paused",
            opacity: active ? 1 : 0.3,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function ConductMeeting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const load = async () => {
    const { data } = await api.get(`/meetings/${id}`);
    setMeeting(data);
    const firstPending = data.agenda.findIndex((t) => t.status !== "completed");
    setActiveTopicIdx(firstPending >= 0 ? firstPending : data.agenda.length - 1);
  };

  useEffect(() => {
    load();
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!meeting) return <div className="p-8 text-slate-500">Carregando…</div>;

  const activeTopic = meeting.agenda[activeTopicIdx];
  const allCompleted = meeting.agenda.every((t) => t.status === "completed");

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        await uploadAudio(blob, mime);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setProcessing(true);
    }
  };

  const uploadAudio = async (blob, mime) => {
    try {
      const ext = mime.includes("webm") ? "webm" : "m4a";
      const fd = new FormData();
      fd.append("file", blob, `topic-${activeTopic.id}.${ext}`);
      const { data } = await api.post(
        `/meetings/${id}/topics/${activeTopic.id}/transcribe`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("Transcrição adicionada");
      // Append to local state
      setMeeting((m) => {
        const ag = [...m.agenda];
        ag[activeTopicIdx] = { ...ag[activeTopicIdx], transcription: (ag[activeTopicIdx].transcription || "") + " " + data.text };
        return { ...m, agenda: ag };
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Falha na transcrição");
    } finally {
      setProcessing(false);
    }
  };

  const finalizeTopic = async () => {
    setFinalizing(true);
    try {
      // If has manual note, append to transcription before finalize
      if (manualNote.trim()) {
        await api.patch(`/meetings/${id}`, {
          agenda: meeting.agenda.map((t, idx) =>
            idx === activeTopicIdx
              ? { ...t, transcription: (t.transcription || "") + "\n\n[Nota manual]: " + manualNote }
              : t
          ),
        });
      }
      const { data } = await api.post(`/meetings/${id}/topics/${activeTopic.id}/finalize`);
      toast.success("Tópico encerrado");
      setManualNote("");
      await load();
      // Move to next
      const nextIdx = meeting.agenda.findIndex((t, i) => i > activeTopicIdx && t.status !== "completed");
      if (nextIdx >= 0) setActiveTopicIdx(nextIdx);
    } catch (err) {
      toast.error("Erro ao encerrar tópico");
    } finally {
      setFinalizing(false);
    }
  };

  const generateAta = async () => {
    setFinalizing(true);
    try {
      await api.post(`/meetings/${id}/generate-ata`);
      toast.success("Ata gerada!");
      navigate(`/meetings/${id}/ata`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao gerar ata");
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFC]" data-testid="conduct-page">
      {/* Sticky header */}
      <header className="glass sticky top-0 z-10 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/meetings/${id}`)} className="text-slate-500 hover:text-slate-900 text-sm" data-testid="exit-btn">
            ← Sair
          </button>
          <div>
            <div className="text-xs text-slate-500">ATA #{String(meeting.number).padStart(3, "0")}</div>
            <div className="font-semibold text-sm">{meeting.title}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {recording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] recording-pulse" />
              <span className="text-xs font-semibold text-rose-700">GRAVANDO</span>
              <WaveForm active={recording} />
            </div>
          )}
          {processing && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Sparkle size={12} className="mr-1 animate-pulse" /> Transcrevendo…
            </Badge>
          )}
          {allCompleted ? (
            <Button onClick={generateAta} disabled={finalizing} className="bg-[#0055FF] hover:bg-[#0044CC]" data-testid="generate-ata-btn">
              <Sparkle size={16} weight="fill" /> {finalizing ? "Gerando ata…" : "Gerar Ata Completa"}
            </Button>
          ) : (
            <Badge variant="outline">
              {meeting.agenda.filter((t) => t.status === "completed").length}/{meeting.agenda.length} tópicos
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: agenda */}
        <aside className="w-80 border-r border-slate-200 bg-white overflow-y-auto" data-testid="agenda-sidebar">
          <div className="p-5 border-b border-slate-200">
            <div className="label-eyebrow mb-1">Ordem do dia</div>
            <h2 className="font-display font-bold text-lg">Tópicos</h2>
          </div>
          <div className="p-3 space-y-1">
            {meeting.agenda.map((t, i) => {
              const isActive = i === activeTopicIdx;
              const isLocked = i > activeTopicIdx && meeting.agenda.slice(0, i).some((x) => x.status !== "completed");
              return (
                <button
                  key={t.id}
                  onClick={() => !isLocked && setActiveTopicIdx(i)}
                  disabled={isLocked}
                  className={`w-full text-left p-3 rounded-md border transition-all ${
                    isActive
                      ? "border-[#0055FF] bg-blue-50/50"
                      : isLocked
                      ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                  data-testid={`topic-${i}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold ${
                      t.status === "completed" ? "bg-emerald-100 text-emerald-700" : isActive ? "bg-[#0055FF] text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {t.status === "completed" ? <CheckCircle size={12} weight="fill" /> : i + 1}
                    </div>
                    <div className="flex-1 text-sm font-semibold truncate">{t.title}</div>
                    {isActive && <CaretRight size={14} className="text-[#0055FF]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right: transcription */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto fade-up">
            <div className="label-eyebrow mb-2">Tópico {activeTopicIdx + 1}</div>
            <h1 className="font-display font-black text-3xl tracking-tight mb-2">{activeTopic.title}</h1>
            <div className="text-sm text-slate-500 mb-6">
              Status: {activeTopic.status === "completed" ? "Concluído" : "Em discussão"}
            </div>

            {/* Recorder card */}
            <Card className="p-8 mb-6 border-slate-200 shadow-none flex flex-col items-center" data-testid="recorder-card">
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={processing || activeTopic.status === "completed"}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  recording
                    ? "bg-[#FF3B30] hover:bg-[#E0342A] recording-pulse"
                    : "bg-[#0055FF] hover:bg-[#0044CC]"
                } text-white disabled:opacity-40 disabled:cursor-not-allowed`}
                data-testid="record-btn"
              >
                {recording ? <Stop size={28} weight="fill" /> : <Microphone size={28} weight="fill" />}
              </button>
              <div className="mt-4 text-sm font-semibold">
                {recording ? "Toque para parar e transcrever" : processing ? "Processando áudio…" : "Toque para gravar"}
              </div>
              <div className="text-xs text-slate-500 mt-1">Português · Whisper AI</div>
            </Card>

            {/* Transcription */}
            <Card className={`p-6 mb-6 border-slate-200 shadow-none ${recording ? "tracing-beam" : ""}`} data-testid="transcription-card">
              <div className="label-eyebrow mb-3">Transcrição</div>
              {activeTopic.transcription ? (
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{activeTopic.transcription}</p>
              ) : (
                <p className="text-slate-400 italic">Inicie a gravação para ver a transcrição aparecer aqui.</p>
              )}
            </Card>

            {/* Manual note */}
            {activeTopic.status !== "completed" && (
              <Card className="p-6 mb-6 border-slate-200 shadow-none">
                <div className="label-eyebrow mb-3">Anotação manual (opcional)</div>
                <Textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Acrescente observações que a IA deve considerar ao gerar o resumo…"
                  rows={3}
                  data-testid="manual-note-input"
                />
              </Card>
            )}

            {/* Summary if completed */}
            {activeTopic.status === "completed" && (
              <Card className="p-6 mb-6 border-emerald-200 bg-emerald-50/30 shadow-none" data-testid="topic-summary">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                  <div className="label-eyebrow text-emerald-700">Encerrado</div>
                </div>
                <div className="space-y-3 text-sm">
                  <div><b>Discussão:</b> {activeTopic.summary}</div>
                  <div><b>Deliberação:</b> {activeTopic.deliberation}</div>
                  <div><b>Encaminhamento:</b> {activeTopic.encaminhamento}</div>
                  <div className="flex gap-6">
                    <div><b>Responsável:</b> {activeTopic.responsible}</div>
                    <div><b>Prazo:</b> {activeTopic.deadline}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Actions */}
            {activeTopic.status !== "completed" && (
              <div className="flex justify-end">
                <Button
                  onClick={finalizeTopic}
                  disabled={finalizing || recording || processing}
                  className="bg-[#0055FF] hover:bg-[#0044CC]"
                  data-testid="finalize-topic-btn"
                >
                  {finalizing ? "Encerrando…" : (<>Encerrar Tópico <ArrowRight size={16} /></>)}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
