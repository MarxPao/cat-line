# 🐾 Cat Line (Dead Line) — Resumo Geral e Funcionalidades

> **Versão Atual:** 3.1.0  
> **Estilo:** Pixel Art 8-bit Retro  
> **Plataforma:** Android Nativo (APK API 21–33) / Web & PWA Offline-First  
> **Filosofia:** Produtividade acolhedora sem punição, soberania da usuária e privacidade total (100% offline).

---

## 1. Visão Geral e Conceito

O **Cat Line** é um aplicativo gamificado de rotina, pontualidade, hábitos e foco. Diferente de gerenciadores de tarefas tradicionais baseados em cobrança rígida e ansiedade, o Cat Line constrói um ambiente afetivo onde a usuária cuida da sua rotina ao lado de uma **gatinha calico** em um quarto em pixel art.

### Metáfora Central: O Novelo de Lã
- **O Fio do Prazo:** O novelo desenrola seu fio conforme o tempo passa e os prazos se aproximam.
- **Progresso Conquistado:** Ao cumprir compromissos e hábitos, a gatinha recolhe o fio, mantendo o novelo firme e saudável.
- **Gráfico de Pontualidade ("O Fio"):** Mede a mediana semanal de atraso com suavidade, transformando a evolução pessoal em uma linha visual puxada pela gatinha.

---

## 2. Pilares Arquiteturais e de Privacidade

1. **100% Offline-First:** Nenhum dado pessoal, rotina, desabafo ou meta sai do dispositivo. Armazenamento seguro via Room/DataStore no Android e LocalStorage criptografado no Web Preview.
2. **Modularidade Total (`AD-11`):** Cada módulo possui um interruptor individual. A usuária pode desativar qualquer área (Loja, Foco, Conversa, etc.) a qualquer momento.
3. **Sem Números Mágicos (`AD-10`):** Economia, pesos de humor e rotinas são carregados de configurações declarativas versionadas.
4. **Relógio Determinístico (`AD-05`):** Todos os motores operam sob relógio injetável e monotônico (`SystemClock.elapsedRealtime()`), impedindo inconsistências e fraudes de relógio.

---

## 3. Módulos e Funcionalidades Principais

### 📅 1. Hoje & Agenda Inteligente
- **Linha do Dia & Dia Lógico:** Virada de dia configurada às `04:00` (respeitando madrugadas de descanso).
- **Check-in Preciso:** Marcação de tarefas no horário real ou check-in retroativo identificado.
- **Espelho da Rotina:** A gatinha no cenário estuda, trabalha, treina, descansa ou come de acordo com a categoria da tarefa em execução.
- **Gestão de Carga Diária:** Cálculo automático de minutos planejados vs. capacidade acolhedora recomendada (limite suave de 7h/dia) para evitar sobrecarga.
- **Replanejamento com Carinho:** Identificação de tarefas pendentes atrasadas com sugestão suave de realocação para o dia seguinte, exigindo **toque de confirmação explícito** (nada muda sozinho).

### 🔄 2. Hábitos e Metas
- **Construção de Hábitos:** Frequências flexíveis (diários, dias úteis, fins de semana ou contadores semanais).
- **Metas de Médio/Longo Prazo:** Vinculação de compromissos a metas específicas, cada uma representada por uma cor especial de novelo.
- **Calibração de Estimativa vs. Tempo Real:** Medição da duração real das tarefas. Ao atingir **5 amostras**, a gatinha sugere ajustes acolhedores para a duração planejada com base na mediana observada.

### 🧘 3. Foco & Banco de Minutos de Redes Sociais
- **Temporizador Pomodoro ("Puxar o Fio"):** Sessões de 15m, 25m ou 45m com animação do novelo e ronrom relaxante a cada 3,2s.
- **Banco de Minutos Gamificado:** Minutos para redes sociais são conquistados ao cumprir tarefas/hábitos (+5 min cada) ou resgatados com Peixinhos (`15🐟 = 15 min`).
- **Bloqueio Nativo Failsafe (Android):**
  - Ao tentar abrir apps trancados (Instagram, TikTok, YouTube, etc.), o sistema executa `GLOBAL_ACTION_HOME` na mesma fração de segundo e exibe a tela cheia da gatinha (**🐱🔒 Bloqueado**).
  - Reconciliação idempotente entre JS (dono do saldo) e o serviço nativo (dono do consumo).
  - **Botão "Trancar Todas Agora":** Revoga instantaneamente qualquer passe ativo.
- **Salvaguardas Inegociáveis:**
  - **Saída de Emergência de 10s:** Segurar o botão por 10 segundos ininterruptos concede liberação temporária.
  - **Exceções Absolutas:** WhatsApp, Telefone/Discador, Emergência (SOS), Configurações do Android e o próprio Cat Line **nunca** são bloqueados.

### 🐟 4. Economia Gamificada & Mimos da Vida Real
- **Moedas Virtuais:** Peixinhos (`🐟`) obtidos por esforço e pontualidade; Vínculo (`♥`) nutrido com carinho e presença.
- **Lojinha Pixel Art:** Cosméticos temáticos que aparecem no sprite da gatinha em tempo real (Laço Rosa 🎀, Coroa Dourada 👑, Chapéu de Mago 🧙‍♂️, Óculos Escuros 🕶️).
- **Mimos da Vida Real (Auto-Recompensas):** Catálogo editável de presentes da vida real (ex: *"Café especial"*, *"Assistir série sem culpa"*, *"Pedir delivery"*), resgatados com `🐟` conquistados por mérito.

### 📊 5. Insights Acionáveis (O Fio)
- **Barreira Mínima de 7 Dias:** Nenhuma inferência é exibida prematuramente; a gatinha exibe uma barra de progresso durante a fase de observação mútua.
- **Linguagem de Coincidência (Zero Culpa):** Comparações carinhosas como *"Em dias com menos tempo no Instagram, nosso fio tendeu a ficar mais pontual"*, sem termos punitivos ou julgamentos de valor.
- **Relatório Beta Anônimo:** Ferramenta de auditoria 100% local (sem rede) que consolida estatísticas numéricas de uso sem conter nenhum texto livre da usuária.

### 💬 6. Conversa & Acolhimento
- **Desabafo Seguro:** Chat para registro de sentimentos e alinhamento de rotina.
- **Privacidade Extrema:** As mensagens ficam exclusivamente na memória do aparelho, com botão de limpeza total a qualquer momento.

---

## 4. Estrutura de Instalação e Execução

| Formato | Descrição | Como Obter/Rodar |
|---|---|---|
| **APK Nativo Android** | Pacote oficial assinado com esquemas v1/v2/v3, sem permissões invasivas (`QUERY_ALL_PACKAGES` removido). | Arquivo `CatLine-Instalador.apk` ou `CatLine-v3.1.0.apk`. |
| **WebAPK / PWA Oficial** | Instalável direto pelo Chrome (`⋮` > *Instalar aplicativo*). Assinado pelo próprio Google, imune a avisos do Play Protect. | Servidor local em `http://localhost:5500` ou túnel Cloudflare. |
| **Single-File Standalone** | Todo o aplicativo (HTML, CSS, JS e sprites) em um único arquivo de ~395 KB. | Arquivo `CatLine-App.html`. |

---

## 5. Garantia de Qualidade
- **Bateria de Testes:** 61 testes unitários determinísticos cobrindo regras de recompensa, bloqueio, calibração, carga e isolamento (`npm test` com 100% de aprovação).
- **Compatibilidade:** Android 5.0 (Lollipop) até Android 15 (compileSdk 33/35).
