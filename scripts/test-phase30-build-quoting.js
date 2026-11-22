/**
 * scripts/test-phase30-build-quoting.js
 * Regressão do CI: classes internas como BlockActivity$1.class precisam chegar inteiras ao D8 no Linux.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

console.log('=== INICIANDO TESTE DE ESCAPE DE CAMINHOS NO BUILD DO APK ===\n');

const build = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-apk.js'), 'utf8');
const a = build.indexOf('function shellQuote(f) {');
const b = build.indexOf('function listFiles(dir, ext) {');
assert.ok(a > 0 && b > a, 'shellQuote não encontrada em build-apk.js');
const fnSrc = build.slice(a, b);

function quoteFor(isWin) {
  const ctx = vm.createContext({ isWin });
  vm.runInContext(fnSrc + '\nthis.shellQuote = shellQuote;', ctx);
  return ctx.shellQuote;
}

// 1. No Windows o caminho só ganha aspas
assert.strictEqual(quoteFor(true)('C:\\a\\BlockActivity$1.class'), '"C:\\a\\BlockActivity$1.class"');
console.log('✓ 1. Windows: só aspas, sem escapes');

// 2. No Linux o cifrão é escapado
const posix = quoteFor(false);
assert.strictEqual(posix('/x/BlockActivity$1.class'), '"/x/BlockActivity\\$1.class"');
assert.strictEqual(posix('/x/A$B$2.class'), '"/x/A\\$B\\$2.class"');
assert.strictEqual(posix('/x/plain.class'), '"/x/plain.class"');
console.log('✓ 2. Linux: o cifrão e as aspas são escapados');

// 3. O shell devolve exatamente o caminho original
const sh = spawnSync('sh', ['-c', 'echo ok'], { encoding: 'utf8' });
if (sh.error || sh.status !== 0) {
  console.log('! 3. sh não encontrado: conferência no shell pulada. O CI do GitHub roda em Linux e confere de verdade.');
} else {
  ['/x/BlockActivity$1.class', '/x/BlockerService$2$1.class', '/x/with space/A$B.class', '/x/q"uote.class'].forEach(p => {
    const r = spawnSync('sh', ['-c', 'printf %s ' + posix(p)], { encoding: 'utf8' });
    assert.strictEqual(r.stdout, p, 'o shell alterou o caminho ' + p + ' -> ' + r.stdout);
  });
  console.log('✓ 3. O shell entrega o caminho original ao D8, inclusive com $1, espaço e aspas');
}

// 4. O build usa a função na lista do D8
assert.ok(/listFiles\(BIN_DIR, '\.class'\)\.map\(shellQuote\)/.test(build));
console.log('✓ 4. A lista de classes do D8 passa por shellQuote');

console.log('\n=== TESTE DE ESCAPE DE CAMINHOS PASSOU ===');
