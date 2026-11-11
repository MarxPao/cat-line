package com.deadline.core.domain

import com.deadline.core.domain.config.FeatureFlagKey
import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.event.InMemoryEventBus
import com.deadline.core.domain.model.Balances
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.time.DayBoundary
import com.deadline.core.domain.time.FakeClock
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

class CoreDomainBaseTest {

    private val saoPauloZone: ZoneId = ZoneId.of("America/Sao_Paulo")
    private val boundary = DayBoundary()

    @Test
    fun `madrugada antes das 4h conta no dia logico anterior`() {
        val lateNight = ZonedDateTime.of(2026, 10, 25, 3, 59, 59, 0, saoPauloZone).toInstant()
        val afterRollover = ZonedDateTime.of(2026, 10, 25, 4, 0, 0, 0, saoPauloZone).toInstant()

        assertEquals(LocalDate.of(2026, 10, 24), boundary.dayKeyFor(lateNight, saoPauloZone))
        assertEquals(LocalDate.of(2026, 10, 25), boundary.dayKeyFor(afterRollover, saoPauloZone))
    }

    @Test
    fun `virada do dia configuravel pela usuaria altera o dayKey corretamente`() {
        val customBoundary = DayBoundary(rolloverTime = LocalTime.of(5, 30))
        val atFiveAm = ZonedDateTime.of(2026, 10, 25, 5, 0, 0, 0, saoPauloZone).toInstant()
        val atSixAm = ZonedDateTime.of(2026, 10, 25, 6, 0, 0, 0, saoPauloZone).toInstant()

        assertEquals(LocalDate.of(2026, 10, 24), customBoundary.dayKeyFor(atFiveAm, saoPauloZone))
        assertEquals(LocalDate.of(2026, 10, 25), customBoundary.dayKeyFor(atSixAm, saoPauloZone))
    }

    @Test
    fun `FakeClock avanca minutos e horas mantendo determinismo`() {
        val start = ZonedDateTime.of(2026, 10, 25, 3, 30, 0, 0, saoPauloZone).toInstant()
        val clock = FakeClock(currentInstant = start, currentZone = saoPauloZone)

        assertEquals(LocalDate.of(2026, 10, 24), boundary.currentDayKey(clock))

        clock.advanceMinutes(35)
        assertEquals(LocalDate.of(2026, 10, 25), boundary.currentDayKey(clock))
    }

    @Test
    fun `InMemoryEventBus publica e entrega eventos de dominio`() = runTest {
        val bus = InMemoryEventBus(replay = 1)
        val expectedEvent = DomainEvent.CheckInRegistrado(
            occurrenceId = OccurrenceId("occ-1"),
            dayKey = LocalDate.of(2026, 10, 25),
            delayMinutes = -3L,
            origin = CheckInOrigin.TOQUE,
            fishEarned = 12L,
            occurredAt = Instant.parse("2026-10-25T15:00:00Z"),
        )

        var received: DomainEvent? = null
        val job = launch {
            received = bus.events.first()
        }
        bus.publish(expectedEvent)
        job.join()

        assertEquals(expectedEvent, received)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `Balances rejeita saldo negativo conforme principio 1 da secao 19`() {
        Balances(peixinhos = -1L, novelosDourados = 0L, vinculo = 0L)
    }

    @Test
    fun `FeatureFlagKey permite desligar modulos exceto a tela base Hoje`() {
        assertFalse(FeatureFlagKey.HOJE.canBeDisabled)
        assertTrue(FeatureFlagKey.FOCO.canBeDisabled)
        assertTrue(FeatureFlagKey.CONVERSA.canBeDisabled)
        assertTrue(FeatureFlagKey.NOVELO_GRACINHAS.canBeDisabled)
    }
}
