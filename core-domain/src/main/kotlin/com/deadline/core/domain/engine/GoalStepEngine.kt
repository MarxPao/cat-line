package com.deadline.core.domain.engine

import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.model.Commitment
import com.deadline.core.domain.model.Goal
import com.deadline.core.domain.model.GoalHorizon
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.GoalStep
import com.deadline.core.domain.model.GoalStepId
import java.time.Clock
import java.time.LocalDate

data class StepMutationResult(
    val goal: Goal,
    val events: List<DomainEvent> = emptyList(),
)

data class DeleteGoalResult(
    val updatedGoals: List<Goal>,
    val unlinkedCommitments: List<Commitment>,
)

/**
 * Motor de domínio puro de Metas e Passos (v3.2.0 · Prompt 3).
 *
 * Regras atendidas:
 * - Operações puras sobre Goal e GoalStep.
 * - Progresso = passos concluídos / passos ativos (ponderado por estMinutes quando todos os passos ativos têm estimativa).
 * - Arquivar ou dividir passo concluído preserva doneAt e recompensas já emitidas (Caso de borda 1).
 * - Adicionar passos a meta quase concluída apenas recalcula o progresso de forma acolhedora.
 * - Apagar meta desvincula compromissos (goalId = null, stepId = null) sem apagá-los (Caso de borda 2).
 * - Emite eventos de domínio StepDone e GoalDone com relógio injetável (AD-05).
 */
class GoalStepEngine(
    private val clock: Clock,
) {
    fun calculateProgress(goal: Goal): Double {
        val activeSteps = goal.steps.filter { !it.archived }
        if (activeSteps.isEmpty()) return 0.0

        val allHaveEst = activeSteps.all { it.estMinutes != null && (it.estMinutes ?: 0) > 0 }
        return if (allHaveEst) {
            val totalEst = activeSteps.sumOf { it.estMinutes ?: 0 }
            val doneEst = activeSteps.filter { it.doneAt != null }.sumOf { it.estMinutes ?: 0 }
            if (totalEst > 0) doneEst.toDouble() / totalEst.toDouble() else 0.0
        } else {
            val doneCount = activeSteps.count { it.doneAt != null }
            doneCount.toDouble() / activeSteps.size.toDouble()
        }
    }

    fun createGoal(
        id: GoalId,
        title: String,
        horizon: GoalHorizon,
        yarnColor: String = "pink",
        targetDate: LocalDate? = null,
    ): Goal = Goal(
        id = id,
        title = title,
        horizon = horizon,
        yarnColor = yarnColor,
        targetDate = targetDate,
        archived = false,
        createdAt = clock.instant(),
        steps = emptyList(),
    )

    fun editGoal(
        goal: Goal,
        title: String = goal.title,
        horizon: GoalHorizon = goal.horizon,
        yarnColor: String = goal.yarnColor,
        targetDate: LocalDate? = goal.targetDate,
    ): Goal = goal.copy(
        title = title,
        horizon = horizon,
        yarnColor = yarnColor,
        targetDate = targetDate,
    )

    fun archiveGoal(goal: Goal): Goal = goal.copy(archived = true)

    fun addStep(
        goal: Goal,
        id: GoalStepId,
        title: String,
        estMinutes: Int? = null,
        targetDate: LocalDate? = null,
    ): Goal {
        val nextOrder = if (goal.steps.isEmpty()) 0 else goal.steps.maxOf { it.order } + 1
        val newStep = GoalStep(
            id = id,
            goalId = goal.id,
            title = title,
            order = nextOrder,
            estMinutes = estMinutes,
            targetDate = targetDate,
            doneAt = null,
            archived = false,
        )
        return goal.copy(steps = goal.steps + newStep)
    }

    fun renameStep(goal: Goal, stepId: GoalStepId, newTitle: String): Goal {
        return goal.copy(
            steps = goal.steps.map {
                if (it.id == stepId) it.copy(title = newTitle) else it
            }
        )
    }

    fun reorderSteps(goal: Goal, newOrderStepIds: List<GoalStepId>): Goal {
        val stepMap = goal.steps.associateBy { it.id }
        val reordered = newOrderStepIds.mapIndexedNotNull { index, id ->
            stepMap[id]?.copy(order = index)
        }
        val remaining = goal.steps.filterNot { it.id in newOrderStepIds }
        return goal.copy(steps = reordered + remaining)
    }

    fun splitStep(
        goal: Goal,
        stepId: GoalStepId,
        firstTitle: String,
        secondId: GoalStepId,
        secondTitle: String,
        firstEstMinutes: Int? = null,
        secondEstMinutes: Int? = null,
    ): Goal {
        val targetStep = goal.steps.find { it.id == stepId } ?: return goal
        val newSteps = mutableListOf<GoalStep>()
        for (step in goal.steps) {
            if (step.id == stepId) {
                // Caso de Borda 1: Preserva doneAt do passo original se já estava concluído
                newSteps.add(
                    step.copy(
                        title = firstTitle,
                        estMinutes = firstEstMinutes ?: step.estMinutes,
                    )
                )
                newSteps.add(
                    GoalStep(
                        id = secondId,
                        goalId = goal.id,
                        title = secondTitle,
                        order = step.order + 1,
                        estMinutes = secondEstMinutes,
                        targetDate = step.targetDate,
                        doneAt = null,
                        archived = false,
                    )
                )
            } else {
                newSteps.add(step)
            }
        }
        return goal.copy(
            steps = newSteps.mapIndexed { idx, s -> s.copy(order = idx) }
        )
    }

    fun archiveStep(goal: Goal, stepId: GoalStepId): Goal {
        return goal.copy(
            steps = goal.steps.map {
                if (it.id == stepId) it.copy(archived = true) else it
            }
        )
    }

    fun completeStep(goal: Goal, stepId: GoalStepId): StepMutationResult {
        val now = clock.instant()
        var updated = false
        val newSteps = goal.steps.map {
            if (it.id == stepId && it.doneAt == null) {
                updated = true
                it.copy(doneAt = now)
            } else {
                it
            }
        }
        if (!updated) return StepMutationResult(goal, emptyList())

        val updatedGoal = goal.copy(steps = newSteps)
        val events = mutableListOf<DomainEvent>()
        events.add(DomainEvent.StepDone(stepId = stepId, goalId = goal.id, occurredAt = now))

        val activeSteps = updatedGoal.steps.filter { !it.archived }
        if (activeSteps.isNotEmpty() && activeSteps.all { it.doneAt != null }) {
            events.add(DomainEvent.GoalDone(goalId = goal.id, occurredAt = now))
        }

        return StepMutationResult(updatedGoal, events)
    }

    fun uncompleteStep(goal: Goal, stepId: GoalStepId): Goal {
        return goal.copy(
            steps = goal.steps.map {
                if (it.id == stepId) it.copy(doneAt = null) else it
            }
        )
    }

    fun deleteGoal(
        allGoals: List<Goal>,
        allCommitments: List<Commitment>,
        goalIdToDelete: GoalId,
    ): DeleteGoalResult {
        val remainingGoals = allGoals.filterNot { it.id == goalIdToDelete }
        // Caso de Borda 2: Apagar meta desvincula compromissos (goalId = null, stepId = null) sem apagá-los
        val unlinked = allCommitments.map { c ->
            if (c.goalId == goalIdToDelete) {
                c.copy(goalId = null, stepId = null)
            } else {
                c
            }
        }
        return DeleteGoalResult(remainingGoals, unlinked)
    }
}
