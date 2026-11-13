/**
 * web-preview/reward-ledger-engine.js
 * Livro-Razão de Recompensas e Anti-Farm (v3.2.0 · Prompt 6)
 *
 * Princípios:
 * - Sem punição: saldo total nunca fica negativo.
 * - Idempotência estrita: cada chave única só concede recompensas uma vez.
 * - Tetos diários lidos de config.caps (peixinhos e minutos de rede social).
 * - Bloqueio de micro-tarefas (< 5 min).
 * - Multiplicador retroativo (retroactiveMultiplier = 0.5).
 * - Resposta carinhosa da gatinha ao atingir tetos.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineRewardLedgerEngine = factory();
    root.rewardLedgerEngine = root.CatLineRewardLedgerEngine.rewardLedgerEngine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KIND_COMMITMENT_DONE = 'commitment_done';
  const KIND_ON_TIME_BONUS = 'on_time_bonus';
  const KIND_STEP_DONE = 'step_done';
  const KIND_GOAL_DONE = 'goal_done';
  const KIND_DAY_CLOSURE = 'day_closure';
  const KIND_SOCIAL_MINUTES = 'social_minutes';
  const KIND_COMPENSATION = 'compensation';

  const GENTLE_CAP_MESSAGE = 'Hoje já juntamos bastante! A gatinha está radiante e cheia de carinho com você.';

  function calculateBalance(events = [], logicalDay = '') {
    let totalFish = 0;
    let totalBond = 0;
    let totalSocialToday = 0;
    let fishToday = 0;

    events.forEach(e => {
      if (e.kind === KIND_SOCIAL_MINUTES) {
        if (e.logicalDay === logicalDay) {
          totalSocialToday += Number(e.fishDelta || 0);
        }
      } else {
        totalFish += Number(e.fishDelta || 0);
        totalBond += Number(e.bondDelta || 0);
        if (e.logicalDay === logicalDay && e.fishDelta > 0) {
          fishToday += Number(e.fishDelta);
        }
      }
    });

    return {
      totalFish: Math.max(0, totalFish),
      totalBond: Math.max(0, totalBond),
      totalSocialMinutesToday: Math.max(0, totalSocialToday),
      fishEarnedToday: fishToday
    };
  }

  class RewardLedgerEngine {
    constructor(options = {}) {
      this.clock = options.clock || null;
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

    calculateBalance(events, logicalDay) {
      return calculateBalance(events, logicalDay);
    }

    /**
     * Emite recompensas por compromisso concluído
     */
    awardCommitmentDone(commitment, checkIn, existingEvents = [], config = {}, logicalDay = '') {
      const caps = (config && config.caps) || {};
      const rewards = (config && config.rewards) || {};
      const punctuality = (config && config.punctuality) || {};

      const maxFishToday = typeof caps.fishPerLogicalDay === 'number' ? caps.fishPerLogicalDay : 15;
      const maxSocialToday = typeof caps.socialMinutesEarnedPerDay === 'number' ? caps.socialMinutesEarnedPerDay : 30;
      const minMinutes = typeof caps.minCommitmentMinutesToReward === 'number' ? caps.minCommitmentMinutesToReward : 5;
      const tolerance = typeof punctuality.toleranceMinutes === 'number' ? punctuality.toleranceMinutes : 10;

      const existingKeys = new Set(existingEvents.map(e => e.idempotencyKey));
      const balance = calculateBalance(existingEvents, logicalDay);

      const newEvents = [];
      let fishToGrant = 0;
      let socialToGrant = 0;
      let fishCapReached = false;
      let socialCapReached = false;

      const plannedMin = typeof commitment.plannedMinutes === 'number' ? commitment.plannedMinutes : null;
      const isMicroTask = plannedMin !== null && plannedMin < minMinutes;

      // 1. Recompensa base
      const baseDoneKey = `${KIND_COMMITMENT_DONE}:${commitment.id}`;
      if (!existingKeys.has(baseDoneKey) && !isMicroTask) {
        const baseFishConfig = (rewards.commitmentDone && rewards.commitmentDone.fish) || 2;
        let computedFish = baseFishConfig;

        if (checkIn && checkIn.retroactive) {
          const mult = typeof rewards.retroactiveMultiplier === 'number' ? rewards.retroactiveMultiplier : 0.5;
          computedFish = Math.max(1, Math.floor(baseFishConfig * mult));
        }

        const currentFishToday = balance.fishEarnedToday + fishToGrant;
        const remainingCap = Math.max(0, maxFishToday - currentFishToday);
        const allowedFish = Math.min(computedFish, remainingCap);

        if (allowedFish < computedFish) {
          fishCapReached = true;
        }

        if (allowedFish > 0) {
          fishToGrant += allowedFish;
          newEvents.push({
            id: `rew_${commitment.id}_done`,
            idempotencyKey: baseDoneKey,
            kind: KIND_COMMITMENT_DONE,
            fishDelta: allowedFish,
            bondDelta: 0,
            refId: String(commitment.id),
            at: this.nowIso(),
            logicalDay: logicalDay
          });
        }
      }

      // 2. Bônus de pontualidade
      const onTimeKey = `${KIND_ON_TIME_BONUS}:${commitment.id}`;
      const isPunctual = checkIn && typeof checkIn.lateMinutes === 'number' && checkIn.lateMinutes <= tolerance;

      if (!existingKeys.has(onTimeKey) && isPunctual && !isMicroTask) {
        const bonusConfig = (rewards.onTimeBonus && rewards.onTimeBonus.fish) || 1;
        const currentFishToday = balance.fishEarnedToday + fishToGrant;
        const remainingCap = Math.max(0, maxFishToday - currentFishToday);
        const allowedBonus = Math.min(bonusConfig, remainingCap);

        if (allowedBonus < bonusConfig) {
          fishCapReached = true;
        }

        if (allowedBonus > 0) {
          fishToGrant += allowedBonus;
          newEvents.push({
            id: `rew_${commitment.id}_ontime`,
            idempotencyKey: onTimeKey,
            kind: KIND_ON_TIME_BONUS,
            fishDelta: allowedBonus,
            bondDelta: 0,
            refId: String(commitment.id),
            at: this.nowIso(),
            logicalDay: logicalDay
          });
        }
      }

      // 3. Minutos de rede social (+5 min por tarefa)
      const socialKey = `social_min:${commitment.id}:${logicalDay}`;
      if (!existingKeys.has(socialKey)) {
        const baseSocial = 5;
        const currentSocialToday = balance.totalSocialMinutesToday;
        const remainingSocialCap = Math.max(0, maxSocialToday - currentSocialToday);
        const allowedSocial = Math.min(baseSocial, remainingSocialCap);

        if (allowedSocial < baseSocial) {
          socialCapReached = true;
        }

        if (allowedSocial > 0) {
          socialToGrant += allowedSocial;
          newEvents.push({
            id: `rew_${commitment.id}_soc`,
            idempotencyKey: socialKey,
            kind: KIND_SOCIAL_MINUTES,
            fishDelta: allowedSocial,
            bondDelta: 0,
            refId: String(commitment.id),
            at: this.nowIso(),
            logicalDay: logicalDay
          });
        }
      }

      const gentleMsg = (fishCapReached || socialCapReached) ? GENTLE_CAP_MESSAGE : null;

      return {
        events: newEvents,
        fishGranted: fishToGrant,
        bondGranted: 0,
        socialMinutesGranted: socialToGrant,
        fishCapReached,
        socialMinutesCapReached: socialCapReached,
        gentleMessage: gentleMsg
      };
    }

    /**
     * Emite recompensa por passo de meta concluído (apenas uma vez na vida do passo)
     */
    awardStepDone(step, existingEvents = [], config = {}, logicalDay = '') {
      const stepKey = `${KIND_STEP_DONE}:${step.id}`;
      const existingKeys = new Set(existingEvents.map(e => e.idempotencyKey));

      if (existingKeys.has(stepKey)) {
        return {
          events: [],
          fishGranted: 0,
          bondGranted: 0,
          socialMinutesGranted: 0,
          fishCapReached: false,
          gentleMessage: null
        };
      }

      const caps = (config && config.caps) || {};
      const rewards = (config && config.rewards) || {};
      const maxFishToday = typeof caps.fishPerLogicalDay === 'number' ? caps.fishPerLogicalDay : 15;
      const baseFish = (rewards.stepDone && rewards.stepDone.fish) || 3;

      const balance = calculateBalance(existingEvents, logicalDay);
      const remainingCap = Math.max(0, maxFishToday - balance.fishEarnedToday);
      const allowedFish = Math.min(baseFish, remainingCap);
      const capReached = allowedFish < baseFish;

      const event = {
        id: `rew_step_${step.id}`,
        idempotencyKey: stepKey,
        kind: KIND_STEP_DONE,
        fishDelta: allowedFish,
        bondDelta: 0,
        refId: String(step.id),
        at: this.nowIso(),
        logicalDay: logicalDay
      };

      return {
        events: [event],
        fishGranted: allowedFish,
        bondGranted: 0,
        socialMinutesGranted: 0,
        fishCapReached: capReached,
        gentleMessage: capReached ? GENTLE_CAP_MESSAGE : null
      };
    }

    /**
     * Emite recompensas por meta inteira concluída
     */
    awardGoalDone(goal, existingEvents = [], config = {}, logicalDay = '') {
      const goalKey = `${KIND_GOAL_DONE}:${goal.id}`;
      const existingKeys = new Set(existingEvents.map(e => e.idempotencyKey));

      if (existingKeys.has(goalKey)) {
        return {
          events: [],
          fishGranted: 0,
          bondGranted: 0,
          socialMinutesGranted: 0,
          fishCapReached: false,
          gentleMessage: null
        };
      }

      const caps = (config && config.caps) || {};
      const rewards = (config && config.rewards) || {};
      const maxFishToday = typeof caps.fishPerLogicalDay === 'number' ? caps.fishPerLogicalDay : 15;

      const baseFish = (rewards.goalDone && rewards.goalDone.fish) || 20;
      const baseBond = (rewards.goalDone && rewards.goalDone.bond) || 5;

      const balance = calculateBalance(existingEvents, logicalDay);
      const remainingCap = Math.max(0, maxFishToday - balance.fishEarnedToday);
      const allowedFish = Math.min(baseFish, remainingCap);
      const capReached = allowedFish < baseFish;

      const event = {
        id: `rew_goal_${goal.id}`,
        idempotencyKey: goalKey,
        kind: KIND_GOAL_DONE,
        fishDelta: allowedFish,
        bondDelta: baseBond,
        refId: String(goal.id),
        at: this.nowIso(),
        logicalDay: logicalDay
      };

      return {
        events: [event],
        fishGranted: allowedFish,
        bondGranted: baseBond,
        socialMinutesGranted: 0,
        fishCapReached: capReached,
        gentleMessage: capReached ? GENTLE_CAP_MESSAGE : null
      };
    }

    /**
     * Emite recompensa pelo fechamento do dia (idempotente por dia lógico)
     */
    awardDayClosure(logicalDay, existingEvents = [], config = {}) {
      const closureKey = `${KIND_DAY_CLOSURE}:${logicalDay}`;
      const existingKeys = new Set(existingEvents.map(e => e.idempotencyKey));

      if (existingKeys.has(closureKey)) {
        return {
          events: [],
          fishGranted: 0,
          bondGranted: 0,
          socialMinutesGranted: 0,
          fishCapReached: false
        };
      }

      const rewards = (config && config.rewards) || {};
      const baseBond = (rewards.dayClosure && rewards.dayClosure.bond) || 1;

      const event = {
        id: `rew_close_${logicalDay}`,
        idempotencyKey: closureKey,
        kind: KIND_DAY_CLOSURE,
        fishDelta: 0,
        bondDelta: baseBond,
        refId: String(logicalDay),
        at: this.nowIso(),
        logicalDay: logicalDay
      };

      return {
        events: [event],
        fishGranted: 0,
        bondGranted: baseBond,
        socialMinutesGranted: 0,
        fishCapReached: false
      };
    }

    /**
     * Emite compensações por reversão de check-in (desfazer)
     */
    compensateCommitmentUndo(commitmentId, existingEvents = [], logicalDay = '') {
      const related = existingEvents.filter(e => {
        return String(e.refId) === String(commitmentId) &&
          (e.kind === KIND_COMMITMENT_DONE || e.kind === KIND_ON_TIME_BONUS || e.kind === KIND_SOCIAL_MINUTES);
      });

      const existingKeys = new Set(existingEvents.map(e => e.idempotencyKey));
      const compensationEvents = [];
      let fishDeducted = 0;
      let bondDeducted = 0;
      let socialDeducted = 0;

      related.forEach(orig => {
        const undoKey = `undo:${orig.idempotencyKey}`;
        if (!existingKeys.has(undoKey)) {
          const compEvent = {
            id: `rew_comp_${orig.id}`,
            idempotencyKey: undoKey,
            kind: orig.kind,
            fishDelta: -orig.fishDelta,
            bondDelta: -orig.bondDelta,
            refId: String(orig.refId),
            at: this.nowIso(),
            logicalDay: logicalDay
          };
          compensationEvents.push(compEvent);
          if (orig.kind === KIND_SOCIAL_MINUTES) {
            socialDeducted += orig.fishDelta;
          } else {
            fishDeducted += orig.fishDelta;
            bondDeducted += orig.bondDelta;
          }
        }
      });

      return {
        events: compensationEvents,
        fishGranted: -fishDeducted,
        bondGranted: -bondDeducted,
        socialMinutesGranted: -socialDeducted
      };
    }
  }

  const defaultRewardLedgerEngine = new RewardLedgerEngine();

  return {
    KIND_COMMITMENT_DONE,
    KIND_ON_TIME_BONUS,
    KIND_STEP_DONE,
    KIND_GOAL_DONE,
    KIND_DAY_CLOSURE,
    KIND_SOCIAL_MINUTES,
    KIND_COMPENSATION,
    GENTLE_CAP_MESSAGE,
    calculateBalance,
    RewardLedgerEngine,
    rewardLedgerEngine: defaultRewardLedgerEngine
  };
});
