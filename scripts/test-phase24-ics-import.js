/**
 * scripts/test-phase24-ics-import.js
 * Importação de calendário .ics: horários, recorrência, exceções, duplicatas e segurança.
 */
const assert = require('assert');
const ics = require('../web-preview/ics-import-engine.js');

console.log('=== INICIANDO TESTES DE IMPORTAÇÃO DE CALENDÁRIO (.ICS) ===\n');

const wrap = body => 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n' + body + 'END:VCALENDAR\r\n';
const ev = lines => 'BEGIN:VEVENT\r\n' + lines.join('\r\n') + '\r\nEND:VEVENT\r\n';
const run = (body, extra) => ics.importFromIcs(wrap(body), Object.assign({ fromDayKey: '2026-11-23', horizonDays: 30 }, extra));

// 1. Evento simples em UTC vira horário de Brasília
let r = run(ev(['UID:a1', 'SUMMARY:Reunião com cliente', 'DTSTART:20261125T130000Z', 'DTEND:20261125T140000Z']));
assert.strictEqual(r.items.length, 1);
assert.strictEqual(r.items[0].date, '2026-11-25');
assert.strictEqual(r.items[0].time, '10:00');
assert.strictEqual(r.items[0].plannedMinutes, 60);
console.log('✓ 1. UTC convertido para Brasília e duração calculada');

// 2. Virada de dia na conversão
r = run(ev(['UID:a2', 'SUMMARY:Noite', 'DTSTART:20261126T010000Z', 'DTEND:20261126T020000Z']));
assert.strictEqual(r.items[0].date, '2026-11-25');
assert.strictEqual(r.items[0].time, '22:00');
console.log('✓ 2. Conversão que muda o dia está correta');

// 3. TZID de outra zona e horário local
r = run(ev(['UID:a3', 'SUMMARY:Call em Nova York', 'DTSTART;TZID=America/New_York:20261125T100000', 'DTEND;TZID=America/New_York:20261125T110000']));
assert.strictEqual(r.items[0].time, '12:00', 'Nova York 10:00 em novembro, UTC-5, vira 12:00 em Brasília');
r = run(ev(['UID:a4', 'SUMMARY:Local', 'DTSTART;TZID=America/Sao_Paulo:20261125T090000', 'DTEND;TZID=America/Sao_Paulo:20261125T093000']));
assert.strictEqual(r.items[0].time, '09:00');
assert.strictEqual(r.items[0].plannedMinutes, 30);
r = run(ev(['UID:a5', 'SUMMARY:Flutuante', 'DTSTART:20261125T180000']));
assert.strictEqual(r.items[0].time, '18:00');
assert.strictEqual(r.items[0].plannedMinutes, 30, 'sem fim: padrão de 30 minutos');
r = run(ev(['UID:a6', 'SUMMARY:Zona inventada', 'DTSTART;TZID=Marte/Olimpo:20261125T080000']));
assert.strictEqual(r.items[0].time, '08:00');
console.log('✓ 3. TZID, horário local, sem fim e zona desconhecida');

// 4. DURATION
r = run(ev(['UID:a7', 'SUMMARY:Com duração', 'DTSTART:20261125T120000Z', 'DURATION:PT1H30M']));
assert.strictEqual(r.items[0].plannedMinutes, 90);
console.log('✓ 4. DURATION lido');

// 5. Dia inteiro, cancelado e inválido ficam de fora e são contados
r = run(
  ev(['UID:b1', 'SUMMARY:Feriado', 'DTSTART;VALUE=DATE:20261125']) +
  ev(['UID:b2', 'SUMMARY:Cancelado', 'STATUS:CANCELLED', 'DTSTART:20261125T120000Z']) +
  ev(['UID:b3', 'SUMMARY:Sem data']) +
  ev(['UID:b4', 'SUMMARY:Ok', 'DTSTART:20261125T120000Z'])
);
assert.strictEqual(r.items.length, 1);
assert.strictEqual(r.summary.skippedAllDay, 1);
assert.strictEqual(r.summary.skippedCancelled, 1);
assert.strictEqual(r.summary.skippedInvalid, 1);
console.log('✓ 5. Dia inteiro, cancelados e inválidos são pulados e contados');

// 6. Fora da janela
r = run(ev(['UID:c1', 'SUMMARY:Antigo', 'DTSTART:20261001T120000Z']) + ev(['UID:c2', 'SUMMARY:Longe', 'DTSTART:20270601T120000Z']));
assert.strictEqual(r.items.length, 0);
console.log('✓ 6. Eventos fora da janela não entram');

// 7. Recorrência diária com COUNT que começa antes da janela
r = run(ev(['UID:d1', 'SUMMARY:Diário', 'DTSTART:20261120T120000Z', 'RRULE:FREQ=DAILY;COUNT=7']));
assert.deepStrictEqual(r.items.map(i => i.date), ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'], 'COUNT conta desde o início: 20,21,22 ficam fora da janela');
console.log('✓ 7. COUNT é contado desde o início da série');

// 8. Semanal com BYDAY, INTERVAL e UNTIL
r = run(ev(['UID:e1', 'SUMMARY:Treino', 'DTSTART:20261123T220000Z', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261204T235959Z']));
assert.deepStrictEqual(r.items.map(i => i.date), ['2026-11-23', '2026-11-25', '2026-11-27', '2026-11-30', '2026-12-02', '2026-12-04']);
r = run(ev(['UID:e2', 'SUMMARY:Quinzenal', 'DTSTART:20261123T120000Z', 'RRULE:FREQ=WEEKLY;INTERVAL=2']));
assert.deepStrictEqual(r.items.map(i => i.date), ['2026-11-23', '2026-12-07', '2026-12-21']);
console.log('✓ 8. Semanal com BYDAY, UNTIL e INTERVAL');

// 9. Mensal e dia 31
r = run(ev(['UID:f1', 'SUMMARY:Mensal', 'DTSTART:20261031T120000Z', 'RRULE:FREQ=MONTHLY']), { horizonDays: 100 });
assert.deepStrictEqual(r.items.map(i => i.date), ['2026-12-31', '2027-01-31'], 'novembro e fevereiro não têm dia 31');
console.log('✓ 9. Mensal ignora meses sem o dia');

// 10. EXDATE e RECURRENCE-ID
r = run(
  ev(['UID:g1', 'SUMMARY:Série', 'DTSTART:20261123T120000Z', 'RRULE:FREQ=DAILY;COUNT=4', 'EXDATE:20261124T120000Z']) +
  ev(['UID:g1', 'SUMMARY:Série remarcada', 'RECURRENCE-ID:20261125T120000Z', 'DTSTART:20261125T150000Z'])
);
const byDate = Object.fromEntries(r.items.map(i => [i.date, i.title + '@' + i.time]));
assert.ok(!byDate['2026-11-24'], 'EXDATE removido');
assert.strictEqual(byDate['2026-11-25'], 'Série remarcada@12:00', 'ocorrência alterada substitui a original');
assert.strictEqual(byDate['2026-11-23'], 'Série@09:00');
assert.strictEqual(byDate['2026-11-26'], 'Série@09:00');
console.log('✓ 10. EXDATE e RECURRENCE-ID respeitados');

// 11. Alarmes não sobrescrevem o evento; linhas dobradas; escapes
r = run(ev([
  'UID:h1',
  'SUMMARY:Almoço\\, com a equipe\\; no centro',
  'DTSTART:20261125T150000Z',
  'BEGIN:VALARM', 'TRIGGER:-PT15M', 'DESCRIPTION:Lembrete falso', 'SUMMARY:Alarme', 'END:VALARM',
  'DESCRIPTION:nota longa que continua',
  ' na linha seguinte'
]));
assert.strictEqual(r.items[0].title, 'Almoço, com a equipe; no centro');
const folded = ics.parseIcs(wrap('BEGIN:VEVENT\r\nUID:h2\r\nSUMMARY:Titulo muito\r\n  longo dobrado\r\nDTSTART:20261125T150000Z\r\nEND:VEVENT\r\n'));
assert.strictEqual(folded[0].summary, 'Titulo muito longo dobrado');
console.log('✓ 11. Alarmes ignorados, linhas dobradas e escapes tratados');

// 12. Segurança: título com HTML permanece texto e id é seguro
const evil = '<img src=x onerror=alert(1)>"\'';
r = run(ev(['UID:x"y\'<z>', 'SUMMARY:' + evil, 'DTSTART:20261125T150000Z']));
const conv = ics.toOccurrences(r.items, []);
assert.strictEqual(conv.occurrences.length, 1);
assert.ok(/^ics_[A-Za-z0-9_]+$/.test(conv.occurrences[0].id), 'id seguro: ' + conv.occurrences[0].id);
assert.ok(conv.occurrences[0].title.includes('<img'), 'título fica como texto cru; o app escapa na hora de mostrar');
const { backupEngine } = require('../web-preview/backup-engine.js');
const check = backupEngine.validateBackup(JSON.stringify({ schemaVersion: 2, goals: [], habits: [], occurrences: conv.occurrences }));
assert.strictEqual(check.valid, true, 'ids gerados passam na validação de backup');
console.log('✓ 12. Id gerado é seguro e o título nunca vira HTML');

// 13. Duplicatas: importar duas vezes não repete
const body = ev(['UID:i1', 'SUMMARY:Aula', 'DTSTART:20261124T120000Z', 'RRULE:FREQ=DAILY;COUNT=3']);
const first = ics.toOccurrences(run(body).items, []);
assert.strictEqual(first.occurrences.length, 3);
const second = ics.toOccurrences(run(body).items, first.occurrences);
assert.strictEqual(second.occurrences.length, 0);
assert.strictEqual(second.duplicates, 3);
assert.strictEqual(new Set(first.occurrences.map(o => o.id)).size, 3, 'ids únicos');
console.log('✓ 13. Reimportar o mesmo arquivo não duplica compromissos');

// 14. Formato final compatível com o app
const o = first.occurrences[0];
assert.strictEqual(o.state, 'pending');
assert.strictEqual(o.recurrence, 'Data específica');
assert.strictEqual(o.plannedStart, o.date + 'T' + o.time + ':00');
assert.strictEqual(o.plannedZone, 'America/Sao_Paulo');
assert.ok(Number.isInteger(o.reward) && o.reward > 0);
console.log('✓ 14. Ocorrências no formato esperado pelo app');

// 15. Limites e entradas ruins
const many = Array.from({ length: 400 }, (_, i) => ev(['UID:m' + i, 'SUMMARY:E' + i, 'DTSTART:20261125T' + String(i % 24).padStart(2, '0') + '0000Z'])).join('');
r = run(many);
assert.strictEqual(r.items.length, 300);
assert.strictEqual(r.summary.truncated, true);
assert.strictEqual(ics.importFromIcs('isto não é um calendário', { fromDayKey: '2026-11-23' }).items.length, 0);
assert.strictEqual(ics.importFromIcs(null, { fromDayKey: '2026-11-23' }).items.length, 0);
assert.throws(() => ics.importFromIcs('', { fromDayKey: 'ontem' }), /fromDayKey/);
r = run(ev(['UID:z1', 'SUMMARY:', 'DTSTART:20261125T120000Z']));
assert.strictEqual(r.items[0].title, 'Compromisso do calendário');
console.log('✓ 15. Limite de 300, arquivos inválidos e título vazio');

// 16. Textos da interface sem parênteses descritivos
assert.ok(!/[()]/.test('Compromisso do calendário'));
console.log('✓ 16. Texto padrão sem parênteses descritivos');

console.log('\n=== TODOS OS TESTES DE IMPORTAÇÃO .ICS PASSARAM ===');
