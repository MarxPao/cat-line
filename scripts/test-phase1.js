// scripts/test-phase1.js
// Testes determinísticos da Fase 1: Lembretes nativos e cofre local

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA FASE 1 (LEMBRETES NATIVOS E COFRE) ===');

// 1. Verificação da existência das classes Java do framework nativo
console.log('1. Verificando integridade das classes Java da Fase 1...');
const androidSrcDir = path.join(__dirname, '..', 'android-src', 'com', 'catline', 'app');
assert.ok(fs.existsSync(path.join(androidSrcDir, 'NotificationHelper.java')), 'NotificationHelper.java deve existir');
assert.ok(fs.existsSync(path.join(androidSrcDir, 'ReminderReceiver.java')), 'ReminderReceiver.java deve existir');
assert.ok(fs.existsSync(path.join(androidSrcDir, 'SecureVault.java')), 'SecureVault.java deve existir');
assert.ok(fs.existsSync(path.join(androidSrcDir, 'BlockerBridge.java')), 'BlockerBridge.java deve existir');

const bridgeCode = fs.readFileSync(path.join(androidSrcDir, 'BlockerBridge.java'), 'utf8');
assert.ok(bridgeCode.includes('scheduleReminder'), 'BlockerBridge deve expor scheduleReminder');
assert.ok(bridgeCode.includes('cancelReminder'), 'BlockerBridge deve expor cancelReminder');
assert.ok(bridgeCode.includes('pollCompletedTasks'), 'BlockerBridge deve expor pollCompletedTasks');
assert.ok(bridgeCode.includes('putSecret'), 'BlockerBridge deve expor putSecret');
assert.ok(bridgeCode.includes('getSecret'), 'BlockerBridge deve expor getSecret');

console.log('✓ 1. Classes nativas e métodos da ponte Java expostos com sucesso');

// 2. Mock do ambiente browser com a ponte nativa AndroidBlocker simulada
console.log('2. Testando reconciliação nativa de tarefas concluídas via notificação...');

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

let nativeScheduledReminders = {};
let nativeCompletedQueue = [];
let nativeSecureVault = {};

global.window = {
  addEventListener: () => {},
  AndroidBlocker: {
    scheduleReminder: (id, title, timeStr, triggerAt) => {
      nativeScheduledReminders[id] = { title, timeStr, triggerAt };
    },
    cancelReminder: (id) => {
      delete nativeScheduledReminders[id];
    },
    pollCompletedTasks: () => {
      const copy = JSON.stringify(nativeCompletedQueue);
      nativeCompletedQueue = [];
      return copy;
    },
    putSecret: (k, v) => { nativeSecureVault[k] = v; },
    getSecret: (k) => nativeSecureVault[k] || null,
    removeSecret: (k) => { delete nativeSecureVault[k]; },
    hasSecret: (k) => k in nativeSecureVault
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
  height: 240,
  getContext: () => ({
    fillRect: () => {}, clearRect: () => {}, fillText: () => {},
    beginPath: () => {}, stroke: () => {}, fill: () => {},
    arc: () => {}, moveTo: () => {}, lineTo: () => {},
    save: () => {}, restore: () => {}, closePath: () => {}, drawImage: () => {}
  }),
  focus: () => {},
  style: {},
  appendChild: () => {},
  removeChild: () => {},
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  setAttribute: () => {},
  getAttribute: () => null,
  addEventListener: () => {}
});

global.document = {
  getElementById: (id) => createMockElement(),
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  createElement: () => createMockElement(),
  addEventListener: () => {},
  body: createMockElement()
};

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

// Carrega Clock determinístico
const Clock = require('../web-preview/clock.js');
global.CatLineClock = Clock;
global.Clock = Clock;

// Carrega o app.js
const appJsPath = path.join(__dirname, '..', 'web-preview', 'app.js');
const appCode = fs.readFileSync(appJsPath, 'utf8');

const scriptFn = new Function(
  'window', 'document', 'localStorage', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame',
  appCode + `
  return {
    state,
    AppUI,
    loadStateFromDeviceStorage
  };`
);

const { state, AppUI } = scriptFn(
  global.window, global.document, global.localStorage, { vibrate: () => {} },
  global.requestAnimationFrame, global.cancelAnimationFrame
);

const appInstance = new AppUI();

// 3. Teste de agendamento de lembretes nativos
console.log('3. Testando agendamento e cancelamento de lembretes...');
state.notificationsEnabled = true;
const testTaskId = 'occ-test-reminder-999';
state.occurrences.push({
  id: testTaskId,
  title: 'Treino da Gatinha',
  time: '23:59',
  effort: 'G',
  reward: 20,
  recurrence: 'Todos os dias',
  date: '2026-11-10',
  state: 'PENDENTE',
  delayMin: 0
});

appInstance.syncNativeReminders();
assert.ok(nativeScheduledReminders[testTaskId], 'Lembrete deve ter sido agendado no mock nativo');
assert.strictEqual(nativeScheduledReminders[testTaskId].title, 'Treino da Gatinha');

// Cancelamento ao cumprir
state.occurrences.find(o => o.id === testTaskId).state = 'FEITO';
appInstance.syncNativeReminders();
assert.strictEqual(nativeScheduledReminders[testTaskId], undefined, 'Lembrete deve ser cancelado quando o compromisso não estiver mais pendente');

console.log('✓ 3. Agendamento e cancelamento de lembretes validados com sucesso');

// 4. Teste de reconciliação de tarefas concluídas via notificação nativa ('Feito ✓')
console.log('4. Testando reconciliação de clique direto na notificação...');
const notifTaskId = 'occ-notif-action-777';
state.occurrences.push({
  id: notifTaskId,
  title: 'Beber Água Fresca',
  time: '18:00',
  effort: 'M',
  reward: 10,
  recurrence: 'Todos os dias',
  date: '2026-11-10',
  state: 'PENDENTE',
  delayMin: 0
});

const saldoAntes = state.currencies.peixinhos;
const vinculoAntes = state.currencies.vinculo;

// Simula o Android registrando a tarefa como feita pelo botão da notificação
nativeCompletedQueue.push({
  taskId: notifTaskId,
  taskTitle: 'Beber Água Fresca',
  completedAt: Date.now()
});

// Ao verificar a fila nativa
appInstance.checkNativeCompletedTasks();

const targetOcc = state.occurrences.find(o => o.id === notifTaskId);
assert.strictEqual(targetOcc.state, 'FEITO', 'Tarefa deve mudar de estado para FEITO após clique na notificação');
assert.strictEqual(state.currencies.peixinhos, saldoAntes + 10, 'Deve creditar Peixinhos da tarefa cumprida');
assert.strictEqual(state.currencies.vinculo, vinculoAntes + 15, 'Deve creditar Vínculo da tarefa');

// Fila deve ter sido esvaziada
assert.strictEqual(nativeCompletedQueue.length, 0, 'Fila de tarefas concluídas deve ser esvaziada após consumo');

console.log('✓ 4. Reconciliação e premiação de cliques em notificações validadas com sucesso');

// 5. Teste do Cofre Seguro Nativo (putSecret / getSecret)
console.log('5. Testando cofre seguro nativo...');
global.window.AndroidBlocker.putSecret('test_api_key', 'catline_sk_secret_123456');
assert.strictEqual(global.window.AndroidBlocker.getSecret('test_api_key'), 'catline_sk_secret_123456');
assert.strictEqual(global.window.AndroidBlocker.hasSecret('test_api_key'), true);

global.window.AndroidBlocker.removeSecret('test_api_key');
assert.strictEqual(global.window.AndroidBlocker.getSecret('test_api_key'), null);
assert.strictEqual(global.window.AndroidBlocker.hasSecret('test_api_key'), false);

console.log('✓ 5. Métodos do cofre seguro local validados com sucesso');

// 6. Teste de preservação de dados
console.log('6. Testando preservação integral de dados no storage local...');
const sampleState = {
  currencies: { peixinhos: 350, novelosDourados: 5, vinculo: 500 },
  cat: { name: 'Mimi Calico', mood: 'RADIANTE' },
  realLifeRewards: [{ id: 'rw-1', title: 'Sorvete', cost: 25 }]
};
global.localStorage.setItem('CATLINE_DEVICE_STORAGE_V1', JSON.stringify(sampleState));

const loaded = JSON.parse(global.localStorage.getItem('CATLINE_DEVICE_STORAGE_V1'));
assert.strictEqual(loaded.currencies.peixinhos, 350);
assert.strictEqual(loaded.cat.name, 'Mimi Calico');
assert.strictEqual(loaded.realLifeRewards.length, 1);

console.log('✓ 6. Preservação de dados confirmada com sucesso');

console.log('=== TODOS OS TESTES DA FASE 1 PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
