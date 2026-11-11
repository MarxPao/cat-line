/**
 * web-preview/day-closure-engine.js
 * Lógica pura do Fechamento do Dia (v3.2.0 · Prompt 7)
 *
 * Princípios:
 * - Sem punição: compromissos não resolvidos nunca assumem "não cumprido" automaticamente.
 * - Resolução flexível: Cumpri (com horário real), Não cumpri, Remarcar.
 * - Operação em lote: "marcar todos como cumpridos no horário planejado" com lateMinutes = 0.
 * - Adiar resolução: mantém como UNMARKED fora das métricas até resolução.
 * - Idempotência estrita: DayClosure e recompensa (+1 vínculo) registrados uma única vez.
 * - Reconciliação sequencial de múltiplos dias acumulados.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const sm = require('./commitment-state-machine.js');
    const rew = require('./reward-ledger-engine.js');
    module.exports = factory(sm.commitmentStateMachine, rew.rewardLedgerEngine);
  } else {
    root.CatLineDayClosureEngine = factory(root.commitmentStateMachine, root.rewardLedgerEngine);
    root.dayClosureEngine = root.CatLineDayClosureEngine.dayClosureEngine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (injectedSm, injectedRew) {
  'use strict';

  function extractDateString(isoOrDateStr) {
    if (!isoOrDateStr) return '1970-01-01';
    const match = String(isoOrDateStr).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '1970-01-01';
  }

  function addDaysToIso(dateStr, days) {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().substring(0, 10);
  }

  class DayClosureEngine {
    constructor(options = {}) {
      this.clock = options.clock || null;
      this.stateMachine = options.stateMachine || injectedSm || null;
      this.rewardLedger = options.rewardLedger || injectedRew || null;
    }

    nowIso() {
      if (this.clock && typeof this.clock.currentIso === 'function') {
        return this.clock.currentIso();
      }
      if (typeof globalThis !== 'undefined' && globalThis.CatLineClock && typeof globalThis.CatLineClock.currentIso === 'function') {
        return globalThis.CatLineClock.currentIso();
      }
      return new Date().toISOString();
    }

    findUnresolved(logicalDay, commitments = []) {
      const targetDay = String(logicalDay).trim();
      return (commitments || []).filter(c => {
        const cDate = c.date || extractDateString(c.plannedStart);
        const st = String(c.state || '').toLowerCase();
        const isUnresolved = st === 'pending' || st === 'pendente' || st === 'unmarked' || st === 'sem_marcacao';
        return cDate === targetDay && isUnresolved;
      });
    }

    resolveAsDone(commitment, actualAt) {
      if (!this.stateMachine) {
        throw new Error('CommitmentStateMachine não disponível.');
      }
      const res = this.stateMachine.checkIn(commitment, {
        actualAt: actualAt || commitment.plannedStart,
        retroactive: true
      });
      return {
        commitment: res.commitment,
        checkIn: res.checkIn
      };
    }

    resolveAsMissed(commitment) {
      if (!this.stateMachine) {
        throw new Error('CommitmentStateMachine não disponível.');
      }
      const res = this.stateMachine.markMissed(commitment);
      return {
        commitment: res.commitment
      };
    }

    resolveAsRescheduled(commitment, options = {}) {
      if (!this.stateMachine) {
        throw new Error('CommitmentStateMachine não disponível.');
      }
      const res = this.stateMachine.reschedule(commitment, options);
      return {
        original: res.original,
        replacement: res.replacement
      };
    }

    resolveAllAsPlanned(unresolved = []) {
      if (!this.stateMachine) {
        throw new Error('CommitmentStateMachine não disponível.');
      }
      const updated = [];
      const checkIns = [];

      unresolved.forEach(c => {
        const res = this.stateMachine.checkIn(c, {
          actualAt: c.plannedStart,
          retroactive: true
        });
        updated.push(res.commitment);
        checkIns.push(res.checkIn);
      });

      return {
        updatedCommitments: updated,
        createdCheckIns: checkIns
      };
    }

    postpone(unresolved = []) {
      if (!this.stateMachine) {
        throw new Error('CommitmentStateMachine não disponível.');
      }
      return (unresolved || []).map(c => {
        const st = String(c.state || '').toLowerCase();
        if (st === 'pending' || st === 'pendente') {
          return this.stateMachine.markUnmarked(c).commitment;
        }
        return c;
      });
    }

    closeDay(logicalDay, commitments = [], existingClosures = [], existingRewardEvents = [], config = {}) {
      const targetDay = String(logicalDay).trim();
      const existing = (existingClosures || []).find(cl => String(cl.logicalDay) === targetDay);

      if (existing) {
        return {
          closure: existing,
          updatedCommitments: [],
          rewardEvents: [],
          wasAlreadyClosed: true
        };
      }

      // Converte pendentes esquecidos para unmarked sem assumir missed
      const unresolved = this.findUnresolved(targetDay, commitments);
      const updatedCommitments = [];
      unresolved.forEach(c => {
        const st = String(c.state || '').toLowerCase();
        if (st === 'pending' || st === 'pendente') {
          if (this.stateMachine) {
            updatedCommitments.push(this.stateMachine.markUnmarked(c).commitment);
          } else {
            updatedCommitments.push({ ...c, state: 'unmarked' });
          }
        }
      });

      const closure = {
        logicalDay: targetDay,
        closedAt: this.nowIso()
      };

      let rewardEvents = [];
      if (this.rewardLedger) {
        const rewRes = this.rewardLedger.awardDayClosure(targetDay, existingRewardEvents, config);
        rewardEvents = rewRes.events || [];
      }

      return {
        closure,
        updatedCommitments,
        rewardEvents,
        wasAlreadyClosed: false
      };
    }

    reconcilePendingDays(lastClosedDay, currentLogicalDay) {
      const result = [];
      if (!lastClosedDay || !currentLogicalDay) return result;

      let cursor = addDaysToIso(lastClosedDay, 1);
      while (cursor < currentLogicalDay) {
        result.push(cursor);
        cursor = addDaysToIso(cursor, 1);
      }
      return result;
    }
  }

  const defaultDayClosureEngine = new DayClosureEngine();

  return {
    DayClosureEngine,
    dayClosureEngine: defaultDayClosureEngine
  };
});
