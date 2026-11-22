/**
 * scripts/test-phase27-reminder-planner.js
 * Planejamento de avisos: data própria de cada compromisso, janela, estados e diferenças.
 */
const assert = require('assert');
const planner = require('../web-preview/reminder-planner.js');

console.log('=== INICIANDO TESTES DO PLANEJADOR DE AVISOS ===\n');

const HOUR = 3600000;
const local = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
const now = local(2026, 11, 22, 10, 0);
const occ = (id, date, time, extra) => Object.assign({ id, title: 'T ' + id, date, time, state: 'pending' }, extra);
const plan = (occurrences, goals, opts) => planner.planReminders({ occurrences, goals: goals || [], dayKey: '2026-11-22', nowMs: now }, opts);

// 1. Compromisso de hoje, mais tarde: três estágios
let r = plan([occ('a', '2026-11-22', '15:00')]);
assert.deepStrictEqual(r.items.map(i => i.kind), ['PRE_HOUR', 'NOW', 'OVERDUE']);
assert.strictEqual(r.items[1].at, local(2026, 11, 22, 15, 0));
console.log('✓ 1. Compromisso de hoje gera aviso 1h antes, na hora e ao passar do prazo');

// 2. A data do compromisso manda: amanhã às 09:00 NÃO avisa hoje às 09:00
r = plan([occ('b', '2026-11-23', '09:00')]);
const nowItem = r.items.find(i => i.kind === 'NOW');
assert.strictEqual(nowItem.at, local(2026, 11, 23, 9, 0), 'agenda para amanhã');
assert.ok(!r.items.some(i => i.at < local(2026, 11, 23, 0, 0)), 'nada cai hoje');
console.log('✓ 2. Compromisso de amanhã avisa amanhã, sem depender de abrir o app');

// 3. Compromisso de hoje que já passou não agenda nada
r = plan([occ('c', '2026-11-22', '08:00')]);
assert.strictEqual(r.items.length, 0, 'os três estágios, 07:00, 08:00 e 08:15, já passaram às 10:00');
r = plan([occ('c2', '2026-11-22', '09:50')]);
assert.deepStrictEqual(r.items.map(i => i.kind), ['OVERDUE'], 'só o aviso de atraso das 10:05 ainda está no futuro');
console.log('✓ 3. Estágios no passado são descartados');

// 4. Janela de 7 dias
r = plan([occ('d', '2026-11-29', '09:00'), occ('e', '2026-12-05', '09:00')]);
assert.ok(r.items.some(i => i.id === 'e') === false, 'fora da janela');
assert.ok(r.items.every(i => i.at <= now + 7 * 24 * HOUR));
console.log('✓ 4. Só agenda o que cai nos próximos 7 dias');

// 5. Estados
const states = ['done', 'missed', 'rescheduled', 'unmarked', 'FEITO'].map((s, i) => occ('s' + i, '2026-11-22', '18:00', { state: s }));
r = plan(states.concat([occ('p1', '2026-11-22', '18:00', { state: 'PENDENTE' }), occ('p2', '2026-11-22', '19:00', { state: 'pending' })]));
assert.deepStrictEqual(r.ids.sort(), ['p1', 'p2']);
console.log('✓ 5. Só estados pendentes recebem aviso');

// 6. Entradas ruins não derrubam o plano
r = plan([null, { id: 'x', time: '25:99', date: '2026-11-22' }, { id: 'y', time: 'abc' }, { time: '10:00' }, occ('ok', '2026-11-22', '23:00', { title: null }), occ('sem-data', undefined, '23:30')]);
assert.deepStrictEqual(r.ids.sort(), ['ok', 'sem-data']);
assert.strictEqual(r.items.find(i => i.id === 'ok').title, 'Compromisso');
assert.ok(r.items.find(i => i.id === 'sem-data').at > now, 'sem data usa o dia atual');
console.log('✓ 6. Horário inválido é ignorado, título vazio vira padrão e sem data usa hoje');

// 7. Cor vem da meta; título é limitado
r = plan([occ('g1', '2026-11-22', '20:00', { goalId: 'meta', title: 'x'.repeat(200) })], [{ id: 'meta', yarnColorId: 'blue', remainingSeconds: 0 }]);
assert.strictEqual(r.items[0].color, 'blue');
assert.strictEqual(r.items[0].title.length, 60);
console.log('✓ 7. Cor do novelo vem da meta e o título é limitado a 60 caracteres');

// 8. Metas: quatro estágios relativos ao prazo
r = plan([], [{ id: 'm1', title: 'Meta', yarnColorId: 'gold', remainingSeconds: 3 * 86400 }]);
assert.deepStrictEqual(r.items.map(i => i.kind), ['PRE_DAY', 'PRE_HOUR', 'NOW', 'OVERDUE']);
assert.ok(r.items.every(i => i.id === 'goal-m1'));
r = plan([], [
  { id: 'arq', archived: true, remainingSeconds: 9999 },
  { id: 'feita', progress: 1, remainingSeconds: 9999 },
  { id: 'vencida', remainingSeconds: 0 }
]);
assert.strictEqual(r.items.length, 0);
console.log('✓ 8. Prazos de metas geram 4 estágios e metas arquivadas, feitas ou vencidas não geram nada');

// 9. Limite de alarmes: os mais próximos ficam
const many = [];
for (let i = 0; i < 100; i++) many.push(occ('m' + i, '2026-11-2' + (3 + (i % 5)), String(8 + (i % 12)).padStart(2, '0') + ':00'));
r = plan(many, [], { maxAlarms: 50 });
assert.strictEqual(r.items.length, 50);
for (let i = 1; i < r.items.length; i++) assert.ok(r.items[i].at >= r.items[i - 1].at, 'ordenado por horário');
console.log('✓ 9. Limite de alarmes mantém os mais próximos, em ordem');

// 10. Relógio injetado
r = planner.planReminders({ occurrences: [occ('z', '2026-11-22', '12:00')], goals: [], dayKey: '2026-11-22', nowMs: now },
  { makeLocalDate: () => now + 5 * HOUR });
assert.strictEqual(r.items.find(i => i.kind === 'NOW').at, now + 5 * HOUR);
console.log('✓ 10. makeLocalDate permite usar o relógio injetado do app');

// 11. diffPlans
const A = plan([occ('a', '2026-11-22', '15:00'), occ('b', '2026-11-22', '16:00')]).items;
let d = planner.diffPlans([], A);
assert.strictEqual(d.cancel.length, 0);
assert.strictEqual(d.schedule.length, A.length);
d = planner.diffPlans(A, A);
assert.deepStrictEqual([d.cancel.length, d.schedule.length], [0, 0], 'plano igual não reenvia nada');
const moved = plan([occ('a', '2026-11-22', '17:00'), occ('b', '2026-11-22', '16:00')]).items;
d = planner.diffPlans(A, moved);
assert.deepStrictEqual(d.cancel, ['a']);
assert.ok(d.schedule.every(i => i.id === 'a') && d.schedule.length === 3, 'reagenda todos os estágios só do que mudou');
const removed = plan([occ('b', '2026-11-22', '16:00')]).items;
d = planner.diffPlans(A, removed);
assert.deepStrictEqual(d.cancel, ['a']);
assert.strictEqual(d.schedule.length, 0);
console.log('✓ 11. Diferença: nada muda quando igual, muda só o id alterado e remove o que saiu');

// 12. Compromissos importados de .ics com data futura não avisam hoje
const ics = plan([occ('ics_1', '2026-11-30', '10:30'), occ('ics_2', '2026-12-20', '10:30')]);
assert.ok(ics.items.every(i => i.at >= local(2026, 11, 29, 0, 0)), 'nada dispara hoje');
console.log('✓ 12. Eventos importados de calendário não geram aviso falso hoje');

// 13. Integração com o app: syncNativeReminders usa o planejador e só reenvia o que mudou
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'web-preview', 'app.js'), 'utf8');
const a0 = appSrc.indexOf('  syncNativeReminders() {');
const a1 = appSrc.indexOf('  async checkAppUpdate() {');
assert.ok(a0 > 0 && a1 > a0, 'não achei syncNativeReminders no app.js');
const methodSrc = appSrc.slice(a0, a1);

function makeApp(opts) {
  const calls = [];
  const win = {
    AndroidBlocker: {
      scheduleDeadline: (id, title, time, at, kind, color) => calls.push(['schedule', id, kind, at]),
      cancelReminder: id => calls.push(['cancel', id])
    },
    AndroidNotify: { cancelAllReminders: () => calls.push(['cancelAll']) }
  };
  const state = {
    notificationsEnabled: true,
    cat: { isRestMode: false },
    dayKey: '2026-11-22',
    goals: [],
    occurrences: [
      { id: 'hoje', title: 'Hoje', date: '2026-11-22', time: '15:00', state: 'pending' },
      { id: 'amanha', title: 'Amanhã', date: '2026-11-23', time: '09:00', state: 'pending' },
      { id: 'feito', title: 'Feito', date: '2026-11-22', time: '16:00', state: 'done' }
    ]
  };
  Object.assign(state, opts || {});
  const clock = { now: () => now, newDate: ms => new Date(ms === undefined ? now : ms) };
  const ctx = vm.createContext({ window: win, state, Clock: clock, CatLineReminderPlanner: planner, Set, Map, Math, Date, String });
  const obj = vm.runInContext('({' + methodSrc + '})', ctx);
  return { app: obj, calls, state, win };
}

let t = makeApp();
t.app.syncNativeReminders();
assert.strictEqual(t.calls[0][0], 'cancelAll', 'primeira sincronização limpa alarmes antigos');
const scheduled = t.calls.filter(c => c[0] === 'schedule');
assert.deepStrictEqual(Array.from(new Set(scheduled.map(c => c[1]))).sort(), ['amanha', 'hoje']);
const amanhaNow = scheduled.find(c => c[1] === 'amanha' && c[2] === 'NOW');
assert.strictEqual(amanhaNow[3], local(2026, 11, 23, 9, 0), 'compromisso de amanhã agenda para amanhã');
assert.ok(t.calls.some(c => c[0] === 'cancel' && c[1] === 'feito'), 'compromisso feito perde os avisos');
console.log('✓ 13. A primeira sincronização limpa alarmes antigos e agenda cada compromisso na sua data');

const before = t.calls.length;
t.app.syncNativeReminders();
assert.strictEqual(t.calls.length, before, 'segunda sincronização sem mudanças não chama o Android');
console.log('✓ 14. Sincronizar de novo sem mudanças não reenvia nada');

t.state.occurrences[0].time = '17:00';
t.app.syncNativeReminders();
const after = t.calls.slice(before);
assert.deepStrictEqual(after.filter(c => c[0] === 'cancel').map(c => c[1]), ['hoje']);
assert.strictEqual(after.filter(c => c[0] === 'schedule').length, 3);
assert.ok(after.filter(c => c[0] === 'schedule').every(c => c[1] === 'hoje'));
console.log('✓ 15. Mudar o horário de um compromisso reagenda só ele');

t.state.occurrences[0].state = 'done';
const b2 = t.calls.length;
t.app.syncNativeReminders();
assert.ok(t.calls.slice(b2).some(c => c[0] === 'cancel' && c[1] === 'hoje'));
console.log('✓ 16. Concluir um compromisso cancela os avisos dele');

t.state.notificationsEnabled = false;
const b3 = t.calls.length;
t.app.syncNativeReminders();
t.app.syncNativeReminders();
const off = t.calls.slice(b3);
assert.strictEqual(off.filter(c => c[0] === 'cancelAll').length, 1, 'cancela tudo uma única vez');
assert.strictEqual(off.filter(c => c[0] === 'schedule').length, 0);
t.state.notificationsEnabled = true;
t.app.syncNativeReminders();
assert.ok(t.calls.slice(b3 + off.length).some(c => c[0] === 'schedule'), 'ao religar, agenda de novo');
console.log('✓ 17. Desligar os avisos cancela todos os alarmes e religar agenda de novo');

t = makeApp({ cat: { isRestMode: true } });
t.app.syncNativeReminders();
assert.strictEqual(t.calls.filter(c => c[0] === 'schedule').length, 0, 'modo descanso não agenda');
console.log('✓ 18. Modo descanso não agenda avisos');

console.log('\n=== TODOS OS TESTES DO PLANEJADOR DE AVISOS PASSARAM ===');
