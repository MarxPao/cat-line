package com.deadline.core.domain.engine

import com.deadline.core.domain.config.EconomyConfig
import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.CheckInRecord
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.CurrencyType
import com.deadline.core.domain.model.DayCloseTier
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
import kotlin.random.Random

class MoodAndEconomyEngineTest {

    private val config = EconomyConfig.loadBundled()
    private val moodEngine = MoodEngine(config.moodWeights)
    private val economyEngine = EconomyEngine(config)
    private val zone = ZoneId.of("America/Sao_Paulo")
    private val now = Instant.parse("2026-10-25T18:00:00Z")
    private val dayKey = LocalDate.of(2026, 10, 25)

    private fun makeOccurrence(
        id: String,
        type: CommitmentType = CommitmentType.TAREFA,
        effort: EffortLevel = EffortLevel.M,
    ) = Occurrence(
        id = OccurrenceId(id),
        commitmentId = CommitmentId("c-$id"),
        title = "Item $id",
        type = type,
        effort = effort,
        category = RoutineCategory.ESTUDAR_LER,
        dayKey = dayKey,
        zoneId = zone,
        deadline = now,
        state = OccurrenceState.FEITO,
    )

    @Test
    fun `MoodEngine muda no maximo um degrau por fechamento de dia e respeita piso MANHOSA e modo descanso`() {
        val badDayIndices = MoodIndices(punctualityIndex = 0.0, consistencyIndex = 0.0, focusIndex = 0.0)

        // De RADIANTE num dia zero cai apenas 1 degrau (para FELIZ), nunca direto para MANHOSA
        val step1 = moodEngine.evaluateDayClose(CatMood.RADIANTE, badDayIndices, isRestModeActive = false)
        assertEquals(CatMood.FELIZ, step1.nextMood)

        // Piso MANHOSA nunca desce abaixo disso
        val floor = moodEngine.evaluateDayClose(CatMood.MANHOSA, badDayIndices, isRestModeActive = false)
        assertEquals(CatMood.MANHOSA, floor.nextMood)

        // Modo descanso congela o humor
        val frozen = moodEngine.evaluateDayClose(CatMood.RADIANTE, badDayIndices, isRestModeActive = true)
        assertEquals(CatMood.RADIANTE, frozen.nextMood)
        assertTrue(frozen.frozenByRestMode)
    }

    @Test
    fun `EconomyEngine aplica teto de 10 tarefas P por dia`() {
        val occP = makeOccurrence("p-11", CommitmentType.TAREFA, EffortLevel.P)
        val checkIn = CheckInRecord(occP.id, now, CheckInOrigin.TOQUE, 0L, DelayTier.NO_PRAZO)

        val tenthSmallTask = economyEngine.evaluateCheckIn(
            occurrence = occP,
            checkIn = checkIn,
            context = DayEconomyContext(dayKey, completedItemsTodayBeforeThis = 9, smallTasksPaidTodayBeforeThis = 9),
            now = now,
        )
        assertEquals(5L, tenthSmallTask.first { it.currency == CurrencyType.PEIXINHOS }.amount)

        val eleventhSmallTask = economyEngine.evaluateCheckIn(
            occurrence = occP,
            checkIn = checkIn,
            context = DayEconomyContext(dayKey, completedItemsTodayBeforeThis = 10, smallTasksPaidTodayBeforeThis = 10),
            now = now,
        )
        assertTrue(eleventhSmallTask.isEmpty())
    }

    @Test
    fun `EconomyEngine paga 50 por cento no check-in retroativo e reduz pela metade a partir do 12 item`() {
        val occG = makeOccurrence("g-1", CommitmentType.TAREFA, EffortLevel.G) // base 20
        val retroCheckIn = CheckInRecord(occG.id, now, CheckInOrigin.RETROATIVO, 0L, DelayTier.NO_PRAZO)

        val retroEntries = economyEngine.evaluateCheckIn(
            occurrence = occG,
            checkIn = retroCheckIn,
            context = DayEconomyContext(dayKey, completedItemsTodayBeforeThis = 0, smallTasksPaidTodayBeforeThis = 0),
            now = now,
        )
        assertEquals(10L, retroEntries.first { it.currency == CurrencyType.PEIXINHOS }.amount)

        // 12º item do dia (completedItemsTodayBeforeThis = 11 -> itemNumberToday = 12) com check-in normal
        val normalCheckIn = CheckInRecord(occG.id, now, CheckInOrigin.TOQUE, 0L, DelayTier.NO_PRAZO)
        val twelfthItemEntries = economyEngine.evaluateCheckIn(
            occurrence = occG,
            checkIn = normalCheckIn,
            context = DayEconomyContext(dayKey, completedItemsTodayBeforeThis = 11, smallTasksPaidTodayBeforeThis = 0),
            now = now,
        )
        assertEquals(10L, twelfthItemEntries.first { it.currency == CurrencyType.PEIXINHOS }.amount)
    }

    @Test
    fun `EconomyEngine respeita teto de 1_5x na sequencia de habito`() {
        val habitOcc = makeOccurrence("hab-1", CommitmentType.HABITO, EffortLevel.M)
        val checkIn = CheckInRecord(habitOcc.id, now, CheckInOrigin.TOQUE, 0L, DelayTier.NO_PRAZO)

        // 50 dias de sequencia -> 1 + 0.02*50 = 2.0, mas o teto e 1.5x (8 * 1.5 = 12 peixinhos)
        val entries = economyEngine.evaluateCheckIn(
            occurrence = habitOcc,
            checkIn = checkIn,
            context = DayEconomyContext(dayKey, completedItemsTodayBeforeThis = 0, smallTasksPaidTodayBeforeThis = 0, habitStreakDays = 50),
            now = now,
        )
        assertEquals(12L, entries.first { it.currency == CurrencyType.PEIXINHOS }.amount)
    }

    @Test
    fun `EconomyEngine calcula faixas bronze prata ouro e dia de recuperacao`() {
        val bronze = economyEngine.determineDayCloseTier(
            DayCloseEconomyInput(dayKey, totalPlannedItems = 8, totalCompletedItems = 4)
        )
        val silver = economyEngine.determineDayCloseTier(
            DayCloseEconomyInput(dayKey, totalPlannedItems = 8, totalCompletedItems = 6)
        )
        val gold = economyEngine.determineDayCloseTier(
            DayCloseEconomyInput(dayKey, totalPlannedItems = 8, totalCompletedItems = 8)
        )
        val recoveryBronze = economyEngine.determineDayCloseTier(
            DayCloseEconomyInput(
                dayKey = dayKey,
                totalPlannedItems = 10,
                totalCompletedItems = 2,
                eveningCompletedItems = 2,
                previousDayWasWeak = true,
            )
        )

        assertEquals(DayCloseTier.BRONZE, bronze)
        assertEquals(DayCloseTier.PRATA, silver)
        assertEquals(DayCloseTier.OURO, gold)
        assertEquals(DayCloseTier.BRONZE, recoveryBronze)
    }

    @Test
    fun `EconomyEngine garante item no bau da semana a cada 4 baus (pity)`() {
        var pity = 0
        for (week in 1..3) {
            val res = economyEngine.evaluateWeeklyChest(
                weekReferenceId = "2026-W$week",
                weeklyCompletionRatio = 0.6,
                previousChestsWithoutRareItem = pity,
                randomRollZeroToOne = 0.1, // abaixo de 0.75
                now = now,
            )
            assertFalse(res.grantedRareCosmeticItem)
            pity = res.newPityCounter
        }
        assertEquals(3, pity)

        val fourthChest = economyEngine.evaluateWeeklyChest(
            weekReferenceId = "2026-W4",
            weeklyCompletionRatio = 0.6,
            previousChestsWithoutRareItem = pity,
            randomRollZeroToOne = 0.0,
            now = now,
        )
        assertTrue(fourthChest.grantedRareCosmeticItem)
        assertEquals(0, fourthChest.newPityCounter)
    }

    @Test
    fun `simulacao de 90 dias com tres perfis (constante, irregular e caotica) valida calibracao da Secao 19`() {
        val constantResult = run90DayProfileSimulation(ProfileKind.CONSTANTE, seed = 42L)
        val irregularResult = run90DayProfileSimulation(ProfileKind.IRREGULAR, seed = 43L)
        val chaoticResult = run90DayProfileSimulation(ProfileKind.CAOTICA, seed = 44L)

        // 1. Saldo nunca fica negativo em nenhum perfil
        assertTrue(constantResult.minBalanceObserved >= 0L)
        assertTrue(irregularResult.minBalanceObserved >= 0L)
        assertTrue(chaoticResult.minBalanceObserved >= 0L)

        // 2. Um dia tipico do perfil constante rende cerca de 100 peixinhos (entre 85 e 135)
        //    permitindo comprar um item medio (150..300) em 2 a 3 dias e um grande (600..1000) em ~1 semana (6 a 10 dias)
        assertTrue(
            "Ganho diario medio do perfil constante (${constantResult.averageDailyFish}) deve ficar entre 85 e 135",
            constantResult.averageDailyFish in 85.0..135.0,
        )
        val daysForMediumItem = 225.0 / constantResult.averageDailyFish
        val daysForLargeItem = 750.0 / constantResult.averageDailyFish
        assertTrue("Item medio em 2 a 3 dias ($daysForMediumItem)", daysForMediumItem in 1.6..3.2)
        assertTrue("Item grande em cerca de uma semana ($daysForLargeItem)", daysForLargeItem in 5.5..9.0)

        // 3. Perfil caotico ainda sente progresso real (ganha peixinhos, vinculo e compra itens ao longo dos 90 dias)
        assertTrue("Perfil caotico deve acumular progresso relevante", chaoticResult.totalFishEarned > 1500L)
        assertEquals(chaoticResult.totalFishEarned, chaoticResult.totalBondPoints)
        assertTrue(constantResult.totalFishEarned > irregularResult.totalFishEarned)
        assertTrue(irregularResult.totalFishEarned > chaoticResult.totalFishEarned)
    }

    private enum class ProfileKind { CONSTANTE, IRREGULAR, CAOTICA }

    private data class SimulationSummary(
        val totalFishEarned: Long,
        val totalBondPoints: Long,
        val minBalanceObserved: Long,
        val averageDailyFish: Double,
    )

    private fun run90DayProfileSimulation(profile: ProfileKind, seed: Long): SimulationSummary {
        val rng = Random(seed)
        val startDate = LocalDate.of(2026, 1, 1)
        var currentBalance = 0L
        var minBalance = 0L
        var totalFishEarned = 0L
        var totalBond = 0L
        var streak = 0
        var prevDayWeak = false
        var pityCounter = 0

        // Dia tipico da Secao 19: 2 tarefas P, 3 tarefas M, 1 tarefa G, 3 habitos (9 itens planejados)
        val dailyTemplate = listOf(
            CommitmentType.TAREFA to EffortLevel.P,
            CommitmentType.TAREFA to EffortLevel.P,
            CommitmentType.TAREFA to EffortLevel.M,
            CommitmentType.TAREFA to EffortLevel.M,
            CommitmentType.TAREFA to EffortLevel.M,
            CommitmentType.TAREFA to EffortLevel.G,
            CommitmentType.HABITO to EffortLevel.M,
            CommitmentType.HABITO to EffortLevel.M,
            CommitmentType.HABITO to EffortLevel.M,
        )

        for (dayOffset in 0 until 90) {
            val day = startDate.plusDays(dayOffset.toLong())
            var completedToday = 0
            var smallTasksPaidToday = 0

            dailyTemplate.forEachIndexed { idx, (type, effort) ->
                val completes = when (profile) {
                    ProfileKind.CONSTANTE -> rng.nextDouble() < 0.85
                    ProfileKind.IRREGULAR -> rng.nextDouble() < 0.58
                    ProfileKind.CAOTICA -> rng.nextDouble() < 0.32
                }
                if (completes) {
                    val delayTier = when (profile) {
                        ProfileKind.CONSTANTE -> if (rng.nextDouble() < 0.8) DelayTier.NO_PRAZO else DelayTier.ADIANTADO
                        ProfileKind.IRREGULAR -> if (rng.nextDouble() < 0.5) DelayTier.NO_PRAZO else DelayTier.ATRASADO_LEVE
                        ProfileKind.CAOTICA -> if (rng.nextDouble() < 0.35) DelayTier.ATRASADO_LEVE else DelayTier.ATRASADO_FORTE
                    }
                    val occ = Occurrence(
                        id = OccurrenceId("sim-$dayOffset-$idx"),
                        commitmentId = CommitmentId("c-$idx"),
                        title = "Sim $idx",
                        type = type,
                        effort = effort,
                        category = RoutineCategory.TRABALHAR,
                        dayKey = day,
                        zoneId = zone,
                        deadline = now,
                        state = OccurrenceState.FEITO,
                    )
                    val checkIn = CheckInRecord(occ.id, now, CheckInOrigin.TOQUE, 0L, delayTier)
                    val entries = economyEngine.evaluateCheckIn(
                        occurrence = occ,
                        checkIn = checkIn,
                        context = DayEconomyContext(
                            dayKey = day,
                            completedItemsTodayBeforeThis = completedToday,
                            smallTasksPaidTodayBeforeThis = smallTasksPaidToday,
                            habitStreakDays = streak,
                        ),
                        now = now,
                    )
                    val fish = entries.filter { it.currency == CurrencyType.PEIXINHOS }.sumOf { it.amount }
                    val bond = entries.filter { it.currency == CurrencyType.VINCULO }.sumOf { it.amount }
                    currentBalance += fish
                    totalFishEarned += fish
                    totalBond += bond
                    completedToday++
                    if (type == CommitmentType.TAREFA && effort == EffortLevel.P && fish > 0) {
                        smallTasksPaidToday++
                    }
                }
            }

            if (completedToday >= 5) streak++ else streak = 0

            val (tier, closeEntries) = economyEngine.evaluateDayClose(
                input = DayCloseEconomyInput(
                    dayKey = day,
                    totalPlannedItems = dailyTemplate.size,
                    totalCompletedItems = completedToday,
                    eveningCompletedItems = minOf(completedToday, 2),
                    previousDayWasWeak = prevDayWeak,
                    todayMedianDelayMinutes = if (profile == ProfileKind.CONSTANTE) 2.0 else 18.0,
                    previous7DaysMedianDelayMinutes = if (profile == ProfileKind.CONSTANTE) 4.0 else 22.0,
                    screenTimeWithinGoal = profile == ProfileKind.CONSTANTE && rng.nextDouble() < 0.7,
                ),
                now = now,
            )
            prevDayWeak = (tier == DayCloseTier.NENHUM)

            val closeFish = closeEntries.filter { it.currency == CurrencyType.PEIXINHOS }.sumOf { it.amount }
            val closeBond = closeEntries.filter { it.currency == CurrencyType.VINCULO }.sumOf { it.amount }
            currentBalance += closeFish
            totalFishEarned += closeFish
            totalBond += closeBond

            if ((dayOffset + 1) % 7 == 0) {
                val chest = economyEngine.evaluateWeeklyChest(
                    weekReferenceId = "W-${dayOffset / 7}",
                    weeklyCompletionRatio = completedToday.toDouble() / dailyTemplate.size.toDouble(),
                    previousChestsWithoutRareItem = pityCounter,
                    randomRollZeroToOne = rng.nextDouble(),
                    now = now,
                )
                pityCounter = chest.newPityCounter
                currentBalance += chest.fishAmount
                totalFishEarned += chest.fishAmount
                totalBond += chest.fishAmount
            }

            // Simula compras na loja sempre respeitando o saldo disponivel
            if (currentBalance >= 200L) {
                currentBalance -= 180L
            }
            minBalance = minOf(minBalance, currentBalance)
        }

        return SimulationSummary(
            totalFishEarned = totalFishEarned,
            totalBondPoints = totalBond,
            minBalanceObserved = minBalance,
            averageDailyFish = totalFishEarned.toDouble() / 90.0,
        )
    }
}
