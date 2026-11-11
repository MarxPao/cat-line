package com.deadline.core.data.backup

import com.deadline.core.data.db.CatProfileEntity
import com.deadline.core.data.db.CheckInEntity
import com.deadline.core.data.db.CommitmentEntity
import com.deadline.core.data.db.DayClosureEntity
import com.deadline.core.data.db.DeadLineDatabase
import com.deadline.core.data.db.GoalEntity
import com.deadline.core.data.db.HabitEntity
import com.deadline.core.data.db.LedgerEntryEntity
import com.deadline.core.data.db.OccurrenceEntity
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Envelope de backup JSON com `schemaVersion` e compatibilidade com versoes antigas (Secao 5 da Arquitetura).
 */
@Serializable
data class DeadLineBackupPayload(
    val schemaVersion: Int = DeadLineDatabase.SCHEMA_VERSION,
    val exportedAtEpochMillis: Long,
    val commitmentsCount: Int = 0,
    val occurrencesCount: Int = 0,
    val ledgerEntriesCount: Int = 0,
    val goalsCount: Int = 0,
    val goalStepsCount: Int = 0,
    val checkInsCount: Int = 0,
    val rewardEventsCount: Int = 0,
    val dayClosuresCount: Int = 0,
    val weeklyLogsCount: Int = 0,
) {
    companion object {
        const val MIN_SUPPORTED_SCHEMA_VERSION = 1

        private val json = Json {
            ignoreUnknownKeys = true
            prettyPrint = true
        }

        fun encode(payload: DeadLineBackupPayload): String =
            json.encodeToString(serializer(), payload)

        fun decodeAndValidate(rawJson: String): Result<DeadLineBackupPayload> = runCatching {
            val decoded = json.decodeFromString(serializer(), rawJson)
            require(decoded.schemaVersion >= MIN_SUPPORTED_SCHEMA_VERSION) {
                "schemaVersion invalida: ${decoded.schemaVersion}"
            }
            require(decoded.schemaVersion <= DeadLineDatabase.SCHEMA_VERSION) {
                "Backup gerado por uma versao mais nova do app (${decoded.schemaVersion} > ${DeadLineDatabase.SCHEMA_VERSION})"
            }
            decoded
        }
    }
}
