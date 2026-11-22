/**
 * scripts/test-phase21-xss.js
 * Regressao de seguranca: texto digitado pela usuaria nunca vai cru para innerHTML.
 * 1. Testa o comportamento de escHtml.
 * 2. Varre o app.js e falha se um campo de texto do usuario for interpolado em HTML sem escHtml.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== INICIANDO TESTES DE ESCAPE HTML (XSS) ===\n');

const appPath = path.join(__dirname, '..', 'web-preview', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');

// 1. Comportamento da funcao
const match = source.match(/function escHtml\(value\) \{[\s\S]*?\n\}\n/);
assert.ok(match, 'escHtml nao encontrado em web-preview/app.js');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(match[0] + '\nthis.escHtml = escHtml;', sandbox);
const esc = sandbox.escHtml;

assert.strictEqual(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
assert.strictEqual(esc('"><script>x</script>'), '&quot;&gt;&lt;script&gt;x&lt;/script&gt;');
assert.strictEqual(esc("a' onfocus='x"), 'a&#39; onfocus=&#39;x');
assert.strictEqual(esc('Tom & Jerry'), 'Tom &amp; Jerry');
assert.strictEqual(esc(null), '');
assert.strictEqual(esc(undefined), '');
assert.strictEqual(esc(42), '42');
assert.strictEqual(esc('Café com 🐟 e ♥'), 'Café com 🐟 e ♥');
console.log('✓ 1. escHtml neutraliza tags, aspas e &, preservando acentos e emojis');

// 2. Varredura estatica
const FIELDS = '(?:speechText|renderedText|title|name|goalTitle|stepTitle|activeTitle|commitmentTitle|initialTitle|goalReward|notes|note|text|desc)';
const unsafe = new RegExp('\\$\\{\\s*(?:[A-Za-z_]\\w*\\.)*' + FIELDS + '\\s*\\}');
const unsafeBare = /\$\{\s*(?:title|initialTitle|goalTitle|stepTitle|activeTitle|commitmentTitle|note|notes)\s*\}/;
// Linhas cujo destino e texto puro (textContent, alert, notificacao, log)
const plainSinks = /setCatSpeech\(|showUndoSnackbar\(|alert\(|const text =|let reply|reply =|new Notification|console\.|AndroidBlocker\./;
// Excecoes revisadas: valores que nao sao texto da usuaria ou nao vao para HTML
const reviewed = [/^\s*(?:const|let|var)\s+\w+\s*=\s*`[^`<>]*\$\{/];

const offenders = [];
source.split('\n').forEach((line, idx) => {
  if (plainSinks.test(line)) return;
  if (!(line.includes('<') || line.includes('>'))) return;
  if (reviewed.some(r => r.test(line))) return;
  if (unsafe.test(line) || unsafeBare.test(line)) offenders.push(`${idx + 1}: ${line.trim().slice(0, 120)}`);
});

assert.deepStrictEqual(offenders, [], 'Interpolacoes de texto do usuario sem escHtml:\n' + offenders.join('\n'));
console.log('✓ 2. Nenhum campo de texto do usuario e interpolado em HTML sem escHtml');

// 3. Backup adulterado nao pode trazer ids perigosos
const { backupEngine } = require('../web-preview/backup-engine.js');
const base = { schemaVersion: 2, goals: [], occurrences: [], habits: [], checkIns: [] };

const good = backupEngine.validateBackup(JSON.stringify({
  ...base,
  occurrences: [{ id: 'occ_1731500000000_ab12', goalId: 'g-1', title: 'Treino <b>forte</b>' }]
}));
assert.strictEqual(good.valid, true, 'Backup normal deve ser aceito');

['x\');alert(1);//', 'a"b', 'a b', '<img>', 'a`b'].forEach(badId => {
  const res = backupEngine.validateBackup(JSON.stringify({ ...base, occurrences: [{ id: badId, title: 't' }] }));
  assert.strictEqual(res.valid, false, 'Id perigoso deve ser rejeitado: ' + badId);
});

const badNested = backupEngine.validateBackup(JSON.stringify({
  ...base,
  goals: [{ id: 'g1', title: 'm', steps: [{ id: 'bad"id', title: 's' }] }]
}));
assert.strictEqual(badNested.valid, false, 'Id perigoso em passo de meta deve ser rejeitado');
console.log('✓ 3. Backup com ids perigosos e rejeitado; texto livre continua aceito');

console.log('\n=== TESTES DE ESCAPE HTML PASSARAM ===');
