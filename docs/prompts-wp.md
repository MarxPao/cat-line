# Dead Line — Prompts dos Pacotes de Trabalho (WP-00, WP-01, WP-02 e Fase 0)

Estes prompts seguem exatamente o modelo da seção 9 de `docs/arquitetura.md` para uso direto no Antigravity ou por subagentes dedicados.

---

## Prompt: WP-00 — Repositório, Contexto e Grafo de Dependências

```markdown
Contexto: projeto Dead Line (Android, Kotlin, Compose). Leia AGENTS.md e docs/arquitetura.md antes de começar.
Tarefa: WP-00 — Repositório e contexto.
Objetivo: Configurar o projeto Gradle multi-módulo com version catalog, convention plugins em build-logic, documentação base em docs/, AGENTS.md e a tarefa automática de verificação do grafo de dependências entre camadas.
Módulos que você pode editar: raiz do repositório, gradle/, build-logic/, docs/, AGENTS.md.
Fora do escopo: lógica de negócio final de features.
Contratos a respeitar: Regras de dependência da seção 3 de docs/arquitetura.md e decisões AD-01, AD-02, AD-03.
Entregas:
- settings.gradle.kts declarando build-logic e os 16 módulos do projeto (:app, :core-domain, :core-data, :core-ui, :core-game, :feature-hoje, :feature-agenda, :feature-habitos, :feature-metas, :feature-insights, :feature-loja, :feature-conversa, :feature-foco, :platform-bloqueio, :platform-uso, :platform-lembretes, :ai-llm).
- gradle/libs.versions.toml com versões estáveis fixadas (Kotlin, Compose, Hilt, Room, WorkManager, DataStore, kotlinx.serialization, OkHttp, Glance, Tink, JUnit/Coroutines Test).
- build-logic/ com convention plugins para módulo JVM puro (deadline.jvm.library), biblioteca Android (deadline.android.library), Compose (deadline.android.compose), Hilt (deadline.android.hilt), Feature (deadline.android.feature) e Application (deadline.android.application).
- Tarefa Gradle checkModuleGraph vinculada ao check que valida as dependências entre as 5 camadas e proíbe dependências Android em :core-domain.
- docs/briefing.md, docs/arquitetura.md, docs/lacunas.md, docs/decisoes.md e AGENTS.md.
Critérios de aceite:
- ./gradlew checkModuleGraph e ./gradlew check passam sem erros.
- Se uma feature depender de outra feature ou se :core-domain depender de Android, checkModuleGraph falha imediatamente.
Como verificar:
- ./gradlew checkModuleGraph
- ./gradlew check
Etapas: primeiro entregue o plano para aprovação; depois implemente; ao final entregue o resumo do que foi feito e o que ficou pendente.
Gates humanos: nenhum.
```

---

## Prompt: WP-01 — Esqueleto dos 16 Módulos, Hilt, FeatureModule e Flags

```markdown
Contexto: projeto Dead Line (Android, Kotlin, Compose). Leia AGENTS.md e docs/arquitetura.md antes de começar.
Tarefa: WP-01 — Esqueleto multi-módulo, FeatureModule, navegação e DataStore de flags.
Objetivo: Ter os 16 módulos compilando, injeção de dependências com Hilt no :app, registro de FeatureModule para as 8 features e persistência de ativação/desativação em DataStore para cumprir o princípio de que tudo é modulável pela usuária (AD-11).
Módulos que você pode editar: todos os 16 módulos (apenas para estrutura inicial de pacotes, build.gradle.kts, registro de FeatureModule, tela shell no :app e DataStore de flags).
Fora do escopo: motores de regra detalhados, entidades completas do Room, renderizador de jogo final.
Contratos a respeitar:
- AD-11: Interface FeatureModule + registro no :app via Hilt (@IntoSet) + chave no DataStore por módulo.
- AD-16: allowBackup="false" no AndroidManifest do :app.
- Texto da interface em português do Brasil em res/values/strings.xml.
Entregas:
- build.gradle.kts de cada um dos 16 módulos usando os convention plugins de build-logic.
- Interface FeatureModule (com chave, título, descrição, se pode ser desligado e conteúdo/rota Compose).
- Implementação de FeatureFlagsRepository com DataStore Preferences permitindo ligar/desligar cada módulo em tempo real.
- Registro @IntoSet dos 8 módulos (:feature-hoje, :feature-agenda, :feature-habitos, :feature-metas, :feature-insights, :feature-loja, :feature-conversa, :feature-foco).
- Tela principal/shell em :app que exibe a navegação apenas dos módulos ativos e permite ligar/desligar qualquer módulo na central de modularidade.
Critérios de aceite:
- Os 16 módulos compilam e respeitam ./gradlew checkModuleGraph.
- O app abre e permite ligar e desligar qualquer módulo de funcionalidade, escondendo suas entradas quando desligado.
- Testes unitários para o controle de flags de módulos.
Como verificar:
- ./gradlew check
- ./gradlew assembleDebug
Etapas: primeiro entregue o plano para aprovação; depois implemente; ao final entregue o resumo do que foi feito e o que ficou pendente.
Gates humanos: nenhum.
```

---

## Prompt: WP-02 — `core-domain` Base (Tipos, DayBoundary, EventBus, Portas e Relógio Falso)

```markdown
Contexto: projeto Dead Line (Android, Kotlin, Compose). Leia AGENTS.md e docs/arquitetura.md antes de começar.
Tarefa: WP-02 — core-domain base.
Objetivo: Implementar os tipos fundamentais de domínio, o cálculo do dia lógico com virada às 4h configurável (DayBoundary), os eventos de domínio (DomainEvent), o barramento de eventos (EventBus), todas as portas da seção 4 e o relógio falso (FakeClock) em Kotlin puro.
Módulos que você pode editar: :core-domain.
Fora do escopo: qualquer outro módulo; proibido usar APIs do Android ou System.currentTimeMillis().
Contratos a respeitar:
- Portas da seção 4 de docs/arquitetura.md: EventBus, OccurrenceRepository, LedgerRepository, UsageSource, BlockEnforcer, AlarmScheduler, PermissionHealth, LlmProvider, SecretVault.
- AD-03: JVM puro.
- AD-05: Relógio injetável (java.time.Clock).
- AD-07: Eventos de domínio (CheckInRegistrado, DiaFechado, MetaConcluida, HumorAlterado, NovelinhoGracinhaDisparada, etc.).
Entregas:
- Modelos e value types de domínio: OccurrenceId, CommitmentId, HabitId, GoalId, EffortLevel (P, M, G), RoutineCategory (as 10 categorias da seção 20), OccurrenceState (PENDENTE, FEITO, PERDIDO, PULADO), CheckInOrigin (TOQUE, NOTIFICACAO, RETROATIVO), CatMood (RADIANTE, FELIZ, TRANQUILA, SONOLENTA, MANHOSA), CurrencyType, RigorLevel (0 a 4).
- DayBoundary: cálculo de dayKey (LocalDate) a partir de um Instant e ZoneId considerando o horário de virada configurável (padrão 04:00), início/fim de dia lógico e detecção de virada na madrugada.
- DomainEvent (sealed interface) e EventBus + InMemoryEventBus (baseado em SharedFlow).
- Interfaces das 9 portas centrais da seção 4 + modelos de comando/resultado (CheckInCommand, CheckInResult, LedgerEntry, Balances, UsageEvent, BlockDecision, PermissionState, PermissionKind, GuideStep, LlmRequest, LlmChunk).
- FakeClock (implementação mutável de java.time.Clock para testes determinísticos).
- Suite de testes unitários em :core-domain cobrindo DayBoundary (madrugada antes e depois das 4h, mudança de fuso, horário de verão/offset, virada customizada), InMemoryEventBus e FakeClock.
Critérios de aceite:
- :core-domain não possui nenhuma dependência Android.
- Todos os contratos da seção 4 estão compilando e documentados.
- Testes unitários de DayBoundary, FakeClock e EventBus passando em milissegundos.
Como verificar:
- ./gradlew :core-domain:test
- ./gradlew checkModuleGraph
Etapas: primeiro entregue o plano para aprovação; depois implemente; ao final entregue o resumo do que foi feito e o que ficou pendente.
Gates humanos: nenhum.
```
