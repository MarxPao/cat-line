// web-preview/commitments-config.js
// Carregador e validador de configurações declarativas versionadas do Cat Line (v3.2.0 · AD-10)
// Elimina números mágicos: tolerâncias, fechamento, livro-razão e tetos anti-farm vêm de JSON versionado.

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineCommitmentsConfig = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // Regra existente reutilizada como fonte única da verdade (sem duplicação de constantes)
  const SOCIAL_MINUTES_PER_TASK = 5;

  const DEFAULT_COMMITMENTS_CONFIG = Object.freeze({
    version: 1,
    dayBoundary: Object.freeze({
      logicalDayStartHour: 4
    }),
    punctuality: Object.freeze({
      toleranceMinutes: 10
    }),
    week: Object.freeze({
      closesOn: 'sunday'
    }),
    undoWindowMinutes: 10,
    rewards: Object.freeze({
      commitmentDone: Object.freeze({ fish: 2 }),
      onTimeBonus: Object.freeze({ fish: 1 }),
      stepDone: Object.freeze({ fish: 3 }),
      goalDone: Object.freeze({ fish: 20, bond: 5 }),
      dayClosure: Object.freeze({ bond: 1 }),
      retroactiveMultiplier: 0.5
    }),
    caps: Object.freeze({
      fishPerLogicalDay: 15,
      socialMinutesEarnedPerDay: 30,
      minCommitmentMinutesToReward: 5
    })
  });

  const VALID_WEEK_DAYS = new Set([
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ]);

  /**
   * Valida e normaliza um objeto de configuração com base nas regras estritas da v3.2.0.
   * Valores ausentes usam o padrão documentado. Valores inválidos ou negativos são rejeitados com erro claro.
   * @param {Object} raw
   * @returns {Object} Configuração normalizada e segura
   */
  function validateAndNormalize(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Configuração inválida: o objeto de configuração é obrigatório');
    }

    // 1. Versão
    const version = raw.version !== undefined ? Number(raw.version) : DEFAULT_COMMITMENTS_CONFIG.version;
    if (!Number.isInteger(version) || version <= 0) {
      throw new Error(`Configuração inválida: 'version' deve ser um inteiro positivo, recebido: ${raw.version}`);
    }

    // 2. DayBoundary
    const dayBoundaryRaw = raw.dayBoundary || {};
    const logicalDayStartHour = dayBoundaryRaw.logicalDayStartHour !== undefined
      ? Number(dayBoundaryRaw.logicalDayStartHour)
      : DEFAULT_COMMITMENTS_CONFIG.dayBoundary.logicalDayStartHour;

    if (!Number.isInteger(logicalDayStartHour) || logicalDayStartHour < 0 || logicalDayStartHour > 23) {
      throw new Error(`Configuração inválida: 'dayBoundary.logicalDayStartHour' deve estar entre 0 e 23, recebido: ${dayBoundaryRaw.logicalDayStartHour}`);
    }

    // 3. Punctuality
    const punctualityRaw = raw.punctuality || {};
    const toleranceMinutes = punctualityRaw.toleranceMinutes !== undefined
      ? Number(punctualityRaw.toleranceMinutes)
      : DEFAULT_COMMITMENTS_CONFIG.punctuality.toleranceMinutes;

    if (isNaN(toleranceMinutes) || toleranceMinutes < 0) {
      throw new Error(`Configuração inválida: 'punctuality.toleranceMinutes' não pode ser negativo, recebido: ${punctualityRaw.toleranceMinutes}`);
    }

    // 4. Week
    const weekRaw = raw.week || {};
    const closesOn = weekRaw.closesOn !== undefined
      ? String(weekRaw.closesOn).toLowerCase().trim()
      : DEFAULT_COMMITMENTS_CONFIG.week.closesOn;

    if (!VALID_WEEK_DAYS.has(closesOn)) {
      throw new Error(`Configuração inválida: 'week.closesOn' deve ser um dia da semana válido (ex: 'sunday'), recebido: ${weekRaw.closesOn}`);
    }

    // 5. UndoWindow
    const undoWindowMinutes = raw.undoWindowMinutes !== undefined
      ? Number(raw.undoWindowMinutes)
      : DEFAULT_COMMITMENTS_CONFIG.undoWindowMinutes;

    if (isNaN(undoWindowMinutes) || undoWindowMinutes < 0) {
      throw new Error(`Configuração inválida: 'undoWindowMinutes' não pode ser negativo, recebido: ${raw.undoWindowMinutes}`);
    }

    // 6. Rewards
    const rewardsRaw = raw.rewards || {};
    function validateRewardFishBond(entry, fieldName, defaultEntry) {
      const e = entry || {};
      const fish = e.fish !== undefined ? Number(e.fish) : (defaultEntry.fish || 0);
      const bond = e.bond !== undefined ? Number(e.bond) : (defaultEntry.bond || 0);
      if (isNaN(fish) || fish < 0) {
        throw new Error(`Configuração inválida: '${fieldName}.fish' não pode ser negativo, recebido: ${e.fish}`);
      }
      if (isNaN(bond) || bond < 0) {
        throw new Error(`Configuração inválida: '${fieldName}.bond' não pode ser negativo, recebido: ${e.bond}`);
      }
      const res = { fish };
      if (bond > 0 || defaultEntry.bond !== undefined) res.bond = bond;
      return Object.freeze(res);
    }

    const commitmentDone = validateRewardFishBond(
      rewardsRaw.commitmentDone, 'rewards.commitmentDone', DEFAULT_COMMITMENTS_CONFIG.rewards.commitmentDone
    );
    const onTimeBonus = validateRewardFishBond(
      rewardsRaw.onTimeBonus, 'rewards.onTimeBonus', DEFAULT_COMMITMENTS_CONFIG.rewards.onTimeBonus
    );
    const stepDone = validateRewardFishBond(
      rewardsRaw.stepDone, 'rewards.stepDone', DEFAULT_COMMITMENTS_CONFIG.rewards.stepDone
    );
    const goalDone = validateRewardFishBond(
      rewardsRaw.goalDone, 'rewards.goalDone', DEFAULT_COMMITMENTS_CONFIG.rewards.goalDone
    );
    const dayClosure = validateRewardFishBond(
      rewardsRaw.dayClosure, 'rewards.dayClosure', DEFAULT_COMMITMENTS_CONFIG.rewards.dayClosure
    );

    const retroactiveMultiplier = rewardsRaw.retroactiveMultiplier !== undefined
      ? Number(rewardsRaw.retroactiveMultiplier)
      : DEFAULT_COMMITMENTS_CONFIG.rewards.retroactiveMultiplier;

    if (isNaN(retroactiveMultiplier) || retroactiveMultiplier < 0 || retroactiveMultiplier > 1) {
      throw new Error(`Configuração inválida: 'rewards.retroactiveMultiplier' deve estar entre 0.0 e 1.0, recebido: ${rewardsRaw.retroactiveMultiplier}`);
    }

    // 7. Caps (anti-farm)
    const capsRaw = raw.caps || {};
    const fishPerLogicalDay = capsRaw.fishPerLogicalDay !== undefined
      ? Number(capsRaw.fishPerLogicalDay)
      : DEFAULT_COMMITMENTS_CONFIG.caps.fishPerLogicalDay;

    if (isNaN(fishPerLogicalDay) || fishPerLogicalDay < 0) {
      throw new Error(`Configuração inválida: 'caps.fishPerLogicalDay' não pode ser negativo, recebido: ${capsRaw.fishPerLogicalDay}`);
    }

    const socialMinutesEarnedPerDay = capsRaw.socialMinutesEarnedPerDay !== undefined
      ? Number(capsRaw.socialMinutesEarnedPerDay)
      : DEFAULT_COMMITMENTS_CONFIG.caps.socialMinutesEarnedPerDay;

    if (isNaN(socialMinutesEarnedPerDay) || socialMinutesEarnedPerDay < 0) {
      throw new Error(`Configuração inválida: 'caps.socialMinutesEarnedPerDay' não pode ser negativo, recebido: ${capsRaw.socialMinutesEarnedPerDay}`);
    }

    const minCommitmentMinutesToReward = capsRaw.minCommitmentMinutesToReward !== undefined
      ? Number(capsRaw.minCommitmentMinutesToReward)
      : DEFAULT_COMMITMENTS_CONFIG.caps.minCommitmentMinutesToReward;

    if (isNaN(minCommitmentMinutesToReward) || minCommitmentMinutesToReward < 0) {
      throw new Error(`Configuração inválida: 'caps.minCommitmentMinutesToReward' não pode ser negativo, recebido: ${capsRaw.minCommitmentMinutesToReward}`);
    }

    return Object.freeze({
      version,
      dayBoundary: Object.freeze({ logicalDayStartHour }),
      punctuality: Object.freeze({ toleranceMinutes }),
      week: Object.freeze({ closesOn }),
      undoWindowMinutes,
      rewards: Object.freeze({
        commitmentDone,
        onTimeBonus,
        stepDone,
        goalDone,
        dayClosure,
        retroactiveMultiplier
      }),
      caps: Object.freeze({
        fishPerLogicalDay,
        socialMinutesEarnedPerDay,
        minCommitmentMinutesToReward
      }),
      socialMinutesPerTask: SOCIAL_MINUTES_PER_TASK
    });
  }

  /**
   * Lê uma string JSON de configuração, faz parse e validação.
   * @param {string} rawJson
   * @returns {Object} Configuração normalizada
   */
  function loadFromJson(rawJson) {
    if (typeof rawJson !== 'string' || !rawJson.trim()) {
      throw new Error('Configuração inválida: string JSON vazia ou nula');
    }
    let parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch (e) {
      throw new Error('Configuração inválida: JSON malformado: ' + e.message);
    }
    return validateAndNormalize(parsed);
  }

  return {
    DEFAULT_CONFIG: DEFAULT_COMMITMENTS_CONFIG,
    SOCIAL_MINUTES_PER_TASK,
    validateAndNormalize,
    loadFromJson
  };
}));
