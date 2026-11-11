# Dead Line — Briefing Consolidado do App

App gamificado de agenda, hábitos e metas, em pixel art 8-bit, com uma gatinha e um novelo de lã. Versão consolidada com as decisões já tomadas e as lacunas que ainda faltam fechar antes da arquitetura.

## 1. Visão
A cliente quer lançar todos os compromissos, marcar a hora em que de fato os cumpriu, ver o quão atrasada é e ir superando isso. O app é ao mesmo tempo uma agenda, um monitor de hábitos e um sistema de recompensa, no formato de um joguinho de celular com a vibe de Pou e de Pokémon.
- **Conceito que amarra tudo:** o nome Dead Line e o novelo de lã se completam. A linha do prazo é o fio. O novelo desenrola conforme o prazo se aproxima, e o gráfico de pontualidade é um fio que a gatinha puxa.
- **Personagem:** a gatinha calico (branca, laranja e cinza) da imagem de referência enviada (`docs/referencias/gatinha_referencia.jpg`), em pixel art com balão de fala. Ela é a protagonista, a interface de conversa e o espelho da rotina da usuária.

## 2. Decisões já fechadas
- **Público:** só para a cliente, por enquanto.
- **Plataforma:** Android.
- **Distribuição:** fora da Play Store, por instalação direta com permissão de uso.
- **Funcionamento:** offline-first, sem conta obrigatória. Backup em nuvem, se existir, é opcional.
- **Personagem:** a gatinha calico da imagem de referência.
- **Novelo:** aparece no tracker e na edição de cada item (checklist, hábitos do dia, tarefas do dia) e faz alguma gracinha em todas as telas do app.
- **Conversa com a gatinha:** a usuária pode conversar e desabafar com a gatinha, que responde em balõezinhos, com apoio de um LLM.
- **Briefing por perguntas:** um conjunto de perguntas conduzido por LLM para conhecer a usuária, opcional e por escolha dela.
- **Bloqueio de redes:** a usuária escolhe os apps bloqueados e o rigor. Tudo é modulável por ela.
- **Tracker de apps:** interage com a gatinha.

## 3. Princípio de design: tudo é modulável
A usuária controla o app, e o app não a controla. Isso vale para o bloqueio, o rigor, a frequência de notificações, o tom da gatinha, o uso do chat e o questionário de briefing. Cada módulo pode ser ligado, desligado e ajustado depois. Isso também reduz o risco de ela desinstalar o app por se sentir presa.

## 4. Núcleo do produto: o loop do atraso
O loop central é: planejar, fazer, registrar o horário real, comparar com o planejado, ver o atraso e melhorar. Tudo o mais alimenta ou recompensa esse loop.

### Métrica de atraso
- Atraso de cada item = horário em que marcou "feito" menos horário limite.
- Indicadores: atraso médio, percentual no prazo, melhores e piores dias e horários, evolução semanal em gráfico de linha (o fio).
- O horário é registrado automaticamente no toque. A edição retroativa é permitida e fica marcada como tal.
- "Superar" vira meta de melhoria definida pela usuária, por exemplo reduzir o atraso médio para menos de 15 minutos na semana.

## 5. Agenda, hábitos e metas
### Agenda e tarefas do dia
- Compromissos com horário de início e fim, ou só com prazo no dia.
- Recorrência, lembretes e categorias.
- Sincronização com Google Calendar fica para uma fase posterior.

### Hábitos
- Frequência configurável: todos os dias, dias úteis ou X vezes por semana, com janela de horário.
- Sequências (streaks) com tolerância, como um "novelo reserva" que cobre um dia perdido.

### Metas de longo, médio e curto prazo
- Hierarquia: meta de vida, trimestre, mês, semana e tarefa.
- As tarefas alimentam a barra de progresso da meta.
- O progresso da meta aparece como o novelo sendo enrolado.

## 6. Gamificação e recompensa
- **Dia perfeito:** cumprir tudo o que foi proposto para o dia dá uma recompensa maior.
- **Moedas:** moeda principal ganha por cumprir itens e por pontualidade. A necessidade de uma segunda moeda rara fica em aberto (fechada na seção 15/19).
- **Loja e customização:** roupas, acessórios e itens de cenário para a gatinha.
- **Recompensas reais:** definidas pela usuária (assistir um episódio, tomar um café especial), liberadas ao cumprir metas.
- **Sem punição pesada:** a gatinha pode ficar triste ou sonolenta, mas o estado é sempre reversível e o tom é sempre carinhoso. A gatinha nunca morre nem adoece de forma permanente.

## 7. A gatinha e o novelo
### Gatinha
- Humor influenciado pela pontualidade, pelos hábitos do dia e pelo uso de apps.
- Reproduz a rotina da usuária de forma fofa: estuda, treina, come, dorme e brinca conforme a agenda do dia.
- Cada ação exige um conjunto de sprites, então é o maior fator de custo de arte.

### Cenário
- Estilo Pokémon, com visão de cima, ligado às áreas da vida.
- Para o MVP, uma cena fixa. Novas áreas liberadas em fases posteriores.

### Novelo
- Barra de progresso, cronômetro (desenrolando) e gráfico de linha.
- Presente no tracker e na edição de cada item.
- Faz uma gracinha própria em cada tela, como rolar, ser perseguido pela gatinha ou se enrolar em algum elemento da interface.

## 8. Conversa com a gatinha (LLM)
- **Chat em balões:** a usuária fala com a gatinha, inclusive para desabafar, e a gatinha responde no balãozinho, com a personalidade do personagem.
- **Questionário de briefing:** um conjunto de perguntas conduzido por LLM para entender a rotina, os objetivos e os hábitos da usuária e já sugerir configurações iniciais. É opcional, pode ser feito quando ela quiser e refeito depois.
- **Requisitos e cuidados:**
  - O app é offline-first, mas o chat precisa de internet. Sem conexão, a gatinha responde com mensagens simples pré-definidas.
  - Os desabafos são dados muito pessoais. Devem ficar guardados no aparelho, com opção de apagar tudo, e a usuária precisa saber o que é enviado ao provedor do LLM.
  - A gatinha deve ter limites claros: ela acolhe, mas não substitui apoio profissional. Se a conversa indicar sofrimento sério, ela responde com cuidado e incentiva procurar uma pessoa de confiança ou ajuda especializada.
  - (Atualizado na seção 15/21 para BYOK: a usuária usa a própria chave).

## 9. Bloqueio de redes e tracker de apps
### Bloqueio
- A usuária escolhe quais apps bloquear. O WhatsApp fica de fora por padrão.
- Ela também escolhe o rigor: de um simples aviso da gatinha até o bloqueio que só libera ao cumprir tarefas definidas por ela.
- Mesmo no rigor máximo, mantém uma saída de emergência com espera e custo em moedas, ou desligamento consciente nas configurações, para não virar um aprisionamento.

### Tracker de tempo de uso
- Relatório por app e por dia.
- Interage com a gatinha, que muda de humor com o uso de tela e comenta o que vê.

### Viabilidade no Android
- Precisa das permissões de acesso ao uso de apps e de exibição sobre outros apps, e possivelmente do serviço de acessibilidade.
- Como o app não será publicado na Play Store, as regras de política da loja não limitam o projeto. Em instalações diretas, o Android pode exigir que a usuária libere manualmente as "configurações restritas" do app antes de ativar a acessibilidade.
- Muitos fabricantes encerram apps em segundo plano de forma agressiva. Precisamos saber o modelo e a versão do Android dela para testar de verdade.

## 10. Visual e áudio
- Pixel art 8-bit com paleta curta (cerca de 8 a 10 tons na gatinha, paleta global de 16 cores) e escala inteira para não borrar.
- Fonte pixel e kit de interface pixelado, com contraste e tamanho confortáveis nas telas de dados (agenda, gráficos, listas).
- Trilha e efeitos chiptune, com opção de silenciar. Animações de recompensa.

## 11. Dados e privacidade
- Dados no aparelho por padrão. Backup em nuvem opcional e criptografado.
- Dados de horários, hábitos, uso de apps e desabafos são pessoais, então a usuária precisa de transparência e de uma opção de exportar e apagar tudo.

## 12–14. Histórico da primeira rodada
*(Substituído pelas seções 15 a 26 abaixo).*

## 15. Decisões desta rodada
| Tema | Decisão |
|---|---|
| Tratamento | A gatinha chama a usuária de “mamãe”. O nome próprio dela fica como campo configurável. |
| Mais gatos | Entram depois; o modelo de dados já prevê vários gatos. |
| Animações | Todas entram no MVP. A cliente define as categorias da rotina e as poses que quer ver. |
| Tamanho da gatinha | Sprite de 64×64 px numa tela virtual de 180 px de largura (cerca de 36%). |
| Economia | Duas moedas e um nível de vínculo (seção 19). |
| LLM | BYOK: a usuária cola a própria chave e escolhe o provedor. Não há servidor nosso. |
| Persona | Dinâmica: varia com humor, metas, hora do dia e modo de conversa (seção 21). |
| Arte | Sprites e cenários gerados no Gemini com prompts escritos aqui e tratados por script (seção 23). |
| Som | Miados, ronronar e blip de fala em chiptune, gerados por código e entregues como arquivos de áudio. |

## 16. Arquitetura: visão geral
O app é nativo Android, em Kotlin com Jetpack Compose, e guarda as regras num domínio puro que não conhece o Android.

## 17. Módulos do projeto
- `app`: Navegação, injeção de dependências (Hilt) e registro dos módulos que a usuária pode ligar e desligar
- `core-domain`: Entidades e motores em Kotlin puro: atraso, humor, economia, recorrência, metas
- `core-data`: Room (SQLite), DataStore, repositórios e tarefas em segundo plano (WorkManager)
- `core-ui`: Tema pixel: paleta, fontes, bordas, botões, balão de fala e o componente Novelo
- `core-game`: Renderizador de cena, animador de sprites, diretor de rotina e áudio
- `feature-hoje`: Cena inicial com a gatinha, checklist e hábitos do dia
- `feature-agenda`: Compromissos, recorrência e edição de cada item com o novelo
- `feature-habitos`: Hábitos, frequência e sequências
- `feature-metas`: Metas hierárquicas e recompensas reais
- `feature-insights`: Gráficos de atraso (o fio), pontualidade e tempo de tela
- `feature-loja`: Itens, cosméticos, áreas e novos gatos
- `feature-conversa`: Chat em balões, modo desabafo e questionário de briefing
- `feature-foco`: Configuração do bloqueio e do tracker, saúde das permissões
- `platform-bloqueio`: Serviço de acessibilidade, tela da gatinha como barreira, política de desbloqueio
- `platform-uso`: Leitura do histórico de uso e amostras por hora
- `platform-lembretes`: Alarmes exatos, notificações com ação e widget
- `ai-llm`: Provedores, cofre da chave, construtor de persona e camada de segurança

## 18. Dados, tempo e motores de regra
### Regras de tempo
- Instantes ficam em milissegundos desde 1970 e o fuso fica na ocorrência, com cálculo em `java.time`.
- O dia vira às 4h por padrão, e a usuária pode mudar. Madrugada conta no dia anterior.
- Compromissos recorrentes viram ocorrências numa janela de 14 dias à frente. Editar a série recalcula só as ocorrências futuras.
- Uma ocorrência vira “perdida” quando passa da janela de graça (padrão: fim do dia) sem check-in.

### Motor de atraso
- Atraso = instante do check-in menos o prazo. Valor negativo significa adiantado.
- Faixas: no prazo (até a tolerância, padrão 5 min), atrasado e perdido.
- Por dia ficam guardados atraso mediano, atraso médio e percentual no prazo. A tendência usa janelas de 7 e 30 dias.
- A mediana é o indicador principal. “Superação” é a mediana de 7 dias caindo em relação à anterior.

### Motor de humor
- Três índices de 0 a 100: pontualidade (últimos 7 dias, com peso maior nos recentes), constância (hábitos feitos sobre previstos) e foco (tempo de tela nos apps escolhidos contra a meta).
- Cinco estados: `RADIANTE`, `FELIZ`, `TRANQUILA`, `SONOLENTA`, `MANHOSA`.
- Muda no máximo um degrau por fechamento de dia. Não existe estado pior que manhosa, e o “modo descanso” congela humor e sequências.

## 19. Motor de economia
- **Moedas:** Peixinhos (comum), Novelos dourados (rara, só por marcos) e Vínculo (pontos cumulativos que não se gastam).
- **Ganhos iniciais:**
  - Tarefa feita: P = 5, M = 10, G = 20 peixinhos (teto de 10 tarefas P por dia).
  - Pontualidade: adiantado ×1,2 · no prazo ×1,0 · até 30 min de atraso ×0,6 · mais que isso ×0,3 · perdido 0. Check-in retroativo paga 50%.
  - Hábito do dia: 8 peixinhos × `min(1.5, 1 + 0.02 * diasDeSequencia)`.
  - Bônus de superação: até 15 peixinhos.
  - Fechamento do dia: bronze (50%) = 10 · prata (75%) = 20 · ouro (100%) = 35 peixinhos.
  - Tela dentro da meta: 10 peixinhos.
  - Baú da semana: 40 a 120 peixinhos + 1 item sorteado (garantia a cada 4 baús).
  - Novelos dourados: meta curta = 1 · média = 3 · longa = 5 · semana com 5 dias ouro = 1.
- **Proteções:** Modo descanso, Dia de recuperação (2 itens à noite liberam bronze), Rendimento decrescente (a partir do 12º item no dia, ganho cai pela metade), Livro-caixa imutável.

## 20. Renderização, animação e áudio
- Grade virtual de 180 px de largura; gatinha de 64×64 px montada em partes (corpo, cauda, olhos, acessórios).
- Catálogo de animações no MVP: ociosa, andar, dormir, comer, higiene, lazer, estudar/ler, trabalhar, treinar, cuidar da casa, sair, feliz, comemorar, sonolenta, manhosa, olhar o relógio, espreguiçar, lamber-se, brincar com o novelo, ronronar, miar falando.
- Novelo com 4 modos: barra, cronômetro, gráfico e edição + gracinhas nas telas.
- Fontes pixel OFL: Pixelify Sans e Silkscreen.

## 21. IA: chave própria, personas, briefing e segurança
- BYOK com adaptadores Anthropic, Google Gemini e OpenAI-compatible; chave no Android Keystore.
- Persona dinâmica em 4 blocos: identidade fixa, resumo JSON do estado (com opt-in), variante de persona e regras de segurança.
- Cuidado com sofrimento: checagem local + prompt de sistema exibindo CVV (188) e SAMU (192).

## 22. Bloqueio e tracker no Android
- Serviço de acessibilidade + sobreposição com 5 níveis de rigor (0 Observar, 1 Aviso, 2 Fricção, 3 Condicional, 4 Firme).
- Exceções protegidas: telefone, emergência, WhatsApp (padrão), configurações, launchers e Dead Line.
- Saída garantida segurando a gatinha por 10 s.

## 23–26. Pipeline de arte, ferramentas, viabilidade e lacunas
Ver detalhes consolidados em `docs/arquitetura.md` e `docs/lacunas.md`.
