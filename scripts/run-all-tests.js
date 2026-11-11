// scripts/run-all-tests.js
// Executa todas as baterias de testes automatizados do Cat Line
const { spawnSync } = require('child_process');
const path = require('path');

const testScripts = [
  'test-rewards-system.js',
  'test-characterization.js',
  'test-phase1.js',
  'test-phase2.js',
  'test-phase3.js',
  'test-phase4.js',
  'test-phase5.js',
  'test-phase6.js',
  'test-phase7-migration.js',
  'test-phase8-config.js',
  'test-phase9-goals.js',
  'test-phase10-state-machine.js',
  'test-phase11-metrics.js',
  'test-phase12-rewards.js',
  'test-phase13-day-closure.js',
  'test-phase14-goals-ui.js',
  'test-phase15-commitments-ui.js',
  'test-phase16-day-closure-ui.js',
  'test-phase17-weekly-log.js',
  'test-phase18-module-switches.js',
  'test-phase19-backup-schema-v2.js',
  'test-phase20-final-regression.js'
];

console.log('🐾 [Cat Line] Executando suíte completa de testes automatizados...\n');

let allPassed = true;

for (const script of testScripts) {
  const fullPath = path.join(__dirname, script);
  console.log(`▶ Executando: ${script}`);
  const res = spawnSync(process.execPath, [fullPath], { stdio: 'inherit' });
  if (res.status !== 0) {
    allPassed = false;
    console.error(`❌ Falha no teste: ${script} (código ${res.status})`);
    break;
  }
  console.log(`✅ Aprovado: ${script}\n`);
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('🎉 [Cat Line] Todos os testes automatizados passaram com 100% de sucesso!');
  process.exit(0);
}
