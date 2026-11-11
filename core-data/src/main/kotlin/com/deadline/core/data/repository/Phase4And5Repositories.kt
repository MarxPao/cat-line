package com.deadline.core.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.deadline.core.data.config.JsonGameConfigLoader
import com.deadline.core.data.db.CatProfileDao
import com.deadline.core.data.db.CommitmentAndGoalDao
import com.deadline.core.data.db.ConversationMessageEntity
import com.deadline.core.data.db.GoalEntity
import com.deadline.core.data.db.LedgerDao
import com.deadline.core.data.db.OccurrenceDao
import com.deadline.core.data.mapper.toEntity
import com.deadline.core.domain.engine.AppStateSummaryForLlm
import com.deadline.core.domain.engine.EconomyEngine
import com.deadline.core.domain.engine.PersonaBuilder
import com.deadline.core.domain.engine.PersonaContextInput
import com.deadline.core.domain.engine.RecurrenceFrequency
import com.deadline.core.domain.engine.RecurringCommitmentSeries
import com.deadline.core.domain.engine.SafetyLayer
import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.event.EventBus
import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.CatTemperament
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.ConversationMode
import com.deadline.core.domain.model.CurrencyType
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.GoalHorizon
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.HabitId
import com.deadline.core.domain.model.LedgerEntry
import com.deadline.core.domain.model.LedgerEntryId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.port.AgendaRepository
import com.deadline.core.domain.port.BriefingResultSchema
import com.deadline.core.domain.port.BriefingSuggestionItem
import com.deadline.core.domain.port.ChatBubbleMessage
import com.deadline.core.domain.port.ConversationRepository
import com.deadline.core.domain.port.ConversationSettingsState
import com.deadline.core.domain.port.GoalNode
import com.deadline.core.domain.port.GoalRepository
import com.deadline.core.domain.port.HabitDefinition
import com.deadline.core.domain.port.HabitRepository
import com.deadline.core.domain.port.LlmMessage
import com.deadline.core.domain.port.LlmProvider
import com.deadline.core.domain.port.LlmProviderFamily
import com.deadline.core.domain.port.LlmRequest
import com.deadline.core.domain.port.SecretVault
import com.deadline.core.domain.time.DayBoundary
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.time.Clock
import java.time.LocalDate
import java.time.LocalTime
import java.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementacao de `GoalRepository` (WP-21 e WP-22 · Secao 5 e Secao 19):
 * - Hierarquia: VIDA, TRIMESTRE, MES, SEMANA, TAREFA.
 * - O progresso da meta aparece como o novelo sendo enrolado (0.0 a 1.0) e alimenta a meta-pai.
 * - Ao atingir 100%, paga Novelos Dourados no `EconomyEngine` (curta=1, media=3, longa=5) e publica `MetaConcluida`.
 * - Recompensas reais definidas pela usuaria com preco sugerido:
 *   1 dia de ganho tipico (~100 peixinhos) para mimos simples e 5 a 7 dias (~600 peixinhos) para recompensas grandes.
 */
@Singleton
class RoomGoalRepository @Inject constructor(
    private val dao: CommitmentAndGoalDao,
    private val ledgerDao: LedgerDao,
    private val economyEngine: EconomyEngine,
    private val transactionRunner: TransactionRunner,
    private val eventBus: EventBus,
    private val clock: Clock,
) : GoalRepository {

    override fun observeGoals(): Flow<List<GoalNode>> =
        dao.observeActiveGoals().map { list ->
            list.map { entity ->
                GoalNode(
                    id = GoalId(entity.id),
                    title = entity.title,
                    horizon = GoalHorizon.valueOf(entity.horizon),
                    parentGoalId = entity.parentGoalId?.let(::GoalId),
                    deadlineDayKey = entity.deadlineDayKey?.let(LocalDate::parse),
                    progressZeroToOne = entity.progressFraction.toFloat().coerceIn(0f, 1f),
                    realRewardTitle = entity.realRewardTitle,
                    realRewardSuggestedFishCost = entity.realRewardSuggestedFishCost ?: 100L,
                    isCompleted = entity.completedAtEpochMillis != null || entity.progressFraction >= 1.0,
                )
            }
        }

    override suspend fun createGoal(
        title: String,
        horizon: GoalHorizon,
        parentGoalId: GoalId?,
        realRewardTitle: String?,
        isLargeRealReward: Boolean,
    ) {
        if (title.isBlank()) return
        // Secao 19: o app sugere 1 dia de ganho (~100🐟) para mimos e 5 a 7 dias (~600🐟) para os grandes
        val suggestedCost = if (isLargeRealReward) 600L else 100L
        val entity = GoalEntity(
            id = UUID.randomUUID().toString(),
            title = title.trim(),
            horizon = horizon.name,
            parentGoalId = parentGoalId?.value,
            deadlineDayKey = null,
            progressFraction = 0.0,
            realRewardTitle = realRewardTitle?.takeIf { it.isNotBlank() }?.trim(),
            realRewardSuggestedFishCost = suggestedCost,
            createdAtEpochMillis = clock.instant().toEpochMilli(),
        )
        dao.upsertGoal(entity)
    }

    override suspend fun advanceGoalProgress(goalId: GoalId, deltaFraction: Float) {
        val now = clock.instant()
        var goldenEarned = 0L

        transactionRunner.runInTransaction {
            val entity = dao.getGoalById(goalId.value) ?: return@runInTransaction
            val newProgress = (entity.progressFraction + deltaFraction.toDouble()).coerceIn(0.0, 1.0)
            val justCompleted = entity.completedAtEpochMillis == null && newProgress >= 1.0

            dao.upsertGoal(
                entity.copy(
                    progressFraction = newProgress,
                    completedAtEpochMillis = if (justCompleted) now.toEpochMilli() else entity.completedAtEpochMillis,
                )
            )

            // Alimenta a barra de progresso da meta-pai na hierarquia (Secao 5)
            entity.parentGoalId?.let { parentId ->
                val parent = dao.getGoalById(parentId)
                if (parent != null) {
                    val parentNext = (parent.progressFraction + (deltaFraction * 0.25)).coerceIn(0.0, 1.0)
                    dao.upsertGoal(parent.copy(progressFraction = parentNext))
                }
            }

            if (justCompleted) {
                val existingRefs = ledgerDao.getRulesForReference(goalId.value)
                    .map { it.ruleKey to it.referenceId }
                    .toSet()
                val horizon = GoalHorizon.valueOf(entity.horizon)
                val entries = economyEngine.evaluateGoalMilestoneGoldenYarn(
                    goalId = goalId,
                    horizon = horizon,
                    existingRuleReferences = existingRefs,
                    now = now,
                )
                if (entries.isNotEmpty()) {
                    ledgerDao.insertAllIgnoreDuplicates(entries.map { it.toEntity() })
                    goldenEarned = entries.sumOf { it.amount }
                }
            }
        }

        if (goldenEarned > 0L) {
            eventBus.publish(
                DomainEvent.MetaConcluida(
                    goalId = goalId,
                    goldenYarnEarned = goldenEarned,
                    occurredAt = now,
                )
            )
        }
    }

    override suspend fun redeemRealReward(goalId: GoalId): Result<Unit> = runCatching {
        transactionRunner.runInTransaction {
            val goal = dao.getGoalById(goalId.value) ?: error("Meta não encontrada")
            require(goal.progressFraction >= 1.0) { "Enrole o novelo da meta até 100% antes de liberar a recompensa real!" }
            val cost = goal.realRewardSuggestedFishCost ?: 100L
            val allLedger = ledgerDao.getAll()
            val availableFish = allLedger.filter { it.currency == CurrencyType.PEIXINHOS.name }.sumOf { it.amount }
            require(availableFish >= cost) { "Peixinhos insuficientes ($availableFish/$cost 🐟)" }

            val ref = "REAL_REWARD:${goal.id}:${UUID.randomUUID()}"
            ledgerDao.insertAllIgnoreDuplicates(
                listOf(
                    LedgerEntry(
                        id = LedgerEntryId(ref),
                        currency = CurrencyType.PEIXINHOS,
                        amount = -cost,
                        ruleKey = "REAL_REWARD_REDEEM",
                        referenceId = ref,
                        createdAt = clock.instant(),
                        economyConfigVersion = economyEngine.config.version,
                    ).toEntity()
                )
            )
        }
    }

    override suspend fun deleteGoal(goalId: GoalId) {
        dao.softDeleteGoal(goalId.value, clock.instant().toEpochMilli())
    }
}

private val KEY_LLM_PROVIDER = stringPreferencesKey("llm_provider_family")
private val KEY_LLM_MODEL = stringPreferencesKey("llm_model_name")
private val KEY_ALLOW_STATE_SUMMARY = booleanPreferencesKey("llm_allow_state_summary")
private val KEY_SAVE_VENTING = booleanPreferencesKey("llm_save_venting")
private val KEY_BIOMETRIC_LOCK = booleanPreferencesKey("llm_biometric_lock")
private val KEY_MONTHLY_TOKENS_USED = longPreferencesKey("llm_monthly_tokens_used")
private val KEY_MONTHLY_TOKEN_CAP = longPreferencesKey("llm_monthly_token_cap")

/**
 * Implementacao de `ConversationRepository` (WP-24 a WP-27 · Secao 21 e AD-16):
 * - Criptografia de campo AES-GCM nas mensagens salvas (`ConversationMessageEntity.cipherTextBase64`) usando chave guardada no `SecretVault` (Keystore/Tink).
 * - Modo desabafo (`ConversationMode.DESABAFO`) NUNCA envia dados de tarefas e, por padrao, nao grava historico.
 * - Tela "O que a gatinha ve" (`inspectWhatCatSeesJson`) mostra exatamente o payload de sistema e estado.
 * - Contador mensal de tokens e teto opcional que cai para as falas de reserva por humor quando atingido.
 * - Questionario de briefing estruturado com validacao por esquema JSON + 1 tentativa de retry e fallback para lista fixa.
 */
@Singleton
class RoomConversationRepository @Inject constructor(
    private val dao: CommitmentAndGoalDao,
    private val occurrenceDao: OccurrenceDao,
    private val catProfileDao: CatProfileDao,
    private val secretVault: SecretVault,
    private val llmProvider: LlmProvider,
    private val personaBuilder: PersonaBuilder,
    private val safetyLayer: SafetyLayer,
    private val configLoader: JsonGameConfigLoader,
    private val agendaRepository: AgendaRepository,
    private val habitRepository: HabitRepository,
    private val goalRepository: GoalRepository,
    private val dayBoundary: DayBoundary,
    private val dataStore: DataStore<Preferences>,
    private val clock: Clock,
) : ConversationRepository {

    private val json = Json { ignoreUnknownKeys = true; prettyPrint = true }

    override fun observeMessages(): Flow<List<ChatBubbleMessage>> =
        dao.observeConversationMessages().map { rows ->
            rows.map { entity ->
                val plainText = decryptField(entity.cipherTextBase64)
                ChatBubbleMessage(
                    id = entity.id,
                    isFromUser = entity.role == "user",
                    text = plainText,
                    personaVariantLabel = entity.personaVariant,
                    isDistressSupport = entity.personaVariant == "CUIDADO_SEGURANCA",
                )
            }
        }

    override fun observeSettings(): Flow<ConversationSettingsState> =
        dataStore.data.map { prefs ->
            val providerName = prefs[KEY_LLM_PROVIDER] ?: LlmProviderFamily.GEMINI.name
            val modelName = prefs[KEY_LLM_MODEL] ?: "gemini-2.5-flash"
            val rawKeyBytes = secretVault.get(VAULT_API_KEY_NAME)
            val hasKey = rawKeyBytes != null && rawKeyBytes.isNotEmpty()
            val masked = if (hasKey) {
                val str = String(rawKeyBytes!!, Charsets.UTF_8)
                if (str.length > 6) "${str.take(3)}••••••${str.takeLast(3)}" else "••••••••"
            } else {
                ""
            }

            ConversationSettingsState(
                selectedProvider = runCatching { LlmProviderFamily.valueOf(providerName) }.getOrDefault(LlmProviderFamily.GEMINI),
                selectedModel = modelName,
                maskedApiKey = masked,
                hasConfiguredKey = hasKey,
                allowSendingAppStateSummary = prefs[KEY_ALLOW_STATE_SUMMARY] ?: false,
                saveVentingHistory = prefs[KEY_SAVE_VENTING] ?: false,
                requireBiometricLock = prefs[KEY_BIOMETRIC_LOCK] ?: false,
                estimatedMonthlyTokensUsed = prefs[KEY_MONTHLY_TOKENS_USED] ?: 0L,
                monthlyTokenCap = prefs[KEY_MONTHLY_TOKEN_CAP] ?: 150_000L,
            )
        }

    override suspend fun saveApiKey(provider: LlmProviderFamily, model: String, rawKey: String) {
        // AD-16: Chave guardada no SecretVault (Keystore + Tink AES-GCM), nunca em log
        secretVault.put(VAULT_API_KEY_NAME, rawKey.trim().toByteArray(Charsets.UTF_8))
        secretVault.put(VAULT_PROVIDER_NAME, provider.name.toByteArray(Charsets.UTF_8))
        secretVault.put(VAULT_MODEL_NAME, model.trim().toByteArray(Charsets.UTF_8))
        dataStore.edit { prefs ->
            prefs[KEY_LLM_PROVIDER] = provider.name
            prefs[KEY_LLM_MODEL] = model.trim().ifBlank { "gemini-2.5-flash" }
        }
    }

    override suspend fun testConfiguredKey(): Result<Unit> = llmProvider.testKey()

    override suspend fun updatePrivacyOptions(
        allowSendingState: Boolean,
        saveVentingHistory: Boolean,
        requireBiometricLock: Boolean,
        monthlyTokenCap: Long,
    ) {
        dataStore.edit { prefs ->
            prefs[KEY_ALLOW_STATE_SUMMARY] = allowSendingState
            prefs[KEY_SAVE_VENTING] = saveVentingHistory
            prefs[KEY_BIOMETRIC_LOCK] = requireBiometricLock
            prefs[KEY_MONTHLY_TOKEN_CAP] = monthlyTokenCap.coerceAtLeast(1_000L)
        }
    }

    override suspend fun sendMessage(
        userText: String,
        mode: ConversationMode,
        temperament: CatTemperament,
    ): ChatBubbleMessage {
        val settings = observeSettings().first()
        val shouldPersist = mode != ConversationMode.DESABAFO || settings.saveVentingHistory

        if (shouldPersist) {
            dao.insertConversationMessage(
                ConversationMessageEntity(
                    id = UUID.randomUUID().toString(),
                    role = "user",
                    cipherTextBase64 = encryptField(userText),
                    personaVariant = mode.name,
                    mode = mode.name,
                    createdAtEpochMillis = clock.instant().toEpochMilli(),
                )
            )
        }

        // 1. Checagem local de seguranca (SafetyLayer · Secao 7 e Secao 21)
        val safetyCheck = safetyLayer.evaluateUserMessage(userText)
        if (safetyCheck.isDistressDetected && safetyCheck.immediateSupportResponsePtBr != null) {
            val safeReply = ChatBubbleMessage(
                id = UUID.randomUUID().toString(),
                isFromUser = false,
                text = safetyCheck.immediateSupportResponsePtBr!!,
                personaVariantLabel = "CUIDADO_SEGURANCA",
                isDistressSupport = true,
            )
            if (shouldPersist) {
                dao.insertConversationMessage(
                    ConversationMessageEntity(
                        id = safeReply.id,
                        role = "assistant",
                        cipherTextBase64 = encryptField(safeReply.text),
                        personaVariant = safeReply.personaVariantLabel,
                        mode = mode.name,
                        createdAtEpochMillis = clock.instant().toEpochMilli(),
                    )
                )
            }
            return safeReply
        }

        // 2. Monta o prompt de Persona Dinamica em 4 blocos
        val profile = catProfileDao.getProfile()
        val mood = profile?.currentMood?.let(CatMood::valueOf) ?: CatMood.FELIZ
        val catName = profile?.name ?: "Gatinha"
        val todayKey = dayBoundary.currentDayKey(clock)
        val todayOccurrences = occurrenceDao.getByDayKey(todayKey.toString())

        val stateSummary = AppStateSummaryForLlm(
            catName = catName,
            mood = mood,
            completedTodayCount = todayOccurrences.count { it.state == OccurrenceState.FEITO.name },
            pendingTodayCount = todayOccurrences.count { it.state == OccurrenceState.PENDENTE.name },
            medianDelayMinutes7Days = 0,
        )

        val builtPersona = personaBuilder.buildPrompt(
            PersonaContextInput(
                catName = catName,
                mood = mood,
                temperament = temperament,
                mode = mode,
                allowSendingAppStateSummary = settings.allowSendingAppStateSummary,
                appStateSummary = stateSummary,
            )
        )

        // 3. Verifica se ha chave configurada e se esta abaixo do teto mensal de tokens
        val withinCap = settings.estimatedMonthlyTokensUsed < settings.monthlyTokenCap
        val replyText = if (settings.hasConfiguredKey && withinCap) {
            runCatching {
                val sb = StringBuilder()
                var tokensUsed = 0
                llmProvider.stream(
                    LlmRequest(
                        systemPrompt = builtPersona.fullSystemPrompt,
                        messages = listOf(LlmMessage(role = "user", content = userText)),
                        maxOutputTokens = 160,
                    )
                ).collect { chunk ->
                    sb.append(chunk.textDelta)
                    tokensUsed += chunk.estimatedTokensUsed
                }
                if (tokensUsed > 0) {
                    dataStore.edit { prefs ->
                        val prev = prefs[KEY_MONTHLY_TOKENS_USED] ?: 0L
                        prefs[KEY_MONTHLY_TOKENS_USED] = prev + tokensUsed
                    }
                }
                sb.toString().ifBlank { pickFallbackSpeech(mood) }
            }.getOrElse {
                pickFallbackSpeech(mood)
            }
        } else {
            pickFallbackSpeech(mood)
        }

        val replyBubble = ChatBubbleMessage(
            id = UUID.randomUUID().toString(),
            isFromUser = false,
            text = replyText,
            personaVariantLabel = builtPersona.variant.displayTitlePtBr,
        )

        if (shouldPersist) {
            dao.insertConversationMessage(
                ConversationMessageEntity(
                    id = replyBubble.id,
                    role = "assistant",
                    cipherTextBase64 = encryptField(replyBubble.text),
                    personaVariant = replyBubble.personaVariantLabel,
                    mode = mode.name,
                    createdAtEpochMillis = clock.instant().toEpochMilli(),
                )
            )
        }

        return replyBubble
    }

    override suspend fun inspectWhatCatSeesJson(): String {
        val settings = observeSettings().first()
        val profile = catProfileDao.getProfile()
        val mood = profile?.currentMood?.let(CatMood::valueOf) ?: CatMood.FELIZ
        val todayKey = dayBoundary.currentDayKey(clock)
        val todayOccurrences = occurrenceDao.getByDayKey(todayKey.toString())

        val summary = AppStateSummaryForLlm(
            catName = profile?.name ?: "Gatinha",
            mood = mood,
            completedTodayCount = todayOccurrences.count { it.state == OccurrenceState.FEITO.name },
            pendingTodayCount = todayOccurrences.count { it.state == OccurrenceState.PENDENTE.name },
            medianDelayMinutes7Days = 0,
        )
        return if (settings.allowSendingAppStateSummary) {
            json.encodeToString(AppStateSummaryForLlm.serializer(), summary)
        } else {
            """{"envioDeEstadoAtivo": false, "explicacao": "Apenas o texto das mensagens é enviado ao provedor. O modo Desabafo nunca envia dados de tarefas."}"""
        }
    }

    override suspend fun clearConversationHistory() {
        dao.clearAllConversationMessages()
    }

    override fun getFixedBriefingQuestions(): List<String> = listOf(
        "1. Qual nome você quer dar para a sua gatinha calico?",
        "2. A que horas você costuma ir dormir (para ajustarmos a virada do dia lógico)?",
        "3. Qual é o seu principal compromisso diário de estudo ou trabalho?",
        "4. Quais hábitos você mais quer consolidar nesta semana?",
        "5. Qual é a sua principal meta para este mês?",
        "6. Quais aplicativos mais roubam seu foco quando você precisa cumprir um prazo?",
        "7. Qual nível de rigor você prefere no início (1 Aviso fofo, 2 Fricção de 15s, 3 Condicional por tarefa)?",
        "8. Qual temperamento-base da gatinha você prefere (Fofa, Engraçada, Acolhedora ou Firme)?",
    )

    override suspend fun generateBriefingSuggestions(
        answersByQuestion: Map<String, String>,
    ): BriefingResultSchema {
        val settings = observeSettings().first()
        if (settings.hasConfiguredKey) {
            // Tenta validar o esquema JSON ate 2 vezes (1 tentativa + 1 retry conforme Secao 21)
            repeat(2) {
                val attempt = runCatching {
                    val prompt = "Gere um JSON com schemaVersion=1, suggestedCatName, suggestedRolloverHour e suggestions[] com base nas respostas: $answersByQuestion"
                    val sb = StringBuilder()
                    llmProvider.stream(
                        LlmRequest(
                            systemPrompt = "Retorne APENAS um objeto JSON válido seguindo BriefingResultSchema.",
                            messages = listOf(LlmMessage("user", prompt)),
                            maxOutputTokens = 350,
                            expectJsonSchema = true,
                        )
                    ).collect { sb.append(it.textDelta) }
                    json.decodeFromString(BriefingResultSchema.serializer(), sb.toString())
                }
                if (attempt.isSuccess) return attempt.getOrThrow()
            }
        }

        // Fallback determinístico em lista fixa (Secao 21: "Sem chave, o mesmo questionario aparece como lista fixa")
        val catName = answersByQuestion.entries.firstOrNull()?.value?.takeIf { it.isNotBlank() } ?: "Mimi"
        return BriefingResultSchema(
            schemaVersion = 1,
            suggestedCatName = catName,
            suggestedRolloverHour = 4,
            suggestions = listOf(
                BriefingSuggestionItem(
                    id = "sug-commit-1",
                    category = "COMPROMISSO",
                    titlePtBr = answersByQuestion.values.elementAtOrNull(2)?.ifBlank { "Bloco de Foco Principal" } ?: "Bloco de Foco Principal",
                    detailPtBr = "Compromisso em dias úteis às 19:00 (Esforço M)",
                    suggestedHorizonOrTime = "19:00",
                ),
                BriefingSuggestionItem(
                    id = "sug-habit-1",
                    category = "HABITO",
                    titlePtBr = answersByQuestion.values.elementAtOrNull(3)?.ifBlank { "Revisar agenda com a gatinha" } ?: "Revisar agenda com a gatinha",
                    detailPtBr = "Hábito diário na janela até 21:00 (+8🐟)",
                    suggestedHorizonOrTime = "21:00",
                ),
                BriefingSuggestionItem(
                    id = "sug-goal-1",
                    category = "META",
                    titlePtBr = answersByQuestion.values.elementAtOrNull(4)?.ifBlank { "Reduzir atraso mediano para < 15 min" } ?: "Reduzir atraso mediano para < 15 min",
                    detailPtBr = "Meta de Mês (+3 novelos dourados ao enrolar 100%)",
                    suggestedHorizonOrTime = "MES",
                ),
            ),
        )
    }

    override suspend fun acceptBriefingSuggestion(suggestion: BriefingSuggestionItem) {
        val today = dayBoundary.currentDayKey(clock)
        when (suggestion.category) {
            "COMPROMISSO" -> {
                agendaRepository.upsertSeries(
                    RecurringCommitmentSeries(
                        commitmentId = CommitmentId(UUID.randomUUID().toString()),
                        title = suggestion.titlePtBr,
                        type = CommitmentType.TAREFA,
                        effort = EffortLevel.M,
                        category = RoutineCategory.ESTUDAR_LER,
                        frequency = RecurrenceFrequency.Weekdays,
                        deadlineTime = runCatching { LocalTime.parse(suggestion.suggestedHorizonOrTime) }.getOrDefault(LocalTime.of(19, 0)),
                        startDate = today,
                    )
                )
            }
            "HABITO" -> {
                habitRepository.upsertHabit(
                    HabitDefinition(
                        id = HabitId(UUID.randomUUID().toString()),
                        title = suggestion.titlePtBr,
                        category = RoutineCategory.ESTUDAR_LER,
                        frequency = RecurrenceFrequency.Daily,
                        windowEnd = LocalTime.of(21, 0),
                        weeklyTarget = 7,
                    )
                )
            }
            "META" -> {
                goalRepository.createGoal(
                    title = suggestion.titlePtBr,
                    horizon = GoalHorizon.MES,
                    realRewardTitle = "Café especial comemorativo",
                )
            }
        }
    }

    private fun pickFallbackSpeech(mood: CatMood): String {
        val fallback = configLoader.loadFallbackSpeechConfig()
        val list = fallback.byMood[mood].orEmpty()
        return list.firstOrNull() ?: "Miau, mamãe! Estou aqui com você."
    }

    private suspend fun getOrCreateFieldKey(): ByteArray {
        val existing = secretVault.get(VAULT_CONVERSATION_AES_KEY)
        if (existing != null && existing.size == 32) return existing
        val generated = ByteArray(32).also { java.security.SecureRandom().nextBytes(it) }
        secretVault.put(VAULT_CONVERSATION_AES_KEY, generated)
        return generated
    }

    private suspend fun encryptField(plainText: String): String = runCatching {
        val keyBytes = getOrCreateFieldKey()
        val iv = ByteArray(12).also { java.security.SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
        val encrypted = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
        Base64.getEncoder().encodeToString(iv + encrypted)
    }.getOrElse { "" }

    private suspend fun decryptField(cipherTextBase64: String): String = runCatching {
        val raw = Base64.getDecoder().decode(cipherTextBase64)
        if (raw.size <= 12) return@runCatching ""
        val iv = raw.copyOfRange(0, 12)
        val cipherBytes = raw.copyOfRange(12, raw.size)
        val keyBytes = getOrCreateFieldKey()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
        String(cipher.doFinal(cipherBytes), Charsets.UTF_8)
    }.getOrElse { "" }

    companion object {
        const val VAULT_API_KEY_NAME = "llm_byok_api_key"
        const val VAULT_PROVIDER_NAME = "llm_byok_provider"
        const val VAULT_MODEL_NAME = "llm_byok_model"
        private const val VAULT_CONVERSATION_AES_KEY = "conversation_field_aes256_key"
    }
}
