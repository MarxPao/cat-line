# Dead Line — Fase 0: Plano de Spikes e Relatório de Viabilidade

Status geral: **PENDENTE DE TESTE EM APARELHO FÍSICO (Gate G1)**

Este documento consolida os critérios de go/no-go dos 6 spikes da Fase 0 (Seção 25 do briefing e Seção 8 da arquitetura) e serve para registrar os resultados reais obtidos no celular da cliente antes de avançar para a Fase 6 (Controle).

---

## Dados do Aparelho da Cliente (A preencher no Gate G1)
- **Fabricante / Modelo:** `_________________`
- **Versão do Android / SDK:** `_________________`
- **Camada de sistema (One UI / HyperOS / MIUI / Motorola / etc.):** `_________________`

---

## Matriz de Spikes (S0.1 a S0.6)

| Spike | O que valida | Critério de Go | Status | Resultado / Observações |
|---|---|---|---|---|
| **S0.1 · Acessibilidade e barreira** | `AccessibilityService` detectando pacote em 1º plano, janela `TYPE_ACCESSIBILITY_OVERLAY` com a gatinha por cima do app, ação global `GLOBAL_ACTION_HOME`, WhatsApp fora da lista, liberação de "configurações restritas" no Android 13+. | Overlay abre em `< 300ms` ao abrir app bloqueado; botão de saída de 10s libera sem travar; WhatsApp nunca é bloqueado. | `[ ] Pendente` | Gate humano (aparelho físico) |
| **S0.2 · Uso de apps** | `UsageStatsManager.queryEvents` lendo transições `ACTIVITY_RESUMED` / `ACTIVITY_PAUSED` e batendo com o painel de Bem-Estar Digital do Android. | Diferença `< 5%` em relação ao Bem-Estar Digital do aparelho num dia de uso. | `[ ] Pendente` | Gate humano (aparelho físico) |
| **S0.3 · Notificação e alarme** | `AlarmManager.setExactAndAllowWhileIdle`, notificação com `PendingIntent` de ação "Feito" e sobrevivência com tela apagada por horas. | Alarme dispara com tela apagada; tocar em "Feito" grava check-in sem precisar abrir a Activity. | `[ ] Pendente` | Gate humano (aparelho físico) |
| **S0.4 · Cena 64×64** | Sprite `64×64` em escala inteira (`FilterQuality.None`) numa tela virtual de `180 px` de largura com laço `withFrameNanos` a 30 ticks/s. | Tempo de quadro `< 16ms` (60 fps estável) e pixel art nítida sem serrilhado nem blur. | `[ ] Pendente` | Gate humano (aparelho físico) |
| **S0.5 · LLM em fluxo** | Chamada SSE em streaming via OkHttp com a chave da cliente em um provedor (`Gemini`, `Anthropic` ou `OpenAI`). | Primeiros tokens chegam no balão em `< 2s` e erro de chave inválida é tratado de forma clara. | `[ ] Pendente` | Gate humano (chave da cliente) |
| **S0.6 · Pipeline de arte** | 3 poses da gatinha geradas no Gemini com `docs/prompts-arte.md` e processadas pelo script Python + Pillow (`64×64`, paleta de 16 cores). | Mesma gatinha reconhecível nas 3 poses, fundo transparente limpo e pés alinhados na mesma linha-base. | `[ ] Pendente` | Gate humano (geração e revisão visual) |

---

## Plano de Contingência (Caso algum item dê No-Go no aparelho dela)
1. **Se `TYPE_ACCESSIBILITY_OVERLAY` falhar na OEM dela (S0.1):** usar `SYSTEM_ALERT_WINDOW` ("Exibir sobre outros apps") combinado com `GLOBAL_ACTION_HOME` e uma Activity de barreira em tela cheia.
2. **Se o fabricante matar o serviço em segundo plano agressivamente (S0.1 / S0.3):** ativar o passo a passo dedicado na tela de *Saúde das Permissões* (`dontkillmyapp`: desativar otimização de bateria + travar app nos recentes + autostart) e adicionar um `ForegroundService` opcional nos horários de foco.
