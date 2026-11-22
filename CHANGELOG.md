# Changelog — Cat Line

Todas as alterações notáveis do projeto Cat Line são documentadas neste arquivo.

## [3.3.0] — 2026-11-22

### ✨ Novidades (já no código desde 13/11)
- Novelo nas notificações (4 estados × 7 cores), avisos escalonados de prazo e reagendamento no boot.
- Atividades avulsas 1x/2x, visão semanal, aviso de conflito de horário e soneca na notificação.
- Espelhamento automático de dados com restauração segura via cofre nativo Android.

### 💜 Humor do dia
- Check-in de humor na aba Hoje, com 5 níveis e resposta da gatinha. Um registro por dia, interruptor próprio e incluído no backup.
- Depois de 7 dias de registro, o app compara os dias leves com os dias bons em linguagem de coincidência, sem julgamento.

### 🔒 Segurança
- O workflow agora regenera o `CatLine-App.html` antes de compilar o APK, para o APK nunca sair com uma versão defasada do app.
- Assinatura do APK agora usa keystore informado por variáveis de ambiente (`CATLINE_KEYSTORE`, `CATLINE_KEYSTORE_PASS`); a senha fixa foi removida do código. Sem as variáveis, o build usa uma chave local de desenvolvimento e avisa que não deve ser publicado.
- Workflow de release só publica quando os segredos de assinatura existem e usa a versão do `versionName` como tag.
- Todo texto digitado pela usuária passa por `escHtml` antes de entrar em `innerHTML`.
- Importação de backup rejeita identificadores com aspas, tags ou espaços.
- WebView sem acesso a arquivos arbitrários nem a content providers; CSP básica (`object-src`, `frame-src`, `base-uri`, `form-action`).
- Nova suíte `test-phase21-xss.js`.

## [3.2.0] — 2026-11-11

### ✨ Novidades e Melhorias

#### 🎯 Metas com Passos Editáveis
- Passos independentes e reordenáveis dentro de cada Meta, com estimativa em minutos (`estMinutes`) e data opcional.
- Botão "Agendar este passo" nos detalhes da meta, permitindo transformar qualquer passo em compromisso na linha do tempo em 2 toques.
- Cálculo de progresso da meta proporcional aos passos ou ponderado pelas estimativas.
- Divisão de passos (ícone ✂️) e arquivamento sem perda de histórico ou recompensas.

#### 📅 Máquina de Estados de Compromissos
- Estados rigorosos: `pending`, `done`, `missed`, `rescheduled` e `unmarked`.
- Check-in ao vivo (+2 Peixinhos e bônus de pontualidade +1 Peixinho) e retroativo (multiplicador 0.5x).
- Prompt acolhedor pós-check-in para confirmar conclusão de passos vinculados.
- Opção explícita de "Não cumpri" com zero dedução e linguagem sem julgamento ou culpa.
- Reagendamento seguro mantendo rastreabilidade do compromisso original (`rescheduledFromId`).
- Janela de desfazer de 10 minutos com lançamento compensatório no livro-razão.

#### 🌅 Fechamento do Dia Lógico (04:00)
- Resolução afetuosa de compromissos que ficaram sem resposta (`unmarked`) na virada do dia lógico às 04:00.
- Ações individuais (Cumpri, Não Cumpri, Remarcar) ou em lote com confirmação explícita.
- Emissão de +1 Coração de vínculo com a gatinha de forma idempotente (`day_closure:<diaLógico>`).

#### 💌 Log Semanal e Carta da Gatinha (Templates Declarativos)
- Relatório semanal imutável com taxas de cumprimento, pontualidade e mediana de atraso ("O Fio").
- Barreira de 7 dias para qualquer recorte ou inferência (melhor dia e faixa horária).
- Carta afetuosa da gatinha gerada por templates declarativos versionados (100% offline, zero dependência de LLM ou chamadas de rede).
- Sugestão suave e opcional de recalibração de horários para tarefas com atraso recorrente.

#### ⚖️ Livro-Razão de Recompensas e Anti-Farm
- Registros idempotentes com chave única (`kind:refId[:detalhes]`).
- Teto diário de 15 Peixinhos e 30 minutos de rede social.
- Resposta carinhosa da gatinha ao atingir os limites diários.
- Trava anti-farm para micro-tarefas com duração inferior a 5 minutos.

#### 🔀 Interruptores de Módulos (AD-11)
- Interruptores independentes para `METAS_PASSOS`, `COMPROMISSOS` e `LOG_SEMANAL`.
- Desligamento de módulos oculta a interface sem apagar ou corromper dados persistidos.

#### 💾 Backup Schema v2
- Exportação e importação completas em JSON (`schemaVersion: 2`).
- Importação idempotente com deduplicação de recompensas e logs semanais.
- Migração automática e transparente de backups legados com `schemaVersion: 1`.

#### 🧪 Qualidade e Verificação
- Suíte completa de 20 fases de testes automatizados com 100% de sucesso (`node scripts/run-all-tests.js`).
- Compilação e assinatura oficial do `CatLine.apk` (API 33, zipalign 4 bytes, esquemas v1, v2 e v3 verificados).
- Standalone `CatLine-App.html` (581.56 KB).
- Roteiro de homologação manual em `docs/CHECKLIST_TESTE_MANUAL.md`.
