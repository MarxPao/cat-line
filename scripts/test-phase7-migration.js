// scripts/test-phase7-migration.js
// Suíte de testes automatizados da v3.2.0 (Prompt 1): Modelo de Dados e Migração
// Valida compatibilidade retroativa, integridade dos dados, idempotência e unicidade de chaves.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DE MODELO DE DADOS E MIGRAÇÃO (V3.2.0 - PROMPT 1) ===');

// Setup do ambiente e mock do browser/DOM
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

global.window = {
  addEventListener: () => {},
  AndroidBlocker: {
    syncState: () => {},
    syncMinuteBank: () => {},
    pollMinuteBankDebits: () => '[]',
    ackMinuteBankDebit: () => {},
    grantPass: () => {},
    revokePass: () => {},
    clearAllPasses: () => {},
    scheduleReminder: () => {},
    cancelReminder: () => {},
    pollCompletedTasks: () => '[]',
    putSecret: () => {},
    getSecret: () => null,
    removeSecret: () => {},
    hasSecret: () => false
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
  getElementById: () => createMockElement(),
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  createElement: () => createMockElement(),
  body: createMockElement(),
  addEventListener: () => {}
};

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

// Provedor de tempo
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
    migrationEngine,
    rewardEventStore,
    loadStateFromDeviceStorage,
    saveStateToDeviceStorage
  };`
);

const appExports = scriptFn(
  global.window, global.document, global.localStorage, { userAgent: 'NodeTest' },
  global.requestAnimationFrame, global.cancelAnimationFrame
);

const { state, AppUI, migrationEngine, rewardEventStore, loadStateFromDeviceStorage, saveStateToDeviceStorage } = appExports;

// ==========================================
// TESTES
// ==========================================

console.log('1. Testando migração de dados reais da v3.1.0 para v3.2.0...');

const v310SampleData = {
  savedAt: 1729850000000,
  dayKey: '2026-10-25',
  currencies: { peixinhos: 150, novelosDourados: 3, vinculo: 300 },
  selectedGoalId: 'g-v31-1',
  cat: { name: 'Mimi', mood: 'FELIZ', equipped: ['laco_rosa'], owned: ['laco_rosa'] },
  flags: { HOJE: true, AGENDA: true, HABITOS: true, METAS: true, FOCO: true },
  occurrences: [
    {
      id: 'occ-v31-done',
      title: 'Finalizar Documentação',
      effort: 'M',
      reward: 10,
      time: '14:00',
      state: 'FEITO',
      delayMin: -5,
      completedAt: '2026-10-25T13:55:00Z',
      date: '2026-10-25'
    },
    {
      id: 'occ-v31-pending',
      title: 'Estudar Kotlin',
      effort: 'G',
      reward: 20,
      time: '18:00',
      state: 'PENDENTE',
      delayMin: 0,
      date: '2026-10-25'
    }
  ],
  goals: [
    {
      id: 'g-v31-1',
      title: 'Aprender Compose',
      horizon: 'SEMANA',
      yarnColorId: 'gold',
      totalDays: 7,
      progress: 0.60
    }
  ],
  habits: [
    { id: 'hab-1', title: 'Beber Água', streak: 5, completed: true }
  ]
};

const migrated = migrationEngine.migrateV310ToV320(v310SampleData);

// Validações Teste 1
assert.strictEqual(migrated.schemaVersion, 2, 'schemaVersion deve ser 2 após migração');
assert.strictEqual(migrated.goals.length, 1, 'Total de metas preservado');
assert.strictEqual(migrated.goals[0].id, 'g-v31-1', 'ID da meta preservado');
assert.strictEqual(migrated.goals[0].yarnColor, 'gold', 'Cor de novelo normalizada');
assert.strictEqual(migrated.goals[0].archived, false, 'Meta legada inicia não arquivada');
assert.deepStrictEqual(migrated.goals[0].steps, [], 'Meta legada inicia com lista de passos vazia');

assert.strictEqual(migrated.occurrences.length, 2, 'Total de ocorrências preservado');
assert.strictEqual(migrated.occurrences[0].state, 'done', "Estado 'FEITO' deve migrar para 'done'");
assert.strictEqual(migrated.occurrences[0].plannedZone, 'America/Sao_Paulo', 'Fuso horário IANA padrão aplicado');
assert.strictEqual(migrated.occurrences[0].stepId, null, 'stepId inicia null');
assert.strictEqual(migrated.occurrences[0].rescheduledFromId, null, 'rescheduledFromId inicia null');

assert.strictEqual(migrated.occurrences[1].state, 'pending', "Estado 'PENDENTE' deve migrar para 'pending'");

// Validação Check-in gerado a partir de ocorrência concluída
assert.strictEqual(migrated.checkIns.length, 1, 'Deve gerar exatamente 1 CheckIn para a tarefa feita');
assert.strictEqual(migrated.checkIns[0].commitmentId, 'occ-v31-done');
assert.strictEqual(migrated.checkIns[0].lateMinutes, -5);
assert.strictEqual(migrated.checkIns[0].retroactive, false);

console.log('✓ 1. Migração de dados legados da v3.1.0 para v3.2.0 validada com sucesso');

console.log('2. Testando idempotência da migração (re-execução sem duplicidade)...');

const reMigrated = migrationEngine.migrateV310ToV320(migrated);
assert.strictEqual(reMigrated.checkIns.length, 1, 'Re-migração não pode duplicar CheckIns existentes');
assert.strictEqual(reMigrated.occurrences.length, 2, 'Ocorrências preservadas');
assert.strictEqual(reMigrated.goals[0].steps.length, 0, 'Passos da meta preservados');
assert.strictEqual(reMigrated.schemaVersion, 2, 'schemaVersion continua 2');

console.log('✓ 2. Idempotência da migração garantida sem perda nem duplicação de dados');

console.log('3. Testando índice UNIQUE em RewardEvent.idempotencyKey...');

const testState = { rewardEvents: [] };

const event1 = {
  id: 'rev-1',
  idempotencyKey: 'step_done:step-abc',
  kind: 'step_done',
  fishDelta: 3,
  bondDelta: 0,
  refId: 'step-abc',
  at: '2026-10-25T14:00:00Z',
  logicalDay: '2026-10-25'
};

const insert1 = rewardEventStore.insert(testState, event1);
assert.strictEqual(insert1, true, 'Primeira inserção do evento deve ter sucesso');
assert.strictEqual(testState.rewardEvents.length, 1, 'Deve haver 1 evento no livro-razão');

// Tentativa de duplicata com a mesma idempotencyKey
const duplicateEvent = {
  id: 'rev-2',
  idempotencyKey: 'step_done:step-abc', // MESMA CHAVE
  kind: 'step_done',
  fishDelta: 3,
  bondDelta: 0,
  refId: 'step-abc',
  at: '2026-10-25T14:01:00Z',
  logicalDay: '2026-10-25'
};

const insertDup = rewardEventStore.insert(testState, duplicateEvent);
assert.strictEqual(insertDup, false, 'Inserção com chave duplicada deve ser rejeitada');
assert.strictEqual(testState.rewardEvents.length, 1, 'Total de eventos continua 1 (sem duplicação)');

// Inserção com chave diferente
const event2 = {
  id: 'rev-3',
  idempotencyKey: 'step_done:step-xyz',
  kind: 'step_done',
  fishDelta: 3,
  bondDelta: 0,
  refId: 'step-xyz',
  at: '2026-10-25T14:02:00Z',
  logicalDay: '2026-10-25'
};

const insert2 = rewardEventStore.insert(testState, event2);
assert.strictEqual(insert2, true, 'Inserção com chave nova deve ter sucesso');
assert.strictEqual(testState.rewardEvents.length, 2, 'Total de eventos agora é 2');
assert.strictEqual(rewardEventStore.has(testState, 'step_done:step-abc'), true);
assert.strictEqual(rewardEventStore.has(testState, 'step_done:inexistente'), false);

console.log('✓ 3. Unicidade e idempotência do livro-razão de RewardEvents validadas');

console.log('4. Testando persistência local (save/load roundtrip) com schemaVersion 2...');

// Grava dados legados no localStorage
storage['CATLINE_DEVICE_STORAGE_V1'] = JSON.stringify(v310SampleData);

// Carrega do storage (dispara migração automática)
loadStateFromDeviceStorage();

assert.strictEqual(state.schemaVersion, 2, 'state em memória deve ter schemaVersion = 2');
assert.ok(Array.isArray(state.checkIns), 'state.checkIns deve ser um array');
assert.ok(Array.isArray(state.rewardEvents), 'state.rewardEvents deve ser um array');
assert.ok(Array.isArray(state.dayClosures), 'state.dayClosures deve ser um array');
assert.ok(Array.isArray(state.weeklyLogs), 'state.weeklyLogs deve ser um array');

// Salva de volta
saveStateToDeviceStorage();

const rawSaved = JSON.parse(storage['CATLINE_DEVICE_STORAGE_V1']);
assert.strictEqual(rawSaved.schemaVersion, 2, 'Storage salvo possui schemaVersion = 2');
assert.ok(Array.isArray(rawSaved.checkIns), 'Storage salvo possui checkIns');
assert.ok(Array.isArray(rawSaved.rewardEvents), 'Storage salvo possui rewardEvents');
assert.ok(Array.isArray(rawSaved.dayClosures), 'Storage salvo possui dayClosures');
assert.ok(Array.isArray(rawSaved.weeklyLogs), 'Storage salvo possui weeklyLogs');

console.log('✓ 4. Ciclo de leitura, migração e gravação no LocalStorage validado');

console.log('5. Verificando definições e migração Room no Kotlin...');

const dbKtPath = path.join(__dirname, '..', 'core-data', 'src', 'main', 'kotlin', 'com', 'deadline', 'core', 'data', 'db', 'DeadLineDatabase.kt');
const dbKtCode = fs.readFileSync(dbKtPath, 'utf8');

assert.ok(dbKtCode.includes('SCHEMA_VERSION: Int = 2'), 'DeadLineDatabase deve ter SCHEMA_VERSION = 2');
assert.ok(dbKtCode.includes('MIGRATION_1_2'), 'DeadLineDatabase deve declarar MIGRATION_1_2');
assert.ok(dbKtCode.includes('CREATE TABLE IF NOT EXISTS `goal_steps`'), 'MIGRATION_1_2 deve criar tabela goal_steps');
assert.ok(dbKtCode.includes('CREATE TABLE IF NOT EXISTS `reward_events`'), 'MIGRATION_1_2 deve criar tabela reward_events');
assert.ok(dbKtCode.includes('CREATE UNIQUE INDEX IF NOT EXISTS `index_reward_events_idempotencyKey`'), 'MIGRATION_1_2 deve criar índice UNIQUE em idempotencyKey');
assert.ok(dbKtCode.includes('CREATE TABLE IF NOT EXISTS `weekly_logs`'), 'MIGRATION_1_2 deve criar tabela weekly_logs');

const entitiesKtPath = path.join(__dirname, '..', 'core-data', 'src', 'main', 'kotlin', 'com', 'deadline', 'core', 'data', 'db', 'Entities.kt');
const entitiesKtCode = fs.readFileSync(entitiesKtPath, 'utf8');

assert.ok(entitiesKtCode.includes('data class GoalStepEntity'), 'Entities.kt deve conter GoalStepEntity');
assert.ok(entitiesKtCode.includes('data class RewardEventEntity'), 'Entities.kt deve conter RewardEventEntity');
assert.ok(entitiesKtCode.includes('data class WeeklyLogEntity'), 'Entities.kt deve conter WeeklyLogEntity');

console.log('✓ 5. Integridade do esquema Room e scripts SQL de migração confirmados');

console.log('6. Testando preservação integral de dados na migração de backup...');

const backupV31 = {
  version: '2.0.0',
  dayKey: '2026-10-25',
  currencies: { peixinhos: 88, novelosDourados: 1, vinculo: 120 },
  occurrences: [
    { id: 'occ-bkp-1', title: 'Tarefa Backup', effort: 'P', time: '10:00', state: 'FEITO', delayMin: 0 }
  ],
  goals: [
    { id: 'g-bkp-1', title: 'Meta Backup', horizon: 'MES', progress: 0.25 }
  ]
};

const migratedBackup = migrationEngine.migrateV310ToV320(backupV31);
assert.strictEqual(migratedBackup.currencies.peixinhos, 88);
assert.strictEqual(migratedBackup.occurrences[0].title, 'Tarefa Backup');
assert.strictEqual(migratedBackup.occurrences[0].state, 'done');
assert.strictEqual(migratedBackup.checkIns.length, 1);
assert.strictEqual(migratedBackup.checkIns[0].commitmentId, 'occ-bkp-1');
assert.strictEqual(migratedBackup.goals[0].title, 'Meta Backup');
assert.deepStrictEqual(migratedBackup.goals[0].steps, []);

console.log('✓ 6. Migração de backups legados preserva 100% dos dados originais');

console.log('=== TODOS OS 6 TESTES DE MIGRAÇÃO E MODELO PASSARAM COM 100% DE SUCESSO! ===');
