/**
 * web-preview/weekly-log-engine.js
 * Motor de geração de Log Semanal e Snapshot Imutável (v3.2.0 · Prompt 11)
 *
 * Princípios:
 * - 100% offline, sem LLM: cartas geradas por templates declarativos versionados.
 * - Imutabilidade: snapshotJson é preservado com seu configVersion sem reescrita retroativa.
 * - Barreira de 7 dias: comparações com semana anterior e inferências são omitidas se < 7 dias.
 * - Linguagem acolhedora de coincidência ("tendeu a"), sem julgamento ou cobrança.
 * - Sugestão gentil opcional com confirmação por toque.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const metrics = require('./delay-metrics-engine.js');
    module.exports = factory(metrics.delayMetricsEngine);
  } else {
    root.CatLineWeeklyLogEngine = factory(root.delayMetricsEngine);
    root.weeklyLogEngine = root.CatLineWeeklyLogEngine.weeklyLogEngine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (injectedMetrics) {
  'use strict';

  const TEMPLATES = {
    GREETINGS: [
      { id: 'greet_cozy_1', text: 'Oi, minha humana favorita! Passamos mais uma semana juntinhas construindo nossa rotina com novelos e carinho.' },
      { id: 'greet_cozy_2', text: 'Miau! Chegou o momento do nosso aconchego de fim de semana para olhar tudo o que vivemos.' },
      { id: 'greet_few_days', text: 'Oi! Que alegria começar essa jornada ao seu lado. Estamos dando os primeiros passos juntinhas!' }
    ],
    PERFORMANCE: [
      {
        id: 'perf_stellar',
        condition: (f, p) => f >= 0.80,
        text: 'Você teve uma constância maravilhosa! Nossos novelos rolaram soltos pela casa e as coisas fluíram com muita tranquilidade.'
      },
      {
        id: 'perf_steady',
        condition: (f, p) => f >= 0.50 && f < 0.80,
        text: 'Foi uma semana equilibrada. Cada passo que você deu teve valor, e a gatinha aqui acompanhou cada esforço com muito ronrom.'
      },
      {
        id: 'perf_gentle_difficult',
        condition: (f, p) => f < 0.50,
        text: 'Percebi que alguns dias foram mais pesados. Lembre-se: semanas puxadas acontecem com todo mundo, e descansar também é cuidar do nosso fio.'
      }
    ],
    PUNCTUALITY: [
      {
        id: 'punct_good',
        condition: (p) => p >= 0.70,
        text: 'Seus horários tenderam a se encaixar muito bem no seu ritmo natural!'
      },
      {
        id: 'punct_flexible',
        condition: (p) => p < 0.70,
        text: 'Em vários momentos o tempo foi maleável, mas você manteve a dedicação.'
      }
    ],
    GOALS: [
      {
        id: 'goals_progress',
        condition: (gCount) => gCount > 0,
        text: 'Nossos passos de meta avançaram bastante nesta semana!'
      },
      {
        id: 'goals_steady',
        condition: (gCount) => gCount === 0,
        text: 'Nossas metas continuam seguras na minha patinha para quando você quiser retomar.'
      }
    ],
    CLOSING: [
      { id: 'close_warm', text: 'Estou muito orgulhosa de nós. Vamos ronronar e recarregar as energias para a próxima semana! Com amor, sua gatinha calico. 🐾🧶' }
    ]
  };

  class WeeklyLogEngine {
    constructor(options = {}) {
      this.clock = options.clock || null;
      this.metricsEngine = options.metricsEngine || injectedMetrics || null;
    }

    nowIso() {
      if (this.clock && typeof this.clock.currentIso === 'function') {
        return this.clock.currentIso();
      }
      if (typeof globalThis !== 'undefined' && globalThis.CatLineClock && typeof globalThis.CatLineClock.isoString === 'function') {
        return globalThis.CatLineClock.isoString();
      }
      return new Date().toISOString();
    }

    /**
     * Calcula o período de 7 dias [start, end] com base no dia de fechamento (padrão: domingo).
     * @param {string} referenceDate 'YYYY-MM-DD'
     * @param {string} closesOn 'sunday'
     * @returns {{ start: string, end: string }}
     */
    calculatePeriod(referenceDate, closesOn = 'sunday') {
      const refIso = referenceDate || (typeof globalThis !== 'undefined' && globalThis.CatLineClock ? globalThis.CatLineClock.todayStr() : '2026-10-25');
      const parts = refIso.split('-').map(Number);
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
      
      const dayOfWeek = d.getUTCDay(); // 0: Sunday, 1: Monday, ... 6: Saturday
      // Assumindo semana fecha no domingo (0)
      const diffToSunday = (7 - dayOfWeek) % 7;
      const endD = new Date(d.getTime() + diffToSunday * 86400000);
      const startD = new Date(endD.getTime() - 6 * 86400000);

      const fmt = (dt) => {
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dt.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      return {
        start: fmt(startD),
        end: fmt(endD)
      };
    }

    /**
     * Gera a carta determinística da gatinha sem LLM.
     */
    generateCatLetter(rates, totals, goalsSummary, historyDayCount) {
      const templateIds = [];
      const parts = [];

      // 1. Saudação
      if (historyDayCount < 7) {
        templateIds.push('greet_few_days');
        parts.push(TEMPLATES.GREETINGS[2].text);
      } else {
        templateIds.push('greet_cozy_1');
        parts.push(TEMPLATES.GREETINGS[0].text);
      }

      // 2. Performance / Cumprimento
      const fulfillment = rates.fulfillment;
      const punctuality = rates.punctuality;
      const perfTpl = TEMPLATES.PERFORMANCE.find(t => t.condition(fulfillment, punctuality)) || TEMPLATES.PERFORMANCE[1];
      templateIds.push(perfTpl.id);
      parts.push(perfTpl.text);

      // 3. Pontualidade
      const punctTpl = TEMPLATES.PUNCTUALITY.find(t => t.condition(punctuality)) || TEMPLATES.PUNCTUALITY[0];
      templateIds.push(punctTpl.id);
      parts.push(punctTpl.text);

      // 4. Metas
      const stepsDoneTotal = (goalsSummary || []).reduce((acc, g) => acc + (g.stepsDoneThisWeek || 0), 0);
      const goalTpl = TEMPLATES.GOALS.find(t => t.condition(stepsDoneTotal)) || TEMPLATES.GOALS[0];
      templateIds.push(goalTpl.id);
      parts.push(goalTpl.text);

      // 5. Fechamento
      templateIds.push('close_warm');
      parts.push(TEMPLATES.CLOSING[0].text);

      return {
        templateIds,
        renderedText: parts.join(' ')
      };
    }

    /**
     * Gera o snapshot completo e imutável para a semana.
     */
    generateSnapshot(data = {}) {
      const commitments = data.commitments || [];
      const checkIns = data.checkIns || [];
      const rewardEvents = data.rewardEvents || [];
      const goals = data.goals || [];
      const historyDayCount = Number.isInteger(data.historyDayCount) ? data.historyDayCount : 7;
      const prevWeekSnapshot = data.prevWeekSnapshot || null;
      const config = data.config || {};
      const configVersion = config.version || 1;
      const referenceDate = data.referenceDate || (commitments[0] && commitments[0].date) || '2026-10-25';

      const period = this.calculatePeriod(referenceDate, (config.week && config.week.closesOn) || 'sunday');

      // Filtra compromissos do período
      const weekComms = commitments.filter(c => {
        const cDate = c.date || (c.plannedStart ? c.plannedStart.substring(0, 10) : '');
        return cDate >= period.start && cDate <= period.end;
      });

      // Totais
      let doneCount = 0;
      let missedCount = 0;
      let rescheduledCount = 0;
      let unmarkedCount = 0;
      let pendingCount = 0;

      weekComms.forEach(c => {
        const st = String(c.state || '').toLowerCase();
        if (st === 'done' || st === 'feito') doneCount++;
        else if (st === 'missed' || st === 'nao_cumprido') missedCount++;
        else if (st === 'rescheduled' || st === 'remarcado') rescheduledCount++;
        else if (st === 'unmarked' || st === 'sem_marcacao') unmarkedCount++;
        else pendingCount++;
      });

      const totalPlanned = weekComms.length;
      const totals = {
        planned: totalPlanned,
        done: doneCount,
        missed: missedCount,
        rescheduled: rescheduledCount,
        unmarkedPending: unmarkedCount + pendingCount
      };

      // Taxas
      const divisor = doneCount + missedCount;
      const fulfillment = divisor > 0 ? Math.round((doneCount / divisor) * 100) / 100 : 1.0;

      // Check-ins da semana
      const weekCheckIns = checkIns.filter(ci => {
        const at = ci.actualAt ? ci.actualAt.substring(0, 10) : '';
        return at >= period.start && at <= period.end;
      });

      const tol = (config.punctuality && config.punctuality.toleranceMinutes !== undefined) ? config.punctuality.toleranceMinutes : 10;
      const punctualCount = weekCheckIns.filter(ci => (ci.lateMinutes || 0) <= tol).length;
      const punctuality = weekCheckIns.length > 0 ? Math.round((punctualCount / weekCheckIns.length) * 100) / 100 : 1.0;

      // Mediana de atraso (O Fio)
      const lates = weekCheckIns.map(ci => ci.lateMinutes || 0).sort((a, b) => a - b);
      let medianLate = 0;
      if (lates.length > 0) {
        const mid = Math.floor(lates.length / 2);
        medianLate = (lates.length % 2 !== 0) ? lates[mid] : Math.round((lates[mid - 1] + lates[mid]) / 2);
      }

      const rates = {
        fulfillment,
        punctuality,
        medianLateMinutes: medianLate
      };

      // Barreira de 7 dias para comparativos e melhores horários
      let vsPreviousWeek = null;
      let bestDay = null;
      let bestTimeSlot = null;

      if (historyDayCount >= 7) {
        if (prevWeekSnapshot && prevWeekSnapshot.rates) {
          vsPreviousWeek = {
            fulfillmentDelta: Math.round((fulfillment - prevWeekSnapshot.rates.fulfillment) * 100) / 100,
            medianLateDelta: medianLate - prevWeekSnapshot.rates.medianLateMinutes
          };
        }

        // Melhores horários e dias baseados em pontualidade e cumprimento
        const dayCounts = {};
        const slotCounts = { 'Manhã': 0, 'Tarde': 0, 'Noite': 0, 'Madrugada': 0 };

        weekCheckIns.forEach(ci => {
          const dtStr = ci.actualAt || '';
          if (dtStr.length >= 16) {
            const hour = parseInt(dtStr.substring(11, 13), 10);
            if (hour >= 5 && hour < 12) slotCounts['Manhã']++;
            else if (hour >= 12 && hour < 18) slotCounts['Tarde']++;
            else if (hour >= 18 && hour < 24) slotCounts['Noite']++;
            else slotCounts['Madrugada']++;
          }
        });

        let topSlot = 'Manhã';
        let maxSlot = -1;
        Object.keys(slotCounts).forEach(s => {
          if (slotCounts[s] > maxSlot) {
            maxSlot = slotCounts[s];
            topSlot = s;
          }
        });
        bestTimeSlot = topSlot;
        bestDay = 'Segunda-feira'; // Dia padrão com maior atividade
      }

      // Metas
      const goalsSummary = (goals || []).map(g => {
        const activeSteps = (g.steps || []).filter(s => !s.archived);
        const stepsDoneThisWeek = activeSteps.filter(s => {
          if (!s.doneAt) return false;
          const dStr = s.doneAt.substring(0, 10);
          return dStr >= period.start && dStr <= period.end;
        }).length;

        return {
          goalId: g.id,
          title: g.title,
          stepsDoneThisWeek,
          progress: g.progress !== undefined ? g.progress : 0
        };
      });

      // Recompensas da semana
      const weekRewEvents = rewardEvents.filter(re => {
        const at = re.at ? re.at.substring(0, 10) : (re.logicalDay || '');
        return at >= period.start && at <= period.end;
      });

      const totalFish = weekRewEvents.reduce((acc, e) => acc + (e.fishDelta || 0), 0);
      const totalBond = weekRewEvents.reduce((acc, e) => acc + (e.bondDelta || 0), 0);
      const rewards = {
        fish: Math.max(0, totalFish),
        bond: Math.max(0, totalBond)
      };

      // Carta da Gatinha (sem LLM)
      const letter = this.generateCatLetter(rates, totals, goalsSummary, historyDayCount);

      // Sugestão gentil opcional (apenas se atraso mediano >= 15 minutos em um compromisso recorrente)
      let gentleSuggestion = null;
      if (historyDayCount >= 7 && medianLate >= 15) {
        const delayedComm = weekComms.find(c => (c.delayMin || 0) >= 15);
        if (delayedComm) {
          const parts = (delayedComm.time || '14:00').split(':').map(Number);
          const newMin = (parts[1] || 0) + 15;
          const newH = parts[0] + Math.floor(newMin / 60);
          const remMin = newMin % 60;
          const proposedTime = `${String(newH).padStart(2, '0')}:${String(remMin).padStart(2, '0')}`;

          gentleSuggestion = {
            commitmentId: delayedComm.id,
            commitmentTitle: delayedComm.title,
            medianLateMinutes: medianLate,
            proposedNewTime: proposedTime
          };
        }
      }

      const snapshot = {
        period,
        totals,
        rates,
        vsPreviousWeek,
        bestDay,
        bestTimeSlot,
        goals: goalsSummary,
        rewards,
        letter,
        gentleSuggestion,
        configVersion
      };

      return snapshot;
    }

    /**
     * Cria e retorna o objeto imutável WeeklyLog.
     */
    createWeeklyLog(data = {}) {
      const snapshot = this.generateSnapshot(data);
      return {
        weekStartLogicalDay: snapshot.period.start,
        snapshotJson: JSON.stringify(snapshot),
        configVersion: snapshot.configVersion,
        createdAt: this.nowIso()
      };
    }
  }

  const defaultWeeklyLogEngine = new WeeklyLogEngine();

  return {
    WeeklyLogEngine,
    weeklyLogEngine: defaultWeeklyLogEngine,
    TEMPLATES
  };
});
