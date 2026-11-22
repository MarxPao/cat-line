/**
 * scripts/test-phase25-single-file.js
 * O CatLine-App.html gerado é o que vai dentro do APK. Este teste gera o arquivo e confere:
 * - nenhuma tag de script externa sobrou
 * - todo bloco de script compila
 * - o código dos motores entrou idêntico ao original, sem sofrer substituição de $&, $' etc.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

console.log('=== INICIANDO TESTES DO HTML ÚNICO ===\n');

const root = path.join(__dirname, '..');
const res = spawnSync(process.execPath, [path.join(__dirname, 'build-single-file-html.js')], { cwd: root, encoding: 'utf8' });
assert.strictEqual(res.status, 0, 'build-single-file-html.js falhou:\n' + res.stderr);
const html = fs.readFileSync(path.join(root, 'CatLine-App.html'), 'utf8');

// 1. Nenhuma tag externa de script
const external = html.match(/<script[^>]*\ssrc=/g) || [];
assert.deepStrictEqual(external, [], 'sobraram scripts externos: ' + external.join(', '));
console.log('✓ 1. Nenhum script externo sobrou');

// 2. Todos os blocos compilam
const blocks = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html))) blocks.push(m[1]);
assert.ok(blocks.length >= 12, 'esperava os motores e o app inline, achei ' + blocks.length);
blocks.forEach((code, i) => {
  assert.doesNotThrow(() => new vm.Script(code, { filename: 'bloco-' + i + '.js' }), 'bloco de script ' + i + ' não compila');
});
console.log('✓ 2. ' + blocks.length + ' blocos de script compilam');

// 3. Cada arquivo-fonte aparece inteiro, sem corrupção
const webDir = path.join(root, 'web-preview');
['clock.js', 'commitments-config.js', 'goal-step-engine.js', 'commitment-state-machine.js', 'delay-metrics-engine.js',
 'reward-ledger-engine.js', 'day-closure-engine.js', 'weekly-log-engine.js', 'backup-engine.js', 'mood-checkin-engine.js',
 'step-templates.js', 'ics-import-engine.js', 'reminder-planner.js', 'app.js'].forEach(file => {
  const src = fs.readFileSync(path.join(webDir, file), 'utf8');
  assert.ok(html.includes(src), file + ' não entrou idêntico no HTML único');
});
console.log('✓ 3. Todos os arquivos-fonte entraram idênticos, inclusive os que têm $& no código');

// 4. Marcadores de recursos
['function escHtml', 'CatLineMoodEngine', 'CatLineStepTemplates', 'CatLineIcsImport'].forEach(k => assert.ok(html.includes(k), 'faltou ' + k));
console.log('✓ 4. Funcionalidades novas presentes');

console.log('\n=== TODOS OS TESTES DO HTML ÚNICO PASSARAM ===');
