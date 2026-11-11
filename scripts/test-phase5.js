// scripts/test-phase5.js
// Testes determinísticos da Fase 5: Banco de Minutos de Redes Sociais e Bloqueio Sincronizado

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA FASE 5 (BANCO DE MINUTOS E BLOQUEIO SINCRONIZADO) ===');

// Setup do ambiente e mock do browser/DOM
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

let lastSyncedMinuteBank = null;
let acknowledgedDebits = [];

global.window = {
  addEventListener: () => {},
  AndroidBlocker: {
    scheduleReminder: () => {},
    cancelReminder: () => {},
    pollCompletedTasks: () => '[]',
    putSecret: () => {},
    getSecret: () => null,
    removeSecret: () => {},
    hasSecret: () => false,
    syncState: () => {},
    grantPass: () => {},
    revokePass: () => {},
    syncMinuteBank: (json) => { lastSyncedMinuteBank = JSON.parse(json); },
    pollMinuteBankDebits: () => '[]',
    ackMinuteBankDebit: (id) => { acknowledgedDebits.push(id); },
    getMinuteBankBalanceSeconds: () => 1800,
    isFocoEnabled: () => true
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
    minuteBankEngine,
    saveStateToDeviceStorage,
    loadStateFromDeviceStorage
  };`
);

const { state, AppUI, minuteBankEngine, saveStateToDeviceStorage, loadStateFromDeviceStorage } = scriptFn(
  global.window, global.document, global.localStorage, { vibrate: () => {} },
  global.requestAnimationFrame, global.cancelAnimationFrame
);

const app = new AppUI();
const engine = minuteBankEngine;

assert.ok(engine, 'minuteBankEngine deve existir e ser exportado');

// 1. Teste: Banco opera sob o interruptor do módulo Foco
console.log('1. Testando isolamento pelo interruptor do módulo Foco...');
state.flags.FOCO = true;
state.flags.foco = true;
assert.strictEqual(engine.isFocoActive(state), true, 'Foco deve estar ativo quando flags são true');

// Desativa o interruptor de Foco
state.flags.FOCO = false;
state.flags.foco = false;
assert.strictEqual(engine.isFocoActive(state), false, 'Foco deve estar desativado');

const pausedCard = app.renderMinuteBankCard();
assert.ok(pausedCard.includes('Banco de Minutos · Módulo Pausado'), 'Deve exibir card pausado');
assert.ok(pausedCard.includes('O interruptor do módulo Foco está desligado'), 'Deve informar desligamento');

// Nenhuma transação pode ocorrer com o módulo desligado
const blockedCredit = engine.creditMinutes(state, 10, 'Tentativa com módulo desligado');
assert.strictEqual(blockedCredit, null, 'Não pode creditar minutos com módulo foco desligado');

// Reativa módulo Foco
state.flags.FOCO = true;
state.flags.foco = true;
console.log('   ✓ Isolamento e controle por interruptor do módulo Foco validados.');

// 2. Teste: JS como dono do ganho (tarefas, hábitos e peixinhos)
console.log('2. Testando acúmulo de minutos via tarefas, hábitos e peixinhos...');
state.minuteBank.balanceMinutes = 0;
state.minuteBank.totalEarnedMinutes = 0;

// Ganho via compromisso
engine.creditMinutes(state, 5, 'Compromisso concluído', 'occ-test-1');
assert.strictEqual(state.minuteBank.balanceMinutes, 5, 'Saldo deve subir para 5 min');
assert.strictEqual(state.minuteBank.totalEarnedMinutes, 5);
assert.strictEqual(state.minuteBank.transactions[0].minutes, 5);

// Ganho via hábito
engine.creditMinutes(state, 5, 'Hábito cumprido', 'hab-test-1');
assert.strictEqual(state.minuteBank.balanceMinutes, 10, 'Saldo deve subir para 10 min');
assert.strictEqual(state.minuteBank.totalEarnedMinutes, 10);

// Troca de peixinhos por minutos
state.currencies.peixinhos = 50;
app.redeemMinuteBankWithFish(15, 15);
assert.strictEqual(state.currencies.peixinhos, 35, 'Peixinhos devem ser deduzidos');
assert.strictEqual(state.minuteBank.balanceMinutes, 25, 'Saldo deve subir para 25 min');
console.log('   ✓ JS gerencia os créditos com sucesso. Saldo atual:', state.minuteBank.balanceMinutes, 'min');

// 3. Teste: Nativo como dono do consumo e reconciliação idempotente
console.log('3. Testando reconciliação idempotente JS ↔ Nativo...');
const mockNativeDebits = [
  { debitId: 'deb_ig_1001', pkg: 'com.instagram.android', consumedMinutes: 10, elapsedRealtime: 50000 },
  { debitId: 'deb_tk_1002', pkg: 'com.zhiliaoapp.musically', consumedMinutes: 5, elapsedRealtime: 60000 }
];

// Primeira reconciliação
const processedFirst = engine.reconcileDebits(state, mockNativeDebits);
assert.strictEqual(processedFirst.length, 2, 'Dois débitos devem ser processados');
assert.strictEqual(state.minuteBank.balanceMinutes, 10, 'Saldo de 25 min deduzido de 15 min deve ser 10 min');
assert.strictEqual(state.minuteBank.totalConsumedMinutes, 15);
assert.strictEqual(acknowledgedDebits.includes('deb_ig_1001'), true);
assert.strictEqual(acknowledgedDebits.includes('deb_tk_1002'), true);

// Segunda reconciliação com os mesmos IDs (idempotência estrita)
const processedSecond = engine.reconcileDebits(state, mockNativeDebits);
assert.strictEqual(processedSecond.length, 0, 'Débitos já processados não podem ser debitados novamente');
assert.strictEqual(state.minuteBank.balanceMinutes, 10, 'Saldo deve continuar rigorosamente 10 min');
assert.strictEqual(state.minuteBank.totalConsumedMinutes, 15, 'Total consumido não deve ser alterado');
console.log('   ✓ Idempotência confirmada: débitos repetidos ignorados com sucesso.');

// 4. Teste: Salvaguardas inegociáveis no código nativo e JS
console.log('4. Testando salvaguardas e exceções absolutas...');
const javaPolicyPath = path.join(__dirname, '..', 'android-src', 'com', 'catline', 'app', 'BlockPolicy.java');
const javaPolicyCode = fs.readFileSync(javaPolicyPath, 'utf8');

assert.ok(javaPolicyCode.includes('isAbsoluteException'), 'BlockPolicy deve conter método isAbsoluteException');
assert.ok(javaPolicyCode.includes('whatsapp'), 'Exceção de WhatsApp deve constar explicitamente');
assert.ok(javaPolicyCode.includes('dialer') || javaPolicyCode.includes('phone'), 'Exceção de discador/telefone deve constar');
assert.ok(javaPolicyCode.includes('emergency'), 'Exceção de emergência deve constar');
assert.ok(javaPolicyCode.includes('settings'), 'Exceção de configurações deve constar');
assert.ok(javaPolicyCode.includes('catline'), 'Exceção do próprio Cat Line deve constar');
console.log('   ✓ Exceções absolutas validadas no código de política nativa.');

// 5. Teste: Saída de emergência de 10 segundos
console.log('5. Testando saída de emergência de 10 segundos...');
const javaServicePath = path.join(__dirname, '..', 'android-src', 'com', 'catline', 'app', 'BlockerService.java');
const javaServiceCode = fs.readFileSync(javaServicePath, 'utf8');
assert.ok(javaServiceCode.includes('Saída de Emergência'), 'BlockerService deve ter botão de Saída de Emergência');
assert.ok(javaServiceCode.includes('10000L'), 'Temporizador de emergência deve ser de 10 segundos');

const javaActivityPath = path.join(__dirname, '..', 'android-src', 'com', 'catline', 'app', 'BlockActivity.java');
const javaActivityCode = fs.readFileSync(javaActivityPath, 'utf8');
assert.ok(javaActivityCode.includes('Saída de Emergência'), 'BlockActivity deve ter botão de Saída de Emergência');
assert.ok(javaActivityCode.includes('10000L'), 'Temporizador de emergência deve ser de 10 segundos');

const bankCardHtml = app.renderMinuteBankCard();
const visibleCardText = bankCardHtml.replace(/<[^>]*>/g, ' ');
assert.ok(!/\([^)]*\)/.test(visibleCardText), 'Texto visível do Banco de Minutos não pode conter parênteses descritivos');
console.log('   ✓ Saída de emergência de 10 segundos e ausência de parênteses confirmadas.');

// 6. Teste: Auditoria de relógio nativo (SystemClock.elapsedRealtime)
console.log('6. Testando uso exclusivo de SystemClock.elapsedRealtime no controle de passes...');
const javaStorePath = path.join(__dirname, '..', 'android-src', 'com', 'catline', 'app', 'BlockerStore.java');
const javaStoreCode = fs.readFileSync(javaStorePath, 'utf8');

assert.ok(javaStoreCode.includes('SystemClock.elapsedRealtime()'), 'BlockerStore deve usar SystemClock.elapsedRealtime()');
assert.ok(!javaStoreCode.includes('System.currentTimeMillis()'), 'BlockerStore não deve conter chamadas a System.currentTimeMillis()');
console.log('   ✓ blinde temporal garantido: SystemClock.elapsedRealtime() utilizado sem relógio de parede.');

// 7. Teste: Persistência local do Banco de Minutos
console.log('7. Testando persistência e restauração do Banco de Minutos no localStorage...');
state.minuteBank.balanceMinutes = 45;
state.minuteBank.totalEarnedMinutes = 60;
state.minuteBank.totalConsumedMinutes = 15;
saveStateToDeviceStorage();

const rawStorage = storage['CATLINE_DEVICE_STORAGE_V1'];
assert.ok(rawStorage, 'Estado deve estar salvo');
const parsed = JSON.parse(rawStorage);
assert.ok(parsed.minuteBank, 'minuteBank deve estar gravado no JSON');
assert.strictEqual(parsed.minuteBank.balanceMinutes, 45);
assert.strictEqual(parsed.minuteBank.totalEarnedMinutes, 60);

// Restauração em estado limpo
state.minuteBank = { balanceMinutes: 0, totalEarnedMinutes: 0, totalConsumedMinutes: 0, transactions: [], processedDebitIds: {} };
loadStateFromDeviceStorage();
assert.strictEqual(state.minuteBank.balanceMinutes, 45, 'Saldo restaurado deve ser 45');
assert.strictEqual(state.minuteBank.totalEarnedMinutes, 60);
assert.strictEqual(state.minuteBank.totalConsumedMinutes, 15);
console.log('   ✓ Persistência e restauração do Banco de Minutos validadas com integridade.');

console.log('\n=== TODOS OS 7 TESTES DA FASE 5 PASSARAM COM SUCESSO! ===');
process.exit(0);
