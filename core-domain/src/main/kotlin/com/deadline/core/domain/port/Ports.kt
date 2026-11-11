package com.deadline.core.domain.port

import com.deadline.core.domain.engine.DayDelaySummary
import com.deadline.core.domain.engine.DelayWindowTrend
import com.deadline.core.domain.engine.RecurrenceFrequency
import com.deadline.core.domain.engine.RecurringCommitmentSeries
import com.deadline.core.domain.model.Balances
import com.deadline.core.domain.model.CheckInCommand
import com.deadline.core.domain.model.CheckInResult
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.HabitId
import com.deadline.core.domain.model.LedgerEntry
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.RigorLevel
import com.deadline.core.domain.model.RoutineCategory
import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime

interface OccurrenceRepository {
    fun observeDay(day: LocalDate): Flow<List<Occurrence>>
    suspend fun registerCheckIn(cmd: CheckInCommand): CheckInResult
}

interface AgendaRepository {
    fun observeSeries(): Flow<List<RecurringCommitmentSeries>>
    suspend fun upsertSeries(series: RecurringCommitmentSeries)
    suspend fun deleteSeries(id: CommitmentId)
    suspend fun materializeNext14Days(referenceDayKey: LocalDate)
}

data class HabitDefinition(
    val id: HabitId,
    val title: String,
    val category: RoutineCategory,
    val frequency: RecurrenceFrequency,
    val windowStart: LocalTime? = null,
    val windowEnd: LocalTime,
    val weeklyTarget: Int,
    val currentStreakDays: Int = 0,
    val reserveYarnsAvailable: Int = 0,
    val completedToday: Boolean = false,
)

interface HabitRepository {
    fun observeActiveHabits(dayKey: LocalDate): Flow<List<HabitDefinition>>
    suspend fun upsertHabit(habit: HabitDefinition)
    suspend fun completeHabitForDay(habitId: HabitId, dayKey: LocalDate): Long
    suspend fun applyReserveYarnToProtectStreak(habitId: HabitId, missedDayKey: LocalDate): Boolean
    suspend fun deleteHabit(id: HabitId)
}

interface InsightsRepository {
    fun observeRecentDailySummaries(days: Int = 30): Flow<List<DayDelaySummary>>
    fun observeWindowTrend(windowDays: Int = 7): Flow<DelayWindowTrend>
    fun observeOvercomingTargetMinutes(): Flow<Int>
    suspend fun setOvercomingTargetMinutes(targetMinutes: Int)
}

interface BackupRepository {
    suspend fun exportJson(): String
    suspend fun importJson(rawJson: String): Result<Int>
    suspend fun clearAllUserData()
}

enum class StoreItemCategory {
    COSMETICO_SIMPLES,
    COSMETICO_MEDIO_MOVEL,
    CENARIO_GRANDE,
    COMIDA_BRINQUEDO,
    NOVA_AREA,
    NOVO_GATO,
    NOVELO_RESERVA,
}

data class StoreCatalogItem(
    val id: String,
    val titlePtBr: String,
    val descriptionPtBr: String,
    val category: StoreItemCategory,
    val currency: com.deadline.core.domain.model.CurrencyType,
    val price: Long,
    val minBondRequired: Long = 0L,
    val bondGrantedOnUse: Long = 0L,
)

data class CatInventoryState(
    val catName: String = "Gatinha",
    val mood: com.deadline.core.domain.model.CatMood = com.deadline.core.domain.model.CatMood.FELIZ,
    val ownedItemIds: Set<String> = emptySet(),
    val equippedItemIds: Set<String> = emptySet(),
    val reserveYarnsHeld: Int = 0,
    val isRestModeActive: Boolean = false,
)

interface StoreRepository {
    fun getCatalog(): List<StoreCatalogItem>
    fun observeCatInventory(): Flow<CatInventoryState>
    suspend fun purchaseItem(itemId: String): Result<Unit>
    suspend fun toggleEquipCosmetic(itemId: String)
    suspend fun setRestMode(enabled: Boolean)
}

data class GoalNode(
    val id: com.deadline.core.domain.model.GoalId,
    val title: String,
    val horizon: com.deadline.core.domain.model.GoalHorizon,
    val parentGoalId: com.deadline.core.domain.model.GoalId? = null,
    val deadlineDayKey: LocalDate? = null,
    val progressZeroToOne: Float = 0f,
    val realRewardTitle: String? = null,
    val realRewardSuggestedFishCost: Long = 100L,
    val isCompleted: Boolean = false,
)

interface GoalRepository {
    fun observeGoals(): Flow<List<GoalNode>>
    suspend fun createGoal(
        title: String,
        horizon: com.deadline.core.domain.model.GoalHorizon,
        parentGoalId: com.deadline.core.domain.model.GoalId? = null,
        realRewardTitle: String? = null,
        isLargeRealReward: Boolean = false,
    )
    suspend fun advanceGoalProgress(goalId: com.deadline.core.domain.model.GoalId, deltaFraction: Float)
    suspend fun redeemRealReward(goalId: com.deadline.core.domain.model.GoalId): Result<Unit>
    suspend fun deleteGoal(goalId: com.deadline.core.domain.model.GoalId)
}

@kotlinx.serialization.Serializable
data class BriefingSuggestionItem(
    val id: String,
    val category: String,
    val titlePtBr: String,
    val detailPtBr: String,
    val suggestedHorizonOrTime: String = "",
)

@kotlinx.serialization.Serializable
data class BriefingResultSchema(
    val schemaVersion: Int = 1,
    val suggestedCatName: String = "Mimi",
    val suggestedRolloverHour: Int = 4,
    val suggestions: List<BriefingSuggestionItem> = emptyList(),
)

data class ChatBubbleMessage(
    val id: String,
    val isFromUser: Boolean,
    val text: String,
    val personaVariantLabel: String,
    val isDistressSupport: Boolean = false,
)

data class ConversationSettingsState(
    val selectedProvider: LlmProviderFamily = LlmProviderFamily.GEMINI,
    val selectedModel: String = "gemini-2.5-flash",
    val maskedApiKey: String = "",
    val hasConfiguredKey: Boolean = false,
    val allowSendingAppStateSummary: Boolean = false,
    val saveVentingHistory: Boolean = false,
    val requireBiometricLock: Boolean = false,
    val estimatedMonthlyTokensUsed: Long = 0L,
    val monthlyTokenCap: Long = 150_000L,
)

interface ConversationRepository {
    fun observeMessages(): Flow<List<ChatBubbleMessage>>
    fun observeSettings(): Flow<ConversationSettingsState>
    suspend fun saveApiKey(provider: LlmProviderFamily, model: String, rawKey: String)
    suspend fun testConfiguredKey(): Result<Unit>
    suspend fun updatePrivacyOptions(
        allowSendingState: Boolean,
        saveVentingHistory: Boolean,
        requireBiometricLock: Boolean,
        monthlyTokenCap: Long,
    )
    suspend fun sendMessage(
        userText: String,
        mode: com.deadline.core.domain.model.ConversationMode,
        temperament: com.deadline.core.domain.model.CatTemperament,
    ): ChatBubbleMessage
    suspend fun inspectWhatCatSeesJson(): String
    suspend fun clearConversationHistory()
    fun getFixedBriefingQuestions(): List<String>
    suspend fun generateBriefingSuggestions(answersByQuestion: Map<String, String>): BriefingResultSchema
    suspend fun acceptBriefingSuggestion(suggestion: BriefingSuggestionItem)
}

data class DailyAppUsageReportItem(
    val packageName: String,
    val totalMinutesToday: Long,
    val dailyGoalMinutes: Long = 60L,
    val isOverGoal: Boolean = totalMinutesToday > dailyGoalMinutes,
)

interface FocusControlRepository {
    fun observeBlockRules(): Flow<List<com.deadline.core.domain.engine.AppBlockRule>>
    fun observeTodayUsageReport(): Flow<List<DailyAppUsageReportItem>>
    suspend fun upsertBlockRule(
        packageName: String,
        rigor: RigorLevel,
        windowStart: LocalTime,
        windowEnd: LocalTime,
        unlockPassMinutes: Int = 15,
    )
    suspend fun removeBlockRule(packageName: String)
    suspend fun grantEmergencyOrPassSession(packageName: String, durationMinutes: Int, reason: String)
    suspend fun evaluatePackageForService(foregroundPackage: String): BlockDecision
    suspend fun sampleRecentUsageEvents()
}

interface DayRolloverHandler {
    suspend fun runRolloverAndMaterialize()
}

interface LedgerRepository {
    suspend fun append(entries: List<LedgerEntry>)
    fun balance(): Flow<Balances>
}

data class UsageEvent(
    val packageName: String,
    val occurredAt: Instant,
    val foregroundMillis: Long,
)

interface UsageSource {
    suspend fun readEvents(from: Instant, to: Instant): List<UsageEvent>
}

sealed interface BlockDecision {
    data object Allow : BlockDecision

    data class Warn(
        val packageName: String,
        val message: String,
    ) : BlockDecision

    data class Friction(
        val packageName: String,
        val waitSeconds: Int,
        val promptQuestion: String,
        val fishCost: Long = 0L,
    ) : BlockDecision

    data class Block(
        val packageName: String,
        val rigor: RigorLevel,
        val pendingTaskTitles: List<String>,
        val emergencyHoldSeconds: Int = 10,
    ) : BlockDecision
}

interface BlockEnforcer {
    fun show(d: BlockDecision)
    fun dismiss()
}

interface AlarmScheduler {
    fun schedule(o: Occurrence)
    fun cancel(id: OccurrenceId)
}

enum class PermissionKind {
    USAGE_STATS,
    ACCESSIBILITY,
    NOTIFICATIONS,
    EXACT_ALARM,
    IGNORE_BATTERY_OPTIMIZATION,
    OEM_AUTOSTART,
}

data class PermissionState(
    val kind: PermissionKind,
    val isGranted: Boolean,
    val requiresRestrictedSettingsUnlock: Boolean = false,
)

data class GuideStep(
    val kind: PermissionKind,
    val titlePtBr: String,
    val instructionsPtBr: List<String>,
    val systemAction: String,
)

interface PermissionHealth {
    fun status(): List<PermissionState>
    fun intentFor(p: PermissionKind): GuideStep
}

enum class LlmProviderFamily {
    ANTHROPIC,
    GEMINI,
    OPENAI_COMPATIBLE,
}

data class LlmMessage(
    val role: String,
    val content: String,
)

data class LlmRequest(
    val systemPrompt: String,
    val messages: List<LlmMessage>,
    val maxOutputTokens: Int = 180,
    val expectJsonSchema: Boolean = false,
)

data class LlmChunk(
    val textDelta: String,
    val isComplete: Boolean = false,
    val estimatedTokensUsed: Int = 0,
)

interface LlmProvider {
    fun stream(req: LlmRequest): Flow<LlmChunk>
    suspend fun testKey(): Result<Unit>
}

interface SecretVault {
    suspend fun put(name: String, v: ByteArray)
    suspend fun get(name: String): ByteArray?
}
