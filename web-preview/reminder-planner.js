/**
 * reminder-planner.js
 * Decide quais avisos nativos agendar para compromissos e prazos de metas.
 *
 * Motor puro: não lê relógio nem DOM. Quem chama informa nowMs e, se quiser,
 * uma função makeLocalDate para respeitar um relógio injetado.
 *
 * Regras:
 * - Cada compromisso usa a PRÓPRIA data (o.date) e hora. Antes, o app agendava tudo para hoje,
 *   então compromissos de outros dias nunca avisavam no dia certo, e os de hoje só avisavam
 *   se o app fosse aberto naquele dia.
 * - Só agenda o que cai dentro da janela de horizonDays e só estados pendentes.
 * - O resultado tem no máximo maxAlarms avisos, os mais próximos primeiro.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineReminderPlanner = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const HOUR = 3600000;
  const MIN = 60000;
  const DEFAULTS = { horizonDays: 7, maxAlarms: 160 };

  function parseTime(t) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t == null ? '' : t).trim());
    if (!m) return null;
    const h = Number(m[1]), mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return { h, mi };
  }

  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s == null ? '' : s));
    if (!m) return null;
    return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  }

  function defaultMakeLocalDate(y, mo, d, h, mi) {
    return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
  }

  function isPending(state) {
    const st = String(state == null ? 'pending' : state).toLowerCase();
    return st === 'pending' || st === 'pendente';
  }

  function cleanTitle(t) {
    return String(t == null ? '' : t).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60) || 'Compromisso';
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  /**
   * input: { occurrences, goals, dayKey, nowMs }
   * opts: { horizonDays, maxAlarms, makeLocalDate }
   * Retorna { items, ids } com items = [{ id, title, time, at, kind, color }] e ids = ids que devem ter aviso.
   */
  function planReminders(input, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const makeLocalDate = o.makeLocalDate || defaultMakeLocalDate;
    const nowMs = input.nowMs;
    const limitMs = nowMs + o.horizonDays * 24 * HOUR;
    const goalsById = new Map((input.goals || []).filter(Boolean).map(g => [g.id, g]));
    const items = [];

    const push = (id, title, time, at, kind, color) => {
      if (at <= nowMs || at > limitMs) return;
      items.push({ id, title, time, at, kind, color });
    };

    (input.occurrences || []).forEach(occ => {
      if (!occ || occ.id == null || !isPending(occ.state)) return;
      const t = parseTime(occ.time);
      if (!t) return;
      const day = parseDay(occ.date) || parseDay(input.dayKey);
      if (!day) return;
      const at = makeLocalDate(day.y, day.mo, day.d, t.h, t.mi);
      const goal = occ.goalId ? goalsById.get(occ.goalId) : null;
      const color = (goal && (goal.yarnColorId || goal.yarnColor)) || 'pink';
      const title = cleanTitle(occ.title);
      const time = pad(t.h) + ':' + pad(t.mi);
      push(String(occ.id), title, time, at - HOUR, 'PRE_HOUR', color);
      push(String(occ.id), title, time, at, 'NOW', color);
      push(String(occ.id), title, time, at + 15 * MIN, 'OVERDUE', color);
    });

    (input.goals || []).forEach(g => {
      if (!g || g.archived || g.progress >= 1 || !(g.remainingSeconds > 0)) return;
      const deadline = nowMs + g.remainingSeconds * 1000;
      const d = new Date(deadline);
      const time = pad(d.getHours()) + ':' + pad(d.getMinutes());
      const color = g.yarnColorId || g.yarnColor || 'pink';
      const id = 'goal-' + g.id;
      const title = cleanTitle(g.title);
      push(id, title, time, deadline - 24 * HOUR, 'PRE_DAY', color);
      push(id, title, time, deadline - HOUR, 'PRE_HOUR', color);
      push(id, title, time, deadline, 'NOW', color);
      push(id, title, time, deadline + HOUR, 'OVERDUE', color);
    });

    items.sort((a, b) => a.at - b.at);
    if (items.length > o.maxAlarms) items.length = o.maxAlarms;
    return { items, ids: Array.from(new Set(items.map(i => i.id))) };
  }

  /**
   * Compara o plano novo com o que já foi enviado ao Android.
   * previous e next são Maps de "id|kind" para assinatura. Retorna o que cancelar e o que agendar.
   * Quando qualquer estágio de um id muda, o id inteiro é cancelado e reagendado, porque o Android
   * só cancela por id.
   */
  function diffPlans(previousItems, nextItems) {
    const sig = i => i.at + '|' + i.title + '|' + i.time + '|' + i.color;
    const group = list => {
      const map = new Map();
      list.forEach(i => {
        if (!map.has(i.id)) map.set(i.id, new Map());
        map.get(i.id).set(i.kind, sig(i));
      });
      return map;
    };
    const prev = group(previousItems || []);
    const next = group(nextItems || []);
    const cancel = [];
    const schedule = [];
    const changed = new Set();

    prev.forEach((kinds, id) => {
      if (!next.has(id)) { cancel.push(id); return; }
      const nk = next.get(id);
      const same = kinds.size === nk.size && Array.from(kinds).every(([k, s]) => nk.get(k) === s);
      if (!same) { cancel.push(id); changed.add(id); }
    });
    (nextItems || []).forEach(i => {
      if (!prev.has(i.id) || changed.has(i.id)) schedule.push(i);
    });
    return { cancel, schedule };
  }

  return { planReminders, diffPlans, parseTime, parseDay };
});
