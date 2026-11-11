package com.deadline.core.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import com.deadline.core.data.backup.DeadLineBackupPayload
import com.deadline.core.data.db.CatProfileDao
import com.deadline.core.data.db.CatProfileEntity
import com.deadline.core.data.db.CommitmentAndGoalDao
import com.deadline.core.data.db.CommitmentEntity
import com.deadline.core.data.db.HabitDailyLogEntity
import com.deadline.core.data.db.HabitEntity
import com.deadline.core.data.db.LedgerDao
import com.deadline.core.data.db.OccurrenceDao
import com.deadline.core.data.mapper.toDomain
import com.deadline.core.data.mapper.toEntity
import com.deadline.core.data.service.DayCloseCoordinator
import com.deadline.core.domain.engine.DayDelaySummary
import com.deadline.core.domain.engine.DayEconomyContext
import com.deadline.core.domain.engine.DelayEngine
import com.deadline.core.domain.engine.DelayWindowTrend
import com.deadline.core.domain.engine.EconomyEngine
import com.deadline.core.domain.engine.RecurrenceEngine
import com.deadline.core.domain.engine.RecurrenceFrequency
import com.deadline.core.domain.engine.RecurringCommitmentSeries
import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.CatTemperament
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.CheckInRecord
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.CurrencyType
import com.deadline.core.domain.model.DelayTier
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.HabitId
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.port.AgendaRepository
import com.deadline.core.domain.port.AlarmScheduler
import com.deadline.core.domain.port.BackupRepository
import com.deadline.core.domain.port.CatInventoryState
import com.deadline.core.domain.port.DayRolloverHandler
import com.deadline.core.domain.port.HabitDefinition
import com.deadline.core.domain.port.HabitRepository
import com.deadline.core.domain.port.InsightsRepository
import com.deadline.core.domain.port.StoreCatalogItem
import com.deadline.core.domain.port.StoreItemCategory
import com.deadline.core.domain.port.StoreRepository
import com.deadline.core.domain.model.LedgerEntry
import com.deadline.core.domain.model.LedgerEntryId
import com.deadline.core.domain.time.DayBoundary
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import java.time.Clock
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

private val OVERCOMING_TARGET_MINUTES_KEY = intPreferencesKey("overcoming_target_minutes")

@Singleton
class RoomAgendaRepository @Inject constructor(
    private val commitmentDao: CommitmentAndGoalDao,
    private val occurrenceDao: OccurrenceDao,
    private val recurrenceEngine: RecurrenceEngine,
    private val alarmScheduler: AlarmScheduler,
    private val transactionRunner: TransactionRunner,
    private val clock: Clock,
) : AgendaRepository {

    private val json = Json { ignoreUnknownKeys = true }

    override fun observeSeries(): Flow<List<RecurringCommitmentSeries>> =
        commitmentDao.observeActiveCommitments().map { list ->
            list.map { it.toSeries(json) }
        }

    override suspend fun upsertSeries(series: RecurringCommitmentSeries) {
        val now = clock.instant()
        val zone = clock.zone
        val newOccurrences = transactionRunner.runInTransaction {
            commitmentDao.upsertCommitment(series.toEntity(json, now.toEpochMilli()))
            val existing = occurrenceDao.getByCommitmentId(series.commitmentId.value).map { it.toDomain() }
            val recalculated = recurrenceEngine.recalculateFutureOccurrences(
                existingOccurrences = existing,
                updatedSeries = series,
                editEffectiveAt = now,
                newZoneId = zone,
                horizonDays = RecurrenceEngine.DEFAULT_HORIZON_DAYS,
            )
            occurrenceDao.deletePendingForCommitment(series.commitmentId.value)
            occurrenceDao.upsertAll(recalculated.map { it.toEntity() })
            recalculated.filter { it.state == OccurrenceState.PENDENTE }
        }
        newOccurrences.forEach { alarmScheduler.schedule(it) }
    }

    override suspend fun deleteSeries(id: CommitmentId) {
        val existingPending = occurrenceDao.getByCommitmentId(id.value)
            .filter { it.state == OccurrenceState.PENDENTE.name }
        transactionRunner.runInTransaction {
            commitmentDao.softDeleteCommitment(id.value, clock.instant().toEpochMilli())
            occurrenceDao.deletePendingForCommitment(id.value)
        }
        existingPending.forEach { alarmScheduler.cancel(OccurrenceId(it.id)) }
    }

    override suspend fun materializeNext14Days(referenceDayKey: LocalDate) {
        val zone = clock.zone
        val now = clock.instant()
        val activeSeries = commitmentDao.getActiveCommitments().map { it.toSeries(json) }
        val toSchedule = mutableListOf<Occurrence>()

        transactionRunner.runInTransaction {
            activeSeries.forEach { series ->
                val existing = occurrenceDao.getByCommitmentId(series.commitmentId.value).map { it.toDomain() }
                val updated = recurrenceEngine.recalculateFutureOccurrences(
                    existingOccurrences = existing,
                    updatedSeries = series,
                    editEffectiveAt = now,
                    newZoneId = zone,
                    horizonDays = RecurrenceEngine.DEFAULT_HORIZON_DAYS,
                )
                occurrenceDao.upsertAll(updated.map { it.toEntity() })
                toSchedule += updated.filter { it.state == OccurrenceState.PENDENTE && it.dayKey >= referenceDayKey }
            }
        }
        toSchedule.forEach { alarmScheduler.schedule(it) }
    }
}

@Singleton
class RoomHabitRepository @Inject constructor(
    private val commitmentDao: CommitmentAndGoalDao,
    private val catProfileDao: CatProfileDao,
    private val ledgerDao: LedgerDao,
    private val economyEngine: EconomyEngine,
    private val transactionRunner: TransactionRunner,
    private val clock: Clock,
) : HabitRepository {

    private val json = Json { ignoreUnknownKeys = true }

    override fun observeActiveHabits(dayKey: LocalDate): Flow<List<HabitDefinition>> =
        combine(
            commitmentDao.observeActiveHabits(),
            commitmentDao.observeHabitLogsForDay(dayKey.toString()),
            catProfileDao.observeProfile(),
        ) { habits, logsToday, profile ->
            val completedIds = logsToday.filter { it.completedAtEpochMillis != null || it.usedReserveYarn }
                .map { it.habitId }
                .toSet()
            val reserveYarns = profile?.reserveYarnsHeld ?: 0

            habits.map { entity ->
                HabitDefinition(
                    id = HabitId(entity.id),
                    title = entity.title,
                    category = RoutineCategory.valueOf(entity.category),
                    frequency = json.decodeFromString(RecurrenceFrequency.serializer(), entity.frequencyJson),
                    windowStart = entity.windowStartLocalTime?.let(LocalTime::parse),
                    windowEnd = LocalTime.parse(entity.windowEndLocalTime),
                    weeklyTarget = entity.weeklyTarget,
                    currentStreakDays = entity.currentStreakDays,
                    reserveYarnsAvailable = reserveYarns,
                    completedToday = entity.id in completedIds,
                )
            }
        }

    override suspend fun upsertHabit(habit: HabitDefinition) {
        val nowMillis = clock.instant().toEpochMilli()
        val freqJson = json.encodeToString(RecurrenceFrequency.serializer(), habit.frequency)
        commitmentDao.upsertHabit(
            HabitEntity(
                id = habit.id.value,
                title = habit.title,
                category = habit.category.name,
                frequencyJson = freqJson,
                windowStartLocalTime = habit.windowStart?.toString(),
                windowEndLocalTime = habit.windowEnd.toString(),
                weeklyTarget = habit.weeklyTarget,
                currentStreakDays = habit.currentStreakDays,
                createdAtEpochMillis = nowMillis,
            )
        )
    }

    override suspend fun completeHabitForDay(habitId: HabitId, dayKey: LocalDate): Long {
        val now = clock.instant()
        return transactionRunner.runInTransaction {
            val habitEntity = commitmentDao.getHabitById(habitId.value) ?: return@runInTransaction 0L
            val existingLog = commitmentDao.getHabitLog(habitId.value, dayKey.toString())
            if (existingLog?.completedAtEpochMillis != null) {
                return@runInTransaction 0L
            }

            val newStreak = habitEntity.currentStreakDays + 1
            commitmentDao.updateHabit(habitEntity.copy(currentStreakDays = newStreak))
            commitmentDao.upsertHabitLog(
                HabitDailyLogEntity(
                    habitId = habitId.value,
                    dayKey = dayKey.toString(),
                    completedAtEpochMillis = now.toEpochMilli(),
                    usedReserveYarn = false,
                )
            )

            val refId = "habit:${habitId.value}:$dayKey"
            val existingRefs = ledgerDao.getRulesForReference(refId).map { it.ruleKey to it.referenceId }.toSet()
            val syntheticOcc = Occurrence(
                id = OccurrenceId(refId),
                commitmentId = CommitmentId(habitId.value),
                title = habitEntity.title,
                type = CommitmentType.HABITO,
                effort = EffortLevel.M,
                category = RoutineCategory.valueOf(habitEntity.category),
                dayKey = dayKey,
                zoneId = clock.zone,
                deadline = now,
                state = OccurrenceState.FEITO,
            )
            val entries = economyEngine.evaluateCheckIn(
                occurrence = syntheticOcc,
                checkIn = CheckInRecord(syntheticOcc.id, now, CheckInOrigin.TOQUE, 0L, DelayTier.NO_PRAZO),
                context = DayEconomyContext(
                    dayKey = dayKey,
                    completedItemsTodayBeforeThis = 0,
                    smallTasksPaidTodayBeforeThis = 0,
                    habitStreakDays = newStreak,
                    existingRuleReferences = existingRefs,
                ),
                now = now,
            )
            if (entries.isNotEmpty()) {
                ledgerDao.insertAllIgnoreDuplicates(entries.map { it.toEntity() })
            }
            entries.filter { it.currency == CurrencyType.PEIXINHOS }.sumOf { it.amount }
        }
    }

    /**
     * Usa um "novelo reserva" para cobrir um dia perdido sem quebrar a sequencia (Secao 5 e Secao 19).
     */
    override suspend fun applyReserveYarnToProtectStreak(habitId: HabitId, missedDayKey: LocalDate): Boolean =
        transactionRunner.runInTransaction {
            val profile = catProfileDao.getProfile() ?: CatProfileEntity(
                id = CatProfileDao.DEFAULT_CAT_ID,
                name = "Gatinha",
                paletteKey = "calico_default",
                currentMood = CatMood.FELIZ.name,
                temperament = CatTemperament.ACOLHEDORA.name,
                reserveYarnsHeld = 1,
            )
            if (profile.reserveYarnsHeld <= 0) return@runInTransaction false

            val habit = commitmentDao.getHabitById(habitId.value) ?: return@runInTransaction false
            catProfileDao.upsert(profile.copy(reserveYarnsHeld = profile.reserveYarnsHeld - 1))
            commitmentDao.upsertHabitLog(
                HabitDailyLogEntity(
                    habitId = habit.id,
                    dayKey = missedDayKey.toString(),
                    completedAtEpochMillis = null,
                    usedReserveYarn = true,
                )
            )
            true
        }

    override suspend fun deleteHabit(id: HabitId) {
        commitmentDao.softDeleteHabit(id.value, clock.instant().toEpochMilli())
    }
}

@Singleton
class RoomInsightsRepository @Inject constructor(
    private val occurrenceDao: OccurrenceDao,
    private val delayEngine: DelayEngine,
    private val dayBoundary: DayBoundary,
    private val dataStore: DataStore<Preferences>,
    private val clock: Clock,
) : InsightsRepository {

    override fun observeRecentDailySummaries(days: Int): Flow<List<DayDelaySummary>> =
        combine(
            occurrenceDao.observeAll(),
            occurrenceDao.observeAllCheckIns(),
        ) { allOccurrences, allCheckIns ->
            val currentDayKey = dayBoundary.currentDayKey(clock)
            val startDayKey = currentDayKey.minusDays((days - 1).toLong())
            val domainOccs = allOccurrences.map { it.toDomain() }
            val checkInMap = allCheckIns.associate { it.occurrenceId to it.toDomain() }

            (0 until days).map { offset ->
                val day = startDayKey.plusDays(offset.toLong())
                delayEngine.summarizeDay(day, domainOccs, checkInMap)
            }
        }

    override fun observeWindowTrend(windowDays: Int): Flow<DelayWindowTrend> =
        combine(
            observeRecentDailySummaries(days = windowDays * 2),
            occurrenceDao.observeAllCheckIns(),
        ) { summaries, checkIns ->
            val currentDayKey = dayBoundary.currentDayKey(clock)
            val zone = clock.zone
            val withZone = checkIns.map { it.toDomain() to zone }
            delayEngine.calculateWindowTrend(
                referenceDayKey = currentDayKey,
                windowDays = windowDays,
                dailySummaries = summaries,
                checkInsWithZone = withZone,
            )
        }

    override fun observeOvercomingTargetMinutes(): Flow<Int> =
        dataStore.data.map { prefs -> prefs[OVERCOMING_TARGET_MINUTES_KEY] ?: 15 }

    override suspend fun setOvercomingTargetMinutes(targetMinutes: Int) {
        dataStore.edit { prefs ->
            prefs[OVERCOMING_TARGET_MINUTES_KEY] = targetMinutes.coerceIn(0, 120)
        }
    }
}

@Singleton
class RoomBackupRepository @Inject constructor(
    private val commitmentDao: CommitmentAndGoalDao,
    private val occurrenceDao: OccurrenceDao,
    private val ledgerDao: LedgerDao,
    private val transactionRunner: TransactionRunner,
    private val clock: Clock,
) : BackupRepository {

    override suspend fun exportJson(): String {
        val commitments = commitmentDao.getActiveCommitments()
        val occurrences = occurrenceDao.observeAll().first()
        val ledger = ledgerDao.getAll()

        val payload = DeadLineBackupPayload(
            exportedAtEpochMillis = clock.instant().toEpochMilli(),
            commitmentsCount = commitments.size,
            occurrencesCount = occurrences.size,
            ledgerEntriesCount = ledger.size,
        )
        return DeadLineBackupPayload.encode(payload)
    }

    override suspend fun importJson(rawJson: String): Result<Int> =
        DeadLineBackupPayload.decodeAndValidate(rawJson).map { payload ->
            payload.commitmentsCount + payload.occurrencesCount + payload.ledgerEntriesCount
        }

    override suspend fun clearAllUserData() {
        transactionRunner.runInTransaction {
            occurrenceDao.clearAllCheckIns()
            occurrenceDao.clearAllOccurrences()
            commitmentDao.clearAllHabitLogs()
            commitmentDao.clearAllHabits()
            commitmentDao.clearAllCommitments()
            commitmentDao.clearAllGoals()
        }
    }
}

@Singleton
class DefaultDayRolloverHandler @Inject constructor(
    private val dayBoundary: DayBoundary,
    private val dayCloseCoordinator: DayCloseCoordinator,
    private val agendaRepository: AgendaRepository,
    private val clock: Clock,
) : DayRolloverHandler {

    override suspend fun runRolloverAndMaterialize() {
        val currentDayKey = dayBoundary.currentDayKey(clock)
        val previousDayKey = currentDayKey.minusDays(1)
        dayCloseCoordinator.closeDayIfNeeded(previousDayKey)
        agendaRepository.materializeNext14Days(currentDayKey)
    }
}

/**
 * Implementacao de `StoreRepository` (WP-19 · Secao 19):
 * - Catalogo calibrado com os precos da Secao 19:
 *   - Cosmetico simples (laco, chapeu): 40 a 80 peixinhos
 *   - Cosmetico medio ou movel: 150 a 300 peixinhos
 *   - Item grande de cenario: 600 a 1000 peixinhos
 *   - Comida e brinquedo: 10 a 30 peixinhos (rende vinculo e animacao, mas NAO muda o humor!)
 *   - Nova area do cenario: 8 novelos dourados
 *   - Novo gato: 15 novelos dourados + vinculo minimo
 *   - Novelo reserva: 2 novelos dourados (maximo de 2 guardados)
 */
@Singleton
class RoomStoreRepository @Inject constructor(
    private val catProfileDao: CatProfileDao,
    private val ledgerDao: LedgerDao,
    private val transactionRunner: TransactionRunner,
    private val economyEngine: EconomyEngine,
    private val clock: Clock,
) : StoreRepository {

    private val json = Json { ignoreUnknownKeys = true }
    private val stringListSerializer = ListSerializer(String.serializer())

    private val catalogItems: List<StoreCatalogItem> = listOf(
        StoreCatalogItem(
            id = "laco_rosa",
            titlePtBr = "Laço Rosa Pixel",
            descriptionPtBr = "Cosmético simples que acompanha a orelha da gatinha",
            category = StoreItemCategory.COSMETICO_SIMPLES,
            currency = CurrencyType.PEIXINHOS,
            price = 50L,
        ),
        StoreCatalogItem(
            id = "chapeu_mago",
            titlePtBr = "Chapéu de Mago 8-Bit",
            descriptionPtBr = "Cosmético simples para estudar com estilo",
            category = StoreItemCategory.COSMETICO_SIMPLES,
            currency = CurrencyType.PEIXINHOS,
            price = 75L,
        ),
        StoreCatalogItem(
            id = "cachecol_dourado",
            titlePtBr = "Cachecol Quentinho",
            descriptionPtBr = "Cosmético médio para dias de foco",
            category = StoreItemCategory.COSMETICO_MEDIO_MOVEL,
            currency = CurrencyType.PEIXINHOS,
            price = 180L,
        ),
        StoreCatalogItem(
            id = "arvore_arranhador",
            titlePtBr = "Torre Arranhador Gigante",
            descriptionPtBr = "Item grande de cenário para o quarto da gatinha",
            category = StoreItemCategory.CENARIO_GRANDE,
            currency = CurrencyType.PEIXINHOS,
            price = 700L,
        ),
        StoreCatalogItem(
            id = "petisco_salmao",
            titlePtBr = "Petisco de Salmão",
            descriptionPtBr = "Comida gostosa: rende +15 de vínculo e animação (não altera o humor real)",
            category = StoreItemCategory.COMIDA_BRINQUEDO,
            currency = CurrencyType.PEIXINHOS,
            price = 20L,
            bondGrantedOnUse = 15L,
        ),
        StoreCatalogItem(
            id = "novelo_reserva_item",
            titlePtBr = "Novelo Reserva",
            descriptionPtBr = "Protege uma sequência de hábito num dia perdido (máx. 2 guardados)",
            category = StoreItemCategory.NOVELO_RESERVA,
            currency = CurrencyType.NOVELOS_DOURADOS,
            price = 2L,
        ),
        StoreCatalogItem(
            id = "area_jardim",
            titlePtBr = "Nova Área: Jardim Pixel",
            descriptionPtBr = "Abre uma nova área externa para passear",
            category = StoreItemCategory.NOVA_AREA,
            currency = CurrencyType.NOVELOS_DOURADOS,
            price = 8L,
        ),
        StoreCatalogItem(
            id = "gato_laranja",
            titlePtBr = "Novo Gatinho: Laranjinha",
            descriptionPtBr = "Novo amigo desbloqueável (exige 15 novelos dourados e vínculo >= 1000)",
            category = StoreItemCategory.NOVO_GATO,
            currency = CurrencyType.NOVELOS_DOURADOS,
            price = 15L,
            minBondRequired = 1_000L,
        ),
    )

    override fun getCatalog(): List<StoreCatalogItem> = catalogItems

    override fun observeCatInventory(): Flow<CatInventoryState> =
        catProfileDao.observeProfile().map { entity ->
            if (entity == null) {
                CatInventoryState()
            } else {
                val owned = runCatching {
                    json.decodeFromString(stringListSerializer, entity.ownedItemsJson).toSet()
                }.getOrDefault(emptySet())
                val equipped = runCatching {
                    json.decodeFromString(stringListSerializer, entity.equippedItemsJson).toSet()
                }.getOrDefault(emptySet())
                CatInventoryState(
                    catName = entity.name,
                    mood = CatMood.valueOf(entity.currentMood),
                    ownedItemIds = owned,
                    equippedItemIds = equipped,
                    reserveYarnsHeld = entity.reserveYarnsHeld,
                    isRestModeActive = entity.isRestModeActive,
                )
            }
        }

    override suspend fun purchaseItem(itemId: String): Result<Unit> = runCatching {
        val item = catalogItems.firstOrNull { it.id == itemId }
            ?: error("Item não encontrado: $itemId")

        transactionRunner.runInTransaction {
            val allLedger = ledgerDao.getAll()
            val availableFish = allLedger.filter { it.currency == CurrencyType.PEIXINHOS.name }.sumOf { it.amount }
            val availableGolden = allLedger.filter { it.currency == CurrencyType.NOVELOS_DOURADOS.name }.sumOf { it.amount }
            val currentBond = allLedger.filter { it.currency == CurrencyType.VINCULO.name && it.amount > 0 }.sumOf { it.amount }

            require(currentBond >= item.minBondRequired) {
                "Vínculo insuficiente (${currentBond}/${item.minBondRequired})"
            }

            when (item.currency) {
                CurrencyType.PEIXINHOS -> require(availableFish >= item.price) {
                    "Peixinhos insuficientes ($availableFish/${item.price})"
                }
                CurrencyType.NOVELOS_DOURADOS -> require(availableGolden >= item.price) {
                    "Novelos dourados insuficientes ($availableGolden/${item.price})"
                }
                CurrencyType.VINCULO -> error("Vínculo nunca se gasta (Seção 19)")
            }

            val profile = catProfileDao.getProfile() ?: CatProfileEntity(
                id = CatProfileDao.DEFAULT_CAT_ID,
                name = "Gatinha",
                paletteKey = "calico_default",
                currentMood = CatMood.FELIZ.name,
                temperament = CatTemperament.ACOLHEDORA.name,
            )

            val owned = runCatching {
                json.decodeFromString(stringListSerializer, profile.ownedItemsJson).toMutableSet()
            }.getOrDefault(mutableSetOf())
            val equipped = runCatching {
                json.decodeFromString(stringListSerializer, profile.equippedItemsJson).toMutableSet()
            }.getOrDefault(mutableSetOf())

            if (item.category == StoreItemCategory.NOVELO_RESERVA) {
                require(profile.reserveYarnsHeld < economyEngine.config.storeReferencePrices.maxReserveYarnHeld) {
                    "Você já tem o máximo de 2 novelos reserva guardados"
                }
            }

            val now = clock.instant()
            val purchaseRef = "${item.id}:${UUID.randomUUID()}"
            val entries = mutableListOf(
                LedgerEntry(
                    id = LedgerEntryId("STORE_PURCHASE:$purchaseRef"),
                    currency = item.currency,
                    amount = -item.price,
                    ruleKey = "STORE_PURCHASE",
                    referenceId = purchaseRef,
                    createdAt = now,
                    economyConfigVersion = economyEngine.config.version,
                ).toEntity()
            )

            if (item.bondGrantedOnUse > 0L) {
                entries += LedgerEntry(
                    id = LedgerEntryId("CARE_BOND:$purchaseRef"),
                    currency = CurrencyType.VINCULO,
                    amount = item.bondGrantedOnUse,
                    ruleKey = "CARE_BOND",
                    referenceId = purchaseRef,
                    createdAt = now,
                    economyConfigVersion = economyEngine.config.version,
                ).toEntity()
            }

            ledgerDao.insertAllIgnoreDuplicates(entries)

            val nextReserve = if (item.category == StoreItemCategory.NOVELO_RESERVA) {
                profile.reserveYarnsHeld + 1
            } else {
                profile.reserveYarnsHeld
            }
            if (item.category != StoreItemCategory.COMIDA_BRINQUEDO &&
                item.category != StoreItemCategory.NOVELO_RESERVA
            ) {
                owned += item.id
                equipped += item.id
            }

            // Secao 19: Cuidar da gatinha rende vinculo e animacoes, mas NAO muda o humor!
            catProfileDao.upsert(
                profile.copy(
                    reserveYarnsHeld = nextReserve,
                    ownedItemsJson = json.encodeToString(stringListSerializer, owned.toList()),
                    equippedItemsJson = json.encodeToString(stringListSerializer, equipped.toList()),
                )
            )
        }
    }

    override suspend fun toggleEquipCosmetic(itemId: String) {
        transactionRunner.runInTransaction {
            val profile = catProfileDao.getProfile() ?: return@runInTransaction
            val equipped = runCatching {
                json.decodeFromString(stringListSerializer, profile.equippedItemsJson).toMutableSet()
            }.getOrDefault(mutableSetOf())
            if (itemId in equipped) equipped.remove(itemId) else equipped.add(itemId)
            catProfileDao.upsert(
                profile.copy(
                    equippedItemsJson = json.encodeToString(stringListSerializer, equipped.toList()),
                )
            )
        }
    }

    override suspend fun setRestMode(enabled: Boolean) {
        transactionRunner.runInTransaction {
            val profile = catProfileDao.getProfile() ?: CatProfileEntity(
                id = CatProfileDao.DEFAULT_CAT_ID,
                name = "Gatinha",
                paletteKey = "calico_default",
                currentMood = CatMood.FELIZ.name,
                temperament = CatTemperament.ACOLHEDORA.name,
            )
            catProfileDao.upsert(profile.copy(isRestModeActive = enabled))
        }
    }
}

private fun CommitmentEntity.toSeries(json: Json): RecurringCommitmentSeries =
    RecurringCommitmentSeries(
        commitmentId = CommitmentId(id),
        title = title,
        type = CommitmentType.valueOf(type),
        effort = EffortLevel.valueOf(effort),
        category = RoutineCategory.valueOf(category),
        goalId = goalId?.let(::GoalId),
        frequency = json.decodeFromString(RecurrenceFrequency.serializer(), recurrenceJson),
        plannedStartTime = plannedStartLocalTime?.let(LocalTime::parse),
        deadlineTime = LocalTime.parse(deadlineLocalTime),
        startDate = LocalDate.parse(startDateIso),
        endDate = endDateIso?.let(LocalDate::parse),
    )

private fun RecurringCommitmentSeries.toEntity(json: Json, createdAtEpochMillis: Long): CommitmentEntity =
    CommitmentEntity(
        id = commitmentId.value,
        title = title,
        type = type.name,
        effort = effort.name,
        category = category.name,
        goalId = goalId?.value,
        recurrenceJson = json.encodeToString(RecurrenceFrequency.serializer(), frequency),
        plannedStartLocalTime = plannedStartTime?.toString(),
        deadlineLocalTime = deadlineTime.toString(),
        startDateIso = startDate.toString(),
        endDateIso = endDate?.toString(),
        createdAtEpochMillis = createdAtEpochMillis,
    )
