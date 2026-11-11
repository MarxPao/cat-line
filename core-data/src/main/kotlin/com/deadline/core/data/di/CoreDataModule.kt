package com.deadline.core.data.di

import android.content.Context
import androidx.room.Room
import com.deadline.core.data.config.JsonGameConfigLoader
import com.deadline.core.data.db.AppUsageDao
import com.deadline.core.data.db.CatProfileDao
import com.deadline.core.data.db.CommitmentAndGoalDao
import com.deadline.core.data.db.DayClosureDao
import com.deadline.core.data.db.DeadLineDatabase
import com.deadline.core.data.db.LedgerDao
import com.deadline.core.data.db.OccurrenceDao
import com.deadline.core.data.repository.DefaultDayRolloverHandler
import com.deadline.core.data.repository.RoomAgendaRepository
import com.deadline.core.data.repository.RoomBackupRepository
import com.deadline.core.data.repository.RoomConversationRepository
import com.deadline.core.data.repository.RoomFocusControlRepository
import com.deadline.core.data.repository.RoomGoalRepository
import com.deadline.core.data.repository.RoomHabitRepository
import com.deadline.core.data.repository.RoomInsightsRepository
import com.deadline.core.data.repository.RoomLedgerRepository
import com.deadline.core.data.repository.RoomOccurrenceRepository
import com.deadline.core.data.repository.RoomStoreRepository
import com.deadline.core.data.repository.RoomTransactionRunner
import com.deadline.core.data.repository.TransactionRunner
import com.deadline.core.domain.config.EconomyConfig
import com.deadline.core.domain.engine.BlockPolicy
import com.deadline.core.domain.engine.DelayEngine
import com.deadline.core.domain.engine.EconomyEngine
import com.deadline.core.domain.engine.MoodEngine
import com.deadline.core.domain.engine.PersonaBuilder
import com.deadline.core.domain.engine.RecurrenceEngine
import com.deadline.core.domain.engine.RoutineDirector
import com.deadline.core.domain.engine.SafetyLayer
import com.deadline.core.domain.port.AgendaRepository
import com.deadline.core.domain.port.BackupRepository
import com.deadline.core.domain.port.ConversationRepository
import com.deadline.core.domain.port.DayRolloverHandler
import com.deadline.core.domain.port.FocusControlRepository
import com.deadline.core.domain.port.GoalRepository
import com.deadline.core.domain.port.HabitRepository
import com.deadline.core.domain.port.InsightsRepository
import com.deadline.core.domain.port.LedgerRepository
import com.deadline.core.domain.port.OccurrenceRepository
import com.deadline.core.domain.port.StoreRepository
import com.deadline.core.domain.time.DayBoundary
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class CoreDataModule {

    @Binds
    @Singleton
    abstract fun bindTransactionRunner(impl: RoomTransactionRunner): TransactionRunner

    @Binds
    @Singleton
    abstract fun bindOccurrenceRepository(impl: RoomOccurrenceRepository): OccurrenceRepository

    @Binds
    @Singleton
    abstract fun bindLedgerRepository(impl: RoomLedgerRepository): LedgerRepository

    @Binds
    @Singleton
    abstract fun bindAgendaRepository(impl: RoomAgendaRepository): AgendaRepository

    @Binds
    @Singleton
    abstract fun bindHabitRepository(impl: RoomHabitRepository): HabitRepository

    @Binds
    @Singleton
    abstract fun bindInsightsRepository(impl: RoomInsightsRepository): InsightsRepository

    @Binds
    @Singleton
    abstract fun bindBackupRepository(impl: RoomBackupRepository): BackupRepository

    @Binds
    @Singleton
    abstract fun bindDayRolloverHandler(impl: DefaultDayRolloverHandler): DayRolloverHandler

    @Binds
    @Singleton
    abstract fun bindStoreRepository(impl: RoomStoreRepository): StoreRepository

    @Binds
    @Singleton
    abstract fun bindGoalRepository(impl: RoomGoalRepository): GoalRepository

    @Binds
    @Singleton
    abstract fun bindConversationRepository(impl: RoomConversationRepository): ConversationRepository

    @Binds
    @Singleton
    abstract fun bindFocusControlRepository(impl: RoomFocusControlRepository): FocusControlRepository

    companion object {
        @Provides
        @Singleton
        fun provideDeadLineDatabase(
            @ApplicationContext context: Context,
        ): DeadLineDatabase =
            Room.databaseBuilder(
                context,
                DeadLineDatabase::class.java,
                DeadLineDatabase.DATABASE_NAME,
            )
                .addMigrations(*DeadLineDatabase.ALL_MIGRATIONS)
                .build()

        @Provides
        fun provideOccurrenceDao(db: DeadLineDatabase): OccurrenceDao = db.occurrenceDao()

        @Provides
        fun provideLedgerDao(db: DeadLineDatabase): LedgerDao = db.ledgerDao()

        @Provides
        fun provideDayClosureDao(db: DeadLineDatabase): DayClosureDao = db.dayClosureDao()

        @Provides
        fun provideCatProfileDao(db: DeadLineDatabase): CatProfileDao = db.catProfileDao()

        @Provides
        fun provideAppUsageDao(db: DeadLineDatabase): AppUsageDao = db.appUsageDao()

        @Provides
        fun provideCommitmentAndGoalDao(db: DeadLineDatabase): CommitmentAndGoalDao =
            db.commitmentAndGoalDao()

        @Provides
        @Singleton
        fun provideEconomyConfig(loader: JsonGameConfigLoader): EconomyConfig =
            loader.loadEconomyConfig()

        @Provides
        @Singleton
        fun provideDayBoundary(): DayBoundary = DayBoundary()

        @Provides
        @Singleton
        fun provideRecurrenceEngine(dayBoundary: DayBoundary): RecurrenceEngine =
            RecurrenceEngine(dayBoundary)

        @Provides
        @Singleton
        fun provideDelayEngine(): DelayEngine = DelayEngine()

        @Provides
        @Singleton
        fun provideEconomyEngine(config: EconomyConfig): EconomyEngine = EconomyEngine(config)

        @Provides
        @Singleton
        fun provideMoodEngine(config: EconomyConfig): MoodEngine = MoodEngine(config.moodWeights)

        @Provides
        @Singleton
        fun provideRoutineDirector(): RoutineDirector = RoutineDirector()

        @Provides
        @Singleton
        fun providePersonaBuilder(): PersonaBuilder = PersonaBuilder()

        @Provides
        @Singleton
        fun provideSafetyLayer(): SafetyLayer = SafetyLayer()

        @Provides
        @Singleton
        fun provideBlockPolicy(): BlockPolicy = BlockPolicy()
    }
}
