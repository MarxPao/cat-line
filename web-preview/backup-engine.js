/**
 * web-preview/backup-engine.js
 * Motor puro de Exportação, Importação e Backup com Schema v2 (Cat Line v3.2.0 · Prompt 13)
 *
 * Princípios:
 * - 100% offline e local (sem rede).
 * - Schema v2 com suporte a metas, passos, compromissos, check-ins, rewardEvents, dayClosures e weeklyLogs.
 * - Idempotência estrita: mesclagem por id, rewardEvents deduplicados por idempotencyKey e weeklyLogs por weekStartLogicalDay.
 * - Confirmação prévia obrigatória com resumo claro antes de mesclar.
 * - Zero punição e preservação total de dados.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineBackupEngine = factory();
    root.backupEngine = root.CatLineBackupEngine.backupEngine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 2;
  const APP_VERSION = '3.2.0';

  class BackupEngine {
    constructor(options = {}) {
      this.clock = options.clock || (typeof Clock !== 'undefined' ? Clock : null);
    }

    /**
     * Gera o payload completo do backup com schemaVersion: 2
     */
    createExportPayload(state = {}) {
      const nowIso = (this.clock && typeof this.clock.isoString === 'function')
        ? this.clock.isoString()
        : new Date().toISOString();

      const goals = (state.goals || []).map(g => ({
        id: g.id,
        title: g.title,
        horizon: g.horizon || 'SEMANA',
        yarnColorId: g.yarnColorId || 'yarn-mint',
        targetDate: g.targetDate || null,
        archived: Boolean(g.archived),
        reward: g.reward || null,
        rewardCost: g.rewardCost || 0,
        progress: typeof g.progress === 'number' ? g.progress : 0,
        totalDays: g.totalDays || 7,
        remainingSeconds: typeof g.remainingSeconds === 'number' ? g.remainingSeconds : 0,
        steps: Array.isArray(g.steps) ? g.steps.map(s => ({
          id: s.id,
          goalId: s.goalId || g.id,
          title: s.title,
          order: typeof s.order === 'number' ? s.order : 1,
          estMinutes: s.estMinutes || null,
          targetDate: s.targetDate || null,
          doneAt: s.doneAt || null,
          archived: Boolean(s.archived)
        })) : [],
        createdAt: g.createdAt || nowIso
      }));

      const occurrences = (state.occurrences || []).map(o => ({
        id: o.id,
        title: o.title,
        plannedStart: o.plannedStart || (o.date ? `${o.date}T${o.time || '12:00'}:00` : nowIso.substring(0, 19)),
        plannedZone: o.plannedZone || 'America/Sao_Paulo',
        plannedMinutes: o.plannedMinutes || 30,
        category: o.category || 'OUTROS',
        recurrenceRule: o.recurrenceRule || o.recurrence || 'Todos os dias',
        goalId: o.goalId || null,
        stepId: o.stepId || null,
        state: o.state || 'pending',
        rescheduledFromId: o.rescheduledFromId || null,
        date: o.date || (o.plannedStart ? o.plannedStart.substring(0, 10) : '2026-10-25'),
        time: o.time || (o.plannedStart ? o.plannedStart.substring(11, 16) : '12:00'),
        effort: o.effort || 'M',
        reward: typeof o.reward === 'number' ? o.reward : 10,
        delayMin: typeof o.delayMin === 'number' ? o.delayMin : 0,
        createdAt: o.createdAt || nowIso
      }));

      const checkIns = (state.checkIns || []).map(ci => ({
        id: ci.id,
        commitmentId: ci.commitmentId,
        actualAt: ci.actualAt,
        retroactive: Boolean(ci.retroactive),
        lateMinutes: typeof ci.lateMinutes === 'number' ? ci.lateMinutes : 0
      }));

      const rewardEvents = (state.rewardEvents || []).map(re => ({
        id: re.id,
        idempotencyKey: re.idempotencyKey,
        kind: re.kind,
        fishDelta: typeof re.fishDelta === 'number' ? re.fishDelta : 0,
        bondDelta: typeof re.bondDelta === 'number' ? re.bondDelta : 0,
        refId: re.refId || null,
        at: re.at || nowIso,
        logicalDay: re.logicalDay || (state.dayKey || nowIso.substring(0, 10))
      }));

      const dayClosures = (state.dayClosures || []).map(dc => ({
        logicalDay: dc.logicalDay,
        closedAt: dc.closedAt || nowIso
      }));

      const weeklyLogs = (state.weeklyLogs || []).map(wl => ({
        weekStartLogicalDay: wl.weekStartLogicalDay,
        snapshotJson: typeof wl.snapshotJson === 'string' ? wl.snapshotJson : JSON.stringify(wl.snapshotJson || {}),
        configVersion: typeof wl.configVersion === 'number' ? wl.configVersion : 1,
        createdAt: wl.createdAt || nowIso
      }));

      return {
        appName: 'Cat Line',
        version: APP_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: nowIso,
        dayKey: state.dayKey || '2026-10-25',
        currencies: {
          peixinhos: (state.currencies && typeof state.currencies.peixinhos === 'number') ? state.currencies.peixinhos : 100,
          novelosDourados: (state.currencies && typeof state.currencies.novelosDourados === 'number') ? state.currencies.novelosDourados : 1,
          vinculo: (state.currencies && typeof state.currencies.vinculo === 'number') ? state.currencies.vinculo : 10
        },
        cat: state.cat || {},
        selectedGoalId: state.selectedGoalId || null,
        goals,
        occurrences,
        checkIns,
        rewardEvents,
        dayClosures,
        weeklyLogs,
        habits: state.habits || [],
        briefing: state.briefing || {},
        blockRules: state.blockRules || [],
        realLifeRewards: state.realLifeRewards || [],
        flags: state.flags || {},
        overcomingTargetMin: typeof state.overcomingTargetMin === 'number' ? state.overcomingTargetMin : 10,
        analyticsData: state.analyticsData || {},
        telemetryCounts: {
          goalsCount: goals.length,
          stepsCount: goals.reduce((acc, g) => acc + (g.steps ? g.steps.length : 0), 0),
          commitmentsCount: occurrences.length,
          checkInsCount: checkIns.length,
          rewardEventsCount: rewardEvents.length,
          dayClosuresCount: dayClosures.length,
          weeklyLogsCount: weeklyLogs.length
        }
      };
    }

    /**
     * Valida e prepara o arquivo de backup para importação
     */
    validateBackup(rawJsonOrObj) {
      let data = rawJsonOrObj;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (err) {
          return { valid: false, error: 'Arquivo JSON inválido ou corrompido' };
        }
      }

      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Conteúdo de backup inválido' };
      }

      // Se for schema v1 ou legado, migra com migrationEngine se disponível ou fallback
      if (!data.schemaVersion || data.schemaVersion < SCHEMA_VERSION) {
        if (typeof CatLineMigrationV1ToV2 !== 'undefined' && CatLineMigrationV1ToV2.migrationEngine) {
          data = CatLineMigrationV1ToV2.migrationEngine.migrateV310ToV320(data);
        } else if (typeof migrationEngine !== 'undefined' && typeof migrationEngine.migrateV310ToV320 === 'function') {
          data = migrationEngine.migrateV310ToV320(data);
        } else if (typeof globalThis !== 'undefined' && globalThis.migrationEngine && typeof globalThis.migrationEngine.migrateV310ToV320 === 'function') {
          data = globalThis.migrationEngine.migrateV310ToV320(data);
        } else {
          // Normalizador autônomo de schema v1 -> v2
          if (Array.isArray(data.goals)) {
            data.goals = data.goals.map(g => ({
              ...g,
              steps: Array.isArray(g.steps) ? g.steps : []
            }));
          }
          if (Array.isArray(data.occurrences)) {
            data.occurrences = data.occurrences.map(o => ({
              ...o,
              state: (o.state === 'FEITO' || o.state === 'done') ? 'done' : (o.state || 'pending'),
              plannedStart: o.plannedStart || `${o.date || '2026-10-25'}T${o.time || '12:00'}:00`
            }));
          }
        }
        data.schemaVersion = SCHEMA_VERSION;
      }

      const goals = Array.isArray(data.goals) ? data.goals : [];
      let stepsCount = 0;
      goals.forEach(g => {
        if (Array.isArray(g.steps)) stepsCount += g.steps.length;
      });

      const commitments = Array.isArray(data.occurrences) ? data.occurrences : [];
      const checkIns = Array.isArray(data.checkIns) ? data.checkIns : [];
      const rewardEvents = Array.isArray(data.rewardEvents) ? data.rewardEvents : [];
      const dayClosures = Array.isArray(data.dayClosures) ? data.dayClosures : [];
      const weeklyLogs = Array.isArray(data.weeklyLogs) ? data.weeklyLogs : [];
      const habits = Array.isArray(data.habits) ? data.habits : [];

      const summary = {
        exportedAt: data.exportedAt || null,
        schemaVersion: data.schemaVersion || SCHEMA_VERSION,
        goalsCount: goals.length,
        stepsCount,
        commitmentsCount: commitments.length,
        checkInsCount: checkIns.length,
        rewardEventsCount: rewardEvents.length,
        dayClosuresCount: dayClosures.length,
        weeklyLogsCount: weeklyLogs.length,
        habitsCount: habits.length
      };

      return {
        valid: true,
        data,
        summary
      };
    }

    /**
     * Mensagem amigável de confirmação antes de importar
     */
    getConfirmationPrompt(summary) {
      const parts = [];
      if (summary.goalsCount > 0) parts.push(`• ${summary.goalsCount} metas (${summary.stepsCount} passos)`);
      if (summary.commitmentsCount > 0) parts.push(`• ${summary.commitmentsCount} compromissos`);
      if (summary.habitsCount > 0) parts.push(`• ${summary.habitsCount} hábitos`);
      if (summary.rewardEventsCount > 0) parts.push(`• ${summary.rewardEventsCount} eventos de recompensa`);
      if (summary.weeklyLogsCount > 0) parts.push(`• ${summary.weeklyLogsCount} logs semanais`);

      const listStr = parts.length > 0 ? parts.join('\n') : '• Dados gerais da gatinha e rotina';

      return `Deseja importar este backup do Cat Line?\n\nItens a mesclar:\n${listStr}\n\nNenhum dado atual será perdido. Os novos registros serão reunidos com carinho.`;
    }

    /**
     * Mescla o backup no estado atual com garantia estrita de idempotência
     */
    mergeBackup(currentState = {}, backupData = {}) {
      const merged = {
        ...currentState,
        goals: Array.isArray(currentState.goals) ? [...currentState.goals] : [],
        occurrences: Array.isArray(currentState.occurrences) ? [...currentState.occurrences] : [],
        checkIns: Array.isArray(currentState.checkIns) ? [...currentState.checkIns] : [],
        rewardEvents: Array.isArray(currentState.rewardEvents) ? [...currentState.rewardEvents] : [],
        dayClosures: Array.isArray(currentState.dayClosures) ? [...currentState.dayClosures] : [],
        weeklyLogs: Array.isArray(currentState.weeklyLogs) ? [...currentState.weeklyLogs] : [],
        habits: Array.isArray(currentState.habits) ? [...currentState.habits] : [],
        realLifeRewards: Array.isArray(currentState.realLifeRewards) ? [...currentState.realLifeRewards] : []
      };

      // 1. Metas e Passos
      if (!Array.isArray(merged.goals)) merged.goals = [];
      const incomingGoals = Array.isArray(backupData.goals) ? backupData.goals : [];
      incomingGoals.forEach(inGoal => {
        const existingIdx = merged.goals.findIndex(g => g.id === inGoal.id);
        if (existingIdx < 0) {
          merged.goals.push(JSON.parse(JSON.stringify(inGoal)));
        } else {
          // Mescla passos da meta por id
          const existingGoal = merged.goals[existingIdx];
          if (!Array.isArray(existingGoal.steps)) existingGoal.steps = [];
          const inSteps = Array.isArray(inGoal.steps) ? inGoal.steps : [];
          inSteps.forEach(inStep => {
            const stepIdx = existingGoal.steps.findIndex(s => s.id === inStep.id);
            if (stepIdx < 0) {
              existingGoal.steps.push(JSON.parse(JSON.stringify(inStep)));
            } else {
              // Mantém conclusão se já feita em qualquer um dos dois
              if (inStep.doneAt && !existingGoal.steps[stepIdx].doneAt) {
                existingGoal.steps[stepIdx].doneAt = inStep.doneAt;
              }
            }
          });
        }
      });

      // 2. Ocorrências / Compromissos
      if (!Array.isArray(merged.occurrences)) merged.occurrences = [];
      const incomingOccs = Array.isArray(backupData.occurrences) ? backupData.occurrences : [];
      incomingOccs.forEach(inOcc => {
        const existingIdx = merged.occurrences.findIndex(o => o.id === inOcc.id);
        if (existingIdx < 0) {
          merged.occurrences.push(JSON.parse(JSON.stringify(inOcc)));
        } else {
          // Atualiza estado se o backup tiver estado mais avançado
          const existing = merged.occurrences[existingIdx];
          if ((inOcc.state === 'done' || inOcc.state === 'FEITO') && existing.state !== 'done' && existing.state !== 'FEITO') {
            merged.occurrences[existingIdx] = { ...existing, ...inOcc };
          }
        }
      });

      // 3. Check-ins
      if (!Array.isArray(merged.checkIns)) merged.checkIns = [];
      const incomingCheckIns = Array.isArray(backupData.checkIns) ? backupData.checkIns : [];
      incomingCheckIns.forEach(inChk => {
        const exists = merged.checkIns.some(c => c.id === inChk.id || (c.commitmentId === inChk.commitmentId && c.actualAt === inChk.actualAt));
        if (!exists) {
          merged.checkIns.push(JSON.parse(JSON.stringify(inChk)));
        }
      });

      // 4. RewardEvents (IDEMPOTÊNCIA ESTRITA por idempotencyKey)
      if (!Array.isArray(merged.rewardEvents)) merged.rewardEvents = [];
      const incomingRewards = Array.isArray(backupData.rewardEvents) ? backupData.rewardEvents : [];
      incomingRewards.forEach(inRew => {
        const exists = merged.rewardEvents.some(r => r.idempotencyKey === inRew.idempotencyKey);
        if (!exists) {
          merged.rewardEvents.push(JSON.parse(JSON.stringify(inRew)));
        }
      });

      // 5. DayClosures (Deduplicação por logicalDay)
      if (!Array.isArray(merged.dayClosures)) merged.dayClosures = [];
      const incomingClosures = Array.isArray(backupData.dayClosures) ? backupData.dayClosures : [];
      incomingClosures.forEach(inClosure => {
        const exists = merged.dayClosures.some(dc => dc.logicalDay === inClosure.logicalDay);
        if (!exists) {
          merged.dayClosures.push(JSON.parse(JSON.stringify(inClosure)));
        }
      });

      // 6. WeeklyLogs (IMUTABILIDADE ESTRITA por weekStartLogicalDay)
      if (!Array.isArray(merged.weeklyLogs)) merged.weeklyLogs = [];
      const incomingLogs = Array.isArray(backupData.weeklyLogs) ? backupData.weeklyLogs : [];
      incomingLogs.forEach(inLog => {
        const exists = merged.weeklyLogs.some(wl => wl.weekStartLogicalDay === inLog.weekStartLogicalDay);
        if (!exists) {
          // Log novo: inclui
          merged.weeklyLogs.push(JSON.parse(JSON.stringify(inLog)));
        }
        // Se já existe, NÃO altera snapshotJson para preservar a imutabilidade histórica!
      });

      // 7. Hábitos
      if (!Array.isArray(merged.habits)) merged.habits = [];
      const incomingHabits = Array.isArray(backupData.habits) ? backupData.habits : [];
      incomingHabits.forEach(inHabit => {
        const existingIdx = merged.habits.findIndex(h => h.id === inHabit.id);
        if (existingIdx < 0) {
          merged.habits.push(JSON.parse(JSON.stringify(inHabit)));
        }
      });

      // 8. Economia / Moedas (Preservação do maior saldo)
      if (!merged.currencies) merged.currencies = { peixinhos: 0, novelosDourados: 0, vinculo: 0 };
      if (backupData.currencies) {
        merged.currencies.peixinhos = Math.max(merged.currencies.peixinhos || 0, backupData.currencies.peixinhos || 0);
        merged.currencies.novelosDourados = Math.max(merged.currencies.novelosDourados || 0, backupData.currencies.novelosDourados || 0);
        merged.currencies.vinculo = Math.max(merged.currencies.vinculo || 0, backupData.currencies.vinculo || 0);
      }

      // 9. Mimos Reais
      if (!Array.isArray(merged.realLifeRewards)) merged.realLifeRewards = [];
      const incomingMimos = Array.isArray(backupData.realLifeRewards) ? backupData.realLifeRewards : [];
      incomingMimos.forEach(inMimo => {
        const exists = merged.realLifeRewards.some(m => m.id === inMimo.id);
        if (!exists) {
          merged.realLifeRewards.push(JSON.parse(JSON.stringify(inMimo)));
        }
      });

      // 10. Atualiza schemaVersion
      merged.schemaVersion = SCHEMA_VERSION;
      delete merged.moduleFlags;

      return merged;
    }
  }

  const backupEngineInstance = new BackupEngine();

  return {
    SCHEMA_VERSION,
    APP_VERSION,
    BackupEngine,
    backupEngine: backupEngineInstance
  };
});
