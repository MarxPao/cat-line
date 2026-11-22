/**
 * scripts/test-phase22-mood.js
 * Check-in de humor diário: motor puro, barreira de 7 dias e linguagem de coincidência.
 */
const assert = require('assert');
const mood = require('../web-preview/mood-checkin-engine.js');

console.log('=== INICIANDO TESTES DO CHECK-IN DE HUMOR ===\n');

// 1. Registro e substituição no mesmo dia
let log = [];
log = mood.recordMood(log, { dayKey: '2026-11-10', level: 2, atIso: '2026-11-10T09:00:00Z' });
log = mood.recordMood(log, { dayKey: '2026-11-10', level: 4, atIso: '2026-11-10T18:00:00Z' });
assert.strictEqual(log.length, 1);
assert.strictEqual(mood.getMoodForDay(log, '2026-11-10').level, 4);
assert.throws(() => mood.recordMood(log, { dayKey: '10/11/2026', level: 3 }), /dayKey/);
assert.throws(() => mood.recordMood(log, { dayKey: '2026-11-11', level: 6 }), /level/);
assert.throws(() => mood.recordMood(log, { dayKey: '2026-11-11', level: 2.5 }), /level/);
console.log('✓ 1. Um registro por dia, com substituição e validação');

// 2. Imutabilidade da entrada
const frozen = Object.freeze([Object.freeze({ dayKey: '2026-11-01', level: 3, at: null })]);
const next = mood.recordMood(frozen, { dayKey: '2026-11-02', level: 5 });
assert.strictEqual(frozen.length, 1);
assert.strictEqual(next.length, 2);
console.log('✓ 2. recordMood não altera o log original');

// 3. Barreira de 7 dias
let small = [];
for (let d = 1; d <= 6; d++) small = mood.recordMood(small, { dayKey: `2026-11-0${d}`, level: 3 });
const waiting = mood.moodInsight(small, [], '2026-11-30');
assert.strictEqual(waiting.status, 'observando');
assert.strictEqual(waiting.daysCollected, 6);
assert.strictEqual(waiting.daysNeeded, 7);
console.log('✓ 3. Menos de 7 dias: nenhuma inferência, só progresso de observação');

// Monta 8 dias: 4 leves (nível 1 ou 2) e 4 bons (4 ou 5), com compromissos
function build(lightDoneEach, goodDoneEach) {
  let lg = [];
  const occ = [];
  for (let d = 1; d <= 8; d++) {
    const dayKey = `2026-11-${String(d).padStart(2, '0')}`;
    const isLight = d <= 4;
    lg = mood.recordMood(lg, { dayKey, level: isLight ? 2 : 4 });
    const doneCount = isLight ? lightDoneEach : goodDoneEach;
    for (let k = 0; k < 4; k++) {
      occ.push({ id: `${dayKey}-${k}`, date: dayKey, state: k < doneCount ? 'done' : 'missed' });
    }
  }
  return { lg, occ };
}

// 4. Dias leves com menos cumprimento
let s = build(1, 4);
let r = mood.moodInsight(s.lg, s.occ, '2026-11-08');
assert.strictEqual(r.status, 'ok');
assert.strictEqual(r.lightRatePct, 25);
assert.strictEqual(r.goodRatePct, 100);
assert.ok(/coincidência/.test(r.message), 'usa linguagem de coincidência');
assert.ok(!/culpa|preguiça|falhou|errou/i.test(r.message), 'sem julgamento');
console.log('✓ 4. Dias leves com menos cumprimento geram mensagem de coincidência sem julgamento');

// 5. Sem diferença relevante
s = build(3, 3);
r = mood.moodInsight(s.lg, s.occ, '2026-11-08');
assert.strictEqual(r.status, 'ok');
assert.ok(/firme/.test(r.message));
console.log('✓ 5. Sem diferença relevante: mensagem de acolhimento');

// 6. Dias leves cumprindo mais
s = build(4, 1);
r = mood.moodInsight(s.lg, s.occ, '2026-11-08');
assert.strictEqual(r.status, 'ok');
assert.ok(/Curioso/.test(r.message));
console.log('✓ 6. Dias leves com mais cumprimento: mensagem neutra');

// 7. Sem contraste
let only = [];
const occOnly = [];
for (let d = 1; d <= 8; d++) {
  const dayKey = `2026-11-${String(d).padStart(2, '0')}`;
  only = mood.recordMood(only, { dayKey, level: 4 });
  occOnly.push({ id: dayKey, date: dayKey, state: 'done' });
}
assert.strictEqual(mood.moodInsight(only, occOnly, '2026-11-08').status, 'sem_contraste');
console.log('✓ 7. Sem dias leves para comparar: não inventa insight');

// 8. Compromissos remarcados não contam
assert.strictEqual(mood.dayFulfillment([{ date: 'd', state: 'rescheduled' }], 'd'), null);
assert.strictEqual(mood.dayFulfillment([{ date: 'd', state: 'done' }, { date: 'd', state: 'missed' }], 'd'), 0.5);
console.log('✓ 8. Remarcados ficam de fora do cálculo');

// 9. Limpeza e junção de logs
const dirty = [{ dayKey: 'x', level: 3 }, null, { dayKey: '2026-11-01', level: 9 }, { dayKey: '2026-11-02', level: 3, at: '2026-11-02T10:00:00Z' }];
assert.strictEqual(mood.sanitizeLog(dirty).length, 1);
const merged = mood.mergeLogs(
  [{ dayKey: '2026-11-02', level: 2, at: '2026-11-02T08:00:00Z' }],
  [{ dayKey: '2026-11-02', level: 5, at: '2026-11-02T20:00:00Z' }, { dayKey: '2026-11-03', level: 3, at: null }]
);
assert.strictEqual(merged.length, 2);
assert.strictEqual(mood.getMoodForDay(merged, '2026-11-02').level, 5);
console.log('✓ 9. Entradas inválidas são descartadas e a junção prefere o registro mais recente');

// 10. Limite de entradas e faixa semanal
let big = [];
const start = Date.UTC(2025, 0, 1);
for (let i = 0; i < 450; i++) {
  big = mood.recordMood(big, { dayKey: new Date(start + i * 86400000).toISOString().slice(0, 10), level: 3 });
}
assert.strictEqual(big.length, 400);
const strip = mood.weekStrip([{ dayKey: '2026-11-08', level: 5 }], '2026-11-08');
assert.strictEqual(strip.length, 7);
assert.strictEqual(strip[6].level, 5);
assert.strictEqual(strip[0].dayKey, '2026-11-02');
console.log('✓ 10. Log limitado a 400 dias e faixa semanal com 7 posições');

// 11. Textos sem parênteses descritivos
mood.LEVELS.forEach(l => assert.ok(!/[()]/.test(l.speech + l.label), 'sem parênteses: ' + l.label));
console.log('✓ 11. Textos da interface sem parênteses descritivos');

console.log('\n=== TODOS OS TESTES DO CHECK-IN DE HUMOR PASSARAM ===');
