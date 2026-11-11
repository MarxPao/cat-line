package com.deadline.feature.conversa

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deadline.core.domain.config.FeatureFlagKey
import com.deadline.core.domain.model.CatTemperament
import com.deadline.core.domain.model.ConversationMode
import com.deadline.core.domain.port.BriefingResultSchema
import com.deadline.core.domain.port.BriefingSuggestionItem
import com.deadline.core.domain.port.ChatBubbleMessage
import com.deadline.core.domain.port.ConversationRepository
import com.deadline.core.domain.port.ConversationSettingsState
import com.deadline.core.domain.port.LlmProviderFamily
import com.deadline.core.ui.components.Pixel9PatchCard
import com.deadline.core.ui.components.PixelButton
import com.deadline.core.ui.components.PixelSpeechBubble
import com.deadline.core.ui.feature.FeatureModule
import com.deadline.core.ui.theme.DeadLinePalette
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@HiltViewModel
class ConversaViewModel @Inject constructor(
    private val repository: ConversationRepository,
) : ViewModel() {

    val messages: StateFlow<List<ChatBubbleMessage>> =
        repository.observeMessages().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    val settings: StateFlow<ConversationSettingsState> =
        repository.observeSettings().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = ConversationSettingsState(),
        )

    val briefingQuestions: List<String> = repository.getFixedBriefingQuestions()

    private val _whatCatSeesJson = MutableStateFlow<String?>(null)
    val whatCatSeesJson: StateFlow<String?> = _whatCatSeesJson.asStateFlow()

    private val _briefingResult = MutableStateFlow<BriefingResultSchema?>(null)
    val briefingResult: StateFlow<BriefingResultSchema?> = _briefingResult.asStateFlow()

    private val _statusBanner = MutableStateFlow<String?>(null)
    val statusBanner: StateFlow<String?> = _statusBanner.asStateFlow()

    fun send(text: String, mode: ConversationMode, temperament: CatTemperament) {
        if (text.isBlank()) return
        viewModelScope.launch {
            val reply = repository.sendMessage(text.trim(), mode, temperament)
            _statusBanner.value = "Gatinha (${reply.personaVariantLabel}): ${reply.text}"
        }
    }

    fun saveByokKey(provider: LlmProviderFamily, model: String, rawKey: String) {
        if (rawKey.isBlank()) return
        viewModelScope.launch {
            repository.saveApiKey(provider, model, rawKey)
            _statusBanner.value = "Chave salva no Android Keystore com criptografia AES-GCM!"
        }
    }

    fun testKey() {
        viewModelScope.launch {
            repository.testConfiguredKey()
                .onSuccess { _statusBanner.value = "Teste de chave concluído com sucesso!" }
                .onFailure { _statusBanner.value = "Falha ao testar chave: ${it.message}" }
        }
    }

    fun toggleAllowStateSummary(enabled: Boolean) {
        val cur = settings.value
        viewModelScope.launch {
            repository.updatePrivacyOptions(
                allowSendingState = enabled,
                saveVentingHistory = cur.saveVentingHistory,
                requireBiometricLock = cur.requireBiometricLock,
                monthlyTokenCap = cur.monthlyTokenCap,
            )
        }
    }

    fun toggleBiometricLock(enabled: Boolean) {
        val cur = settings.value
        viewModelScope.launch {
            repository.updatePrivacyOptions(
                allowSendingState = cur.allowSendingAppStateSummary,
                saveVentingHistory = cur.saveVentingHistory,
                requireBiometricLock = enabled,
                monthlyTokenCap = cur.monthlyTokenCap,
            )
        }
    }

    fun showWhatCatSees() {
        viewModelScope.launch {
            _whatCatSeesJson.value = if (_whatCatSeesJson.value == null) {
                repository.inspectWhatCatSeesJson()
            } else {
                null
            }
        }
    }

    fun clearAllMessages() {
        viewModelScope.launch {
            repository.clearConversationHistory()
            _statusBanner.value = "Histórico de conversa apagado do aparelho."
        }
    }

    fun generateBriefing(answers: Map<String, String>) {
        viewModelScope.launch {
            _briefingResult.value = repository.generateBriefingSuggestions(answers)
        }
    }

    fun acceptSuggestion(item: BriefingSuggestionItem) {
        viewModelScope.launch {
            repository.acceptBriefingSuggestion(item)
            _statusBanner.value = "Sugestão aplicada: ${item.titlePtBr}"
        }
    }
}

@Singleton
class ConversaFeatureModule @Inject constructor() : FeatureModule {
    override val key: FeatureFlagKey = FeatureFlagKey.CONVERSA
    override val route: String = "conversa"
    override val titlePtBr: String = "Conversa"
    override val subtitlePtBr: String = "Chat em balões BYOK, modo desabafo, privacidade e briefing"
    override val order: Int = 7

    @Composable
    override fun ScreenContent() {
        val viewModel: ConversaViewModel = hiltViewModel()
        val messages by viewModel.messages.collectAsState()
        val settings by viewModel.settings.collectAsState()
        val whatCatSees by viewModel.whatCatSeesJson.collectAsState()
        val briefingResult by viewModel.briefingResult.collectAsState()
        val statusBanner by viewModel.statusBanner.collectAsState()

        var userInput by remember { mutableStateOf("") }
        var selectedMode by remember { mutableStateOf(ConversationMode.LIVRE) }
        var selectedTemperament by remember { mutableStateOf(CatTemperament.ACOLHEDORA) }

        var showKeySetup by remember { mutableStateOf(false) }
        var selectedProvider by remember(settings.selectedProvider) { mutableStateOf(settings.selectedProvider) }
        var modelName by remember(settings.selectedModel) { mutableStateOf(settings.selectedModel) }
        var apiKeyInput by remember { mutableStateOf("") }

        var showBriefingWizard by remember { mutableStateOf(false) }
        var currentQuestionIdx by remember { mutableIntStateOf(0) }
        var currentAnswer by remember { mutableStateOf("") }
        val briefingAnswers = remember { mutableStateMapOf<String, String>() }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Conversa com a Gatinha · Chat em Balões & Desabafo",
                style = MaterialTheme.typography.titleMedium,
            )

            // Ultimo balao de resposta da gatinha com efeito de maquina de escrever
            val lastCatMessage = messages.lastOrNull { !it.isFromUser }?.text
                ?: statusBanner
                ?: "Miau, mamãe! Quer conversar, planejar o dia ou só desabafar um pouquinho no meu colinho?"

            PixelSpeechBubble(
                text = lastCatMessage,
                typewriterEnabled = true,
            )

            // Modos de conversa (Secao 21: livre, desabafo, planejar o dia, cobranca gentil, comemorar)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                listOf(
                    ConversationMode.LIVRE to "Livre",
                    ConversationMode.DESABAFO to "Desabafo (Escuta)",
                    ConversationMode.PLANEJAR_DIA to "Planejar",
                    ConversationMode.COBRANCA_GENTIL to "Cobrança gentil",
                    ConversationMode.COMEMORAR to "Comemorar",
                ).forEach { (mode, label) ->
                    FilterChip(
                        selected = selectedMode == mode,
                        onClick = { selectedMode = mode },
                        label = { Text(label) },
                    )
                }
            }

            // Temperamento-base (Secao 21: fofa, engracada, acolhedora, firme)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                CatTemperament.entries.forEach { temp ->
                    FilterChip(
                        selected = selectedTemperament == temp,
                        onClick = { selectedTemperament = temp },
                        label = { Text(temp.name) },
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = userInput,
                    onValueChange = { userInput = it },
                    label = {
                        Text(
                            if (selectedMode == ConversationMode.DESABAFO) {
                                "Desabafe à vontade (não envia tarefas e não grava por padrão)"
                            } else {
                                "Fale com a gatinha..."
                            }
                        )
                    },
                    modifier = Modifier.weight(1f),
                )
                PixelButton(
                    text = "Miar",
                    onClick = {
                        viewModel.send(userInput, selectedMode, selectedTemperament)
                        userInput = ""
                    },
                )
            }

            // Botoes de transparencia, BYOK, Briefing e Apagar Tudo
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PixelButton(
                    text = "O que a gatinha vê",
                    onClick = { viewModel.showWhatCatSees() },
                    containerColor = DeadLinePalette.CozyPurple,
                )
                PixelButton(
                    text = "Chave BYOK",
                    onClick = { showKeySetup = !showKeySetup },
                )
                PixelButton(
                    text = "Briefing Guiado",
                    onClick = { showBriefingWizard = !showBriefingWizard },
                    containerColor = DeadLinePalette.GoldenYarn,
                    textColor = DeadLinePalette.InkBlack,
                )
            }

            whatCatSees?.let { jsonPayload ->
                Pixel9PatchCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = DeadLinePalette.WallCream,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "Tela 'O que a gatinha vê' (Transparência de Privacidade · Seção 21):",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(text = jsonPayload, style = MaterialTheme.typography.bodySmall)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Permitir envio do resumo de tarefas (exceto no Desabafo)",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            Switch(
                                checked = settings.allowSendingAppStateSummary,
                                onCheckedChange = { viewModel.toggleAllowStateSummary(it) },
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Trava por biometria nas conversas salvas",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            Switch(
                                checked = settings.requireBiometricLock,
                                onCheckedChange = { viewModel.toggleBiometricLock(it) },
                            )
                        }
                        PixelButton(
                            text = "Apagar Toda a Conversa",
                            onClick = { viewModel.clearAllMessages() },
                            containerColor = DeadLinePalette.AlertRed,
                        )
                    }
                }
            }

            if (showKeySetup) {
                Pixel9PatchCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = DeadLinePalette.WallCream,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "Cofre BYOK (Android Keystore AES-GCM · Sem servidor nosso)",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            text = "Chave atual: ${settings.maskedApiKey.ifBlank { "Nenhuma (usando falas offline)" }} · Tokens no mês: ${settings.estimatedMonthlyTokensUsed}/${settings.monthlyTokenCap}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            LlmProviderFamily.entries.forEach { fam ->
                                FilterChip(
                                    selected = selectedProvider == fam,
                                    onClick = { selectedProvider = fam },
                                    label = { Text(fam.name) },
                                )
                            }
                        }
                        OutlinedTextField(
                            value = modelName,
                            onValueChange = { modelName = it },
                            label = { Text("Modelo econômico sugerido") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = apiKeyInput,
                            onValueChange = { apiKeyInput = it },
                            label = { Text("Cole sua chave de API aqui") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PixelButton(
                                text = "Salvar no Cofre",
                                onClick = {
                                    viewModel.saveByokKey(selectedProvider, modelName, apiKeyInput)
                                    apiKeyInput = ""
                                },
                            )
                            PixelButton(
                                text = "Testar Chave",
                                onClick = { viewModel.testKey() },
                                containerColor = DeadLinePalette.LeafGreen,
                            )
                        }
                    }
                }
            }

            // WP-27: Questionario de Briefing uma pergunta por vez + aceitar/editar/recusar cada sugestao
            if (showBriefingWizard) {
                val questions = viewModel.briefingQuestions
                val qText = questions.getOrElse(currentQuestionIdx) { questions.last() }

                Pixel9PatchCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = DeadLinePalette.WallCream,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "Questionário de Briefing (${currentQuestionIdx + 1}/${questions.size})",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(text = qText, style = MaterialTheme.typography.bodyMedium)
                        OutlinedTextField(
                            value = currentAnswer,
                            onValueChange = { currentAnswer = it },
                            label = { Text("Sua resposta (opcional)") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PixelButton(
                                text = if (currentQuestionIdx < questions.lastIndex) "Próxima Pergunta" else "Gerar Sugestões JSON",
                                onClick = {
                                    briefingAnswers[qText] = currentAnswer
                                    currentAnswer = ""
                                    if (currentQuestionIdx < questions.lastIndex) {
                                        currentQuestionIdx++
                                    } else {
                                        viewModel.generateBriefing(briefingAnswers.toMap())
                                    }
                                },
                            )
                            PixelButton(
                                text = "Pular / Fechar",
                                onClick = { showBriefingWizard = false },
                                containerColor = DeadLinePalette.CalicoGrayDark,
                            )
                        }

                        briefingResult?.let { schema ->
                            Text(
                                text = "Sugestões da Gatinha (${schema.suggestedCatName}) — Nada é aplicado sozinho:",
                                style = MaterialTheme.typography.titleSmall,
                            )
                            schema.suggestions.forEach { item ->
                                Pixel9PatchCard(
                                    modifier = Modifier.fillMaxWidth(),
                                    backgroundColor = DeadLinePalette.FurWhite,
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(text = "[${item.category}] ${item.titlePtBr}", style = MaterialTheme.typography.titleSmall)
                                            Text(text = item.detailPtBr, style = MaterialTheme.typography.bodySmall)
                                        }
                                        PixelButton(
                                            text = "Aceitar",
                                            onClick = { viewModel.acceptSuggestion(item) },
                                            containerColor = DeadLinePalette.LeafGreen,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class ConversaFeatureBindingModule {
    @Binds
    @IntoSet
    abstract fun bindConversaFeature(impl: ConversaFeatureModule): FeatureModule
}
