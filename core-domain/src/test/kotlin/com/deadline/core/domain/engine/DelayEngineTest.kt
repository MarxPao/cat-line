package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.DelayTier
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RoutineCategory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

class DelayEngineTest {

    private val saoPauloZone = ZoneId.of("America/Sao_Paulo")
    private val engine = DelayEngine(toleranceMinutes = 5L, moderateDelayThresholdMinutes = 30L)

    private fun sampleOccurrence(id: String, dayKey: LocalDate, deadline: Instant, state: OccurrenceState = OccurrenceState.FEITO) =
        Occurrence(
            id = OccurrenceId(id),
            commitmentId = CommitmentId("c-$id"),
            title = "Item $id",
            type = CommitmentType.TAREFA,
            effort = EffortLevel.M,
            category = RoutineCategory.TRABALHAR,
            dayKey = dayKey,
            zoneId = saoPauloZone,
            deadline = deadline,
            state = state,
        )

    @Test
    fun `check-in adiantado gera atraso negativo e faixa ADIANTADO`() {
        val dayKey = LocalDate.of(2026, 10, 25)
        val deadline = ZonedDateTime.of(2026, 10, 25, 14, 0, 0, 0, saoPauloZone).toInstant()
        val checkedInAt = ZonedDateTime.of(2026, 10, 25, 13, 50, 0, 0, saoPauloZone).toInstant()
        val occ = sampleOccurrence("1", dayKey, deadline)

        val record = engine.evaluateCheckIn(occ, checkedInAt, CheckInOrigin.TOQUE)
        assertEquals(-10L, record.delayMinutes)
        assertEquals(DelayTier.ADIANTADO, record.delayTier)
        assertTrue(engine.isOnTime(record.delayMinutes))
    }

    @Test
    fun `tolerancia padrao de 5 minutos classifica como NO_PRAZO e 6 minutos como ATRASADO_LEVE`() {
        val dayKey = LocalDate.of(2026, 10, 25)
        val deadline = ZonedDateTime.of(2026, 10, 25, 10, 0, 0, 0, saoPauloZone).toInstant()
        val occ = sampleOccurrence("1", dayKey, deadline)

        val atFiveMin = engine.evaluateCheckIn(occ, deadline.plusSeconds(5 * 60), CheckInOrigin.TOQUE)
        val atSixMin = engine.evaluateCheckIn(occ, deadline.plusSeconds(6 * 60), CheckInOrigin.TOQUE)
        val atFortyMin = engine.evaluateCheckIn(occ, deadline.plusSeconds(40 * 60), CheckInOrigin.TOQUE)

        assertEquals(DelayTier.NO_PRAZO, atFiveMin.delayTier)
        assertTrue(engine.isOnTime(atFiveMin.delayMinutes))

        assertEquals(DelayTier.ATRASADO_LEVE, atSixMin.delayTier)
        assertFalse(engine.isOnTime(atSixMin.delayMinutes))

        assertEquals(DelayTier.ATRASADO_FORTE, atFortyMin.delayTier)
    }

    @Test
    fun `mediana protege contra outlier onde um unico atraso extremo distorce a media`() {
        val dayKey = LocalDate.of(2026, 10, 25)
        val baseDeadline = ZonedDateTime.of(2026, 10, 25, 9, 0, 0, 0, saoPauloZone).toInstant()

        // 4 itens em 2 min (no prazo) e 1 item com 180 min de atraso
        val delays = listOf(2L, 2L, 3L, 4L, 180L)
        val occurrences = delays.mapIndexed { idx, _ ->
            sampleOccurrence("occ-$idx", dayKey, baseDeadline)
        }
        val checkIns = occurrences.mapIndexed { idx, occ ->
            occ.id.value to engine.evaluateCheckIn(
                occ,
                baseDeadline.plusSeconds(delays[idx] * 60),
                CheckInOrigin.TOQUE,
            )
        }.toMap()

        val summary = engine.summarizeDay(dayKey, occurrences, checkIns)

        // Mediana = 3.0 min, enquanto a media = 38.2 min
        assertEquals(3.0, summary.medianDelayMinutes, 0.001)
        assertEquals(38.2, summary.meanDelayMinutes, 0.001)
        assertEquals(80.0, summary.onTimePercentage, 0.001)
    }

    @Test
    fun `superacao detecta queda da mediana de 7 dias em relacao a semana anterior`() {
        val refDay = LocalDate.of(2026, 10, 25)
        // Semana anterior (dias -13 a -7): mediana em torno de 22 min
        val prevWeek = (7..13).map { daysAgo ->
            val day = refDay.minusDays(daysAgo.toLong())
            DayDelaySummary(
                dayKey = day,
                totalPlannedCount = 4,
                completedCount = 4,
                onTimeCount = 1,
                lostCount = 0,
                medianDelayMinutes = 22.0,
                meanDelayMinutes = 25.0,
                onTimePercentage = 25.0,
            )
        }
        // Semana atual (dias -6 a 0): mediana caiu para 9 min
        val currentWeek = (0..6).map { daysAgo ->
            val day = refDay.minusDays(daysAgo.toLong())
            DayDelaySummary(
                dayKey = day,
                totalPlannedCount = 4,
                completedCount = 4,
                onTimeCount = 3,
                lostCount = 0,
                medianDelayMinutes = 9.0,
                meanDelayMinutes = 11.0,
                onTimePercentage = 75.0,
            )
        }

        val trend7 = engine.calculateWindowTrend(
            referenceDayKey = refDay,
            windowDays = 7,
            dailySummaries = prevWeek + currentWeek,
        )

        assertTrue(trend7.isOvercoming)
        assertEquals(9.0, trend7.currentWindowMedianMinutes, 0.001)
        assertEquals(22.0, trend7.previousWindowMedianMinutes ?: 0.0, 0.001)
        assertEquals(13.0, trend7.improvementMinutes, 0.001)
    }
}
