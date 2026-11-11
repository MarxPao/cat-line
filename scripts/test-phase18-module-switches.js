/**
 * scripts/test-phase18-module-switches.js
 * Testes Automatizados para a Fase 18 / Prompt 12:
 * Integração com Insights e Interruptores de Módulos (AD-11)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA INTEGRAÇÃO COM INSIGHTS E INTERRUPTORES (V3.2.0 - PROMPT 12) ===\n');

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
      children: [],
      appendChild: (ch) => {
        el.children.push(ch);
        return ch;
      },
      removeChild: () => {},
      querySelector: (sel) => {
        if (sel === 'input') return el.children.find(c => c.tagName === 'INPUT') || getOrCreateElement('sub_input_' + id);
        return getOrCreateElement('sub_' + id);
      },
      querySelectorAll: () => [],
      setAttribute: () => {},
      getAttribute: () => null,
      addEventListener: () => {},
      parentElement: {
        getBoundingClientRect: () => ({ width: 360, height: 640 })
      },
      getBoundingClientRect: () => ({ width: 360, height: 640 }),
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
  createElement: (tag) => {
    const el = getOrCreateElement('created_' + tag + '_' + Math.random());
    el.tagName = tag.toUpperCase();
    return el;
  },
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

const commitmentsConfig = require('../web-preview/commitments-config.js');
global.CatLineCommitmentsConfig = commitmentsConfig;
global.commitmentsConfig = commitmentsConfig.DEFAULT_CONFIG;

const goalStepEngine = require('../web-preview/goal-step-engine.js');
global.CatLineGoalStepEngine = goalStepEngine;
global.goalStepEngine = goalStepEngine.goalStepEngine;

const stateMachine = require('../web-preview/commitment-state-machine.js');
global.CommitmentStateMachineModule = stateMachine;
global.commitmentStateMachine = stateMachine.commitmentStateMachine;

const delayMetricsEngine = require('../web-preview/delay-metrics-engine.js');
global.CatLineDelayMetricsEngine = delayMetricsEngine;
global.delayMetricsEngine = delayMetricsEngine.delayMetricsEngine;

const rewardLedger = require('../web-preview/reward-ledger-engine.js');
global.CatLineRewardLedgerEngine = rewardLedger;
global.rewardLedgerEngine = rewardLedger.rewardLedgerEngine;

const dayClosureEngine = require('../web-preview/day-closure-engine.js');
global.CatLineDayClosureEngine = dayClosureEngine;
global.dayClosureEngine = dayClosureEngine.dayClosureEngine;

const weeklyLogEngine = require('../web-preview/weekly-log-engine.js');
global.CatLineWeeklyLogEngine = weeklyLogEngine;
global.weeklyLogEngine = weeklyLogEngine.weeklyLogEngine;

// Carrega o app.js
const appJsPath = path.resolve(__dirname, '../web-preview/app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');

eval(appJsCode + '\nglobal.state = state;\nglobal.AppUI = AppUI;\n');

// Dispara DOMContentLoaded para inicializar window.app
for (const listener of domListeners) {
  listener();
}

const state = global.state;
const app = global.window.app || new AppUI();
const betaReport = global.betaReportEngine || window.betaReportEngine;

// 1. Testando chaves padrão de flags dos novos módulos
console.log('1. Testando valores padrão dos interruptores de módulos (AD-11)...');
assert.strictEqual(state.flags.METAS_PASSOS, true, 'METAS_PASSOS deve vir ativo por padrão');
assert.strictEqual(state.flags.COMPROMISSOS, true, 'COMPROMISSOS deve vir ativo por padrão');
assert.strictEqual(state.flags.LOG_SEMANAL, true, 'LOG_SEMANAL deve vir ativo por padrão');
assert.strictEqual(state.moduleFlags.metasPassos, true, 'moduleFlags.metasPassos getter deve retornar true');
assert.strictEqual(state.moduleFlags.compromissos, true, 'moduleFlags.compromissos getter deve retornar true');
assert.strictEqual(state.moduleFlags.logSemanal, true, 'moduleFlags.logSemanal getter deve retornar true');
console.log('✓ 1. Valores padrão dos novos módulos validados com sucesso');

// 2. Testando desligamento de METAS_PASSOS: esconde UI de passos mas preserva dados
console.log('\n2. Testando desligamento do módulo METAS_PASSOS...');
state.goals = [
  {
    id: 'goal-test-1',
    title: 'Aprender Pixel Art',
    horizon: 'MES',
    yarnColorId: 'yarn-mint',
    steps: [
      { id: 'step-1', goalId: 'goal-test-1', title: 'Passo 1: Esboço', order: 1, doneAt: Clock.isoString() },
      { id: 'step-2', goalId: 'goal-test-1', title: 'Passo 2: Paleta', order: 2, doneAt: null }
    ]
  }
];

// Com METAS_PASSOS = true, renderTabMetas inclui a seção de passos
state.flags.METAS_PASSOS = true;
app.renderTabMetas();
const htmlComPassos = app.contentEl.innerHTML;
assert.ok(htmlComPassos.includes('goal-steps-wrapper'), 'HTML deve conter a seção de passos quando METAS_PASSOS estiver ativo');
assert.ok(htmlComPassos.includes('Passo 1: Esboço'), 'HTML deve listar o título do passo');

// Desliga METAS_PASSOS
state.flags.METAS_PASSOS = false;
app.renderTabMetas();
const htmlSemPassos = app.contentEl.innerHTML;
assert.ok(!htmlSemPassos.includes('goal-steps-wrapper'), 'HTML NÃO deve conter a seção de passos quando METAS_PASSOS estiver inativo');
assert.strictEqual(state.goals[0].steps.length, 2, 'Dados de steps devem permanecer 100% intactos em memória');

// Religa METAS_PASSOS
state.flags.METAS_PASSOS = true;
app.renderTabMetas();
assert.ok(app.contentEl.innerHTML.includes('goal-steps-wrapper'), 'Passos devem reaparecer ao religar o módulo');
console.log('✓ 2. METAS_PASSOS validado: esconde UI de passos e preserva dados integralmente');

// 3. Testando desligamento de COMPROMISSOS: esconde itens da timeline e preserva dados
console.log('\n3. Testando desligamento do módulo COMPROMISSOS...');
state.occurrences = [
  { id: 'occ-test-1', title: 'Reunião Importante', time: '10:00', state: 'pending' },
  { id: 'occ-test-2', title: 'Treino da Tarde', time: '16:00', state: 'done' }
];
state.habits = [
  { id: 'habit-test-1', title: 'Beber 2L de Água', window: '08:00', completed: false, streak: 3 }
];

state.flags.COMPROMISSOS = true;
const timelineComCompromissos = app.buildUnifiedTimelineHtml();
assert.ok(timelineComCompromissos.includes('Reunião Importante'), 'Timeline deve listar compromissos quando módulo está ativo');
assert.ok(timelineComCompromissos.includes('Beber 2L de Água'), 'Timeline deve listar hábitos');

state.flags.COMPROMISSOS = false;
const timelineSemCompromissos = app.buildUnifiedTimelineHtml();
assert.ok(!timelineSemCompromissos.includes('Reunião Importante'), 'Timeline NÃO deve listar compromissos quando módulo está desativado');
assert.ok(timelineSemCompromissos.includes('Beber 2L de Água'), 'Timeline ainda deve listar hábitos');
assert.strictEqual(state.occurrences.length, 2, 'Dados de ocorrências devem permanecer 100% intactos');

state.flags.COMPROMISSOS = true;
console.log('✓ 3. COMPROMISSOS validado: esconde compromissos da timeline e preserva dados');

// 4. Testando desligamento de LOG_SEMANAL: esconde card e bloqueia abertura sem apagar histórico
console.log('\n4. Testando desligamento do módulo LOG_SEMANAL...');
state.weeklyLogs = [
  {
    weekStartLogicalDay: '2026-10-19',
    snapshotJson: JSON.stringify({ period: { start: '2026-10-19', end: '2026-10-25' }, rates: { fulfillment: 1.0 } }),
    createdAt: Clock.isoString()
  }
];

state.flags.LOG_SEMANAL = true;
const cardAtivo = app.renderWeeklyLogCard();
assert.ok(cardAtivo.includes('card-weekly-log'), 'Card do Log Semanal deve ser renderizado quando ativo');

state.flags.LOG_SEMANAL = false;
const cardInativo = app.renderWeeklyLogCard();
assert.strictEqual(cardInativo, '', 'Card do Log Semanal deve ser vazio quando inativo');

state.activeWeeklyLogModal = null;
app.openWeeklyLogViewer('2026-10-19');
assert.strictEqual(state.activeWeeklyLogModal, null, 'openWeeklyLogViewer não deve abrir modal com módulo inativo');
assert.strictEqual(state.weeklyLogs.length, 1, 'Histórico de weeklyLogs deve ser 100% preservado');

state.flags.LOG_SEMANAL = true;
console.log('✓ 4. LOG_SEMANAL validado: esconde card e impede abertura sem alterar histórico');

// 5. Testando barreira de 7 dias nos recortes de atraso no Insights
console.log('\n5. Testando barreira estrita de 7 dias nos recortes de atraso do Insights...');
// Apenas 3 dias de dados
state.occurrences = [
  { id: 'c-1', plannedStart: '2026-10-20T10:00:00', plannedZone: 'America/Sao_Paulo', state: 'done', category: 'ESTUDO' },
  { id: 'c-2', plannedStart: '2026-10-21T14:00:00', plannedZone: 'America/Sao_Paulo', state: 'done', category: 'TREINO' },
  { id: 'c-3', plannedStart: '2026-10-22T18:00:00', plannedZone: 'America/Sao_Paulo', state: 'done', category: 'CASA' }
];
state.checkIns = [
  { id: 'chk-1', commitmentId: 'c-1', actualAt: '2026-10-20T10:05:00Z', lateMinutes: 5 },
  { id: 'chk-2', commitmentId: 'c-2', actualAt: '2026-10-21T14:00:00Z', lateMinutes: 0 },
  { id: 'chk-3', commitmentId: 'c-3', actualAt: '2026-10-22T18:02:00Z', lateMinutes: 2 }
];

const breakdownHtmlFewDays = app.renderDelayBreakdownCard();
assert.ok(breakdownHtmlFewDays.includes('3 de 7 dias observados'), 'Deve indicar quantos dias foram observados');
assert.ok(!breakdownHtmlFewDays.includes('Recorte por Categoria:'), 'NÃO deve exibir recortes com menos de 7 dias');
assert.ok(!breakdownHtmlFewDays.includes('Recorte por Dia da Semana:'), 'NÃO deve exibir recortes com menos de 7 dias');
console.log('✓ 5. Barreira de 7 dias validada: recortes e inferências bloqueados com < 7 dias');

// 6. Testando recortes de atraso com >= 7 dias de dados
console.log('\n6. Testando exibição de recortes de atraso com >= 7 dias de dados...');
const fullWeekOccs = [];
const fullWeekCheckIns = [];
for (let i = 1; i <= 7; i++) {
  const dayStr = `2026-10-${18 + i}`;
  fullWeekOccs.push({
    id: `c-w-${i}`,
    plannedStart: `${dayStr}T10:00:00`,
    plannedZone: 'America/Sao_Paulo',
    state: 'done',
    category: i % 2 === 0 ? 'TREINO' : 'ESTUDO'
  });
  fullWeekCheckIns.push({
    id: `chk-w-${i}`,
    commitmentId: `c-w-${i}`,
    actualAt: `${dayStr}T10:04:00Z`,
    lateMinutes: 4
  });
}
state.occurrences = fullWeekOccs;
state.checkIns = fullWeekCheckIns;

const breakdownHtml7Days = app.renderDelayBreakdownCard();
assert.ok(breakdownHtml7Days.includes('Recorte por Categoria:'), 'Deve exibir recorte por categoria com >= 7 dias');
assert.ok(breakdownHtml7Days.includes('Recorte por Dia da Semana:'), 'Deve exibir recorte por dia da semana');
assert.ok(breakdownHtml7Days.includes('Recorte por Faixa de Horário:'), 'Deve exibir recorte por faixa de horário');
assert.ok(!breakdownHtml7Days.includes('(') || !breakdownHtml7Days.includes('ex:'), 'Sem parênteses descritivos');
console.log('✓ 6. Recortes por categoria, dia e horário validados com sucesso');

// 7. Testando Relatório Beta Anônimo com novas contagens e taxas
console.log('\n7. Testando métricas agregadas do Relatório Beta Anônimo...');
const rep = betaReport.generateAnonymousReport(state);
assert.strictEqual(rep.version, '3.2.0', 'Versão deve ser 3.2.0');
assert.strictEqual(rep.modules.metasPassos, true, 'Module flag metasPassos deve constar no relatório');
assert.strictEqual(rep.modules.compromissos, true, 'Module flag compromissos deve constar no relatório');
assert.strictEqual(rep.modules.logSemanal, true, 'Module flag logSemanal deve constar no relatório');
assert.strictEqual(typeof rep.telemetry.fulfillmentRatePct, 'number', 'fulfillmentRatePct deve ser número');
assert.strictEqual(typeof rep.telemetry.punctualityRatePct, 'number', 'punctualityRatePct deve ser número');
assert.strictEqual(typeof rep.telemetry.medianLateMinutes, 'number', 'medianLateMinutes deve ser número');
assert.strictEqual(typeof rep.telemetry.goalStepsTotal, 'number', 'goalStepsTotal deve ser número');
assert.strictEqual(typeof rep.telemetry.goalStepsDone, 'number', 'goalStepsDone deve ser número');
assert.strictEqual(typeof rep.telemetry.dayClosuresTotal, 'number', 'dayClosuresTotal deve ser número');
assert.strictEqual(typeof rep.telemetry.weeklyLogsTotal, 'number', 'weeklyLogsTotal deve ser número');
console.log('✓ 7. Relatório Beta agrega todas as novas contagens e taxas');

// 8. Testando ausência estrita de texto livre no Relatório Beta Anônimo
console.log('\n8. Testando garantia estrita de privacidade: zero texto livre no Relatório Beta...');
const repJson = JSON.stringify(rep);
assert.ok(!repJson.includes('Aprender Pixel Art'), 'Títulos de metas NÃO podem constar no relatório');
assert.ok(!repJson.includes('Reunião Importante'), 'Títulos de compromissos NÃO podem constar no relatório');
assert.ok(!repJson.includes('Passo 1: Esboço'), 'Títulos de passos NÃO podem constar no relatório');
assert.ok(!repJson.includes('Beber 2L de Água'), 'Títulos de hábitos NÃO podem constar no relatório');
console.log('✓ 8. Zero texto livre garantido no Relatório Beta');

// 9. Testando acessibilidade e alvos mínimos de 48px
console.log('\n9. Testando alvos mínimos de toque (48px) e conformidade visual...');
const cardWeekly = app.renderWeeklyLogCard();
assert.ok(cardWeekly.includes('min-height: 48px'), 'Botão Ver Carta deve ter min-height 48px');
assert.ok(cardWeekly.includes('min-width: 48px'), 'Botão Ver Carta deve ter min-width 48px');
console.log('✓ 9. Alvos de 48px confirmados nos novos componentes');

// 10. Verificando FeatureFlagKey.kt no módulo :core-domain
console.log('\n10. Verificando enum FeatureFlagKey.kt no :core-domain...');
const ktPath = path.resolve(__dirname, '../core-domain/src/main/kotlin/com/deadline/core/domain/config/FeatureFlagKey.kt');
const ktContent = fs.readFileSync(ktPath, 'utf8');
assert.ok(ktContent.includes('METAS_PASSOS'), 'FeatureFlagKey deve ter METAS_PASSOS');
assert.ok(ktContent.includes('COMPROMISSOS'), 'FeatureFlagKey deve ter COMPROMISSOS');
assert.ok(ktContent.includes('LOG_SEMANAL'), 'FeatureFlagKey deve ter LOG_SEMANAL');
console.log('✓ 10. FeatureFlagKey.kt validado com 100% de conformidade');

console.log('\n=== TODOS OS 10 TESTES DE INTEGRAÇÃO COM INSIGHTS E INTERRUPTORES PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
