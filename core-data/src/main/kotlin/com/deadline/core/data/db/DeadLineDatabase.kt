package com.deadline.core.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        CommitmentEntity::class,
        OccurrenceEntity::class,
        CheckInEntity::class,
        HabitEntity::class,
        HabitDailyLogEntity::class,
        GoalEntity::class,
        GoalStepEntity::class,
        LedgerEntryEntity::class,
        RewardEventEntity::class,
        DayClosureEntity::class,
        WeeklyLogEntity::class,
        CatProfileEntity::class,
        AppUsageHourlyBucketEntity::class,
        BlockRuleEntity::class,
        UnlockSessionEntity::class,
        ConversationMessageEntity::class,
    ],
    version = DeadLineDatabase.SCHEMA_VERSION,
    exportSchema = true,
)
abstract class DeadLineDatabase : RoomDatabase() {
    abstract fun occurrenceDao(): OccurrenceDao
    abstract fun ledgerDao(): LedgerDao
    abstract fun dayClosureDao(): DayClosureDao
    abstract fun catProfileDao(): CatProfileDao
    abstract fun appUsageDao(): AppUsageDao
    abstract fun commitmentAndGoalDao(): CommitmentAndGoalDao
    abstract fun goalStepDao(): GoalStepDao
    abstract fun rewardEventDao(): RewardEventDao
    abstract fun weeklyLogDao(): WeeklyLogDao

    companion object {
        const val SCHEMA_VERSION: Int = 2
        const val DATABASE_NAME: String = "deadline.db"

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // 1. Criar tabela goal_steps
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `goal_steps` (
                        `id` TEXT NOT NULL,
                        `goalId` TEXT NOT NULL,
                        `title` TEXT NOT NULL,
                        `order` INTEGER NOT NULL,
                        `estMinutes` INTEGER,
                        `targetDateIso` TEXT,
                        `doneAtEpochMillis` INTEGER,
                        `archived` INTEGER NOT NULL DEFAULT 0,
                        PRIMARY KEY(`id`),
                        FOREIGN KEY(`goalId`) REFERENCES `goals`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_goal_steps_goalId` ON `goal_steps` (`goalId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_goal_steps_order` ON `goal_steps` (`order`)")

                // 2. Colunas novas em goals
                db.execSQL("ALTER TABLE `goals` ADD COLUMN `yarnColor` TEXT NOT NULL DEFAULT 'pink'")
                db.execSQL("ALTER TABLE `goals` ADD COLUMN `targetDateIso` TEXT")
                db.execSQL("ALTER TABLE `goals` ADD COLUMN `archived` INTEGER NOT NULL DEFAULT 0")

                // 3. Colunas novas em commitments
                db.execSQL("ALTER TABLE `commitments` ADD COLUMN `stepId` TEXT")
                db.execSQL("ALTER TABLE `commitments` ADD COLUMN `plannedZone` TEXT NOT NULL DEFAULT 'America/Sao_Paulo'")
                db.execSQL("ALTER TABLE `commitments` ADD COLUMN `state` TEXT NOT NULL DEFAULT 'pending'")
                db.execSQL("ALTER TABLE `commitments` ADD COLUMN `rescheduledFromId` TEXT")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_commitments_stepId` ON `commitments` (`stepId`)")

                // 4. Colunas novas em occurrences
                db.execSQL("ALTER TABLE `occurrences` ADD COLUMN `stepId` TEXT")
                db.execSQL("ALTER TABLE `occurrences` ADD COLUMN `rescheduledFromId` TEXT")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_occurrences_stepId` ON `occurrences` (`stepId`)")

                // 5. Colunas novas em check_ins
                db.execSQL("ALTER TABLE `check_ins` ADD COLUMN `id` TEXT")
                db.execSQL("ALTER TABLE `check_ins` ADD COLUMN `commitmentId` TEXT")
                db.execSQL("ALTER TABLE `check_ins` ADD COLUMN `actualAtEpochMillis` INTEGER")
                db.execSQL("ALTER TABLE `check_ins` ADD COLUMN `retroactive` INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE `check_ins` ADD COLUMN `lateMinutes` INTEGER NOT NULL DEFAULT 0")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_check_ins_commitmentId` ON `check_ins` (`commitmentId`)")

                // Migracao de dados existentes em check_ins
                db.execSQL("""
                    UPDATE `check_ins` SET 
                        `id` = 'chk_' || `occurrenceId`,
                        `commitmentId` = `occurrenceId`,
                        `actualAtEpochMillis` = `checkedInAtEpochMillis`,
                        `lateMinutes` = `delayMinutes`,
                        `retroactive` = CASE WHEN `origin` = 'RETROATIVO' THEN 1 ELSE 0 END
                    WHERE `id` IS NULL
                """.trimIndent())

                // 6. Criar tabela reward_events com indice UNIQUE em idempotencyKey
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `reward_events` (
                        `id` TEXT NOT NULL,
                        `idempotencyKey` TEXT NOT NULL,
                        `kind` TEXT NOT NULL,
                        `fishDelta` INTEGER NOT NULL,
                        `bondDelta` INTEGER NOT NULL,
                        `refId` TEXT NOT NULL,
                        `atEpochMillis` INTEGER NOT NULL,
                        `logicalDay` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                """.trimIndent())
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_reward_events_idempotencyKey` ON `reward_events` (`idempotencyKey`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_reward_events_logicalDay` ON `reward_events` (`logicalDay`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_reward_events_atEpochMillis` ON `reward_events` (`atEpochMillis`)")

                // 7. Criar tabela weekly_logs
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `weekly_logs` (
                        `weekStartLogicalDay` TEXT NOT NULL,
                        `snapshotJson` TEXT NOT NULL,
                        `configVersion` INTEGER NOT NULL,
                        `createdAtEpochMillis` INTEGER NOT NULL,
                        PRIMARY KEY(`weekStartLogicalDay`)
                    )
                """.trimIndent())
            }
        }

        val ALL_MIGRATIONS: Array<Migration> = arrayOf(MIGRATION_1_2)
    }
}
