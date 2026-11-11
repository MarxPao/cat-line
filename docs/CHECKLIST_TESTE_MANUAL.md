# Roteiro de Teste Manual — Cat Line v3.2.0

> **Versão:** Cat Line v3.2.0 (`versionCode = 13` / `versionCode = 320`)  
> **Escopo:** Validação manual ponta a ponta dos recursos da v3.2.0 (Metas com Passos, Máquina de Estados de Compromissos, Livro-Razão de Recompensas, Fechamento do Dia, Log Semanal, Backup v2 e Interruptores de Módulos AD-11).  
> **Dispositivos Recomendados para Homologação:**  
> - **Aparelho A:** Samsung Galaxy (One UI · Android 13 ou 14)  
> - **Aparelho B:** Xiaomi / Redmi (MIUI / HyperOS) ou Motorola (Android 12+)

---

## 1. Pré-Requisitos e Configuração do Ambiente de Teste

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 1.1 | Instalar `CatLine.apk` no Aparelho A e Aparelho B via ADB ou instalador de arquivos. | Instalação concluída sem conflito de assinatura com a v3.1.0 prévia. | [ ] |
| 1.2 | Conceder permissão de Acessibilidade ao serviço do Cat Line. | Tela de saúde de permissões exibe indicador verde para o serviço nativo. | [ ] |
| 1.3 | Conceder permissão de Sobreposição / Janela Flutuante (se aplicável ao fabricante). | Overlay de bloqueio autorizado sem restrição do sistema. | [ ] |
| 1.4 | Abrir o Cat Line e verificar versão exibida na aba **Insights** ou no Relatório Beta. | Versão exibida: `v3.2.0` (`versionCode = 13`). | [ ] |
| 1.5 | Conferir que o app opera 100% offline (modo avião ativado). | O aplicativo funciona perfeitamente sem conexão de rede. | [ ] |

---

## 2. Metas com Passos Editáveis

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 2.1 | Na aba **Metas**, tocar em `+ Nova Meta`. Definir horizonte (ex.: Médio Prazo), cor do novelo (Rosa) e título *"Aprender Ilustração Pixel Art"*. Salvar. | Meta criada na lista com novelo de progresso em 0%. | [ ] |
| 2.2 | Abrir os detalhes da meta. Adicionar 3 passos: <br>1. *"Comprar caderno de rascunhos"* (15 min) <br>2. *"Fazer 10 esboços de gatinhos"* (45 min) <br>3. *"Finalizar sprite 64x64"* (60 min). | Lista de passos exibe os 3 itens com suas ordens e durações estimadas. | [ ] |
| 2.3 | Reordenar os passos usando as setas de ordenação (mover o passo 3 para cima). | Ordem atualizada visualmente e persistida imediatamente. | [ ] |
| 2.4 | Tocar no botão de dividir passo (ícone ✂️) no passo 2. Dividir em *"Fazer 5 esboços pela manhã"* e *"Fazer 5 esboços à tarde"*. | O passo original dá lugar a dois sub-passos consistentes. | [ ] |
| 2.5 | Marcar o passo 1 como concluído tocando na caixa de seleção. | Som chiptune toca; gatinha comemora; saldo recebe **+3 Peixinhos**; novelo avança. | [ ] |
| 2.6 | Desmarcar o passo 1 e marcá-lo novamente. | O passo volta ao estado anterior, mas a recompensa **NÃO é duplicada** (idempotência por chave `step_done:<id>`). | [ ] |
| 2.7 | Arquivar o passo concluído tocando em arquivar. | Passo arquivado não aparece na lista ativa; recompensas já emitidas são **estritamente preservadas**. | [ ] |

---

## 3. Agendamento e Máquina de Estados dos Compromissos

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 3.1 | Dentro dos detalhes da meta, tocar no botão **Agendar este passo** no passo *"Fazer 5 esboços pela manhã"*. | Abre formulário de novo compromisso já pré-preenchido com o título, vínculo com a meta e passo. | [ ] |
| 3.2 | Definir horário planejado para daqui a 5 minutos e categoria `CRIATIVIDADE`. Confirmar em 2 toques. | Compromisso agendado aparece na linha do tempo da aba **Hoje** no estado `pending`. | [ ] |
| 3.3 | **Check-in Pontual:** Aguardar o horário e tocar em **Cumpri**. | Estado muda para `done`; calcula atraso em minutos; ganho de **+2 Peixinhos** + **1 Peixinho bônus de pontualidade** (+5 min no Banco de Minutos). | [ ] |
| 3.4 | **Confirmação de Passo Vinculado:** Observar prompt de confirmação pós-check-in da gatinha: *"Esse passo da meta foi concluído?"*. Tocar em **Sim**. | O passo correspondente na meta é marcado como concluído automaticamente e o progresso da meta é atualizado. | [ ] |
| 3.5 | **Janela de Desfazer:** Dentro de 10 minutos após o check-in, tocar em **Desfazer**. | O compromisso reverte para `pending`; livro-razão emite evento compensatório estrito sem apagar registros históricos. | [ ] |
| 3.6 | **Check-in Retroativo:** Criar um compromisso para 2 horas atrás e marcar como concluído informando horário de memória. | Estado muda para `done`; check-in recebe flag `retroactive = true`; recompensa multiplicada por **0.5x**. | [ ] |
| 3.7 | **Marcação "Não Cumpri":** Criar um compromisso e tocar na opção **Não cumpri**. | Estado muda para `missed`; **zero perda de saldo, zero dedução e zero linguagem de culpa**. | [ ] |
| 3.8 | **Remarcar:** Criar um compromisso e selecionar **Remarcar** para novo horário. | Compromisso original transita para `rescheduled`; nova ocorrência é gerada em `pending` mantendo o vínculo de origem (`rescheduledFromId`). | [ ] |

---

## 4. Fechamento do Dia Lógico (04:00)

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 4.1 | Deixar compromissos pendentes passarem das 04:00 da manhã (ou simular virada do dia lógico). | Compromissos não respondidos transitam para `unmarked` (**nunca são punidos como não cumpridos**). | [ ] |
| 4.2 | Abrir o app após as 04:00. | Modal de **Fechamento do Dia** da gatinha abre acolhedoramente listando os itens sem marcação do dia anterior. | [ ] |
| 4.3 | Resolver um item individualmente como **Cumpri**, outro como **Não cumpri** e outro como **Remarcar**. | Cada item transita para seu estado final com registro retroativo transparente. | [ ] |
| 4.4 | Em outro cenário com múltiplos itens, testar a ação em lote **Marcar todos como cumpridos**. | Exige diálogo de confirmação explícito; ao confirmar, resolve todos sem penalidades. | [ ] |
| 4.5 | Concluir o fechamento do dia. | Registra `DayClosure`; emite **+1 Coração** no livro-razão (chave idempotente `day_closure:<diaLógico>`). | [ ] |

---

## 5. Log Semanal e Carta da Gatinha (Templates Declarativos)

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 5.1 | Na aba **Insights**, verificar o card do **Log Semanal**. | Exibe botão para visualizar a síntese da semana. | [ ] |
| 5.2 | **Barreira de 7 Dias:** Acessar o Log com menos de 7 dias de dados registrados. | Log semanal é gerado com totais e contagens, mas **omite comparações e inferências de melhor dia/horário**, exibindo mensagem de observação afetuosa da gatinha. | [ ] |
| 5.3 | **Log com dados completos (>= 7 dias):** Visualizar relatório semanal. | Exibe: taxa de cumprimento, taxa de pontualidade, mediana de atraso ("O Fio"), melhor dia e faixa de horário, passos concluídos e **Carta da Gatinha gerada por templates declarativos (100% offline, sem LLM)**. | [ ] |
| 5.4 | **Sugestão Suave:** Se houver compromisso com mediana de atraso frequente, observar sugestão de ajuste de horário. | Apresenta sugestão carinhosa com botões explícitos de **Aceitar** e **Deixar como está** (nada muda sem confirmação). | [ ] |
| 5.5 | Fechar e reabrir o Log Semanal da mesma semana. | Carrega o `snapshotJson` imutável, garantindo fidelidade histórica mesmo se configurações futuras forem alteradas. | [ ] |

---

## 6. Livro-Razão de Recompensas e Tetos Anti-Farm

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 6.1 | Concluir várias tarefas rápidas no mesmo dia acumulando Peixinhos até atingir 15 Peixinhos. | O saldo incrementa corretamente até 15 Peixinhos. | [ ] |
| 6.2 | Concluir mais uma tarefa após atingir o teto de 15 Peixinhos. | A tarefa é marcada como concluída; a gatinha reage com carinho (*"Hoje já juntamos bastante!"*); saldo não ultrapassa o teto diário; sem mensagem de erro ou bloqueio punitivo. | [ ] |
| 6.3 | Verificar teto de minutos de rede social (+30 min/dia). | Após acumular 30 minutos de desbloqueio no Banco de Minutos no mesmo dia lógico, o crédito diário atinge o limite saudável. | [ ] |
| 6.4 | Criar micro-tarefa com duração menor que 5 minutos e marcá-la como feita. | Conclusão é registrada com sucesso, mas não emite recompensas econômicas anti-farm (`minCommitmentMinutesToReward = 5`). | [ ] |

---

## 7. Interruptores de Módulos (AD-11)

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 7.1 | Acessar Configurações > **Interruptores de Módulos**. Desativar **Metas com Passos**. | Aba Metas oculta listas de passos e botões de divisão/agendamento de passos, sem apagar nenhum dado interno. | [ ] |
| 7.2 | Reativar **Metas com Passos**. | Todos os passos e histórico reaparecem intactos imediatamente. | [ ] |
| 7.3 | Desativar **Compromissos**. | Linha do tempo da aba Hoje oculta compromissos agendados, mantendo apenas hábitos e tarefas pontuais. | [ ] |
| 7.4 | Desativar **Log Semanal**. | O card de Log Semanal na aba Insights é ocultado e a abertura é suspensa de forma limpa. | [ ] |

---

## 8. Exportação, Importação e Backup com Schema v2

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 8.1 | Ir em Configurações > **Exportar Backup**. | Gera arquivo JSON baixável com `schemaVersion: 2` contendo metas, passos, compromissos, check-ins, livro-razão, fechamentos e logs semanais. | [ ] |
| 8.2 | Fazer nova alteração (concluir mais uma tarefa) e em seguida importar o backup gerado no passo 8.1. | App exibe resumo do backup e pede confirmação explícita da usuária. | [ ] |
| 8.3 | Confirmar a importação. | Os dados são mesclados com **idempotência estrita**: eventos de recompensa (`idempotencyKey`) e logs semanais (`weekStartLogicalDay`) não são duplicados. | [ ] |
| 8.4 | Importar um backup legado no formato v3.1.0 (`schemaVersion: 1`). | O motor de migração transparente converte o payload para o Schema v2 sem falhas e sem perda de histórico. | [ ] |

---

## 9. Bloqueador Nativo e Salvaguardas de Emergência

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 9.1 | No card de Foco, trancar um aplicativo (ex.: Instagram ou TikTok). | O aplicativo entra na lista de bloqueados ativos. | [ ] |
| 9.2 | No celular, abrir o aplicativo trancado. | O serviço de acessibilidade intercepta instantaneamente via `GLOBAL_ACTION_HOME`, minimiza o app trancado e abre a tela de bloqueio com a gatinha 🐱🔒. | [ ] |
| 9.3 | Na tela de bloqueio, tocar e segurar o botão **🚨 Saída de Emergência** por 10 segundos ininterruptos. | Contagem regressiva de 10s é exibida; ao completar, libera o acesso emergencial temporário. | [ ] |
| 9.4 | Abrir aplicativos essenciais (WhatsApp, Telefone/Discador, Configurações do Android, Cat Line). | **Exceções absolutas inegociáveis:** nenhum desses aplicativos é bloqueado em nenhuma hipótese. | [ ] |
| 9.5 | Tocar no botão **Trancar Todas Agora** no Cat Line. | Revoga instantaneamente qualquer passe temporário ativo e retranca todas as redes sociais. | [ ] |

---

## 10. Acessibilidade e Interface

| Passo | Ação | Resultado Esperado | Status |
|---|---|---|---|
| 10.1 | Inspecionar botões e controles interativos em telas pequenas e com escala de fonte aumentada. | Todos os alvos de toque têm dimensão mínima de **48×48 dp**; tipografia respeita mínimo de **12 sp**. | [ ] |
| 10.2 | Verificar todos os textos em português brasileiro (pt-BR). | Zero parênteses explicativos na interface visível; redação acolhedora e positiva. | [ ] |
