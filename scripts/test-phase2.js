// scripts/test-phase2.js
// Testes determinísticos da Fase 2: Estimativa vs. Tempo Real (EstimationEngine e Calibração)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA FASE 2 (ESTIMATIVA VS. TEMPO REAL) ===');

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
    EstimationEngine,
    loadStateFromDeviceStorage
  };`
);

const { state, AppUI, EstimationEngine } = scriptFn(
  global.window, global.document, global.localStorage, { vibrate: () => {} },
  global.requestAnimationFrame, global.cancelAnimationFrame
);

const app = new AppUI();
const engine = EstimationEngine;

assert.ok(engine, 'EstimationEngine deve estar disponível');
assert.strictEqual(engine.MIN_SAMPLES, 5, 'MIN_SAMPLES deve ser exatamente 5');

// 1. Regra Estrita: Nenhuma sugestão com menos de 5 amostras concluídas
console.log('1. Testando barreira de amostragem mínima (0 a 4 amostras)...');
let testHistory = [];

for (let i = 1; i <= 4; i++) {
  testHistory = engine.addSample(testHistory, {
    category: 'ESTUDO',
    taskTitle: `Sessão de Estudo ${i}`,
    estimatedDuration: 30,
    actualDuration: 60,
    completedAt: Clock.isoString()
  });

  const analysis = engine.analyzeCategory(testHistory, 'ESTUDO');
  assert.strictEqual(analysis.hasEnoughSamples, false, `Com ${i} amostras, hasEnoughSamples deve ser false`);
  assert.strictEqual(analysis.suggestion, null, `Com ${i} amostras, suggestion deve ser null`);
  assert.strictEqual(analysis.sampleCount, i, `sampleCount deve ser ${i}`);
}
console.log('✓ 1. Barreira de 5 amostras respeitada estritamente (nenhuma sugestão gerada de 1 a 4 amostras)');

// 2. Geração de sugestão a partir da 5ª amostra com divergência
console.log('2. Testando sugestão com 5 amostras e cálculo de mediana real...');
testHistory = engine.addSample(testHistory, {
  category: 'ESTUDO',
  taskTitle: 'Sessão de Estudo 5',
  estimatedDuration: 30,
  actualDuration: 55,
  completedAt: Clock.isoString()
});

const analysis5 = engine.analyzeCategory(testHistory, 'ESTUDO');
assert.strictEqual(analysis5.hasEnoughSamples, true, 'Com 5 amostras, hasEnoughSamples deve ser true');
assert.ok(analysis5.suggestion, 'Deve gerar objeto de sugestão de calibração');
assert.strictEqual(analysis5.suggestion.category, 'ESTUDO');
assert.strictEqual(analysis5.suggestion.catFriendlyName, 'Estudos');
assert.strictEqual(analysis5.suggestion.currentEstimate, 30);
assert.strictEqual(analysis5.suggestion.suggestedEstimate, 60, 'Mediana de [55,60,60,60,60] é 60');
console.log('✓ 2. Sugestão gerada com sucesso na 5ª amostra com mediana correta');

// 3. Validação de ausência de parênteses descritivos nas mensagens da interface
console.log('3. Testando ausência de parênteses descritivos no texto da gatinha...');
const sugText = analysis5.suggestion.text;
const hasDescriptiveParens = /\([^)]*\)/.test(sugText);
assert.strictEqual(hasDescriptiveParens, false, 'O texto da sugestão não deve conter parênteses descritivos');
assert.ok(sugText.includes('Mamãe, você costuma levar cerca de 60 minutos em Estudos'), 'Texto deve ser acolhedor e claro');
console.log('✓ 3. Ausência de parênteses descritivos validada com sucesso');

// 4. Confirmação Obrigatória: Nada muda sem aprovação da usuária
console.log('4. Testando confirmação obrigatória (nenhuma alteração automática)...');
state.occurrences = [
  { id: 'occ-e1', title: 'Estudo Matemática', effort: 'M', estimatedDuration: 30, state: 'PENDENTE' },
  { id: 'occ-e2', title: 'Estudo Física', effort: 'M', estimatedDuration: 30, state: 'PENDENTE' },
  { id: 'occ-t1', title: 'Trabalho Relatório', effort: 'M', estimatedDuration: 30, state: 'PENDENTE' },
  { id: 'occ-e3', title: 'Estudo Passado', effort: 'M', estimatedDuration: 30, state: 'FEITO' }
];

state.durationHistory = testHistory;
state.pendingCalibrationSuggestion = analysis5.suggestion;

// Antes de aceitar, as durações devem permanecer 30 min intactas
assert.strictEqual(state.occurrences[0].estimatedDuration, 30);
assert.strictEqual(state.occurrences[1].estimatedDuration, 30);

// Usuária aceita toque de confirmação
app.acceptCalibration();

// Apenas tarefas pendentes de ESTUDO devem ser ajustadas para 60 min
assert.strictEqual(state.occurrences[0].estimatedDuration, 60, 'Tarefa de estudo pendente deve calibrar para 60');
assert.strictEqual(state.occurrences[1].estimatedDuration, 60, 'Tarefa de estudo pendente deve calibrar para 60');
assert.strictEqual(state.occurrences[2].estimatedDuration, 30, 'Tarefa de trabalho não deve ser alterada');
assert.strictEqual(state.occurrences[3].estimatedDuration, 30, 'Tarefa já feita não deve ser alterada');
assert.strictEqual(state.pendingCalibrationSuggestion, null, 'Sugestão pendente deve ser limpa após aceite');
console.log('✓ 4. Confirmação explícita obrigatória validada: apenas tarefas do escopo foram calibradas');

// 5. Opção de recusar ("Agora Não") mantém tudo inalterado
console.log('5. Testando recusa de sugestão pela usuária...');
state.pendingCalibrationSuggestion = {
  category: 'TRABALHO',
  catFriendlyName: 'Trabalho',
  suggestedEstimate: 90,
  text: 'Que tal calibrar?'
};
app.dismissCalibration();
assert.strictEqual(state.pendingCalibrationSuggestion, null);
assert.strictEqual(state.occurrences[2].estimatedDuration, 30, 'Duração de trabalho não deve mudar');
assert.strictEqual(state.dismissedSuggestions['TRABALHO'], 90, 'Deve registrar recusa para não incomodar novamente');
console.log('✓ 5. Recusa respeitada e registrada com sucesso');

// 6. Registro de duração real em execução ativa de tarefas e hábitos
console.log('6. Testando medição de tempo decorrido via Clock...');
Clock.setFakeTime('2026-10-25T10:00:00.000Z');
state.occurrences.push({
  id: 'occ-timer-test',
  title: 'Estudo Química',
  effort: 'M',
  estimatedDuration: 30,
  state: 'PENDENTE'
});

app.startActiveExecution('occ-timer-test', 'occurrence');
assert.strictEqual(state.activeExecutionId, 'occ-timer-test');

// Avança 42 minutos no relógio determinístico
Clock.advanceByMs(42 * 60 * 1000);
app.markDone('occ-timer-test');

const doneOcc = state.occurrences.find(o => o.id === 'occ-timer-test');
assert.strictEqual(doneOcc.state, 'FEITO');
assert.strictEqual(doneOcc.actualDuration, 42, 'Duração real calculada deve ser exatamente 42 minutos');

const lastSample = state.durationHistory[state.durationHistory.length - 1];
assert.strictEqual(lastSample.actualDuration, 42);
assert.strictEqual(lastSample.estimatedDuration, 30);
console.log('✓ 6. Medição de duração real com relógio determinístico validada com sucesso');

// 7. Persistência de histórico de duração e calibrações
console.log('7. Testando persistência local do histórico e configurações de calibração...');
app.persist();

const savedData = JSON.parse(storage['CATLINE_DEVICE_STORAGE_V1']);
assert.ok(Array.isArray(savedData.durationHistory), 'durationHistory deve ser array no storage');
assert.ok(savedData.durationHistory.length >= 6, 'Histórico de durações deve estar salvo');
assert.strictEqual(savedData.calibratedCategories['ESTUDO'], 60, 'calibratedCategories deve ser salvo');
assert.strictEqual(savedData.dismissedSuggestions['TRABALHO'], 90, 'dismissedSuggestions deve ser salvo');
console.log('✓ 7. Persistência de dados da Fase 2 validada com sucesso');

console.log('=== TODOS OS 7 TESTES DA FASE 2 PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
