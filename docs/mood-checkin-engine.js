/**
 * mood-checkin-engine.js
 * Check-in de humor diário da Cat Line.
 *
 * Motor puro e determinístico: não lê relógio, DOM nem localStorage.
 * Quem chama informa dayKey e instante (ISO) já calculados pelo Clock.
 *
 * Regras do produto:
 * - 1 registro por dia lógico; registrar de novo no mesmo dia substitui o anterior.
 * - Nenhuma inferência antes de 7 dias com registro.
 * - Linguagem de coincidência, nunca de causa, e sem julgamento.
 * - Sem parênteses descritivos nos textos mostrados à usuária.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineMoodEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MIN_DAYS_FOR_INSIGHT = 7;
  const MAX_ENTRIES = 400;
  const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

  const LEVELS = [
    { level: 1, emoji: '😣', label: 'Pesado', speech: 'Hoje está pesado, né? Vamos devagarinho. Eu fico aqui pertinho de você.' },
    { level: 2, emoji: '😕', label: 'Cansada', speech: 'Dia cansado também conta. Escolha só uma coisinha pequena e o resto pode esperar.' },
    { level: 3, emoji: '😐', label: 'Mais ou menos', speech: 'Mais ou menos é um bom ponto de partida. Bora puxar o fio com calma?' },
    { level: 4, emoji: '🙂', label: 'Bem', speech: 'Que bom saber que você está bem! Vamos aproveitar esse ritmo gostoso.' },
    { level: 5, emoji: '😄', label: 'Ótima', speech: 'Miau! Dia ótimo! O novelo está até saltitando de alegria.' }
  ];

  function levelInfo(level) {
    return LEVELS.find(l => l.level === level) || null;
  }

  function isValidDayKey(dayKey) {
    return typeof dayKey === 'string' && DAY_KEY.test(dayKey);
  }

  function isValidLevel(level) {
    return Number.isInteger(level) && level >= 1 && level <= 5;
  }

  /**
   * Devolve um novo log com o humor do dia registrado ou substituído.
   * Mantém no máximo MAX_ENTRIES dias, descartando os mais antigos.
   */
  function recordMood(log, entry) {
    if (!entry || !isValidDayKey(entry.dayKey)) throw new Error('dayKey inválido');
    if (!isValidLevel(entry.level)) throw new Error('level deve ser inteiro de 1 a 5');
    const base = Array.isArray(log) ? log.filter(e => e && e.dayKey !== entry.dayKey) : [];
    base.push({ dayKey: entry.dayKey, level: entry.level, at: entry.atIso || null });
    base.sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0));
    return base.length > MAX_ENTRIES ? base.slice(base.length - MAX_ENTRIES) : base;
  }

  function getMoodForDay(log, dayKey) {
    if (!Array.isArray(log)) return null;
    return log.find(e => e && e.dayKey === dayKey) || null;
  }

  /** Remove entradas malformadas, por exemplo vindas de um backup antigo. */
  function sanitizeLog(log) {
    if (!Array.isArray(log)) return [];
    let out = [];
    log.forEach(e => {
      if (e && isValidDayKey(e.dayKey) && isValidLevel(e.level)) {
        out = recordMood(out, { dayKey: e.dayKey, level: e.level, atIso: typeof e.at === 'string' ? e.at : null });
      }
    });
    return out;
  }

  /** Junta dois logs; no mesmo dia vence o registro mais recente. */
  function mergeLogs(localLog, incomingLog) {
    const byDay = new Map();
    sanitizeLog(localLog).concat(sanitizeLog(incomingLog)).forEach(e => {
      const prev = byDay.get(e.dayKey);
      if (!prev || String(e.at || '') > String(prev.at || '')) byDay.set(e.dayKey, e);
    });
    let out = [];
    byDay.forEach(e => { out = recordMood(out, { dayKey: e.dayKey, level: e.level, atIso: e.at }); });
    return out;
  }

  /** Taxa de cumprimento de um dia: feitos dividido por compromissos que contam. */
  function dayFulfillment(occurrences, dayKey) {
    const list = (Array.isArray(occurrences) ? occurrences : []).filter(o => o && o.date === dayKey && o.state !== 'rescheduled');
    if (list.length === 0) return null;
    const done = list.filter(o => o.state === 'done' || o.state === 'FEITO').length;
    return done / list.length;
  }

  function mean(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Insight em linguagem de coincidência.
   * Retorna sempre um objeto com status:
   *  - 'observando': ainda não há 7 dias de registro
   *  - 'sem_contraste': faltam dias leves ou dias bons para comparar
   *  - 'ok': mensagem pronta em message
   */
  function moodInsight(log, occurrences, untilDayKey) {
    const entries = sanitizeLog(log).filter(e => !untilDayKey || e.dayKey <= untilDayKey);
    if (entries.length < MIN_DAYS_FOR_INSIGHT) {
      return { status: 'observando', daysCollected: entries.length, daysNeeded: MIN_DAYS_FOR_INSIGHT };
    }

    const light = [];
    const good = [];
    entries.forEach(e => {
      const rate = dayFulfillment(occurrences, e.dayKey);
      if (rate === null) return;
      if (e.level <= 2) light.push(rate);
      else if (e.level >= 4) good.push(rate);
    });

    if (light.length < 2 || good.length < 2) {
      return { status: 'sem_contraste', daysCollected: entries.length, lightDays: light.length, goodDays: good.length };
    }

    const lightPct = Math.round(mean(light) * 100);
    const goodPct = Math.round(mean(good) * 100);
    const diff = goodPct - lightPct;
    let message;
    if (diff >= 15) {
      message = 'Nos dias em que você marcou mais cansada, nosso fio ficou um pouco mais solto. Pode ser coincidência, mas talvez valha planejar menos coisas nesses dias.';
    } else if (diff <= -15) {
      message = 'Curioso: nos dias mais pesados, você até cumpriu mais. Às vezes fazer uma coisinha ajuda, mas só você sabe o que é melhor para cada dia.';
    } else {
      message = 'Mesmo nos dias mais pesados, nosso fio seguiu firme. Tenho muito orgulho de você.';
    }

    return {
      status: 'ok',
      message,
      daysCollected: entries.length,
      lightDays: light.length,
      goodDays: good.length,
      lightRatePct: lightPct,
      goodRatePct: goodPct
    };
  }

  /** Resumo simples da semana que termina em endDayKey, com até 7 dias. */
  function weekStrip(log, endDayKey) {
    const entries = sanitizeLog(log);
    const result = [];
    const end = new Date(endDayKey + 'T12:00:00Z');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const found = entries.find(e => e.dayKey === key);
      result.push({ dayKey: key, level: found ? found.level : null });
    }
    return result;
  }

  return {
    LEVELS,
    MIN_DAYS_FOR_INSIGHT,
    levelInfo,
    recordMood,
    getMoodForDay,
    sanitizeLog,
    mergeLogs,
    dayFulfillment,
    moodInsight,
    weekStrip
  };
});
