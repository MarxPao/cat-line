// web-preview/goal-step-engine.js
// Motor de Domínio de Metas e Passos (v3.2.0 · Prompt 3 · AD-05 e AD-11)
// Funções puras e determinísticas para gerenciamento de metas, passos editáveis e cálculo de progresso.

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineGoalStepEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  function getClock(clockOverride) {
    if (clockOverride && typeof clockOverride.now === 'function') return clockOverride;
    if (typeof CatLineClock !== 'undefined') return CatLineClock;
    if (typeof Clock !== 'undefined') return Clock;
    return {
      now: () => Date.now(),
      isoString: () => new Date().toISOString()
    };
  }

  const goalStepEngine = {
    /**
     * Verifica se o módulo de metas está ativo conforme Feature Flags (AD-11).
     */
    isModuleActive(st) {
      if (!st || !st.flags) return true;
      return st.flags.METAS !== false && st.flags.metas !== false;
    },

    /**
     * Calcula o progresso de uma meta:
     * - Se não tiver passos: mantém o progresso legado existente da meta.
     * - Se todos os passos ativos tiverem estMinutes positivo: calcula média ponderada por minutos.
     * - Caso contrário: calcula passos concluídos ÷ passos ativos.
     * @param {Object} goal
     * @returns {number} Progresso entre 0.0 e 1.0 (arredondado a 2 casas)
     */
    calculateProgress(goal) {
      if (!goal) return 0;
      const steps = Array.isArray(goal.steps) ? goal.steps : [];
      const activeSteps = steps.filter(s => !s.archived);

      if (activeSteps.length === 0) {
        return Number.isFinite(goal.progress) ? Math.min(1, Math.max(0, goal.progress)) : 0;
      }

      const allHaveEst = activeSteps.every(s => Number.isFinite(s.estMinutes) && s.estMinutes > 0);
      let ratio = 0;

      if (allHaveEst) {
        const totalEst = activeSteps.reduce((acc, s) => acc + s.estMinutes, 0);
        const doneEst = activeSteps
          .filter(s => Boolean(s.doneAt))
          .reduce((acc, s) => acc + s.estMinutes, 0);
        ratio = totalEst > 0 ? (doneEst / totalEst) : 0;
      } else {
        const doneCount = activeSteps.filter(s => Boolean(s.doneAt)).length;
        ratio = doneCount / activeSteps.length;
      }

      return Math.round(Math.min(1, Math.max(0, ratio)) * 100) / 100;
    },

    /**
     * Cria uma nova meta pura.
     */
    createGoal(st, props, clockOverride) {
      if (!this.isModuleActive(st)) return null;
      const clk = getClock(clockOverride);
      const id = props.id || ('g-' + clk.now() + '-' + Math.random().toString(36).substr(2, 4));
      const goal = {
        id,
        title: props.title || 'Nova Meta',
        horizon: props.horizon || 'SEMANA',
        yarnColor: props.yarnColor || props.yarnColorId || 'pink',
        yarnColorId: props.yarnColorId || props.yarnColor || 'pink',
        targetDate: props.targetDate || null,
        archived: false,
        createdAt: clk.isoString(),
        steps: [],
        progress: 0,
        reward: props.reward || null,
        rewardCost: props.rewardCost || 0
      };
      if (st && Array.isArray(st.goals)) {
        st.goals.push(goal);
      }
      return goal;
    },

    /**
     * Edita metadados de uma meta existente.
     */
    editGoal(goal, updates) {
      if (!goal || !updates) return goal;
      if (updates.title !== undefined) goal.title = updates.title;
      if (updates.horizon !== undefined) goal.horizon = updates.horizon;
      if (updates.yarnColor !== undefined) {
        goal.yarnColor = updates.yarnColor;
        goal.yarnColorId = updates.yarnColor;
      }
      if (updates.targetDate !== undefined) goal.targetDate = updates.targetDate;
      return goal;
    },

    /**
     * Arquiva uma meta.
     */
    archiveGoal(goal) {
      if (!goal) return goal;
      goal.archived = true;
      return goal;
    },

    /**
     * Apaga uma meta desvinculando compromissos sem apagá-los (Caso de borda 2).
     */
    deleteGoal(st, goalId) {
      if (!st) return { unlinkedCount: 0 };
      if (Array.isArray(st.goals)) {
        st.goals = st.goals.filter(g => g.id !== goalId);
      }

      let unlinkedCount = 0;
      if (Array.isArray(st.occurrences)) {
        st.occurrences.forEach(o => {
          if (o.goalId === goalId) {
            o.goalId = null;
            o.stepId = null;
            unlinkedCount++;
          }
        });
      }

      return { goalId, unlinkedCount };
    },

    /**
     * Adiciona um novo passo a uma meta.
     */
    addStep(goal, stepProps) {
      if (!goal) return null;
      if (!Array.isArray(goal.steps)) goal.steps = [];

      const nextOrder = goal.steps.length === 0 ? 0 : Math.max(...goal.steps.map(s => s.order || 0)) + 1;
      const stepId = stepProps.id || ('step-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));

      const step = {
        id: stepId,
        goalId: goal.id,
        title: stepProps.title || 'Novo Passo',
        order: nextOrder,
        estMinutes: Number.isFinite(stepProps.estMinutes) ? stepProps.estMinutes : null,
        targetDate: stepProps.targetDate || null,
        doneAt: null,
        archived: false
      };

      goal.steps.push(step);
      // Recalcula progresso automaticamente ao adicionar passos (Regra 3)
      goal.progress = this.calculateProgress(goal);
      return step;
    },

    /**
     * Renomeia um passo existente.
     */
    renameStep(goal, stepId, newTitle) {
      if (!goal || !Array.isArray(goal.steps)) return null;
      const step = goal.steps.find(s => s.id === stepId);
      if (step) {
        step.title = newTitle;
      }
      return step;
    },

    /**
     * Reordena os passos de uma meta segundo uma lista de IDs.
     */
    reorderSteps(goal, newOrderStepIds) {
      if (!goal || !Array.isArray(goal.steps) || !Array.isArray(newOrderStepIds)) return goal;
      const stepMap = new Map(goal.steps.map(s => [s.id, s]));
      const reordered = [];

      newOrderStepIds.forEach((id, idx) => {
        const step = stepMap.get(id);
        if (step) {
          step.order = idx;
          reordered.push(step);
          stepMap.delete(id);
        }
      });

      // Passos remanescentes não listados
      stepMap.forEach(step => {
        step.order = reordered.length;
        reordered.push(step);
      });

      goal.steps = reordered;
      return goal;
    },

    /**
     * Divide um passo em dois (um passo vira dois).
     * Se o passo original já estiver concluído, doneAt e recompensas emitidas são preservados (Caso de borda 1).
     */
    splitStep(goal, stepId, splitOptions) {
      if (!goal || !Array.isArray(goal.steps)) return null;
      const stepIndex = goal.steps.findIndex(s => s.id === stepId);
      if (stepIndex === -1) return null;

      const originalStep = goal.steps[stepIndex];
      const firstTitle = splitOptions.firstTitle || originalStep.title;
      const secondTitle = splitOptions.secondTitle || (originalStep.title + ' (Parte 2)');
      const secondId = splitOptions.secondId || ('step-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));

      originalStep.title = firstTitle;
      if (splitOptions.firstEstMinutes !== undefined) {
        originalStep.estMinutes = splitOptions.firstEstMinutes;
      }

      const secondStep = {
        id: secondId,
        goalId: goal.id,
        title: secondTitle,
        order: originalStep.order + 1,
        estMinutes: splitOptions.secondEstMinutes !== undefined ? splitOptions.secondEstMinutes : null,
        targetDate: originalStep.targetDate,
        doneAt: null,
        archived: false
      };

      goal.steps.splice(stepIndex + 1, 0, secondStep);

      // Reindexa ordens subsequentes
      goal.steps.forEach((s, idx) => {
        s.order = idx;
      });

      goal.progress = this.calculateProgress(goal);
      return { firstStep: originalStep, secondStep };
    },

    /**
     * Arquiva um passo (nunca remove recompensas já emitidas).
     */
    archiveStep(goal, stepId) {
      if (!goal || !Array.isArray(goal.steps)) return null;
      const step = goal.steps.find(s => s.id === stepId);
      if (step) {
        step.archived = true;
        goal.progress = this.calculateProgress(goal);
      }
      return step;
    },

    /**
     * Conclui um passo e emite eventos de domínio.
     * Não emite recompensas diretamente (responsabilidade do Prompt 6).
     */
    completeStep(goal, stepId, clockOverride) {
      if (!goal || !Array.isArray(goal.steps)) return { step: null, events: [] };
      const step = goal.steps.find(s => s.id === stepId);
      if (!step || step.doneAt) {
        return { step, events: [] };
      }

      const clk = getClock(clockOverride);
      const nowIso = clk.isoString();
      step.doneAt = nowIso;

      goal.progress = this.calculateProgress(goal);

      const events = [
        { type: 'step_done', stepId: step.id, goalId: goal.id, at: nowIso }
      ];

      // Se todos os passos ativos foram concluídos, emite goal_done
      const activeSteps = goal.steps.filter(s => !s.archived);
      if (activeSteps.length > 0 && activeSteps.every(s => Boolean(s.doneAt))) {
        events.push({ type: 'goal_done', goalId: goal.id, at: nowIso });
      }

      return { step, events, progress: goal.progress };
    },

    /**
     * Desfaz a conclusão de um passo.
     */
    uncompleteStep(goal, stepId) {
      if (!goal || !Array.isArray(goal.steps)) return null;
      const step = goal.steps.find(s => s.id === stepId);
      if (step) {
        step.doneAt = null;
        goal.progress = this.calculateProgress(goal);
      }
      return step;
    }
  };

  return goalStepEngine;
}));
