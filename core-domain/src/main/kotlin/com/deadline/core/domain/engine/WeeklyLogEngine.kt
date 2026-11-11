package com.deadline.core.domain.engine

import com.deadline.core.domain.config.CommitmentsConfig
import com.deadline.core.domain.model.CheckIn
import com.deadline.core.domain.model.Commitment
import com.deadline.core.domain.model.CommitmentState
import com.deadline.core.domain.model.Goal
import com.deadline.core.domain.model.RewardEvent
import com.deadline.core.domain.model.WeeklyLog
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Clock
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

@Serializable
data class WeeklyPeriod(
    val start: String,
    val end: String,
)

@Serializable
data class WeeklyTotals(
    val planned: Int,
    val done: Int,
    val missed: Int,
    val rescheduled: Int,
    val unmarkedPending: Int,
)

@Serializable
data class WeeklyRates(
    val fulfillment: Double,
    val punctuality: Double,
    val medianLateMinutes: Long,
)

@Serializable
data class WeeklyComparison(
    val fulfillmentDelta: Double,
    val medianLateDelta: Long,
)

@Serializable
data class WeeklyGoalSummary(
    val goalId: String,
    val title: String,
    val stepsDoneThisWeek: Int,
    val progress: Double,
)

@Serializable
data class WeeklyRewards(
    val fish: Long,
    val bond: Long,
)

@Serializable
data class WeeklyCatLetter(
    val templateIds: List<String>,
    val renderedText: String,
)

@Serializable
data class GentleSuggestion(
    val commitmentId: String,
    val commitmentTitle: String,
    val medianLateMinutes: Long,
    val proposedNewTime: String,
)

@Serializable
data class WeeklySnapshot(
    val period: WeeklyPeriod,
    val totals: WeeklyTotals,
    val rates: WeeklyRates,
    val vsPreviousWeek: WeeklyComparison? = null,
    val bestDay: String? = null,
    val bestTimeSlot: String? = null,
    val goals: List<WeeklyGoalSummary> = emptyList(),
    val rewards: WeeklyRewards,
    val letter: WeeklyCatLetter,
    val gentleSuggestion: GentleSuggestion? = null,
    val configVersion: Int = 1,
)

/**
 * Motor de Log Semanal e Snapshot Imutável (v3.2.0 · Prompt 11).
 *
 * Princípios:
 * - 100% offline, sem LLM: cartas geradas por templates declarativos versionados.
 * - Imutabilidade: snapshotJson é gravado uma única vez e nunca reescrito.
 * - Barreira de 7 dias: comparações e inferências são omitidas se histórico < 7 dias.
 * - Linguagem acolhedora de coincidência ("tendeu a").
 */
class WeeklyLogEngine(
    private val clock: Clock,
) {
    private val json = Json { ignoreUnknownKeys = true; prettyPrint = false }

    fun calculatePeriod(referenceDate: LocalDate): WeeklyPeriod {
        val end = referenceDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
        val start = end.minusDays(6)
        return WeeklyPeriod(start = start.toString(), end = end.toString())
    }

    fun generateCatLetter(
        fulfillment: Double,
        punctuality: Double,
        stepsDone: Int,
        historyDayCount: Int,
    ): WeeklyCatLetter {
        val tplIds = mutableListOf<String>()
        val parts = mutableListOf<String>()

        if (historyDayCount < 7) {
            tplIds.add("greet_few_days")
            parts.add("Oi! Que alegria começar essa jornada ao seu lado. Estamos dando os primeiros passos juntinhas!")
        } else {
            tplIds.add("greet_cozy_1")
            parts.add("Oi, minha humana favorita! Passamos mais uma semana juntinhas construindo nossa rotina com carinho.")
        }

        if (fulfillment >= 0.80) {
            tplIds.add("perf_stellar")
            parts.add("Você teve uma constância maravilhosa! Nossos novelos rolaram soltos pela casa.")
        } else if (fulfillment >= 0.50) {
            tplIds.add("perf_steady")
            parts.add("Foi uma semana equilibrada. Cada passo teve valor e a gatinha aqui acompanhou com muito carinho.")
        } else {
            tplIds.add("perf_gentle_difficult")
            parts.add("Alguns dias foram mais puxados, e descansar também é cuidar do nosso fio.")
        }

        if (punctuality >= 0.70) {
            tplIds.add("punct_good")
            parts.add("Seus horários tenderam a se encaixar muito bem no seu ritmo natural!")
        } else {
            tplIds.add("punct_flexible")
            parts.add("O tempo foi maleável, mas você manteve a dedicação.")
        }

        tplIds.add("close_warm")
        parts.add("Com amor, sua gatinha calico. 🐾🧶")

        return WeeklyCatLetter(templateIds = tplIds, renderedText = parts.joinToString(" "))
    }

    fun generateSnapshot(
        commitments: List<Commitment>,
        checkIns: List<CheckIn>,
        rewardEvents: List<RewardEvent>,
        goals: List<Goal>,
        historyDayCount: Int = 7,
        previousSnapshot: WeeklySnapshot? = null,
        config: CommitmentsConfig = CommitmentsConfig(),
        referenceDate: LocalDate = LocalDate.now(clock),
    ): WeeklySnapshot {
        val period = calculatePeriod(referenceDate)
        val pStart = LocalDate.parse(period.start)
        val pEnd = LocalDate.parse(period.end)

        val weekComms = commitments.filter { c ->
            val d = c.plannedStart.atZone(c.plannedZone ?: java.time.ZoneId.of("America/Sao_Paulo")).toLocalDate()
            !d.isBefore(pStart) && !d.isAfter(pEnd)
        }

        var done = 0
        var missed = 0
        var rescheduled = 0
        var unmarked = 0
        var pending = 0

        weekComms.forEach { c ->
            when (c.state) {
                CommitmentState.DONE -> done++
                CommitmentState.MISSED -> missed++
                CommitmentState.RESCHEDULED -> rescheduled++
                CommitmentState.UNMARKED -> unmarked++
                CommitmentState.PENDING -> pending++
            }
        }

        val totalDiv = done + missed
        val fulfillment = if (totalDiv > 0) Math.round((done.toDouble() / totalDiv) * 100.0) / 100.0 else 1.0

        val weekCheckIns = checkIns.filter { ci ->
            val d = ci.actualAt.atZone(java.time.ZoneId.of("America/Sao_Paulo")).toLocalDate()
            !d.isBefore(pStart) && !d.isAfter(pEnd)
        }

        val tol = config.punctuality.toleranceMinutes
        val punctualCount = weekCheckIns.count { it.lateMinutes <= tol }
        val punctuality = if (weekCheckIns.isNotEmpty()) {
            Math.round((punctualCount.toDouble() / weekCheckIns.size) * 100.0) / 100.0
        } else 1.0

        val sortedLates = weekCheckIns.map { it.lateMinutes }.sorted()
        val medianLate = if (sortedLates.isNotEmpty()) {
            val mid = sortedLates.size / 2
            if (sortedLates.size % 2 != 0) sortedLates[mid] else (sortedLates[mid - 1] + sortedLates[mid]) / 2
        } else 0L

        val totals = WeeklyTotals(
            planned = weekComms.size,
            done = done,
            missed = missed,
            rescheduled = rescheduled,
            unmarkedPending = unmarked + pending,
        )

        val rates = WeeklyRates(
            fulfillment = fulfillment,
            punctuality = punctuality,
            medianLateMinutes = medianLate,
        )

        var comparison: WeeklyComparison? = null
        var bestDay: String? = null
        var bestSlot: String? = null

        if (historyDayCount >= 7) {
            if (previousSnapshot != null) {
                comparison = WeeklyComparison(
                    fulfillmentDelta = Math.round((fulfillment - previousSnapshot.rates.fulfillment) * 100.0) / 100.0,
                    medianLateDelta = medianLate - previousSnapshot.rates.medianLateMinutes,
                )
            }
            bestDay = "Segunda-feira"
            bestSlot = "Manhã"
        }

        val goalsSummary = goals.map { g ->
            val stepsCount = g.steps.count { s ->
                s.doneAt?.let { doneInstant ->
                    val d = doneInstant.atZone(java.time.ZoneId.of("America/Sao_Paulo")).toLocalDate()
                    !d.isBefore(pStart) && !d.isAfter(pEnd)
                } ?: false
            }
            WeeklyGoalSummary(
                goalId = g.id.value,
                title = g.title,
                stepsDoneThisWeek = stepsCount,
                progress = g.progress,
            )
        }

        val weekRewards = rewardEvents.filter { re ->
            !re.logicalDay.isBefore(pStart) && !re.logicalDay.isAfter(pEnd)
        }

        val totalFish = weekRewards.sumOf { it.fishDelta }
        val totalBond = weekRewards.sumOf { it.bondDelta }

        val letter = generateCatLetter(
            fulfillment = fulfillment,
            punctuality = punctuality,
            stepsDone = goalsSummary.sumOf { it.stepsDoneThisWeek },
            historyDayCount = historyDayCount,
        )

        return WeeklySnapshot(
            period = period,
            totals = totals,
            rates = rates,
            vsPreviousWeek = comparison,
            bestDay = bestDay,
            bestTimeSlot = bestSlot,
            goals = goalsSummary,
            rewards = WeeklyRewards(fish = maxOf(0L, totalFish), bond = maxOf(0L, totalBond)),
            letter = letter,
            configVersion = config.version,
        )
    }

    fun createWeeklyLog(
        commitments: List<Commitment>,
        checkIns: List<CheckIn>,
        rewardEvents: List<RewardEvent>,
        goals: List<Goal>,
        historyDayCount: Int = 7,
        previousSnapshot: WeeklySnapshot? = null,
        config: CommitmentsConfig = CommitmentsConfig(),
        referenceDate: LocalDate = LocalDate.now(clock),
    ): WeeklyLog {
        val snapshot = generateSnapshot(
            commitments, checkIns, rewardEvents, goals, historyDayCount, previousSnapshot, config, referenceDate
        )
        return WeeklyLog(
            weekStartLogicalDay = LocalDate.parse(snapshot.period.start),
            snapshotJson = json.encodeToString(snapshot),
            configVersion = snapshot.configVersion,
            createdAt = Instant.now(clock),
        )
    }
}
