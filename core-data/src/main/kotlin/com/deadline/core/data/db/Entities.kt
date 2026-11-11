package com.deadline.core.data.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * 1. Compromisso (Secao 18 · Dados):
 * IDs em UUID texto; exclusao logica (`deletedAtEpochMillis != null`).
 */
@Entity(
    tableName = "commitments",
    indices = [
        Index(value = ["goalId"]),
        Index(value = ["stepId"]),
        Index(value = ["deletedAtEpochMillis"]),
    ],
)
data class CommitmentEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val type: String,
    val effort: String,
    val category: String,
    val goalId: String?,
    val stepId: String? = null,
    val recurrenceJson: String,
    val plannedStartLocalTime: String?,
    val plannedZone: String = "America/Sao_Paulo",
    val deadlineLocalTime: String,
    val startDateIso: String,
    val endDateIso: String?,
    val state: String = "pending",
    val rescheduledFromId: String? = null,
    val createdAtEpochMillis: Long,
    val deletedAtEpochMillis: Long? = null,
)

/**
 * 2. Ocorrencia (Secao 18 · Dados):
 * Guarda `dayKey` (ISO-8601), `zoneId`, inicio planejado, prazo e estado (PENDENTE, FEITO, PERDIDO, PULADO).
 */
@Entity(
    tableName = "occurrences",
    indices = [
        Index(value = ["dayKey"]),
        Index(value = ["commitmentId", "dayKey"], unique = true),
        Index(value = ["state"]),
        Index(value = ["stepId"]),
    ],
)
data class OccurrenceEntity(
    @PrimaryKey
    val id: String,
    val commitmentId: String,
    val title: String,
    val type: String,
    val effort: String,
    val category: String,
    val goalId: String?,
    val stepId: String? = null,
    val dayKey: String,
    val zoneId: String,
    val plannedStartEpochMillis: Long?,
    val deadlineEpochMillis: Long,
    val state: String,
    val rescheduledFromId: String? = null,
)

/**
 * 3. Check-in (Secao 18 · Dados):
 * Instante real, origem (TOQUE, NOTIFICACAO, RETROATIVO) e atraso em minutos ja calculado.
 */
@Entity(
    tableName = "check_ins",
    indices = [
        Index(value = ["checkedInAtEpochMillis"]),
        Index(value = ["commitmentId"]),
    ],
)
data class CheckInEntity(
    @PrimaryKey
    val occurrenceId: String,
    val checkedInAtEpochMillis: Long,
    val origin: String,
    val delayMinutes: Long,
    val delayTier: String,
    val editCount: Int = 0,
    val id: String? = null,
    val commitmentId: String? = null,
    val actualAtEpochMillis: Long? = null,
    val retroactive: Boolean = false,
    val lateMinutes: Long = 0L,
)

/**
 * 4. Habito e registro diario (Secao 18 · Dados):
 * Exclusao logica em habitos; suporte a novelo reserva na sequencia.
 */
@Entity(
    tableName = "habits",
    indices = [Index(value = ["deletedAtEpochMillis"])],
)
data class HabitEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val category: String,
    val frequencyJson: String,
    val windowStartLocalTime: String?,
    val windowEndLocalTime: String,
    val weeklyTarget: Int,
    val currentStreakDays: Int = 0,
    val createdAtEpochMillis: Long,
    val deletedAtEpochMillis: Long? = null,
)

@Entity(
    tableName = "habit_logs",
    primaryKeys = ["habitId", "dayKey"],
    indices = [Index(value = ["dayKey"])],
)
data class HabitDailyLogEntity(
    val habitId: String,
    val dayKey: String,
    val completedAtEpochMillis: Long?,
    val usedReserveYarn: Boolean = false,
)

/**
 * 5. Meta (Secao 18 · Dados):
 * Hierarquia (VIDA, TRIMESTRE, MES, SEMANA, TAREFA), meta-pai, prazo e exclusao logica.
 */
@Entity(
    tableName = "goals",
    indices = [
        Index(value = ["parentGoalId"]),
        Index(value = ["deletedAtEpochMillis"]),
    ],
)
data class GoalEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val horizon: String,
    val parentGoalId: String?,
    val deadlineDayKey: String?,
    val progressFraction: Double = 0.0,
    val realRewardTitle: String? = null,
    val realRewardSuggestedFishCost: Long? = null,
    val yarnColor: String = "pink",
    val targetDateIso: String? = null,
    val archived: Boolean = false,
    val createdAtEpochMillis: Long,
    val completedAtEpochMillis: Long? = null,
    val deletedAtEpochMillis: Long? = null,
)

/**
 * 5.1 Passos da Meta (v3.2.0):
 * Passos editaveis com ordem, estimativa e conclusao independente.
 */
@Entity(
    tableName = "goal_steps",
    indices = [
        Index(value = ["goalId"]),
        Index(value = ["order"]),
    ],
    foreignKeys = [
        ForeignKey(
            entity = GoalEntity::class,
            parentColumns = ["id"],
            childColumns = ["goalId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class GoalStepEntity(
    @PrimaryKey
    val id: String,
    val goalId: String,
    val title: String,
    @ColumnInfo(name = "order")
    val order: Int,
    val estMinutes: Int? = null,
    val targetDateIso: String? = null,
    val doneAtEpochMillis: Long? = null,
    val archived: Boolean = false,
)

/**
 * 6. Livro-caixa imutavel (Secao 18, AD-08 e AD-09):
 * So recebe inserts. Indice unico `(ruleKey, referenceId, currency)` garante que cada regra
 * pague no maximo uma vez por ocorrencia/referencia.
 */
@Entity(
    tableName = "ledger_entries",
    indices = [
        Index(value = ["ruleKey", "referenceId", "currency"], unique = true),
        Index(value = ["currency"]),
        Index(value = ["createdAtEpochMillis"]),
    ],
)
data class LedgerEntryEntity(
    @PrimaryKey
    val id: String,
    val currency: String,
    val amount: Long,
    val ruleKey: String,
    val referenceId: String,
    val createdAtEpochMillis: Long,
    val economyConfigVersion: Int,
)

/**
 * Fechamento diario idempotente chaveado por `dayKey` (AD-09 e Secao 7).
 */
@Entity(tableName = "day_closures")
data class DayClosureEntity(
    @PrimaryKey
    val dayKey: String,
    val tier: String,
    val medianDelayMinutes: Double,
    val meanDelayMinutes: Double,
    val onTimePercentage: Double,
    val resultingMood: String,
    val closedAtEpochMillis: Long,
)

/**
 * 7. Gatinha e inventario (Secao 18 · Dados).
 */
@Entity(tableName = "cat_profiles")
data class CatProfileEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val paletteKey: String,
    val currentMood: String,
    val temperament: String,
    val reserveYarnsHeld: Int = 0,
    val equippedItemsJson: String = "[]",
    val ownedItemsJson: String = "[]",
    val isRestModeActive: Boolean = false,
)

/**
 * 8. Uso de apps em baldes por hora (Secao 5 da Arquitetura e Secao 22 do Briefing):
 * Chave composta `(packageName, hourStartEpochMillis)` e retencao de 180 dias.
 */
@Entity(
    tableName = "app_usage_buckets",
    primaryKeys = ["packageName", "hourStartEpochMillis"],
    indices = [Index(value = ["hourStartEpochMillis"])],
)
data class AppUsageHourlyBucketEntity(
    val packageName: String,
    val hourStartEpochMillis: Long,
    val foregroundMillis: Long,
)

/**
 * 9. Bloqueio e sessoes de desbloqueio (Secao 18 e Secao 22).
 */
@Entity(tableName = "block_rules")
data class BlockRuleEntity(
    @PrimaryKey
    val packageName: String,
    val rigorLevel: Int,
    val activeDaysMask: Int,
    val windowStartLocalTime: String,
    val windowEndLocalTime: String,
    val requiredCommitmentIdsJson: String = "[]",
    val unlockPassMinutes: Int = 15,
    val enabled: Boolean = true,
)

@Entity(
    tableName = "unlock_sessions",
    indices = [Index(value = ["packageName", "expiresAtEpochMillis"])],
)
data class UnlockSessionEntity(
    @PrimaryKey
    val id: String,
    val packageName: String,
    val grantedAtEpochMillis: Long,
    val expiresAtEpochMillis: Long,
    val reason: String,
)

/**
 * 10. Conversa criptografada (Secao 18 e AD-16):
 * O texto fica criptografado em `cipherTextBase64` (AES-GCM via Tink/Keystore).
 */
@Entity(
    tableName = "conversation_messages",
    indices = [Index(value = ["createdAtEpochMillis"])],
)
data class ConversationMessageEntity(
    @PrimaryKey
    val id: String,
    val role: String,
    @ColumnInfo(name = "cipherTextBase64")
    val cipherTextBase64: String,
    val personaVariant: String,
    val mode: String,
    val createdAtEpochMillis: Long,
)

/**
 * 11. Evento de Recompensa Idempotente (v3.2.0):
 * Livro-razao com indice UNIQUE em idempotencyKey e tetos anti-farm.
 */
@Entity(
    tableName = "reward_events",
    indices = [
        Index(value = ["idempotencyKey"], unique = true),
        Index(value = ["logicalDay"]),
        Index(value = ["atEpochMillis"]),
    ],
)
data class RewardEventEntity(
    @PrimaryKey
    val id: String,
    val idempotencyKey: String,
    val kind: String,
    val fishDelta: Long,
    val bondDelta: Long,
    val refId: String,
    val atEpochMillis: Long,
    val logicalDay: String,
)

/**
 * 12. Log Semanal (v3.2.0):
 * Snapshot imutavel da semana gerado no fechamento.
 */
@Entity(
    tableName = "weekly_logs",
)
data class WeeklyLogEntity(
    @PrimaryKey
    val weekStartLogicalDay: String,
    val snapshotJson: String,
    val configVersion: Int,
    val createdAtEpochMillis: Long,
)
