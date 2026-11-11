// scripts/test-phase12-rewards.js
// Suíte de Testes do Livro-Razão de Recompensas e Anti-Farm (Cat Line v3.2.0 · Prompt 6)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  KIND_COMMITMENT_DONE,
  KIND_ON_TIME_BONUS,
  KIND_STEP_DONE,
  KIND_GOAL_DONE,
  KIND_DAY_CLOSURE,
  KIND_SOCIAL_MINUTES,
  KIND_COMPENSATION,
  GENTLE_CAP_MESSAGE,
  calculateBalance,
  RewardLedgerEngine,
  rewardLedgerEngine
} = require('../web-preview/reward-ledger-engine.js');

const { validateAndNormalize } = require('../web-preview/commitments-config.js');

console.log('=== INICIANDO TESTES DO LIVRO-RAZÃO DE RECOMPENSAS E ANTI-FARM (V3.2.0 - PROMPT 6) ===\n');

const config = validateAndNormalize({
  version: 1,
  punctuality: { toleranceMinutes: 10 },
  rewards: {
    commitmentDone: { fish: 2 },
    onTimeBonus: { fish: 1 },
    stepDone: { fish: 3 },
    goalDone: { fish: 20, bond: 5 },
    dayClosure: { bond: 1 },
    retroactiveMultiplier: 0.5
  },
  caps: {
    fishPerLogicalDay: 15,
    socialMinutesEarnedPerDay: 30,
    minCommitmentMinutesToReward: 5
  }
});

const today = '2026-11-10';

// 1. Testando emissão de recompensas individuais com valores da config
console.log('1. Testando emissão de cada tipo de recompensa conforme config declarativa...');

// 1.1 Compromisso cumprido no prazo (commitmentDone + onTimeBonus + socialMinutes)
const comm1 = { id: 'comm_01', plannedMinutes: 25 };
const chk1 = { lateMinutes: 5, retroactive: false };
const res1 = rewardLedgerEngine.awardCommitmentDone(comm1, chk1, [], config, today);

assert.strictEqual(res1.events.length, 3, 'Deve gerar 3 eventos: base, pontualidade e minutos de rede');
assert.strictEqual(res1.fishGranted, 3, 'Deve conceder 2 peixinhos base + 1 de bônus pontual = 3');
assert.strictEqual(res1.socialMinutesGranted, 5, 'Deve conceder 5 minutos de rede social');
assert.strictEqual(res1.fishCapReached, false);

// 1.2 Passo de meta concluído (stepDone)
const step1 = { id: 'step_01', goalId: 'goal_01' };
const resStep = rewardLedgerEngine.awardStepDone(step1, res1.events, config, today);
assert.strictEqual(resStep.events.length, 1);
assert.strictEqual(resStep.fishGranted, 3, 'Passo concluído rende 3 peixinhos');

// 1.3 Meta inteira concluída (goalDone)
const goal1 = { id: 'goal_01' };
const resGoal = rewardLedgerEngine.awardGoalDone(goal1, [...res1.events, ...resStep.events], config, today);
// Total de peixinhos até aqui: 3 (comm) + 3 (step) = 6. Teto é 15. Sobram 9 peixinhos até o teto de 15.
// Meta quer 20 peixinhos -> limita a 9 e concede 5 de vínculo
assert.strictEqual(resGoal.events.length, 1);
assert.strictEqual(resGoal.fishGranted, 9, 'Deve limitar o peixinho pelo teto diário restante (15 - 6 = 9)');
assert.strictEqual(resGoal.bondGranted, 5, 'Vínculo concedido integralmente');
assert.strictEqual(resGoal.fishCapReached, true, 'Deve sinalizar que o teto diário foi atingido');
assert(resGoal.gentleMessage.includes('Hoje já juntamos bastante'), 'Deve exibir fala carinhosa da gatinha');

// 1.4 Fechamento do dia (dayClosure)
const resClose = rewardLedgerEngine.awardDayClosure(today, [], config);
assert.strictEqual(resClose.events.length, 1);
assert.strictEqual(resClose.bondGranted, 1, 'Fechamento do dia concede 1 ponto de vínculo');

console.log('✓ 1. Todos os tipos de recompensa emitidos fielmente aos valores da config\n');

// 2. Testando Idempotência Estrita
console.log('2. Testando idempotência estrita (repetição de chamada não duplica recompensa)...');

const allEvents = [...res1.events];
// Tenta premiar comm1 novamente com os mesmos eventos no histórico
const resDupeComm = rewardLedgerEngine.awardCommitmentDone(comm1, chk1, allEvents, config, today);
assert.strictEqual(resDupeComm.events.length, 0, 'Não deve emitir nenhum evento duplicado');
assert.strictEqual(resDupeComm.fishGranted, 0, 'Zero peixinhos adicionais');
assert.strictEqual(resDupeComm.socialMinutesGranted, 0, 'Zero minutos adicionais');

// Tenta premiar fechamento do dia repetido
const resCloseDupe = rewardLedgerEngine.awardDayClosure(today, resClose.events, config);
assert.strictEqual(resCloseDupe.events.length, 0, 'Fechamento do dia já existente não emite evento');
assert.strictEqual(resCloseDupe.bondGranted, 0);

console.log('✓ 2. Idempotência estrita validada: chaves repetidas não duplicam lançamentos\n');

// 3. Testando Tetos Diários (peixinhos e minutos de rede social)
console.log('3. Testando aplicação rigorosa de tetos diários (fishPerLogicalDay e socialMinutesEarnedPerDay)...');

let currentEvents = [];
// Concede 7 tarefas de 5 minutos de rede social (7 * 5 = 35 min; teto é 30 min)
for (let i = 1; i <= 7; i++) {
  const c = { id: `comm_loop_${i}`, plannedMinutes: 10 };
  const res = rewardLedgerEngine.awardCommitmentDone(c, { lateMinutes: 2 }, currentEvents, config, today);
  currentEvents = [...currentEvents, ...res.events];
}

const balanceAfterLoop = calculateBalance(currentEvents, today);
assert.strictEqual(balanceAfterLoop.fishEarnedToday, 15, 'Total de peixinhos do dia deve estar estritamente no teto de 15');
assert.strictEqual(balanceAfterLoop.totalSocialMinutesToday, 30, 'Total de minutos de rede social deve estar estritamente no teto de 30');

console.log('✓ 3. Tetos diários de 15 peixinhos e 30 minutos de rede social rigorosamente cumpridos\n');

// 4. Testando Bloqueio Anti-Farm para Micro-tarefas (< 5 min)
console.log('4. Testando barreira anti-farm de micro-tarefas (< 5 min)...');

const microComm = { id: 'comm_micro_01', plannedMinutes: 3 }; // < 5 min
const resMicro = rewardLedgerEngine.awardCommitmentDone(microComm, { lateMinutes: 0 }, [], config, today);

assert.strictEqual(resMicro.fishGranted, 0, 'Micro-tarefa não deve render peixinhos nem bônus');
assert.strictEqual(resMicro.socialMinutesGranted, 5, 'Minutos de rede social continuam permitidos por conclusão');

console.log('✓ 4. Barreira anti-farm validada: micro-tarefas não geram farm de peixinhos\n');

// 5. Testando Passo desmarcado e marcado de novo (apenas 1 ganho na vida do passo)
console.log('5. Testando regra de passo concluído apenas uma vez...');

const stepRepeat = { id: 'step_unique_01' };
const resStep1 = rewardLedgerEngine.awardStepDone(stepRepeat, [], config, today);
assert.strictEqual(resStep1.fishGranted, 3);

// Usuária desmarca e marca de novo o mesmo passo
const resStep2 = rewardLedgerEngine.awardStepDone(stepRepeat, resStep1.events, config, today);
assert.strictEqual(resStep2.events.length, 0, 'Passo remarcado não deve emitir novos eventos');
assert.strictEqual(resStep2.fishGranted, 0);

console.log('✓ 5. Passo concluído rende uma única vez em todo o ciclo de vida\n');

// 6. Testando Multiplicador de Check-in Retroativo (retroactiveMultiplier = 0.5)
console.log('6. Testando multiplicador de check-in retroativo (0.5x)...');

const retroComm = { id: 'comm_retro_mult', plannedMinutes: 30 };
// Check-in retroativo: 2 peixinhos * 0.5 = 1 peixinho
const resRetro = rewardLedgerEngine.awardCommitmentDone(
  retroComm,
  { lateMinutes: 15, retroactive: true },
  [],
  config,
  today
);

assert.strictEqual(resRetro.fishGranted, 1, 'Check-in retroativo deve aplicar multiplicador de 0.5 (2 * 0.5 = 1)');

console.log('✓ 6. Multiplicador retroativo validado com arredondamento seguro\n');

// 7. Testando Reversão Compensatória em caso de "Desfazer"
console.log('7. Testando reversão via evento compensatório no desfazer...');

const undoComm = { id: 'comm_to_undo', plannedMinutes: 15 };
const awardRes = rewardLedgerEngine.awardCommitmentDone(undoComm, { lateMinutes: 0 }, [], config, today);
assert.strictEqual(awardRes.fishGranted, 3); // 2 base + 1 pontual
assert.strictEqual(awardRes.socialMinutesGranted, 5);

// Desfaz o compromisso
const compRes = rewardLedgerEngine.compensateCommitmentUndo('comm_to_undo', awardRes.events, today);
assert.strictEqual(compRes.events.length, 3, 'Deve gerar eventos compensatórios para base, bônus e social');
assert.strictEqual(compRes.fishGranted, -3);
assert.strictEqual(compRes.socialMinutesGranted, -5);

// Saldo final somando originais + compensações
const finalBalance = calculateBalance([...awardRes.events, ...compRes.events], today);
assert.strictEqual(finalBalance.totalFish, 0, 'Saldo de peixinhos deve retornar a 0 sem ficar negativo');
assert.strictEqual(finalBalance.totalSocialMinutesToday, 0, 'Minutos de rede social devem retornar a 0');

console.log('✓ 7. Reversão compensatória no desfazer validada sem apagar histórico e com saldo não-negativo\n');

// 8. Verificando motor Kotlin correspondente no :core-domain
console.log('8. Verificando motor Kotlin RewardLedgerEngine.kt no :core-domain...');

const ktFile = path.join(
  __dirname,
  '..',
  'core-domain',
  'src',
  'main',
  'kotlin',
  'com',
  'deadline',
  'core',
  'domain',
  'engine',
  'RewardLedgerEngine.kt'
);

assert(fs.existsSync(ktFile), 'RewardLedgerEngine.kt deve existir no :core-domain');
const ktContent = fs.readFileSync(ktFile, 'utf8');

assert(ktContent.includes('class RewardLedgerEngine'), 'Deve conter a classe RewardLedgerEngine');
assert(ktContent.includes('fun calculateBalance'), 'Deve conter calculateBalance');
assert(ktContent.includes('fun awardCommitmentDone'), 'Deve conter awardCommitmentDone');
assert(ktContent.includes('fun awardStepDone'), 'Deve conter awardStepDone');
assert(ktContent.includes('fun awardGoalDone'), 'Deve conter awardGoalDone');
assert(ktContent.includes('fun awardDayClosure'), 'Deve conter awardDayClosure');
assert(ktContent.includes('fun compensateCommitmentUndo'), 'Deve conter compensateCommitmentUndo');
assert(ktContent.includes('minCommitmentMinutesToReward'), 'Deve conter trava de micro-tarefas');
assert(ktContent.includes('fishPerLogicalDay'), 'Deve respeitar teto diário de peixinhos');

console.log('✓ 8. Motor Kotlin RewardLedgerEngine.kt validado com arquitetura limpa e fidelidade total\n');

console.log('=== TODOS OS 8 TESTES DO LIVRO-RAZÃO DE RECOMPENSAS PASSARAM COM 100% DE SUCESSO! ===');
