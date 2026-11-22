/**
 * scripts/test-phase26-native-bridges.js
 * Pontes nativas do APK: seletor de arquivos (AndroidFiles) e widget (AndroidWidget).
 * Testa o lado JavaScript com pontes simuladas e confere o contrato com os arquivos Java.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== INICIANDO TESTES DAS PONTES NATIVAS ===\n');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'web-preview', 'app.js'), 'utf8');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function slice(startMarker, endMarker) {
  const a = app.indexOf(startMarker);
  assert.ok(a >= 0, 'não achei ' + startMarker);
  const b = app.indexOf(endMarker, a);
  assert.ok(b > a, 'não achei ' + endMarker);
  return app.slice(a, b);
}

(async () => {
  // 1. NativeFiles com ponte simulada
  const nativeSrc = slice('const NativeFiles = {', "if (typeof window !== 'undefined') window.CatLineNative = NativeFiles;");
  const win = {};
  const ctx = vm.createContext({ window: win, Promise, Math, Error });
  vm.runInContext(nativeSrc + '\nthis.NativeFiles = NativeFiles;', ctx);
  const NativeFiles = ctx.NativeFiles;

  assert.strictEqual(NativeFiles.available(), false, 'sem ponte: não disponível');

  const calls = [];
  win.AndroidFiles = {
    pickTextFile(token) { calls.push(['pick', token]); },
    saveTextFile(token, name, mime, text) { calls.push(['save', token, name, mime, text]); }
  };
  assert.strictEqual(NativeFiles.available(), true);

  const pick = NativeFiles.pickText();
  NativeFiles.onResult({ token: calls[0][1], ok: true, name: 'agenda.ics', text: 'BEGIN:VCALENDAR' });
  const picked = await pick;
  assert.strictEqual(picked.text, 'BEGIN:VCALENDAR');
  assert.strictEqual(picked.name, 'agenda.ics');
  console.log('✓ 1. pickText resolve com nome e texto do arquivo escolhido');

  const save = NativeFiles.saveText('backup.json', 'application/json', '{"a":1}');
  assert.deepStrictEqual(calls[1].slice(2), ['backup.json', 'application/json', '{"a":1}']);
  NativeFiles.onResult({ token: calls[1][1], ok: true, name: 'backup.json' });
  assert.strictEqual((await save).ok, true);
  console.log('✓ 2. saveText envia nome, tipo e conteúdo e resolve ao gravar');

  const cancelled = NativeFiles.pickText();
  NativeFiles.onResult({ token: calls[2][1], ok: false, error: 'cancelled' });
  await assert.rejects(cancelled, /cancelled/);
  console.log('✓ 3. Cancelar o seletor rejeita com "cancelled", sem alerta de erro');

  NativeFiles.onResult({ token: 'inexistente', ok: true });
  NativeFiles.onResult(null);
  const t1 = NativeFiles.pickText(); const t2 = NativeFiles.pickText();
  NativeFiles.onResult({ token: calls[4][1], ok: true, text: 'segundo' });
  NativeFiles.onResult({ token: calls[3][1], ok: true, text: 'primeiro' });
  assert.strictEqual((await t1).text, 'primeiro');
  assert.strictEqual((await t2).text, 'segundo');
  assert.strictEqual(Object.keys(NativeFiles._pending).length, 0, 'sem pendências vazando');
  console.log('✓ 4. Respostas fora de ordem e tokens desconhecidos são tratados');

  win.AndroidFiles.pickTextFile = () => { throw new Error('boom'); };
  await assert.rejects(NativeFiles.pickText(), /boom/);
  console.log('✓ 5. Falha ao chamar a ponte rejeita a promessa');

  // 2. Resumo do widget
  const widgetSrc = slice('let _lastWidgetJson', 'function saveStateToDeviceStorage()');
  const sent = [];
  const wctx = vm.createContext({
    JSON, String, Array,
    window: { AndroidWidget: { updateWidget: j => sent.push(JSON.parse(j)) } },
    state: {
      dayKey: '2026-11-22',
      occurrences: [
        { id: 'a', title: 'Treino', time: '18:00', date: '2026-11-22', state: 'pending' },
        { id: 'b', title: 'Café com a vovó e um título bem longo que passa de quarenta caracteres', time: '09:00', date: '2026-11-22', state: 'pending' },
        { id: 'c', title: 'Feito', time: '07:00', date: '2026-11-22', state: 'done' },
        { id: 'd', title: 'Perdido', time: '08:00', date: '2026-11-22', state: 'missed' },
        { id: 'e', title: 'Remarcado', time: '10:00', date: '2026-11-22', state: 'rescheduled' },
        { id: 'f', title: 'Outro dia', time: '08:00', date: '2026-11-23', state: 'pending' },
        { id: 'g', title: 'Legado', time: '12:00', date: '2026-11-22', state: 'PENDENTE' },
        { id: 'h', title: 'Quarto', time: '20:00', date: '2026-11-22', state: 'pending' }
      ]
    }
  });
  vm.runInContext(widgetSrc + '\nthis.syncWidgetSnapshot = syncWidgetSnapshot;', wctx);
  wctx.syncWidgetSnapshot();
  assert.strictEqual(sent.length, 1);
  const snap = sent[0];
  assert.deepStrictEqual(snap.items.map(i => i.id), ['b', 'g', 'a'], 'três primeiros pendentes por horário');
  assert.strictEqual(snap.doneToday, 1);
  assert.strictEqual(snap.totalToday, 6, 'conta só hoje e sem remarcados');
  assert.ok(snap.items[0].title.length <= 40, 'título limitado a 40 caracteres');
  console.log('✓ 6. Resumo do widget: próximos 3 por horário, contagem do dia e título limitado');

  wctx.syncWidgetSnapshot();
  assert.strictEqual(sent.length, 1, 'não reenvia resumo idêntico');
  wctx.state.occurrences[0].state = 'done';
  wctx.syncWidgetSnapshot();
  assert.strictEqual(sent.length, 2);
  assert.strictEqual(sent[1].doneToday, 2);
  console.log('✓ 7. O resumo só é reenviado quando muda');

  const noBridge = vm.createContext({ JSON, String, Array, window: {}, state: { dayKey: 'x', occurrences: [] } });
  vm.runInContext(widgetSrc + '\nthis.syncWidgetSnapshot = syncWidgetSnapshot;', noBridge);
  assert.doesNotThrow(() => noBridge.syncWidgetSnapshot());
  console.log('✓ 8. Fora do APK a sincronização do widget não faz nada');

  // 3. Contrato JS e Java
  const filesJava = read('android-src/com/catline/app/FileBridge.java');
  const widgetBridgeJava = read('android-src/com/catline/app/WidgetBridge.java');
  const providerJava = read('android-src/com/catline/app/CatLineWidgetProvider.java');
  const interfaceMethods = src => [...src.matchAll(/@JavascriptInterface\s+public\s+\w+\s+(\w+)\(/g)].map(m => m[1]);

  const fileMethods = interfaceMethods(filesJava);
  const widgetMethods = interfaceMethods(widgetBridgeJava);
  [...app.matchAll(/AndroidFiles\.(\w+)/g)].forEach(m => {
    if (m[1] !== 'pickTextFile' && m[1] !== 'saveTextFile') return;
    assert.ok(fileMethods.includes(m[1]), 'FileBridge.java não expõe ' + m[1]);
  });
  assert.ok(fileMethods.includes('pickTextFile') && fileMethods.includes('saveTextFile'));
  assert.ok(widgetMethods.includes('updateWidget'));
  console.log('✓ 9. Métodos usados pelo JavaScript existem nas pontes Java: ' + fileMethods.concat(widgetMethods).join(', '));

  // Java chama window.CatLineNative.onResult, e o JS define isso
  assert.ok(filesJava.includes('window.CatLineNative.onResult('));
  assert.ok(app.includes('window.CatLineNative = NativeFiles'));
  console.log('✓ 10. O retorno do Java chega em window.CatLineNative.onResult');

  // 4. Montagem do APK
  const build = read('scripts/build-apk.js');
  assert.ok(build.includes('addJavascriptInterface(fileBridge, "AndroidFiles")'));
  assert.ok(build.includes('addJavascriptInterface(new WidgetBridge(this), "AndroidWidget")'));
  assert.ok(/onActivityResult[\s\S]*fileBridge\.handleResult/.test(build));
  assert.ok(build.includes('com.catline.app.CatLineWidgetProvider'));
  assert.ok(build.includes('@xml/widget_hoje_info'));
  assert.ok(build.includes('android.appwidget.action.APPWIDGET_UPDATE'));
  console.log('✓ 11. MainActivity registra as pontes, repassa onActivityResult e o manifesto declara o widget');

  // 5. Recursos do widget
  const layout = read('android-src/res/layout/widget_hoje.xml');
  const ids = ['widget_root', 'widget_header', 'widget_progress', 'widget_empty'];
  for (let i = 1; i <= 3; i++) ids.push('widget_row' + i, 'widget_time' + i, 'widget_title' + i, 'widget_done' + i);
  ids.forEach(id => {
    assert.ok(layout.includes('@+id/' + id), 'layout sem o id ' + id);
    assert.ok(providerJava.includes('R.id.' + id), 'provider não usa R.id.' + id);
  });
  assert.ok(read('android-src/res/xml/widget_hoje_info.xml').includes('@layout/widget_hoje'));
  assert.ok(read('android-src/res/values/strings_widget.xml').includes('widget_description'));
  assert.ok(read('android-src/com/catline/app/ReminderReceiver.java').includes('CatLineWidgetProvider.markDoneAndRefresh'));
  console.log('✓ 12. Layout, ids, descrição e atualização ao concluir pela notificação estão ligados');

  // 6. O bloqueador não foi tocado
  ['BlockerBridge.java', 'BlockerService.java', 'BlockActivity.java', 'BlockPolicy.java', 'BlockerStore.java'].forEach(f => {
    const src = read('android-src/com/catline/app/' + f);
    assert.ok(!/FileBridge|WidgetBridge|CatLineWidgetProvider/.test(src), f + ' não deveria depender das pontes novas');
  });
  console.log('✓ 13. Arquivos do bloqueador não dependem das pontes novas');

  console.log('\n=== TODOS OS TESTES DAS PONTES NATIVAS PASSARAM ===');
})().catch(err => { console.error(err); process.exit(1); });
