# Cat Line (Dead Line) — Documentação Completa do Projeto
*Do Conceito à Arquitetura, Estética 8-Bit, Motores de Domínio, Funcionalidades e Resolução de Problemas*

---

## Sumário Executivo

**Cat Line** (originalmente concebido sob o nome de trabalho *Dead Line*) é um aplicativo nativo e PWA/APK gamificado de agenda, hábitos, metas, foco e pontualidade, construído no estilo **pixel art 8-bit retro** e protagonizado por uma gatinha calico e um novelo de lã.

O projeto foi desenhado sob o princípio inegociável de **soberania da usuária e privacidade absoluta**: funciona 100% offline no próprio aparelho (*offline-first*), sem exigir contas em nuvem ou bancos de dados externos, permitindo que a usuária ligue, desligue e ajuste o rigor de cada funcionalidade (*tudo é modulável*).

Este documento consolida toda a evolução do projeto: desde a visão poética inicial e decisões arquiteturais estruturais (AD-01 a AD-16), passando pelo kit visual/sensorial e catálogo de funcionalidades, até os problemas técnicos profundos diagnosticados e solucionados durante o desenvolvimento e geração do APK instalável para Android.

---

## 1. Conceituação e Filosofia do Produto

### 1.1. A Metáfora: O Novelo de Lã e a Linha do Prazo
O nome *Dead Line* e a metáfora do novelo de lã nasceram de uma conexão direta:
- **A Linha do Prazo é o próprio Fio:** O novelo de lã começa rechonchudo e vai se desenrolando à medida que o prazo de uma meta ou compromisso se aproxima.
- **O Progresso como Fio Enrolado:** Quando a usuária avança em suas metas e tarefas, a gatinha enrola o fio de volta no novelo.
- **O Fio da Pontualidade:** O gráfico de evolução semanal do atraso não é uma linha analítica fria, mas sim um fio de lã puxado pela gatinha através dos dias.

### 1.2. O Núcleo do Produto: O Loop do Atraso
Diferente de agendas tradicionais que apenas cobram tarefas, o Cat Line foi criado em torno de um ciclo reflexivo acolhedor:
1. **Planejar:** Registrar os compromissos, hábitos e metas com horários ou prazos no dia.
2. **Fazer e Registrar:** Marcar o momento real em que a tarefa foi cumprida (com carimbo de data/hora no toque ou check-in retroativo identificado).
3. **Medir a Realidade:** Comparar o horário planejado com o horário real (atraso em minutos).
4. **Visualizar sem Culpa:** Analisar a mediana semanal de atraso através do "Fio".
5. **Superar:** Definir e alcançar metas de superação (ex.: reduzir a mediana semanal para menos de 15 minutos).

### 1.3. A Personagem: A Gatinha Calico
Inspirada na referência real de uma gatinha calico (branca, laranja e cinza escuro), a gatinha atua como:
- **Espelho da Rotina:** Ela estuda quando você estuda, treina quando você treina, trabalha ao seu lado e dorme quando você descansa.
- **Acolhedora sem Punição Agressiva:** A gatinha pode ficar manhosa, sonolenta ou pedir carinho, mas **nunca morre, nunca adoece permanentemente e nunca agride a usuária**.
- **Tratamento Carinhoso:** A gatinha chama a usuária de *"mamãe"*, criando um laço afetivo de cuidado mútuo.
- **Interação Tátil:** Carinho no corpo da gatinha ativa vibração háptica com som de ronrom e aumenta o nível de Vínculo.

### 1.4. Princípios Fundamentais Inegociáveis
1. **Tudo é Modulável (`AD-11`):** A usuária controla o app; o app não controla a usuária. Cada módulo (Agenda, Hábitos, Metas, Insights, Loja, Chat, Bloqueio de Redes) possui uma chave individual que pode ser desativada a qualquer momento.
2. **Domínio Puro e Testável (`AD-03`, `AD-05`):** As regras de cálculo de atraso, economia e humor não dependem do sistema operacional e são verificadas com relógio injetável (`Clock` / `FakeClock`).
3. **Privacidade e Memória Local (`AD-15`, `AD-16`):** Nenhum dado pessoal, desabafo ou chave de API sai do celular. O banco é 100% local (`Room` no Android nativo e `localStorage` no web/PWA).
4. **Sem Números Mágicos (`AD-10`):** Economia, falas, pesos de humor e categorias de rotina moram em arquivos JSON versionados.

---

## 2. Estética, Design Visual & Universo Sensorial

### 2.1. Pixel Art 8-Bit Autêntica
- **Grade Virtual Rígida:** Renderização baseada em uma grade virtual de **180 pixels de largura**, aplicando escala inteira com amostragem por vizinho mais próximo (`FilterQuality.None`). Isso impede qualquer desfoque (*blur*) em telas de alta densidade (Full HD, 2K e 4K).
- **Paleta de Cores Estrita:** Conjunto de 16 cores estilo retro (Game Boy Color / Super Nintendo), com tons terrosos, creme, rosa antigo e preto puro para alto contraste.
- **Ícone Oficial do App:** A gatinha calico abraçada com o novelo em traço claro, com **fundo preto puro (`#000000`)** para contraste em qualquer launcher moderno.

### 2.2. O Quarto da Gatinha e as 6 Estações da Rotina
O cenário superior de visualização espelha o quarto pixel art com 6 postos ativos:
1. **Estante de Estudos / Leitura:** Gatinha com óculos 8-bit, livro com páginas folheando e luminária acesa.
2. **Tapete de Treino / Calistenia:** Gatinha com faixinha esportiva vermelha pulando ritmicamente, gotinhas de energia e novelo quicando.
3. **Escrivaninha de Trabalho / Dev:** Notebook 8-bit brilhando em azul, teclando alternadamente e caneca com fumacinha.
4. **Centro da Sala (Organização / Faxina):** Gatinha varrendo o chão com vassourinha e estrelinhas ✨ de limpeza.
5. **Tigelinha de Água / Alimentação:** Tigela d'água com corações subindo e animação de lamber o focinho.
6. **Caminha Rosa de Descanso / Sono:** Gatinha enroscada na almofada com olhinhos fechados e balõezinhos de *"Zzz"*.
7. **Modo Livre (Lazer / Brincadeira):** Caminhada descontraída brincando com o novelinho da meta ativa.

### 2.3. O Componente do Novelo (4 Modos de Exibição)
O novelo de lã assume 4 formas interativas:
- **Modo Barra:** Barra de progresso onde o novelo se move da esquerda para a direita, deixando o fio puxado para trás.
- **Modo Cronômetro:** Mostra o tempo regressivo da meta em dias/horas, com o novelo diminuindo de tamanho e enrolando o fio.
- **Modo Gráfico ("O Fio"):** Conecta os pontos de atraso dos últimos 7 a 30 dias com nós de lã sobre a linha de tolerância.
- **Modo Edição:** Ícone interativo presente ao lado de campos de cadastro, que rola e reage ao foco da digitação.

### 2.4. Áudio Chiptune 8-Bit Síntese em Tempo Real
Em vez de amostras de áudio pesadas gravadas, o sistema possui um sintetizador interno de ondas quadradas (`ChiptuneAudioEngine` / Web Audio API):
- **Miados Sintetizados:** Miado alegre de boas-vindas, miado de carinho e miado festivo de conclusão de meta.
- **Motor de Ronrom Contínuo:** Onda rítmica relaxante modulada em baixa frequência (3.2 segundos por ciclo).
- **Blip de Digitação:** Sons discretos estilo máquina de escrever a cada caractere exibido nos balões de diálogo.

### 2.5. Cosméticos Equipáveis Visíveis no Sprite
Os itens adquiridos na lojinha são desenhados diretamente sobre a gatinha em camadas:
- **Laço Rosa Pixel (🎀):** Laço delicado na orelha direita.
- **Coroa Dourada Real (👑):** Coroa de princesa com gema de rubi brilhante.
- **Chapéu de Mago 8-Bit (🧙‍♂️):** Chapéu pontudo roxo com estrelinha mágica.
- **Coleira com Sino de Ouro (🔔):** Faixa vermelha no pescoço com guizo balançando.
- **Óculos Escuros Pixel (🕶️):** Lentes escuras retro com reflexo branco.

---

## 3. Arquitetura de Software e Grafo de Dependências

O projeto adota uma arquitetura em camadas orientada a domínio (*Ports & Adapters* / Hexagonal), dividida em **16 módulos Gradle** agrupados em 5 níveis hierárquicos:

```
┌────────────────────────────────────────────────────────┐
│                        :app                            │  (Montagem, Hilt, Navegação, Lifecycle)
└───────────┬────────────────────────────────┬───────────┘
            │                                │
┌───────────▼───────────┐        ┌───────────▼───────────┐
│     :feature-*        │        │   :platform-bloqueio  │  (Serviço de Acessibilidade & Overlay)
│ (hoje, agenda, etc.)  │        │   :platform-uso       │  (Uso de Apps 180 dias)
└───────────┬───────────┘        │   :platform-lembretes │  (Alarmes Exatos & Widget Glance)
            │                    │   :core-data          │  (Room, Migrações, Repositórios)
            │                    │   :ai-llm             │  (BYOK: Gemini, Claude, OpenAI)
            │                    └───────────┬───────────┘
┌───────────▼───────────┐                    │
│ :core-ui / :core-game │                    │
└───────────┬───────────┘                    │
            │                                │
┌───────────▼────────────────────────────────▼───────────┐
│                     :core-domain                       │  (Kotlin JVM Puro, Zero Android, Motores)
└────────────────────────────────────────────────────────┘
```

### 3.1. As 5 Camadas de Isolamento
1. **Domínio (`:core-domain`):**
   - Módulo Kotlin JVM puro (`org.jetbrains.kotlin.jvm`).
   - É **proibido** importar qualquer biblioteca `android.*` ou `androidx.*`.
   - Contém entidades imutáveis, eventos de domínio (`DomainEvent`), barramento (`EventBus`) e os 8 motores matemáticos do jogo.
2. **Infraestrutura (`:core-data`, `:ai-llm`, `:platform-*`):**
   - Implementam as interfaces (portas) definidas no domínio.
   - `:core-data`: Banco de dados Room (`DeadLineDatabase`), DAOs, transações atômicas e migrações.
   - `:ai-llm`: Provedores de IA sob a filosofia BYOK (*Bring Your Own Key*) com armazenamento seguro no Android Keystore.
   - `:platform-bloqueio`: Serviço de acessibilidade e barreira nativa de bloqueio de redes sociais.
   - `:platform-uso`: Leitura de `UsageStatsManager` com particionamento em baldes horários.
   - `:platform-lembretes`: Alarmes exatos (`AlarmManager`), receptores de boot e widget de tela inicial (Glance).
3. **Base Visual e Jogo (`:core-ui`, `:core-game`):**
   - `:core-ui`: Componentes Compose com tema pixel art, botões táteis, balões e tipografia.
   - `:core-game`: Motor de renderização em Canvas (`SceneRenderer`), animação por partes da gatinha e síntese de áudio.
4. **Funcionalidades (`:feature-*`):**
   - 8 módulos independentes: `feature-hoje`, `feature-agenda`, `feature-habitos`, `feature-metas`, `feature-insights`, `feature-loja`, `feature-conversa`, `feature-foco`.
   - **Regra de ouro:** Nenhuma feature pode depender de outra feature nem de módulos de infraestrutura.
5. **Montagem (`:app`):**
   - Une todos os módulos através do Dagger Hilt, gerencia navegação global e expõe os interruptores de cada `FeatureModule`.

### 3.2. Decisões Arquiteturais Chave (AD-01 a AD-16)

| Código | Decisão | Justificativa |
|---|---|---|
| **AD-01** | Kotlin nativo + Compose, minSdk 26, targetSdk estável | Necessário para acessar serviços de acessibilidade, alarmes exatos e overlays do sistema. |
| **AD-02** | Multi-módulo com convention plugins em `build-logic` | Isolamento estrito de escopo e compilação paralela limpa. |
| **AD-03** | `:core-domain` 100% puro JVM | Permite executar centenas de testes unitários em milissegundos sem emulador. |
| **AD-04** | Portas e Adaptadores (Hexagonal) | Facilita a substituição de provedores de IA, persistência ou renderização sem tocar nas regras de negócio. |
| **AD-05** | Relógio injetável (`Clock`) | Proíbe chamadas diretas a `System.currentTimeMillis()`, permitindo simulações de viagem no tempo com `FakeClock`. |
| **AD-06** | Room como fonte única de verdade + UDF | Padrão Unidirectional Data Flow (`State`, `Event`, `Effect`) garantindo previsibilidade. |
| **AD-07** | Barramento de Eventos desacoplado | O check-in emite `CheckInRegistrado`, reagido autonomamente por economia, humor e diretor de rotina. |
| **AD-08** | Transação atômica Room | Check-in, mudança de estado da ocorrência e lançamentos no livro-caixa ocorrem no mesmo commit. |
| **AD-09** | Idempotência estrita | Chave única `(regra, ocorrência, moeda)` no livro-caixa e virada diária chaveada por `dayKey`. |
| **AD-10** | Zero números mágicos | Economia, falas da gatinha, categorias e pesos residem em arquivos JSON versionados. |
| **AD-11** | Tudo é modulável | Cada módulo implementa `FeatureModule` associado a uma flag no DataStore, podendo ser desativado pela usuária. |
| **AD-12** | Renderização desacoplada (`SceneRenderer`) | Isola o laço de animação em Canvas, permitindo futuras melhorias gráficas. |
| **AD-13** | IA com BYOK sem servidor proxy | A usuária utiliza sua própria chave de API (Gemini/Claude/OpenAI); nenhum dado passa por servidores intermediários. |
| **AD-14** | Arte desacoplada em Atlas | Formato compatível com Aseprite com pontos de ancoragem para acessórios e corpo. |
| **AD-15** | Sem telemetria ou rastreadores | Zero envio de métricas para analytics externos; logs de erro ficam apenas no aparelho. |
| **AD-16** | Criptografia Keystore/Tink | Conversas criptografadas em disco e exclusão de backup automático no Android (`allowBackup="false"`). |

---

## 4. Motores de Regra e Modelos Matemáticos

Todos os cálculos de pontualidade, humor e moedas são executados por motores determinísticos puros dentro de `:core-domain`:

### 4.1. `DelayEngine` (Motor de Atraso e Pontualidade)
- **Cálculo:** $\text{Atraso} = \text{Instante do Check-In} - \text{Prazo Limite}$.
- **Faixas de Classificação:**
  - $\text{Atraso} < 0 \text{ min}$: **Adiantado** (bônus de $1{,}2\times$).
  - $0 \le \text{Atraso} \le 5 \text{ min}$: **No Prazo** (tolerância padrão; multiplicador $1{,}0\times$).
  - $6 \le \text{Atraso} \le 30 \text{ min}$: **Atrasado Leve** (multiplicador $0{,}6\times$).
  - $\text{Atraso} > 30 \text{ min}$: **Atrasado Forte** (multiplicador $0{,}3\times$).
  - Sem check-in até a virada: **Perdido** (zero pontos).
- **Indicador Principal:** A **Mediana** dos últimos 7 dias é adotada no lugar da média para evitar distorções causadas por um único compromisso esquecido.
- **Superação:** Ocorre quando a mediana de atraso da semana atual é menor que a mediana da semana anterior.

### 4.2. O Dia Lógico (`dayKey`) e `DayBoundary`
Para respeitar o ritmo de pessoas noturnas ou que dormem tarde, o Cat Line **não vira o dia à meia-noite**:
- **Virada às 04:00 da Manhã:** Compromissos e hábitos cumpridos entre 00:00 e 03:59 pertencem à data do dia anterior.
- Todas as consultas, fechamentos e cálculos de histórico usam `dayKey: LocalDate` gerado pelo `DayBoundary`.

### 4.3. `EconomyEngine` (Motor de Economia e Recompensas)
O sistema econômico utiliza duas moedas e um indicador cumulativo:
1. **Peixinhos (`🐟`):** Moeda comum do dia a dia, gasta em itens da loja, acessórios, passes de redes sociais e mimos da vida real.
2. **Novelos Dourados (`🧶`):** Moeda rara obtida exclusivamente ao concluir grandes metas ou alcançar semanas perfeitas.
3. **Vínculo com a Gatinha (`♥`):** Pontuação cumulativa que nunca decresce, desbloqueando falas e reações especiais.

**Ganhos Balanceados:**
- **Tarefas:** Pequena ($5🐟$), Média ($10🐟$), Grande ($20🐟$) — teto de 10 tarefas pequenas por dia para evitar exploração de micro-tarefas.
- **Hábitos:** $8🐟 \times \min(1{,}5; 1 + 0{,}02 \times \text{diasDeSequencia})$.
- **Fechamento Diário:** Bronze ($50\% \text{ concluído} = 10🐟$), Prata ($75\% = 20🐟$), Ouro ($100\% = 35🐟$).
- **Uso de Tela Controlado:** $10🐟$ por dia dentro da meta de foco.
- **Rendimento Decrescente:** A partir do 12º item registrado no mesmo dia, os ganhos de Peixinhos são reduzidos em $50\%$ para desincentivar sobrecarga tóxica (*burnout*).
- **Livro-Caixa Imutável (`LedgerEntry`):** Nenhum saldo é alterado por atualização direta. Toda movimentação é registrada como lançamento único imutável com compensação reversa em caso de edição.

### 4.4. `MoodEngine` (Motor de Humor da Gatinha)
O humor da gatinha varia em 5 estados:
$$\text{RADIANTE} \longleftrightarrow \text{FELIZ} \longleftrightarrow \text{TRANQUILA} \longleftrightarrow \text{SONOLENTA} \longleftrightarrow \text{MANHOSA}$$

- **Composição dos Índices:**
  - *Índice de Pontualidade (45%):* Mediana dos últimos 7 dias com decaimento exponencial.
  - *Índice de Constância (35%):* Proporção de hábitos cumpridos sobre o previsto.
  - *Índice de Foco (20%):* Tempo de tela mantido dentro dos limites de rigor.
- **Regra de Transição Suave:** O humor varia no máximo **1 degrau por dia**.
- **Piso Seguro:** O estado mais baixo é `MANHOSA` (a gatinha apenas pede carinho e denguinho, nunca rejeita a usuária).
- **Modo Descanso:** Quando ativado, congela o humor e protege as sequências de hábitos sem nenhuma penalidade.

---

## 5. Catálogo Completo de Funcionalidades

### 5.1. Aba Hoje (`:feature-hoje`)
- **Cenário Vivo da Gatinha:** Canvas animado com o quarto pixel art, espelhando a atividade atual.
- **Banner "Fazendo Agora com a Gatinha":** Exibe a tarefa em andamento com botão de alternância e animação síncrona.
- **Carinho Interativo:** Toque tátil na gatinha gerando vibração háptica, som de ronrom e falas carinhosas.
- **Checklist do Dia:** Compromissos e hábitos com botão verde `Cumprir ✓` ou `Feito ✓` e botão `Retro`.
- **Cofre "🔒 Redes & Apps Trancados (Recompensa)":** Acesso imediato para trancar aplicativos e resgatar passes temporários.
- **Resumo de Mimos da Vida Real:** Card motivacional com o saldo de peixinhos e atalho para auto-recompensas.

### 5.2. Aba Agenda (`:feature-agenda`)
- **Compromissos Recorrentes e Pontuais:**
  - Frequências: *Todos os dias*, *Dias úteis*, *Finais de semana*, *3x por semana*, *Semanal*, *Apenas hoje* ou *Data específica*.
  - Esforço categorizado: P ($5🐟$), M ($10🐟$), G ($20🐟$).
  - Horário de início e término com cálculo automático de tolerância.
- **Ações Rápidas:**
  - `Feito ✓` (check-in no prazo ou com cálculo automático de atraso).
  - `Retro` (check-in retroativo com 50% dos peixinhos).
  - `Reabrir` (desmarca tarefas concluídas por engano).
  - `🗑️ Excluir` (remove compromissos com confirmação).

### 5.3. Aba Hábitos (`:feature-habitos`)
- **Configuração de Frequência:** Dias específicos ou contagem semanal com janela preferencial (Manhã, Tarde, Noite).
- **Sequências Vivas (Streaks):** Multiplicador de peixinhos acumulativo.
- **Novelo Reserva:** Proteção automática que perdoa um dia esquecido sem quebrar a sequência.
- **Integração com o Quarto:** Cumprir hábitos de água, treino ou leitura direciona a gatinha imediatamente para o posto correspondente.

### 5.4. Aba Metas & Cronômetro de Dias (`:feature-metas`)
- **Metas Hierárquicas:** *Vida*, *Trimestre*, *Mês*, *Semana* e *Tarefa*.
- **Cronômetro Regressivo em Dias:** Contagem dinâmica (`Xd Xh Xm Xs`) atualizada em tempo real.
- **Novelo Enrolando:** O novelinho na mão da gatinha diminui de tamanho visualmente à medida que o prazo avança.
- **Vinculação de Recompensa Real:** Cada meta pode ter um mimo da vida real atrelado ao seu sucesso.

### 5.5. Aba Insights & Analytics Profundo (`:feature-insights`)
- **Gráfico "O Fio":** Linha de lã pixelada ligando os dias, com nós coloridos indicando pontualidade em relação à tolerância de 5 min.
- **Filtro de Período:** Análise de 7, 14 ou 30 dias.
- **Gráfico de Barras por Dia da Semana:** Identifica quais dias da semana possuem maior pontualidade.
- **Heatmap de Horários Críticos:** Mapa de calor distribuído em 4 turnos (Manhã 06-12h, Tarde 12-18h, Noite 18-24h, Madrugada 00-06h).
- **Meta de Superação:** Painel dedicado para acompanhar a meta de redução da mediana de atraso.
- **Memória & Privacidade:** Botões para exportar backup JSON criptografado localmente, importar backup ou limpar dados.

### 5.6. Aba Lojinha & Mimos da Vida Real (`:feature-loja`)
- **Guarda-Roupa de Cosméticos:** Equipamento de laços, coroas, chapéus, coleiras e óculos com renderização simultânea no Canvas.
- **Comidinhas e Brinquedos:** Sachês de peixe, novelos coloridos e leite que geram animações comemorativas e aumentam o Vínculo.
- **Sistema de Mimos da Vida Real (Auto-Recompensas Gamificadas):**
  - Cadastro de recompensas reais (ex.: *Café especial*, *Assistir 2 episódios*, *Banho relaxante*, *Delivery favorito*).
  - Edição de nome, custo em peixinhos e seleção entre 16 emojis temáticos.
  - Botão **🎁 Me Presentear:** Debita os peixinhos conquistados, dispara fanfarra chiptune, vibração háptica e fala comemorativa da gatinha (*"Aproveite sem peso na consciência!"*).

### 5.7. Aba Chat, Briefing & Persona (`:feature-conversa`)
- **Conversa com a Gatinha (BYOK):** Suporte nativo a chaves de API próprias do Google Gemini, Anthropic Claude ou provedores compatíveis com OpenAI.
- **Persona Dinâmica em 4 Blocos:**
  1. Identidade e tom carinhoso da gatinha.
  2. Resumo da rotina do dia (com autorização explícita).
  3. Modulador de humor (a gatinha adapta suas respostas ao seu estado atual).
  4. Camada de segurança e acolhimento emocional.
- **Camada de Segurança Ética:** Monitoramento local de palavras de sofrimento extremo com exibição imediata de acolhimento e telefones do **CVV (188)** e **SAMU (192)**.
- **Modo Desabafo:** Canal protegido onde nenhum dado de rotina é compartilhado e o histórico não é salvo no banco.
- **Briefing Mensal Guiado em 5 Etapas:**
  - Wizard interativo para definir ritmo de sono, hábitos prioritários, grande meta do mês e regras de foco. Pode ser revisado a qualquer momento.

### 5.8. Aba Foco & Bloqueio de Redes Sociais (`:feature-foco` & `:platform-bloqueio`)
- **Pomodoro do Novelo ("Puxar o Fio"):**
  - Temporizador visual de 15, 25 ou 45 minutos.
  - O novelo desenrola o fio no centro da tela com áudio ambiente opcional de ronrom rítmico.
  - Recompensa ao terminar: $+15 Peixinhos$, $+15 Vínculo$ e conclusão automática da tarefa.
- **Bloqueio de Redes Sociais com 5 Níveis de Rigor:**
  - *Nível 0 (Observar):* Monitora o tempo sem interromper.
  - *Nível 1 (Aviso):* Balão de fala amigável da gatinha lembrando do foco.
  - *Nível 2 (Fricção):* Contagem reflexiva de 15 segundos antes de permitir a abertura.
  - *Nível 3 (Condicional / Recompensa):* Tranca o app até que as tarefas do dia sejam cumpridas ou um passe de peixinhos seja resgatado.
  - *Nível 4 (Firme):* Bloqueio total no intervalo de horário definido.
- **Catálogo de 12 Presets + Qualquer App Personalizado:**
  - Suporte com 1 clique para Instagram, TikTok, YouTube, Twitter/X, Facebook, Reddit, Pinterest, Threads, Netflix, Discord, Twitch e Kwai.
  - Cadastro de qualquer aplicativo digitando o nome (ex.: *Roblox*, *Shopee*, *Spotify*).
- **Desbloqueio por Recompensa:**
  - Passe de 15 minutos ($15🐟$).
  - Passe de 30 minutos ($25🐟$).
  - Passe Grátis (30 min) ao cumprir todas as tarefas pendentes do dia.
- **Saída Garantida de Emergência:** Segurar o botão da gatinha por 10 segundos na barreira concede um passe de emergência imediato de 30 minutos.
- **Exceções Inegociáveis:** WhatsApp, discador do telefone, ligações de emergência, configurações do Android e o próprio Cat Line nunca são bloqueados.

---

## 6. Principais Problemas Enfrentados e Soluções Técnicas

Durante o desenvolvimento do projeto, foram enfrentados desafios técnicos complexos em múltiplas camadas (Android nativo, build-tools, JavaScript, CSS e UX). Abaixo está o registro detalhado dos diagnósticos e soluções implementadas:

### Problema 1: Falha na Instalação do APK no Android (`INSTALL_PARSE_FAILED_NO_CERTIFICATES` e `INSTALL_PARSE_FAILED_BAD_MANIFEST`)
- **Sintoma:** O Android recusava instalar o APK gerado, exibindo a mensagem: *"Não foi possível instalar o app, ocorreu um problema no arquivo do app"*.
- **Diagnóstico Profundo (4 causas combinadas):**
  1. *Assinatura Legada v1:* No Android 11+ (API 30+), APKs assinados unicamente com `jarsigner` (v1 JAR scheme) são terminantemente rejeitados pelo instalador. É obrigatório o uso do **APK Signature Scheme v2 e v3**.
  2. *Corrupção de Cabeçalhos por `jar.exe uf`:* A ferramenta `jar.exe` do JDK inseria a flag `0x0808` (*Streaming Data Descriptor*) no `AndroidManifest.xml` e no `classes.dex`, o que é estritamente proibido pelo componente `libziparchive` do Android.
  3. *Quebra de Alinhamento de Memória:* Recursos sem compressão (`resources.arsc` e imagens) não estavam alinhados em blocos de 4 bytes (32-bit), violando o mecanismo de memória mapeada (`mmap`) do kernel.
  4. *Certificado X.509 com Data no Futuro:* O `keytool` gerou um certificado cuja data inicial era outubro de 2026. Celulares com data real anterior rejeitavam a chave com `CertificateNotYetValidException`.
- **Solução Implementada (`scripts/build-apk.js`):**
  - Certificado recriado com validade de **01/01/2020 até 2052** (`-startdate "2020/01/01 00:00:00"`).
  - Remoção de qualquer uso de `jar.exe uf`, utilizando exclusivamente `aapt.exe` e `aapt2` oficial do Android Build-Tools.
  - Execução de `zipalign -p -f -v 4` garantindo alinhamento de 4 bytes em todos os arquivos.
  - Assinatura formal via `apksigner sign` aplicando simultaneamente os esquemas **v1 (JAR), v2 (APK Signature) e v3 (Key Rotation)**, validada com `apksigner verify --verbose`.

### Problema 2: Bloqueio de Apps no Celular (Android 10–15)
- **Sintoma:** Ao ativar o serviço de bloqueio no celular, outros apps não eram travados ou a barreira não aparecia por cima.
- **Diagnóstico:** A partir do Android 10, o sistema proíbe iniciar telas (`startActivity`) a partir de segundo plano (*Background Activity Start Restrictions*).
- **Solução Implementada (`BlockerService.java` & `BlockPolicy.java`):**
  - Implementação de sobreposição direta no gerenciador de janelas do sistema através de `WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY`, permitida para serviços de acessibilidade ativos.
  - Adição de `performGlobalAction(GLOBAL_ACTION_HOME)` para minimizar o aplicativo alvo imediatamente enquanto a barreira pixel art é exibida.
  - Adição da permissão `QUERY_ALL_PACKAGES` no manifesto e matching inteligente que busca tanto pelo nome do pacote quanto pelo rótulo do app instalado via `PackageManager.getApplicationLabel()`.

### Problema 3: Sobrescrita de Regras no Desktop/Web ao Tentar Bloquear Novos Apps
- **Sintoma:** Ao tentar bloquear o TikTok ou qualquer outro aplicativo pelo formulário, o app sobrescrevia a regra do Instagram em vez de criar uma regra nova.
- **Diagnóstico:** O campo oculto `#foco-pkg-name` vinha com o valor padrão travado em `com.instagram.android`. Quando o usuário digitava o nome de outra rede e clicava em "Salvar", o método `saveBlockRule` buscava por esse pacote fixo e substituía o Instagram. Além disso, as regras padrão do TikTok estavam limitadas a `Dias úteis` (não travando aos domingos).
- **Solução Implementada (`web-preview/app.js`):**
  - Criação da função `resolveSocialAppMeta(rawName, rawPkg)` que detecta dinamicamente pacotes oficiais para 12 grandes redes ou gera slugs únicos isolados (`app.custom.<slug>`), impedindo qualquer colisão com o Instagram.
  - Adição de botões de **1 clique** nos chips de presets (`🔒 Trancar` / `➕ Desbloquear`).
  - Migração automática de regras legadas (`blockerMigratedV3`), ativando regras 24/7 (`Todos os dias`, `00:00–23:59`) com rigor condicional (Recompensa).

### Problema 4: Modal da Barreira de Bloqueio Invisível Fora do Scroll
- **Sintoma:** Ao clicar para testar a barreira de bloqueio, parecia que nada acontecia se a página estivesse rolada para baixo.
- **Diagnóstico:** No arquivo `web-preview/style.css`, a classe `.blocker-modal-backdrop` estava com `position: absolute; z-index: 1000`. Em telas compridas, o modal ficava renderizado no topo absoluto da página, fora do campo de visão do usuário.
- **Solução Implementada (`web-preview/style.css`):**
  - Atualizado para `position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99999; overflow-y: auto`. Agora a barreira de tela cheia surge imediatamente na frente de qualquer elemento e em qualquer ponto de rolagem.

### Problema 5: Diagramação Quebrada no Mobile (Hoje, Agenda, Loja e Mimos)
- **Sintoma:** Em telas de celulares com largura menor que 400px, os botões de compromissos (`Feito`, `Retro`, `Fazer Agora`, `🗑️`) ficavam sobrepostos ou cortados, e a seção de auto-recompensas ficava desalinhada.
- **Diagnóstico:** Uso de layouts rígidos com larguras fixas em pixels e falta de quebra flexível (`flex-wrap`).
- **Solução Implementada:**
  - Redesenho completo dos cards de compromissos e mimos com `flex-wrap: wrap`, alinhamento responsivo e área mínima de toque de 44px (*touch target*).
  - Remoção de parênteses descritivos redundantes em toda a interface conforme pedido expressivo da usuária.

### Problema 6: Fundo do Ícone do Aplicativo em Cor Inadequada
- **Sintoma:** O ícone do aplicativo gerado exibia fundo marrom em vez do preto contrastante desejado.
- **Solução Implementada (`scripts/process-app-icon.py`):**
  - Script Python com Pillow que isola o traço vetorial da gatinha com o novelo e substitui o fundo por **preto puro `#000000`**, gerando os ícones oficiais de alta resolução para o APK (`res/drawable/icon.png`) e para o web app (`web-preview/icon-512.png`).

### Problema 7: Falas Repetitivas da Gatinha
- **Sintoma:** A gatinha repetia com frequência falas genéricas e redundantes, como avisar repetidamente que pegou o novelo de lã.
- **Solução Implementada (`scripts/trim-cat-speech.py`):**
  - Varredura e poda de frases redundantes nos bancos de falas de reserva em `web-preview/app.js` e `falas_reserva.json`, priorizando acolhimento emocional, incentivo à pontualidade e comemorações autênticas.

---

## 7. Estrutura de Diretórios do Repositório

```
goofy-borg/
├── android-src/                     # Código-fonte Java nativo do APK
│   └── com/catline/app/
│       ├── MainActivity.java        # Activity com WebView acelerada por hardware
│       ├── BlockerService.java      # Serviço de acessibilidade e overlay nativo
│       ├── BlockPolicy.java         # Motor de avaliação de regras de bloqueio
│       ├── BlockerStore.java        # Persistência SharedPreferences das travas
│       └── BlockerBridge.java       # Ponte JavaScript <-> Android
├── app/                             # Módulo Android principal (Hilt e montagem)
├── core-domain/                     # Domínio puro Kotlin JVM (Zero Android)
│   └── src/main/kotlin/com/deadline/core/domain/
│       ├── DelayEngine.kt           # Cálculo de atraso, mediana e superação
│       ├── EconomyEngine.kt         # Lançamentos de livro-caixa e moedas
│       ├── MoodEngine.kt            # Cálculo ponderado dos 5 estados de humor
│       ├── RecurrenceEngine.kt      # Materialização de ocorrências futuras
│       ├── RoutineDirector.kt       # Diretor de animações e postos do quarto
│       ├── BlockPolicy.kt           # Política de bloqueio e exceções
│       └── PersonaBuilder.kt        # Construtor do prompt dinâmico de IA
├── core-data/                       # Persistência Room, DAOs e migrações
├── core-ui/                         # Componentes visuais Compose e tema pixel
├── core-game/                       # Canvas 8-bit, atlas e sintetizador de áudio
├── feature-*/                       # 8 módulos independentes de funcionalidades
├── platform-*/                      # Acessibilidade, alarmes exatos e uso de apps
├── docs/                            # Documentação de arquitetura e decisões
│   ├── briefing.md                  # Briefing original consolidado
│   ├── arquitetura.md               # Decisões AD-01 a AD-16 e contratos
│   ├── decisoes.md                  # Registro vivo de decisões técnicas (DT-001 a DT-024)
│   └── lacunas.md                   # Padrões adotados para pontos em aberto
├── scripts/                         # Scripts de automação, build e testes
│   ├── build-apk.js                 # Pipeline de geração do APK com zipalign e apksigner
│   ├── test-rewards-system.js       # Bateria de 13 testes automatizados de regras
│   ├── process-app-icon.py          # Processador do ícone com fundo preto puro
│   └── trim-cat-speech.py           # Varredura de frases da gatinha
├── web-preview/                     # Simulador PWA / Web offline-first
│   ├── index.html                   # Estrutura das 8 telas e Canvas
│   ├── style.css                    # Folha de estilos pixel art responsiva
│   ├── app.js                       # Lógica unificada, áudio chiptune e estado
│   └── sw.js                        # Service Worker de cache offline
├── CatLine-v3.1.0.apk           # APK oficial assinado da versão 3.1.0 (produção)
├── CatLine-Instalador.apk       # Instalador amigável gerado com zipalign e apksigner
├── CatLine.apk                  # Binário oficial assinado (v1, v2, v3)
├── CatLine-App.html             # Aplicativo standalone em arquivo HTML único
└── PROJETO_COMPLETO.md          # Este documento consolidado
```

---

## 8. Verificação de Qualidade e Como Executar

### 8.1. Bateria Completa de Testes Automatizados (`npm test`)
O projeto possui 8 suítes de testes determinísticos independentes somando **60 testes 100% automatizados e verdes**:
```powershell
# Executar a bateria completa do projeto
npm test
```

As 8 suítes cobrem todo o espectro do aplicativo com relógio determinístico:
1. `scripts/test-rewards-system.js`: 13 testes do sistema de mimos da vida real, recompensas e bloqueio.
2. `scripts/test-characterization.js`: 6 testes de caracterização da fundação (Fase 0).
3. `scripts/test-phase1.js`: 6 testes de lembretes nativos com alarmes exatos e cofre local seguro (Fase 1).
4. `scripts/test-phase2.js`: 7 testes do motor de calibração de tempo real vs. estimativa com barreira de 5 amostras (Fase 2).
5. `scripts/test-phase3.js`: 7 testes do motor puro de replanejamento diário e redistribuição suave de carga (Fase 3).
6. `scripts/test-phase4.js`: 7 testes de correlação entre tempo de tela e pontualidade com barreira de 7 dias e linguagem de acolhimento (Fase 4).
7. `scripts/test-phase5.js`: 7 testes do Banco de Minutos gamificado, reconciliação idempotente JS ↔ Nativo com `SystemClock.elapsedRealtime()`, exceções absolutas e saída de emergência de 10s (Fase 5).
8. `scripts/test-phase6.js`: 7 testes de auditoria final de segurança, privacidade do relatório beta 100% local, desativação de depuração em release, varredura de chamadas temporais fora de `clock.js`, validação do manifesto e ausência de parênteses (Fase 6).

*Resultado: 60 de 60 testes aprovados (100% verde).*

### 8.2. Execução do Simulador Web Local
Para rodar o simulador completo com suporte a áudio chiptune e armazenamento local:
```powershell
# Iniciar o servidor HTTP local
node web-preview/server.js
# Disponível em: http://localhost:5500 e http://localhost:8888
```

### 8.3. Compilação do APK Android Instalável
O pipeline automatizado compila os recursos, códigos Java nativos, alinha com `zipalign` e assina com esquemas v1/v2/v3:
```powershell
# Gerar o aplicativo single-file e compilar o APK v3.1.0 oficial
node scripts/build-single-file-html.js
node scripts/build-apk.js
```

---

## 9. Evolução do Roadmap de Atualização (Fases 0 a 6 — Versão 3.1.0)

O Cat Line foi integralmente lapidado seguindo as diretrizes do `ROADMAP_UPGRADE_CATLINE.md`:

- **Fase 0 · Fundação Segura:** Testes de caracterização travando os comportamentos existentes antes de qualquer alteração estrutural.
- **Fase 1 · Lembretes Nativos e Cofre Seguro:** Alarmes exatos no Android sem dependência de bibliotecas pesadas de terceiros e cofre criptografado local para segredos.
- **Fase 2 · Estimativa vs. Tempo Real:** Motor `estimationEngine` medindo durações reais das tarefas com `Clock` injetável, barreira mínima estrita de 5 amostras concluídas antes de propor sugestões e confirmação obrigatória da usuária (nenhuma alteração automática sem toque explícito).
- **Fase 3 · Replanejamento Inteligente e Carga:** Motor puro `replanEngine` para cálculo da carga diária planejada e redistribuição suave de compromissos atrasados para o dia seguinte, com linguagem acolhedora da gatinha e exigência de confirmação tátil.
- **Fase 4 · Insights Acionáveis e Correlações Saudáveis:** Motor puro `insightsEngine` cruzando tempo em redes sociais com cumprimento de metas, respeitando a barreira estrita de 7 dias de observação inicial e aplicando linguagem carinhosa de coincidência ("Em dias com menos tempo no Instagram, nosso fio tendeu a ficar mais pontual"), sem qualquer juízo acusatório.
- **Fase 5 · Banco de Minutos e Bloqueio Sincronizado:** Banco de minutos de redes sociais operando sob o interruptor geral de Foco. O JavaScript é o dono do ganho (+5 min por tarefa/hábito, 15 min por 15 peixinhos) e o nativo é o dono do consumo, reconciliados via mensagens idempotentes com carimbo monotônico de `SystemClock.elapsedRealtime()`. Salvaguardas com botão de saída de emergência de 10 segundos e exceções absolutas inegociáveis para WhatsApp, telefone, emergências e configurações.
- **Fase 6 · Polimento, Auditoria de Segurança e Release Beta:** Relatório de diagnóstico para teste beta 100% local e seguro (sem chamadas de rede e sem qualquer texto livre pessoal da usuária), botões de depuração e teste acelerado desativados em compilações de release, auditoria temporal estrita com zero chamadas a `Date.now()` fora de `clock.js`, garantia de `allowBackup=false` no manifesto, ausência absoluta de parênteses descritivos em toda a interface e compilação do APK nativo estável v3.1.0.

---

## 10. Conclusão e Estado do Projeto

O **Cat Line** atinge um equilíbrio raro no ecossistema de produtividade: reúne rigor matemático em sua métrica de pontualidade e arquitetura de software limpa (*Clean Architecture / Hexagonal*), envolvido por uma camada visual e sonora acolhedora que **transforma o combate à procrastinação em um ato de carinho com a própria rotina**.

A soberania da usuária é respeitada em cada detalhe: não há dependência de servidores de terceiros, os dados permanecem estritamente no aparelho e qualquer bloqueio ou restrição pode ser adaptado, flexibilizado ou liberado mediante conquista de recompensas reais e digitais.
