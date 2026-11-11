# ROADMAP DE UPGRADE — CAT LINE (v2.3.0 → v3.1.0)
*Plano de Evolução Arquitetural, Lembretes Nativos, Precisão Temporal, Replanejamento e Banco de Minutos*

---

## Seção 0 · Visão Geral e Princípios do Upgrade

O **Cat Line** é um aplicativo gamificado de pontualidade, rotina e foco, protagonizado por uma gatinha calico e seu novelo de lã. O produto opera sob a filosofia **offline-first**, garantindo **soberania de dados, privacidade absoluta e zero aprisionamento da usuária** (*tudo é modulável*).

Este roadmap estrutura a transição da versão atual (`v2.3.0`) para a versão `v3.1.0`, consolidando melhorias fundamentais:
1. **Fundação e Testabilidade Pura:** Desacoplamento temporal através de `clock.js`, suíte unificada de testes de caracterização e pipeline determinístico de build.
2. **Lembretes Nativos e Segurança:** Notificações e alarmes exatos via framework Android nativo (sem dependências pesadas de AndroidX/WorkManager) e cofre local seguro preservando a keystore oficial.
3. **Estimativa vs. Real:** Registro do tempo real de execução de tarefas contra o planejado, com sugestões graduais baseadas em no mínimo 5 amostras e confirmação obrigatória da usuária.
4. **Replanejamento e Carga:** Motor puro de replanejamento (`replanEngine`) para acomodar imprevistos sem culpa nem sobrecarga.
5. **Insights Acionáveis:** Análise da correlação entre tempo de tela e pontualidade, utilizando linguagem estrita de coincidência (nunca de causalidade ou culpabilização).
6. **Banco de Minutos de Redes Sociais:** Controle de foco gamificado onde minutos de tela são conquistados via tarefas/peixinhos (JS) e consumidos pelo uso real (nativo), sincronizados de forma idempotente e medidos via `SystemClock.elapsedRealtime()`.
7. **Polimento, Auditoria e Release Beta (v3.1.0):** Relatórios locais anônimos de telemetria, desligamento de ferramentas de depuração em release e auditoria de segurança rigorosa.

---

## Seção 1 · Regras Arquiteturais e Diretrizes Inegociáveis

1. **Framework Android Puro (Sem Gradle / Sem AndroidX no APK Leve):**
   - O pipeline de montagem do APK instalável (`android-src/` e `scripts/build-apk.js`) utiliza exclusivamente as ferramentas oficiais do Android SDK Build-Tools (`aapt2`, `d8`, `zipalign`, `apksigner`) e APIs nativas do `android.jar` (API 30+).
   - Nenhuma biblioteca externa ou runtime pesado do AndroidX é adicionado ao pacote leve.
2. **Preservação Estrita da Keystore e dos Dados Existentes:**
   - A keystore oficial de lançamento (`catline-release.keystore`, válida até 2052) **não deve ser recriada ou alterada**, garantindo que a instalação da nova versão atualize o aplicativo existente preservando 100% dos dados gravados no celular (`localStorage`, `SharedPreferences` e banco local).
3. **Abstração Temporal Centralizada (`clock.js`):**
   - Nenhuma chamada direta a `Date.now()` ou `new Date()` pode existir fora do módulo `clock.js`.
   - Todas as telas, cálculos de atraso, cronômetros de metas e testes devem consumir o tempo através do provedor injetável de relógio.
4. **Sincronização Idempotente do Banco de Minutos:**
   - O JavaScript é o **dono exclusivo do ganho de minutos** (conquistados ao cumprir tarefas, hábitos ou resgatar passes com peixinhos).
   - O código nativo Android (`BlockerService`) é o **dono exclusivo do consumo de minutos** (registrado quando a usuária navega no app desbloqueado).
   - As trocas de mensagens entre JavaScript e Java ocorrem via ponte bidirecional com identificadores únicos idempotentes (`nonce`), impedindo créditos ou débitos duplicados.
   - A contagem de tempo de tela no Android deve utilizar estritamente `SystemClock.elapsedRealtime()`, sendo imune a alterações manuais no relógio do sistema operacional.
5. **Segurança e Proteções Invioláveis:**
   - A barreira de foco mantém de forma inegociável a **saída de emergência de 10 segundos** (segurar a gatinha) e as exceções absolutas: WhatsApp (`com.whatsapp`), discador do telefone, chamadas de emergência, configurações do Android e o próprio Cat Line.
   - `android:allowBackup="false"` no manifesto Android. Nenhum dado sensível (textos de conversa/desabafo, chaves de API, títulos de compromissos) pode trafegar pela rede ou ser exportado em logs.
6. **Polimento Visual e Semântico:**
   - Ausência estrita de parênteses descritivos em toda a interface com a usuária.
   - Textos 100% em Português do Brasil (pt-BR) com tom acolhedor e carinhoso.
   - Todos os botões, banners e modais de depuração devem ser desligados em compilações de release.

---

## Seção 2 · Detalhamento das Fases do Roadmap

### Fase 0 · Fundação, Testes de Caracterização e Desacoplamento Temporal
- **F0-01 · Testes de Caracterização:**
  - Escrever suíte de testes de caracterização cobrindo todo o comportamento existente da versão 2.3.0 antes de qualquer refatoração: cálculo de atraso (`DelayEngine`), livro-caixa e moedas (`EconomyEngine`), transições de humor (`MoodEngine`), mimos da vida real, presets de bloqueio de redes e desbloqueio por recompensa.
- **F0-02 · Unificação do Ambiente de Testes (`package.json`):**
  - Configurar `package.json` na raiz com o comando `npm test` orquestrando a execução de todos os testes automatizados da aplicação.
- **F0-03 · Módulo Centralizado de Tempo (`web-preview/clock.js`):**
  - Criar o módulo `clock.js` com interface pura: `now()`, `today()`, `setFakeTime()` e `restoreRealTime()`.
  - Refatorar `app.js` e suítes de teste para consultar o tempo exclusivamente através de `clock.js`.
- **F0-04 · Pipeline de Compilação e Validação do APK:**
  - Garantir que `npm test` e `node scripts/build-apk.js` executem com 100% de sucesso.
  - Validar o APK gerado com `zipalign -c -v 4` e `apksigner verify --verbose` (confirmando esquemas v1, v2 e v3 ativos).

---

### Fase 1 · Lembretes Nativos e Cofre Local
- **F1-01 · Lembretes Nativos via AlarmManager:**
  - Implementar agendamento de notificações locais nativas usando `AlarmManager.setExactAndAllowWhileIdle()` e `NotificationManager` puro no Android, disparando alertas sonoros com a gatinha no horário exato dos compromissos mesmo com o celular em repouso (*Doze mode*).
- **F1-02 · Receptor de Notificações com Ação Direta:**
  - Criar `BroadcastReceiver` nativo para permitir ação "Feito ✓" direto da notificação do Android.
- **F1-03 · Cofre Local Criptografado:**
  - Implementar armazenamento seguro para chaves de API (BYOK) e dados sensíveis utilizando chaves geradas no Android Keystore nativo sem dependências externas.
- **F1-04 · Preservação de Dados em Upgrade:**
  - Validar que a instalação sobre a versão v2.3.0 preserva integralmente os dados salvos no celular.

---

### Fase 2 · Estimativa vs. Tempo Real
- **F2-01 · Registro de Duração Estimada e Real:**
  - Adicionar suporte para informar duração estimada (minutos) e registrar a duração real ao concluir tarefas e hábitos.
- **F2-02 · Motor de Sugestão de Calibração:**
  - Criar algoritmo de análise que compara o tempo planejado com o tempo executado.
  - **Regra estrita:** Nenhuma sugestão pode ser exibida com menos de 5 amostras concluídas na mesma categoria.
- **F2-03 · Confirmação Obrigatória:**
  - Qualquer ajuste de tempo na rotina exige toque explícito de confirmação da usuária; o app jamais altera horários ou durações automaticamente.

---

### Fase 3 · Replanejamento Inteligente e Gestão de Carga
- **F3-01 · Motor Puro `replanEngine`:**
  - Criar o motor em JavaScript/Kotlin puro com testes determinísticos via `clock.js`.
  - Calcular a carga total de minutos agendados para o dia e alertar suavemente quando o total ultrapassar a capacidade acordada no briefing.
- **F3-02 · Redistribuição Suave de Tarefas Atrasadas:**
  - Oferecer opções acolhedoras para redistribuir itens pendentes para os próximos dias sem gerar sensação de fracasso.
- **F3-03 · Confirmação Tátil:**
  - Nada é aplicado à rotina sem aprovação em um toque pela usuária.

---

### Fase 4 · Insights Acionáveis e Correlações Saudáveis
- **F4-01 · Cruzamento de Dados (Foco vs. Pontualidade):**
  - Analisar a relação entre o tempo em redes sociais e o cumprimento das metas diárias.
  - Exigir mínimo de 7 dias de dados antes de apresentar qualquer correlação.
- **F4-02 · Linguagem de Coincidência (Zero Julgamento):**
  - Utilizar redação cuidadosa e carinhosa da gatinha: *"Em dias com menos tempo no Instagram, nosso fio tendeu a ficar mais pontual"*, evitando qualquer juízo de valor ou causalidade acusatória.

---

### Fase 5 · Banco de Minutos de Redes Sociais e Bloqueio Sincronizado
- **F5-01 · Banco de Minutos Gamificado:**
  - Minutos de redes sociais são acumulados como recompensa ao cumprir tarefas ou resgatados com Peixinhos (`🐟`).
  - O recurso opera sob o interruptor geral do módulo Foco (pode ser desativado a qualquer momento).
- **F5-02 · Reconciliação Idempotente JS ↔ Nativo:**
  - O JS controla o saldo e os créditos; o serviço de acessibilidade nativo debita os minutos utilizados.
  - Sincronização via mensagens idempotentes com carimbo de `SystemClock.elapsedRealtime()`.
- **F5-03 · Salvaguardas Inegociáveis:**
  - Saída de emergência de 10 segundos preservada.
  - Exceções absolutas de discador, emergência, WhatsApp e configurações mantidas.

---

### Fase 6 · Polimento, Auditoria de Segurança e Release Beta (v3.1.0)
- **F6-01 · Relatório Beta Local Seguro:**
  - Mecanismo de diagnóstico 100% local (sem chamadas de rede), sem captura de textos livres da usuária.
- **F6-02 · Limpeza de Código e Desligamento de Debug:**
  - Desativação de banners e botões de teste acelerado em compilações de release.
- **F6-03 · Auditoria Final de Conformidade:**
  - Varredura de chamadas temporais fora de `clock.js`, validação de `allowBackup=false` e ausência de parênteses descritivos.
- **F6-04 · Atualização Documental:**
  - Atualização de `README.md`, `docs/decisoes.md` e `PROJETO_COMPLETO.md`.
- **F6-05 · Revisão de Segurança e Geração da Versão 3.1.0:**
  - Geração do APK final `CatLine-v3.1.0.apk` assinado e verificado.

---

## Seção 2.4 · Formato Padrão do Relatório de Entrega da Fase

Ao concluir cada fase, o agente deve apresentar o relatório estruturado exatamente sob o seguinte formato:

```markdown
### 📋 Relatório de Conclusão — [Nome da Fase]

#### 1. Resumo Executivo e Objetivos Alcançados
- [Descrição sucinta das entregas realizadas em conformidade com o roadmap]

#### 2. Arquivos Criados ou Modificados
- `[caminho/arquivo]`: [descrição da alteração]

#### 3. Bateria de Testes Automatizados (`npm test`)
- Total de testes executados: X
- Total de testes aprovados: X (100% verde)
- Destaque dos novos testes criados nesta fase.

#### 4. Validação do APK Android
- Arquivo gerado: `[NomeDoArquivo.apk]` (tamanho em KB)
- Verificação Zipalign: `Verification succesful (OK - 4 bytes)`
- Verificação Apksigner: `v1 scheme: true`, `v2 scheme: true`, `v3 scheme: true`
- Preservação da Keystore: [Confirmada com fingerprint SHA-256 idêntico]

#### 5. Roteiro de Teste Prático no Celular
1. [Passo 1 para validar a funcionalidade no aparelho]
2. [Passo 2 ...]
3. [Passo 3 ...]

#### 6. Critérios de Parada e Solicitação de Aprovação
- Todos os requisitos da fase foram concluídos sem alterar escopos futuros.
- Sistema pronto para inspeção humana antes de prosseguir para a próxima fase.
```
