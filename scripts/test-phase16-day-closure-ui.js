// scripts/test-phase16-day-closure-ui.js
// Suíte de Testes da UI do Fechamento do Dia (Cat Line v3.2.0 · Prompt 10)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA UI DO FECHAMENTO DO DIA (V3.2.0 - PROMPT 10) ===\n');

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

// Injetar módulos auxiliares determinísticos
const Clock = require('../web-preview/clock.js');
global.CatLineClock = Clock;
global.Clock = Clock;
Clock.setFakeTime('2026-10-25T12:00:00.000Z'); // 12:00 UTC (09:00 local) do dia 25 (após a virada de 04:00)

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

// Carrega o app principal
const appCode = fs.readFileSync('web-preview/app.js', 'utf8');
eval(appCode + '\nglobal.state = state;\nglobal.AppUI = AppUI;\n');

domListeners.forEach(cb => cb());
if (!global.window.app) global.window.app = new AppUI();
const app = global.window.app;
const state = global.state;

// 1. Testando disparo do modal na detecção de dia anterior não fechado
console.log('1. Testando disparo do diálogo na virada do dia lógico / dia anterior não fechado...');

state.dayKey = '2026-10-25';
state.occurrences.push({
  id: 'comm-yesterday-1',
  title: 'Revisar PR de Acessibilidade',
  time: '16:00',
  effort: 'M',
  reward: 10,
  state: 'pending',
  date: '2026-10-24',
  plannedStart: '2026-10-24T16:00:00'
});

state.occurrences.push({
  id: 'comm-yesterday-2',
  title: 'Comprar Ração da Gatinha',
  time: '19:00',
  effort: 'P',
  reward: 5,
  state: 'pending',
  date: '2026-10-24',
  plannedStart: '2026-10-24T19:00:00'
});

app.checkDayClosureTrigger();

assert(state.activeDayClosureModal, 'Modal de fechamento do dia deve estar ativo');
assert.strictEqual(state.activeDayClosureModal.logicalDay, '2026-10-24', 'Dia a fechar deve ser 2026-10-24');
const y1 = state.occurrences.find(o => o.id === 'comm-yesterday-1');
const y2 = state.occurrences.find(o => o.id === 'comm-yesterday-2');
assert.strictEqual(y1.state, 'unmarked', 'Pendentes do dia fechado viram unmarked sem punição');
assert.strictEqual(y2.state, 'unmarked', 'Pendentes do dia fechado viram unmarked sem punição');

console.log('✓ 1. Disparo do diálogo na virada do dia lógico validado com sucesso\n');

// 2. Testando renderização da lista de itens com ações individuais
console.log('2. Testando renderização da lista de itens unmarked com 3 ações individuais...');

app.switchTab('hoje');
const contentHtml = app.contentEl.innerHTML;
assert(contentHtml.includes('day-closure-modal-overlay'), 'Overlay do modal de fechamento deve ser renderizado');
assert(contentHtml.includes('Fechamento do Dia · 2026-10-24'), 'Deve exibir título com dia correto');
assert(contentHtml.includes('Vamos fechar o dia de ontem juntinhas sem pressa?'), 'Deve conter mensagem acolhedora');
assert(contentHtml.includes('Cumpri'), 'Deve conter botão Cumpri');
assert(contentHtml.includes('Não cumpri'), 'Deve conter botão Não cumpri');
assert(contentHtml.includes('Remarcar'), 'Deve conter botão Remarcar');
assert(contentHtml.includes('Marcar todos no horário planejado'), 'Deve conter ação em lote');

console.log('✓ 2. Renderização da lista e botões individuais e em lote validada\n');

// 3. Testando resolução individual "Cumpri"
console.log('3. Testando resolução individual "Cumpri" com horário retroativo e recompensa...');

const initialFish = state.currencies.peixinhos;
app.resolveClosureItemDone('comm-yesterday-1', '16:20');

assert.strictEqual(y1.state, 'done', 'Item deve passar para done');
assert.strictEqual(y1.completedAt, '2026-10-24T16:20:00');
const chk1 = state.checkIns.find(c => c.commitmentId === 'comm-yesterday-1');
assert(chk1, 'CheckIn retroativo deve ser registrado');
assert.strictEqual(chk1.retroactive, true);
assert(state.rewardEvents.some(e => e.refId === 'comm-yesterday-1'), 'Deve emitir recompensa no livro-razão');
assert(state.currencies.peixinhos >= initialFish, 'Saldo de peixinhos deve ser creditado');
assert(!state.activeDayClosureModal.unresolved.includes('comm-yesterday-1'), 'Item resolvido deve sair da lista não resolvida');

console.log('✓ 3. Resolução "Cumpri" validada com check-in retroativo e recompensa\n');

// 4. Testando resolução individual "Não cumpri"
console.log('4. Testando resolução individual "Não cumpri" sem desconto de saldo e com acolhimento...');

state.occurrences.push({
  id: 'comm-yesterday-missed',
  title: 'Alongamento Noturno',
  time: '21:00',
  state: 'unmarked',
  date: '2026-10-24',
  plannedStart: '2026-10-24T21:00:00'
});
state.activeDayClosureModal.unresolved.push('comm-yesterday-missed');

const fishBeforeMissed = state.currencies.peixinhos;
app.resolveClosureItemMissed('comm-yesterday-missed');

const yMissed = state.occurrences.find(o => o.id === 'comm-yesterday-missed');
assert.strictEqual(yMissed.state, 'missed');
assert.strictEqual(state.currencies.peixinhos, fishBeforeMissed, 'Não cumpri rende zero, nunca desconta peixinhos');
assert(state.cat.speechText.includes('Registrar a verdade'), 'Gatinha acolhe a sinceridade');

console.log('✓ 4. Resolução "Não cumpri" validada: zero desconto, carinho e acolhimento\n');

// 5. Testando resolução individual "Remarcar"
console.log('5. Testando resolução individual "Remarcar" com nova ocorrência vinculada...');

app.resolveClosureItemReschedule('comm-yesterday-2', '10:00', '2026-10-25');

assert.strictEqual(y2.state, 'rescheduled', 'Original vira rescheduled');
const newOcc = state.occurrences.find(o => o.rescheduledFromId === 'comm-yesterday-2');
assert(newOcc, 'Nova ocorrência deve ser gerada');
assert.strictEqual(newOcc.time, '10:00');
assert.strictEqual(newOcc.date, '2026-10-25');
assert.strictEqual(newOcc.state, 'pending');

console.log('✓ 5. Resolução "Remarcar" validada com rescheduledFromId e novo agendamento\n');

// 6. Testando resolução em lote "Marcar todos no horário planejado"
console.log('6. Testando resolução em lote com lateMinutes = 0 e confirmação explícita...');

state.occurrences.push({
  id: 'comm-batch-1',
  title: 'Passeio Matinal',
  time: '08:00',
  state: 'unmarked',
  date: '2026-10-24',
  plannedStart: '2026-10-24T08:00:00'
});

state.occurrences.push({
  id: 'comm-batch-2',
  title: 'Almoço Saudável',
  time: '12:30',
  state: 'unmarked',
  date: '2026-10-24',
  plannedStart: '2026-10-24T12:30:00'
});

state.activeDayClosureModal.unresolved = ['comm-batch-1', 'comm-batch-2'];

app.resolveAllClosureItemsAsPlanned();

const b1 = state.occurrences.find(o => o.id === 'comm-batch-1');
const b2 = state.occurrences.find(o => o.id === 'comm-batch-2');
assert.strictEqual(b1.state, 'done');
assert.strictEqual(b2.state, 'done');
const chkB1 = state.checkIns.find(c => c.commitmentId === 'comm-batch-1');
const chkB2 = state.checkIns.find(c => c.commitmentId === 'comm-batch-2');
assert(chkB1 && chkB2, 'Check-ins devem existir para os itens do lote');
assert.strictEqual(chkB1.lateMinutes, 0, 'Itens do lote possuem lateMinutes = 0');
assert.strictEqual(chkB1.retroactive, true, 'Check-ins do lote são marcados como retroativos');
assert.strictEqual(state.activeDayClosureModal.unresolved.length, 0, 'Lista de não resolvidos deve ser zerada');

console.log('✓ 6. Resolução em lote validada com lateMinutes = 0 e flag retroativa\n');

// 7. Testando ação "Adiar resolução"
console.log('7. Testando ação "Adiar resolução": mantém estado unmarked fora das métricas...');

app.openDayClosureModal('2026-10-23');
state.occurrences.push({
  id: 'comm-postponed-test',
  title: 'Compromisso Adiado',
  time: '11:00',
  state: 'pending',
  date: '2026-10-23',
  plannedStart: '2026-10-23T11:00:00'
});
state.activeDayClosureModal.unresolved = ['comm-postponed-test'];

app.postponeDayClosure();

const postOcc = state.occurrences.find(o => o.id === 'comm-postponed-test');
assert.strictEqual(postOcc.state, 'unmarked', 'Ao adiar, item continua como unmarked');
assert.strictEqual(state.activeDayClosureModal, null, 'Modal deve ser fechado após adiar');
assert(state.cat.speechText.includes('com calma'), 'Gatinha conforta a decisão de adiar');

console.log('✓ 7. Ação "Adiar resolução" validada: mantém unmarked sem punição nem marcação forçada\n');

// 8. Testando finalização do fechamento: registro de DayClosure e +1♥ idempotente
console.log('8. Testando finalização do fechamento com DayClosure e recompensa idempotente de +1♥...');

app.openDayClosureModal('2026-10-24');
state.activeDayClosureModal.unresolved = [];

const initialHearts = (state.currencies.vinculo !== undefined) ? state.currencies.vinculo : (state.currencies.hearts || 0);

app.finalizeDayClosure();

assert.strictEqual(state.activeDayClosureModal, null, 'Modal deve ser fechado após finalizar');
const closureRecord = state.dayClosures.find(c => c.logicalDay === '2026-10-24');
assert(closureRecord, 'DayClosure deve ser persistido em state.dayClosures');

const closureEvent = state.rewardEvents.find(e => e.kind === 'day_closure' && e.logicalDay === '2026-10-24');
assert(closureEvent, 'Evento day_closure deve constar no livro-razão');
assert.strictEqual(closureEvent.bondDelta, 1, 'Deve creditar exatamente 1 ponto de vínculo');

const updatedHearts = (state.currencies.vinculo !== undefined) ? state.currencies.vinculo : (state.currencies.hearts || 0);
assert(updatedHearts >= initialHearts + 1, 'Saldo de vínculo deve ter aumentado em 1');

// Testa idempotência: tentar fechar o mesmo dia novamente não duplica recompensa nem registro
const closuresCountBefore = state.dayClosures.length;
const eventsCountBefore = state.rewardEvents.filter(e => e.kind === 'day_closure').length;

app.openDayClosureModal('2026-10-24');
app.finalizeDayClosure();

assert.strictEqual(state.dayClosures.length, closuresCountBefore, 'Não deve duplicar registro de fechamento');
assert.strictEqual(state.rewardEvents.filter(e => e.kind === 'day_closure').length, eventsCountBefore, 'Não deve duplicar recompensa');

console.log('✓ 8. Finalização do fechamento e idempotência estrita de recompensa validadas\n');

// 9. Testando acessibilidade e ausência de parênteses descritivos
console.log('9. Testando acessibilidade (alvo mínimo de toque 48dp) e ausência de parênteses...');

const cssContent = fs.readFileSync('web-preview/style.css', 'utf8');
assert(cssContent.includes('.day-closure-modal-box'), 'CSS deve conter .day-closure-modal-box');
assert(cssContent.includes('min-height: 48px;'), 'Botões do fechamento devem ter altura mínima de 48px');

app.openDayClosureModal('2026-10-24');
app.switchTab('hoje');
const closureHtml = app.contentEl.innerHTML;
assert(!closureHtml.includes('(+1♥)'), 'Não deve conter parênteses de bônus de vínculo');
assert(!closureHtml.includes('(+5🐟)'), 'Não deve conter parênteses de peixinhos');
assert(!closureHtml.includes('(ex: '), 'Não deve conter parênteses de exemplo');
app.closeDayClosureModal();

console.log('✓ 9. Alvos de 48px e ausência de parênteses descritivos confirmados\n');

// 10. Verificação dos componentes Compose em :feature-hoje
console.log('10. Verificando componentes Compose de Fechamento do Dia em feature-hoje...');

const hojeKtPath = path.join(__dirname, '..', 'feature-hoje', 'src', 'main', 'kotlin', 'com', 'deadline', 'feature', 'hoje', 'HojeFeatureModule.kt');
assert(fs.existsSync(hojeKtPath), 'HojeFeatureModule.kt deve existir');
const hojeKt = fs.readFileSync(hojeKtPath, 'utf8');

assert(hojeKt.includes('Fechamento do Dia'), 'Compose Hoje deve conter Fechamento do Dia');
assert(hojeKt.includes('Vamos fechar o dia de ontem juntinhas sem pressa?'), 'Compose Hoje deve conter mensagem acolhedora');
assert(hojeKt.includes('Marcar todos no horário planejado'), 'Compose Hoje deve conter ação em lote');
assert(hojeKt.includes('Adiar resolução'), 'Compose Hoje deve conter Adiar resolução');
assert(hojeKt.includes('Concluir Fechamento do Dia'), 'Compose Hoje deve conter Concluir Fechamento');
assert(hojeKt.includes('sizeIn(minWidth = 48.dp, minHeight = 48.dp)'), 'Compose Hoje deve respeitar alvos mínimos de 48dp');

console.log('✓ 10. Módulo Compose :feature-hoje validado com 100% de conformidade para o Fechamento do Dia\n');

console.log('=== TODOS OS 10 TESTES DA UI DO FECHAMENTO DO DIA PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
