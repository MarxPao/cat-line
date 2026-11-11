# AGENTS.md — Regras Permanentes do Projeto Dead Line

## 1. Contexto e Objetivo
**Dead Line** é um aplicativo Android nativo gamificado de agenda, hábitos, metas e foco em pixel art 8-bit, protagonizado por uma gatinha calico e um novelo de lã.
Antes de iniciar qualquer pacote de trabalho (WP), leia:
- `docs/briefing.md` (visão do produto e regras de negócio)
- `docs/arquitetura.md` (decisões arquiteturais AD-01 a AD-16, contratos e pacotes de trabalho)
- `docs/lacunas.md` (defaults adotados para pontos em aberto)
- `docs/decisoes.md` (registro vivo de decisões técnicas assumidas durante a implementação)

## 2. Stack Tecnológica e Versões
- **Linguagem:** Kotlin (JVM 17 / Android)
- **UI:** Jetpack Compose + Material 3 (customizado com tema Pixel Art em `:core-ui`) + Compose Canvas (`:core-game`)
- **Injeção de Dependências:** Hilt (`dagger.hilt.android`)
- **Persistência Local:** Room (SQLite) + Jetpack DataStore (Preferences)
- **Background:** WorkManager + AlarmManager
- **Serialização:** `kotlinx.serialization` (JSON)
- **Rede (LLM BYOK):** OkHttp (com streaming SSE)
- **Widget:** Jetpack Glance
- **Segurança e Criptografia:** Android Keystore + Google Tink (AES-GCM)
- **SDK:** `minSdk = 26` (Android 8.0), `targetSdk = 35`, `compileSdk = 35`
- **Catálogo de versões:** Todas as dependências e versões devem ficar centralizadas em `gradle/libs.versions.toml` e aplicadas via convention plugins em `build-logic`.

## 3. Grafo de Dependências e Isolamento de Módulos
O projeto possui 16 módulos divididos em 5 camadas. A tarefa `./gradlew checkModuleGraph` (integrada ao `./gradlew check`) valida estas regras e falha o build em caso de violação:

| Camada | Módulos | Pode depender APENAS de |
|---|---|---|
| **Domínio** | `:core-domain` | Kotlin stdlib, `kotlinx-coroutines-core`, `kotlinx-serialization-json`, `java.time` (NUNCA Android) |
| **Infraestrutura** | `:core-data`, `:ai-llm`, `:platform-uso`, `:platform-bloqueio`, `:platform-lembretes` | `:core-domain` |
| **Base de UI e Jogo** | `:core-ui`, `:core-game` | `:core-domain` (`:core-game` também pode depender de `:core-ui`) |
| **Funcionalidades** | `:feature-hoje`, `:feature-agenda`, `:feature-habitos`, `:feature-metas`, `:feature-insights`, `:feature-loja`, `:feature-conversa`, `:feature-foco` | `:core-domain`, `:core-ui`, `:core-game` (NUNCA outra `:feature-*` nem módulos de infraestrutura) |
| **Montagem** | `:app` | Todos os módulos (faz wiring Hilt, navegação e registro de `FeatureModule`) |

**Regra de ouro para agentes:** Nunca edite módulos fora do escopo definido para o seu Pacote de Trabalho (WP).

## 4. Regras Inegociáveis de Domínio e Arquitetura
1. **Domínio Puro (`AD-03`):** `:core-domain` é um módulo Kotlin/JVM puro (`org.jetbrains.kotlin.jvm`). É estritamente proibido importar `android.*` ou `androidx.*` em `:core-domain`.
2. **Relógio Injetável (`AD-05`):** É proibido usar `System.currentTimeMillis()`, `Instant.now()`, `LocalDate.now()` ou `LocalDateTime.now()` sem passar um `java.time.Clock` injetado fora de adaptadores de borda.
3. **Dia Lógico (`dayKey`):** O dia vira às `04:00` por padrão (configurável em `DayBoundary`). Toda consulta e fechamento diário usa `dayKey: LocalDate` calculado pelo `DayBoundary`, nunca meia-noite fixa.
4. **Zero Números Mágicos de Jogo (`AD-10`):** Nenhum valor de economia, pesos de humor, falas de reserva ou mapeamento de rotina fica fixo no código. Tudo deve vir de modelos carregados de arquivos JSON versionados.
5. **Tudo é Modulável (`AD-11`):** Cada feature implementa `FeatureModule` com uma `FeatureFlagKey` persistida no DataStore. Desligar um módulo esconde sua entrada na UI e suspende seus serviços/workers.
6. **Transação e Idempotência (`AD-08`, `AD-09`):** Check-in, mudança de estado da ocorrência e lançamentos no livro-caixa (`LedgerEntry`) ocorrem na mesma transação Room; o evento `CheckInRegistrado` só é publicado no `EventBus` após o commit.

## 5. Privacidade, Segurança e Idioma
- **Privacidade (`AD-15`, `AD-16`):** `allowBackup="false"` no AndroidManifest. Nunca registre chaves de API, textos de conversa/desabafo ou títulos de compromissos pessoais em `Log.*` ou relatórios de erro.
- **Idioma:** Todo texto visível à usuária deve estar em **Português do Brasil (pt-BR)**, extraído em recursos `res/values/strings.xml` (ou arquivos JSON de configuração).
- **Lacunas e Decisões:** Se faltar informação durante um WP, consulte `docs/lacunas.md`, adote o default documentado, registre a decisão técnica em `docs/decisoes.md` e siga sem inventar requisitos.

## 6. Definição de Pronto (DoD)
Um Pacote de Trabalho (WP) só está concluído quando:
1. `./gradlew check` (incluindo `checkModuleGraph` e testes unitários) passa sem erros.
2. Todos os motores e contratos criados/alterados possuem testes unitários determinísticos usando `FakeClock`.
3. Nenhum warning novo de compilação ou violação de arquitetura foi introduzido.
4. Qualquer decisão técnica relevante tomada foi registrada em `docs/decisoes.md`.
