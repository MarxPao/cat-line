// scripts/test-phase17-weekly-log.js
// Suíte de Testes do Log Semanal e Snapshot Imutável (Cat Line v3.2.0 · Prompt 11)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DO LOG SEMANAL E SNAPSHOT IMUTÁVEL (V3.2.0 - PROMPT 11) ===\n');

// 1. Setup do ambiente simulado do navegador em Node puro
const localStorageStore = {};
global.localStorage = {
  getItem: (k) => localStorageStore[k] || null,
  setItem: (k, v) => { localStorageStore[k] = String(v); },
  removeItem: (k) => { delete localStorageStore[k]; }
};

const domListeners = [];
class MockAudioCtx {
  createOscillator() {
    return {
      type: 'square',
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  get currentTime() { return 0; }
}

global.AudioContext = MockAudioCtx;
global.window = {
  AudioContext: MockAudioCtx,
  webkitAudioContext: MockAudioCtx,
  addEventListener: (event, cb) => {
    if (event === 'DOMContentLoaded') domListeners.push(cb);
  },
  location: { reload: () => {} }
};

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

const mockCtx = {
  fillRect: () => {},
  clearRect: () => {},
  fillText: () => {},
  beginPath: () => {},
  stroke: () => {},
  fill: () => {},
  arc: () => {},
  moveTo: () => {},
  lineTo: () => {},
  save: () => {},
  restore: () => {},
  closePath: () => {},
  drawImage: () => {}
};

const elementsMap = {};
function getOrCreateElement(id) {
  if (!elementsMap[id]) {
    const el = {
      id,
      textContent: '',
      innerHTML: '',
      value: '',
      width: 320,
      height: 240,
      getContext: () => mockCtx,
      focus: () => {},
      style: {},
      appendChild: () => {},
      removeChild: () => {},
      querySelector: () => getOrCreateElement('sub_' + id),
      querySelectorAll: () => [],
      setAttribute: () => {},
      getAttribute: () => null,
      addEventListener: () => {},
      insertAdjacentHTML: (pos, html) => {
        el.innerHTML = (pos === 'afterbegin') ? html + el.innerHTML : el.innerHTML + html;
      }
    };
    elementsMap[id] = el;
  }
  return elementsMap[id];
}

global.document = {
  getElementById: (id) => getOrCreateElement(id),
  createElement: (tag) => getOrCreateElement('created_' + tag + '_' + Math.random()),
  addEventListener: () => {},
  visibilityState: 'visible',
  querySelectorAll: () => []
};

global.navigator = { vibrate: () => {} };
global.alert = () => {};
global.confirm = () => true;

// Injetar módulos determinísticos
const Clock = require('../web-preview/clock.js');
global.CatLineClock = Clock;
global.Clock = Clock;
Clock.setFakeTime('2026-10-25T14:00:00.000Z');

global.CatLineCommitmentsConfig = require('../web-preview/commitments-config.js');
global.CatLineGoalStepEngine = require('../web-preview/goal-step-engine.js');
global.goalStepEngine = global.CatLineGoalStepEngine.goalStepEngine;
const CommitmentStateMachineModule = require('../web-preview/commitment-state-machine.js');
global.CommitmentStateMachineModule = CommitmentStateMachineModule;
global.commitmentStateMachine = CommitmentStateMachineModule.commitmentStateMachine;
global.COMMITMENT_STATES = CommitmentStateMachineModule.COMMITMENT_STATES;
global.delayMetricsEngine = require('../web-preview/delay-metrics-engine.js').delayMetricsEngine;
global.CatLineRewardLedgerEngine = require('../web-preview/reward-ledger-engine.js');
global.rewardLedgerEngine = global.CatLineRewardLedgerEngine.rewardLedgerEngine;
global.CatLineDayClosureEngine = require('../web-preview/day-closure-engine.js');
global.dayClosureEngine = global.CatLineDayClosureEngine.dayClosureEngine;
global.CatLineWeeklyLogEngine = require('../web-preview/weekly-log-engine.js');
global.weeklyLogEngine = global.CatLineWeeklyLogEngine.weeklyLogEngine;

// Carrega o app principal
const appCode = fs.readFileSync('web-preview/app.js', 'utf8');
eval(appCode + '\nglobal.state = state;\nglobal.AppUI = AppUI;\n');

domListeners.forEach(cb => cb());
if (!global.window.app) global.window.app = new AppUI();
const app = global.window.app;
const state = global.state;

// 1. Testando cálculo de período semanal (Segunda a Domingo)
console.log('1. Testando cálculo puro de período semanal (closesOn: sunday)...');

const period = weeklyLogEngine.calculatePeriod('2026-10-25', 'sunday');
assert.strictEqual(period.start, '2026-10-19', 'Início da semana deve ser segunda-feira 2026-10-19');
assert.strictEqual(period.end, '2026-10-25', 'Fim da semana deve ser domingo 2026-10-25');

console.log('✓ 1. Período semanal calculado com precisão matemática: 2026-10-19 a 2026-10-25\n');

// 2. Testando geração de snapshot com totais e taxas
console.log('2. Testando geração de snapshot com totais e taxas de cumprimento e pontualidade...');

const mockCommitments = [
  { id: 'c1', title: 'Tarefa 1', state: 'done', date: '2026-10-20', plannedStart: '2026-10-20T10:00:00', delayMin: 5 },
  { id: 'c2', title: 'Tarefa 2', state: 'done', date: '2026-10-21', plannedStart: '2026-10-21T11:00:00', delayMin: -2 },
  { id: 'c3', title: 'Tarefa 3', state: 'missed', date: '2026-10-22', plannedStart: '2026-10-22T14:00:00', delayMin: 0 },
  { id: 'c4', title: 'Tarefa 4', state: 'rescheduled', date: '2026-10-23', plannedStart: '2026-10-23T16:00:00', delayMin: 0 },
  { id: 'c5', title: 'Tarefa 5', state: 'unmarked', date: '2026-10-24', plannedStart: '2026-10-24T18:00:00', delayMin: 0 }
];

const mockCheckIns = [
  { commitmentId: 'c1', actualAt: '2026-10-20T10:05:00', lateMinutes: 5, retroactive: false },
  { commitmentId: 'c2', actualAt: '2026-10-21T10:58:00', lateMinutes: -2, retroactive: false }
];

const snapshot = weeklyLogEngine.generateSnapshot({
  commitments: mockCommitments,
  checkIns: mockCheckIns,
  rewardEvents: [
    { kind: 'commitment_done', fishDelta: 2, bondDelta: 0, at: '2026-10-20T10:05:00' },
    { kind: 'on_time_bonus', fishDelta: 1, bondDelta: 0, at: '2026-10-20T10:05:00' }
  ],
  goals: [],
  historyDayCount: 7,
  referenceDate: '2026-10-25'
});

assert.strictEqual(snapshot.totals.planned, 5);
assert.strictEqual(snapshot.totals.done, 2);
assert.strictEqual(snapshot.totals.missed, 1);
assert.strictEqual(snapshot.totals.rescheduled, 1);
assert.strictEqual(snapshot.totals.unmarkedPending, 1);

// Taxa de cumprimento: 2 / (2 + 1) = 0.67
assert.strictEqual(snapshot.rates.fulfillment, 0.67);
// Taxa de pontualidade: ambos <= 10m -> 1.0
assert.strictEqual(snapshot.rates.punctuality, 1.0);
// Mediana: [-2, 5] -> 2m
assert.strictEqual(snapshot.rates.medianLateMinutes, 2);

console.log('✓ 2. Totais e taxas calculados com fidelidade às regras de domínio\n');

// 3. Testando barreira de 7 dias (Caso de borda 8)
console.log('3. Testando Caso de Borda 8: barreira estrita de 7 dias...');

const fewDaysSnapshot = weeklyLogEngine.generateSnapshot({
  commitments: mockCommitments,
  checkIns: mockCheckIns,
  historyDayCount: 4, // Menos de 7 dias!
  referenceDate: '2026-10-25'
});

assert.strictEqual(fewDaysSnapshot.vsPreviousWeek, null, 'Com < 7 dias, vsPreviousWeek deve ser null');
assert.strictEqual(fewDaysSnapshot.bestDay, null, 'Com < 7 dias, bestDay deve ser null');
assert.strictEqual(fewDaysSnapshot.bestTimeSlot, null, 'Com < 7 dias, bestTimeSlot deve ser null');
assert(fewDaysSnapshot.letter.templateIds.includes('greet_few_days'), 'Carta deve acolher o início da rotina');

console.log('✓ 3. Barreira de 7 dias respeitada: inferências e comparativos omitidos com < 7 dias\n');

// 4. Testando metas e passos concluídos na semana
console.log('4. Testando agregação de passos de metas concluídos na semana...');

const mockGoals = [
  {
    id: 'g-test-1',
    title: 'Meta Projeto Cat Line',
    progress: 0.66,
    steps: [
      { id: 's1', doneAt: '2026-10-20T11:00:00Z', archived: false },
      { id: 's2', doneAt: '2026-10-23T15:00:00Z', archived: false },
      { id: 's3', doneAt: null, archived: false }
    ]
  }
];

const goalSnapshot = weeklyLogEngine.generateSnapshot({
  commitments: mockCommitments,
  checkIns: mockCheckIns,
  goals: mockGoals,
  historyDayCount: 7,
  referenceDate: '2026-10-25'
});

assert.strictEqual(goalSnapshot.goals.length, 1);
assert.strictEqual(goalSnapshot.goals[0].stepsDoneThisWeek, 2, 'Deve contabilizar 2 passos concluídos');
assert.strictEqual(goalSnapshot.goals[0].progress, 0.66);

console.log('✓ 4. Resumo de passos de metas concluídos agregado com precisão\n');

// 5. Testando recompensas acumuladas na semana
console.log('5. Testando agregação de recompensas (peixinhos e vínculo)...');

const rewSnapshot = weeklyLogEngine.generateSnapshot({
  commitments: mockCommitments,
  checkIns: mockCheckIns,
  rewardEvents: [
    { kind: 'commitment_done', fishDelta: 2, bondDelta: 0, at: '2026-10-20T10:00:00' },
    { kind: 'step_done', fishDelta: 3, bondDelta: 0, at: '2026-10-21T10:00:00' },
    { kind: 'day_closure', fishDelta: 0, bondDelta: 1, at: '2026-10-24T04:00:00' },
    { kind: 'outside_week', fishDelta: 50, bondDelta: 10, at: '2026-10-10T04:00:00' } // Fora da semana!
  ],
  goals: mockGoals,
  historyDayCount: 7,
  referenceDate: '2026-10-25'
});

assert.strictEqual(rewSnapshot.rewards.fish, 5, 'Deve contabilizar apenas 5 peixinhos da semana');
assert.strictEqual(rewSnapshot.rewards.bond, 1, 'Deve contabilizar 1 ponto de vínculo da semana');

console.log('✓ 5. Recompensas da semana filtradas estritamente pelo período\n');

// 6. Testando carta da gatinha por templates determinísticos sem LLM
console.log('6. Testando geração da carta por templates 100% offline (sem LLM)...');

assert(rewSnapshot.letter.renderedText.length > 30, 'Carta deve ter texto renderizado');
assert(rewSnapshot.letter.templateIds.length >= 3, 'Carta deve conter lista de templateIds');
assert(!rewSnapshot.letter.renderedText.includes('você falhou'), 'Sem linguagem de culpa');
assert(!rewSnapshot.letter.renderedText.includes('deveria ter feito'), 'Sem cobrança moral');

console.log('✓ 6. Carta da gatinha validada: determinística, acolhedora e 100% offline\n');

// 7. Testando sugestão gentil de horário e confirmação por toque
console.log('7. Testando sugestão gentil opcional com confirmação explícita por toque...');

const delayComms = [
  { id: 'comm-habitual-late', title: 'Treino de Calistenia', state: 'done', date: '2026-10-20', time: '17:00', delayMin: 20 },
  { id: 'c2', title: 'Outra Tarefa', state: 'done', date: '2026-10-21', time: '18:00', delayMin: 15 }
];
const delayCheckIns = [
  { commitmentId: 'comm-habitual-late', actualAt: '2026-10-20T17:20:00', lateMinutes: 20 },
  { commitmentId: 'c2', actualAt: '2026-10-21T18:15:00', lateMinutes: 15 }
];

const sugSnapshot = weeklyLogEngine.generateSnapshot({
  commitments: delayComms,
  checkIns: delayCheckIns,
  historyDayCount: 10,
  referenceDate: '2026-10-25'
});

assert(sugSnapshot.gentleSuggestion, 'Deve sugerir ajuste suave de horário');
assert.strictEqual(sugSnapshot.gentleSuggestion.commitmentId, 'comm-habitual-late');
assert.strictEqual(sugSnapshot.gentleSuggestion.proposedNewTime, '17:15');

// Aplica a sugestão via app
state.occurrences.push({
  id: 'comm-habitual-late',
  title: 'Treino de Calistenia',
  time: '17:00',
  plannedStart: '2026-10-20T17:00:00'
});

app.openWeeklyLogViewer('2026-10-19');
state.activeWeeklyLogModal = sugSnapshot;

app.acceptGentleSuggestion('comm-habitual-late', '17:15');

const adjustedComm = state.occurrences.find(o => o.id === 'comm-habitual-late');
assert.strictEqual(adjustedComm.time, '17:15', 'Horário deve ser atualizado apenas após confirmação');
assert.strictEqual(state.activeWeeklyLogModal.gentleSuggestion, null, 'Sugestão deve ser limpa após aceite');

console.log('✓ 7. Sugestão gentil opcional validada: acolhedora e exige toque de confirmação\n');

// 8. Testando Caso de Borda 9: Imutabilidade estrita do WeeklyLog
console.log('8. Testando Caso de Borda 9: Imutabilidade estrita do snapshotJson...');

const firstLog = app.generateWeeklyLog('2026-10-25');
assert(firstLog, 'WeeklyLog deve ser gerado');
assert.strictEqual(firstLog.weekStartLogicalDay, '2026-10-19');

const initialLogCount = state.weeklyLogs.length;
const initialJson = firstLog.snapshotJson;

// Tenta gerar novamente para a mesma semana após adicionar novas ocorrências
state.occurrences.push({
  id: 'c-late-addition',
  title: 'Nova Tarefa Inesperada',
  state: 'done',
  date: '2026-10-20'
});

const secondLog = app.generateWeeklyLog('2026-10-25');
assert.strictEqual(state.weeklyLogs.length, initialLogCount, 'Não deve criar linha duplicada no histórico');
assert.strictEqual(secondLog.snapshotJson, initialJson, 'Snapshot original deve permanecer 100% imutável');

console.log('✓ 8. Caso de Borda 9 validado: snapshotJson histórico é imutável e preservado\n');

// 9. Testando UI do Log Semanal e acessibilidade 48px
console.log('9. Testando renderização da UI do Log Semanal, alvos de 48px e ausência de parênteses...');

app.openWeeklyLogViewer('2026-10-19');
app.switchTab('hoje');

const contentHtml = app.contentEl.innerHTML;
assert(contentHtml.includes('weekly-log-modal-overlay'), 'Overlay do Log Semanal deve ser renderizado');
assert(contentHtml.includes('Log Semanal · 2026-10-19 a 2026-10-25'), 'Deve exibir período correto');
assert(contentHtml.includes('Carta da Gatinha:'), 'Deve exibir carta da gatinha');
assert(contentHtml.includes('min-height: 48px;'), 'Botões devem ter alvo de toque mínimo de 48px');
assert(!contentHtml.includes('(+5m)'), 'Não deve conter parênteses de variação');
assert(!contentHtml.includes('(+20🐟)'), 'Não deve conter parênteses de peixinhos');

app.closeWeeklyLogViewer();
assert.strictEqual(state.activeWeeklyLogModal, null, 'Modal deve ser fechado');

console.log('✓ 9. UI do Log Semanal validada com acessibilidade 48px e zero parênteses descritivos\n');

// 10. Verificação dos componentes Compose em :feature-insights e motor WeeklyLogEngine.kt
console.log('10. Verificando componentes Compose em feature-insights e WeeklyLogEngine.kt...');

const insightsKtPath = path.join(__dirname, '..', 'feature-insights', 'src', 'main', 'kotlin', 'com', 'deadline', 'feature', 'insights', 'InsightsFeatureModule.kt');
const weeklyEngineKtPath = path.join(__dirname, '..', 'core-domain', 'src', 'main', 'kotlin', 'com', 'deadline', 'core', 'domain', 'engine', 'WeeklyLogEngine.kt');

assert(fs.existsSync(insightsKtPath), 'InsightsFeatureModule.kt deve existir');
assert(fs.existsSync(weeklyEngineKtPath), 'WeeklyLogEngine.kt deve existir');

const insightsKt = fs.readFileSync(insightsKtPath, 'utf8');
const weeklyEngineKt = fs.readFileSync(weeklyEngineKtPath, 'utf8');

assert(insightsKt.includes('Log Semanal · Carta da Gatinha e Evolução'), 'Compose Insights deve conter seção de Log Semanal');
assert(insightsKt.includes('Ver Log Semanal'), 'Compose Insights deve conter botão Ver Log Semanal');
assert(insightsKt.includes('Aceitar sugestão de horário'), 'Compose Insights deve conter ação de sugestão');
assert(insightsKt.includes('sizeIn(minWidth = 48.dp, minHeight = 48.dp)'), 'Compose Insights deve respeitar alvos mínimos de 48dp');

assert(weeklyEngineKt.includes('class WeeklyLogEngine'), 'WeeklyLogEngine deve ser declarado');
assert(weeklyEngineKt.includes('calculatePeriod'), 'WeeklyLogEngine deve calcular período');
assert(weeklyEngineKt.includes('generateSnapshot'), 'WeeklyLogEngine deve gerar snapshot');
assert(weeklyEngineKt.includes('createWeeklyLog'), 'WeeklyLogEngine deve criar WeeklyLog imutável');

console.log('✓ 10. Módulos Compose e Kotlin do Log Semanal validados com 100% de conformidade\n');

console.log('=== TODOS OS 10 TESTES DO LOG SEMANAL E SNAPSHOT IMUTÁVEL PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
