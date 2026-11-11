package com.deadline.core.domain.time

import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Calcula o dia logico (`dayKey`) considerando o horario de virada do dia (padrao 04:00, Secao 18).
 * Madrugada antes do horario de virada conta no dia anterior.
 */
data class DayBoundary(
    val rolloverTime: LocalTime = DEFAULT_ROLLOVER_TIME,
) {
    fun dayKeyFor(instant: Instant, zoneId: ZoneId): LocalDate {
        val zoned = ZonedDateTime.ofInstant(instant, zoneId)
        return if (zoned.toLocalTime().isBefore(rolloverTime)) {
            zoned.toLocalDate().minusDays(1)
        } else {
            zoned.toLocalDate()
        }
    }

    fun currentDayKey(clock: Clock): LocalDate =
        dayKeyFor(clock.instant(), clock.zone)

    fun startOfLogicalDay(dayKey: LocalDate, zoneId: ZoneId): Instant =
        dayKey.atTime(rolloverTime).atZone(zoneId).toInstant()

    fun endOfLogicalDay(dayKey: LocalDate, zoneId: ZoneId): Instant =
        dayKey.plusDays(1).atTime(rolloverTime).atZone(zoneId).toInstant()

    companion object {
        val DEFAULT_ROLLOVER_TIME: LocalTime = LocalTime.of(4, 0)
    }
}
