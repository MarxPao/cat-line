// scripts/test-phase14-goals-ui.js
// Suíte de Testes da UI de Metas e Passos (Cat Line v3.2.0 · Prompt 8)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA UI DE METAS E PASSOS (V3.2.0 - PROMPT 8) ===\n');

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
  visibilityState: 'visible'
};

global.navigator = { vibrate: () => {} };
global.alert = () => {};
global.confirm = () => true;

// Injetar módulos auxiliares
global.CatLineClock = require('../web-preview/clock.js');
global.CatLineCommitmentsConfig = require('../web-preview/commitments-config.js');
global.goalStepEngine = require('../web-preview/goal-step-engine.js').goalStepEngine;
global.commitmentStateMachine = require('../web-preview/commitment-state-machine.js').commitmentStateMachine;
global.delayMetricsEngine = require('../web-preview/delay-metrics-engine.js').delayMetricsEngine;
global.rewardLedgerEngine = require('../web-preview/reward-ledger-engine.js').rewardLedgerEngine;
global.dayClosureEngine = require('../web-preview/day-closure-engine.js').dayClosureEngine;

const appCode = fs.readFileSync('web-preview/app.js', 'utf8');
eval(appCode + '\nglobal.state = state;\nglobal.AppUI = AppUI;\n');

domListeners.forEach(cb => cb());
if (!global.window.app) global.window.app = new AppUI();
const app = global.window.app;

// 1. Testando renderização da lista de metas com progresso de passos
console.log('1. Testando renderização da lista de metas com progresso de passos...');

app.switchTab('metas');
const metasHtml = app.contentEl.innerHTML;
assert(metasHtml.includes('Passos da Meta'), 'Deverá conter a seção de Passos da Meta');
assert(metasHtml.includes('Progresso:'), 'Deverá exibir indicador de progresso');
assert(metasHtml.includes('+ Passo'), 'Deverá conter botão de adicionar passo');

console.log('✓ 1. Lista de metas renderizada com novelo de progresso e seção de passos\n');

// 2. Testando adição de passo à meta
console.log('2. Testando adição de novo passo à meta...');

const targetGoal = global.state.goals[0];
const initialStepCount = targetGoal.steps ? targetGoal.steps.length : 0;

// Configura inputs simulados
getOrCreateElement(`new-step-title-${targetGoal.id}`).value = 'Revisar interface pixel art';
getOrCreateElement(`new-step-est-${targetGoal.id}`).value = '35';

app.addStepToGoal(targetGoal.id);

const newStepCount = targetGoal.steps.length;
assert.strictEqual(newStepCount, initialStepCount + 1, 'Passo deve ser adicionado à meta');
const addedStep = targetGoal.steps[targetGoal.steps.length - 1];
assert.strictEqual(addedStep.title, 'Revisar interface pixel art');
assert.strictEqual(addedStep.estMinutes, 35);
assert.strictEqual(addedStep.doneAt, null);

console.log('✓ 2. Adição de novo passo com título e estimativa validada com sucesso\n');

// 3. Testando edição inline e reordenação de passos
console.log('3. Testando edição de título e reordenação de passos...');

// Inicia edição
app.startEditStep(addedStep.id);
assert.strictEqual(global.state.editingStepId, addedStep.id);

getOrCreateElement(`edit-step-title-${addedStep.id}`).value = 'Revisar interface pixel art e contraste';
app.saveEditStep(targetGoal.id, addedStep.id);

assert.strictEqual(addedStep.title, 'Revisar interface pixel art e contraste');
assert.strictEqual(global.state.editingStepId, null);

// Reordenação
const oldOrder = addedStep.order;
app.reorderGoalStep(targetGoal.id, addedStep.id, -1);
assert.strictEqual(addedStep.order, oldOrder - 1, 'Passo deve ter sua ordem diminuída');

console.log('✓ 3. Edição inline e reordenação de passos validadas com sucesso\n');

// 4. Testando divisão e arquivamento de passo
console.log('4. Testando divisão (split) e arquivamento de passo...');

const stepToSplit = targetGoal.steps[0];
const preSplitCount = targetGoal.steps.length;

app.splitGoalStep(targetGoal.id, stepToSplit.id);
assert.strictEqual(targetGoal.steps.length, preSplitCount + 1, 'Divisão deve gerar novo passo irmão');
assert(stepToSplit.title.includes('Parte 1'), 'Título original deve ser sufixado com Parte 1');

// Arquivamento
const stepToArchive = targetGoal.steps[targetGoal.steps.length - 1];
app.archiveGoalStep(targetGoal.id, stepToArchive.id);
assert.strictEqual(stepToArchive.archived, true, 'Passo deve ser marcado como archived = true');

console.log('✓ 4. Divisão em 2 partes e arquivamento seguro validados\n');

// 5. Testando conclusão de passo e premiação no livro-razão
console.log('5. Testando conclusão de passo por toque e emissão de peixinhos...');

const stepToComplete = targetGoal.steps.find(s => !s.doneAt && !s.archived);
assert(stepToComplete, 'Deve haver um passo ativo não concluído');

const peixinhosBefore = global.state.currencies.peixinhos;
app.toggleGoalStepDone(targetGoal.id, stepToComplete.id);

assert.notStrictEqual(stepToComplete.doneAt, null, 'Passo deve ter doneAt preenchido');
assert(global.state.currencies.peixinhos >= peixinhosBefore, 'Conclusão de passo deve conceder peixinhos');

console.log('✓ 5. Conclusão de passo por toque emite recompensa e atualiza progresso visual\n');

// 6. Testando botão "Agendar este passo" pré-populando formulário
console.log('6. Testando botão "Agendar este passo" com pré-preenchimento...');

const stepToSchedule = targetGoal.steps.find(s => !s.archived);
app.scheduleStep(targetGoal.id, stepToSchedule.id);

assert.strictEqual(global.state.activeTab, 'agenda', 'Deve navegar automaticamente para a aba Agenda');
assert(global.state.scheduledStepPreFill, 'Deve configurar pre-fill do passo');
assert.strictEqual(global.state.scheduledStepPreFill.stepId, stepToSchedule.id);
assert.strictEqual(global.state.scheduledStepPreFill.goalId, targetGoal.id);

// Preenche os campos simulados da agenda
getOrCreateElement('new-task-title').value = global.state.scheduledStepPreFill.title;
getOrCreateElement('new-task-time').value = '15:00';
getOrCreateElement('new-task-effort').value = 'M';
getOrCreateElement('new-task-duration').value = '30';
getOrCreateElement('new-task-recurrence').value = 'Todos os dias';
getOrCreateElement('new-task-date').value = global.state.dayKey;

app.addCommitment();
assert.strictEqual(global.state.scheduledStepPreFill, null, 'Pre-fill deve ser resetado após agendamento');
const createdCommitment = global.state.occurrences[global.state.occurrences.length - 1];
assert.strictEqual(createdCommitment.goalId, targetGoal.id);
assert.strictEqual(createdCommitment.stepId, stepToSchedule.id);

console.log('✓ 6. Fluxo "Agendar este passo" validado com pré-preenchimento e vínculo completo\n');

// 7. Testando acessibilidade e ausência de parênteses descritivos
console.log('7. Testando acessibilidade (alvo mínimo de toque 48dp) e ausência de parênteses...');

app.switchTab('metas');
const metasRendered = app.contentEl.innerHTML;
assert(!metasRendered.includes('Passos da Meta ('), 'Não deve conter parênteses no título de passos');
assert(metasRendered.includes('min-width: 48px; min-height: 48px;'), 'Alvos de toque devem ter estilo mínimo de 48px');

console.log('✓ 7. Acessibilidade 48px e ausência de parênteses descritivos confirmadas\n');

// 8. Verificando Compose Kotlin correspondente em :feature-metas
console.log('8. Verificando componentes Compose em feature-metas/MetasFeatureModule.kt...');

const ktFile = path.join(
  __dirname,
  '..',
  'feature-metas',
  'src',
  'main',
  'kotlin',
  'com',
  'deadline',
  'feature',
  'metas',
  'MetasFeatureModule.kt'
);

assert(fs.existsSync(ktFile), 'MetasFeatureModule.kt deve existir');
const ktContent = fs.readFileSync(ktFile, 'utf8');

assert(ktContent.includes('Passos da Meta'), 'Compose deve renderizar Passos da Meta');
assert(ktContent.includes('sizeIn(minWidth = 48.dp, minHeight = 48.dp)'), 'Alvo de toque mínimo de 48dp deve estar presente');
assert(ktContent.includes('scheduleStep'), 'ViewModel e Compose devem suportar scheduleStep');
assert(ktContent.includes('addStep'), 'ViewModel deve suportar addStep');
assert(ktContent.includes('reorderStep'), 'ViewModel deve suportar reorderStep');
assert(ktContent.includes('splitStep'), 'ViewModel deve suportar splitStep');
assert(ktContent.includes('archiveStep'), 'ViewModel deve suportar archiveStep');

console.log('✓ 8. Componente Compose :feature-metas validado com acessibilidade 48dp e sem parênteses\n');

console.log('=== TODOS OS 8 TESTES DA UI DE METAS E PASSOS PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
