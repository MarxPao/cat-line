/**
 * web-preview/commitment-state-machine.js
 * Máquina de estados do Compromisso (v3.2.0 · Prompt 4)
 *
 * Estados do compromisso:
 * - pending: aguardando realização
 * - done: cumprido (check-in ao vivo ou retroativo)
 * - missed: não cumprido (marcação explícita da usuária, sem punição)
 * - rescheduled: remarcado para outro horário/dia
 * - unmarked: encerramento do dia sem resposta (não assume missed)
 *
 * Casos de borda:
 * - Caso 3: Cálculo de atraso com fuso horário (plannedZone) e transição de horário de verão.
 * - Caso 5: Idempotência de check-in (duplo toque não duplica registro).
 * - Caso 6: Desfazer dentro da janela permitida reverte o estado e emite compensação sem apagar histórico.
 * - Caso 7: Ocorrências de compromisso recorrente são instâncias independentes.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CommitmentStateMachineModule = factory();
    root.commitmentStateMachine = root.CommitmentStateMachineModule.commitmentStateMachine;
    root.COMMITMENT_STATES = root.CommitmentStateMachineModule.COMMITMENT_STATES;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COMMITMENT_STATES = Object.freeze({
    PENDING: 'pending',
    DONE: 'done',
    MISSED: 'missed',
    RESCHEDULED: 'rescheduled',
    UNMARKED: 'unmarked'
  });

  function normalizeState(st) {
    if (!st) return COMMITMENT_STATES.PENDING;
    const s = String(st).trim().toLowerCase();
    if (s === 'feito' || s === 'done') return COMMITMENT_STATES.DONE;
    if (s === 'perdido' || s === 'missed') return COMMITMENT_STATES.MISSED;
    if (s === 'remarcado' || s === 'rescheduled') return COMMITMENT_STATES.RESCHEDULED;
    if (s === 'sem_marcacao' || s === 'unmarked') return COMMITMENT_STATES.UNMARKED;
    return COMMITMENT_STATES.PENDING;
  }

  function getZonedEpoch(dateInput, timeZone) {
    if (dateInput === null || dateInput === undefined) return 0;
    if (typeof dateInput === 'number') return dateInput;
    if (dateInput instanceof Date) return dateInput.getTime();

    const str = String(dateInput).trim();
    if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
      return new Date(str).getTime();
    }

    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!match) {
      return new Date(str).getTime();
    }

    const [, y, m, d, hr, mn, sc] = match;
    const naiveUtc = Date.UTC(+y, +m - 1, +d, +(hr || 0), +(mn || 0), +(sc || 0));

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone || 'UTC',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const parts = formatter.formatToParts(new Date(naiveUtc));
      const map = {};
      parts.forEach(p => { map[p.type] = p.value; });
      const tzHour = +map.hour === 24 ? 0 : +map.hour;
      const tzUtc = Date.UTC(+map.year, +map.month - 1, +map.day, tzHour, +map.minute, +(map.second || 0));
      const offsetMs = tzUtc - naiveUtc;
      return naiveUtc - offsetMs;
    } catch (_) {
      return naiveUtc;
    }
  }

  function calculateLateMinutes(plannedStart, actualAt, plannedZone) {
    const plannedEpoch = getZonedEpoch(plannedStart, plannedZone);
    const actualEpoch = getZonedEpoch(actualAt, plannedZone);
    return Math.round((actualEpoch - plannedEpoch) / 60000);
  }

  class CommitmentStateMachine {
    constructor(options = {}) {
      this.clock = options.clock || null;
    }

    nowMs() {
      if (this.clock && typeof this.clock.currentTimeMillis === 'function') {
        return this.clock.currentTimeMillis();
      }
      if (typeof globalThis !== 'undefined' && globalThis.CatLineClock && typeof globalThis.CatLineClock.nowMs === 'function') {
        return globalThis.CatLineClock.nowMs();
      }
      return Date.now();
    }

    nowIso() {
      if (this.clock && typeof this.clock.currentIso === 'function') {
        return this.clock.currentIso();
      }
      if (typeof globalThis !== 'undefined' && globalThis.CatLineClock && typeof globalThis.CatLineClock.currentIso === 'function') {
        return globalThis.CatLineClock.currentIso();
      }
      return new Date(this.nowMs()).toISOString();
    }

    calculateLateMinutes(plannedStart, actualAt, plannedZone = 'UTC') {
      return calculateLateMinutes(plannedStart, actualAt, plannedZone);
    }

    /**
     * pending/unmarked -> done
     * Idempotente para duplo toque (Caso 5)
     */
    checkIn(commitment, options = {}) {
      if (!commitment || !commitment.id) {
        throw new Error('Compromisso inválido.');
      }

      const currentState = normalizeState(commitment.state);

      if (currentState === COMMITMENT_STATES.DONE) {
        const existingList = Array.isArray(options.existingCheckIns) ? options.existingCheckIns : [];
        const existing = existingList.find(c => String(c.commitmentId) === String(commitment.id)) || {
          id: 'chk_' + commitment.id,
          commitmentId: commitment.id,
          actualAt: commitment.plannedStart || this.nowIso(),
          retroactive: false,
          lateMinutes: 0
        };
        return {
          commitment: { ...commitment, state: COMMITMENT_STATES.DONE },
          checkIn: existing,
          events: [],
          wasDuplicate: true
        };
      }

      if (currentState !== COMMITMENT_STATES.PENDING && currentState !== COMMITMENT_STATES.UNMARKED) {
        throw new Error(
          `Transição inválida: compromisso no estado ${commitment.state} não pode receber check-in.`
        );
      }

      const actualIso = options.actualAt
        ? (typeof options.actualAt === 'string' ? options.actualAt : new Date(options.actualAt).toISOString())
        : this.nowIso();

      const isRetro = Boolean(options.retroactive || currentState === COMMITMENT_STATES.UNMARKED);
      const lateMinutes = calculateLateMinutes(commitment.plannedStart, actualIso, commitment.plannedZone || 'UTC');

      const checkIn = {
        id: 'chk_' + commitment.id + '_' + Date.now(),
        commitmentId: commitment.id,
        actualAt: actualIso,
        retroactive: isRetro,
        lateMinutes: lateMinutes
      };

      const updated = {
        ...commitment,
        state: COMMITMENT_STATES.DONE
      };

      const event = {
        type: 'CommitmentCheckedIn',
        commitmentId: commitment.id,
        checkIn: checkIn,
        occurredAt: actualIso
      };

      return {
        commitment: updated,
        checkIn: checkIn,
        events: [event],
        wasDuplicate: false
      };
    }

    /**
     * pending/unmarked -> missed
     * Marcação explícita da usuária, sem punição nem desconto de saldo.
     */
    markMissed(commitment) {
      if (!commitment || !commitment.id) {
        throw new Error('Compromisso inválido.');
      }

      const currentState = normalizeState(commitment.state);

      if (currentState === COMMITMENT_STATES.MISSED) {
        return {
          commitment: { ...commitment, state: COMMITMENT_STATES.MISSED },
          events: []
        };
      }

      if (currentState !== COMMITMENT_STATES.PENDING && currentState !== COMMITMENT_STATES.UNMARKED) {
        throw new Error(
          `Transição inválida: compromisso no estado ${commitment.state} não pode ser marcado como não cumprido.`
        );
      }

      const now = this.nowIso();
      const updated = {
        ...commitment,
        state: COMMITMENT_STATES.MISSED
      };

      const event = {
        type: 'CommitmentMissed',
        commitmentId: commitment.id,
        occurredAt: now
      };

      return {
        commitment: updated,
        events: [event]
      };
    }

    /**
     * pending/unmarked -> rescheduled
     * Cria nova ocorrência pending vinculada pelo rescheduledFromId.
     */
    reschedule(commitment, options = {}) {
      if (!commitment || !commitment.id) {
        throw new Error('Compromisso inválido.');
      }

      const currentState = normalizeState(commitment.state);

      if (currentState !== COMMITMENT_STATES.PENDING && currentState !== COMMITMENT_STATES.UNMARKED) {
        throw new Error(
          `Transição inválida: compromisso no estado ${commitment.state} não pode ser remarcado.`
        );
      }

      const newId = options.newCommitmentId || ('comm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      const newPlannedStart = options.newPlannedStart;
      if (!newPlannedStart) {
        throw new Error('Novo horário planejado (newPlannedStart) é obrigatório para remarcar.');
      }
      const newPlannedZone = options.newPlannedZone || commitment.plannedZone || 'UTC';
      const now = this.nowIso();

      const updatedOriginal = {
        ...commitment,
        state: COMMITMENT_STATES.RESCHEDULED
      };

      const replacement = {
        ...commitment,
        id: newId,
        plannedStart: newPlannedStart,
        plannedZone: newPlannedZone,
        state: COMMITMENT_STATES.PENDING,
        rescheduledFromId: commitment.id,
        createdAt: now
      };

      const event = {
        type: 'CommitmentRescheduled',
        originalCommitmentId: commitment.id,
        newCommitmentId: newId,
        newPlannedStart: newPlannedStart,
        occurredAt: now
      };

      return {
        original: updatedOriginal,
        replacement: replacement,
        events: [event]
      };
    }

    /**
     * pending -> unmarked
     * Encerramento do dia sem marcação (não assume missed).
     */
    markUnmarked(commitment) {
      if (!commitment || !commitment.id) {
        throw new Error('Compromisso inválido.');
      }

      const currentState = normalizeState(commitment.state);

      if (currentState === COMMITMENT_STATES.UNMARKED) {
        return {
          commitment: { ...commitment, state: COMMITMENT_STATES.UNMARKED },
          events: []
        };
      }

      if (currentState !== COMMITMENT_STATES.PENDING) {
        throw new Error(
          `Transição inválida: compromisso no estado ${commitment.state} não pode ser marcado como sem marcação.`
        );
      }

      const now = this.nowIso();
      const updated = {
        ...commitment,
        state: COMMITMENT_STATES.UNMARKED
      };

      const event = {
        type: 'CommitmentUnmarked',
        commitmentId: commitment.id,
        occurredAt: now
      };

      return {
        commitment: updated,
        events: [event]
      };
    }

    /**
     * done -> pending
     * Desfazer dentro da janela configurada (ex: 10 minutos).
     * Reverte estado e emite compensação sem apagar histórico.
     */
    undo(commitment, checkIn, options = {}) {
      if (!commitment || !commitment.id) {
        throw new Error('Compromisso inválido.');
      }

      const currentState = normalizeState(commitment.state);

      if (currentState !== COMMITMENT_STATES.DONE) {
        throw new Error(
          `Transição inválida: apenas compromissos concluídos podem ser desfeitos.`
        );
      }

      if (!checkIn || !checkIn.actualAt) {
        throw new Error('CheckIn com timestamp válido é obrigatório para desfazer.');
      }

      const undoWindowMinutes = typeof options.undoWindowMinutes === 'number' ? options.undoWindowMinutes : 10;
      const undoAtMs = options.undoAt ? new Date(options.undoAt).getTime() : this.nowMs();
      const checkInEpoch = new Date(checkIn.actualAt).getTime();
      const elapsedMinutes = Math.round((undoAtMs - checkInEpoch) / 60000);

      if (elapsedMinutes > undoWindowMinutes || elapsedMinutes < 0) {
        throw new Error(
          `Janela de desfazer expirou (limite de ${undoWindowMinutes}m ultrapassado: ${elapsedMinutes}m decorridos).`
        );
      }

      const updated = {
        ...commitment,
        state: COMMITMENT_STATES.PENDING
      };

      const compensationKey = 'undo_commitment:' + commitment.id;
      const event = {
        type: 'CommitmentUndone',
        commitmentId: commitment.id,
        previousCheckIn: checkIn,
        compensationRewardKey: compensationKey,
        occurredAt: new Date(undoAtMs).toISOString()
      };

      return {
        commitment: updated,
        checkIn: checkIn,
        compensationRewardKey: compensationKey,
        events: [event]
      };
    }
  }

  const defaultCommitmentStateMachine = new CommitmentStateMachine();

  return {
    COMMITMENT_STATES,
    CommitmentStateMachine,
    commitmentStateMachine: defaultCommitmentStateMachine,
    calculateLateMinutes,
    normalizeState
  };
});
