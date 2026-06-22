# PRD — Sistema Inteligente de Gestão e Elaboração de Atas com IA

## Problem Statement
Sistema web responsivo para gerenciamento completo de reuniões com IA: agendamento, condução com gravação/transcrição, geração automática de atas, controle de deliberações, exportação e armazenamento.

## Stack
- Backend: FastAPI + MongoDB + Motor
- Frontend: React 19 + React Router + Tailwind + Shadcn UI + Phosphor Icons
- IA: OpenAI Whisper (transcrição) + GPT-5.2 (geração de ata) via Emergent Universal Key
- Auth: JWT custom (bcrypt)
- Export: ReportLab (PDF) + python-docx (DOCX)

## User Personas
- Secretário institucional (cria, conduz, edita atas)
- Presidente / Coordenador (aprova)
- Participante (recebe, lê)

## What's Implemented (2026-02)
- Auth (register/login/me) JWT
- Dashboard com KPIs + listagem de reuniões agendadas/histórico + busca
- Cadastro de reunião com participantes + agenda + templates pré-configurados
- Detalhe da reunião com lista de participantes/agenda e botão Iniciar Reunião
- Condução de reunião: gravação MediaRecorder → upload → Whisper → transcrição
- Finalização por tópico via GPT-5.2 (discussão, deliberação, encaminhamento, responsável, prazo)
- Geração automática de ata completa + resumo executivo + próxima pauta sugerida
- Editor rico de ata (contentEditable) com toolbar formatação
- Exportação PDF e DOCX
- Painel de Deliberações com atualização de status

## Backlog (P1/P2)
- P1: Modelos de ata personalizados (CRUD pelo usuário)
- P1: Upload de logotipo/marca d'água e configuração visual da instituição
- P1: Drag-and-drop real na ordem do dia (atualmente reordenável por código)
- P1: Aprovação de ata + histórico de versões
- P1: Envio automático por e-mail (integração SendGrid/Resend)
- P2: Lembretes 30/15/7/1 dia antes (job scheduler)
- P2: Permissões/papéis múltiplos (admin, secretário, coordenador, leitor)
- P2: Importação de participantes por planilha
- P2: Reuniões recorrentes
- P2: Assinatura eletrônica (ICP-Brasil / Gov.br)
- P2: Exportação ODT/HTML
- P2: Comentários no editor + controle de versão visual
- P2: Integração WhatsApp/Teams
EOF
