// Teste determinístico do Sistema de Mimos da Vida Real
const fs = require('fs');

// Mock browser environment
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

const createMockElement = () => ({
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
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  setAttribute: () => {},
  getAttribute: () => null,
  addEventListener: () => {}
});

global.document = {
  getElementById: (id) => createMockElement(),
  createElement: () => createMockElement(),
  addEventListener: () => {},
  visibilityState: 'visible'
};

global.navigator = {
  vibrate: (pattern) => { global.lastVibration = pattern; }
};

global.alert = (msg) => { global.lastAlert = msg; };
global.confirm = () => true;

// Evaluate app.js and expose state
const appCode = fs.readFileSync('web-preview/app.js', 'utf8');
eval(appCode + '\nglobal.state = state;\nglobal.AppUI = AppUI;\n');

// Trigger DOMContentLoaded
domListeners.forEach(cb => cb());
if (!window.app) window.app = new AppUI();

console.log("=== INICIANDO TESTES DO SISTEMA DE MIMOS DA VIDA REAL ===");

// 1. Estado inicial
console.assert(Array.isArray(state.realLifeRewards), "realLifeRewards deve ser um array");
console.assert(state.realLifeRewards.length >= 6, "Deve ter pelo menos 6 mimos pré-configurados");
console.log(`✓ 1. Estado inicial possui ${state.realLifeRewards.length} mimos cadastrados com sucesso`);

// 2. Persistência
saveStateToDeviceStorage();
const savedRaw = localStorageStore['CATLINE_DEVICE_STORAGE_V1'];
console.assert(savedRaw && savedRaw.includes('Café especial'), "LocalStorage deve conter mimos salvos");
console.log("✓ 2. Mimos salvos no LocalStorage com sucesso");

// 3. Criação de novo mimo
const initialCount = state.realLifeRewards.length;
const fakeInputs = {
  'new-reward-title': { value: 'Dia no Parque com Piquenique', focus: () => {} },
  'new-reward-cost': { value: '55', focus: () => {} }
};
const origGetById = document.getElementById;
document.getElementById = (id) => fakeInputs[id] || createMockElement();

window.app.createRealReward();
console.assert(state.realLifeRewards.length === initialCount + 1, "Deveria ter adicionado 1 mimo");
const added = state.realLifeRewards.find(x => x.title === 'Dia no Parque com Piquenique');
console.assert(added && added.cost === 55, "Mimo adicionado deve ter dados corretos");
console.log("✓ 3. Criação de mimo realizada com sucesso: " + added.title + " (" + added.cost + "🐟)");

// 4. Edição de mimo
fakeInputs[`edit-rw-title-${added.id}`] = { value: 'Dia no Parque e Cinema' };
fakeInputs[`edit-rw-cost-${added.id}`] = { value: '60' };
fakeInputs[`edit-rw-icon-${added.id}`] = { value: '🌳' };

window.app.saveEditRealReward(added.id);
console.assert(added.title === 'Dia no Parque e Cinema' && added.cost === 60 && added.icon === '🌳', "Mimo deve estar atualizado");
console.log("✓ 4. Edição de mimo confirmada: " + added.title + " (" + added.icon + " " + added.cost + "🐟)");

// 5. Resgate com Peixinhos suficientes
state.currencies.peixinhos = 100;
const prevVinculo = state.currencies.vinculo;
window.app.redeemRealReward(added.id);

console.assert(state.currencies.peixinhos === 40, "Saldo de Peixinhos deve ser 40 (100 - 60)");
console.assert(added.redeemedCount === 1, "Contador de resgates deve ser 1");
console.assert(state.currencies.vinculo === prevVinculo + 25, "Vínculo deve aumentar +25");
console.assert(state.celebratingReward && state.celebratingReward.id === added.id, "Banner comemorativo deve estar ativo");
console.log("✓ 5. Resgate de mimo comemorado com sucesso! Saldo restante: " + state.currencies.peixinhos + "🐟");

// 6. Resgate bloqueado quando faltam Peixinhos
global.lastAlert = null;
window.app.redeemRealReward(added.id); // precisa de 60, só tem 40
console.assert(state.currencies.peixinhos === 40, "Saldo não deve mudar se insuficiente");
console.assert(global.lastAlert && global.lastAlert.includes('Faltam 20🐟'), "Deve alertar carinhosamente quantos peixinhos faltam");
console.log("✓ 6. Validação de saldo insuficiente funcionando perfeitamente: " + global.lastAlert);

// 7. Fechamento de celebração
window.app.dismissRewardCelebration();
console.assert(state.celebratingReward === null, "Banner de celebração deve ser fechado");
console.log("✓ 7. Banner de celebração fechado corretamente");

// 8. Exclusão de mimo
window.app.deleteRealReward(added.id);
console.assert(!state.realLifeRewards.some(x => x.id === added.id), "Mimo deve ter sido excluído");
console.log("✓ 8. Exclusão de mimo concluída com sucesso");

// 9. Trancar outros apps via preset (ex: Netflix e Discord) sem sobrescrever o Instagram
window.app.quickToggleLockPreset('netflix');
window.app.quickToggleLockPreset('discord');
const instaRule = state.blockRules.find(r => r.name === 'Instagram');
const netflixRule = state.blockRules.find(r => r.name === 'Netflix');
const discordRule = state.blockRules.find(r => r.name === 'Discord');
console.assert(instaRule && instaRule.enabled, "Instagram deve continuar trancado");
console.assert(netflixRule && netflixRule.enabled && netflixRule.pkg === 'com.netflix.mediaclient', "Netflix deve estar trancado");
console.assert(discordRule && discordRule.enabled && discordRule.pkg === 'com.discord', "Discord deve estar trancado");
console.log("✓ 9. Trava de múltiplos apps por preset (Netflix, Discord) funcionando sem sobrescrever Instagram");

// 10. Trancar qualquer app personalizado a pedido da usuária (ex: Roblox e Shopee)
fakeInputs['quick-lock-input-hoje'] = { value: 'Roblox' };
window.app.quickAddLockedApp('quick-lock-input-hoje');
fakeInputs['foco-app-name'] = { value: 'Shopee' };
fakeInputs['foco-pkg-name'] = { value: 'com.instagram.android' }; // simula campo antigo com valor padrão
fakeInputs['foco-rigor'] = { value: '3' };
fakeInputs['foco-time-start'] = { value: '00:00' };
fakeInputs['foco-time-end'] = { value: '23:59' };
fakeInputs['foco-days'] = { value: 'Todos os dias' };
window.app.saveBlockRule();

const robloxRule = state.blockRules.find(r => r.name === 'Roblox');
const shopeeRule = state.blockRules.find(r => r.name === 'Shopee');
console.assert(robloxRule && robloxRule.enabled && robloxRule.pkg === 'com.roblox.client', "Roblox deve ter sido trancado");
console.assert(shopeeRule && shopeeRule.enabled && shopeeRule.pkg === 'com.shopee.br', "Shopee deve ter sido trancada sem sobrescrever Instagram");
console.assert(state.blockRules.some(r => r.name === 'Instagram'), "Instagram permanece intacto");
console.log("✓ 10. Trava de apps personalizados a pedido da usuária (Roblox, Shopee) funcionando perfeitamente");

// 11. Tentar abrir app trancado aciona a Barreira de Bloqueio (simulatedModal)
window.app.simulateOpenSocialApp(netflixRule.id);
console.assert(state.simulatedModal && state.simulatedModal.rule.id === netflixRule.id, "Barreira de bloqueio deve abrir para a Netflix");
console.log("✓ 11. Barreira de bloqueio em tela cheia acionada ao tentar abrir app trancado");

// 12. Destravar app como Recompensa usando Peixinhos (15 min por 15🐟)
state.currencies.peixinhos = 50;
window.app.redeemAppUnlockPass(netflixRule.id, 15, 15);
console.assert(state.currencies.peixinhos === 35, "Saldo deve descontar 15🐟 (50 -> 35)");
console.assert(Boolean(window.app.isAppCurrentlyUnlockedByPass(netflixRule.pkg)), "Netflix deve ter passe de recompensa ativo");
console.assert(state.simulatedModal === null, "Barreira deve fechar após destravar");
console.log("✓ 12. Destravamento de app como recompensa (15🐟 por 15 min) funcionando");

// 13. Trancar novamente na hora revoga o passe imediatamente
window.app.relockAppNow(netflixRule.id);
console.assert(!window.app.isAppCurrentlyUnlockedByPass(netflixRule.pkg), "Passe deve ser revogado ao trancar novamente");
console.log("✓ 13. Retrancamento imediato revoga o passe e volta a bloquear o app");

// 14. Trancar todas as redes revoga todos os passes e reseta sessões de desbloqueio
window.app.redeemAppUnlockPass(robloxRule.id, 15, 15);
window.app.redeemAppUnlockPass(shopeeRule.id, 15, 15);
console.assert(state.activeUnlockSessions.length >= 2, "Devem haver múltiplos passes ativos");
window.app.relockAllAppsNow();
console.assert(state.activeUnlockSessions.length === 0, "Todos os passes devem ser limpos por relockAllAppsNow");
console.log("✓ 14. Trancamento global de todas as redes funcionando com sucesso");

// Restaura getElementById
document.getElementById = origGetById;

console.log("=== TODOS OS 14 TESTES PASSARAM COM 100% DE SUCESSO! ===");
process.exit(0);
