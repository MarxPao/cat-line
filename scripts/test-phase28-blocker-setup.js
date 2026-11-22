/**
 * scripts/test-phase28-blocker-setup.js
 * Ativação do bloqueador fora da Play Store: cartão de configuração, aviso de bateria,
 * escape de HTML e as otimizações do serviço de acessibilidade.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== INICIANDO TESTES DA ATIVAÇÃO DO BLOQUEADOR ===\n');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('web-preview/app.js');

function slice(start, end) {
  const a = app.indexOf(start);
  const b = app.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'não achei trecho ' + start);
  return app.slice(a, b);
}

const escSrc = slice('function escHtml(value) {', "if (typeof window !== 'undefined') window.escHtml = escHtml;");
const cardSrc = slice('  renderNativeBlockerCard() {', '  refreshBlockerDiag() {');
const batterySrc = slice('  batteryHint(manufacturer) {', '  notifFixNotifications()');

function render({ diag, notif, bridge = true }) {
  const win = {};
  if (bridge) win.AndroidBlocker = { diagnostics: () => JSON.stringify(diag) };
  const ctx = vm.createContext({
    window: win,
    PALETTE: { cozyPurple: '#5C4B7D', leafGreen: '#27ae60', grayDark: '#555' },
    Clock: { formatTime: ms => 't' + ms },
    JSON, String, Number, Math,
    syncNativeBlocker: () => {}
  });
  vm.runInContext(escSrc + '\nthis.escHtml = escHtml;', ctx);
  const obj = vm.runInContext('({' + cardSrc + ',' + batterySrc + ', getNotifStatus() { return ' + JSON.stringify(notif || null) + '; } })', ctx);
  return obj.renderNativeBlockerCard();
}

// 1. Sem a ponte (navegador): convite para instalar o APK
let html = render({ bridge: false });
assert.ok(html.includes('Baixar APK Android'));
console.log('✓ 1. Fora do APK o cartão convida a instalar o aplicativo');

// 2. Serviço desligado no Android 13 ou mais novo: três passos com configuração restrita
html = render({ diag: { serviceEnabled: false, sdk: 34, device: 'Xiaomi Redmi', rules: [] } });
assert.ok(html.includes('3 passos'));
assert.ok(html.includes('Configuração restrita'));
assert.ok(html.includes('Permitir configurações restritas'));
assert.ok(html.includes('Esse item só aparece depois da tentativa do passo 1'));
assert.ok(html.includes('openBlockerSettings'));
assert.ok(html.includes('openBlockerAppInfo'));
assert.ok(html.includes('Ver como a gatinha bloqueia'), 'o teste precisa existir também no APK de release');
console.log('✓ 2. Android 13 ou mais novo: três passos, na ordem certa, e botão de teste');

// 3. Android antigo: sem o passo de configuração restrita
html = render({ diag: { serviceEnabled: false, sdk: 30, rules: [] } });
assert.ok(html.includes('2 passos'));
assert.ok(!html.includes('Configuração restrita'));
assert.ok(!html.includes('openBlockerAppInfo'));
console.log('✓ 3. Android 12 ou mais antigo: dois passos e sem o botão de Info do app');

// 4. Serviço ligado e bateria restringindo: aviso com dica do fabricante
html = render({
  diag: { serviceEnabled: true, sdk: 34, rules: [{ name: 'Instagram', status: 'TRAVA AGORA', installed: true }] },
  notif: { batteryUnrestricted: false, manufacturer: 'xiaomi' }
});
assert.ok(html.includes('Bloqueio Nativo Android Ativo'));
assert.ok(html.includes('pausar o bloqueio para economizar bateria'));
assert.ok(html.includes('Xiaomi'));
assert.ok(html.includes('notifFixBattery'));
console.log('✓ 4. Serviço ligado com bateria restrita mostra aviso e dica do fabricante');

// 5. Bateria liberada: sem aviso
html = render({ diag: { serviceEnabled: true, sdk: 34, rules: [] }, notif: { batteryUnrestricted: true, manufacturer: 'samsung' } });
assert.ok(!html.includes('economizar bateria'));
assert.ok(html.includes('Ver como a gatinha bloqueia'));
html = render({ diag: { serviceEnabled: true, sdk: 34, rules: [] }, notif: null });
assert.ok(!html.includes('economizar bateria'), 'sem a ponte de avisos não inventa aviso');
console.log('✓ 5. Bateria liberada ou desconhecida: sem aviso');

// 6. Texto vindo do aparelho ou das regras é escapado
html = render({
  diag: {
    serviceEnabled: true, sdk: 34, version: '<b>x</b>', device: '<img src=x onerror=alert(1)>', lastPkg: '"><script>1</script>',
    lastBlock: '<i>p</i>@5', rules: [{ name: '<img src=x onerror=alert(2)>', status: '<u>s</u>', installed: false }]
  }
});
assert.ok(!/<img src=x/.test(html) && !/<script>1/.test(html) && !/<b>x<\/b>/.test(html) && !/<u>s<\/u>/.test(html) && !/<i>p<\/i>/.test(html));
assert.ok(html.includes('&lt;img src=x onerror=alert(2)&gt;'));
console.log('✓ 6. Nomes de apps, pacotes e dados do aparelho são escapados');

// 7. Otimizações do serviço de acessibilidade
const store = read('android-src/com/catline/app/BlockerStore.java');
const policy = read('android-src/com/catline/app/BlockPolicy.java');
const service = read('android-src/com/catline/app/BlockerService.java');
assert.ok(store.includes('cachedRaw') && store.includes('raw.equals(cachedRaw)'), 'regras interpretadas uma vez por mudança');
assert.ok(store.includes('lastSeenWriteAt') && /now - lastSeenWriteAt < 5000L/.test(store), 'markSeen limitado a uma gravação a cada 5 s');
assert.ok(policy.includes('LABEL_CACHE'), 'rótulo do app em cache');
assert.ok(service.includes('EVENT_THROTTLE_MS') && /eventNow - lastEventAt < EVENT_THROTTLE_MS/.test(service), 'eventos repetidos do mesmo app são ignorados por 300 ms');
const firstWork = service.indexOf('getRootInActiveWindow');
const throttle = service.indexOf('EVENT_THROTTLE_MS)');
assert.ok(throttle > 0 && throttle < firstWork, 'o limite vem antes do trabalho caro');
console.log('✓ 7. Serviço: regras em cache, gravação limitada, rótulos em cache e eventos repetidos ignorados');

// 8. Salvaguardas intactas
assert.ok(/isAbsoluteException/.test(policy) && policy.includes('whatsapp') && policy.includes('emergency') && policy.includes('settings'));
assert.ok(service.includes('Saída de Emergência') && service.includes('10000L'));
console.log('✓ 8. Exceções absolutas e saída de emergência de 10 segundos seguem no lugar');

// 9. Guia de instalação cobre o que o Android 13 exige
const guide = read('COMO-INSTALAR-O-APK.txt');
['Permitir configurações restritas', 'Play Protect', 'Instalar mesmo assim', 'Sem restrições', 'Ver como a gatinha bloqueia'].forEach(t => assert.ok(guide.includes(t), 'guia sem: ' + t));
console.log('✓ 9. O guia de instalação explica Play Protect, configuração restrita e bateria');

console.log('\n=== TODOS OS TESTES DA ATIVAÇÃO DO BLOQUEADOR PASSARAM ===');
