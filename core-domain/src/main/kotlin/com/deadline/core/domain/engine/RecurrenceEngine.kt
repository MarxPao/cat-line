package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.time.DayBoundary
import kotlinx.serialization.Serializable
import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/**
 * Frequencias de recorrencia suportadas por compromissos e habitos (Secao 5 e Secao 18).
 */
@Serializable
sealed interface RecurrenceFrequency {
    /** Uma unica vez num dia logico especifico. */
    @Serializable
    data class Once(val dayKeyIso: String) : RecurrenceFrequency {
        constructor(dayKey: LocalDate) : this(dayKey.toString())
        val dayKey: LocalDate get() = LocalDate.parse(dayKeyIso)
    }

    /** Todos os dias. */
    @Serializable
    data object Daily : RecurrenceFrequency

    /** Apenas dias uteis (segunda a sexta). */
    @Serializable
    data object Weekdays : RecurrenceFrequency

    /** Dias especificos da semana. */
    @Serializable
    data class SpecificDays(val daysOfWeek: Set<DayOfWeek>) : RecurrenceFrequency {
        init {
            require(daysOfWeek.isNotEmpty()) { "daysOfWeek nao pode ser vazio" }
        }
    }

    /**
     * X vezes por semana (Secao 5 e Secao 6).
     * Distribui os slots na semana usando os dias preferenciais ou espaçamento uniforme a partir da segunda-feira.
     */
    @Serializable
    data class TimesPerWeek(
        val count: Int,
        val preferredDays: List<DayOfWeek> = emptyList(),
    ) : RecurrenceFrequency {
        init {
            require(count in 1..7) { "count deve estar entre 1 e 7" }
        }
    }
}

data class RecurringCommitmentSeries(
    val commitmentId: CommitmentId,
    val title: String,
    val type: CommitmentType,
    val effort: EffortLevel,
    val category: RoutineCategory,
    val goalId: GoalId? = null,
    val frequency: RecurrenceFrequency,
    /** Horario planejado de inicio no dia. Se for antes do rollover (ex: 01:30 com virada as 04:00), pertence a madrugada daquele mesmo dayKey. */
    val plannedStartTime: LocalTime? = null,
    /** Horario limite (prazo) no dia. Se for antes do rollover (ex: 02:00), cai na madrugada do fim do dayKey. */
    val deadlineTime: LocalTime,
    val startDate: LocalDate,
    val endDate: LocalDate? = null,
)

/**
 * Motor de recorrencia em Kotlin puro (WP-03 · Secao 6 e Secao 18).
 *
 * Regras atendidas:
 * - Janela padrao de 14 dias a frente.
 * - O dia vira as 04:00 por padrao (configuravel via DayBoundary): horarios de madrugada (00:00..03:59)
 *   de um `dayKey` D ocorrem na data civil `D + 1`, mantendo `dayKey = D`.
 * - Mudanca de fuso preserva as ocorrencias ja fechadas/passadas e calcula as novas no novo fuso.
 * - Editar a serie recalcula apenas as ocorrencias futuras (`fromInstant`), preservando o passado e check-ins ja feitos.
 */
class RecurrenceEngine(
    private val dayBoundary: DayBoundary = DayBoundary(),
) {

    fun generateWindow(
        series: RecurringCommitmentSeries,
        fromDayKey: LocalDate,
        horizonDays: Int = DEFAULT_HORIZON_DAYS,
        zoneId: ZoneId,
    ): List<Occurrence> {
        require(horizonDays >= 1) { "horizonDays deve ser pelo menos 1" }
        val lastDayKey = fromDayKey.plusDays((horizonDays - 1).toLong())
        return generateRange(series, fromDayKey, lastDayKey, zoneId)
    }

    fun generateRange(
        series: RecurringCommitmentSeries,
        startDayKey: LocalDate,
        endDayKey: LocalDate,
        zoneId: ZoneId,
    ): List<Occurrence> {
        if (endDayKey.isBefore(startDayKey)) return emptyList()

        val effectiveStart = maxOf(startDayKey, series.startDate)
        val effectiveEnd = series.endDate?.let { minOf(endDayKey, it) } ?: endDayKey
        if (effectiveEnd.isBefore(effectiveStart)) return emptyList()

        val result = mutableListOf<Occurrence>()
        var cursor = effectiveStart
        while (!cursor.isAfter(effectiveEnd)) {
            if (matchesDay(series.frequency, cursor)) {
                result += materializeOccurrence(series, cursor, zoneId)
            }
            cursor = cursor.plusDays(1)
        }
        return result
    }

    /**
     * Editar uma serie recalcula apenas as ocorrencias futuras pendentes a partir de `editEffectiveAt`,
     * preservando todas as ocorrencias anteriores ou que ja receberam acao (FEITO, PERDIDO, PULADO).
     */
    fun recalculateFutureOccurrences(
        existingOccurrences: List<Occurrence>,
        updatedSeries: RecurringCommitmentSeries,
        editEffectiveAt: Instant,
        newZoneId: ZoneId,
        horizonDays: Int = DEFAULT_HORIZON_DAYS,
    ): List<Occurrence> {
        val currentDayKey = dayBoundary.dayKeyFor(editEffectiveAt, newZoneId)

        val preserved = existingOccurrences.filter { occ ->
            occ.state != OccurrenceState.PENDENTE ||
                occ.dayKey.isBefore(currentDayKey) ||
                !occ.deadline.isAfter(editEffectiveAt)
        }

        val preservedKeys = preserved.map { it.dayKey }.toSet()

        val regeneratedFuture = generateWindow(
            series = updatedSeries,
            fromDayKey = currentDayKey,
            horizonDays = horizonDays,
            zoneId = newZoneId,
        ).filter { candidate ->
            candidate.dayKey !in preservedKeys && candidate.deadline.isAfter(editEffectiveAt)
        }

        return (preserved + regeneratedFuture).sortedWith(
            compareBy<Occurrence> { it.dayKey }.thenBy { it.deadline }
        )
    }

    /**
     * Marca como PERDIDO todas as ocorrencias pendentes cujo prazo + janela de graca ja venceu.
     * Por padrao, a janela de graca vai ate o fim do dia logico (virada as 04:00 do dia seguinte).
     */
    fun markExpiredAsLost(
        occurrences: List<Occurrence>,
        now: Instant,
        graceDurationAfterDeadline: Duration? = null,
    ): List<Occurrence> = occurrences.map { occ ->
        if (occ.state != OccurrenceState.PENDENTE) {
            occ
        } else {
            val expirationInstant = if (graceDurationAfterDeadline != null) {
                occ.deadline.plus(graceDurationAfterDeadline)
            } else {
                dayBoundary.endOfLogicalDay(occ.dayKey, occ.zoneId)
            }
            if (!now.isBefore(expirationInstant)) {
                occ.copy(state = OccurrenceState.PERDIDO)
            } else {
                occ
            }
        }
    }

    private fun matchesDay(frequency: RecurrenceFrequency, dayKey: LocalDate): Boolean =
        when (frequency) {
            is RecurrenceFrequency.Once -> dayKey == frequency.dayKey
            RecurrenceFrequency.Daily -> true
            RecurrenceFrequency.Weekdays -> dayKey.dayOfWeek !in setOf(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY)
            is RecurrenceFrequency.SpecificDays -> dayKey.dayOfWeek in frequency.daysOfWeek
            is RecurrenceFrequency.TimesPerWeek -> dayKey.dayOfWeek in resolveWeeklyDays(frequency)
        }

    private fun resolveWeeklyDays(freq: RecurrenceFrequency.TimesPerWeek): Set<DayOfWeek> {
        if (freq.preferredDays.size >= freq.count) {
            return freq.preferredDays.take(freq.count).toSet()
        }
        val defaultTemplates = mapOf(
            1 to listOf(DayOfWeek.MONDAY),
            2 to listOf(DayOfWeek.MONDAY, DayOfWeek.THURSDAY),
            3 to listOf(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY),
            4 to listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY),
            5 to listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY),
            6 to listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY),
            7 to DayOfWeek.entries,
        )
        val merged = LinkedHashSet<DayOfWeek>(freq.preferredDays)
        for (day in defaultTemplates.getValue(freq.count) + DayOfWeek.entries) {
            if (merged.size >= freq.count) break
            merged.add(day)
        }
        return merged
    }

    private fun materializeOccurrence(
        series: RecurringCommitmentSeries,
        dayKey: LocalDate,
        zoneId: ZoneId,
    ): Occurrence {
        val deadlineInstant = logicalTimeToInstant(dayKey, series.deadlineTime, zoneId)
        val plannedStartInstant = series.plannedStartTime?.let { startTime ->
            val rawStart = logicalTimeToInstant(dayKey, startTime, zoneId)
            if (rawStart.isAfter(deadlineInstant)) {
                // Caso o inicio seja antes da meia-noite (ex: 23:00) e o prazo na madrugada (ex: 01:00)
                dayKey.atTime(startTime).atZone(zoneId).toInstant()
            } else {
                rawStart
            }
        }

        return Occurrence(
            id = OccurrenceId("${series.commitmentId.value}:$dayKey"),
            commitmentId = series.commitmentId,
            title = series.title,
            type = series.type,
            effort = series.effort,
            category = series.category,
            goalId = series.goalId,
            dayKey = dayKey,
            zoneId = zoneId,
            plannedStart = plannedStartInstant,
            deadline = deadlineInstant,
            state = OccurrenceState.PENDENTE,
        )
    }

    /**
     * Converte um horario local dentro de um `dayKey` para `Instant`.
     * Se o horario for anterior a virada do dia (ex: 02:30 com virada as 04:00),
     * ele ocorre na madrugada do dia civil seguinte (`dayKey.plusDays(1)`), mas pertence a `dayKey`.
     */
    private fun logicalTimeToInstant(
        dayKey: LocalDate,
        localTime: LocalTime,
        zoneId: ZoneId,
    ): Instant {
        val civilDate = if (localTime.isBefore(dayBoundary.rolloverTime)) {
            dayKey.plusDays(1)
        } else {
            dayKey
        }
        return civilDate.atTime(localTime).atZone(zoneId).toInstant()
    }

    companion object {
        const val DEFAULT_HORIZON_DAYS: Int = 14
    }
}
