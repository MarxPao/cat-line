# ADAPTACAO_MAPA.md — Mapa de Reconhecimento e Integração Cat Line v3.2.0

> Documento de mapeamento técnico do repositório gerado no **Prompt 0** da adaptação para a versão **v3.2.0** (Metas com passos, Compromissos e Log Semanal).
> Este levantamento foi realizado em modo estritamente somente-leitura sobre o código-fonte, preservando todos os 61 testes automatizados existentes verdes.

---

## 1. Mapeamento da Estrutura Geral e Camadas

O ecossistema do **Cat Line** é construído como uma aplicação híbrida offline-first, composta por:
1. Um núcleo Android com arquitetura modular Kotlin/Compose/Room (16 módulos);
2. Um invólucro Android nativo com WebView acelerada por hardware, serviço de acessibilidade para bloqueio de distrações e ponte JavaScript;
3. Um cliente Web/PWA completo e determinístico em HTML5/Canvas/JavaScript, que executa offline e centraliza as regras de negócio, testes e motores de gamificação.

### 1.1 Camadas Kotlin / Android (Arquitetura Modular)
- **Domínio Puro (`:core-domain`):**
  - Caminho: `core-domain/src/main/kotlin/com/deadline/core/domain/`
  - Restrição inegociável (AD-03): Kotlin/JVM puro (`org.jetbrains.kotlin.jvm`), sem qualquer dependência de `android.*` ou `androidx.*`.
  - Componentes: Entidades (`model/DomainEntities.kt`, `model/IdsAndEnums.kt`), Motores (`engine/DelayEngine.kt`, `engine/EconomyEngine.kt`, `engine/MoodEngine.kt`, `engine/RecurrenceEngine.kt`), Tempo (`time/DayBoundary.kt`, `time/FakeClock.kt`), Configurações (`config/EconomyConfig.kt`, `config/FeatureFlagKey.kt`) e Portas (`port/Ports.kt`).
- **Dados e Persistência (`:core-data`):**
  - Caminho: `core-data/src/main/kotlin/com/deadline/core/data/`
  - Banco de Dados Room (`db/DeadLineDatabase.kt`, `db/Entities.kt`, `db/Daos.kt`): 13 entidades, `SCHEMA_VERSION = 1`, `deadline.db`.
  - Repositórios (`repository/RoomRepositories.kt`, `repository/Phase2Repositories.kt`, `repository/Phase4And5Repositories.kt`, `repository/Phase6FocusRepository.kt`).
  - Feature Flags (`config/DataStoreFeatureFlagsRepository.kt`): Persistência reativa via Jetpack DataStore Preferences.
  - Carregador de Configurações (`config/JsonGameConfigLoader.kt`): Leitor de JSONs versionados.
  - Backup (`backup/DeadLineBackupPayload.kt`): Envelope de serialização JSON com validação de versão.
- **Base de UI e Jogo:**
  - `:core-ui`: Tema Pixel Art, componentes Material 3 e paleta de cores.
  - `:core-game`: Canvas Compose para renderização da gatinha e novelo.
- **Módulos de Funcionalidade (`:feature-*`):**
  - `:feature-hoje`, `:feature-agenda`, `:feature-habitos`, `:feature-metas`, `:feature-insights`, `:feature-loja`, `:feature-conversa`, `:feature-foco`.
- **Infraestrutura de Plataforma:**
  - `:platform-bloqueio`, `:platform-lembretes`, `:platform-uso`, `:ai-llm`.
- **Montagem da Aplicação:**
  - `:app`: Wiring Hilt, navegação e manifesto Android.

### 1.2 Camada Android Nativo Standalone (Ponte Java e Blocker)
- **Código-fonte:** `android-src/com/catline/app/`
- **Componentes principais:**
  - `BlockerService.java`: `AccessibilityService` Android para monitorar trocas de pacote (`TYPE_WINDOW_STATE_CHANGED`). Aplica `performGlobalAction(GLOBAL_ACTION_HOME)` para minimizar imediatamente apps bloqueados e dispara `BlockActivity`.
  - `BlockerBridge.java`: Expõe métodos `@JavascriptInterface` no objeto `window.AndroidBlocker` dentro da WebView.
  - `BlockerStore.java`: Persistência nativa em `SharedPreferences` (`catline_blocker_store`). Gerencia passes com blindagem temporal via `SystemClock.elapsedRealtime()`, regras ativas e buffer de débitos do banco de minutos.
  - `BlockPolicy.java`: Lógica de identificação de apps de redes sociais, salvaguardas absolutas (discador, configurações, Cat Line) e emergência de 10s.
  - `BlockActivity.java`: Tela de bloqueio nativa com respiração guiada de 3 ciclos, mensagens acolhedoras da gatinha e liberação por microtarefa.
  - `NotificationHelper.java` e `ReminderReceiver.java`: Agendamento de lembretes e alarmes nativos via `AlarmManager` e `NotificationManager`.
  - `SecureVault.java`: Armazenamento de segredos criptografados localmente com chave AES-GCM no Android Keystore.

### 1.3 Camada Web / PWA & Testes
- **Arquivos principais em `web-preview/`:**
  - `web-preview/index.html`: SPA completa, estrutura DOM pixel art, cards modais e abas.
  - `web-preview/app.js`: Lógica principal, estado global (`state`), motores agregados, reconciliações e renderizadores Canvas.
  - `web-preview/clock.js`: Provedor temporal injetável e determinístico (`CatLineClock`).
  - `web-preview/style.css`: Estilização Pixel Art 8-bit responsiva.
- **Suíte de Testes em `scripts/` (61 testes unitários determinísticos):**
  - `test-rewards-system.js` (14 testes): Mimos da vida real, compras e resgates.
  - `test-characterization.js` (6 testes): Caracterização da Fase 0 (presets, metadados, salvaguardas).
  - `test-phase1.js` (6 testes): Lembretes nativos e cofre seguro.
  - `test-phase2.js` (7 testes): Calibração de estimativa vs. tempo real e mediana.
  - `test-phase3.js` (7 testes): Replanejamento inteligente e gestão de carga sem culpa.
  - `test-phase4.js` (7 testes): Insights de correlação e barreira estrita de 7 dias.
  - `test-phase5.js` (7 testes): Banco de minutos gamificado e sincronização nativa.
  - `test-phase6.js` (7 testes): Relatório beta anônimo, segurança e auditoria de release.

### 1.4 Comunicação JS ↔ Serviço Nativo (Saldo de Minutos e Bloqueio)
- **Dono do Saldo:** O JavaScript (`web-preview/app.js` / `minuteBankEngine`) é o **único dono da verdade** do saldo do Banco de Minutos (`st.minuteBank.balanceMinutes`).
- **Sincronização:**
  - Quando minutos são creditados ou consumidos no JS, `minuteBankEngine.syncWithNative(st, txId)` chama `window.AndroidBlocker.syncMinuteBank(json)`.
  - O JSON transporta `{ focoEnabled, balanceSeconds: balanceMinutes * 60, txId }`.
  - O `BlockerBridge.java` repassa para `BlockerStore.setMinuteBankBalance(...)`.
- **Consumo e Reconciliação Idempotente:**
  - Quando a usuária desbloqueia um app usando minutos na tela de bloqueio nativa (`BlockActivity`), o Android registra um débito pendente em `BlockerStore.pollMinuteBankDebits()`.
  - O JS faz polling periódico ou na retomada do app via `minuteBankEngine.reconcileDebits(st, rawDebits)`.
  - Cada débito possui um `debitId` único. O JS debita os minutos do saldo, marca o `debitId` em `st.minuteBank.processedDebitIds` (evitando duplo débito) e confirma ao Android via `window.AndroidBlocker.ackMinuteBankDebit(debitId)`.
- **Isolamento de Segurança:** Nenhuma regra da v3.2.0 modifica o `BlockerService.java`, nem altera as salvaguardas de bloqueio.

---

## 2. Localização dos Componentes-Chave da Arquitetura

| Componente | Implementação Kotlin | Implementação Web / JS | Papel Arquitetural |
|---|---|---|---|
| **Relógio Injetável (AD-05)** | `core-domain/.../time/FakeClock.kt`<br>`core-domain/.../time/DayBoundary.kt` | `web-preview/clock.js`<br>(`CatLineClock`) | Impede chamadas a `Date.now()` dispersas. Garante testes 100% determinísticos. |
| **Configurações Declarativas (AD-10)** | `core-domain/.../config/EconomyConfig.kt`<br>`core-data/.../config/JsonGameConfigLoader.kt`<br>`core-domain/.../resources/config/` | Objetos em `app.js`<br>*(ponto de integração: `config/commitments.v1.json`)* | Elimina números mágicos. Tolerâncias, tetos e recompensas vêm de JSON versionado. |
| **Interruptores de Módulo (AD-11)** | `core-domain/.../config/FeatureFlagKey.kt`<br>`core-data/.../config/DataStoreFeatureFlagsRepository.kt` | `state.flags` em `web-preview/app.js`<br>(L871-881, L639-642) | Permite ligar/desligar módulos individualmente sem perda de dados. |
| **Cálculo de Atraso / "O Fio"** | `core-domain/.../engine/DelayEngine.kt`<br>`DelayEngineTest.kt` | `web-preview/app.js`<br>(L3853 `drawDelayChart`, L974 `analyticsData`, L994 `delayHistory7Days`) | Mediana móvel semanal e diária que alimenta a curva de lã ("O Fio"). |
| **Motor de Economia** | `core-domain/.../engine/EconomyEngine.kt`<br>`core-domain/.../engine/MoodEngine.kt` | `web-preview/app.js`<br>(`state.currencies`, `minuteBankEngine`, `markDone`) | Livro-caixa, peixinhos, novelos dourados, vínculo e banco de minutos. |
| **Check-in & Replanejamento** | `core-domain/.../model/DomainEntities.kt`<br>`core-data/.../repository/RoomRepositories.kt` | `web-preview/app.js`<br>(`replanEngine` L363, `markDone` L2623, `retroCheckIn` L2655) | Registro ao vivo ou retroativo de tarefas, detecção de sobrecarga e realocação com confirmação. |

---

## 3. Inventário do que Já Existe: Meta, Compromisso e Hábito

### 3.1 Metas (`Goal`)
- **Kotlin / Room:**
  - Entidade de Domínio: `core-domain/src/main/kotlin/com/deadline/core/domain/model/DomainEntities.kt` (referenciado via `GoalId`).
  - Tabela Room: `core-data/src/main/kotlin/com/deadline/core/data/db/Entities.kt` (`GoalEntity`, L129-142):
    - Campos: `id`, `title`, `horizon`, `parentGoalId`, `deadlineDayKey`, `progressFraction`, `realRewardTitle`, `realRewardSuggestedFishCost`, `createdAtEpochMillis`, `completedAtEpochMillis`, `deletedAtEpochMillis`.
  - Módulo UI: `feature-metas/src/main/kotlin/com/deadline/feature/metas/MetasFeatureModule.kt`.
- **Web / JS (`web-preview/app.js`):**
  - Estrutura em `state.goals` (L900-949):
    - Campos: `id`, `horizon` (SEMANA, MES, TRIMESTRE), `title`, `yarnColorId` (pink, gold, blue, green), `totalDays`, `totalSeconds`, `remainingSeconds`, `progress` (0.0 a 1.0), `reward`, `rewardCost`.
  - Componente de Canvas: `drawWindingYarnCanvas(canvas, goal, tick)` (L1307) que anima o novelo enrolando conforme o tempo passa.
  - Tela: `renderGoalsTab()` (L3350-3450) com lista de metas, seletor de cor de novelo e modal de edição.
- **Lacuna atual na v3.1.0:** Não possui passos intermediários; o progresso é um valor fracionário arbitrário atualizado manualmente ou proporcional ao tempo decorrido.

### 3.2 Compromissos / Ocorrências (`Commitment` & `Occurrence`)
- **Kotlin / Room:**
  - Entidades de Domínio: `Commitment` e `Occurrence` (`core-domain/.../DomainEntities.kt`).
  - Tabelas Room:
    - `commitments` (`CommitmentEntity`, L19-34): `id`, `title`, `type` (TAREFA, EVENTO, HABITO), `effort` (P, M, G), `category`, `goalId`, `recurrenceJson`, `plannedStartLocalTime`, `deadlineLocalTime`, `startDateIso`, `endDateIso`, `createdAtEpochMillis`, `deletedAtEpochMillis`.
    - `occurrences` (`OccurrenceEntity`, L48-62): `id`, `commitmentId`, `title`, `type`, `effort`, `category`, `goalId`, `dayKey`, `zoneId`, `plannedStartEpochMillis`, `deadlineEpochMillis`, `state` (PENDENTE, FEITO, PERDIDO, PULADO).
    - `check_ins` (`CheckInEntity`, L74-82): `occurrenceId`, `checkedInAtEpochMillis`, `origin` (TOQUE, NOTIFICACAO, RETROATIVO), `delayMinutes`, `delayTier`, `editCount`.
  - Módulos UI: `feature-hoje` e `feature-agenda`.
- **Web / JS (`web-preview/app.js`):**
  - Estrutura em `state.occurrences` (L890-894):
    - Campos: `id`, `title`, `effort` (P, M, G), `reward` (5, 10, 20), `time` ("14:00"), `state` ("PENDENTE", "FEITO"), `delayMin`, `estimatedDuration`, `actualDuration`, `startedAt`, `completedAt`, `date`, `recurrence`.
  - Ações no JS:
    - `markDone(id)` (L2623): Check-in imediato, conclui execução ativa, registra amostra de duração, adiciona peixinhos/vínculo, credita +5 min no banco de minutos, toca som e confetes.
    - `retroCheckIn(id)` (L2655): Check-in retroativo, credita 50% dos peixinhos.
    - `unmarkDone(id)` (L2551): Reabre o compromisso e estorna peixinhos.
  - Telas: `renderHojeTab()` (L2260-2350), `renderAgendaTab()` (L3050-3160).
- **Lacuna atual na v3.1.0:** Não possui máquina de estados formal (apenas toggle PENDENTE/FEITO); falta o estado `unmarked` e a vinculação a passos de metas.

### 3.3 Hábitos (`Habit`)
- **Kotlin / Room:**
  - Tabela Room `habits` (`HabitEntity`, L92-104): `id`, `title`, `category`, `frequencyJson`, `windowStartLocalTime`, `windowEndLocalTime`, `weeklyTarget`, `currentStreakDays`, `createdAtEpochMillis`, `deletedAtEpochMillis`.
  - Tabela Room `habit_logs` (`HabitDailyLogEntity`, L111-116): `habitId`, `dayKey`, `completedAtEpochMillis`, `usedReserveYarn`.
  - Módulo UI: `feature-habitos`.
- **Web / JS (`web-preview/app.js`):**
  - Estrutura em `state.habits` (L895-898):
    - Campos: `id`, `title`, `streak`, `bestStreak`, `frequency`, `window`, `totalCheckIns`, `completed`.
  - Ações: `completeHabit(id)` (L2508), `uncompleteHabit(id)` (L2530).
  - Tela: `renderHabitsTab()` (L3180-3270).

---

## 4. Como os Dados São Versionados e Migrados Hoje

### 4.1 Persistência e Versionamento no Android (Room)
- `DeadLineDatabase.SCHEMA_VERSION = 1` (`core-data/src/main/kotlin/com/deadline/core/data/db/DeadLineDatabase.kt`).
- `ALL_MIGRATIONS = emptyArray()`.
- O banco atual está na versão 1 sem histórico de migrations SQL anteriores.

### 4.2 Persistência e Versionamento no Web / PWA (LocalStorage)
- Chave no LocalStorage: `CATLINE_DEVICE_STORAGE_V1` (`STORAGE_KEY` L1034 de `web-preview/app.js`).
- Salvamento: `saveStateToDeviceStorage()` (L1068) serializa o estado completo em JSON. Disparado em `beforeunload`, `pagehide`, `visibilitychange` e após mutações relevantes.
- Carregamento e Migrações em Linha: `loadStateFromDeviceStorage()` (L1115):
  - Verifica `data.blockerMigratedV3`: se ausente, padroniza regras de bloqueio com `rigor: 3`, `windowStart: '00:00'`, `windowEnd: '23:59'`.
  - Migra `occurrences` antigas injetando campos `recurrence: "Todos os dias"` e `date: state.dayKey`.
  - Reconciliação do `minuteBank` com deduplicação de transações e união de `processedDebitIds`.
  - Expiração automática de sessões de desbloqueio (`activeUnlockSessions`).
  - Recalibração de tempo decorrido para metas com aparelho desligado (`remainingSeconds -= elapsedSec`).

### 4.3 Backup Export / Import
- **Envelope Kotlin (`core-data/.../backup/DeadLineBackupPayload.kt`):**
  - Estrutura serializável contendo `schemaVersion` (mínimo 1, máximo `SCHEMA_VERSION`), `exportedAtEpochMillis`, e contadores de entidades.
- **Export/Import Web (`web-preview/app.js` L3639-3722):**
  - `exportJsonBackup()`: Gera arquivo para download `catline_backup_{dayKey}.json` com versão `'2.0.0'`.
  - `importJsonBackup(event)`: Lê arquivo JSON enviado via `<input type="file">`, faz merge dos objetos no `state` e chama `persist()`.

---

## 5. Pontos de Integração Detalhados para a v3.2.0

Para evoluir a versão **v3.1.0** para a **v3.2.0** mantendo 100% dos testes verdes e retrocompatibilidade total, os pontos de integração identificados são:

### 5.1 Metas com Passos Editáveis (`GoalStep`)
- **Novas Estruturas:**
  - Android Room: Nova entidade `GoalStepEntity` na tabela `goal_steps`, chave estrangeira para `goals.id`. Campos: `id`, `goalId`, `title`, `order`, `estMinutes`, `targetDateIso`, `doneAtEpochMillis`, `archived`.
  - Web / JS: Cada meta em `state.goals` ganha array `steps: [ { id, goalId, title, order, estMinutes, targetDate, doneAt, archived } ]`.
- **Cálculo de Progresso Puro:**
  - Se a meta tiver passos ativos (`!archived`): `progress = passos_concluidos / passos_ativos` (ou ponderado por `estMinutes` se todos tiverem estimativa).
  - Se a meta não tiver passos (legada v3.1.0): preserva o cálculo atual baseado no tempo/progresso manual.
- **Integridade Referencial:**
  - Ao apagar uma meta, os compromissos vinculados têm `goalId = null` e `stepId = null` (ficam avulsos; nunca são apagados).
  - Concluir/desmarcar/dividir passo concluído não remove nem duplica `RewardEvent` já emitido.

### 5.2 Máquina de Estados do Compromisso
- **Novos Estados:** `pending`, `done`, `missed`, `rescheduled`, `unmarked`.
- **Campos Novos na Entidade / Objeto:**
  - `plannedStart`: timestamp local do dia lógico.
  - `plannedZone`: fuso IANA (ex: `"America/Sao_Paulo"`).
  - `plannedMinutes`: duração planejada.
  - `stepId`: vínculo opcional com `GoalStep`.
  - `rescheduledFromId`: id do compromisso original que gerou esta nova instância.
- **Transições Permitidas:**
  - `pending -> done`: Check-in ao vivo ou retroativo (grava `CheckIn` com `lateMinutes = actualAt - plannedStart`).
  - `pending -> missed`: Usuária tocou explicitamente em "Não cumpri" (0 peixinhos, sem punição).
  - `pending -> rescheduled`: Realocação aceita com confirmação explícita (cria nova ocorrência `pending`).
  - `pending -> unmarked`: Ocorre na virada do dia lógico (04:00) quando a tarefa ficou sem marcação. **Nunca assume "não cumprido"**.
  - `unmarked -> done / missed / rescheduled`: Resolução durante o Fechamento do Dia.
  - `done -> pending`: Ação "Desfazer" dentro de `undoWindowMinutes` (10 min). Emite evento compensatório no livro-razão sem apagar linhas.

### 5.3 Motor de Métricas de Atraso e "O Fio"
- **Ponto de Integração:** `core-domain/.../engine/DelayEngine.kt` e novo motor puro `delayMetricsEngine` em JS.
- **Fórmulas Puras:**
  - `lateMinutes = actualAt - plannedStart`. (Se adiantado, valor negativo é preservado para o gráfico, mas entra como atraso 0 no cálculo de taxas).
  - `isPunctual = lateMinutes <= toleranceMinutes` (10 min por config).
  - `taxaDeCumprimento = done / (done + missed)` (ignora `pending`, `unmarked`, `rescheduled`).
  - `taxaDePontualidade = done_pontuais / done`.
  - `medianaDeAtraso`: Alimenta "O Fio" (`drawDelayChart`).
- **Barreira de 7 Dias:**
  - Nenhum recorte ou inferência (categoria, dia da semana, faixa de horário) é retornado antes de acumular 7 dias de dados reais.
  - Check-ins retroativos são agrupados em recorte exclusivo para não distorcer as marcações em tempo real.
  - Linguagem estritamente acolhedora de coincidência ("tendeu a"), sem julgamento de causa.

### 5.4 Livro-Razão de Recompensas Idempotente e Anti-Farm
- **Ponto de Integração:**
  - Android Room: Tabela `reward_events` (`id`, `idempotencyKey UNIQUE`, `kind`, `fishDelta`, `bondDelta`, `refId`, `atEpochMillis`, `logicalDay`).
  - Web / JS: `rewardLedgerEngine` em `web-preview/app.js`.
- **Formato da Chave:** `kind:refId[:detail]` (ex.: `step_done:step-123`, `commitment_done:occ-456`, `day_closure:2026-10-25`).
- **Tetos Diários (Anti-Farm):**
  - Máximo de 15 peixinhos por dia lógico (`fishPerLogicalDay`).
  - Máximo de 30 minutos de redes sociais ganhos por dia (`socialMinutesEarnedPerDay`, reaproveitando o bônus existente de +5 min por tarefa).
  - Recompensa por compromisso exige duração mínima de 5 min (`minCommitmentMinutesToReward`).
  - Ao atingir o teto: o evento registra delta 0 com razão `"cap"` e a gatinha reage com mensagem carinhosa ("hoje já juntamos bastante!"), sem mensagens de travamento.

### 5.5 Fechamento do Dia
- **Ponto de Integração:**
  - Android: `core-data/.../service/DayCloseCoordinator.kt` e `DayClosureEntity`.
  - Web / JS: `dayClosureEngine` e tela modal da gatinha.
- **Funcionamento:**
  - Gatilho: virada do dia lógico (04:00 por padrão) ou ao abrir o app após a virada.
  - Identifica compromissos `pending` do dia anterior e os move para `unmarked`.
  - Apresenta tela da gatinha para resolução guiada: "Cumpri" (solicita horário), "Não cumpri", "Remarcar".
  - Ação em lote ("Marcar todos como cumpridos no horário planejado") exige confirmação tátil explícita.
  - A resolução pode ser adiada; compromissos `unmarked` ficam temporariamente fora das métricas até resolução.
  - Emite `dayClosure` rendendo 1 ♥ de vínculo (inclusive quando a usuária marcar "não cumpri", pois registrar a verdade tem o mesmo valor afetivo).

### 5.6 Log Semanal (Snapshot Imutável)
- **Ponto de Integração:** Nova entidade `WeeklyLog` (`weekStartLogicalDay PK`, `snapshotJson`, `configVersion`, `createdAtEpochMillis`).
- **Funcionamento:**
  - Gerado no dia de fechamento da semana (`week.closesOn = "sunday"`) ou sob demanda na aba da semana.
  - `snapshotJson`: Totais, taxas, mediana, comparativo vs semana anterior (se ≥ 7 dias), melhor dia, melhor horário, progresso de metas e recompensas acumuladas.
  - Imutabilidade: gerado uma única vez por semana lógica; mudanças posteriores de configuração não alteram logs passados.
  - Carta da Gatinha: gerada puramente por templates versionados baseados em regras (semana ótima, semana desafiadora, poucos dados), sem chamada de rede e sem LLM.
  - Sugestões gentis (ex: "esse compromisso costuma começar 15 min depois, quer calibrar o horário?") sempre condicionadas a confirmação tátil da usuária.

### 5.7 Interruptores e Relatório Beta
- **Ponto de Integração:**
  - Novas chaves em `FeatureFlagKey`: `METAS_PASSOS`, `COMPROMISSOS`, `LOG_SEMANAL`.
  - Em `web-preview/app.js`: expandir `state.flags` e `betaReportEngine.generateAnonymousReport(st)`.
  - Relatório Beta Anônimo: contabiliza contadores agregados da v3.2.0, garantindo estritamente **zero texto livre da usuária** (sem títulos de metas, passos ou compromissos).

---

## 6. Próximo Passo na Sequência

Com o reconhecimento do repositório finalizado e o mapa de integração consolidado, o próximo passo é a execução do **Prompt 1**:
- **Prompt 1 — Modelo de dados e migração**:
  - Implementar as entidades `Goal`, `GoalStep`, `Commitment`, `CheckIn`, `RewardEvent`, `DayClosure` e `WeeklyLog`.
  - Criar tabelas e migrações no Room (Android) e no armazenamento Web/PWA.
  - Escrever testes de migração assegurando compatibilidade com dados existentes da v3.1.0.
  - Garantir que todos os 61 testes originais permaneçam passando (`npm test`).
