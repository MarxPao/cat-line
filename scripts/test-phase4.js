// scripts/test-phase4.js
// Testes determinísticos da Fase 4: Insights Acionáveis e Correlações Saudáveis (insightsEngine)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA FASE 4 (INSIGHTS ACIONÁVEIS E CORRELAÇÕES SAUDÁVEIS) ===');

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
  getElementById: (id) => {
    const el = createMockElement();
    el.id = id;
    return el;
  },
  querySelectorAll: () => [],
  querySelector: () => createMockElement(),
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
    insightsEngine,
    saveStateToDeviceStorage,
    loadStateFromDeviceStorage
  };`
);

const { state, AppUI, insightsEngine, saveStateToDeviceStorage, loadStateFromDeviceStorage } = scriptFn(
  global.window, global.document, global.localStorage, { vibrate: () => {} },
  global.requestAnimationFrame, global.cancelAnimationFrame
);

const app = new AppUI();
const engine = insightsEngine;

assert.ok(engine, 'insightsEngine deve existir e ser exportado');
assert.strictEqual(engine.MIN_DAYS, 7, 'Mínimo de dias para correlação deve ser rigorosamente 7');

// 1. Teste de barreira estrita de 7 dias
console.log('1. Testando barreira de dados mínimos (< 7 dias não gera correlação)...');
const emptyAnalysis = engine.analyzeCorrelation([]);
assert.strictEqual(emptyAnalysis.hasEnoughData, false, 'Com 0 dias não deve ter dados suficientes');
assert.strictEqual(emptyAnalysis.dayCount, 0);
assert.strictEqual(emptyAnalysis.requiredDays, 7);

const sample3Days = [
  { dayKey: '2026-10-18', screenTimeMinutes: 45, socialApp: 'Instagram', punctualityPct: 90 },
  { dayKey: '2026-10-19', screenTimeMinutes: 60, socialApp: 'Instagram', punctualityPct: 80 },
  { dayKey: '2026-10-20', screenTimeMinutes: 50, socialApp: 'Instagram', punctualityPct: 85 }
];
const threeDaysAnalysis = engine.analyzeCorrelation(sample3Days);
assert.strictEqual(threeDaysAnalysis.hasEnoughData, false, 'Com 3 dias não deve ter dados suficientes');
assert.strictEqual(threeDaysAnalysis.dayCount, 3);
assert.strictEqual(threeDaysAnalysis.requiredDays, 7);

const sample6Days = [
  ...sample3Days,
  { dayKey: '2026-10-21', screenTimeMinutes: 30, socialApp: 'Instagram', punctualityPct: 95 },
  { dayKey: '2026-10-22', screenTimeMinutes: 40, socialApp: 'Instagram', punctualityPct: 90 },
  { dayKey: '2026-10-23', screenTimeMinutes: 120, socialApp: 'Instagram', punctualityPct: 60 }
];
const sixDaysAnalysis = engine.analyzeCorrelation(sample6Days);
assert.strictEqual(sixDaysAnalysis.hasEnoughData, false, 'Com 6 dias ainda não atinge o limiar mínimo de 7');
assert.strictEqual(sixDaysAnalysis.dayCount, 6);
console.log('   ✓ Barreira estrita de 7 dias respeitada com rigor.');

// 2. Teste com >= 7 dias e correlação de pontualidade positiva
console.log('2. Testando correlação saudável com 8 amostras diárias...');
const sample8Days = [
  { dayKey: '2026-10-18', screenTimeMinutes: 20, socialApp: 'Instagram', punctualityPct: 95 },
  { dayKey: '2026-10-19', screenTimeMinutes: 30, socialApp: 'Instagram', punctualityPct: 90 },
  { dayKey: '2026-10-20', screenTimeMinutes: 25, socialApp: 'Instagram', punctualityPct: 100 },
  { dayKey: '2026-10-21', screenTimeMinutes: 35, socialApp: 'Instagram', punctualityPct: 85 },
  { dayKey: '2026-10-22', screenTimeMinutes: 150, socialApp: 'Instagram', punctualityPct: 40 },
  { dayKey: '2026-10-23', screenTimeMinutes: 180, socialApp: 'Instagram', punctualityPct: 50 },
  { dayKey: '2026-10-24', screenTimeMinutes: 200, socialApp: 'Instagram', punctualityPct: 45 },
  { dayKey: '2026-10-25', screenTimeMinutes: 160, socialApp: 'Instagram', punctualityPct: 50 }
];
const correlationAnalysis = engine.analyzeCorrelation(sample8Days);
assert.strictEqual(correlationAnalysis.hasEnoughData, true, 'Com 8 dias deve analisar correlações');
assert.strictEqual(correlationAnalysis.dayCount, 8);
assert.strictEqual(correlationAnalysis.topApp, 'Instagram');
assert.ok(correlationAnalysis.diffPct > 30, 'Diferença de pontualidade deve ser detectada');
assert.ok(correlationAnalysis.insightText.includes('menos tempo no Instagram'), 'Deve citar o app mais frequente');
assert.ok(correlationAnalysis.insightText.includes('nosso fio tendeu a ficar mais pontual'), 'Deve usar redação acolhedora');
console.log('   ✓ Correlação calculada:', correlationAnalysis.insightText);

// 3. Teste de linguagem de coincidência (zero julgamento, zero parênteses descritivos)
console.log('3. Testando auditoria de linguagem e ausência de parênteses...');
const forbiddenWords = ['causa', 'por causa de', 'culpa', 'culpado', 'prejudicou', 'atrapalhou', 'falha'];
const lowerInsight = correlationAnalysis.insightText.toLowerCase();
for (const bad of forbiddenWords) {
  assert.ok(!lowerInsight.includes(bad), `Texto do insight não pode conter palavra proibida: "${bad}"`);
}
assert.ok(!/\([^)]*\)/.test(correlationAnalysis.insightText), 'Insight não pode conter parênteses descritivos');
console.log('   ✓ Linguagem acolhedora de coincidência validada sem juízo de valor e sem parênteses.');

// 4. Teste de registro dinâmico via addDailyRecord
console.log('4. Testando adição e atualização de registros diários...');
let history = [];
history = engine.addDailyRecord(history, {
  dayKey: '2026-10-24',
  screenTimeMinutes: 45,
  socialApp: 'TikTok',
  punctualityPct: 80,
  goalsCompleted: 4,
  totalGoals: 5
});
assert.strictEqual(history.length, 1);
assert.strictEqual(history[0].dayKey, '2026-10-24');
assert.strictEqual(history[0].screenTimeMinutes, 45);
assert.strictEqual(history[0].socialApp, 'TikTok');

// Atualização idempotente do mesmo dia
history = engine.addDailyRecord(history, {
  dayKey: '2026-10-24',
  screenTimeMinutes: 55,
  socialApp: 'TikTok',
  punctualityPct: 85,
  goalsCompleted: 5,
  totalGoals: 5
});
assert.strictEqual(history.length, 1, 'Mesmo dayKey deve atualizar sem duplicar registro');
assert.strictEqual(history[0].screenTimeMinutes, 55);
assert.strictEqual(history[0].punctualityPct, 85);
console.log('   ✓ Registro diário gerenciado com segurança e integridade.');

// 5. Teste de renderização de UI quando dados são insuficientes (< 7 dias)
console.log('5. Testando renderização do card em período de observação inicial...');
state.dailyCorrelationHistory = sample3Days;
const initialHtml = app.renderCorrelationInsightCard();
assert.ok(initialHtml.includes('Observação do Fio e Tempo de Tela'), 'Deve exibir título acolhedor de observação');
assert.ok(initialHtml.includes('Faltam 4 dias de observação'), 'Deve informar quantos dias faltam com clareza');
assert.ok(initialHtml.includes('3 de 7 dias registrados'), 'Deve mostrar contagem da barra de progresso');
assert.ok(!/\([^)]*\)/.test(initialHtml), 'Card de observação não pode conter parênteses descritivos');
console.log('   ✓ Card de observação inicial renderizado com barra de progresso e tom acolhedor.');

// 6. Teste de renderização de UI quando há dados suficientes (>= 7 dias)
console.log('6. Testando renderização do card com insight acionável...');
state.dailyCorrelationHistory = sample8Days;
const fullHtml = app.renderCorrelationInsightCard();
assert.ok(fullHtml.includes('Descoberta da Gatinha · Coincidências do Fio'), 'Deve apresentar descoberta da gatinha');
assert.ok(fullHtml.includes('MENOS TEMPO DE TELA'), 'Deve destacar estatística do grupo de menor uso');
assert.ok(fullHtml.includes('MAIS TEMPO DE TELA'), 'Deve destacar estatística do grupo de maior uso');
assert.ok(fullHtml.includes('Coincidência observada em 8 dias de uso'), 'Deve registrar amostra total');
assert.ok(!/\([^)]*\)/.test(fullHtml), 'Card completo não pode conter parênteses descritivos');
console.log('   ✓ Card de correlação saudável renderizado com sucesso.');

// 7. Teste de persistência de dados no armazenamento local
console.log('7. Testando persistência de dailyCorrelationHistory no armazenamento...');
state.dailyCorrelationHistory = sample8Days;
saveStateToDeviceStorage();

const rawSaved = storage['CATLINE_DEVICE_STORAGE_V1'];
assert.ok(rawSaved, 'Deve ter salvo dados no CATLINE_DEVICE_STORAGE_V1');
const parsed = JSON.parse(rawSaved);
assert.ok(Array.isArray(parsed.dailyCorrelationHistory), 'dailyCorrelationHistory deve estar no JSON');
assert.strictEqual(parsed.dailyCorrelationHistory.length, 8);
assert.strictEqual(parsed.dailyCorrelationHistory[0].socialApp, 'Instagram');

// Limpa estado em memória e restaura
state.dailyCorrelationHistory = [];
loadStateFromDeviceStorage();
assert.strictEqual(state.dailyCorrelationHistory.length, 8, 'Deve restaurar os 8 registros');
assert.strictEqual(state.dailyCorrelationHistory[0].dayKey, '2026-10-18');
console.log('   ✓ Persistência e restauração do histórico de correlações validadas.');

console.log('\n=== TODOS OS 7 TESTES DA FASE 4 PASSARAM COM SUCESSO! ===');
process.exit(0);
