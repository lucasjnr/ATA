"""
AGL ATAS Intelligent Agent.
Orchestrates AI rewriting of ATA sections, quality scoring,
gap detection, and change logging with accept/reject feedback.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

from .scoring_engine import score_meeting, detect_gaps
from .knowledge_extractor import FORMAL_MARKERS

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY: Optional[str] = None  # injected at startup from env


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── KB context builder ──────────────────────────────────────────────────────

def _build_kb_context(kb_docs: list[dict], max_chars: int = 3000) -> str:
    """Assemble relevant KB text excerpts into a prompt context block."""
    if not kb_docs:
        return ""
    parts = []
    total = 0
    for doc in kb_docs:
        preview = (doc.get("metadata") or {}).get("text_preview", "")
        if preview:
            snippet = f"[{doc.get('filename', 'doc')}]: {preview[:400]}"
            parts.append(snippet)
            total += len(snippet)
            if total >= max_chars:
                break
    return "\n\n".join(parts)


def _build_institutional_profile(settings: dict) -> str:
    """Convert admin settings into a linguistic profile string."""
    lines = []
    if settings.get("institution_name"):
        lines.append(f"Instituição: {settings['institution_name']}")
    if settings.get("ata_style"):
        lines.append(f"Estilo de ata: {settings['ata_style']}")
    if settings.get("formal_markers"):
        lines.append(f"Marcadores formais preferenciais: {', '.join(settings['formal_markers'])}")
    if settings.get("custom_opening"):
        lines.append(f"Abertura padrão: {settings['custom_opening']}")
    if settings.get("custom_closing"):
        lines.append(f"Encerramento padrão: {settings['custom_closing']}")
    return "\n".join(lines) if lines else "Padrão RPPS brasileiro"


# ─── Section rewriters ────────────────────────────────────────────────────────

async def _rewrite_section(
    section_name: str,
    original: str,
    context: str,
    profile: str,
    api_key: str,
    session_id: str,
) -> dict:
    """
    Ask the AI to improve a single ATA section.
    Returns {"original": str, "improved": str, "rationale": str}.
    """
    prompt = f"""Você é um assistente especialista em redação de atas institucionais de RPPS (Regime Próprio de Previdência Social) brasileiros.

Perfil institucional:
{profile}

Exemplos de documentos de referência da base de conhecimento:
{context or "(nenhum documento de referência disponível)"}

Você deve reescrever o trecho abaixo da seção "{section_name}" da ata, tornando-o:
1. Mais formal e preciso (3ª pessoa, voz passiva quando adequado)
2. Conforme os marcadores institucionais do RPPS
3. Claro e sem ambiguidades
4. Alinhado ao estilo dos documentos de referência

Texto original:
\"\"\"
{original[:2000]}
\"\"\"

Retorne JSON puro (sem markdown):
{{
  "improved": "Texto reescrito em português formal",
  "rationale": "Explicação concisa das melhorias aplicadas (max 100 palavras)"
}}"""

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message="Você é especialista em redação de atas institucionais brasileiras. Retorne sempre JSON válido.",
    ).with_model("openai", "gpt-5.2")

    try:
        import json
        result = await chat.send_message(UserMessage(text=prompt))
        content = result.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()
        data = json.loads(content)
        return {
            "original": original,
            "improved": data.get("improved", original),
            "rationale": data.get("rationale", "Melhorado automaticamente."),
        }
    except Exception as e:
        logger.warning(f"Rewrite section error ({section_name}): {e}")
        return {"original": original, "improved": original, "rationale": ""}


# ─── Main agent entry point ────────────────────────────────────────────────────

async def run_agent(
    meeting: dict,
    kb_docs: list[dict],
    settings: dict,
    api_key: str,
) -> dict:
    """
    Run the intelligent agent on a meeting.
    Returns a result dict with proposed changes, quality scores, and gaps.
    """
    meeting_id = meeting.get("id", "")
    profile = _build_institutional_profile(settings)
    kb_context = _build_kb_context(kb_docs)

    # Quality assessment BEFORE agent changes
    scores_before = score_meeting(meeting)
    gaps = detect_gaps(meeting)

    changes: list[dict] = []

    # 1. Rewrite main ATA content if present
    ata_content = meeting.get("ata_content", "").strip()
    if ata_content:
        section_result = await _rewrite_section(
            section_name="Texto Principal da Ata",
            original=ata_content,
            context=kb_context,
            profile=profile,
            api_key=api_key,
            session_id=f"agent-ata-{meeting_id}",
        )
        if section_result["improved"] != section_result["original"]:
            changes.append({
                "id": str(uuid.uuid4()),
                "field": "ata_content",
                "section": "Texto Principal da Ata",
                "original": section_result["original"],
                "proposed": section_result["improved"],
                "rationale": section_result["rationale"],
                "status": "pending",
                "created_at": _now_iso(),
            })

    # 2. Rewrite each topic's deliberation and encaminhamento
    agenda = meeting.get("agenda", [])
    for topic in agenda:
        topic_id = topic.get("id", "")

        for field, section_label in [
            ("deliberation", "Deliberação"),
            ("encaminhamento", "Encaminhamento"),
            ("summary", "Resumo/Discussão"),
        ]:
            text = topic.get(field, "").strip()
            if not text or len(text) < 20:
                continue

            result = await _rewrite_section(
                section_name=f"{section_label} — {topic.get('title', '')}",
                original=text,
                context=kb_context,
                profile=profile,
                api_key=api_key,
                session_id=f"agent-topic-{meeting_id}-{topic_id}-{field}",
            )
            if result["improved"] != result["original"]:
                changes.append({
                    "id": str(uuid.uuid4()),
                    "field": f"agenda.{topic_id}.{field}",
                    "section": f"{section_label} — {topic.get('title', '')}",
                    "original": result["original"],
                    "proposed": result["improved"],
                    "rationale": result["rationale"],
                    "status": "pending",
                    "created_at": _now_iso(),
                })

    # Quality assessment AFTER proposed changes (simulate applying them)
    simulated = dict(meeting)
    for change in changes:
        if change["field"] == "ata_content":
            simulated["ata_content"] = change["proposed"]
    scores_after = score_meeting(simulated)

    return {
        "run_id": str(uuid.uuid4()),
        "meeting_id": meeting_id,
        "changes": changes,
        "changes_count": len(changes),
        "gaps": gaps,
        "scores_before": scores_before,
        "scores_after": scores_after,
        "score_delta": scores_after["overall"] - scores_before["overall"],
        "ran_at": _now_iso(),
    }


# ─── Change feedback (accept / reject) ───────────────────────────────────────

def apply_change_to_meeting(meeting: dict, change: dict) -> dict:
    """
    Apply a single accepted change to the meeting dict in-place.
    Returns the modified meeting.
    """
    field = change.get("field", "")
    proposed = change.get("proposed", "")

    if field == "ata_content":
        meeting["ata_content"] = proposed
    elif field.startswith("agenda."):
        # agenda.<topic_id>.<field>
        parts = field.split(".", 2)
        if len(parts) == 3:
            _, topic_id, topic_field = parts
            for topic in meeting.get("agenda", []):
                if topic.get("id") == topic_id:
                    topic[topic_field] = proposed
                    break

    return meeting


def record_feedback(change: dict, accepted: bool, user_note: str = "") -> dict:
    """Mark a change as accepted or rejected (for learning patterns)."""
    change["status"] = "accepted" if accepted else "rejected"
    change["feedback_at"] = _now_iso()
    if user_note:
        change["user_note"] = user_note
    return change
