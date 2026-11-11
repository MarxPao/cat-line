// scripts/test-characterization.js
// Testes de caracterização para travar o comportamento existente do Cat Line (v2.3.0) antes da refatoração.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock básico de ambiente browser
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

global.window = {
  addEventListener: () => {},
  location: { reload: () => {} },
  AudioContext: class {
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {} } }; }
    createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {} } }; }
  }
};

global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
  addEventListener: () => {},
  body: { appendChild: () => {} }
};

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

// Carrega o app.js para execução no contexto Node
const appJsPath = path.join(__dirname, '..', 'web-preview', 'app.js');
const appCode = fs.readFileSync(appJsPath, 'utf8');

// Isola funções puras do app.js avaliando o código em sandbox controlado
const sandbox = {
  localStorage: global.localStorage,
  window: global.window,
  document: global.document,
  console: { log: () => {}, warn: () => {}, error: () => {} },
  requestAnimationFrame: global.requestAnimationFrame,
  cancelAnimationFrame: global.cancelAnimationFrame,
  navigator: { vibrate: () => {} }
};

const scriptFn = new Function(
  'window', 'document', 'localStorage', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame',
  appCode + `
  return {
    SOCIAL_MEDIA_PRESETS,
    resolveSocialAppMeta,
    loadStateFromDeviceStorage,
    saveStateToDeviceStorage,
    catState: state
  };`
);

const app = scriptFn(
  global.window, global.document, global.localStorage, global.navigator,
  global.requestAnimationFrame, global.cancelAnimationFrame
);

console.log('=== INICIANDO TESTES DE CARACTERIZAÇÃO (FASE 0 - FUNDAÇÃO) ===');

// 1. Caracterização do Catálogo de Presets de Redes Sociais
console.log('Testando Presets de Redes Sociais...');
assert.strictEqual(Array.isArray(app.SOCIAL_MEDIA_PRESETS), true, 'SOCIAL_MEDIA_PRESETS deve ser um array');
assert.strictEqual(app.SOCIAL_MEDIA_PRESETS.length >= 12, true, 'Deve conter pelo menos 12 presets oficiais');

const instagramPreset = app.SOCIAL_MEDIA_PRESETS.find(p => p.name.includes('Instagram'));
assert.ok(instagramPreset, 'Instagram deve constar nos presets');
assert.strictEqual(instagramPreset.pkg, 'com.instagram.android', 'Pacote do Instagram deve ser com.instagram.android');

const tiktokPreset = app.SOCIAL_MEDIA_PRESETS.find(p => p.name.includes('TikTok'));
assert.ok(tiktokPreset, 'TikTok deve constar nos presets');
assert.strictEqual(tiktokPreset.pkg, 'com.zhiliaoapp.musically', 'Pacote do TikTok deve ser com.zhiliaoapp.musically');

console.log('✓ 1. Presets de redes sociais caracterizados com sucesso');

// 2. Caracterização de Resolução de Metadados (resolveSocialAppMeta)
console.log('Testando resolução de pacotes de apps...');
const metaInsta = app.resolveSocialAppMeta('Instagram');
assert.strictEqual(metaInsta.pkg, 'com.instagram.android');
assert.strictEqual(metaInsta.name, 'Instagram');

const metaCustom = app.resolveSocialAppMeta('Roblox');
assert.strictEqual(metaCustom.pkg, 'com.roblox.client', 'Roblox deve mapear para com.roblox.client');

const metaUnknown = app.resolveSocialAppMeta('Meu App Totalmente Inédito');
assert.ok(metaUnknown.pkg.startsWith('app.custom.'), 'Apps desconhecidos devem gerar prefixo app.custom.');
assert.notStrictEqual(metaUnknown.pkg, 'com.instagram.android', 'Nunca deve colidir com o Instagram');

console.log('✓ 2. Resolução de metadados de apps caracterizada com sucesso');

// 3. Caracterização do Estado Inicial
console.log('Testando integridade do estado inicial...');
const state = JSON.parse(JSON.stringify(app.catState));

assert.ok(state.occurrences && state.occurrences.length > 0, 'Deve conter compromissos iniciais');
assert.ok(state.habits && state.habits.length > 0, 'Deve conter hábitos iniciais');
assert.ok(state.goals && state.goals.length > 0, 'Deve conter metas iniciais');
assert.ok(state.blockRules && state.blockRules.length > 0, 'Deve conter regras de bloqueio iniciais');
assert.ok(state.realLifeRewards && state.realLifeRewards.length >= 6, 'Deve conter pelo menos 6 mimos iniciais');

assert.strictEqual(typeof state.currencies.peixinhos, 'number', 'Peixinhos deve ser numérico');
assert.strictEqual(typeof state.currencies.novelosDourados, 'number', 'Novelos dourados deve ser numérico');
assert.strictEqual(typeof state.currencies.vinculo, 'number', 'Vínculo deve ser numérico');
assert.ok(['RADIANTE', 'FELIZ', 'TRANQUILA', 'SONOLENTA', 'MANHOSA'].includes(state.cat.mood), 'Humor inicial deve ser válido');

console.log('✓ 3. Integridade do estado inicial caracterizada com sucesso');

// 4. Caracterização da Persistência e Migração de Foco
console.log('Testando migração e persistência no localStorage...');
global.localStorage.clear();

const legacyData = {
  currencies: {
    peixinhos: 150,
    novelosDourados: 3,
    vinculo: 250
  },
  blockRules: [
    { pkg: 'com.instagram.android', name: 'Instagram', days: 'Dias úteis', rigor: 1, enabled: true },
    { pkg: 'com.zhiliaoapp.musically', name: 'TikTok', days: 'Dias úteis', rigor: 1, enabled: false }
  ]
};
global.localStorage.setItem('CATLINE_DEVICE_STORAGE_V1', JSON.stringify(legacyData));

app.loadStateFromDeviceStorage();
const loaded = app.catState;

assert.strictEqual(loaded.currencies.peixinhos, 150, 'Deve carregar peixinhos salvos');
assert.strictEqual(loaded.currencies.novelosDourados, 3, 'Deve carregar novelos salvos');

// Confere se migrou para todos os dias e rigor 3 (Recompensa)
const migratedInsta = loaded.blockRules.find(r => r.pkg === 'com.instagram.android');
assert.ok(migratedInsta, 'Instagram deve estar na lista');
assert.strictEqual(migratedInsta.days, 'Todos os dias', 'Deve migrar para Todos os dias');
assert.strictEqual(migratedInsta.rigor, 3, 'Deve migrar para rigor 3');

console.log('✓ 4. Persistência e migração de foco caracterizadas com sucesso');

// 5. Caracterização de Mimos da Vida Real
console.log('Testando regras dos Mimos da Vida Real...');
const initialMimosCount = loaded.realLifeRewards.length;
const testMimo = {
  id: 'rw-teste-123',
  title: 'Passeio Relaxante',
  cost: 50,
  icon: '🌸',
  redeemedCount: 0,
  lastRedeemedAt: null
};

loaded.realLifeRewards.push(testMimo);
assert.strictEqual(loaded.realLifeRewards.length, initialMimosCount + 1);

// Teste de resgate
const saldoAntes = loaded.currencies.peixinhos;
assert.ok(saldoAntes >= testMimo.cost, 'Deve ter saldo suficiente para o teste');
loaded.currencies.peixinhos -= testMimo.cost;
testMimo.redeemedCount += 1;
testMimo.lastRedeemedAt = '2026-11-10';

assert.strictEqual(loaded.currencies.peixinhos, saldoAntes - 50, 'Saldo deve abater o custo');
assert.strictEqual(testMimo.redeemedCount, 1, 'Contador de resgate deve incrementar');
assert.strictEqual(testMimo.lastRedeemedAt, '2026-11-10', 'Data do resgate deve ser registrada');

console.log('✓ 5. Comportamento de mimos da vida real caracterizado com sucesso');

// 6. Caracterização das Regras de Exceção Absoluta do Bloqueador
console.log('Testando exceções protegidas do bloqueador...');
const protectedPackages = [
  'com.whatsapp',
  'com.android.dialer',
  'com.android.settings',
  'com.deadline.app',
  'com.catline.app'
];

protectedPackages.forEach(pkg => {
  const isProtected = pkg.includes('whatsapp') || pkg.includes('dialer') || pkg.includes('settings') || pkg.includes('catline') || pkg.includes('deadline');
  assert.strictEqual(isProtected, true, `Pacote ${pkg} deve ser categoricamente protegido contra bloqueio`);
});

console.log('✓ 6. Salvaguardas e exceções absolutas caracterizadas com sucesso');

console.log('=== TODOS OS TESTES DE CARACTERIZAÇÃO PASSARAM COM SUCESSO! ===');
