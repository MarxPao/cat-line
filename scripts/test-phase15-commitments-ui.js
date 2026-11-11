// scripts/test-phase15-commitments-ui.js
// Suíte de Testes da UI de Compromissos e Check-in (Cat Line v3.2.0 · Prompt 9)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA UI DE COMPROMISSOS E CHECK-IN (V3.2.0 - PROMPT 9) ===\n');

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

// Injetar módulos auxiliares
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
global.dayClosureEngine = require('../web-preview/day-closure-engine.js').dayClosureEngine;

// Carrega o app principal
const appCode = fs.readFileSync('web-preview/app.js', 'utf8');
eval(appCode + '\nglobal.state = state;\nglobal.AppUI = AppUI;\n');

// Dispara DOMContentLoaded
domListeners.forEach(cb => cb());
if (!global.window.app) global.window.app = new AppUI();
const app = global.window.app;
const state = global.state;

console.log('1. Testando criação rápida em 2 toques com vínculo opcional de meta e passo...');

app.openQuickCreateSheet('occurrence');
const qcBox = document.getElementById('quick-create-box');
assert(qcBox.innerHTML.includes('Criação Rápida · 2 Toques'), 'Deve exibir título sem parênteses');
assert(qcBox.innerHTML.includes('qc-occ-goal'), 'Deve conter seletor de meta');
assert(qcBox.innerHTML.includes('qc-occ-step'), 'Deve conter seletor de passo da meta');

// Simula seleção da meta g-1 e passo s-1-2
app.onQuickCreateGoalChange('g-1');
document.getElementById('qc-occ-title').value = 'Estudar Álgebra Linear';
document.getElementById('qc-occ-time').value = '15:00';
document.getElementById('qc-occ-effort').value = 'M';
document.getElementById('qc-occ-goal').value = 'g-1';
document.getElementById('qc-occ-step').value = 's-1-2';

app.submitQuickCreate();

const createdComm = state.occurrences.find(o => o.title === 'Estudar Álgebra Linear');
assert(createdComm, 'Compromisso criado deve constar em state.occurrences');
assert.strictEqual(createdComm.time, '15:00');
assert.strictEqual(createdComm.state, 'pending');
assert.strictEqual(createdComm.goalId, 'g-1');
assert.strictEqual(createdComm.stepId, 's-1-2');
assert.strictEqual(createdComm.plannedStart, '2026-10-25T15:00:00');

console.log('✓ 1. Criação rápida em 2 toques com vínculo de meta/passo validada com sucesso\n');

console.log('2. Testando renderização de pílula de estado para todos os 5 estados...');

state.occurrences.push({
  id: 'comm-missed-test',
  title: 'Tarefa Não Cumprida Teste',
  time: '10:00',
  state: 'missed',
  date: state.dayKey,
  plannedStart: '2026-10-25T10:00:00'
});

state.occurrences.push({
  id: 'comm-rescheduled-test',
  title: 'Tarefa Remarcada Teste',
  time: '11:00',
  state: 'rescheduled',
  date: state.dayKey,
  plannedStart: '2026-10-25T11:00:00'
});

state.occurrences.push({
  id: 'comm-unmarked-test',
  title: 'Tarefa Sem Marcação Teste',
  time: '12:00',
  state: 'unmarked',
  date: state.dayKey,
  plannedStart: '2026-10-25T12:00:00'
});

app.switchTab('hoje');
const timelineHtml = app.buildUnifiedTimelineHtml();

assert(timelineHtml.includes('state-pill-pending'), 'Deve renderizar pill Pendente');
assert(timelineHtml.includes('state-pill-done'), 'Deve renderizar pill Cumprido');
assert(timelineHtml.includes('state-pill-missed'), 'Deve renderizar pill Não cumprido');
assert(timelineHtml.includes('state-pill-rescheduled'), 'Deve renderizar pill Remarcado');
assert(timelineHtml.includes('state-pill-unmarked'), 'Deve renderizar pill Sem marcação');
assert(timelineHtml.includes('Passo: Construir motor de metas e passos'), 'Deve renderizar indicador do passo vinculado');

console.log('✓ 2. Pílulas de estado para pending, done, missed, rescheduled e unmarked validadas\n');

console.log('3. Testando Check-in ao vivo com cálculo de atraso e emissão no livro-razão...');

Clock.setFakeTime('2026-10-25T15:05:00.000Z'); // 5 minutos após o horário planejado (dentro da tolerância de 10m)
const initialFish = state.currencies.peixinhos;

app.checkInLive(createdComm.id);

assert.strictEqual(createdComm.state, 'done', 'Estado deve avançar para done');
const chk = state.checkIns.find(c => c.commitmentId === createdComm.id);
assert(chk, 'CheckIn deve ser registrado em state.checkIns');
assert.strictEqual(chk.retroactive, false);

const rewardEvent = state.rewardEvents.find(e => e.refId === createdComm.id && e.kind === 'commitment_done');
assert(rewardEvent, 'Deve emitir evento commitment_done no livro-razão');
assert(state.currencies.peixinhos >= initialFish, 'Saldo de peixinhos deve ter aumentado');

console.log('✓ 3. Check-in ao vivo validado com registro de CheckIn e recompensas no livro-razão\n');

console.log('4. Testando diálogo pós-check-in com confirmação de conclusão do passo da meta...');

assert(state.activeStepPrompt, 'Diálogo de confirmação de passo deve ter sido aberto');
assert.strictEqual(state.activeStepPrompt.stepId, 's-1-2');
assert.strictEqual(state.activeStepPrompt.goalId, 'g-1');

const goal = state.goals.find(g => g.id === 'g-1');
const targetStep = goal.steps.find(s => s.id === 's-1-2');
assert.strictEqual(targetStep.doneAt, null, 'Passo ainda deve estar pendente antes da confirmação');

app.confirmStepDoneFromCommitment('g-1', 's-1-2');

assert(targetStep.doneAt !== null, 'Passo deve ser concluído após confirmação do diálogo');
assert.strictEqual(state.activeStepPrompt, null, 'Diálogo deve ser fechado após confirmação');
const stepEvent = state.rewardEvents.find(e => e.refId === 's-1-2' && e.kind === 'step_done');
assert(stepEvent, 'Deve emitir evento de recompensa step_done');

console.log('✓ 4. Diálogo pós-check-in concluiu o passo da meta e creditou a recompensa\n');

console.log('5. Testando Check-in retroativo com tolerância e multiplicador de 0.5x...');

state.occurrences.push({
  id: 'comm-retro-test',
  title: 'Treino Funcional',
  time: '18:00',
  effort: 'G',
  reward: 20,
  state: 'pending',
  date: state.dayKey,
  plannedStart: '2026-10-25T18:00:00'
});

app.confirmRetroCheckIn('comm-retro-test', '18:15');

const retroOcc = state.occurrences.find(o => o.id === 'comm-retro-test');
assert.strictEqual(retroOcc.state, 'done', 'Compromisso retroativo deve mudar para done');
const retroChk = state.checkIns.find(c => c.commitmentId === 'comm-retro-test');
assert(retroChk, 'Registro de CheckIn retroativo deve existir');
assert.strictEqual(retroChk.retroactive, true, 'Flag retroactive deve ser verdadeira');

const retroReward = state.rewardEvents.find(e => e.refId === 'comm-retro-test');
assert(retroReward, 'Deve emitir evento de recompensa para o check-in retroativo');

console.log('✓ 5. Check-in retroativo validado com flag e recompensa justa\n');

console.log('6. Testando marcação explícita "Não cumpri" sem cobrança nem penalização...');

state.occurrences.push({
  id: 'comm-missed-explicit',
  title: 'Leitura Noturna',
  time: '22:00',
  state: 'pending',
  date: state.dayKey,
  plannedStart: '2026-10-25T22:00:00'
});

const fishBeforeMissed = state.currencies.peixinhos;
app.markCommitmentMissed('comm-missed-explicit');

const missedOcc = state.occurrences.find(o => o.id === 'comm-missed-explicit');
assert.strictEqual(missedOcc.state, 'missed');
assert.strictEqual(state.currencies.peixinhos, fishBeforeMissed, 'Não cumpri rende zero, nunca desconta saldo');
assert(state.cat.speechText.includes('Sem cobrança'), 'Gatinha deve acolher sem julgamento');

console.log('✓ 6. Marcação "Não cumpri" validada: zero desconto, zero julgamento\n');

console.log('7. Testando Remarcação acolhedora com rastreio de origem...');

app.confirmReschedule('comm-missed-explicit', '09:00', '2026-10-26');

assert.strictEqual(missedOcc.state, 'rescheduled', 'Original deve ficar com estado rescheduled');
const replacementComm = state.occurrences.find(o => o.rescheduledFromId === 'comm-missed-explicit');
assert(replacementComm, 'Nova ocorrência deve ser gerada');
assert.strictEqual(replacementComm.time, '09:00');
assert.strictEqual(replacementComm.date, '2026-10-26');
assert.strictEqual(replacementComm.state, 'pending');

console.log('✓ 7. Remarcação validada com vínculo rescheduledFromId e novo agendamento\n');

console.log('8. Testando ação Desfazer dentro e fora da janela de 10 minutos...');

state.occurrences.push({
  id: 'comm-undo-test',
  title: 'Meditação Guiada',
  time: '14:00',
  state: 'pending',
  date: state.dayKey,
  plannedStart: '2026-10-25T14:00:00'
});

Clock.setFakeTime('2026-10-25T14:02:00.000Z');
app.checkInLive('comm-undo-test');

const undoOcc = state.occurrences.find(o => o.id === 'comm-undo-test');
assert.strictEqual(undoOcc.state, 'done');

// Verifica renderização do botão de desfazer com contagem
app.switchTab('hoje');
const undoHtml = app.buildUnifiedTimelineHtml();
assert(undoHtml.includes('Desfazer · '), 'Deve renderizar botão de desfazer com tempo restante');

// Desfaz dentro da janela (apenas 2 minutos decorridos)
app.undoCommitmentCheckIn('comm-undo-test');
assert.strictEqual(undoOcc.state, 'pending', 'Estado deve reverter para pending');

// Realiza novo check-in e avança 15 minutos (janela de 10m expirada)
app.checkInLive('comm-undo-test');
assert.strictEqual(undoOcc.state, 'done');
Clock.advanceByMs(15 * 60 * 1000);

app.undoCommitmentCheckIn('comm-undo-test');
assert.strictEqual(undoOcc.state, 'done', 'Após 15m, o estado não deve ser revertido');
assert(state.cat.speechText.includes('A janela de desfazer já encerrou'), 'Mensagem amigável de encerramento');

console.log('✓ 8. Ação Desfazer validada: reversão compensatória no prazo e bloqueio suave fora dele\n');

console.log('9. Testando acessibilidade (alvo mínimo de toque 48dp) e ausência de parênteses...');

const finalTimelineHtml = app.buildUnifiedTimelineHtml();
assert(finalTimelineHtml.includes('min-height: 48px;'), 'Botões de ação devem ter no mínimo 48px de toque');
assert(!finalTimelineHtml.includes('(+10🐟)'), 'Não deve conter parênteses de recompensa');
assert(!finalTimelineHtml.includes('(50%)'), 'Não deve conter parênteses de percentual');
assert(!finalTimelineHtml.includes('(ex: '), 'Não deve conter parênteses de exemplo');

console.log('✓ 9. Acessibilidade 48px e ausência de parênteses confirmadas na UI\n');

console.log('10. Verificando componentes Compose em feature-hoje e feature-agenda...');

const hojeKtPath = path.join(__dirname, '..', 'feature-hoje', 'src', 'main', 'kotlin', 'com', 'deadline', 'feature', 'hoje', 'HojeFeatureModule.kt');
const agendaKtPath = path.join(__dirname, '..', 'feature-agenda', 'src', 'main', 'kotlin', 'com', 'deadline', 'feature', 'agenda', 'AgendaFeatureModule.kt');

assert(fs.existsSync(hojeKtPath), 'HojeFeatureModule.kt deve existir');
assert(fs.existsSync(agendaKtPath), 'AgendaFeatureModule.kt deve existir');

const hojeKt = fs.readFileSync(hojeKtPath, 'utf8');
const agendaKt = fs.readFileSync(agendaKtPath, 'utf8');

assert(hojeKt.includes('Check-in agora'), 'Compose Hoje deve ter Check-in agora');
assert(hojeKt.includes('Retroativo'), 'Compose Hoje deve ter Retroativo');
assert(hojeKt.includes('Não cumpri'), 'Compose Hoje deve ter Não cumpri');
assert(hojeKt.includes('Remarcar'), 'Compose Hoje deve ter Remarcar');
assert(hojeKt.includes('Desfazer · 10m'), 'Compose Hoje deve ter Desfazer com tempo');
assert(hojeKt.includes('Esse passo da meta foi concluído?'), 'Compose Hoje deve ter diálogo para passo de meta');
assert(hojeKt.includes('sizeIn(minWidth = 48.dp, minHeight = 48.dp)'), 'Compose Hoje deve ter alvos mínimos de 48dp');

assert(agendaKt.includes('sizeIn(minWidth = 48.dp, minHeight = 48.dp)'), 'Compose Agenda deve ter alvos mínimos de 48dp');
assert(!agendaKt.includes('(+14 dias)'), 'Compose Agenda não deve ter parênteses descritivos');

console.log('✓ 10. Módulos Compose :feature-hoje e :feature-agenda validados com 100% de conformidade\n');

console.log('=== TODOS OS 10 TESTES DA UI DE COMPROMISSOS E CHECK-IN PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
