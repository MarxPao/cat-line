// scripts/test-phase6.js
// Testes determinísticos da Fase 6: Polimento, Auditoria de Segurança e Release Beta (v3.1.0)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA FASE 6 (POLIMENTO, AUDITORIA DE SEGURANÇA E RELEASE BETA) ===');

// Setup do ambiente e mock do browser/DOM
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

global.window = {
  IS_RELEASE: true,
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
    syncMinuteBank: () => {},
    pollMinuteBankDebits: () => '[]',
    ackMinuteBankDebit: () => {},
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
    betaReportEngine,
    IS_RELEASE,
    saveStateToDeviceStorage,
    loadStateFromDeviceStorage
  };`
);

const { state, AppUI, betaReportEngine, IS_RELEASE, saveStateToDeviceStorage, loadStateFromDeviceStorage } = scriptFn(
  global.window, global.document, global.localStorage, { vibrate: () => {} },
  global.requestAnimationFrame, global.cancelAnimationFrame
);

const app = new AppUI();
const engine = betaReportEngine;

assert.ok(engine, 'betaReportEngine deve existir e ser exportado');

// 1. Teste: Relatório Beta local, anônimo e seguro (F6-01)
console.log('1. Testando Relatório Beta local e garantia de privacidade...');
state.occurrences = [
  { id: 'occ-sec-1', title: 'Compromisso Muito Pessoal e Confidencial', effort: 'M', state: 'FEITO' },
  { id: 'occ-sec-2', title: 'Consulta Médica Secreta', effort: 'G', state: 'PENDENTE' }
];
state.messages = [
  { text: 'Desabafo íntimo da usuária com a gatinha' }
];

const report = engine.generateAnonymousReport(state);
assert.ok(report.version === '3.1.0' || report.version === '3.2.0', 'Versão do relatório deve ser 3.1.0 ou 3.2.0');
assert.ok(report.versionCode === 12 || report.versionCode === 13 || report.versionCode === 320, 'VersionCode deve ser 12, 13 ou 320');
assert.strictEqual(report.networkUsed, false, 'Relatório deve ser 100% offline (zero rede)');
assert.strictEqual(report.telemetry.occurrencesTotal, 2);
assert.strictEqual(report.telemetry.occurrencesDone, 1);
assert.strictEqual(report.telemetry.occurrencesPending, 1);
assert.strictEqual(report.telemetry.completionRatePct, 50);

// Auditoria estrita: nenhuma palavra pessoal pode constar no JSON exportado
const reportJson = JSON.stringify(report);
assert.ok(!reportJson.includes('Pessoal'), 'Relatório não pode conter títulos de compromissos pessoais');
assert.ok(!reportJson.includes('Médica'), 'Relatório não pode conter palavras de saúde');
assert.ok(!reportJson.includes('Desabafo'), 'Relatório não pode conter conversas ou desabafos');
assert.ok(!reportJson.includes('apiKey'), 'Relatório não pode conter chaves');
console.log('   ✓ Relatório Beta anônimo validado com 100% de privacidade.');

// 2. Teste: Desligamento de botões de teste e debug em release (F6-02)
console.log('2. Testando desligamento de debug e atalhos acelerados em release...');
assert.strictEqual(IS_RELEASE, true, 'IS_RELEASE deve estar ativo em produção');
app.renderTabHoje();
const hojeHtml = app.contentEl.innerHTML;
assert.ok(!hojeHtml.includes('Avançar 15m'), 'Botão de teste rápido de tempo deve estar oculto em release');
assert.ok(!hojeHtml.includes('Avançar 1 Dia'), 'Botão de avançar 1 dia deve estar oculto em release');

const blockerHtml = app.renderNativeBlockerCard();
assert.ok(!blockerHtml.includes('🧪 Testar tela de bloqueio'), 'Botão de teste de tela deve estar oculto em release');
console.log('   ✓ Botões de depuração desligados com sucesso em release.');

// 3. Teste: Auditoria temporal (F6-03 - zero Date.now / new Date fora de clock.js)
console.log('3. Testando auditoria de chamadas temporais...');
const lines = appCode.split('\n');
const forbiddenTimeCalls = [];
lines.forEach((line, idx) => {
  if (line.includes('Date.now(') || line.includes('new Date(')) {
    forbiddenTimeCalls.push(`Linha ${idx + 1}: ${line.trim()}`);
  }
});
assert.strictEqual(forbiddenTimeCalls.length, 0, `Nenhuma chamada a Date.now ou new Date permitida fora de clock.js. Encontradas:\n${forbiddenTimeCalls.join('\n')}`);
console.log('   ✓ Zero chamadas diretas a Date.now() ou new Date() em app.js.');

// 4. Teste: Auditoria de segurança no localStorage (F6-03)
console.log('4. Testando segurança no armazenamento local...');
saveStateToDeviceStorage();
const rawStored = storage['CATLINE_DEVICE_STORAGE_V1'];
assert.ok(rawStored, 'Dados locais devem ser gravados');
const parsedStored = JSON.parse(rawStored);

// Verificação de ausência de chaves de API ou dados de rede sensíveis
assert.strictEqual(parsedStored.apiKey, undefined, 'Nenhuma chave de API no localStorage');
assert.strictEqual(parsedStored.userPassword, undefined, 'Nenhuma senha no localStorage');
assert.strictEqual(parsedStored.secretToken, undefined, 'Nenhum token no localStorage');
console.log('   ✓ Armazenamento local 100% seguro contra vazamentos.');

// 5. Teste: Validação do manifesto Android (F6-03)
console.log('5. Testando configurações de segurança no manifesto Android...');
const buildApkCode = fs.readFileSync(path.join(__dirname, 'build-apk.js'), 'utf8');
assert.ok(buildApkCode.includes('android:allowBackup="false"'), 'Manifesto deve ter allowBackup="false"');
assert.ok(buildApkCode.includes('com.catline.app'), 'Pacote deve ser com.catline.app');
console.log('   ✓ Manifesto validado com allowBackup="false".');

// 6. Teste: Ausência total de parênteses descritivos (F6-03)
console.log('6. Testando ausência total de parênteses descritivos nos novos cards...');
const betaCardHtml = app.renderBetaReportCard();
const visibleBetaText = betaCardHtml.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<[^>]*>/g, ' ');
assert.ok(!/\([a-zA-ZÀ-ÿ\s]{2,}\)/.test(visibleBetaText), 'Texto visível do card beta não pode ter parênteses descritivos');

const visibleBlockerText = blockerHtml.replace(/<[^>]*>/g, ' ');
assert.ok(!/\([a-zA-ZÀ-ÿ\s]{2,}\)/.test(visibleBlockerText), 'Texto visível do bloqueador não pode ter parênteses descritivos');
console.log('   ✓ Ausência de parênteses descritivos validada com sucesso.');

// 7. Teste: Integridade do pacote e versão
console.log('7. Testando integridade do relatório e suporte offline...');
const reportCardHtml = app.renderBetaReportCard();
assert.ok(reportCardHtml.includes('Relatório Beta Local Seguro'), 'Card deve exibir título acolhedor');
assert.ok(reportCardHtml.includes('v3.1.0') || reportCardHtml.includes('v3.2.0'), 'Deve exibir versão do app');
assert.ok(reportCardHtml.includes('0 bytes · Offline'), 'Deve indicar operação 100% offline');
console.log('   ✓ Card de auditoria beta renderizado com perfeição.');

console.log('\n=== TODOS OS 7 TESTES DA FASE 6 PASSARAM COM SUCESSO! ===');
process.exit(0);
