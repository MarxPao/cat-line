/**
 * web-preview/delay-metrics-engine.js
 * Motor puro de métricas de atraso, pontualidade e recortes analíticos (v3.2.0 · Prompt 5)
 *
 * Princípios:
 * - Tolerância lida de CommitmentsConfig (AD-10).
 * - Relógio injetável (AD-05).
 * - Barreira estrita de 7 dias com dados antes de inferências ou recortes.
 * - Taxa de cumprimento = done / (done + missed).
 * - Taxa de pontualidade = done pontuais / done.
 * - Mediana de atraso com suporte a valores negativos.
 * - Isolamento de check-ins retroativos vs ao vivo.
 * - Sem punição e linguagem de coincidência sem parênteses descritivos.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineDelayMetricsEngine = factory();
    root.delayMetricsEngine = root.CatLineDelayMetricsEngine.delayMetricsEngine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MINIMUM_DAYS_BARRIER = 7;

  const TIME_SLOTS = Object.freeze({
    MADRUGADA: 'madrugada', // 00:00 - 05:59
    MANHA: 'manha',         // 06:00 - 11:59
    TARDE: 'tarde',         // 12:00 - 17:59
    NOITE: 'noite'          // 18:00 - 23:59
  });

  function getTimeSlot(hour) {
    const h = Number(hour) || 0;
    if (h >= 0 && h < 6) return TIME_SLOTS.MADRUGADA;
    if (h >= 6 && h < 12) return TIME_SLOTS.MANHA;
    if (h >= 12 && h < 18) return TIME_SLOTS.TARDE;
    return TIME_SLOTS.NOITE;
  }

  function calculateMedian(values) {
    if (!values || !Array.isArray(values) || values.length === 0) return 0.0;
    const sorted = [...values].map(Number).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2.0;
  }

  function isDoneState(state) {
    const s = String(state || '').toLowerCase();
    return s === 'done' || s === 'feito';
  }

  function isMissedState(state) {
    const s = String(state || '').toLowerCase();
    return s === 'missed' || s === 'perdido';
  }

  function getLocalDayAndHour(isoOrDateStr, timeZone) {
    if (!isoOrDateStr) return { day: '1970-01-01', hour: 12, dayOfWeek: 1 };
    try {
      const d = new Date(isoOrDateStr);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone || 'America/Sao_Paulo',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        weekday: 'short'
      });
      const parts = formatter.formatToParts(d);
      const map = {};
      parts.forEach(p => { map[p.type] = p.value; });
      const day = `${map.year}-${map.month}-${map.day}`;
      const hour = +map.hour === 24 ? 0 : +map.hour;
      const dayOfWeekMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
      const dayOfWeek = dayOfWeekMap[map.weekday] || 1;
      return { day, hour, dayOfWeek };
    } catch (_) {
      const match = String(isoOrDateStr).match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}))?/);
      if (match) {
        return { day: match[1], hour: +(match[2] || 12), dayOfWeek: 1 };
      }
      return { day: '1970-01-01', hour: 12, dayOfWeek: 1 };
    }
  }

  function summarizeItems(items, checkInMap, toleranceMinutes) {
    const total = items.length;
    const doneItems = items.filter(c => isDoneState(c.state));
    const missedItems = items.filter(c => isMissedState(c.state));

    const doneCount = doneItems.size !== undefined ? doneItems.size : doneItems.length;
    const missedCount = missedItems.size !== undefined ? missedItems.size : missedItems.length;

    const denominator = doneCount + missedCount;
    const fulfillmentRate = denominator > 0 ? doneCount / denominator : 0.0;

    const delays = [];
    doneItems.forEach(c => {
      const chk = checkInMap[c.id];
      if (chk && typeof chk.lateMinutes === 'number') {
        delays.push(chk.lateMinutes);
      }
    });

    const onTimeCount = delays.filter(d => d <= toleranceMinutes).length;
    const punctualityRate = doneCount > 0 ? onTimeCount / doneCount : 0.0;

    const medianLateMinutes = calculateMedian(delays);
    const sum = delays.reduce((acc, v) => acc + v, 0);
    const averageLateMinutes = delays.length > 0 ? sum / delays.length : 0.0;

    return {
      totalCount: total,
      doneCount,
      missedCount,
      onTimeCount,
      fulfillmentRate: Math.round(fulfillmentRate * 1000) / 1000,
      punctualityRate: Math.round(punctualityRate * 1000) / 1000,
      medianLateMinutes: Math.round(medianLateMinutes * 10) / 10,
      averageLateMinutes: Math.round(averageLateMinutes * 10) / 10
    };
  }

  function generateObservation(overall) {
    const punctualityPct = Math.round(overall.punctualityRate * 100);
    const medianLate = Math.round(overall.medianLateMinutes);

    if (medianLate <= 0) {
      return "Nesta semana, seus compromissos tenderam a acontecer com pontualidade ou antecedência, mantendo o fio do novelinho leve e alinhado.";
    } else if (medianLate <= 10) {
      return `Nesta semana, a taxa de pontualidade foi de cerca de ${punctualityPct}% com atraso mediano de ${medianLate} minutos, dentro de uma margem acolhedora.`;
    } else {
      return `Observamos nesta semana que o fio tendeu a esticar cerca de ${medianLate} minutos no meio dos dias, um bom sinal para ajustar janelas com carinho.`;
    }
  }

  class DelayMetricsEngine {
    constructor(options = {}) {
      this.clock = options.clock || null;
    }

    calculateMedian(values) {
      return calculateMedian(values);
    }

    getTimeSlot(hour) {
      return getTimeSlot(hour);
    }

    computeMetrics(commitments = [], checkIns = [], config = {}, referenceZone = 'America/Sao_Paulo') {
      const tolerance = (config && config.punctuality && typeof config.punctuality.toleranceMinutes === 'number')
        ? config.punctuality.toleranceMinutes
        : 10;

      const checkInMap = {};
      if (Array.isArray(checkIns)) {
        checkIns.forEach(chk => {
          if (chk && chk.commitmentId) {
            checkInMap[chk.commitmentId] = chk;
          }
        });
      }

      // Filtra apenas resolvidos (done ou missed)
      const resolved = (commitments || []).filter(c => isDoneState(c.state) || isMissedState(c.state));

      // Mapeia datas locais únicas para a barreira de amostragem
      const uniqueDaysSet = new Set();
      resolved.forEach(c => {
        const timeZone = c.plannedZone || referenceZone;
        const { day } = getLocalDayAndHour(c.plannedStart, timeZone);
        uniqueDaysSet.add(day);
      });

      const uniqueDaysCount = uniqueDaysSet.size;
      const hasSufficientData = uniqueDaysCount >= MINIMUM_DAYS_BARRIER;
      const overall = summarizeItems(resolved, checkInMap, tolerance);

      if (!hasSufficientData) {
        return {
          hasSufficientData: false,
          uniqueDaysCount,
          overall,
          breakdown: null,
          gentleObservation: "A gatinha ainda está observando seu ritmo nos primeiros dias. Continue registrando sua rotina com tranquilidade!"
        };
      }

      // 1. Recorte por categoria
      const byCategory = {};
      resolved.forEach(c => {
        const cat = c.category || 'OUTROS';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(c);
      });
      Object.keys(byCategory).forEach(cat => {
        byCategory[cat] = summarizeItems(byCategory[cat], checkInMap, tolerance);
      });

      // 2. Recorte por meta
      const byGoal = {};
      resolved.filter(c => c.goalId).forEach(c => {
        const gId = c.goalId;
        if (!byGoal[gId]) byGoal[gId] = [];
        byGoal[gId].push(c);
      });
      Object.keys(byGoal).forEach(gId => {
        byGoal[gId] = summarizeItems(byGoal[gId], checkInMap, tolerance);
      });

      // 3. Recorte por dia da semana
      const byDayOfWeek = {};
      resolved.forEach(c => {
        const timeZone = c.plannedZone || referenceZone;
        const { dayOfWeek } = getLocalDayAndHour(c.plannedStart, timeZone);
        if (!byDayOfWeek[dayOfWeek]) byDayOfWeek[dayOfWeek] = [];
        byDayOfWeek[dayOfWeek].push(c);
      });
      Object.keys(byDayOfWeek).forEach(dow => {
        byDayOfWeek[dow] = summarizeItems(byDayOfWeek[dow], checkInMap, tolerance);
      });

      // 4. Recorte por faixa de horário
      const byTimeSlot = {};
      resolved.forEach(c => {
        const timeZone = c.plannedZone || referenceZone;
        const { hour } = getLocalDayAndHour(c.plannedStart, timeZone);
        const slot = getTimeSlot(hour);
        if (!byTimeSlot[slot]) byTimeSlot[slot] = [];
        byTimeSlot[slot].push(c);
      });
      Object.keys(byTimeSlot).forEach(slot => {
        byTimeSlot[slot] = summarizeItems(byTimeSlot[slot], checkInMap, tolerance);
      });

      // 5. Recorte retroativo vs ao vivo
      const liveList = resolved.filter(c => {
        const chk = checkInMap[c.id];
        return !chk || !chk.retroactive;
      });
      const retroList = resolved.filter(c => {
        const chk = checkInMap[c.id];
        return chk && Boolean(chk.retroactive);
      });

      const liveMetrics = summarizeItems(liveList, checkInMap, tolerance);
      const retroactiveMetrics = summarizeItems(retroList, checkInMap, tolerance);

      const breakdown = {
        byCategory,
        byGoal,
        byDayOfWeek,
        byTimeSlot,
        liveMetrics,
        retroactiveMetrics
      };

      const gentleObservation = generateObservation(overall);

      return {
        hasSufficientData: true,
        uniqueDaysCount,
        overall,
        breakdown,
        gentleObservation
      };
    }
  }

  const defaultDelayMetricsEngine = new DelayMetricsEngine();

  return {
    MINIMUM_DAYS_BARRIER,
    TIME_SLOTS,
    calculateMedian,
    getTimeSlot,
    DelayMetricsEngine,
    delayMetricsEngine: defaultDelayMetricsEngine
  };
});
