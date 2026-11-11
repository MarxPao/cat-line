package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.time.DayBoundary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

class RecurrenceEngineTest {

    private val saoPauloZone = ZoneId.of("America/Sao_Paulo")
    private val lisbonZone = ZoneId.of("Europe/Lisbon")
    private val engine = RecurrenceEngine(DayBoundary())

    @Test
    fun `janela de 14 dias gera ocorrencias diarias e respeita virada as 4h na madrugada`() {
        val startDay = LocalDate.of(2026, 10, 25)
        val series = RecurringCommitmentSeries(
            commitmentId = CommitmentId("commit-madrugada"),
            title = "Dormir antes das 2h",
            type = CommitmentType.HABITO,
            effort = EffortLevel.M,
            category = RoutineCategory.DORMIR,
            frequency = RecurrenceFrequency.Daily,
            plannedStartTime = LocalTime.of(1, 30),
            deadlineTime = LocalTime.of(2, 0),
            startDate = startDay,
        )

        val occurrences = engine.generateWindow(series, fromDayKey = startDay, horizonDays = 14, zoneId = saoPauloZone)
        assertEquals(14, occurrences.size)

        // O item do dayKey 2026-10-25 com prazo 02:00 ocorre na madrugada de 2026-10-26 02:00 BRT
        val first = occurrences.first()
        assertEquals(startDay, first.dayKey)
        val expectedDeadline = ZonedDateTime.of(2026, 10, 26, 2, 0, 0, 0, saoPauloZone).toInstant()
        assertEquals(expectedDeadline, first.deadline)
    }

    @Test
    fun `recorrencia X vezes por semana gera exatamente X ocorrencias por semana`() {
        val monday = LocalDate.of(2026, 10, 26) // Segunda-feira
        val series = RecurringCommitmentSeries(
            commitmentId = CommitmentId("commit-treino"),
            title = "Treino funcional",
            type = CommitmentType.HABITO,
            effort = EffortLevel.G,
            category = RoutineCategory.TREINAR,
            frequency = RecurrenceFrequency.TimesPerWeek(
                count = 3,
                preferredDays = listOf(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY),
            ),
            deadlineTime = LocalTime.of(19, 0),
            startDate = monday,
        )

        val twoWeeks = engine.generateWindow(series, fromDayKey = monday, horizonDays = 14, zoneId = saoPauloZone)
        assertEquals(6, twoWeeks.size)
        assertTrue(twoWeeks.all { it.dayKey.dayOfWeek in setOf(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY) })
    }

    @Test
    fun `editar serie ou mudar de fuso recalcula apenas o futuro preservando passadas e feitas`() {
        val startDay = LocalDate.of(2026, 10, 25)
        val originalSeries = RecurringCommitmentSeries(
            commitmentId = CommitmentId("commit-estudo"),
            title = "Estudar Kotlin",
            type = CommitmentType.TAREFA,
            effort = EffortLevel.M,
            category = RoutineCategory.ESTUDAR_LER,
            frequency = RecurrenceFrequency.Daily,
            deadlineTime = LocalTime.of(20, 0),
            startDate = startDay,
        )

        val initialWindow = engine.generateWindow(originalSeries, fromDayKey = startDay, horizonDays = 5, zoneId = saoPauloZone)
            .mapIndexed { idx, occ ->
                if (idx == 0) occ.copy(state = OccurrenceState.FEITO) else occ
            }

        // Edicao feita no dia 26 as 12:00 mudando o prazo para 21:30 e fuso para Lisboa
        val editTime = ZonedDateTime.of(2026, 10, 26, 12, 0, 0, 0, saoPauloZone).toInstant()
        val updatedSeries = originalSeries.copy(
            title = "Estudar Kotlin Avançado",
            deadlineTime = LocalTime.of(21, 30),
        )

        val recalculated = engine.recalculateFutureOccurrences(
            existingOccurrences = initialWindow,
            updatedSeries = updatedSeries,
            editEffectiveAt = editTime,
            newZoneId = lisbonZone,
            horizonDays = 5,
        )

        val day25 = recalculated.first { it.dayKey == LocalDate.of(2026, 10, 25) }
        assertEquals(OccurrenceState.FEITO, day25.state)
        assertEquals("Estudar Kotlin", day25.title)
        assertEquals(saoPauloZone, day25.zoneId)

        val futureDay27 = recalculated.first { it.dayKey == LocalDate.of(2026, 10, 27) }
        assertEquals("Estudar Kotlin Avançado", futureDay27.title)
        assertEquals(lisbonZone, futureDay27.zoneId)
    }

    @Test
    fun `ocorrencia pendente vira PERDIDO quando passa da virada das 4h do dia seguinte`() {
        val dayKey = LocalDate.of(2026, 10, 25)
        val series = RecurringCommitmentSeries(
            commitmentId = CommitmentId("commit-1"),
            title = "Ler 10 páginas",
            type = CommitmentType.TAREFA,
            effort = EffortLevel.P,
            category = RoutineCategory.ESTUDAR_LER,
            frequency = RecurrenceFrequency.Once(dayKey),
            deadlineTime = LocalTime.of(22, 0),
            startDate = dayKey,
        )
        val occurrences = engine.generateRange(series, dayKey, dayKey, saoPauloZone)

        val beforeRollover = ZonedDateTime.of(2026, 10, 26, 3, 59, 0, 0, saoPauloZone).toInstant()
        val afterRollover = ZonedDateTime.of(2026, 10, 26, 4, 0, 0, 0, saoPauloZone).toInstant()

        assertEquals(OccurrenceState.PENDENTE, engine.markExpiredAsLost(occurrences, beforeRollover).first().state)
        assertEquals(OccurrenceState.PERDIDO, engine.markExpiredAsLost(occurrences, afterRollover).first().state)
    }
}
