package com.deadline.core.domain.time

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

/**
 * Relogio falso mutavel para testes unitarios deterministicos em `:core-domain` (AD-05).
 */
class FakeClock(
    private var currentInstant: Instant = Instant.parse("2026-10-25T12:00:00Z"),
    private var currentZone: ZoneId = ZoneOffset.ofHours(-3),
) : Clock() {

    override fun getZone(): ZoneId = currentZone

    override fun withZone(zone: ZoneId): Clock = FakeClock(currentInstant, zone)

    override fun instant(): Instant = currentInstant

    fun setInstant(instant: Instant) {
        currentInstant = instant
    }

    fun setZone(zoneId: ZoneId) {
        currentZone = zoneId
    }

    fun advanceBy(duration: Duration) {
        currentInstant = currentInstant.plus(duration)
    }

    fun advanceMinutes(minutes: Long) {
        advanceBy(Duration.ofMinutes(minutes))
    }

    fun advanceHours(hours: Long) {
        advanceBy(Duration.ofHours(hours))
    }
}
