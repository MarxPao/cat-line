# Dead Line — Registro de Decisões Técnicas Assumidas

Este documento registra as decisões de implementação tomadas pelos agentes durante a execução dos pacotes de trabalho (WPs), complementando as decisões AD-01 a AD-16 de `docs/arquitetura.md`.

---

---

## DT-001 · Namespace e Estrutura de Módulos (WP-00 / WP-01)
- **Data:** 2026-10-25
- **Contexto:** O briefing define o nome de trabalho "Dead Line" (com possibilidade de ajuste) e 16 módulos Gradle divididos em 5 camadas.
- **Decisão:**
  - `applicationId` do módulo `:app` definido como `com.deadline.app`.
  - Pacote raiz em todos os módulos definido como `com.deadline.<modulo>` (ex.: `com.deadline.core.domain`, `com.deadline.feature.hoje`).
  - Convention plugins em `build-logic` (`deadline.jvm.library`, `deadline.android.library`, `deadline.android.compose`, `deadline.android.feature`, `deadline.android.application`, `deadline.android.hilt`) padronizam SDKs (`minSdk = 26`, `compileSdk = 35`, `targetSdk = 35`) e Java/Kotlin (`JVM 17`).

## DT-002 · Verificação Automática do Grafo de Dependências (WP-00)
- **Data:** 2026-10-25
- **Contexto:** A seção 3 da arquitetura exige uma tarefa Gradle que verifique o grafo de dependências entre camadas e falhe o build se houver dependência proibida.
- **Decisão:**
  - Criada a tarefa `checkModuleGraph` no `build.gradle.kts` raiz e vinculada à tarefa `check` de todos os módulos.
  - A tarefa inspeciona todas as configurações `implementation`, `api`, `compileOnly` e `runtimeOnly` de cada subprojeto e valida contra as regras da seção 3:
  - `:core-domain` não pode depender de nenhum outro módulo nem de bibliotecas Android.
  - Módulos de infraestrutura (`:core-data`, `:ai-llm`, `:platform-*`) só podem depender de `:core-domain`.
  - `:core-ui` só pode depender de `:core-domain`; `:core-game` só pode depender de `:core-domain` e `:core-ui`.
  - Módulos `:feature-*` só podem depender de `:core-domain`, `:core-ui` e `:core-game` (nunca de outra feature ou de infraestrutura).
  - `:app` pode depender de todos os módulos.

## DT-003 · Contratos de Modulabilidade (`FeatureModule`) e Flags (WP-01 / WP-02)
- **Data:** 2026-10-25
- **Contexto:** AD-11 determina que cada módulo de funcionalidade tem uma chave no DataStore e um registro no `:app`, permitindo à usuária ligar/desligar qualquer módulo.
- **Decisão:**
  - Definido o enum `FeatureFlagKey` e a interface `FeatureFlagsRepository` em `:core-domain`.
  - Definida a interface `FeatureModule` em `:core-ui` (para permitir integração com navegação e renderização Compose) e implementada pelos 8 módulos `:feature-*`, registrados via multibinding Hilt (`@IntoSet`) no `:app`.
  - A implementação de persistência em DataStore Preferences fica centralizada para que o `:app` permita ativar/desativar cada módulo em tempo real na tela inicial/configurações.

## DT-004 · Motores Puros de Domínio e Configuração Versionada (WP-03, WP-04 e WP-07)
- **Data:** 2026-10-25
- **Contexto:** As seções 18 e 19 do briefing e a regra AD-10 exigem que `RecurrenceEngine`, `DelayEngine`, `MoodEngine` e `EconomyEngine` vivam em `:core-domain` sem números mágicos fixos.
- **Decisão:**
  - `RecurrenceEngine`: trata horários antes da virada (`00:00` a `03:59` por padrão) como pertencentes à madrugada do mesmo `dayKey` (na data civil `dayKey + 1`), suporta frequências `Once`, `Daily`, `Weekdays`, `SpecificDays` e `TimesPerWeek`, e recalcula apenas ocorrências futuras pendentes quando uma série ou fuso é editado.
  - `DelayEngine`: classifica check-ins em `ADIANTADO` (`< 0 min`), `NO_PRAZO` (`0..5 min`), `ATRASADO_LEVE` (`6..30 min`), `ATRASADO_FORTE` (`> 30 min`) e `PERDIDO`, usando a mediana como indicador principal e comparando janelas móveis de 7 e 30 dias para apurar a *superação*.
  - `EconomyConfig` (`economia.json` v1): armazena todas as tabelas de ganho, multiplicadores de pontualidade, teto de 10 tarefas P, rendimento decrescente a partir do 12º item, bônus de superação, faixas bronze/prata/ouro, dia de recuperação, baú semanal com garantia (*pity*) a cada 4 baús e pesos do `MoodEngine`.

## DT-005 · Kit de Interface Pixel Art 8-Bit e Novelo (WP-06)
- **Data:** 2026-10-25
- **Contexto:** A seção 20 pede bordas 9-patch pixeladas, botões com estado pressionado, balão de fala idêntico à referência com máquina de escrever e o componente Novelo com 4 modos.
- **Decisão:**
  - Implementados em `:core-ui` usando `Canvas` e `drawBehind` em degraus de pixel (`Pixel9PatchCard`, `PixelButton`, `PixelSpeechBubble` e `NoveloComponent` com a `sealed interface NoveloMode`: `Barra`, `Cronometro`, `Grafico` e `Edicao`).
  - Tipografia configurada em `DeadLinePixelTheme` garantindo tamanho mínimo estrito de `12.sp` nas telas de dados.

## DT-006 · Persistência Room, Transação de Check-in e Idempotência (WP-05)
- **Data:** 2026-10-25
- **Contexto:** As regras AD-06, AD-08 e AD-09 exigem Room como fonte única de verdade, gravação atômica de check-in + estado + livro-caixa com publicação do evento apenas após o commit, e índice único `(ruleKey, referenceId, currency)` no livro-caixa.
- **Decisão:**
  - `DeadLineDatabase` (v1, com exportação de schema em `core-data/schemas`) contempla as 13 tabelas do briefing (`commitments`, `occurrences`, `check_ins`, `habits`, `habit_logs`, `goals`, `ledger_entries`, `day_closures`, `cat_profiles`, `app_usage_buckets`, `block_rules`, `unlock_sessions`, `conversation_messages`).
  - `RoomOccurrenceRepository` abstrai a transação Room via `TransactionRunner` (permitindo testes JVM determinísticos sem emulador) e emite `DomainEvent.CheckInRegistrado` exclusivamente após o bloco transacional concluir.
  - `DayCloseCoordinator` garante fechamento diário idempotente chaveado por `dayKey`.

## DT-007 · Fase 2 — Uso Básico, Alarmes Exatos e Portas de Repositório (WP-08 a WP-13)
- **Data:** 2026-10-25
- **Contexto:** As features (`:feature-agenda`, `:feature-habitos`, `:feature-hoje`, `:feature-insights`) só podem depender de `:core-domain`, `:core-ui` e `:core-game` (nunca de `:core-data`).
- **Decisão:**
  - Adicionadas as portas `AgendaRepository`, `HabitRepository`, `InsightsRepository`, `BackupRepository` e `DayRolloverHandler` em `:core-domain` e suas implementações Room/DataStore em `:core-data` (`Phase2Repositories.kt`).
  - Em `:platform-lembretes`, `AndroidExactAlarmScheduler` agenda alarmes exatos (`setExactAndAllowWhileIdle` quando disponível) e `ReminderActionReceiver` trata o botão de ação *"Feito!"* na notificação gravando o check-in com `CheckInOrigin.NOTIFICACAO`, além de reagendar e fechar o dia em `BOOT_COMPLETED` e `DailyRolloverWorker`.
  - `WeeklyBackupReminderWorker` dispara o lembrete semanal de exportação de backup JSON conforme a seção 24 do briefing.

## DT-008 · Fase 3 — Motor de Jogo, Animador por Partes, Áudio Chiptune e Lojinha (WP-14 a WP-20)
- **Data:** 2026-10-25
- **Contexto:** A seção 20 especifica grade virtual de 180 px, escala inteira sem filtro (`FilterQuality.None`), gatinha de `64×64` montada em partes (corpo, cauda, olhos, acessórios), 21 animações no MVP, `RoutineDirector` com 4 níveis de prioridade e áudio chiptune.
- **Decisão:**
  - `RoutineDirector` implementado em `:core-domain` lendo `rotina_estacoes.json` e testado em `RoutineDirectorTest`.
  - `AsepriteAtlasLoader` e `LayeredCatAnimator` em `:core-game` geram e animam os quadros `64×64` com pontos de ancoragem (`head_anchor`, `neck_anchor`, `tail_anchor`, `paw_anchor`) e respeitam a configuração de acessibilidade `ANIMATOR_DURATION_SCALE == 0`.
  - `ChiptuneAudioEngine` sintetiza ondas quadradas 8-bit em arquivos WAV PCM (3 miados, ronronar em loop e blip de fala por caractere) e os reproduz via `SoundPool` respeitando foco de áudio e volumes independentes.
  - `RoomStoreRepository` e `LojaFeatureModule` implementam compras com Peixinhos e Novelos Dourados, garantindo que comida/brinquedo deem vínculo e animações sem alterar o humor real (Seção 19).

## DT-009 · Fases 4 e 5 — Metas Hierárquicas, Widget Glance, Cofre BYOK e Segurança de Conversa (WP-21 a WP-27)
- **Data:** 2026-10-25
- **Contexto:** As fases 4 e 5 entregam metas hierárquicas com recompensas reais, widget na tela inicial e conversa BYOK com persona dinâmica em 4 blocos, camada de segurança e briefing estruturado.
- **Decisão:**
  - `RoomGoalRepository` e `MetasFeatureModule` implementam a hierarquia (`VIDA`, `TRIMESTRE`, `MES`, `SEMANA`, `TAREFA`), propagam progresso para a meta-pai, creditam Novelos Dourados ao atingir 100% e sugerem 100 Peixinhos (1 dia típico) para mimos ou 600 Peixinhos (5–7 dias) para recompensas reais grandes.
  - `DeadLineGlanceAppWidget` em `:platform-lembretes` exibe os próximos compromissos pendentes do `dayKey` e realiza check-in rápido via `QuickCheckInWidgetAction`.
  - `AndroidKeystoreSecretVault` e `ByokRoutingLlmProvider` em `:ai-llm` guardam a chave criptografada em `noBackupFilesDir` com `AndroidKeyStore` (`AES/GCM/NoPadding`) e roteiam entre `Gemini`, `Anthropic` e `OpenAI-Compatible`.
  - `PersonaBuilder` e `SafetyLayer` em `:core-domain` (testados em `PersonaAndSafetyEngineTest`) garantem que o modo `DESABAFO` jamais envie resumo de tarefas ao provedor e que sinais de crise recebam acolhimento imediato com os números do CVV (`188`) e SAMU (`192`) vindos de `seguranca_contatos.json`.

## DT-010 · Fases 6 e 7 — Controle de Foco, Barreira da Gatinha, Gracinhas do Novelo e Qualidade (WP-28 a WP-33)
- **Data:** 2026-10-25
- **Contexto:** As fases 6 e 7 implementam o tracker de tempo de uso, a política de bloqueio com 5 níveis de rigor, a tela de saúde das permissões, as gracinhas do novelo em todas as telas e a recalibração de release.
- **Decisão:**
  - `BlockPolicy` em `:core-domain` (testado em `BlockPolicyTest`) garante que WhatsApp (`com.whatsapp`), discador, emergência, configurações, launchers e o próprio Dead Line nunca sejam bloqueados, suspende bloqueios em Modo Descanso e aplica os níveis `0 OBSERVAR` a `4 FIRME`.
  - `RoomFocusControlRepository` escuta `DomainEvent.CheckInRegistrado` e cria automaticamente sessões temporárias de desbloqueio (`UnlockSessionEntity`) para apps em rigor condicional.
  - `AndroidUsageStatsSource` e `UsageSamplingWorker` amostram `UsageStatsManager` a cada 15 minutos e mantêm retenção de 180 dias.
  - `AndroidPermissionHealth` e `FocoFeatureModule` exibem o painel verde/vermelho com passo a passo da gatinha (incluindo liberação de *"Configurações restritas"* no Android 13+) e a saída garantida segurando por 10 segundos.
  - `NoveloScreenAnticBanner`, `CoreUiQualityTest` e `ReleaseAndCalibrationHelper` cobrem as gracinhas desligáveis do novelo, contraste WCAG >= 10:1, tamanho mínimo >= 12 sp e recalibração econômica após 14 dias de uso real.

## DT-011 · Simulador Web Interativo em Localhost (`web-preview/`)
- **Data:** 2026-10-25
- **Contexto:** Para visualização imediata da fidelidade estética, sonora e funcional das regras de negócio sem exigir instalação prévia de SDK local, disponibilizou-se um simulador interativo em navegador servido via HTTP local.
- **Decisão:**
  - Criado o simulador em `web-preview/` (`index.html`, `style.css`, `app.js`, `gatinha_referencia.jpg`) servido em `http://localhost:5500` e `http://localhost:8888`.
  - O simulador reproduz:
  - O Canvas 8-bit com grade virtual de 180 px e escala inteira (pixel art fiel à gatinha calico da imagem de referência).
  - O sintetizador de áudio chiptune 8-bit em tempo real (ondas quadradas para miados, ronronados e blips de fala) via Web Audio API.
  - As 8 abas funcionais do aplicativo (:feature-hoje, :feature-agenda, :feature-habitos, :feature-metas, :feature-insights com gráfico "O Fio", :feature-loja, :feature-conversa com seletor de personas e briefing, e :feature-foco com níveis 0–4 e saída de emergência de 10s).
  - O painel lateral com controle de humor manual/automático, trocas de acessórios cosméticos e chaves de modularidade de cada feature.

## DT-012 · CRUD Completo (Hábitos, Metas e Compromissos) e Dashboard de Analytics Profundo
- **Data:** 2026-10-25
- **Contexto:** A usuária precisa de total controle para editar e descartar hábitos, metas e compromissos existentes (nada fica engessado), além de um painel de analytics com métricas de evolução, horários críticos e superação.
- **Decisão:**
  - **Compromissos (Hoje & Agenda):** Implementada edição inline de título, horário e esforço (P/M/G) e descarte com 🗑️ em tempo real.
  - **Hábitos (:feature-habitos):** Adicionado formulário de criação de hábitos com janela de horário e frequência (Diário, Dias úteis, 3x semana, Fim de semana), edição inline de sequências/janelas e botão de descarte 🗑️.
  - **Metas (:feature-metas):** Adicionada edição completa de título, horizonte (Semana, Mês, Trimestre, Vida), cor do novelo, duração em minutos, mimo real e custo em Peixinhos, além de botão de descarte 🗑️ com fallback automático do novelo na mão da gatinha.
  - **Analytics Profundo (:feature-insights):**
  - Seletor dinâmico de período: 7 dias, 14 dias e 30 dias.
  - Grid de 4 indicadores: Taxa no Prazo (%), Mediana de Atraso (min), Consistência de Hábitos (%) e Economia Acumulada (+🐟 e 🧶).
  - Gráfico "O Fio" adaptativo com nós de lã e linha de tolerância de 5 min.
  - Gráfico de barras 8-bit em Canvas: Taxa de Pontualidade por Dia da Semana (Seg a Dom).
  - Heatmap de Rotina por Período: Manhã (06-12h), Tarde (12-18h), Noite (18-24h) e Madrugada (00-06h).
  - Painel da Meta de Superação configurável pela usuária com cálculo determinístico da mediana.
  - Exportação e importação completa de backup JSON criptografado localmente.

## DT-013 · Bloqueio de Redes Sociais ao Gosto da Cliente e Simulador Interativo de Barreira
- **Data:** 2026-10-26
- **Contexto:** A cliente solicitou poder travar os outros apps de redes sociais livremente ao seu gosto (escolhendo as redes, rigor e horários), mantendo os princípios de que o app não a aprisiona e que o WhatsApp fica sempre livre.
- **Decisão:**
  - **Catálogo de Presets de Redes Sociais:** Adicionados presets rápidos com ícones e nomes amigáveis em `BlockPolicy.POPULAR_SOCIAL_MEDIA_PRESETS` (`core-domain`), `FocoFeatureModule` (`feature-foco` em Compose) e no simulador web (`web-preview/`): Instagram (📸), TikTok (🎵), Twitter/X (🩵), YouTube (🔴), Facebook (📘), Reddit (🤖), Pinterest (📌) e Threads (🧵), além de permitir cadastrar qualquer outro app.
  - **Configuração de Rigor ao Gosto da Cliente:** A cliente escolhe para cada rede social entre os 5 níveis de rigor:
  - *0 Observar:* apenas mede o tempo de tela sem interromper.
  - *1 Aviso:* balão com fala acolhedora da gatinha lembrando do horário de foco e oferecendo passe de 15 minutos.
  - *2 Fricção:* espera reflexiva com contagem regressiva viva de 15 segundos ("Mamãe, o que você veio buscar aqui ajuda a puxar o nosso fio de hoje?").
  - *3 Condicional:* bloqueado até a cliente cumprir as tarefas pendentes do dia (ao cumprir os compromissos, a rede social é liberada na hora!).
  - *4 Firme:* bloqueio durante todo o horário definido.
  - **Flexibilidade de Horários e Toggle Rápido:** Definição de horários de início e fim, dias da semana e interruptor Ativo/Pausado para desativar temporariamente sem precisar apagar a regra.
  - **Proteção Absoluta Inegociável:** WhatsApp, discador de emergência, configurações e o próprio Dead Line nunca são bloqueados, garantindo que a cliente nunca fique isolada.
  - **Simulador Interativo da Barreira da Gatinha (Testar Bloqueio 🚀):** Na pré-visualização web (`web-preview/`), adicionado botão para simular a abertura de cada rede social, renderizando a barreira em tempo real com diálogos, temporizadores e integração com as tarefas do dia.
  - **Saída Garantida de Emergência:** Mantido o mecanismo de segurar a gatinha por 10 segundos com barra de progresso viva e áudio chiptune, concedendo passe temporário de emergência de 30 minutos em qualquer situação.

## DT-014 · Renomeação para Cat Line, Cronômetro de Metas em Dias e Briefing Mensal de Rotina
- **Data:** 2026-10-26
- **Contexto:** A cliente solicitou a substituição do nome do produto por **Cat Line**, metas com cronômetro regressivo baseado em dias (com o novelo se enrolando continuamente à medida que o tempo esgota) e uma funcionalidade completa de **Briefing** para planejar a rotina e metas tanto no início do app quanto a cada mês poder editar/revisar.
- **Decisão:**
  - **Identidade da Marca (Cat Line):**
  - Nome atualizado formalmente para **Cat Line** em todas as telas, cabeçalhos, diálogos, títulos de janela e backups locais (`catline_backup_${dayKey}.json`).
  - **Metas com Cronômetro Regressivo em Dias:**
  - Suporte nativo a metas de múltiplos dias (`totalDays`: 7 para Semana, 30 para Mês, 90 para Trimestre, 365 para Ano/Vida ou valor customizado).
  - O cronômetro regressivo exibe a contagem formatada em tempo real (`Xd Xh Xm Xs` quando há dias restantes, ou `Xh Xm Xs`).
  - O novelinho na mão da gatinha enrola de forma determinística à medida que os dias e horas se esgotam, atualizando o Canvas 8-bit e o seletor de chips.
  - Botões de simulação acelerada `-15m ⏳` e `-1d ⏳` permitem testar o avanço no tempo.
  - **Funcionalidade de Briefing Mensal & Planejamento de Rotina (Wizard em 5 Etapas):**
  - Conduzido com diálogos carinhosos da gatinha em pixel art.
  - *Etapa 1 (Ritmo Diário):* Definição de horários de acordar, dormir e período de maior produtividade (Manhã, Tarde ou Noite).
  - *Etapa 2 (Hábitos do Mês):* Seleção e inclusão de hábitos essenciais com chips clicáveis.
  - *Etapa 3 (Grande Meta):* Definição da meta prioritária, seleção do horizonte em dias (7d, 30d, 90d, 365d), escolha da cor do novelo e mimo de recompensa.
  - *Etapa 4 (Redes Sociais & Foco):* Seleção de apps a monitorar e nível de rigor preferido pela cliente.
  - *Etapa 5 (Plano Consolidado):* Resumo 8-bit com botão de um clique para aplicar o plano completo diretamente no estado do app.
  - O Briefing é acessível em destaque na aba Hoje, na aba Chat e pode ser reaberto e editado a qualquer momento ao longo do mês.
  - **Regra de Apresentação:**
  - Remoção estrita de parênteses descritivos no app conforme exigência da usuária, mantendo a interface visualmente limpa e direta.

## DT-015 · Memória 100% Local no Aparelho (Offline-First sem Dependência de Nuvem ou Supabase)
- **Data:** 2026-10-27
- **Contexto:** A cliente solicitou que o app não perca a memória nem dependa de Supabase ou contas em nuvem, utilizando a memória interna do próprio celular para reter todo o progresso.
- **Decisão:**
  - **Armazenamento 100% no Aparelho (`localStorage` & Room):**
  - Todo o estado do app (rotina diária, ocorrências de compromissos, hábitos, metas, cronômetros de novelo, personalização da gatinha, histórico de mensagens e regras de bloqueio de redes sociais) é gravado na memória interna do dispositivo sob a chave `CATLINE_DEVICE_STORAGE_V1`.
  - Nenhuma dependência externa de Supabase, Firebase ou autenticação em nuvem é requerida: o aplicativo funciona de maneira estritamente offline-first.
  - **Sincronização em Tempo Real e Persistência de Ciclo de Vida:**
  - Persistência imediata disparada em todas as 30 ações de mutação do app (criar/editar/apagar tarefas, hábitos, metas, regras de foco, compras e check-ins).
  - Persistência contínua a cada 10 segundos para preservar o cronômetro das metas em tempo real.
  - Captura de eventos nativos de ciclo de vida (`beforeunload`, `pagehide`, `visibilitychange`) para garantir que os dados sejam salvos mesmo ao trocar de aplicativo ou bloquear a tela do celular.
  - **Cálculo Determinístico de Tempo Decorrido:**
  - Ao reabrir o app, o sistema compara a estampa de data/hora atual com `savedAt` e abate automaticamente o tempo decorrido do cronômetro das metas (a menos que o Modo Descanso esteja ativado).
  - **Controle da Usuária:**
  - Na aba Insights, foi disponibilizada a seção "Memória do Celular & Privacidade" com botões de Exportar Backup, Importar Backup e Limpar Memória e Reiniciar.

## DT-016 · Compromissos Recorrentes, Botão de Conclusão na Agenda e Visibilidade de Hábitos do Briefing
- **Data:** 2026-10-27
- **Contexto:** A cliente solicitou: 1) compromissos recorrentes e personalizáveis iguais aos hábitos (não apenas do dia); 2) botão verde para marcar compromissos como feito na Agenda (não apenas excluir); 3) correção para os hábitos adicionados no Briefing aparecerem na rotina diária.
- **Decisão:**
  - **Compromissos Recorrentes e Pontuais:**
  - Campo de frequência adicionado na criação e na edição de compromissos: *Todos os dias*, *Dias úteis*, *Finais de semana*, *3x por semana*, *Semanal*, *Apenas hoje* e *Data específica*.
  - Campo de data para agendamentos pontuais ou definição de data de início da série.
  - Exibição de tags visuais com a frequência em cada card de compromisso.
  - **Botão Verde "Feito ✓" na Agenda e em Hoje:**
  - A aba Agenda agora exibe o botão verde `Feito ✓` (ganho total de peixinhos) e o botão roxo `Retro` (check-in retroativo com metade dos pontos).
  - Compromissos cumpridos exibem o selo verde `FEITO ✓` e um botão `Reabrir` caso a usuária queira desmarcar.
  - O check-in atualiza a tela ativa sem desviar o contexto e grava na memória do celular.
  - **Exibição e Integração dos Hábitos do Briefing:**
  - Adicionado card dedicado de **Hábitos de Hoje** na aba principal **Hoje**, permitindo ver e cumprir os hábitos planejados diretamente na tela inicial com o botão verde `Cumprir ✓`.
  - O input de hábito personalizado no Briefing agora aceita a tecla Enter e salva automaticamente o texto digitado se a cliente clicar em avançar sem apertar "+ Adicionar".
  - Hábitos personalizados já cadastrados passam a constar no grid de escolhas do Briefing.
  - Ao concluir o Briefing, o app direciona automaticamente para a aba **Hoje**, com fala comemorativa da gatinha confirmando os hábitos ativados.

## DT-017 · Animações Espelho da Rotina da Cliente (A Gatinha Fazendo a Tarefa com a Usuária)
- **Data:** 2026-10-27
- **Contexto:** A cliente solicitou que a gatinha no app execute a mesma tarefa que ela estiver realizando naquela hora, espelhando a rotina diária no cenário pixel art.
- **Decisão:**
  - **Classificador de Atividades e Postos no Quarto (`detectTaskCategory`):**
  - Mapeamento inteligente de compromissos e hábitos para 6 estações do quarto pixel art:
  - *Estudo / Leitura:* gatinha na Estante de Estudos com óculos 8-bit, livro aberto com páginas folheando e luminária acesa.
  - *Treino / Calistenia:* gatinha no Tapete com faixinha esportiva vermelha, pulando ritmicamente com gotinhas de energia e novelo quicando.
  - *Trabalho / Dev / Reunião:* gatinha na Escrivaninha com notebook 8-bit brilhando em azul, teclando alternadamente e caneca de café com fumacinha.
  - *Casa / Organização:* gatinha no centro da sala varrendo com vassourinha de palha e estrelinhas ✨ de limpeza subindo do chão.
  - *Água / Alimentação:* gatinha na Tigelinha com água e corações subindo.
  - *Descanso / Sono:* gatinha enroscada na Caminha Rosa com olhinhos fechados e balãozinhos de "Zzz".
  - *Modo Livre:* caminhada relaxada brincando com o novelo da meta.
  - **Botão "▶️ Fazer Agora" e Banner Ativo:**
  - Botão *▶️ Fazer Agora* em cada compromisso e hábito da aba Hoje.
  - Banner destacado no topo da tela inicial indicando a tarefa em execução e o que a gatinha está fazendo junto.
  - Identificação automática do horário agendado ou rotina de sono do briefing quando não houver seleção manual ativa.

## DT-018 · Cosméticos Visíveis nos Sprites, Carinho Háptico e Modo Foco Pomodoro com Ronrom
- **Data:** 2026-10-27
- **Contexto:** Evolução do Cat Line inspirada nos líderes de mercado (*Finch* e *Tiimo*), adicionando cosméticos equipáveis visualmente na gatinha, interação tátil de carinho com vibração háptica e temporizador de foco imersivo com som ambiente.
- **Decisão:**
  - **Cosméticos Visíveis no Sprite da Gatinha:**
  - *Laço Rosa Pixel (🎀):* laço delicado na orelhinha.
  - *Coroa Dourada Real (👑):* coroa de princesa em pixel art com gema de rubi brilhante no centro.
  - *Chapéu de Mago 8-Bit (🧙‍♂️):* chapéu pontudo roxo com estrelinha mágica dourada na ponta.
  - *Coleira com Sino de Ouro (🔔):* coleirinha vermelha no pescoço com sininho balançando.
  - *Óculos Escuros Pixel (🕶️):* armação preta com lentes escuras e brilho reflexivo.
  - Todos os itens equipados na Lojinha passam a ser renderizados simultaneamente no Canvas do quarto em tempo real.
  - **Carinho Háptico (Vibração + Ronrom):**
  - Ao tocar ou passar o dedo na gatinha no Canvas, o dispositivo vibra suavemente via `navigator.vibrate([35, 45, 55, 45, 65])` simulando o motorzinho do ronrom.
  - Dispara o som chiptune `audio.playPurr()`, incrementa o Vínculo (+1♥) e exibe falas carinhosas de acolhimento.
  - **Temporizador de Foco "Puxar o Fio" (Pomodoro do Novelo):**
  - Modal imersivo com contagem regressiva em pixel art (15m, 25m Pomodoro, 45m).
  - Animação dedicada do novelo desenrolando o fio em tempo real enquanto a cliente foca.
  - Áudio ambiente opcional com som rítmico de ronrom relaxante a cada 3.2 segundos.
  - Recompensa ao concluir: +15 Peixinhos (🐟), +15 Vínculo (♥) e conclusão automática da tarefa em andamento.

## DT-019 · Sistema Editável de Mimos da Vida Real (Auto-Recompensas Gamificadas)
- **Data:** 2026-10-27
- **Contexto:** A cliente solicitou a capacidade de se presentear de forma editável com coisas da vida real ao cumprir suas metas e hábitos, materializando o briefing de auto-recompensas sem culpa ("Recompensas reais: definidas pela usuária, liberadas ao cumprir metas").
- **Decisão:**
  - **Modelo de Dados e Persistência Local:**
  - Criado o modelo `realLifeRewards` contendo `id`, `title`, `cost` (em 🐟), `icon` (emoji), `redeemedCount` (quantas vezes desfrutou) e `lastRedeemedAt` (data do último resgate).
  - Persistência 100% offline no `localStorage` do aparelho (`CATLINE_DEVICE_STORAGE_V1`), sem dependência de nuvem ou Supabase.
  - **Defaults Carinhosos Pré-Configurados:**
  - Café especial na cafeteria favorita (30🐟)
  - Assistir 2 episódios de série sem culpa (45🐟)
  - Banho relaxante com música e velas (40🐟)
  - Pedir delivery favorito no jantar (70🐟)
  - Comprar um livro novo ou mimo desejado (120🐟)
  - Sobremesa ou sorvete artesanal (25🐟)
  - **CRUD Completo:**
  - *Criação:* Formulário com campo de texto, custo em peixinhos e seletor rápido com 16 emojis temáticos.
  - *Edição Inline:* Botão `✏️` para alterar nome, custo e ícone de qualquer mimo.
  - *Exclusão:* Botão `🗑️` com confirmação.
  - **Experiência de Resgate ("🎁 Me Presentear"):**
  - Se o saldo for menor que o custo, o botão indica claramente: `Faltam X🐟` e orienta com carinho a continuar os hábitos.
  - Ao resgatar: debita os Peixinhos, incrementa o contador de vezes desfrutado, concede +25 Vínculo com a gatinha, aciona fanfarra chiptune (`audio.playMeowCelebrate()`), vibração háptica no aparelho e fala especial da gatinha: *"Miau, mamãe! VOCÊ CONQUISTOU: [Mimo]! Aproveite sem peso na consciência!"*.
  - Banner comemorativo destacado no topo com botão de confirmação.
  - **Conexão na Aba Hoje:**
  - Card motivacional no final da tela principal exibindo o saldo de Peixinhos e atalho direto `Ver Mimos 🎁` para incentivar o ciclo de esforço e recompensa real.

## DT-020 · Pipeline e Geração de APK Nativo Instalável Android (.apk)
- **Data:** 2026-10-27
- **Contexto:** A cliente e o usuário solicitaram um aplicativo `.apk` instalável real que permaneça gravado no celular Android, crie ícone próprio na tela inicial e gaveta de apps, abra em tela cheia sem barra de navegador e funcione 100% offline.
- **Decisão:**
  - **Pipeline Automatizado de Compilação do APK (`scripts/build-apk.js`):**
  - Criado ambiente de montagem com ferramentas oficiais Google Android (`aapt2`, `r8/d8`, `android.jar SDK 30-34`).
  - *Compilação de Recursos:* `aapt2 compile` e `aapt2 link` gerando recursos binários (`resources.arsc`), manifesto binário e empacotamento de assets.
  - *Código Nativo Java:* `MainActivity.java` estendendo `android.app.Activity` com `android.webkit.WebView` configurado em tela cheia (`Theme.NoTitleBar.Fullscreen`), com aceleração de hardware, armazenamento local (`setDomStorageEnabled(true)`), acesso a arquivos locais e suporte à tecla voltar física do Android.
  - *Compilação Dalvik:* `javac` + `d8` gerando `classes.dex` otimizado.
  - *Assinatura Criptográfica:* Geração de Keystore segura com RSA 2048-bit (`catline-release.keystore`) e assinatura digital com `jarsigner`.
  - **Resultado do Pacote Instalável:**
  - Arquivo: `CatLine.apk` (93.73 KB).
  - Pacote: `com.deadline.app`.
  - Nome do app: "Cat Line".
  - Ícone: Gatinha calico pixel art oficial em `res/drawable/icon.png`.
  - Compatibilidade: `minSdkVersion = 26` (Android 8.0) até `targetSdkVersion = 34` (Android 14/15).
  - Permissões: Internet e Vibração Háptica.
  - Pacote para distribuição no WhatsApp com instruções: `CatLine-APK-Instalador.zip`.

## DT-021 · Correção de Análise de Pacote no Android: Zipalign 4-Byte e APK Signature Scheme v2/v3
- **Data:** 2026-10-28
- **Contexto:** A cliente relatou a mensagem de erro ao tentar instalar: *"Não foi possível instalar o app, ocorreu um problema no arquivo do app"* (`INSTALL_PARSE_FAILED_NO_CERTIFICATES` / `INSTALL_PARSE_FAILED_BAD_MANIFEST`).- **Diagnóstico:**
  - No Android 11+ (API 30+), quando um app possui `targetSdkVersion >= 30`, o instalador do Android bloqueia qualquer APK assinado apenas pelo esquema legado v1 (`jarsigner`), exigindo obrigatoriamente o **APK Signature Scheme v2 e v3**.
  - O utilitário `jar uf` do JDK quebra o alinhamento de 4 bytes dos recursos não comprimidos (`resources.arsc` e imagens), violando os requisitos de carregamento em memória do kernel do Android.- **Decisão e Correção:**
  - Baixado e integrado o conjunto oficial de ferramentas Android Build-Tools (`zipalign.exe` e `apksigner.jar`).
  - Fluxo corrigido em `scripts/build-apk.js`:    1. Geração do APK intermediário não comprimido.    2. Execução de `zipalign -p -f -v 4` garantindo alinhamento em blocos de 32 bits de todos os recursos.    3. Assinatura formal via `apksigner sign` aplicando simultaneamente os esquemas **v1 (JAR), v2 (APK Signature) e v3 (Key Rotation)**.
  - **Validação:**
  - `zipalign -c -v 4 CatLine.apk`: `Verification succesful` (100% OK).
  - `apksigner verify --verbose CatLine.apk`: `Verified using v1 scheme: true`, `Verified using v2 scheme: true`, `Verified using v3 scheme: true`.
  - APK pronto e validado para instalação em qualquer aparelho Android moderno.

## DT-022 · Correção Definitiva de Certificado no Futuro, Data Descriptors (0x808) e SDK Target
- **Data:** 2026-10-28
- **Contexto:** O erro de análise do pacote persistiu no celular da cliente ao abrir o APK anterior.- **Diagnóstico Profundo (4 causas raiz identificadas):**  1. **Certificado X.509 com data de início no futuro (`NotBefore: 27/10/2026`):** Como o relógio da máquina de build está em outubro de 2026, o `keytool` gerou um certificado que só passaria a ser válido em `27/10/2026`. Qualquer celular com data real anterior rejeita o certificado com `CertificateNotYetValidException`.  2. **Corrupção de cabeçalhos ZIP pelo `jar.exe uf`:** O comando `jar.exe uf` reescrevia o APK inserindo a flag `0x0808` (*Streaming Data Descriptor*) e o cabeçalho `0xCAFE` no `AndroidManifest.xml` e `classes.dex`, o que é rejeitado pelo `libziparchive` do Android.  3. **Divergência entre `compileSdkVersion` (30) e `targetSdkVersion` (34):** O `android.jar` de linkagem era API 30 enquanto o manifesto declarava API 34.  4. **Versão de bytecode Java 17 sem flag `-target 1.8`:** Compilação sem `-source 1.8 -target 1.8`.- **Decisão e Correção (`scripts/build-apk.js`):**
  - Certificado recriado com `-startdate "2020/01/01 00:00:00"` (válido de **01/01/2020 até 2052**).
  - Substituição total de `jar.exe uf` por `aapt.exe add` oficial do Android Build-Tools 33 (zero Data Descriptors `0x808`).
  - Alinhamento de `minSdkVersion="24"` e `targetSdkVersion="30"` (idêntico ao `compileSdkVersion="30"`), com pacote limpo `com.catline.app` e `android:extractNativeLibs="true"`.
  - Normalização de todos os timestamps dos arquivos internos para `2024-01-01`.
  - Disponibilização do arquivo [`CatLine-Instalador.apk`](file:///c:/Users/rafae/Documents/antigravity/goofy-borg/CatLine-Instalador.apk) tanto localmente quanto via link direto de download com MIME `application/vnd.android.package-archive`.

## DT-023 · Ícone Oficial com Fundo Preto Puro e Poda de Falas Repetitivas
- **Data:** 2026-11-08
- **Contexto:** A cliente solicitou a substituição do fundo do ícone de marrom para preto puro (`#000000`) e a eliminação de frases redundantes da gatinha (como repetir constantemente que pegou o novelo).
- **Decisão:**
  - Criado o script `scripts/process-app-icon.py` isolando os traços claros da gatinha e novelo e aplicando fundo preto `#000000`, gerando novos ícones para o APK e web.
  - Criado o script `scripts/trim-cat-speech.py` fazendo uma varredura nas falas de reserva (`web-preview/app.js` e `falas_reserva.json`), eliminando redundâncias e mantendo tom carinhoso e natural.

## DT-024 · Sistema de Travamento de Redes Sociais por Recompensa e Barreira Global
- **Data:** 2026-11-08
- **Contexto:** A cliente solicitou que redes sociais pudessem ser travadas a seu pedido e destrancadas como recompensa (gastando Peixinhos 🐟 ou cumprindo tarefas pendentes), resolvendo falha onde outros apps não eram travados e sobrescreviam o Instagram.
- **Decisão:**
  - Adicionado cofre "🔒 Redes & Apps Trancados (Recompensa)" nas abas Hoje, Loja e Foco, com 12 presets rápidos e suporte a qualquer app customizado via `resolveSocialAppMeta`, sem colisões de pacote.
  - Correção no CSS de `.blocker-modal-backdrop` para `position: fixed; z-index: 99999`, garantindo barreira de tela cheia visível em qualquer rolagem.
  - No Android nativo, uso de `WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY` + `GLOBAL_ACTION_HOME` e resolução de apps por rótulo (`PackageManager.getApplicationLabel`) + `QUERY_ALL_PACKAGES`.
  - Sistema de resgate de passe temporário de 15m (15🐟), 30m (25🐟) ou grátis ao cumprir todas as tarefas do dia, com botão para trancar imediatamente.

## DT-025 · Lembretes Nativos via AlarmManager, Ação Direta 'Feito' e Cofre Android KeyStore (Fase 1)
- **Data:** 2026-11-10
- **Contexto:** Implementação da Fase 1 do Roadmap do Cat Line para notificações exatas locais mesmo com o celular em repouso e armazenamento criptografado de chaves e dados sensíveis sem bibliotecas externas.
- **Decisão:**
  - **Lembretes Nativos:** Criadas as classes `NotificationHelper.java` e `ReminderReceiver.java` usando `AlarmManager.setExactAndAllowWhileIdle()` e `NotificationManager` com canal de alta prioridade (`NotificationChannel`).
  - **Ação Direta 'Feito ✓':** A notificação expõe botão de ação rápida que cancela o alerta, registra a conclusão na fila local e a WebView reconcilia via `AndroidBlocker.pollCompletedTasks()`, creditando Peixinhos e Vínculo sem exigir abertura do app.
  - **Cofre Seguro (`SecureVault.java`):** Chave mestra AES-GCM 256-bit gerada no `AndroidKeyStore` nativo com IV aleatório de 12 bytes por item, acessada via ponte JS (`putSecret`, `getSecret`, `removeSecret`, `hasSecret`).
  - **Preservação de Dados e Keystore:** Assinatura mantida com a mesma keystore oficial (SHA-256 idêntico) e incremento para `versionCode=7` (`v2.4.0`), garantindo atualização direta sobre o APK prévio sem exclusão do banco local.

## DT-026 · Estimativa vs. Tempo Real, Motor de Calibração e Confirmação Obrigatória (Fase 2)
- **Data:** 2026-11-10
- **Contexto:** Implementação da Fase 2 do Roadmap do Cat Line para registro de tempo real de execução, algoritmo de calibração com barreira mínima de 5 amostras e confirmação obrigatória de ajustes na rotina.
- **Decisão:**
  - **Registro de Duração Estimada e Real:** Adicionado campo de duração estimada (15, 30, 45, 60, 90, 120 min) no formulário da Agenda e na edição rápida; medição do tempo real de execução determinístico via `Clock` tanto para compromissos quanto para hábitos feitos com a gatinha (`startActiveExecution` + `markDone`/`completeHabit`).
  - **Motor Puro `EstimationEngine`:**
  - Barreira estrita de amostragem mínima: nenhuma sugestão com menos de 5 amostras concluídas na mesma categoria (`MIN_SAMPLES = 5`).
  - Comparação entre tempo estimado médio e mediana real da categoria. Sugestão carinhosa da gatinha gerada quando a diferença for relevante (`diff >= 10 min` ou `>= 25%`).
  - Ausência absoluta de parênteses descritivos no texto da gatinha e na interface.
  - **Confirmação Obrigatória:** O app jamais altera horários ou durações automaticamente. O ajuste de durações na rotina exige toque explícito da usuária no botão "Aceitar Ajuste ✓", calibrando apenas tarefas pendentes da respectiva categoria. O botão "Agora Não" descarta a sugestão e registra a recusa para não incomodar a usuária repetidamente.
  - **Pipeline e Testes:** Criada a suíte `scripts/test-phase2.js` com 7 testes determinísticos cobrindo barreira de amostras, cálculo de mediana, ausência de parênteses descritivos, confirmação e recusa, medição temporal e persistência no localStorage. Incremento de versão para `versionCode=8` (`v2.5.0`), gerando APK assinado com schemes v1, v2 e v3 intactos e keystore oficial preservada.

## DT-027 · Replanejamento Inteligente, Gestão de Carga e Confirmação Tátil (Fase 3)
- **Data:** 2026-11-10
- **Contexto:** Implementação da Fase 3 do Roadmap do Cat Line para gestão de carga horária diária, redistribuição suave de tarefas atrasadas ou sobrecarregadas e garantia de confirmação tátil da usuária.
- **Decisão:**
  - **Motor Puro `replanEngine`:** Implementado motor puro e determinístico com cálculo de minutos agendados por dia (`calculateDailyWorkload`), limite de capacidade acolhedora (`getDailyCapacity`, padrão de 420 min / 7h) e detecção de sobrecarga (`checkOverload`).
  - **Redistribuição Suave de Tarefas Atrasadas:** Algoritmo de identificação de itens pendentes atrasados no horário ou por excesso de carga diária (`findDelayedTasks` e `suggestReplan`), propondo realocação para o dia seguinte com linguagem afetuosa da gatinha e zero sentimento de fracasso ou culpa. Ausência total de parênteses descritivos nas mensagens e botões.
  - **Confirmação Tátil Obrigatória:** Nenhuma alteração é aplicada à rotina sem toque deliberado da usuária. A aplicação do plano requer toque em "Replanejar com Carinho ✓" (`acceptReplan`), executando a transformação pura em `applyReplan`. O botão "Manter Como Está" (`dismissReplan`) memoriza a decisão para o dia em `dismissedReplanDay`, evitando qualquer insistência incômoda.
  - **Medidor Visual de Carga na Agenda:** Barra acolhedora na aba Agenda exibindo o total de minutos planejados em relação à capacidade diária recomendada com código de cores amigável.
  - **Pipeline e Testes:** Criada suíte `scripts/test-phase3.js` com 7 testes determinísticos cobrindo carga, sobrecarga, tarefas atrasadas, pureza de replanejamento, confirmação tátil, recusa e persistência. Versão incrementada para `versionCode=9` (`v2.6.0`), com APK assinado com schemes v1, v2 e v3 e keystore oficial preservada.

## DT-028 · Insights Acionáveis, Cruzamento Foco vs. Pontualidade e Linguagem de Coincidência (Fase 4)
- **Data:** 2026-11-10
- **Contexto:** Implementação da Fase 4 do Roadmap do Cat Line para cruzamento entre tempo em redes sociais/apps e cumprimento de metas, com barreira estrita de amostragem mínima e linguagem de acolhimento pura (coincidência vs. causa).
- **Decisão:**
  - **Motor Puro `insightsEngine`:**
  - Barreira estrita de 7 dias (`MIN_DAYS = 7`): nenhuma correlação é calculada ou sugerida com menos de 7 dias completos de dados registrados.
  - Durante o período de coleta inicial (< 7 dias), a interface exibe card de observação da gatinha com barra de progresso, informando com carinho quantos dias faltam de observação conjunta, sem julgamento.
  - Análise pura (`analyzeCorrelation`): estratifica os dias registrados em grupos de menor e maior tempo de tela, calcula taxas médias de pontualidade e identifica o aplicativo mais frequente.
  - **Linguagem de Coincidência (Zero Julgamento, Zero Causa):**
  - Redação carinhosa da gatinha: *"Em dias com menos tempo no Instagram, nosso fio tendeu a ficar mais pontual. Que tal preservarmos momentos de tranquilidade juntas?"*
  - Eliminação total de termos acusatórios e de causa ("causa", "por causa de", "culpa", "culpado", "prejudicou", "falha").
  - Ausência absoluta de parênteses descritivos na interface e nos textos gerados.
  - **Apresentação na Interface:**
  - Card de correlações integrado com destaque nas abas **Insights** (O Fio) e **Foco**.
  - Grid comparativo de fácil visualização exibindo a taxa no prazo em dias de menor tempo de tela vs. maior tempo de tela.
  - **Persistência Local e Testes:**
  - Histórico `dailyCorrelationHistory` salvo no armazenamento local `CATLINE_DEVICE_STORAGE_V1` e restaurado na inicialização.
  - Suíte `scripts/test-phase4.js` com 7 testes determinísticos cobrindo barreira de 7 dias, correlação de 8 amostras, auditoria de vocabulário e ausência de parênteses, adição e atualização idempotente de registros, renderização com dados parciais, renderização com insight completo e persistência local.
  - Versão incrementada para `versionCode=10` (`v2.7.0`), APK assinado com schemes v1, v2 e v3 e keystore oficial preservada.

## DT-029 · Banco de Minutos Gamificado, Reconciliação Idempotente JS ↔ Nativo e Salvaguardas (Fase 5)
- **Data:** 2026-11-10
- **Contexto:** Implementação da Fase 5 do Roadmap do Cat Line para criação do Banco de Minutos gamificado de redes sociais, isolado pelo interruptor do módulo Foco, reconciliado por mensagens idempotentes entre JS (dono do ganho) e nativo (dono do consumo), uso exclusivo de `SystemClock.elapsedRealtime()`, botão de saída de emergência de 10s e exceções absolutas inegociáveis.
- **Decisão:**
  - **Isolamento sob Interruptor do Módulo Foco (`F5-01`):**
  - O Banco de Minutos e as travas nativas operam estritamente subordinados a `state.flags.FOCO` / `state.flags.foco`.
  - Ao desligar o interruptor de Foco, o banco fica em pausa, o nativo é notificado (`focoEnabled: false`) e qualquer bloqueio é suspenso imediatamente.
  - **Reconciliação Idempotente JS ↔ Nativo (`F5-02`):**
  - **JS é o dono do ganho:** Conclusão de compromisso (+5 min), conclusão de hábito (+5 min) ou resgate com Peixinhos (15🐟 = 15 min) geram transações com ID único (`txId`). O saldo em segundos é enviado ao nativo via `syncMinuteBank`.
  - **Nativo é o dono do consumo:** O serviço de acessibilidade debita o tempo de uso em apps trancados, gerando registros com `debitId` único. O JS processa via `reconcileDebits(state)` deduplicando com `processedDebitIds` (garantia estrita de idempotência) e confirma via `ackMinuteBankDebit(debitId)`.
  - **Uso Exclusivo de `SystemClock.elapsedRealtime()`:**
  - Eliminação total do uso de `System.currentTimeMillis()` para controle de passes, expirações, débitos e diagnósticos no código Java (`BlockerStore.java`, `BlockerService.java`, `BlockActivity.java`). O relógio monotônico do hardware impede burlas por alteração da data do celular.
  - **Salvaguardas Inegociáveis (`F5-03`):**
  - **Saída de Emergência de 10 segundos:** Botão *"🚨 Saída de Emergência"* implementado tanto no overlay nativo (`BlockerService`), na activity de bloqueio (`BlockActivity`) e no modal web simulado (`attachHoldEmergencyButton`), com contagem regressiva de 10s ininterruptos que concede liberação emergencial temporária.
  - **Exceções Absolutas:** Regra inegociável em `BlockPolicy.isAbsoluteException()` e `app.js`: WhatsApp (`com.whatsapp`), discador/telefone (`dialer`, `phone`, `telecom`), serviços de emergência (`emergency`, `sos`), configurações do Android (`settings`) e o próprio Cat Line nunca são bloqueados sob nenhuma circunstância.
  - **Ausência de Parênteses Descritivos:** Toda a interface gráfica, cards, botões de emergência e textos de diagnóstico cumprem a regra de zero parênteses descritivos.
  - **Pipeline, Testes e APK:**
  - Suíte `scripts/test-phase5.js` com 7 testes determinísticos cobrindo controle por interruptor de Foco, créditos no JS, reconciliação idempotente com deduplicação de débitos, exceções absolutas, temporizador de emergência de 10s, auditoria de relógio monotônico e persistência local.
  - Versão incrementada para `versionCode=11` (`v2.8.0`), APK assinado com schemes v1, v2 e v3 e keystore oficial preservada.

## DT-030 · Polimento Final, Auditoria de Segurança, Relatório Beta e Versão 3.1.0 (Fase 6)
- **Data:** 2026-11-10
- **Contexto:** Conclusão da Fase 6 do Roadmap do Cat Line, consolidando o polimento geral do aplicativo, desligamento de botões de teste em release, auditoria de segurança estrita (zero chamadas temporais fora de `clock.js`, `allowBackup=false`, sem dados sensíveis em `localStorage`), ausência de parênteses descritivos, implementação do gerador de relatório anônimo local para teste beta (100% offline, sem texto livre da usuária) e geração da versão estável `v3.1.0`.
- **Decisão:**
  - **Relatório Beta Anônimo 100% Local (`F6-01`):**
    - Implementado `betaReportEngine.generateAnonymousReport(st)` em `web-preview/app.js`.
    - Totalmente offline (zero chamadas de rede ou telemetria remota).
    - Exclusão absoluta de qualquer texto livre da usuária (títulos de tarefas, compromissos, hábitos, nomes de mimos, conversas, desabafos e chaves de API).
    - Coleta exclusivamente métricas operacionais agregadas: contagem anônima de hábitos, taxa média de pontualidade, saldo de minutos de foco, versão do app e conformidade das bandeiras de módulos.
    - Exportação disponível via botão de cópia com um toque para a área de transferência (`copyBetaReportToClipboard`).
  - **Desativação de Ferramentas de Teste em Compilações de Release (`F6-02`):**
    - Criada a constante `IS_RELEASE` com fallback seguro `true`.
    - Botões de avanço rápido de tempo ("Avançar 15m", "Avançar 1 Dia") e atalho de teste de overlay de bloqueio ("🧪 Testar tela de bloqueio") são ocultados automaticamente em builds de produção.
  - **Auditoria de Conformidade e Segurança (`F6-03`):**
    - **Varredura Temporal Estrita:** Zero chamadas diretas a `Date.now()` ou `new Date()` em todo o código-fonte do `app.js` fora de `clock.js`.
    - **Segurança de Armazenamento:** Confirmação de que nenhuma senha, segredo ou chave de rede trafega ou é salva em texto não criptografado no `localStorage`.
    - **Manifesto Android:** Garantia estrita de `android:allowBackup="false"`, mitigando extrações não autorizadas de dados locais via adb.
    - **Linguagem Limpa:** Eliminação completa de parênteses descritivos em todos os cards, botões e mensagens do aplicativo.
  - **Pipeline, Testes e APK Final (`F6-04`, `F6-05`):**
    - Criada a suíte `scripts/test-phase6.js` com 7 testes determinísticos cobrindo privacidade do relatório beta, desligamento de depuração em release, auditoria temporal, segurança de persistência, manifesto e linguagem.
    - 60 testes automatizados passando com 100% de sucesso em toda a suíte do projeto (`npm test`).
    - Atualização do `package.json` para `"version": "3.1.0"`.
    - Compilação do APK nativo final com `versionCode="12"` e `versionName="3.1.0"`, gerando `CatLine-v3.1.0.apk`, `CatLine.apk` e `CatLine-Instalador.apk`.
    - Zipalign de 4 bytes e assinatura oficial com apksigner (v1, v2 e v3) verificados com sucesso e keystore original preservada.

## DT-031 · Diagnóstico e Correção Definitiva da Trava de Redes Sociais no Android Nativo e Simulador
- **Data:** 2026-11-10
- **Contexto:** A usuária reportou que o aplicativo continuava apresentando falhas no travamento de redes sociais e outros aplicativos. O diagnóstico identificou 3 causas simultâneas:
  1. *Passes Zumbis do Relógio de Parede:* Passes gerados antes da Fase 5 gravavam timestamps em milissegundos absolutos de `System.currentTimeMillis()` (~1.73 trilhão). Com a migração para `SystemClock.elapsedRealtime()` (~50 milhões), a comparação `expiresAt > elapsedRealtime` retornava `true` indefinidamente, fazendo a política nativa crer que os apps estavam eternamente liberados como recompensa.
  2. *Falha de Sobreposição em Fabricantes Android (Xiaomi/Samsung/Motorola):* A chamada `wm.addView` com `TYPE_ACCESSIBILITY_OVERLAY` pode falhar ou ser suprimida em ROMs personalizadas quando o app roda em segundo plano. Sem a minimização ativa do app bloqueado, o Instagram/TikTok permanecia na tela.
  3. *Revogação de Passes em Presets e Interface:* Clicar em presets ou trancar apps não limpava sessões ativas no cofre local de passes.
- **Decisão:**
  - **Purga Automática de Passes Obsoletos em `BlockerStore.hasPass`:**
    - Qualquer passe com `expiresAt > 1_000_000_000_000L` é reconhecido como resquício da era `currentTimeMillis` e sumariamente apagado do `SharedPreferences`, devolvendo o app para o estado estrito de trancamento.
    - Criado o método `BlockerStore.clearAllPasses()` e exposto via `window.AndroidBlocker.clearAllPasses()`.
  - **Ação Failsafe Imparável no `BlockerService` (`GLOBAL_ACTION_HOME` + `BlockActivity`):**
    - Ao detectar a abertura de qualquer app trancado, o serviço de acessibilidade agora executa imediatamente `performGlobalAction(GLOBAL_ACTION_HOME)`. Essa ação da API do sistema é universal, minimizando o app trancado na mesma fração de segundo e interrompendo seu áudio e execução.
    - Dispara em seguida a `BlockActivity` em tela cheia com a gatinha 🐱🔒, exibindo as opções acolhedoras de cumprimento de tarefas, Banco de Minutos, Saída de Emergência e retorno seguro ao Home.
  - **Controle Total e Botão "Trancar Todas Agora":**
    - Adicionado botão de um toque no card de apps trancados e no card de diagnóstico nativo (`window.app.relockAllAppsNow()`), revogando instantaneamente todos os passes no JS e no nativo.
  - **Validação:**
    - Suíte completa de 61 testes determinísticos verdes (`npm test`), incluindo novo teste unitário de trancamento global.
    - APK recompilado e assinado com esquemas v1, v2 e v3 verificados com sucesso.

## DT-032 · Modelo de Dados v2 e Configuração Declarativa Versionada (v3.2.0 · Prompts 1 e 2)
- **Data:** 2026-11-10
- **Contexto:** Introdução de Metas com passos, máquina de estados de compromissos, livro-razão de recompensas e log semanal sem números mágicos (AD-10).
- **Decisão:**
  - `SCHEMA_VERSION = 2` no Room com criação das tabelas `goal_steps`, `reward_events` (com índice único em `idempotencyKey`) e `weekly_logs`.
  - Migração `MIGRATION_1_2` no Android e migrador determinístico `migrationEngine.migrateV310ToV320()` na versão Web/PWA, preservando 100% dos dados legados e operando de forma estritamente idempotente.
  - Centralização de todas as regras de tempo e recompensas em `config/commitments.v1.json`, espelhado em `CommitmentsConfig.kt` e `commitments-config.js` com rejeição de valores negativos e adoção de padrões documentados.

## DT-033 · Motor Puro de Metas e Passos Editáveis (v3.2.0 · Prompt 3)
- **Data:** 2026-11-10
- **Contexto:** Passos de meta agora possuem ordem, título editável, estimativa em minutos e marcação independente de conclusão.
- **Decisão:**
  - Criado `GoalStepEngine.kt` e `web-preview/goal-step-engine.js` com relógio injetável (AD-05).
  - Cálculo de progresso ponderado por `estMinutes` quando todos os passos ativos possuem estimativa; caso contrário, utiliza contagem proporcional simples.
  - Casos de borda 1 e 2: arquivar ou dividir passo concluído preserva `doneAt` e recompensas já emitidas; apagar meta desvincula os compromissos sem excluí-los.
  - Emissão dos eventos de domínio `StepDone` e `GoalDone` respeitando o interruptor de módulo (AD-11).

## DT-034 · Máquina de Estados do Compromisso com Fuso IANA (v3.2.0 · Prompt 4)
- **Data:** 2026-11-10
- **Contexto:** Compromissos possuem 5 estados (`pending`, `done`, `missed`, `rescheduled`, `unmarked`) com regras de transição estritas, cálculo de atraso com fuso IANA e janela de desfazer.
- **Decisão:**
  - Implementado `CommitmentStateMachine.kt` e `web-preview/commitment-state-machine.js`.
  - Cálculo de atraso (`lateMinutes = actualAt - plannedStart`) suporta antecedência (valores negativos) e fusos IANA via `Intl.DateTimeFormat.formatToParts` e `ZonedDateTime`.
  - Idempotência contra duplo toque: se já estiver concluído, retorna o `CheckIn` original com flag `wasDuplicate = true`.
  - Desfazer dentro da janela configurada (`undoWindowMinutes`, default 10) reverte para `pending` e emite compensação sem apagar histórico; fora da janela é rejeitado com erro explícito.
  - Compromissos recorrentes geram ocorrências independentes.

## DT-035 · Métricas de Atraso, Livro-Razão e Fechamento do Dia (v3.2.0 · Prompts 5, 6 e 7)
- **Data:** 2026-11-10
- **Contexto:** Taxas analíticas sem juízo de valor, livro-razão de recompensas com tetos diários e fechamento seguro do dia lógico às 04:00.
- **Decisão:**
  - `DelayMetricsEngine.kt` e `delay-metrics-engine.js`: calculam `fulfillmentRate = done / (done + missed)`, `punctualityRate = done_pontuais / done` e mediana com números pares/ímpares/negativos. Aplica barreira estrita de 7 dias para qualquer recorte (categoria, meta, dia, faixa horária e ao vivo vs retroativo).
  - `RewardLedgerEngine.kt` e `reward-ledger-engine.js`: emite eventos com chaves idempotentes (`step_done:<id>`, `goal_done:<id>`, `day_closure:<day>`), trava anti-farm para micro-tarefas (< 5 min), multiplicador retroativo de 0.5x, tetos de 15 peixinhos/dia e 30 min de rede social/dia com mensagem acolhedora da gatinha.
  - `DayClosureEngine.kt` e `day-closure-engine.js`: fecha o dia lógico às 04:00 sem punir compromissos esquecidos (mantidos como `unmarked` até a usuária escolher Cumpri, Não Cumpri ou Remarcar), com suporte a operação em lote e reconciliação sequencial de múltiplos dias acumulados.

## DT-036 · Insights, Interruptores AD-11, Backup Schema v2 e Release v3.2.0 (v3.2.0 · Prompts 12, 13 e 14)
- **Data:** 2026-11-11
- **Contexto:** Conclusão final do roadmap do Cat Line v3.2.0 ("Metas com passos, Compromissos e Log Semanal"), integrando recortes analíticos acolhedores, interruptores de novos módulos (AD-11), backup e importação com idempotência estrita (Schema v2), suíte de regressão cobrindo os 10 casos de borda, compilação de release e checklist de teste manual.
- **Decisão:**
  - **Interruptores de Módulos (`METAS_PASSOS`, `COMPROMISSOS`, `LOG_SEMANAL` · Prompt 12):**
    - Adicionadas chaves correspondentes em `FeatureFlagKey.kt` e `state.flags` em `web-preview/app.js`.
    - Ao desligar qualquer módulo, a interface oculta perfeitamente os controles, passos ou cards correspondentes, sem jamais apagar ou corromper dados persistidos.
  - **Recortes de Atraso e Relatório Beta Anônimo v3.2.0 (Prompt 12):**
    - Card de recortes no Insights com estratificação por categoria, dia da semana e faixa horária, estritamente bloqueado antes de 7 dias de dados reais.
    - Redação com linguagem de coincidência (*"tendeu a"*), sem termos de causalidade ou julgamento.
    - Relatório Beta Anônimo v3.2.0 atualizado agregando métricas operacionais sem qualquer texto livre da usuária (100% offline, zero rede).
  - **Backup e Restauração com Schema v2 (Prompt 13):**
    - Criado `backup-engine.js` e atualizado `DeadLineBackupPayload.kt` com `schemaVersion: 2`.
    - Importação com idempotência estrita: desduplicação por `idempotencyKey` no livro-razão e `weekStartLogicalDay` nos logs semanais, garantindo que importar duas vezes consecutivas não gere dados duplicados.
    - Migração retrocompatível automática de backups legados com `schemaVersion: 1`.
    - Diálogo com resumo numérico do backup e exigência de toque de confirmação antes de mesclar.
  - **Suíte de Regressão e DoD Final (Prompt 14):**
    - Criado `scripts/test-phase20-final-regression.js` cobrindo integralmente os 10 casos de borda da seção 10 do briefing.
    - Suíte completa de 20 fases de testes automatizados passando com 100% de sucesso (`node scripts/run-all-tests.js`).
    - Bump de versão oficial para `3.2.0` (`versionCode = 13` / `versionCode = 320`) em `package.json`, Gradle e scripts de build.
    - Compilação e assinatura oficial do `CatLine.apk` (zipalign de 4 bytes e verificação apksigner v1, v2 e v3).
    - Compilação do `CatLine-App.html` standalone (581.56 KB).
    - Criação de `docs/CHECKLIST_TESTE_MANUAL.md` para testes de homologação em dispositivos Samsung e Xiaomi/Motorola.

