# Dead Line — Arquitetura e Plano de Implementação

Versão 1.0 · 25/10/2026 · Base: briefing consolidado (seções 1–26) · Feito para virar prompts do Antigravity

## 1. Como usar este documento
Este documento traduz o briefing em três coisas: decisões de arquitetura já travadas, contratos entre módulos e pacotes de trabalho (WP) pequenos o bastante para um agente executar e verificar sozinho. Cada WP vira um prompt. O que depende de aparelho físico, de arte ou de decisão da cliente aparece como gate humano, porque um agente rodando no seu computador não alcança o celular dela.

Quatro regras guiam tudo:
1. O domínio é puro e testável.
2. Toda regra de jogo mora em JSON versionado.
3. Cada funcionalidade pode ser desligada pela usuária.
4. Nada de rede, Android ou relógio do sistema dentro de `core-domain`.

## 2. Decisões de arquitetura

| # | Decisão | Motivo |
|---|---|---|
| AD-01 | Kotlin + Jetpack Compose nativo, minSdk 26, targetSdk na estável mais recente | Bloqueio, alarmes exatos, uso de apps e widget dependem de APIs do sistema |
| AD-02 | Multi-módulo Gradle (Kotlin DSL, version catalog, convention plugins em `build-logic`) | Cada módulo tem um dono, então vários agentes trabalham em paralelo sem conflito |
| AD-03 | `core-domain` é módulo JVM puro, sem Android | Os motores testam em milissegundos, sem emulador |
| AD-04 | Portas e adaptadores: o domínio define interfaces, `data`/`platform`/`ai` implementam | Inverte a dependência e permite trocar peças (renderizador, provedor de LLM) |
| AD-05 | Relógio injetável (`java.time.Clock`); proibido `System.currentTimeMillis` fora de adaptadores | Testes com tempo falso são a base da métrica de atraso |
| AD-06 | Room é a fonte única de verdade; telas observam `Flow`; UI em fluxo unidirecional (`State`, `Event`, `Effect` por ViewModel) | Previsível e fácil de testar |
| AD-07 | Eventos de domínio (`CheckInRegistrado`, `DiaFechado`, `MetaConcluida`…) ligam economia, humor, diretor de rotina e gracinhas do novelo | As features não se conhecem; só reagem a eventos |
| AD-08 | Check-in, mudança de estado e lançamentos do livro-caixa gravam na mesma transação Room; o evento sai só depois do commit | Nunca há moeda sem check-in nem check-in sem moeda |
| AD-09 | Idempotência: índice único `(regra, ocorrência)` no livro-caixa e fechamento do dia chaveado por `dayKey` | Cumpre o princípio de que cada regra paga uma vez por ocorrência |
| AD-10 | Regras em JSON versionado com esquema (economia, falas de reserva, categorias→animação→estação, personas) | Ajustar números sem recompilar a lógica |
| AD-11 | Interface `FeatureModule` + registro no `app` + chave no DataStore por módulo | Sustenta o princípio de que tudo é modulável pela usuária |
| AD-12 | Renderização atrás de `SceneRenderer`, implementada em Compose Canvas | Permite trocar de motor no futuro |
| AD-13 | LLM BYOK, sem servidor nosso, via `LlmProvider` com adaptadores Anthropic, Gemini e compatível com OpenAI | Resolve o conflito entre a seção 8 (proxy) e a seção 15 (sem servidor): vale a seção 15 |
| AD-14 | Arte em dois trilhos: um script gera atlas placeholder no mesmo formato do Aseprite; a arte real substitui o atlas depois | O código não espera o Gemini nem o retoque |
| AD-15 | Sem telemetria; relatório de erros só local | Dados pessoais sensíveis |
| AD-16 | `allowBackup` desligado, chaves no Keystore com Tink (AES-GCM), conversas com criptografia de campo | Chave de API e desabafos nunca vazam para backup ou log |

## 3. Módulos e regras de dependência

| Camada | Módulos | Pode depender de |
|---|---|---|
| Domínio | `core-domain` | Apenas stdlib Kotlin, coroutines, `kotlinx-serialization` e `java.time` |
| Infraestrutura | `core-data`, `ai-llm`, `platform-uso`, `platform-bloqueio`, `platform-lembretes` | `core-domain` (implementam as portas dele) |
| Base de UI e jogo | `core-ui`, `core-game` | `core-domain`; `core-game` também usa `core-ui` (balões) |
| Funcionalidades | `feature-hoje`, `-agenda`, `-habitos`, `-metas`, `-insights`, `-loja`, `-conversa`, `-foco` | `core-domain`, `core-ui`, `core-game`; nunca outra feature |
| Montagem | `app` | Todos; faz a injeção (Hilt) e registra os `FeatureModule` |

Uma tarefa Gradle (`checkModuleGraph`) verifica o grafo e falha o build se aparecer dependência proibida. Isso é o que permite deixar agentes soltos em módulos diferentes.

## 4. Contratos centrais (portas em `core-domain`)

```kotlin
interface EventBus {
    val events: SharedFlow<DomainEvent>
    suspend fun publish(e: DomainEvent)
}

interface OccurrenceRepository {
    fun observeDay(day: LocalDate): Flow<List<Occurrence>>
    suspend fun registerCheckIn(cmd: CheckInCommand): CheckInResult
}

interface LedgerRepository {
    suspend fun append(entries: List<LedgerEntry>)
    fun balance(): Flow<Balances>
}

interface UsageSource {
    suspend fun readEvents(from: Instant, to: Instant): List<UsageEvent>
}

interface BlockEnforcer {
    fun show(d: BlockDecision)
    fun dismiss()
}

interface AlarmScheduler {
    fun schedule(o: Occurrence)
    fun cancel(id: OccurrenceId)
}

interface PermissionHealth {
    fun status(): List<PermissionState>
    fun intentFor(p: PermissionKind): GuideStep
}

interface LlmProvider {
    fun stream(req: LlmRequest): Flow<LlmChunk>
    suspend fun testKey(): Result<Unit>
}

interface SecretVault {
    suspend fun put(name: String, v: ByteArray)
    suspend fun get(name: String): ByteArray?
}
```

O dia lógico (`dayKey`) é uma data calculada com a virada às 4h e gravada na ocorrência junto com o fuso. Todas as consultas por dia usam o `dayKey`, nunca meia-noite.

## 5. Dados
As entidades são as da seção 18 do briefing. Decisões de implementação:
- IDs em UUID texto; exclusão lógica em compromissos, hábitos e metas.
- Ocorrência guarda `dayKey`, `zoneId`, início planejado, prazo e estado (`PENDENTE`, `FEITO`, `PERDIDO`, `PULADO`). Check-in guarda instante, origem (`TOQUE`, `NOTIFICACAO`, `RETROATIVO`) e atraso em minutos já calculado.
- Livro-caixa só recebe inserts. Editar um check-in cria lançamento de compensação. Cada lançamento guarda a versão da configuração de economia usada.
- Uso de apps em baldes por hora com chave `(pacote, início da hora)`; limpeza dos 180 dias por tarefa semanal.
- Conversa com campo de texto criptografado; opção de não guardar nada no modo desabafo.
- Esquemas do Room exportados e testados com `MigrationTestHelper`. O arquivo de backup é JSON com `schemaVersion` e tem importação que aceita versões antigas.
- Recorrência gera ocorrências 14 dias à frente por tarefa em segundo plano; editar a série recalcula só o futuro.

## 6. Motores de regra e testes obrigatórios

| Motor | Entra | Sai | Testes que o agente deve escrever |
|---|---|---|---|
| `RecurrenceEngine` | Regra, janela, fuso | Ocorrências | Virada às 4h, mudança de fuso, edição só do futuro, X vezes por semana |
| `DelayEngine` | Check-in, prazo, tolerância | Atraso em min, faixa, agregados do dia e janelas de 7 e 30 dias | Adiantado negativo, tolerância de 5 min, mediana contra média, superação |
| `MoodEngine` | Três índices, pesos, humor anterior | Novo humor | Máximo um degrau por fechamento, piso manhosa, modo descanso congela |
| `EconomyEngine` | Evento, contexto do dia, configuração | Lançamentos | Teto de 10 para tarefas P, retroativo a 50%, sequência com teto 1,5, queda após o 12º item, faixas bronze/prata/ouro, dia de recuperação, baú com garantia a cada 4 |
| `BlockPolicy` | Pacote, hora, regras, sessões ativas | Permitir, avisar, fricção, bloquear | Lista de exceções sempre vence, sessão de desbloqueio expira, modo descanso suspende |
| `RoutineDirector` | Estado do dia, humor, semente | Animação e estação | Ordem de prioridade, determinismo com a mesma semente |
| `PersonaBuilder` | Humor, metas, hora, modo, temperamento | Prompt em quatro blocos | Variante certa por gatilho, resumo de estado só com permissão |
| `SafetyLayer` | Texto da conversa | Sinal de sofrimento | Palavras-chave, resposta fora do tom de brincadeira, números vindos do arquivo de configuração |

A simulação de economia de 90 dias com três perfis (constante, irregular, caótica) roda como teste automático e confere: saldo nunca negativo, perfil constante compra item médio em 2 a 3 dias e grande em cerca de uma semana, perfil caótico ainda progride.

## 7. Fluxos críticos
- **Check-in:** toque ou ação Feito na notificação → `RegisterCheckIn` grava check-in, estado e lançamentos numa transação → publica `CheckInRegistrado` → o diretor de rotina muda a animação, o novelo faz sua gracinha, o som toca e o HUD atualiza as moedas.
- **Fechamento do dia:** tarefa no horário da virada, com recuperação ao abrir o app, chaveada por `dayKey` → marca como perdidas as ocorrências vencidas → `DelayEngine` fecha os agregados → `EconomyEngine` paga fechamento e tela dentro da meta → `MoodEngine` ajusta o humor → publica `DiaFechado`.
- **Bloqueio:** o serviço de acessibilidade informa o pacote em primeiro plano → `BlockPolicy` decide com regras, horário e sessões de desbloqueio → `BlockEnforcer` mostra a tela da gatinha por cima. Saída garantida: segurar a gatinha por 10 s. O serviço nunca decide nada sozinho; só executa a decisão da política.
- **Conversa:** mensagem → `SafetyLayer` local → `PersonaBuilder` → `LlmProvider` em fluxo → balão com efeito de máquina de escrever → grava criptografado. Sem chave ou sem internet, entram as falas de reserva por humor pela mesma interface.

## 8. Plano de implementação em pacotes de trabalho

### Fase 0 — Viabilidade (spikes descartáveis em `/spikes`, resultado em `docs/viabilidade.md` com go ou no-go)
- **WP-00 · Repositório e contexto.** Gradle multi-módulo vazio, version catalog, `build-logic`, pasta `docs/` com briefing e este documento, `AGENTS.md`, tarefa de grafo de dependências. Aceite: `./gradlew check` verde.
- **S0.1 · Acessibilidade e barreira.** Serviço que detecta o app em primeiro plano, cobre com a tela da gatinha, volta ao início, ignora o WhatsApp. Gate humano: rodar no aparelho dela e testar a liberação de configurações restritas.
- **S0.2 · Uso de apps.** Ler eventos de uso e comparar com o painel de bem-estar digital. Gate humano.
- **S0.3 · Notificação e alarme.** Notificação com ação Feito, alarme exato, sobrevivência com a tela apagada por horas. Gate humano.
- **S0.4 · Cena.** Sprite 64×64 em escala inteira num Canvas com laço de 30 ticks; medir tempo de quadro no aparelho dela.
- **S0.5 · LLM.** Chamada em fluxo com a chave dela em um provedor, via OkHttp.
- **S0.6 · Arte.** Três poses geradas no Gemini e tratadas por script Pillow; avaliar consistência. Gate humano (gerar e julgar as imagens).
- **Gate G1:** só segue para a Fase 6 de controle (bloqueio e tracker) com S0.1 a S0.3 em go. Se falhar, o desenho muda antes de seguir.

### Fase 1 — Fundação
- **WP-01 · Esqueleto.** Os 16 módulos compilando, Hilt no `app`, `FeatureModule` e registro, navegação, DataStore de flags. Aceite: app abre vazio e módulos podem ser desligados.
- **WP-02 · `core-domain` base.** Tipos, `DayBoundary` (virada às 4h configurável), `DomainEvent`, `EventBus`, portas, relógio falso.
- **WP-03 · `RecurrenceEngine`.** Depende de WP-02.
- **WP-04 · `DelayEngine`.** Depende de WP-02.
- **WP-05 · `core-data`.** Room com as entidades, DAOs, repositórios, transação de check-in, migrações, carregador de JSON de configuração. Depende de WP-02.
- **WP-06 · `core-ui`.** Tema pixel: paleta de 16 cores, Pixelify Sans e Silkscreen, bordas 9-patch, botões com estado pressionado, balão de fala com cauda e máquina de escrever, componente Novelo com os quatro modos (barra, cronômetro, gráfico, edição). Independente.
- **WP-07 · Motores de jogo puros.** `MoodEngine` e `EconomyEngine`, `economia.json` versionado, simulação de 90 dias. Depende de WP-02 e pode rodar em paralelo com a Fase 2.

### Fase 2 — Uso básico
- **WP-08 · `platform-lembretes`.** Alarmes exatos, notificação com ação Feito, receptor de reinício, tarefa que materializa recorrências e fecha o dia. Depende de WP-03 e WP-05.
- **WP-09 · `feature-agenda`.** Compromissos, recorrência, categorias, esforço P/M/G, edição com novelo ao lado de cada campo.
- **WP-10 · `feature-habitos`.** Frequências, janela de horário, sequências com novelo reserva.
- **WP-11 · `feature-hoje` (versão lista).** Checklist e hábitos do dia, check-in e check-in retroativo marcado como tal.
- **WP-12 · `feature-insights`.** Gráfico do fio (mediana semanal), atraso médio, percentual no prazo, melhores e piores horários, meta de superação.
- **WP-13 · Backup.** Exportar e importar JSON pelo seletor de arquivos, com lembrete semanal.

### Fase 3 — Jogo
- **WP-14 · Arte placeholder e atlas.** Script Python que gera atlas PNG e JSON no formato do Aseprite; carregador no `core-game`.
- **WP-15 · `SceneRenderer`.** Grade virtual de 180 px, escala inteira, camadas, laço com pausa e opção de remover animações.
- **WP-16 · Animador por partes.** Corpo, cauda, olhos e acessórios com pontos de ancoragem por quadro.
- **WP-17 · `RoutineDirector`.** Prioridades, tabela categoria→animação→estação editável em JSON.
- **WP-18 · Áudio.** `SoundPool`, trilha, foco de áudio, volumes separados; usa os arquivos de miado, ronronar e blip já gerados.
- **WP-19 · `feature-loja`.** Inventário, cosméticos, comida, brinquedos, vínculo, novelos dourados, novelo reserva.
- **WP-20 · Integração da cena.** `feature-hoje` com a gatinha reagindo a eventos de domínio.
- **Gate G2:** a cliente vê a cena no aparelho dela e valida tamanho, fluidez e tom da gatinha.

### Fase 4 — Metas e recompensas
- **WP-21 · `feature-metas`.** Hierarquia vida, trimestre, mês, semana e tarefa; progresso como novelo sendo enrolado.
- **WP-22 · Recompensas reais.** Definidas pela usuária, com preço sugerido em peixinhos.
- **WP-23 · Widget Glance.** Próximos itens e check-in rápido.

### Fase 5 — Conversa
- **WP-24 · `ai-llm`.** Três adaptadores, cofre de chave no Keystore, botão testar chave, limite de tokens, resumo contínuo, contador mensal e teto opcional.
- **WP-25 · Persona e segurança.** `PersonaBuilder`, `SafetyLayer`, falas de reserva por humor.
- **WP-26 · `feature-conversa`.** Balões, modos de conversa, desabafo sem envio de dados de tarefas, tela “o que a gatinha vê”, apagar tudo, trava biométrica.
- **WP-27 · Briefing.** Perguntas uma por vez, JSON validado por esquema, aceitar, editar ou recusar cada sugestão, versão em lista fixa sem chave.
- **Gate G3:** conferir os números do CVV e do SAMU e revisar o texto de privacidade com a cliente.

### Fase 6 — Controle (só após G1)
- **WP-28 · `platform-uso`.** Amostras a cada 15 min e ao abrir o app, relatórios, metas de tempo por app, alimenta o índice de foco.
- **WP-29 · `BlockPolicy` e `platform-bloqueio`.** Níveis 0 a 4, desbloqueio por tarefas, exceções protegidas, saída garantida.
- **WP-30 · `feature-foco`.** Configuração por app e horário, tela de saúde das permissões com passo a passo da gatinha.
- **Gate G4:** roteiro manual de bloqueio no aparelho da cliente, inclusive com o app em segundo plano por horas.

### Fase 7 — Polimento
- **WP-31 · Gracinhas do novelo** em todas as telas, com intervalo mínimo e opção de desligar.
- **WP-32 · Qualidade.** Testes de captura de tela, contraste e tamanho mínimo de 12 sp nas telas de dados.
- **WP-33 · Release.** APK assinado, verificador de versão opcional e recalibração da economia depois de duas semanas de uso real.

### Trilha de arte (paralela, humana com scripts)
- **A1** prompt-mestre e paleta de 16 cores
- **A2** folha de referência e poses
- **A3** script de tratamento e atlas
- **A4** cenário do cômodo e móveis
- **A5** ícones de itens e novelo 16×16
O pacote de prompts de arte está documentado em `docs/prompts-arte.md`.
