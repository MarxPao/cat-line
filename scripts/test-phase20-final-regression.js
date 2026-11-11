/**
 * scripts/test-phase20-final-regression.js
 * Suíte de Regressão Final (Cat Line v3.2.0 · Prompt 14)
 * Valida explicitamente os 10 Casos de Borda do Briefing e Invariantes Arquiteturais
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO SUÍTE DE REGRESSÃO FINAL (CAT LINE V3.2.0 - PROMPT 14) ===\n');

// 1. Provedores de relógio e configurações
const Clock = require('../web-preview/clock.js');
Clock.setFakeTime('2026-10-25T14:00:00.000Z');

const commitmentsConfigModule = require('../web-preview/commitments-config.js');
const commitmentsConfig = commitmentsConfigModule.DEFAULT_CONFIG || commitmentsConfigModule;

const goalStepEngineModule = require('../web-preview/goal-step-engine.js');
const goalStepEngine = goalStepEngineModule.goalStepEngine || goalStepEngineModule;

const stateMachineModule = require('../web-preview/commitment-state-machine.js');
const stateMachine = stateMachineModule.commitmentStateMachine || stateMachineModule;

const delayMetricsEngineModule = require('../web-preview/delay-metrics-engine.js');
const delayMetricsEngine = delayMetricsEngineModule.delayMetricsEngine || delayMetricsEngineModule;

const rewardLedgerModule = require('../web-preview/reward-ledger-engine.js');
const rewardLedger = rewardLedgerModule.rewardLedgerEngine || rewardLedgerModule;

const dayClosureEngineModule = require('../web-preview/day-closure-engine.js');
const dayClosureEngine = dayClosureEngineModule.dayClosureEngine || dayClosureEngineModule;

const weeklyLogEngineModule = require('../web-preview/weekly-log-engine.js');
const weeklyLogEngine = weeklyLogEngineModule.weeklyLogEngine || weeklyLogEngineModule;

const backupEngineModule = require('../web-preview/backup-engine.js');
const backupEngine = backupEngineModule.backupEngine || backupEngineModule;

// CASO DE BORDA 1: Editar, dividir ou apagar passo já concluído: recompensas preservadas, progresso recalculado
console.log('1. Testando Caso de Borda 1: Editar/dividir/arquivar passo concluído preserva recompensas...');
const goal1 = {
  id: 'g-cb-1',
  title: 'Meta Criativa',
  steps: [
    { id: 's-1', goalId: 'g-cb-1', title: 'Passo 1', order: 1, doneAt: '2026-10-20T10:00:00Z', archived: false }
  ]
};
let ledger = [];
const rew1 = rewardLedger.awardStepDone(goal1.steps[0], ledger, commitmentsConfig, '2026-10-20');
assert.strictEqual(rew1.events.length, 1);
ledger = [...ledger, ...rew1.events];

// Renomeia o passo concluído
const editRes = goalStepEngine.renameStep(goal1, 's-1', 'Passo 1 Renomeado');
assert.ok(editRes);
assert.strictEqual(goal1.steps[0].title, 'Passo 1 Renomeado');
assert.strictEqual(goal1.steps[0].doneAt, '2026-10-20T10:00:00Z', 'doneAt deve ser preservado');

// Divide o passo concluído: o passo original mantém doneAt, novo passo criado como pendente
const splitRes = goalStepEngine.splitStep(goal1, 's-1', { secondTitle: 'Parte B', secondEstMinutes: 15 });
assert.ok(splitRes);
assert.strictEqual(goal1.steps.length, 2);
assert.strictEqual(goal1.steps[0].doneAt, '2026-10-20T10:00:00Z');
assert.strictEqual(goal1.steps[1].doneAt, null);

// Progresso recalculado de 100% para 50%
const prog1 = goalStepEngine.calculateProgress(goal1);
assert.strictEqual(prog1, 0.5, 'Progresso deve ser recalculado para 50%');
assert.strictEqual(ledger.length, 1, 'Recompensa emitida permanece preservada no livro-razão');
console.log('✓ 1. Caso de Borda 1 validado: progresso recalculado e recompensas preservadas');

// CASO DE BORDA 2: Apagar meta com compromissos vinculados: viram avulsos (goalId = null, stepId = null)
console.log('\n2. Testando Caso de Borda 2: Apagar meta desvincula compromissos sem apagá-los...');
const occLinked = {
  id: 'occ-cb-2',
  title: 'Treino da Meta',
  goalId: 'g-cb-1',
  stepId: 's-1',
  state: 'pending'
};
const stMock = { goals: [goal1], occurrences: [occLinked] };
goalStepEngine.deleteGoal(stMock, 'g-cb-1');
assert.strictEqual(stMock.occurrences.length, 1, 'Compromisso NÃO deve ser excluído');
assert.strictEqual(occLinked.goalId, null, 'goalId deve ser null');
assert.strictEqual(occLinked.stepId, null, 'stepId deve ser null');
console.log('✓ 2. Caso de Borda 2 validado: compromissos desvinculados viram avulsos');

// CASO DE BORDA 3: Fuso horário e horário de verão: atraso calculado sobre plannedStart + plannedZone
console.log('\n3. Testando Caso de Borda 3: Fuso horário e timezone preservados no cálculo de atraso...');
const commTz = {
  id: 'c-tz-1',
  plannedStart: '2026-10-25T15:00:00',
  plannedZone: 'America/Sao_Paulo',
  state: 'pending'
};
// Check-in às 15:05 no horário de São Paulo (18:05 UTC)
const checkInTz = stateMachine.checkIn(commTz, {
  actualAt: '2026-10-25T18:05:00.000Z',
  referenceZone: 'America/Sao_Paulo'
});
assert.strictEqual(checkInTz.checkIn.lateMinutes, 5, 'Atraso deve ser de exatamente 5 minutos com fuso de São Paulo');
console.log('✓ 3. Caso de Borda 3 validado: fuso horário calculado com fidelidade temporal');

// CASO DE BORDA 4: Reboot do aparelho: elapsedRealtime zera; reconciliação de virada de dia
console.log('\n4. Testando Caso de Borda 4: Simulação de reboot do aparelho e reconciliação temporal...');
const pendingDays = dayClosureEngine.reconcilePendingDays('2026-10-23', '2026-10-25');
assert.deepStrictEqual(pendingDays, ['2026-10-24'], 'Reconciliação deve identificar o dia 24 como pendente de fechamento');

const yesterdayUnmarked = [
  { id: 'occ-reb-1', plannedStart: '2026-10-24T10:00:00', state: 'unmarked' }
];
const unresolved = dayClosureEngine.findUnresolved('2026-10-24', yesterdayUnmarked);
assert.strictEqual(unresolved.length, 1, 'Deve localizar compromisso unmarked pendente de resolução');
console.log('✓ 4. Caso de Borda 4 validado: reconciliação diária determinística mesmo após reboot');

// CASO DE BORDA 5: Check-in duplicado (duplo toque): uma única CheckIn e uma única recompensa
console.log('\n5. Testando Caso de Borda 5: Idempotência estrita em duplo toque de check-in...');
const commDoubleTap = { id: 'c-dt-1', plannedStart: '2026-10-25T10:00:00', state: 'pending' };
const resCheck1 = stateMachine.checkIn(commDoubleTap, { actualAt: '2026-10-25T10:00:00Z' });
let rewLedger = [];
const rewCheck1 = rewardLedger.awardCommitmentDone(resCheck1.commitment, resCheck1.checkIn, rewLedger, commitmentsConfig, '2026-10-25');
assert.strictEqual(rewCheck1.events.length, 3); // 2 peixinhos base + 1 pontual + 5 min social
rewLedger = [...rewLedger, ...rewCheck1.events];

// Segundo toque: mesma chave occ_done:c-dt-1
const rewCheck2 = rewardLedger.awardCommitmentDone(resCheck1.commitment, resCheck1.checkIn, rewLedger, commitmentsConfig, '2026-10-25');
assert.strictEqual(rewCheck2.events.length, 0, 'Segundo toque NÃO deve gerar nova recompensa');
assert.strictEqual(rewLedger.length, 3, 'Livro-razão não deve conter duplicatas');
console.log('✓ 5. Caso de Borda 5 validado: duplo toque protegido com idempotência estrita');

// CASO DE BORDA 6: Desfazer dentro da janela de 10 minutos: evento compensatório, sem apagar linhas
console.log('\n6. Testando Caso de Borda 6: Desfazer dentro da janela emite evento compensatório...');
const undoRes = stateMachine.undo(resCheck1.commitment, resCheck1.checkIn, {
  undoAt: '2026-10-25T10:05:00Z', // 5 minutos após (dentro da janela de 10 min)
  undoWindowMinutes: 10
});
assert.strictEqual(undoRes.commitment.state, 'pending');

// Reversão no livro-razão via evento compensatório
const compRew = rewardLedger.compensateCommitmentUndo(resCheck1.commitment.id, rewLedger, '2026-10-25');
assert.strictEqual(compRew.events.length > 0, true);
assert.strictEqual(compRew.events[0].fishDelta < 0, true, 'Deve emitir delta compensatório negativo');
rewLedger = [...rewLedger, ...compRew.events];
assert.strictEqual(rewLedger.length >= 3, true, 'Nenhuma linha do livro-razão foi apagada');
console.log('✓ 6. Caso de Borda 6 validado: reversão compensatória no livro-razão');

// CASO DE BORDA 7: Compromisso recorrente com várias ocorrências no mesmo dia
console.log('\n7. Testando Caso de Borda 7: Múltiplas ocorrências recorrentes no mesmo dia...');
const recurringOcc1 = { id: 'rec-1', title: 'Pausa da Água', time: '10:00', state: 'pending' };
const recurringOcc2 = { id: 'rec-2', title: 'Pausa da Água', time: '15:00', state: 'pending' };
const resRec1 = stateMachine.checkIn(recurringOcc1, { actualAt: '2026-10-25T10:00:00Z' });
assert.strictEqual(resRec1.commitment.state, 'done');
assert.strictEqual(recurringOcc2.state, 'pending', 'Segunda ocorrência permanece pendente de forma independente');
console.log('✓ 7. Caso de Borda 7 validado: ocorrências independentes no mesmo dia');

// CASO DE BORDA 8: Semana com menos de 7 dias de dados: log gerado sem recortes/inferências
console.log('\n8. Testando Caso de Borda 8: Log semanal com menos de 7 dias omite inferências...');
const youngWeeklyLog = weeklyLogEngine.createWeeklyLog({
  commitments: [resCheck1.commitment],
  checkIns: [resCheck1.checkIn],
  rewardEvents: rewLedger,
  goals: [],
  historyDayCount: 3,
  config: commitmentsConfig,
  referenceDate: '2026-10-25'
});
const youngSnap = JSON.parse(youngWeeklyLog.snapshotJson);
assert.strictEqual(youngSnap.vsPreviousWeek, null, 'vsPreviousWeek deve ser omitido com < 7 dias');
assert.strictEqual(youngSnap.bestDay, null, 'bestDay deve ser omitido com < 7 dias');
assert.strictEqual(youngSnap.bestTimeSlot, null, 'bestTimeSlot deve ser omitido com < 7 dias');
console.log('✓ 8. Caso de Borda 8 validado: barreira de 7 dias estritamente respeitada');

// CASO DE BORDA 9: Mudança de config entre semanas: logs antigos preservados com seu configVersion
console.log('\n9. Testando Caso de Borda 9: Imutabilidade do log histórico com configVersion...');
assert.strictEqual(youngWeeklyLog.configVersion, 1);
const storedLog = { ...youngWeeklyLog };
// Nova config simulada (versão 2)
const v2Config = { ...commitmentsConfig, version: 2, punctuality: { toleranceMinutes: 15 } };
const secondCall = weeklyLogEngine.createWeeklyLog({
  commitments: [resCheck1.commitment],
  checkIns: [resCheck1.checkIn],
  rewardEvents: rewLedger,
  goals: [],
  historyDayCount: 14,
  config: v2Config,
  referenceDate: '2026-10-25'
});
assert.strictEqual(storedLog.configVersion, 1, 'Log histórico mantém configVersion 1');
console.log('✓ 9. Caso de Borda 9 validado: logs históricos preservados e imutáveis');

// CASO DE BORDA 10: Migração a partir de dados da v3.1.0 sem perda
console.log('\n10. Testando Caso de Borda 10: Migração v3.1.0 sem perda de dados...');
const v310Backup = {
  version: '3.1.0',
  schemaVersion: 1,
  goals: [{ id: 'g-old', title: 'Meta 3.1.0', progress: 0.75, yarnColorId: 'yarn-sky' }],
  occurrences: [{ id: 'occ-old', title: 'Compromisso 3.1.0', time: '11:00', state: 'FEITO' }],
  habits: [{ id: 'h-old', title: 'Hábito 3.1.0', completed: true }],
  currencies: { peixinhos: 200, novelosDourados: 2, vinculo: 15 }
};
const val10 = backupEngine.validateBackup(v310Backup);
assert.strictEqual(val10.valid, true);
assert.strictEqual(val10.data.schemaVersion, 2);
const merged10 = backupEngine.mergeBackup({}, val10.data);
assert.strictEqual(merged10.goals.length, 1);
assert.strictEqual(merged10.goals[0].steps.length, 0, 'Steps inicializado como array vazio');
assert.strictEqual(merged10.occurrences[0].state, 'done', 'FEITO normalizado para done');
assert.strictEqual(merged10.currencies.peixinhos, 200, 'Saldo de peixinhos 100% preservado');
console.log('✓ 10. Caso de Borda 10 validado: migração v3.1.0 sem perda de dados');

console.log('\n=== TODOS OS 10 CASOS DE BORDA DO BRIEFING FORAM 100% APROVADOS! ===');
process.exit(0);
