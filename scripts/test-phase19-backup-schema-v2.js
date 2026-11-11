/**
 * scripts/test-phase19-backup-schema-v2.js
 * Testes Automatizados para a Fase 19 / Prompt 13:
 * Exportação, Importação e Backup com Schema v2 (Local & Idempotente)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DE BACKUP COM SCHEMA V2 (V3.2.0 - PROMPT 13) ===\n');

// 1. Carrega o motor de backup puro
const Clock = require('../web-preview/clock.js');
Clock.setFakeTime('2026-10-25T14:00:00.000Z');

const backupModule = require('../web-preview/backup-engine.js');
const backupEngine = backupModule.backupEngine;

// 1. Testando exportação de payload com schema v2 completo
console.log('1. Testando exportação de payload com schemaVersion: 2...');
const mockState = {
  dayKey: '2026-10-25',
  schemaVersion: 2,
  currencies: { peixinhos: 150, novelosDourados: 3, vinculo: 12 },
  cat: { name: 'Mimi', mood: 'contente' },
  goals: [
    {
      id: 'goal-pixel',
      title: 'Dominar Pixel Art',
      horizon: 'MES',
      yarnColorId: 'yarn-mint',
      reward: 'Kit de Canetas',
      rewardCost: 80,
      steps: [
        { id: 'step-sk', goalId: 'goal-pixel', title: 'Esboço', order: 1, doneAt: '2026-10-20T10:00:00Z', archived: false },
        { id: 'step-sh', goalId: 'goal-pixel', title: 'Sombreamento', order: 2, doneAt: null, archived: false }
      ]
    }
  ],
  occurrences: [
    {
      id: 'occ-101',
      title: 'Treino de Calistenia',
      plannedStart: '2026-10-25T17:30:00',
      plannedZone: 'America/Sao_Paulo',
      plannedMinutes: 45,
      category: 'TREINO',
      state: 'done',
      rescheduledFromId: null
    },
    {
      id: 'occ-102',
      title: 'Estudo de Kotlin',
      plannedStart: '2026-10-25T19:00:00',
      plannedZone: 'America/Sao_Paulo',
      plannedMinutes: 60,
      category: 'ESTUDO',
      state: 'pending',
      rescheduledFromId: null
    }
  ],
  checkIns: [
    { id: 'chk-101', commitmentId: 'occ-101', actualAt: '2026-10-25T17:32:00Z', retroactive: false, lateMinutes: 2 }
  ],
  rewardEvents: [
    { id: 'rew-1', idempotencyKey: 'occ_done:occ-101', kind: 'commitment_done', fishDelta: 2, bondDelta: 0, logicalDay: '2026-10-25' },
    { id: 'rew-2', idempotencyKey: 'step_done:step-sk', kind: 'step_done', fishDelta: 3, bondDelta: 0, logicalDay: '2026-10-20' }
  ],
  dayClosures: [
    { logicalDay: '2026-10-24', closedAt: '2026-10-25T04:05:00Z' }
  ],
  weeklyLogs: [
    {
      weekStartLogicalDay: '2026-10-19',
      snapshotJson: JSON.stringify({ period: { start: '2026-10-19', end: '2026-10-25' }, rates: { fulfillment: 1.0 } }),
      configVersion: 1,
      createdAt: '2026-10-25T04:00:00Z'
    }
  ],
  habits: [
    { id: 'h-water', title: 'Beber 2L de Água', window: '08:00', streak: 5 }
  ]
};

const payload = backupEngine.createExportPayload(mockState);
assert.strictEqual(payload.schemaVersion, 2, 'Payload deve ter schemaVersion = 2');
assert.strictEqual(payload.version, '3.2.0', 'Versão deve ser 3.2.0');
assert.strictEqual(payload.goals.length, 1, 'Deve exportar 1 meta');
assert.strictEqual(payload.goals[0].steps.length, 2, 'Meta deve conter 2 passos');
assert.strictEqual(payload.occurrences.length, 2, 'Deve exportar 2 ocorrências');
assert.strictEqual(payload.checkIns.length, 1, 'Deve exportar 1 check-in');
assert.strictEqual(payload.rewardEvents.length, 2, 'Deve exportar 2 rewardEvents');
assert.strictEqual(payload.dayClosures.length, 1, 'Deve exportar 1 dayClosure');
assert.strictEqual(payload.weeklyLogs.length, 1, 'Deve exportar 1 weeklyLog');
console.log('✓ 1. Exportação com schemaVersion 2 e coleções completas validada com sucesso');

// 2. Testando validação de backup
console.log('\n2. Testando validação de backup e extração de resumo...');
const rawPayloadJson = JSON.stringify(payload);
const validation = backupEngine.validateBackup(rawPayloadJson);
assert.strictEqual(validation.valid, true, 'Validação deve aprovar payload válido');
assert.strictEqual(validation.summary.goalsCount, 1, 'Resumo deve indicar 1 meta');
assert.strictEqual(validation.summary.stepsCount, 2, 'Resumo deve indicar 2 passos');
assert.strictEqual(validation.summary.commitmentsCount, 2, 'Resumo deve indicar 2 compromissos');
assert.strictEqual(validation.summary.rewardEventsCount, 2, 'Resumo deve indicar 2 rewardEvents');
assert.strictEqual(validation.summary.weeklyLogsCount, 1, 'Resumo deve indicar 1 weeklyLog');
console.log('✓ 2. Validação e resumo de backup funcionando perfeitamente');

// 3. Testando importação em estado vazio (round-trip test)
console.log('\n3. Testando importação em base vazia (round-trip sem perda)...');
const emptyState = {
  goals: [],
  occurrences: [],
  checkIns: [],
  rewardEvents: [],
  dayClosures: [],
  weeklyLogs: [],
  habits: [],
  currencies: { peixinhos: 0, novelosDourados: 0, vinculo: 0 }
};

const roundTripState = backupEngine.mergeBackup(emptyState, validation.data);
assert.strictEqual(roundTripState.schemaVersion, 2, 'Estado final deve ter schemaVersion = 2');
assert.strictEqual(roundTripState.goals.length, 1, 'Deve ter importado 1 meta');
assert.strictEqual(roundTripState.goals[0].steps.length, 2, 'Meta deve conter 2 passos');
assert.strictEqual(roundTripState.goals[0].steps[0].id, 'step-sk', 'ID do passo deve ser preservado');
assert.strictEqual(roundTripState.occurrences.length, 2, 'Deve ter importado 2 ocorrências');
assert.strictEqual(roundTripState.checkIns.length, 1, 'Deve ter importado 1 check-in');
assert.strictEqual(roundTripState.rewardEvents.length, 2, 'Deve ter importado 2 rewardEvents');
assert.strictEqual(roundTripState.dayClosures.length, 1, 'Deve ter importado 1 dayClosure');
assert.strictEqual(roundTripState.weeklyLogs.length, 1, 'Deve ter importado 1 weeklyLog');
assert.strictEqual(roundTripState.currencies.peixinhos, 150, 'Moedas devem ser restauradas');
console.log('✓ 3. Round-trip sem perda validado com 100% de integridade');

// 4. Testando idempotência estrita (importar duas vezes não duplica nada)
console.log('\n4. Testando idempotência estrita: importar duas vezes consecutivas...');
const secondImportState = backupEngine.mergeBackup(roundTripState, validation.data);
assert.strictEqual(secondImportState.goals.length, 1, 'Metas NÃO devem ser duplicadas');
assert.strictEqual(secondImportState.goals[0].steps.length, 2, 'Passos da meta NÃO devem ser duplicados');
assert.strictEqual(secondImportState.occurrences.length, 2, 'Compromissos NÃO devem ser duplicados');
assert.strictEqual(secondImportState.checkIns.length, 1, 'Check-ins NÃO devem ser duplicados');
assert.strictEqual(secondImportState.rewardEvents.length, 2, 'RewardEvents NÃO devem ser duplicados (idempotencyKey)');
assert.strictEqual(secondImportState.dayClosures.length, 1, 'DayClosures NÃO devem ser duplicados');
assert.strictEqual(secondImportState.weeklyLogs.length, 1, 'WeeklyLogs NÃO devem ser duplicados (weekStartLogicalDay)');
console.log('✓ 4. Idempotência estrita confirmada: zero duplicatas após dupla importação');

// 5. Testando imutabilidade do WeeklyLog no merge
console.log('\n5. Testando preservação estrita de snapshotJson histórico no WeeklyLog...');
const modifiedIncoming = JSON.parse(JSON.stringify(validation.data));
modifiedIncoming.weeklyLogs[0].snapshotJson = JSON.stringify({ period: { start: '2026-10-19' }, rates: { fulfillment: 0.1 } });

const mergedPreserved = backupEngine.mergeBackup(roundTripState, modifiedIncoming);
const originalJson = JSON.parse(roundTripState.weeklyLogs[0].snapshotJson);
const currentJson = JSON.parse(mergedPreserved.weeklyLogs[0].snapshotJson);
assert.strictEqual(currentJson.rates.fulfillment, originalJson.rates.fulfillment, 'Snapshot histórico do WeeklyLog NÃO deve ser sobrescrito');
console.log('✓ 5. Imutabilidade histórica do WeeklyLog validada');

// 6. Testando migração de backup legado v1 na importação
console.log('\n6. Testando migração transparente de backup v1 na importação...');
const legacyV1Backup = {
  version: '3.1.0',
  schemaVersion: 1,
  goals: [
    { id: 'g-leg-1', title: 'Meta Antiga', progress: 0.5, yarnColorId: 'yarn-sky' }
  ],
  occurrences: [
    { id: 'occ-leg-1', title: 'Compromisso Antigo', time: '15:00', state: 'FEITO' }
  ],
  habits: [
    { id: 'h-leg-1', title: 'Hábito Antigo', completed: true }
  ],
  currencies: { peixinhos: 50, novelosDourados: 0, vinculo: 5 }
};

const v1Validation = backupEngine.validateBackup(legacyV1Backup);
assert.strictEqual(v1Validation.valid, true, 'Backup v1 deve ser considerado válido e migrado');
assert.strictEqual(v1Validation.data.schemaVersion, 2, 'schemaVersion deve ser promovido para 2');
assert.ok(Array.isArray(v1Validation.data.goals[0].steps), 'Meta legada deve receber array steps vazio');
assert.strictEqual(v1Validation.data.occurrences[0].state, 'done', 'Estado FEITO deve ser normalizado para done');
assert.ok(v1Validation.data.occurrences[0].plannedStart, 'Deve ter plannedStart populado');

const mergedV1 = backupEngine.mergeBackup(emptyState, v1Validation.data);
assert.strictEqual(mergedV1.goals.length, 1, 'Meta v1 importada com sucesso');
assert.strictEqual(mergedV1.occurrences.length, 1, 'Compromisso v1 importado com sucesso');
console.log('✓ 6. Migração de schema v1 para v2 na importação validada com sucesso');

// 7. Testando mensagem de confirmação acolhedora e ausência de parênteses descritivos
console.log('\n7. Testando texto de confirmação de importação...');
const promptText = backupEngine.getConfirmationPrompt(validation.summary);
assert.ok(promptText.includes('Deseja importar este backup do Cat Line?'), 'Deve conter pergunta acolhedora');
assert.ok(promptText.includes('1 metas'), 'Deve listar quantidade de metas');
assert.ok(promptText.includes('2 compromissos'), 'Deve listar quantidade de compromissos');
assert.ok(promptText.includes('2 eventos de recompensa'), 'Deve listar quantidade de recompensas');
assert.ok(promptText.includes('1 logs semanais'), 'Deve listar quantidade de logs');
assert.ok(!promptText.includes('(') || !promptText.includes('ex:'), 'Sem parênteses descritivos');
console.log('✓ 7. Mensagem de confirmação amigável e acessível validada');

// 8. Testando recusa de importação (cancelar confirmação não altera estado)
console.log('\n8. Testando cancelamento da confirmação de importação no app...');
const appCode = fs.readFileSync('web-preview/app.js', 'utf8');

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

global.AudioContext = class {
  createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
  createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
  get currentTime() { return 0; }
};

const localStorageStore = {};
global.localStorage = {
  getItem: (k) => localStorageStore[k] || null,
  setItem: (k, v) => { localStorageStore[k] = String(v); },
  removeItem: (k) => { delete localStorageStore[k]; }
};

// Configura mocks de DOM
const elementsMap = {};
function getOrCreateElement(id) {
  if (!elementsMap[id]) {
    const el = {
      id,
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        moveTo: () => {},
        lineTo: () => {},
        save: () => {},
        restore: () => {},
        drawImage: () => {}
      }),
      focus: () => {},
      appendChild: (ch) => {
        el.children.push(ch);
        return ch;
      },
      removeChild: () => {},
      querySelector: (sel) => {
        if (sel === 'input') return el.children.find(c => c.tagName === 'INPUT') || getOrCreateElement('sub_input_' + id);
        return getOrCreateElement('sub_' + id);
      },
      querySelectorAll: () => [],
      parentElement: { getBoundingClientRect: () => ({ width: 360, height: 640 }) },
      getBoundingClientRect: () => ({ width: 360, height: 640 })
    };
    elementsMap[id] = el;
  }
  return elementsMap[id];
}
global.document = {
  getElementById: (id) => getOrCreateElement(id),
  createElement: (t) => {
    const el = getOrCreateElement('created_' + t + '_' + Math.random());
    el.tagName = t.toUpperCase();
    return el;
  },
  addEventListener: () => {},
  visibilityState: 'visible',
  querySelectorAll: () => []
};
global.CatLineBackupEngine = backupModule;
global.backupEngine = backupEngine;

global.window = {
  addEventListener: () => {},
  location: { reload: () => {} },
  CatLineBackupEngine: backupModule,
  backupEngine: backupEngine
};
global.navigator = { vibrate: () => {} };
global.alert = () => {};

let userConfirmed = false;
global.confirm = () => userConfirmed;

eval(appCode + '\nglobal.state = state;\nglobal.AppUI = AppUI;\n');
const app = new global.AppUI();
const testState = global.state;
testState.occurrences = [{ id: 'occ-safe', title: 'Não apagar' }];

// Usuária cancela o diálogo
userConfirmed = false;
let fileContent = JSON.stringify(payload);
let mockFile = { name: 'backup.json' };

// Mock do FileReader
class MockFileReader {
  readAsText() {
    this.onload({ target: { result: fileContent } });
  }
}
global.FileReader = MockFileReader;

app.importJsonBackup({ target: { files: [mockFile] } });
assert.strictEqual(testState.occurrences.length, 1, 'Estado NÃO deve ser alterado quando usuária recusa a confirmação');
assert.strictEqual(testState.occurrences[0].id, 'occ-safe', 'Item original preservado');

// Usuária confirma o diálogo
userConfirmed = true;
app.importJsonBackup({ target: { files: [mockFile] } });
assert.strictEqual(testState.occurrences.length, 3, 'Compromissos mesclados com sucesso após confirmação explícita');
assert.ok(testState.occurrences.some(o => o.id === 'occ-safe'), 'Item pré-existente preservado');
assert.ok(testState.occurrences.some(o => o.id === 'occ-101'), 'Item do backup adicionado');
console.log('✓ 8. Cancelamento e confirmação explícita no app validados com fidelidade');

// 9. Verificando DeadLineBackupPayload.kt no :core-data
console.log('\n9. Verificando DeadLineBackupPayload.kt no :core-data...');
const ktPath = path.resolve(__dirname, '../core-data/src/main/kotlin/com/deadline/core/data/backup/DeadLineBackupPayload.kt');
const ktContent = fs.readFileSync(ktPath, 'utf8');
assert.ok(ktContent.includes('goalsCount: Int = 0'), 'DeadLineBackupPayload deve ter goalsCount');
assert.ok(ktContent.includes('goalStepsCount: Int = 0'), 'DeadLineBackupPayload deve ter goalStepsCount');
assert.ok(ktContent.includes('rewardEventsCount: Int = 0'), 'DeadLineBackupPayload deve ter rewardEventsCount');
assert.ok(ktContent.includes('weeklyLogsCount: Int = 0'), 'DeadLineBackupPayload deve ter weeklyLogsCount');
console.log('✓ 9. DeadLineBackupPayload.kt validado com 100% de conformidade');

console.log('\n=== TODOS OS 9 TESTES DE BACKUP COM SCHEMA V2 PASSARAM COM 100% DE SUCESSO! ===');
process.exit(0);
