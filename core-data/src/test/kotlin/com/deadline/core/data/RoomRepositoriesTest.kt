package com.deadline.core.data

import com.deadline.core.data.backup.DeadLineBackupPayload
import com.deadline.core.data.db.CheckInEntity
import com.deadline.core.data.db.LedgerDao
import com.deadline.core.data.db.LedgerEntryEntity
import com.deadline.core.data.db.OccurrenceDao
import com.deadline.core.data.db.OccurrenceEntity
import com.deadline.core.data.db.RuleRefProjection
import com.deadline.core.data.repository.RoomLedgerRepository
import com.deadline.core.data.repository.RoomOccurrenceRepository
import com.deadline.core.data.repository.TransactionRunner
import com.deadline.core.domain.config.EconomyConfig
import com.deadline.core.domain.engine.DelayEngine
import com.deadline.core.domain.engine.EconomyEngine
import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.event.InMemoryEventBus
import com.deadline.core.domain.model.CheckInCommand
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.CurrencyType
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.time.FakeClock
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

class RoomRepositoriesTest {

    private val saoPauloZone = ZoneId.of("America/Sao_Paulo")
    private val deadlineInstant = ZonedDateTime.of(2026, 10, 25, 14, 0, 0, 0, saoPauloZone).toInstant()
    private val clock = FakeClock(currentInstant = deadlineInstant, currentZone = saoPauloZone)

    @Test
    fun `registerCheckIn grava estado, checkIn e livro-caixa na mesma transacao e publica evento so apos commit`() = runTest {
        val occurrenceDao = FakeOccurrenceDao()
        val ledgerDao = FakeLedgerDao()
        val eventBus = InMemoryEventBus(replay = 4)
        var insideTransaction = false
        var eventPublishedWhileInTransaction = false

        val txRunner = TransactionRunner { block ->
            insideTransaction = true
            try {
                block()
            } finally {
                insideTransaction = false
            }
        }

        val repo = RoomOccurrenceRepository(
            occurrenceDao = occurrenceDao,
            ledgerDao = ledgerDao,
            transactionRunner = txRunner,
            delayEngine = DelayEngine(),
            economyEngine = EconomyEngine(EconomyConfig.loadBundled()),
            eventBus = object : com.deadline.core.domain.event.EventBus by eventBus {
                override suspend fun publish(e: DomainEvent) {
                    if (insideTransaction) {
                        eventPublishedWhileInTransaction = true
                    }
                    eventBus.publish(e)
                }
            },
            clock = clock,
        )
        val ledgerRepo = RoomLedgerRepository(ledgerDao)

        occurrenceDao.upsertAll(
            listOf(
                OccurrenceEntity(
                    id = "occ-1",
                    commitmentId = "c-1",
                    title = "Estudar arquitetura",
                    type = CommitmentType.TAREFA.name,
                    effort = EffortLevel.M.name, // base 10 peixinhos
                    category = RoutineCategory.ESTUDAR_LER.name,
                    goalId = null,
                    dayKey = LocalDate.of(2026, 10, 25).toString(),
                    zoneId = saoPauloZone.id,
                    plannedStartEpochMillis = null,
                    deadlineEpochMillis = deadlineInstant.toEpochMilli(),
                    state = OccurrenceState.PENDENTE.name,
                )
            )
        )

        // 1. Check-in no prazo -> ganha 10 peixinhos + 10 vinculo
        val result = repo.registerCheckIn(
            CheckInCommand(
                occurrenceId = OccurrenceId("occ-1"),
                checkedInAt = deadlineInstant,
                origin = CheckInOrigin.TOQUE,
            )
        )

        assertEquals(OccurrenceState.FEITO, result.occurrence.state)
        assertEquals(2, result.ledgerEntries.size)
        assertTrue("Evento so pode sair apos o commit da transacao (AD-08)", !eventPublishedWhileInTransaction)

        val balances = ledgerRepo.balance().first()
        assertEquals(10L, balances.peixinhos)
        assertEquals(10L, balances.vinculo)

        // 2. Idempotencia (AD-09): repetir exatamente o mesmo check-in nao duplica moedas
        val duplicateResult = repo.registerCheckIn(
            CheckInCommand(
                occurrenceId = OccurrenceId("occ-1"),
                checkedInAt = deadlineInstant,
                origin = CheckInOrigin.TOQUE,
            )
        )
        assertTrue(duplicateResult.ledgerEntries.isEmpty())
        assertEquals(10L, ledgerRepo.balance().first().peixinhos)

        // 3. Edicao retroativa para 45 min de atraso (ATRASADO_FORTE = 0.3x e RETROATIVO = 0.5x -> 10 * 0.3 * 0.5 = 2 peixinhos)
        //    Deve lancar compensacao de -8 peixinhos no livro-caixa, ajustando saldo para 2 sem ficar negativo
        val editedResult = repo.registerCheckIn(
            CheckInCommand(
                occurrenceId = OccurrenceId("occ-1"),
                checkedInAt = deadlineInstant.plusSeconds(45 * 60),
                origin = CheckInOrigin.RETROATIVO,
            )
        )
        assertEquals(1, editedResult.ledgerEntries.size)
        assertEquals(-8L, editedResult.ledgerEntries.first().amount)
        assertEquals(2L, ledgerRepo.balance().first().peixinhos)
        assertEquals(10L, ledgerRepo.balance().first().vinculo) // Vinculo nunca diminui
    }

    @Test
    fun `DeadLineBackupPayload valida schemaVersion ao importar`() {
        val validJson = DeadLineBackupPayload.encode(
            DeadLineBackupPayload(
                schemaVersion = 1,
                exportedAtEpochMillis = Instant.parse("2026-10-25T12:00:00Z").toEpochMilli(),
                commitmentsCount = 3,
                occurrencesCount = 12,
                ledgerEntriesCount = 24,
            )
        )
        assertTrue(DeadLineBackupPayload.decodeAndValidate(validJson).isSuccess)

        val futureSchemaJson = """{"schemaVersion": 99, "exportedAtEpochMillis": 1000}"""
        assertTrue(DeadLineBackupPayload.decodeAndValidate(futureSchemaJson).isFailure)
    }

    private class FakeOccurrenceDao : OccurrenceDao {
        private val occurrences = MutableStateFlow<Map<String, OccurrenceEntity>>(emptyMap())
        private val checkIns = mutableMapOf<String, CheckInEntity>()

        override fun observeByDayKey(dayKey: String): Flow<List<OccurrenceEntity>> =
            occurrences.map { map ->
                map.values.filter { it.dayKey == dayKey }.sortedBy { it.deadlineEpochMillis }
            }

        override suspend fun getByDayKey(dayKey: String): List<OccurrenceEntity> =
            occurrences.value.values.filter { it.dayKey == dayKey }.sortedBy { it.deadlineEpochMillis }

        override fun observeAll(): Flow<List<OccurrenceEntity>> =
            occurrences.map { it.values.toList() }

        override suspend fun getByCommitmentId(commitmentId: String): List<OccurrenceEntity> =
            occurrences.value.values.filter { it.commitmentId == commitmentId }

        override suspend fun getById(id: String): OccurrenceEntity? = occurrences.value[id]

        override suspend fun upsertAll(occurrences: List<OccurrenceEntity>) {
            val next = this.occurrences.value.toMutableMap()
            occurrences.forEach { next[it.id] = it }
            this.occurrences.value = next
        }

        override suspend fun deletePendingForCommitment(commitmentId: String) {
            occurrences.value = occurrences.value.filterValues {
                !(it.commitmentId == commitmentId && it.state == OccurrenceState.PENDENTE.name)
            }
        }

        override suspend fun updateState(id: String, newState: String) {
            val current = occurrences.value[id] ?: return
            occurrences.value = occurrences.value + (id to current.copy(state = newState))
        }

        override suspend fun getCheckIn(occurrenceId: String): CheckInEntity? = checkIns[occurrenceId]

        override fun observeAllCheckIns(): Flow<List<CheckInEntity>> =
            MutableStateFlow(checkIns.values.toList())

        override suspend fun getCheckInsForOccurrences(occurrenceIds: List<String>): List<CheckInEntity> =
            occurrenceIds.mapNotNull { checkIns[it] }

        override suspend fun upsertCheckIn(checkIn: CheckInEntity) {
            checkIns[checkIn.occurrenceId] = checkIn
        }

        override suspend fun clearAllOccurrences() {
            occurrences.value = emptyMap()
        }

        override suspend fun clearAllCheckIns() {
            checkIns.clear()
        }
    }

    private class FakeLedgerDao : LedgerDao {
        private val entries = MutableStateFlow<List<LedgerEntryEntity>>(emptyList())

        override suspend fun insertAllIgnoreDuplicates(entries: List<LedgerEntryEntity>): List<Long> {
            val current = this.entries.value.toMutableList()
            val results = mutableListOf<Long>()
            entries.forEach { candidate ->
                val exists = current.any {
                    it.ruleKey == candidate.ruleKey &&
                        it.referenceId == candidate.referenceId &&
                        it.currency == candidate.currency
                }
                if (exists) {
                    results += -1L
                } else {
                    current += candidate
                    results += current.size.toLong()
                }
            }
            this.entries.value = current
            return results
        }

        override fun observeAll(): Flow<List<LedgerEntryEntity>> = entries

        override suspend fun getAll(): List<LedgerEntryEntity> = entries.value

        override suspend fun getRulesForReference(referenceId: String): List<RuleRefProjection> =
            entries.value
                .filter { it.referenceId == referenceId }
                .map { RuleRefProjection(it.ruleKey, it.referenceId) }
    }
}
