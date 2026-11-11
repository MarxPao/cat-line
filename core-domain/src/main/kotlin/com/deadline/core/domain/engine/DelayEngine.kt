package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.CheckInRecord
import com.deadline.core.domain.model.DelayTier
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceState
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.math.roundToLong

data class DayDelaySummary(
    val dayKey: LocalDate,
    val totalPlannedCount: Int,
    val completedCount: Int,
    val onTimeCount: Int,
    val lostCount: Int,
    val medianDelayMinutes: Double,
    val meanDelayMinutes: Double,
    val onTimePercentage: Double,
)

data class DelayWindowTrend(
    val windowDays: Int,
    val currentWindowMedianMinutes: Double,
    val previousWindowMedianMinutes: Double?,
    val currentWindowMeanMinutes: Double,
    val onTimePercentage: Double,
    /**
     * "Superacao" e a mediana da janela atual caindo em relacao a janela anterior (Secao 18).
     */
    val isOvercoming: Boolean,
    /**
     * Quantos minutos a mediana melhorou (valor positivo indica reducao do atraso).
     */
    val improvementMinutes: Double,
    val bestDayKey: LocalDate?,
    val worstDayKey: LocalDate?,
    val bestHourOfDay: Int?,
    val worstHourOfDay: Int?,
)

/**
 * Motor de atraso em Kotlin puro (WP-04 · Secao 4, Secao 6 e Secao 18).
 *
 * Regras atendidas:
 * - Atraso = instante do check-in menos o prazo (em minutos). Valor negativo significa adiantado.
 * - Faixas: ADIANTADO (< 0), NO_PRAZO (0..toleranceMinutes, padrao 5 min),
 *   ATRASADO_LEVE (toleranceMinutes+1..severeThresholdMinutes, padrao 30 min),
 *   ATRASADO_FORTE (> 30 min) e PERDIDO.
 * - Agrega por dia: atraso mediano, atraso medio e percentual no prazo.
 * - Tendencias em janelas de 7 e 30 dias; a mediana e o indicador principal para que um dia ruim
 *   nao distorca a semana.
 * - "Superacao" = mediana de 7 dias caindo em relacao aos 7 dias anteriores.
 */
class DelayEngine(
    val toleranceMinutes: Long = DEFAULT_TOLERANCE_MINUTES,
    val moderateDelayThresholdMinutes: Long = DEFAULT_MODERATE_DELAY_MINUTES,
) {

    fun evaluateCheckIn(
        occurrence: Occurrence,
        checkedInAt: Instant,
        origin: CheckInOrigin,
    ): CheckInRecord {
        val diffSeconds = Duration.between(occurrence.deadline, checkedInAt).seconds
        val delayMinutes = diffSeconds.floorDiv(60)
        val tier = classifyDelay(delayMinutes, isLost = false)
        return CheckInRecord(
            occurrenceId = occurrence.id,
            checkedInAt = checkedInAt,
            origin = origin,
            delayMinutes = delayMinutes,
            delayTier = tier,
        )
    }

    fun classifyDelay(delayMinutes: Long, isLost: Boolean = false): DelayTier {
        if (isLost) return DelayTier.PERDIDO
        return when {
            delayMinutes < 0L -> DelayTier.ADIANTADO
            delayMinutes <= toleranceMinutes -> DelayTier.NO_PRAZO
            delayMinutes <= moderateDelayThresholdMinutes -> DelayTier.ATRASADO_LEVE
            else -> DelayTier.ATRASADO_FORTE
        }
    }

    fun isOnTime(delayMinutes: Long): Boolean = delayMinutes <= toleranceMinutes

    fun summarizeDay(
        dayKey: LocalDate,
        occurrences: List<Occurrence>,
        checkInsByOccurrenceId: Map<String, CheckInRecord>,
    ): DayDelaySummary {
        val activeOccurrences = occurrences.filter { it.dayKey == dayKey && it.state != OccurrenceState.PULADO }
        if (activeOccurrences.isEmpty()) {
            return DayDelaySummary(
                dayKey = dayKey,
                totalPlannedCount = 0,
                completedCount = 0,
                onTimeCount = 0,
                lostCount = 0,
                medianDelayMinutes = 0.0,
                meanDelayMinutes = 0.0,
                onTimePercentage = 100.0,
            )
        }

        val completedCheckIns = activeOccurrences.mapNotNull { occ ->
            if (occ.state == OccurrenceState.FEITO) {
                checkInsByOccurrenceId[occ.id.value]
            } else {
                null
            }
        }

        val delays = completedCheckIns.map { it.delayMinutes.toDouble() }
        val onTimeCount = completedCheckIns.count { isOnTime(it.delayMinutes) }
        val lostCount = activeOccurrences.count { it.state == OccurrenceState.PERDIDO }

        val median = calculateMedian(delays)
        val mean = if (delays.isEmpty()) 0.0 else delays.average()
        val onTimePct = (onTimeCount.toDouble() / activeOccurrences.size.toDouble()) * 100.0

        return DayDelaySummary(
            dayKey = dayKey,
            totalPlannedCount = activeOccurrences.size,
            completedCount = completedCheckIns.size,
            onTimeCount = onTimeCount,
            lostCount = lostCount,
            medianDelayMinutes = median,
            meanDelayMinutes = mean,
            onTimePercentage = onTimePct,
        )
    }

    /**
     * Calcula a tendencia de uma janela (ex: 7 ou 30 dias) encerrando em `referenceDayKey` (inclusive)
     * e compara com a janela imediatamente anterior do mesmo tamanho para determinar a superacao.
     */
    fun calculateWindowTrend(
        referenceDayKey: LocalDate,
        windowDays: Int,
        dailySummaries: List<DayDelaySummary>,
        checkInsWithZone: List<Pair<CheckInRecord, ZoneId>> = emptyList(),
    ): DelayWindowTrend {
        require(windowDays in setOf(7, 30) || windowDays > 0) { "windowDays deve ser positivo" }

        val currentStart = referenceDayKey.minusDays((windowDays - 1).toLong())
        val previousEnd = currentStart.minusDays(1)
        val previousStart = previousEnd.minusDays((windowDays - 1).toLong())

        val currentDays = dailySummaries.filter {
            !it.dayKey.isBefore(currentStart) && !it.dayKey.isAfter(referenceDayKey) && it.completedCount > 0
        }
        val previousDays = dailySummaries.filter {
            !it.dayKey.isBefore(previousStart) && !it.dayKey.isAfter(previousEnd) && it.completedCount > 0
        }

        val currentMedian = calculateMedian(currentDays.map { it.medianDelayMinutes })
        val currentMean = if (currentDays.isEmpty()) 0.0 else currentDays.map { it.meanDelayMinutes }.average()
        val previousMedian = if (previousDays.isEmpty()) null else calculateMedian(previousDays.map { it.medianDelayMinutes })

        val totalPlanned = currentDays.sumOf { it.totalPlannedCount }
        val totalOnTime = currentDays.sumOf { it.onTimeCount }
        val onTimePct = if (totalPlanned == 0) 100.0 else (totalOnTime.toDouble() / totalPlanned.toDouble()) * 100.0

        val improvement = if (previousMedian != null) previousMedian - currentMedian else 0.0
        val isOvercoming = previousMedian != null && currentDays.isNotEmpty() && currentMedian < previousMedian

        val bestDay = currentDays.minByOrNull { it.medianDelayMinutes }?.dayKey
        val worstDay = currentDays.maxByOrNull { it.medianDelayMinutes }?.dayKey

        val hourlyStats = checkInsWithZone
            .groupBy { (record, zone) -> ZonedDateTime.ofInstant(record.checkedInAt, zone).hour }
            .mapValues { (_, items) -> calculateMedian(items.map { it.first.delayMinutes.toDouble() }) }

        val bestHour = hourlyStats.minByOrNull { it.value }?.key
        val worstHour = hourlyStats.maxByOrNull { it.value }?.key

        return DelayWindowTrend(
            windowDays = windowDays,
            currentWindowMedianMinutes = currentMedian,
            previousWindowMedianMinutes = previousMedian,
            currentWindowMeanMinutes = currentMean,
            onTimePercentage = onTimePct,
            isOvercoming = isOvercoming,
            improvementMinutes = improvement,
            bestDayKey = bestDay,
            worstDayKey = worstDay,
            bestHourOfDay = bestHour,
            worstHourOfDay = worstHour,
        )
    }

    fun calculateMedian(values: List<Double>): Double {
        if (values.isEmpty()) return 0.0
        val sorted = values.sorted()
        val mid = sorted.size / 2
        return if (sorted.size % 2 == 1) {
            sorted[mid]
        } else {
            (sorted[mid - 1] + sorted[mid]) / 2.0
        }
    }

    fun calculateMedianLong(values: List<Long>): Long =
        calculateMedian(values.map { it.toDouble() }).roundToLong()

    companion object {
        const val DEFAULT_TOLERANCE_MINUTES: Long = 5L
        const val DEFAULT_MODERATE_DELAY_MINUTES: Long = 30L
    }
}
