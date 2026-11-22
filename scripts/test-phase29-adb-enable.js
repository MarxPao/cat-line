/**
 * scripts/test-phase29-adb-enable.js
 * Modo avançado: ligar o serviço de bloqueio com a permissão dada por ADB.
 * - roda o editor da lista de acessibilidade no JDK
 * - testa os estados do cartão
 * - confere o contrato entre JavaScript, ponte Java, manifesto e guia
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

console.log('=== INICIANDO TESTES DO MODO AVANÇADO POR ADB ===\n');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('web-preview/app.js');

// 1. Editor da lista de acessibilidade, no JDK
function findJavaTool(name) {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, 'bin', name));
  candidates.push(name);
  for (const c of candidates) {
    const r = spawnSync(c, ['-version'], { encoding: 'utf8' });
    if (!r.error) return c;
  }
  return null;
}
const javac = findJavaTool('javac');
const java = findJavaTool('java');
if (!javac || !java) {
  console.log('! 1. JDK não encontrado: teste do editor em Java pulado. No CI o Java 17 está instalado.');
} else {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'catline-jt-'));
  const comp = spawnSync(javac, ['-d', out,
    path.join(root, 'android-src/com/catline/app/AccessibilityListEditor.java'),
    path.join(root, 'scripts/java-tests/AccessibilityListEditorTest.java')], { encoding: 'utf8' });
  assert.strictEqual(comp.status, 0, 'javac falhou:\n' + comp.stderr);
  const run = spawnSync(java, ['-cp', out, 'com.catline.app.AccessibilityListEditorTest'], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, 'o teste Java falhou:\n' + run.stdout + run.stderr);
  assert.ok(/^OK \d+ verificacoes/.test(run.stdout.trim()), run.stdout);
  console.log('✓ 1. Editor da lista de acessibilidade: ' + run.stdout.trim() + ', sem apagar serviços de outros apps');
}

// 2. Cartão
function slice(start, end) {
  const a = app.indexOf(start);
  const b = app.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'não achei trecho ' + start);
  return app.slice(a, b);
}
const escSrc = slice('function escHtml(value) {', "if (typeof window !== 'undefined') window.escHtml = escHtml;");
const cardSrc = slice('  renderNativeBlockerCard() {', '  blockerSelfEnable() {');
const selfSrc = slice('  blockerSelfEnable() {', '  toggleBlockerAutoEnable(checked) {');
const toggleSrc = slice('  toggleBlockerAutoEnable(checked) {', '  refreshBlockerDiag() {');
const batterySrc = slice('  batteryHint(manufacturer) {', '  notifFixNotifications()');

function makeApp(diag, bridgeOverrides) {
  const spoken = [];
  const calls = [];
  const win = { AndroidBlocker: Object.assign({
    diagnostics: () => JSON.stringify(diag),
    selfEnableService: () => { calls.push('selfEnable'); return 'ok'; },
    setAutoEnable: v => calls.push('auto:' + v)
  }, bridgeOverrides || {}) };
  const ctx = vm.createContext({
    window: win, PALETTE: { cozyPurple: '#5C4B7D', leafGreen: '#27ae60', grayDark: '#555' },
    Clock: { formatTime: ms => 't' + ms }, JSON, String, Number, Math, setTimeout: () => 0,
    state: { activeTab: 'foco' }, syncNativeBlocker: () => {}
  });
  vm.runInContext(escSrc + '\nthis.escHtml = escHtml;', ctx);
  const obj = vm.runInContext('({' + cardSrc + ',' + selfSrc + ',' + toggleSrc + ',' + batterySrc +
    ', getNotifStatus() { return null; }, setCatSpeech(t) { this.spoken.push(t); }, renderActiveTab() { this.renders++; } })', ctx);
  obj.spoken = spoken; obj.renders = 0;
  return { app: obj, calls, spoken };
}

let t = makeApp({ serviceEnabled: false, sdk: 34, canSelfEnable: false, rules: [] });
let html = t.app.renderNativeBlockerCard();
assert.ok(html.includes('Modo avançado: ligar pelo computador'));
assert.ok(html.includes('adb shell pm grant com.catline.app android.permission.WRITE_SECURE_SETTINGS'));
assert.ok(html.includes('Depuração USB'));
assert.ok(html.includes('Essa permissão é poderosa'));
assert.ok(!html.includes('blockerSelfEnable()'), 'sem a permissão não mostra o botão que não funcionaria');
console.log('✓ 2. Sem a permissão: o cartão ensina o comando ADB e avisa que ela é poderosa');

t = makeApp({ serviceEnabled: false, sdk: 34, canSelfEnable: true, rules: [] });
html = t.app.renderNativeBlockerCard();
assert.ok(html.includes('blockerSelfEnable()'));
assert.ok(html.includes('Ligar agora'));
assert.ok(!html.includes('adb shell pm grant'), 'com a permissão, o comando some');
console.log('✓ 3. Com a permissão: aparece "Ligar agora" no lugar das instruções');

t = makeApp({ serviceEnabled: true, sdk: 34, canSelfEnable: true, autoEnable: false, rules: [] });
html = t.app.renderNativeBlockerCard();
assert.ok(html.includes('toggleBlockerAutoEnable(this.checked)'));
assert.ok(!/type="checkbox" checked/.test(html), 'vem desmarcada');
t = makeApp({ serviceEnabled: true, sdk: 34, canSelfEnable: true, autoEnable: true, rules: [] });
assert.ok(/type="checkbox" checked/.test(t.app.renderNativeBlockerCard()));
t = makeApp({ serviceEnabled: true, sdk: 34, canSelfEnable: false, rules: [] });
assert.ok(!t.app.renderNativeBlockerCard().includes('toggleBlockerAutoEnable'), 'sem a permissão, sem a opção');
console.log('✓ 4. A opção de religar sozinho só aparece com a permissão e começa desmarcada');

// 5. Ações
t = makeApp({ serviceEnabled: false, sdk: 34, canSelfEnable: true, rules: [] });
t.app.blockerSelfEnable();
assert.deepStrictEqual(t.calls, ['selfEnable']);
assert.ok(/Ligado/.test(t.spoken[0]));
assert.strictEqual(t.app.renders, 1);
for (const [res, re] of [['already', /já estava/], ['no_permission', /Falta a permissão/], ['error', /Não consegui/], ['qualquer coisa', /Não consegui/]]) {
  t = makeApp({}, { selfEnableService: () => res });
  t.app.blockerSelfEnable();
  assert.ok(re.test(t.spoken[0]), res + ' -> ' + t.spoken[0]);
}
t = makeApp({}, { selfEnableService: () => { throw new Error('sem ponte'); } });
t.app.blockerSelfEnable();
assert.ok(/Não consegui/.test(t.spoken[0]));
t = makeApp({});
t.app.toggleBlockerAutoEnable(true);
t.app.toggleBlockerAutoEnable(false);
assert.deepStrictEqual(t.calls, ['auto:true', 'auto:false']);
console.log('✓ 5. Ligar agora e a opção de religar chamam a ponte e respondem em cada resultado');

// 6. Contrato Java e manifesto
const bridge = read('android-src/com/catline/app/BlockerBridge.java');
const enabler = read('android-src/com/catline/app/AccessibilityEnabler.java');
const store = read('android-src/com/catline/app/BlockerStore.java');
const build = read('scripts/build-apk.js');
const receiver = read('android-src/com/catline/app/ReminderReceiver.java');
const methods = [...bridge.matchAll(/@JavascriptInterface\s+public\s+\w+\s+(\w+)\(/g)].map(m => m[1]);
['canSelfEnable', 'selfEnableService', 'setAutoEnable', 'isAutoEnable'].forEach(m => assert.ok(methods.includes(m), 'ponte sem ' + m));
['selfEnableService', 'setAutoEnable'].forEach(m => assert.ok(app.includes('AndroidBlocker.' + m), 'app não usa ' + m));
assert.ok(bridge.includes('o.put("canSelfEnable"') && bridge.includes('o.put("autoEnable"'));
assert.ok(/uses-permission android:name="android.permission.WRITE_SECURE_SETTINGS"/.test(build));
console.log('✓ 6. A ponte expõe os métodos, o diagnóstico informa a permissão e o manifesto a declara');

// 7. Segurança do habilitador
assert.ok(enabler.includes('AccessibilityListEditor.add('), 'acrescenta, nunca sobrescreve');
assert.ok(!/putString\([^)]*ENABLED_ACCESSIBILITY_SERVICES,\s*(cn\.|"")/.test(enabler), 'não grava só o nosso serviço');
assert.ok(/getBoolean\(KEY_AUTO_ENABLE,\s*false\)/.test(store), 'religar sozinho começa desligado');
const heal = enabler.slice(enabler.indexOf('static void healIfNeeded'));
assert.ok(heal.indexOf('isAutoEnable') < heal.indexOf('enable(c)'), 'só religa depois de checar a escolha da usuária');
['canSelfEnable', 'isFocoEnabled', 'restMode', 'isEnabled'].forEach(k => assert.ok(heal.includes(k), 'healIfNeeded sem ' + k));
assert.ok(enabler.includes('SecurityException'), 'permissão revogada tratada');
console.log('✓ 7. Só acrescenta o próprio serviço, respeita a escolha da usuária, o módulo Foco e o modo descanso');

// 8. Onde religar acontece, e a saída continua livre
assert.ok(/onResume\(\)[\s\S]*AccessibilityEnabler\.healIfNeeded\(this\)/.test(build), 'ao abrir o app');
assert.ok(/MY_PACKAGE_REPLACED[\s\S]*healIfNeeded\(context\)/.test(receiver), 'ao reiniciar ou atualizar');
const policy = read('android-src/com/catline/app/BlockPolicy.java');
assert.ok(policy.includes('p.contains("settings")'), 'Configurações do Android seguem sempre liberadas');
console.log('✓ 8. Religa ao abrir o app, no boot e após atualizar, e as Configurações do Android seguem liberadas');

// 9. Guia
const guide = read('COMO-INSTALAR-O-APK.txt');
['adb shell pm grant com.catline.app android.permission.WRITE_SECURE_SETTINGS', 'MODO AVANÇADO', 'Ligar agora', 'vem desmarcada'].forEach(k => assert.ok(guide.includes(k), 'guia sem: ' + k));
console.log('✓ 9. O guia de instalação traz o comando e explica a escolha de religar');

console.log('\n=== TODOS OS TESTES DO MODO AVANÇADO POR ADB PASSARAM ===');
