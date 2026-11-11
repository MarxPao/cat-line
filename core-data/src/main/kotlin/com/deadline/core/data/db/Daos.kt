package com.deadline.core.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface OccurrenceDao {
    @Query("SELECT * FROM occurrences WHERE dayKey = :dayKey ORDER BY deadlineEpochMillis ASC")
    fun observeByDayKey(dayKey: String): Flow<List<OccurrenceEntity>>

    @Query("SELECT * FROM occurrences ORDER BY dayKey DESC, deadlineEpochMillis ASC")
    fun observeAll(): Flow<List<OccurrenceEntity>>

    @Query("SELECT * FROM occurrences WHERE dayKey = :dayKey ORDER BY deadlineEpochMillis ASC")
    suspend fun getByDayKey(dayKey: String): List<OccurrenceEntity>

    @Query("SELECT * FROM occurrences WHERE commitmentId = :commitmentId ORDER BY dayKey ASC")
    suspend fun getByCommitmentId(commitmentId: String): List<OccurrenceEntity>

    @Query("SELECT * FROM occurrences WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): OccurrenceEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(occurrences: List<OccurrenceEntity>)

    @Query("DELETE FROM occurrences WHERE commitmentId = :commitmentId AND state = 'PENDENTE'")
    suspend fun deletePendingForCommitment(commitmentId: String)

    @Query("UPDATE occurrences SET state = :newState WHERE id = :id")
    suspend fun updateState(id: String, newState: String)

    @Query("SELECT * FROM check_ins WHERE occurrenceId = :occurrenceId LIMIT 1")
    suspend fun getCheckIn(occurrenceId: String): CheckInEntity?

    @Query("SELECT * FROM check_ins")
    fun observeAllCheckIns(): Flow<List<CheckInEntity>>

    @Query("SELECT * FROM check_ins WHERE occurrenceId IN (:occurrenceIds)")
    suspend fun getCheckInsForOccurrences(occurrenceIds: List<String>): List<CheckInEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCheckIn(checkIn: CheckInEntity)

    @Query("DELETE FROM occurrences")
    suspend fun clearAllOccurrences()

    @Query("DELETE FROM check_ins")
    suspend fun clearAllCheckIns()
}

@Dao
interface LedgerDao {
    /**
     * AD-08 / AD-09: Livro-caixa e somente insercao; IGNORE respeita o indice unico
     * `(ruleKey, referenceId, currency)` garantindo idempotencia mesmo em chamadas repetidas.
     */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAllIgnoreDuplicates(entries: List<LedgerEntryEntity>): List<Long>

    @Query("SELECT * FROM ledger_entries ORDER BY createdAtEpochMillis ASC")
    fun observeAll(): Flow<List<LedgerEntryEntity>>

    @Query("SELECT * FROM ledger_entries ORDER BY createdAtEpochMillis ASC")
    suspend fun getAll(): List<LedgerEntryEntity>

    @Query("SELECT ruleKey, referenceId FROM ledger_entries WHERE referenceId = :referenceId")
    suspend fun getRulesForReference(referenceId: String): List<RuleRefProjection>
}

data class RuleRefProjection(
    val ruleKey: String,
    val referenceId: String,
)

@Dao
interface DayClosureDao {
    @Query("SELECT * FROM day_closures WHERE dayKey = :dayKey LIMIT 1")
    suspend fun getByDayKey(dayKey: String): DayClosureEntity?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnoreDuplicate(closure: DayClosureEntity): Long

    @Query("SELECT * FROM day_closures ORDER BY dayKey DESC LIMIT :limit")
    suspend fun getRecentClosures(limit: Int): List<DayClosureEntity>
}

@Dao
interface CatProfileDao {
    @Query("SELECT * FROM cat_profiles WHERE id = :id LIMIT 1")
    fun observeProfile(id: String = DEFAULT_CAT_ID): Flow<CatProfileEntity?>

    @Query("SELECT * FROM cat_profiles WHERE id = :id LIMIT 1")
    suspend fun getProfile(id: String = DEFAULT_CAT_ID): CatProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(profile: CatProfileEntity)

    companion object {
        const val DEFAULT_CAT_ID = "calico_main"
    }
}

@Dao
interface AppUsageDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertBuckets(buckets: List<AppUsageHourlyBucketEntity>)

    @Query(
        "SELECT * FROM app_usage_buckets " +
            "WHERE hourStartEpochMillis >= :fromEpochMillis AND hourStartEpochMillis < :toEpochMillis " +
            "ORDER BY hourStartEpochMillis ASC"
    )
    suspend fun getBucketsInRange(fromEpochMillis: Long, toEpochMillis: Long): List<AppUsageHourlyBucketEntity>

    /** Retencao de 180 dias (Secao 5 da Arquitetura e Secao 22). */
    @Query("DELETE FROM app_usage_buckets WHERE hourStartEpochMillis < :cutoffEpochMillis")
    suspend fun purgeOlderThan(cutoffEpochMillis: Long): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertBlockRule(rule: BlockRuleEntity)

    @Query("SELECT * FROM block_rules ORDER BY packageName ASC")
    fun observeAllBlockRules(): Flow<List<BlockRuleEntity>>

    @Query("SELECT * FROM block_rules WHERE enabled = 1")
    suspend fun getEnabledBlockRules(): List<BlockRuleEntity>

    @Query("DELETE FROM block_rules WHERE packageName = :packageName")
    suspend fun deleteBlockRule(packageName: String)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUnlockSession(session: UnlockSessionEntity)

    @Query("SELECT * FROM unlock_sessions WHERE expiresAtEpochMillis > :nowEpochMillis")
    suspend fun getActiveUnlockSessions(nowEpochMillis: Long): List<UnlockSessionEntity>
}

@Dao
interface CommitmentAndGoalDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCommitment(commitment: CommitmentEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCommitments(commitments: List<CommitmentEntity>)

    @Query("SELECT * FROM commitments WHERE deletedAtEpochMillis IS NULL ORDER BY createdAtEpochMillis DESC")
    fun observeActiveCommitments(): Flow<List<CommitmentEntity>>

    @Query("SELECT * FROM commitments WHERE deletedAtEpochMillis IS NULL")
    suspend fun getActiveCommitments(): List<CommitmentEntity>

    @Query("UPDATE commitments SET deletedAtEpochMillis = :deletedAtEpochMillis WHERE id = :id")
    suspend fun softDeleteCommitment(id: String, deletedAtEpochMillis: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertHabit(habit: HabitEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertHabits(habits: List<HabitEntity>)

    @Query("SELECT * FROM habits WHERE deletedAtEpochMillis IS NULL ORDER BY createdAtEpochMillis ASC")
    fun observeActiveHabits(): Flow<List<HabitEntity>>

    @Query("SELECT * FROM habits WHERE id = :id LIMIT 1")
    suspend fun getHabitById(id: String): HabitEntity?

    @Query("SELECT * FROM habits WHERE deletedAtEpochMillis IS NULL")
    suspend fun getActiveHabits(): List<HabitEntity>

    @Update
    suspend fun updateHabit(habit: HabitEntity)

    @Query("UPDATE habits SET deletedAtEpochMillis = :deletedAtEpochMillis WHERE id = :id")
    suspend fun softDeleteHabit(id: String, deletedAtEpochMillis: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertHabitLog(log: HabitDailyLogEntity)

    @Query("SELECT * FROM habit_logs WHERE dayKey = :dayKey")
    fun observeHabitLogsForDay(dayKey: String): Flow<List<HabitDailyLogEntity>>

    @Query("SELECT * FROM habit_logs WHERE habitId = :habitId AND dayKey = :dayKey LIMIT 1")
    suspend fun getHabitLog(habitId: String, dayKey: String): HabitDailyLogEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertGoal(goal: GoalEntity)

    @Query("SELECT * FROM goals WHERE deletedAtEpochMillis IS NULL ORDER BY createdAtEpochMillis ASC")
    fun observeActiveGoals(): Flow<List<GoalEntity>>

    @Query("SELECT * FROM goals WHERE id = :id LIMIT 1")
    suspend fun getGoalById(id: String): GoalEntity?

    @Query("UPDATE goals SET deletedAtEpochMillis = :deletedAtEpochMillis WHERE id = :id")
    suspend fun softDeleteGoal(id: String, deletedAtEpochMillis: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConversationMessage(message: ConversationMessageEntity)

    @Query("SELECT * FROM conversation_messages ORDER BY createdAtEpochMillis ASC")
    fun observeConversationMessages(): Flow<List<ConversationMessageEntity>>

    @Query("DELETE FROM conversation_messages")
    suspend fun clearAllConversationMessages()

    @Query("DELETE FROM commitments")
    suspend fun clearAllCommitments()

    @Query("DELETE FROM habits")
    suspend fun clearAllHabits()

    @Query("DELETE FROM habit_logs")
    suspend fun clearAllHabitLogs()

    @Query("DELETE FROM goals")
    suspend fun clearAllGoals()
}

@Dao
interface GoalStepDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertGoalStep(step: GoalStepEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertGoalSteps(steps: List<GoalStepEntity>)

    @Query("SELECT * FROM goal_steps WHERE goalId = :goalId AND archived = 0 ORDER BY `order` ASC")
    fun observeActiveStepsForGoal(goalId: String): Flow<List<GoalStepEntity>>

    @Query("SELECT * FROM goal_steps WHERE goalId = :goalId ORDER BY `order` ASC")
    suspend fun getAllStepsForGoal(goalId: String): List<GoalStepEntity>

    @Query("SELECT * FROM goal_steps WHERE id = :id LIMIT 1")
    suspend fun getStepById(id: String): GoalStepEntity?

    @Query("UPDATE goal_steps SET doneAtEpochMillis = :doneAtEpochMillis WHERE id = :id")
    suspend fun markStepDone(id: String, doneAtEpochMillis: Long?)

    @Query("DELETE FROM goal_steps WHERE id = :id")
    suspend fun deleteStep(id: String)

    @Query("DELETE FROM goal_steps")
    suspend fun clearAllSteps()
}

@Dao
interface RewardEventDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnoreDuplicate(event: RewardEventEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAllIgnoreDuplicates(events: List<RewardEventEntity>): List<Long>

    @Query("SELECT * FROM reward_events WHERE idempotencyKey = :idempotencyKey LIMIT 1")
    suspend fun getByIdempotencyKey(idempotencyKey: String): RewardEventEntity?

    @Query("SELECT * FROM reward_events WHERE logicalDay = :logicalDay ORDER BY atEpochMillis ASC")
    suspend fun getByLogicalDay(logicalDay: String): List<RewardEventEntity>

    @Query("SELECT * FROM reward_events WHERE refId = :refId ORDER BY atEpochMillis ASC")
    suspend fun getByRefId(refId: String): List<RewardEventEntity>

    @Query("SELECT * FROM reward_events ORDER BY atEpochMillis DESC")
    fun observeAll(): Flow<List<RewardEventEntity>>

    @Query("DELETE FROM reward_events")
    suspend fun clearAllRewardEvents()
}

@Dao
interface WeeklyLogDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(log: WeeklyLogEntity)

    @Query("SELECT * FROM weekly_logs WHERE weekStartLogicalDay = :weekStartLogicalDay LIMIT 1")
    suspend fun getByWeekStart(weekStartLogicalDay: String): WeeklyLogEntity?

    @Query("SELECT * FROM weekly_logs ORDER BY weekStartLogicalDay DESC")
    fun observeAll(): Flow<List<WeeklyLogEntity>>

    @Query("DELETE FROM weekly_logs")
    suspend fun clearAllWeeklyLogs()
}
