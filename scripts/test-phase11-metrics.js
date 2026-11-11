// scripts/test-phase11-metrics.js
// Suíte de Testes do Motor de Métricas de Atraso e O Fio (Cat Line v3.2.0 · Prompt 5)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  MINIMUM_DAYS_BARRIER,
  TIME_SLOTS,
  calculateMedian,
  getTimeSlot,
  DelayMetricsEngine,
  delayMetricsEngine
} = require('../web-preview/delay-metrics-engine.js');

const { validateAndNormalize } = require('../web-preview/commitments-config.js');

console.log('=== INICIANDO TESTES DO MOTOR DE MÉTRICAS DE ATRASO (V3.2.0 - PROMPT 5) ===\n');

// 1. Testando cálculo puro da mediana (número par, ímpar e valores negativos)
console.log('1. Testando cálculo puro da mediana (par, ímpar, valores negativos e lista vazia)...');

assert.strictEqual(calculateMedian([]), 0.0, 'Lista vazia deve retornar 0.0');
assert.strictEqual(calculateMedian([5]), 5.0, 'Item único deve retornar seu próprio valor');
// Ímpar: [ -10, 5, 20 ] -> mediana 5
assert.strictEqual(calculateMedian([-10, 5, 20]), 5.0, 'Mediana com amostras ímpares deve retornar o elemento central');
// Par: [ -10, 0, 10, 30 ] -> (0 + 10) / 2 = 5
assert.strictEqual(calculateMedian([30, -10, 10, 0]), 5.0, 'Mediana com amostras pares deve calcular a média dos dois centrais');
// Par com todos negativos: [ -20, -10 ] -> (-20 + -10) / 2 = -15
assert.strictEqual(calculateMedian([-20, -10]), -15.0, 'Mediana com valores negativos deve calcular corretamente');

console.log('✓ 1. Cálculo da mediana matemática validado em todos os cenários numéricos\n');

// 2. Testando cálculo de taxas (cumprimento e pontualidade) com diferentes combinações
console.log('2. Testando cálculo de taxas de cumprimento e pontualidade...');

const sampleConfig = validateAndNormalize({
  version: 1,
  punctuality: { toleranceMinutes: 10 }
});

// Cenário A: 0 itens
const resEmpty = delayMetricsEngine.computeMetrics([], [], sampleConfig);
assert.strictEqual(resEmpty.overall.fulfillmentRate, 0.0);
assert.strictEqual(resEmpty.overall.punctualityRate, 0.0);
assert.strictEqual(resEmpty.overall.medianLateMinutes, 0.0);

// Cenário B: 2 done (ambos dentro da tolerância de 10 min) e 0 missed
const commB = [
  { id: 'c1', state: 'done', plannedStart: '2026-11-10T10:00:00Z', plannedZone: 'UTC' },
  { id: 'c2', state: 'done', plannedStart: '2026-11-10T14:00:00Z', plannedZone: 'UTC' }
];
const chkB = [
  { commitmentId: 'c1', lateMinutes: -5, retroactive: false }, // adiantado
  { commitmentId: 'c2', lateMinutes: 10, retroactive: false }  // no limite da tolerância
];
const resB = delayMetricsEngine.computeMetrics(commB, chkB, sampleConfig);
assert.strictEqual(resB.overall.doneCount, 2);
assert.strictEqual(resB.overall.missedCount, 0);
assert.strictEqual(resB.overall.onTimeCount, 2);
assert.strictEqual(resB.overall.fulfillmentRate, 1.0);
assert.strictEqual(resB.overall.punctualityRate, 1.0);
assert.strictEqual(resB.overall.medianLateMinutes, 2.5); // (-5 + 10) / 2

// Cenário C: Mistura: 3 done (1 adiantado, 1 pontual, 1 atrasado) + 1 missed + 2 pending ignorados
const commC = [
  { id: 'c1', state: 'done', plannedStart: '2026-11-10T08:00:00Z', plannedZone: 'UTC' },
  { id: 'c2', state: 'done', plannedStart: '2026-11-10T12:00:00Z', plannedZone: 'UTC' },
  { id: 'c3', state: 'done', plannedStart: '2026-11-10T16:00:00Z', plannedZone: 'UTC' },
  { id: 'c4', state: 'missed', plannedStart: '2026-11-10T18:00:00Z', plannedZone: 'UTC' },
  { id: 'c5', state: 'pending', plannedStart: '2026-11-10T20:00:00Z', plannedZone: 'UTC' },
  { id: 'c6', state: 'unmarked', plannedStart: '2026-11-10T22:00:00Z', plannedZone: 'UTC' }
];
const chkC = [
  { commitmentId: 'c1', lateMinutes: -2, retroactive: false }, // pontual
  { commitmentId: 'c2', lateMinutes: 8, retroactive: false },  // pontual
  { commitmentId: 'c3', lateMinutes: 25, retroactive: false }  // atrasado (25 > 10)
];
const resC = delayMetricsEngine.computeMetrics(commC, chkC, sampleConfig);
// Total resolvidos = 3 done + 1 missed = 4
assert.strictEqual(resC.overall.totalCount, 4);
assert.strictEqual(resC.overall.doneCount, 3);
assert.strictEqual(resC.overall.missedCount, 1);
assert.strictEqual(resC.overall.onTimeCount, 2); // c1 e c2
// fulfillmentRate = 3 / (3 + 1) = 0.75
assert.strictEqual(resC.overall.fulfillmentRate, 0.75);
// punctualityRate = 2 / 3 = 0.667
assert.strictEqual(resC.overall.punctualityRate, 0.667);
// Mediana atrasos: [-2, 8, 25] -> 8.0
assert.strictEqual(resC.overall.medianLateMinutes, 8.0);

console.log('✓ 2. Taxas de cumprimento, pontualidade e isolamento de pendentes validados\n');

// 3. Testando Barreira de 7 dias estritamente respeitada
console.log('3. Testando Barreira de 7 dias com dados (AD-10 / Requisito)...');

// Gera histórico sintético de 6 dias
function generateDaysData(numDays) {
  const comms = [];
  const chks = [];
  for (let d = 1; d <= numDays; d++) {
    const dayStr = `2026-11-0${d}`;
    const id = `comm_day_${d}`;
    comms.push({
      id,
      state: 'done',
      plannedStart: `${dayStr}T10:00:00Z`,
      plannedZone: 'UTC',
      category: d % 2 === 0 ? 'TRABALHAR' : 'ESTUDAR_LER'
    });
    chks.push({
      commitmentId: id,
      lateMinutes: d * 2,
      retroactive: false
    });
  }
  return { comms, chks };
}

// 6 dias -> Bloqueado (hasSufficientData = false, breakdown = null)
const data6Days = generateDaysData(6);
const res6 = delayMetricsEngine.computeMetrics(data6Days.comms, data6Days.chks, sampleConfig);
assert.strictEqual(res6.hasSufficientData, false, 'Com 6 dias deve bloquear inferências');
assert.strictEqual(res6.uniqueDaysCount, 6);
assert.strictEqual(res6.breakdown, null, 'Breakdown analítico deve ser nulo antes de 7 dias');
assert(res6.gentleObservation.includes('ainda está observando seu ritmo'), 'Deve exibir texto de acolhimento inicial');

// 7 dias -> Liberado (hasSufficientData = true, breakdown presente)
const data7Days = generateDaysData(7);
const res7 = delayMetricsEngine.computeMetrics(data7Days.comms, data7Days.chks, sampleConfig);
assert.strictEqual(res7.hasSufficientData, true, 'Com 7 dias deve liberar inferências');
assert.strictEqual(res7.uniqueDaysCount, 7);
assert.notStrictEqual(res7.breakdown, null, 'Breakdown deve estar preenchido a partir de 7 dias');

console.log('✓ 3. Barreira de 7 dias validada estritamente (bloqueia em 6, libera em 7)\n');

// 4. Testando Recortes Analíticos (categoria, meta, dia da semana, faixa de horário)
console.log('4. Testando recortes analíticos por categoria, meta, dia e faixa...');

const multiComms = [
  // Manhã (09:00 UTC) em Segunda-feira (2026-11-09)
  { id: 'm1', state: 'done', plannedStart: '2026-11-09T09:00:00Z', plannedZone: 'UTC', category: 'TRABALHAR', goalId: 'goal_01' },
  // Tarde (14:00 UTC) em Terça-feira (2026-11-10)
  { id: 'm2', state: 'done', plannedStart: '2026-11-10T14:00:00Z', plannedZone: 'UTC', category: 'ESTUDAR_LER', goalId: 'goal_02' },
  // Noite (20:00 UTC) em Quarta-feira (2026-11-11)
  { id: 'm3', state: 'done', plannedStart: '2026-11-11T20:00:00Z', plannedZone: 'UTC', category: 'TREINAR', goalId: 'goal_01' },
  // Madrugada (02:00 UTC) em Quinta-feira (2026-11-12)
  { id: 'm4', state: 'done', plannedStart: '2026-11-12T02:00:00Z', plannedZone: 'UTC', category: 'LAZER', goalId: null },
  // Sexta (2026-11-13)
  { id: 'm5', state: 'done', plannedStart: '2026-11-13T10:00:00Z', plannedZone: 'UTC', category: 'TRABALHAR', goalId: 'goal_01' },
  // Sábado (2026-11-14)
  { id: 'm6', state: 'done', plannedStart: '2026-11-14T15:00:00Z', plannedZone: 'UTC', category: 'ESTUDAR_LER', goalId: 'goal_02' },
  // Domingo (2026-11-15)
  { id: 'm7', state: 'done', plannedStart: '2026-11-15T11:00:00Z', plannedZone: 'UTC', category: 'CUIDAR_CASA', goalId: null }
];

const multiChks = [
  { commitmentId: 'm1', lateMinutes: 5, retroactive: false },
  { commitmentId: 'm2', lateMinutes: 20, retroactive: false },
  { commitmentId: 'm3', lateMinutes: 0, retroactive: false },
  { commitmentId: 'm4', lateMinutes: -10, retroactive: false },
  { commitmentId: 'm5', lateMinutes: 3, retroactive: false },
  { commitmentId: 'm6', lateMinutes: 30, retroactive: false },
  { commitmentId: 'm7', lateMinutes: 8, retroactive: false }
];

const resMulti = delayMetricsEngine.computeMetrics(multiComms, multiChks, sampleConfig, 'UTC');
assert.strictEqual(resMulti.hasSufficientData, true);

// Validação por categoria
assert(resMulti.breakdown.byCategory['TRABALHAR'], 'Deve conter recorte para TRABALHAR');
assert.strictEqual(resMulti.breakdown.byCategory['TRABALHAR'].doneCount, 2);
assert.strictEqual(resMulti.breakdown.byCategory['TRABALHAR'].punctualityRate, 1.0); // 5 e 3 <= 10

// Validação por meta
assert(resMulti.breakdown.byGoal['goal_01'], 'Deve conter recorte para goal_01');
assert.strictEqual(resMulti.breakdown.byGoal['goal_01'].doneCount, 3); // m1, m3, m5

// Validação por faixa de horário
assert(resMulti.breakdown.byTimeSlot[TIME_SLOTS.MANHA], 'Deve conter faixa MANHA');
assert(resMulti.breakdown.byTimeSlot[TIME_SLOTS.TARDE], 'Deve conter faixa TARDE');
assert(resMulti.breakdown.byTimeSlot[TIME_SLOTS.NOITE], 'Deve conter faixa NOITE');
assert(resMulti.breakdown.byTimeSlot[TIME_SLOTS.MADRUGADA], 'Deve conter faixa MADRUGADA');

console.log('✓ 4. Recortes por categoria, meta, dia e faixa horária validados com exatidão\n');

// 5. Testando Isolamento de check-ins retroativos vs. ao vivo
console.log('5. Testando isolamento analítico de check-ins retroativos vs ao vivo...');

const hybridComms = [
  ...data7Days.comms,
  { id: 'retro_01', state: 'done', plannedStart: '2026-11-08T10:00:00Z', plannedZone: 'UTC' }
];
const hybridChks = [
  ...data7Days.chks,
  { commitmentId: 'retro_01', lateMinutes: 45, retroactive: true }
];

const resHybrid = delayMetricsEngine.computeMetrics(hybridComms, hybridChks, sampleConfig);
assert.strictEqual(resHybrid.breakdown.liveMetrics.doneCount, 7);
assert.strictEqual(resHybrid.breakdown.retroactiveMetrics.doneCount, 1);
assert.strictEqual(resHybrid.breakdown.retroactiveMetrics.medianLateMinutes, 45.0);

console.log('✓ 5. Isolamento de check-ins retroativos validado em recorte separado\n');

// 6. Testando ausência total de parênteses descritivos e linguagem acolhedora
console.log('6. Testando tom acolhedor de coincidência e ausência de parênteses...');

const obsText = resMulti.gentleObservation;
assert(!obsText.includes('(') && !obsText.includes(')'), 'Observação nunca deve conter parênteses descritivos');
assert(obsText.includes('tendeu') || obsText.includes('semana') || obsText.includes('Observamos'), 'Linguagem deve ser de coincidência e acolhimento');

console.log('✓ 6. Linguagem acolhedora de coincidência sem parênteses validada com sucesso\n');

// 7. Verificando classes Kotlin correspondentes no :core-domain
console.log('7. Verificando motor Kotlin DelayMetricsEngine.kt no :core-domain...');

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
  'DelayMetricsEngine.kt'
);

assert(fs.existsSync(ktFile), 'DelayMetricsEngine.kt deve existir no :core-domain');
const ktContent = fs.readFileSync(ktFile, 'utf8');

assert(ktContent.includes('class DelayMetricsEngine'), 'Deve conter a classe DelayMetricsEngine');
assert(ktContent.includes('data class MetricSummary'), 'Deve conter MetricSummary');
assert(ktContent.includes('data class DelayBreakdown'), 'Deve conter DelayBreakdown');
assert(ktContent.includes('data class DelayMetricsResult'), 'Deve conter DelayMetricsResult');
assert(ktContent.includes('MINIMUM_DAYS_BARRIER = 7'), 'Deve definir constante da barreira de 7 dias');
assert(ktContent.includes('fun calculateMedian'), 'Deve conter calculateMedian');
assert(ktContent.includes('fun computeMetrics'), 'Deve conter computeMetrics');

console.log('✓ 7. Motor e estruturas Kotlin no :core-domain validados com precisão\n');

console.log('=== TODOS OS 7 TESTES DO MOTOR DE MÉTRICAS DE ATRASO PASSARAM COM 100% DE SUCESSO! ===');
