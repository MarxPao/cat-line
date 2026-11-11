package com.deadline.core.domain.engine

import com.deadline.core.domain.config.CommitmentsConfig
import com.deadline.core.domain.model.CheckIn
import com.deadline.core.domain.model.Commitment
import com.deadline.core.domain.model.CommitmentState
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.RoutineCategory
import java.time.Clock
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

enum class TimeSlot {
    MADRUGADA, // 00:00 - 05:59
    MANHA,     // 06:00 - 11:59
    TARDE,     // 12:00 - 17:59
    NOITE,     // 18:00 - 23:59
}

data class MetricSummary(
    val totalCount: Int,
    val doneCount: Int,
    val missedCount: Int,
    val onTimeCount: Int,
    val fulfillmentRate: Double,
    val punctualityRate: Double,
    val medianLateMinutes: Double,
    val averageLateMinutes: Double,
)

data class DelayBreakdown(
    val byCategory: Map<RoutineCategory, MetricSummary> = emptyMap(),
    val byGoal: Map<GoalId, MetricSummary> = emptyMap(),
    val byDayOfWeek: Map<DayOfWeek, MetricSummary> = emptyMap(),
    val byTimeSlot: Map<TimeSlot, MetricSummary> = emptyMap(),
    val liveMetrics: MetricSummary,
    val retroactiveMetrics: MetricSummary,
)

data class DelayMetricsResult(
    val hasSufficientData: Boolean,
    val uniqueDaysCount: Int,
    val overall: MetricSummary,
    val breakdown: DelayBreakdown? = null,
    val gentleObservation: String,
)

/**
 * Motor puro de métricas de atraso, pontualidade e recortes analíticos (v3.2.0 · Prompt 5).
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
class DelayMetricsEngine(
    private val clock: Clock,
) {
    companion object {
        const val MINIMUM_DAYS_BARRIER = 7

        fun calculateMedian(values: List<Long>): Double {
            if (values.isEmpty()) return 0.0
            val sorted = values.sorted()
            val mid = sorted.size / 2
            return if (sorted.size % 2 != 0) {
                sorted[mid].toDouble()
            } else {
                (sorted[mid - 1] + sorted[mid]) / 2.0
            }
        }

        fun getTimeSlot(hour: Int): TimeSlot = when (hour) {
            in 0..5 -> TimeSlot.MADRUGADA
            in 6..11 -> TimeSlot.MANHA
            in 12..17 -> TimeSlot.TARDE
            else -> TimeSlot.NOITE
        }
    }

    fun computeMetrics(
        commitments: List<Commitment>,
        checkIns: List<CheckIn>,
        config: CommitmentsConfig = CommitmentsConfig.loadBundled(),
        referenceZone: ZoneId = ZoneId.of("America/Sao_Paulo"),
    ): DelayMetricsResult {
        val checkInMap = checkIns.associateBy { it.commitmentId }
        val tolerance = config.punctuality.toleranceMinutes

        // Filtra apenas compromissos avaliados (DONE ou MISSED)
        val resolved = commitments.filter {
            it.state == CommitmentState.DONE || it.state == CommitmentState.MISSED
        }

        // Calcula dias únicos no histórico
        val uniqueDays = resolved.map { c ->
            c.plannedStart.atZone(c.plannedZone ?: referenceZone).toLocalDate()
        }.toSet()

        val uniqueDaysCount = uniqueDays.size
        val hasSufficientData = uniqueDaysCount >= MINIMUM_DAYS_BARRIER

        val overall = summarize(resolved, checkInMap, tolerance)

        if (!hasSufficientData) {
            return DelayMetricsResult(
                hasSufficientData = false,
                uniqueDaysCount = uniqueDaysCount,
                overall = overall,
                breakdown = null,
                gentleObservation = "A gatinha ainda está observando seu ritmo nos primeiros dias. Continue registrando sua rotina com tranquilidade!",
            )
        }

        // Recortes analíticos
        val byCategory = resolved.groupBy { it.category }
            .mapValues { (_, list) -> summarize(list, checkInMap, tolerance) }

        val byGoal = resolved.filter { it.goalId != null }.groupBy { it.goalId!! }
            .mapValues { (_, list) -> summarize(list, checkInMap, tolerance) }

        val byDayOfWeek = resolved.groupBy {
            it.plannedStart.atZone(it.plannedZone ?: referenceZone).dayOfWeek
        }.mapValues { (_, list) -> summarize(list, checkInMap, tolerance) }

        val byTimeSlot = resolved.groupBy {
            val hour = it.plannedStart.atZone(it.plannedZone ?: referenceZone).hour
            getTimeSlot(hour)
        }.mapValues { (_, list) -> summarize(list, checkInMap, tolerance) }

        // Recorte retroativo vs ao vivo
        val liveCommitments = resolved.filter { c ->
            val chk = checkInMap[c.id]
            chk == null || !chk.retroactive
        }
        val retroCommitments = resolved.filter { c ->
            val chk = checkInMap[c.id]
            chk != null && chk.retroactive
        }

        val liveMetrics = summarize(liveCommitments, checkInMap, tolerance)
        val retroMetrics = summarize(retroCommitments, checkInMap, tolerance)

        val breakdown = DelayBreakdown(
            byCategory = byCategory,
            byGoal = byGoal,
            byDayOfWeek = byDayOfWeek,
            byTimeSlot = byTimeSlot,
            liveMetrics = liveMetrics,
            retroactiveMetrics = retroMetrics,
        )

        val gentleObservation = generateObservation(overall, breakdown)

        return DelayMetricsResult(
            hasSufficientData = true,
            uniqueDaysCount = uniqueDaysCount,
            overall = overall,
            breakdown = breakdown,
            gentleObservation = gentleObservation,
        )
    }

    private fun summarize(
        items: List<Commitment>,
        checkInMap: Map<*, CheckIn>,
        toleranceMinutes: Int,
    ): MetricSummary {
        val total = items.size
        val doneItems = items.filter { it.state == CommitmentState.DONE }
        val missedItems = items.filter { it.state == CommitmentState.MISSED }

        val doneCount = doneItems.size
        val missedCount = missedItems.size

        val denominator = doneCount + missedCount
        val fulfillmentRate = if (denominator > 0) doneCount.toDouble() / denominator.toDouble() else 0.0

        val checkInsDone = doneItems.mapNotNull { checkInMap[it.id] }
        val delays = checkInsDone.map { it.lateMinutes }

        val onTimeCount = delays.count { it <= toleranceMinutes }
        val punctualityRate = if (doneCount > 0) onTimeCount.toDouble() / doneCount.toDouble() else 0.0

        val medianLateMinutes = calculateMedian(delays)
        val averageLateMinutes = if (delays.isNotEmpty()) delays.average() else 0.0

        return MetricSummary(
            totalCount = total,
            doneCount = doneCount,
            missedCount = missedCount,
            onTimeCount = onTimeCount,
            fulfillmentRate = fulfillmentRate,
            punctualityRate = punctualityRate,
            medianLateMinutes = medianLateMinutes,
            averageLateMinutes = averageLateMinutes,
        )
    }

    private fun generateObservation(overall: MetricSummary, breakdown: DelayBreakdown): String {
        val punctualityPct = (overall.punctualityRate * 100).toInt()
        val medianLate = overall.medianLateMinutes.toInt()

        return if (medianLate <= 0) {
            "Nesta semana, seus compromissos tenderam a acontecer com pontualidade ou antecedência, mantendo o fio do novelinho leve e alinhado."
        } else if (medianLate <= 10) {
            "Nesta semana, a taxa de pontualidade foi de cerca de $punctualityPct% com atraso mediano de $medianLate minutos, dentro de uma margem acolhedora."
        } else {
            "Observamos nesta semana que o fio tendeu a esticar cerca de $medianLate minutos no meio dos dias, um bom sinal para ajustar janelas com carinho."
        }
    }
}
