// scripts/test-phase3.js
// Testes determinísticos da Fase 3: Replanejamento Inteligente e Gestão de Carga (replanEngine)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA FASE 3 (REPLANEJAMENTO E GESTÃO DE CARGA) ===');

// Setup do ambiente e mock do browser/DOM
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

global.window = {
  addEventListener: () => {},
  AndroidBlocker: {
    scheduleReminder: () => {},
    cancelReminder: () => {},
    pollCompletedTasks: () => '[]',
    putSecret: () => {},
    getSecret: () => null,
    removeSecret: () => {},
    hasSecret: () => false
  },
  AudioContext: class {
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
    createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
  }
};

const createMockElement = () => ({
  textContent: '',
  innerHTML: '',
  value: '',
  width: 320,
  height: 200,
  getContext: () => ({
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    arc: () => {},
    fill: () => {},
    fillText: () => {},
    strokeText: () => {},
    save: () => {},
    restore: () => {},
    closePath: () => {},
    drawImage: () => {},
    measureText: () => ({ width: 40 })
  }),
  focus: () => {},
  style: {},
  addEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  click: () => {},
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  setAttribute: () => {},
  getAttribute: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 200 })
});

global.document = {
  getElementById: (id) => createMockElement(),
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  createElement: () => createMockElement(),
  body: createMockElement(),
  addEventListener: () => {}
};

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

// Carrega Clock
const Clock = require('../web-preview/clock.js');
global.CatLineClock = Clock;
global.Clock = Clock;

// Carrega app.js
const appJsPath = path.join(__dirname, '..', 'web-preview', 'app.js');
const appCode = fs.readFileSync(appJsPath, 'utf8');

const scriptFn = new Function(
  'window', 'document', 'localStorage', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame',
  appCode + `
  return {
    state,
    AppUI,
    replanEngine,
    loadStateFromDeviceStorage
  };`
);

const { state, AppUI, replanEngine } = scriptFn(
  global.window, global.document, global.localStorage, { vibrate: () => {} },
  global.requestAnimationFrame, global.cancelAnimationFrame
);

const app = new AppUI();
const engine = replanEngine;

assert.ok(engine, 'replanEngine deve existir e ser exportado');
assert.strictEqual(engine.DEFAULT_CAPACITY_MIN, 420, 'Capacidade padrão deve ser 420 minutos (7 horas)');

// 1. Teste de cálculo de carga diária e detecção de sobrecarga
console.log('1. Testando cálculo puro de carga de minutos agendados...');
const testDay = '2026-10-25';
const sampleTasks = [
  { id: 't1', title: 'Treino A', date: testDay, estimatedDuration: 60, state: 'FEITO' },
  { id: 't2', title: 'Estudo Matemática', date: testDay, estimatedDuration: 120, state: 'PENDENTE' },
  { id: 't3', title: 'Reunião Trabalho', date: testDay, estimatedDuration: 120, state: 'PENDENTE' },
  { id: 't4', title: 'Projeto Cat Line', date: testDay, estimatedDuration: 150, state: 'PENDENTE' }
];

const workload = engine.calculateDailyWorkload(sampleTasks, testDay);
assert.strictEqual(workload.totalMinutes, 450, 'Total deve ser 60 + 120 + 120 + 150 = 450 min');
assert.strictEqual(workload.doneMinutes, 60, 'Minutos feitos devem ser 60');
assert.strictEqual(workload.pendingMinutes, 390, 'Minutos pendentes devem ser 390');
assert.strictEqual(workload.taskCount, 4);
assert.strictEqual(workload.pendingTaskCount, 3);

const overload = engine.checkOverload(sampleTasks, { dailyCapacityMinutes: 420 }, testDay);
assert.strictEqual(overload.isOverloaded, true, '450 min deve ultrapassar 420 min');
assert.strictEqual(overload.overloadMinutes, 30, 'Excesso deve ser 30 min');
assert.ok(overload.warning, 'Deve conter aviso acolhedor');
assert.strictEqual(/\([^)]*\)/.test(overload.warning), false, 'Aviso de sobrecarga não deve conter parênteses descritivos');
console.log('✓ 1. Cálculo de carga diária e sobrecarga validados com sucesso');

// 2. Teste de redistribuição suave de tarefas com linguagem acolhedora
console.log('2. Testando sugestão de redistribuição suave sem sensação de fracasso...');
Clock.setFakeTime('2026-10-25T14:00:00.000Z');
const plan = engine.suggestReplan(sampleTasks, { dailyCapacityMinutes: 420 }, testDay, '14:00');

assert.ok(plan, 'Deve gerar plano de replanejamento');
assert.strictEqual(plan.reason, 'SOBRECARGA');
assert.strictEqual(plan.targetDate, '2026-10-26', 'Data alvo deve ser o dia seguinte');
assert.ok(plan.tasksToMove.length >= 1, 'Deve selecionar tarefas para mover');
assert.strictEqual(/\([^)]*\)/.test(plan.text), false, 'Texto do plano não deve ter parênteses descritivos');
assert.ok(plan.text.includes('proteger sua energia') || plan.text.includes('novelo continua firme'), 'Mensagem acolhedora esperada');
console.log('✓ 2. Sugestão de redistribuição acolhedora gerada com sucesso');

// 3. Teste de detecção de tarefas atrasadas no horário
console.log('3. Testando detecção de tarefas com horário já ultrapassado...');
const delayedTasks = [
  { id: 'd1', title: 'Treino Manhã', date: testDay, time: '08:00', state: 'PENDENTE', estimatedDuration: 45 },
  { id: 'd2', title: 'Almoço', date: testDay, time: '12:00', state: 'FEITO', estimatedDuration: 30 },
  { id: 'd3', title: 'Estudo Tarde', date: testDay, time: '19:00', state: 'PENDENTE', estimatedDuration: 60 }
];

const foundDelayed = engine.findDelayedTasks(delayedTasks, testDay, '15:00');
assert.strictEqual(foundDelayed.length, 1, 'Apenas a tarefa das 08:00 pendente deve ser atrasada');
assert.strictEqual(foundDelayed[0].id, 'd1');

const delayedPlan = engine.suggestReplan(delayedTasks, { dailyCapacityMinutes: 420 }, testDay, '15:00');
assert.ok(delayedPlan, 'Deve gerar plano para tarefas atrasadas');
assert.strictEqual(delayedPlan.reason, 'ATRASO');
assert.strictEqual(delayedPlan.tasksToMove[0].taskId, 'd1');
assert.strictEqual(delayedPlan.tasksToMove[0].suggestedDate, '2026-10-26');
console.log('✓ 3. Tarefas atrasadas detectadas e incluídas no replanejamento com sucesso');

// 4. Teste de pureza da função applyReplan
console.log('4. Testando pureza do motor (applyReplan não altera original)...');
const originalTasks = [
  { id: 'p1', title: 'Leitura', date: '2026-10-25', time: '10:00', state: 'PENDENTE' },
  { id: 'p2', title: 'Trabalho', date: '2026-10-25', time: '11:00', state: 'FEITO' }
];

const moves = [
  { taskId: 'p1', suggestedDate: '2026-10-26', suggestedTime: '10:00' }
];

const updated = engine.applyReplan(originalTasks, moves);
assert.notStrictEqual(updated, originalTasks, 'Deve retornar nova referência de array');
assert.strictEqual(originalTasks[0].date, '2026-10-25', 'Array original deve permanecer intacto');
assert.strictEqual(updated[0].date, '2026-10-26', 'Nova lista deve ter tarefa movida para 2026-10-26');
assert.strictEqual(updated[1].date, '2026-10-25', 'Tarefa FEITO não deve ser alterada');
console.log('✓ 4. Pureza do algoritmo applyReplan confirmada');

// 5. Teste de confirmação tátil: nada muda sem aprovação da usuária
console.log('5. Testando confirmação tátil no AppUI (aceite explícito)...');
state.occurrences = [
  { id: 'occ-rep-1', title: 'Estudo Inglês', date: '2026-10-25', time: '09:00', state: 'PENDENTE', estimatedDuration: 60 }
];
state.pendingReplanPlan = {
  id: 'plan-101',
  text: 'Posso adiar para amanhã?',
  tasksToMove: [
    { taskId: 'occ-rep-1', suggestedDate: '2026-10-26', suggestedTime: '09:00', duration: 60 }
  ]
};

// Antes de aceitar, data permanece 2026-10-25
assert.strictEqual(state.occurrences[0].date, '2026-10-25');

// Usuária toca no botão "Replanejar com Carinho ✓"
app.acceptReplan();

assert.strictEqual(state.occurrences[0].date, '2026-10-26', 'Data deve mudar para amanhã apenas após aceite');
assert.strictEqual(state.pendingReplanPlan, null, 'Plano deve ser limpo após aceite');
console.log('✓ 5. Confirmação tátil obrigatória validada com sucesso');

// 6. Teste de recusa pela usuária ("Manter Como Está")
console.log('6. Testando recusa da sugestão de replanejamento...');
state.occurrences = [
  { id: 'occ-rep-2', title: 'Organizar Casa', date: '2026-10-25', time: '10:00', state: 'PENDENTE', estimatedDuration: 45 }
];
state.pendingReplanPlan = {
  id: 'plan-202',
  text: 'Posso adiar?',
  tasksToMove: [
    { taskId: 'occ-rep-2', suggestedDate: '2026-10-26', suggestedTime: '10:00', duration: 45 }
  ]
};

// Usuária toca em "Manter Como Está"
app.dismissReplan();

assert.strictEqual(state.occurrences[0].date, '2026-10-25', 'Data deve continuar no dia original');
assert.strictEqual(state.pendingReplanPlan, null);
assert.strictEqual(state.dismissedReplanId, 'plan-202', 'ID recusado deve ser memorizado');
console.log('✓ 6. Recusa respeitada e memorizada com sucesso');

// 7. Teste de persistência de estado do replanejamento no localStorage
console.log('7. Testando persistência de estado...');
state.pendingReplanPlan = { id: 'plan-save-test', text: 'Teste persist' };
state.dismissedReplanId = 'plan-dismissed-save';
app.persist();

const savedData = JSON.parse(storage['CATLINE_DEVICE_STORAGE_V1']);
assert.strictEqual(savedData.pendingReplanPlan.id, 'plan-save-test');
assert.strictEqual(savedData.dismissedReplanId, 'plan-dismissed-save');
console.log('✓ 7. Persistência de dados do replanejamento validada com sucesso');

console.log('=== TODOS OS 7 TESTES DA FASE 3 PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
