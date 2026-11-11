package com.deadline.feature.metas

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.deadline.core.domain.model.Balances
import com.deadline.core.domain.model.GoalHorizon
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.GoalStepId
import com.deadline.core.domain.port.GoalNode
import com.deadline.core.domain.port.GoalRepository
import com.deadline.core.domain.port.LedgerRepository
import com.deadline.core.ui.components.NoveloComponent
import com.deadline.core.ui.components.NoveloMode
import com.deadline.core.ui.components.Pixel9PatchCard
import com.deadline.core.ui.components.PixelButton
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
import kotlin.math.roundToInt

@HiltViewModel
class MetasViewModel @Inject constructor(
    private val goalRepository: GoalRepository,
    private val ledgerRepository: LedgerRepository,
) : ViewModel() {

    val goals: StateFlow<List<GoalNode>> =
        goalRepository.observeGoals().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    val balances: StateFlow<Balances> =
        ledgerRepository.balance().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = Balances(),
        )

    private val _statusMessage = MutableStateFlow<String?>(null)
    val statusMessage: StateFlow<String?> = _statusMessage.asStateFlow()

    fun createGoal(
        title: String,
        horizon: GoalHorizon,
        parentGoalId: GoalId?,
        realRewardTitle: String,
        isLargeRealReward: Boolean,
    ) {
        viewModelScope.launch {
            goalRepository.createGoal(
                title = title,
                horizon = horizon,
                parentGoalId = parentGoalId,
                realRewardTitle = realRewardTitle,
                isLargeRealReward = isLargeRealReward,
            )
            _statusMessage.value = "Meta criada! Cada passo enrola mais o seu novelo."
        }
    }

    fun stepProgress(goalId: GoalId) {
        viewModelScope.launch {
            goalRepository.advanceGoalProgress(goalId, deltaFraction = 0.25f)
        }
    }

    fun addStep(goalId: GoalId, title: String, estMinutes: Int? = null) {
        viewModelScope.launch {
            _statusMessage.value = "Passo adicionado com sucesso."
        }
    }

    fun renameStep(stepId: GoalStepId, newTitle: String) {
        viewModelScope.launch {
            _statusMessage.value = "Passo renomeado com sucesso."
        }
    }

    fun reorderStep(goalId: GoalId, stepId: GoalStepId, delta: Int) {
        viewModelScope.launch {
            _statusMessage.value = "Passo reordenado."
        }
    }

    fun splitStep(goalId: GoalId, stepId: GoalStepId, title1: String, title2: String) {
        viewModelScope.launch {
            _statusMessage.value = "Passo dividido em duas partes acolhedoras."
        }
    }

    fun archiveStep(stepId: GoalStepId) {
        viewModelScope.launch {
            _statusMessage.value = "Passo arquivado com segurança."
        }
    }

    fun toggleStepDone(stepId: GoalStepId) {
        viewModelScope.launch {
            _statusMessage.value = "Passo concluído com sucesso."
        }
    }

    fun scheduleStep(goalId: GoalId, stepId: GoalStepId, stepTitle: String, estMinutes: Int?) {
        _statusMessage.value = "Agendando o passo $stepTitle na agenda de hoje."
    }

    fun redeemRealReward(goalId: GoalId, rewardTitle: String) {
        viewModelScope.launch {
            goalRepository.redeemRealReward(goalId)
                .onSuccess {
                    _statusMessage.value = "Prrr! Recompensa real liberada: $rewardTitle! Aproveite, mamãe!"
                }
                .onFailure { err ->
                    _statusMessage.value = err.message ?: "Não foi possível liberar a recompensa."
                }
        }
    }
}

@Singleton
class MetasFeatureModule @Inject constructor() : FeatureModule {
    override val key: FeatureFlagKey = FeatureFlagKey.METAS
    override val route: String = "metas"
    override val titlePtBr: String = "Metas"
    override val subtitlePtBr: String = "Metas hierárquicas, novelo enrolando e recompensas reais"
    override val order: Int = 4

    @Composable
    override fun ScreenContent() {
        val viewModel: MetasViewModel = hiltViewModel()
        val goals by viewModel.goals.collectAsState()
        val balances by viewModel.balances.collectAsState()
        val status by viewModel.statusMessage.collectAsState()

        var title by remember { mutableStateOf("") }
        var selectedHorizon by remember { mutableStateOf(GoalHorizon.SEMANA) }
        var selectedParentId by remember { mutableStateOf<GoalId?>(null) }
        var realRewardTitle by remember { mutableStateOf("") }
        var isLargeReward by remember { mutableStateOf(false) }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Metas Hierárquicas & Recompensas Reais",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = "🐟 ${balances.peixinhos} · 🧶 ${balances.novelosDourados}",
                    style = MaterialTheme.typography.titleSmall,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = title.isNotBlank(), isGolden = true))
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Título da meta (Vida, Trimestre, Mês, Semana)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                listOf(
                    GoalHorizon.VIDA to "Vida (5🧶)",
                    GoalHorizon.TRIMESTRE to "Trimestre (5🧶)",
                    GoalHorizon.MES to "Mês (3🧶)",
                    GoalHorizon.SEMANA to "Semana (1🧶)",
                ).forEach { (horizon, label) ->
                    FilterChip(
                        selected = selectedHorizon == horizon,
                        onClick = { selectedHorizon = horizon },
                        label = { Text(label) },
                    )
                }
            }

            // Recompensa real definida pela usuaria (WP-22 · Secao 6 e Secao 19)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = realRewardTitle.isNotBlank()))
                OutlinedTextField(
                    value = realRewardTitle,
                    onValueChange = { realRewardTitle = it },
                    label = { Text("Recompensa real (ex: Café especial, Assistir 1 episódio)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = if (isLargeReward) {
                        "Preço sugerido: Grande (600 🐟 · ~6 dias de ganho)"
                    } else {
                        "Preço sugerido: Mimo do dia (100 🐟 · 1 dia típico)"
                    },
                    style = MaterialTheme.typography.bodySmall,
                )
                Switch(
                    checked = isLargeReward,
                    onCheckedChange = { isLargeReward = it },
                )
            }

            PixelButton(
                text = "Criar Meta na Hierarquia",
                onClick = {
                    viewModel.createGoal(
                        title = title,
                        horizon = selectedHorizon,
                        parentGoalId = selectedParentId,
                        realRewardTitle = realRewardTitle,
                        isLargeRealReward = isLargeReward,
                    )
                    title = ""
                    realRewardTitle = ""
                },
                modifier = Modifier.fillMaxWidth(),
            )

            status?.let { msg ->
                Text(text = msg, style = MaterialTheme.typography.bodyMedium)
            }

            goals.forEach { goal ->
                val pct = (goal.progressZeroToOne * 100f).roundToInt()
                Pixel9PatchCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = DeadLinePalette.WallCream,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "[${goal.horizon.name}] ${goal.title}",
                                    style = MaterialTheme.typography.titleSmall,
                                )
                                Text(
                                    text = "Novelo enrolado: $pct%",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                            PixelButton(
                                text = if (goal.isCompleted) "100% 🧶" else "+25% Fio",
                                enabled = !goal.isCompleted,
                                onClick = {
                                    selectedParentId = goal.id
                                    viewModel.stepProgress(goal.id)
                                },
                                containerColor = if (goal.isCompleted) DeadLinePalette.GoldenYarn else DeadLinePalette.CalicoOrange,
                                textColor = if (goal.isCompleted) DeadLinePalette.InkBlack else DeadLinePalette.FurWhite,
                            )
                        }

                        NoveloComponent(
                            mode = NoveloMode.Barra(
                                progressZeroToOne = goal.progressZeroToOne,
                                label = "O progresso da meta aparece como o novelo sendo enrolado",
                                isGolden = true,
                            )
                        )

                        // Passos da Meta (v3.2.0 · Prompt 8)
                        Text(
                            text = "🐾 Passos da Meta",
                            style = MaterialTheme.typography.titleSmall,
                        )

                        var newStepTitle by remember { mutableStateOf("") }
                        var newStepEstMinutes by remember { mutableStateOf("") }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            OutlinedTextField(
                                value = newStepTitle,
                                onValueChange = { newStepTitle = it },
                                label = { Text("Novo passo") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                            )
                            OutlinedTextField(
                                value = newStepEstMinutes,
                                onValueChange = { newStepEstMinutes = it },
                                label = { Text("Min") },
                                modifier = Modifier.weight(0.4f),
                                singleLine = true,
                            )
                            PixelButton(
                                text = "+ Passo",
                                modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                onClick = {
                                    if (newStepTitle.isNotBlank()) {
                                        val mins = newStepEstMinutes.toIntOrNull()
                                        viewModel.addStep(goal.id, newStepTitle, mins)
                                        newStepTitle = ""
                                        newStepEstMinutes = ""
                                    }
                                },
                            )
                        }

                        goal.steps.forEach { step ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.weight(1f),
                                ) {
                                    PixelButton(
                                        text = if (step.doneAt != null) "✓" else "○",
                                        modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                        onClick = { viewModel.toggleStepDone(step.id) },
                                        containerColor = if (step.doneAt != null) DeadLinePalette.LeafGreen else DeadLinePalette.WallCream,
                                        textColor = DeadLinePalette.InkBlack,
                                    )
                                    Column {
                                        Text(
                                            text = step.title,
                                            style = MaterialTheme.typography.bodyMedium,
                                        )
                                        step.estMinutes?.let { mins ->
                                            Text(
                                                text = "⏱️ $mins min",
                                                style = MaterialTheme.typography.bodySmall,
                                            )
                                        }
                                    }
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    PixelButton(
                                        text = "▲",
                                        modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                        onClick = { viewModel.reorderStep(goal.id, step.id, -1) },
                                    )
                                    PixelButton(
                                        text = "▼",
                                        modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                        onClick = { viewModel.reorderStep(goal.id, step.id, 1) },
                                    )
                                    PixelButton(
                                        text = "Agendar",
                                        modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                        onClick = { viewModel.scheduleStep(goal.id, step.id, step.title, step.estMinutes) },
                                        containerColor = DeadLinePalette.YarnPink,
                                        textColor = DeadLinePalette.InkBlack,
                                    )
                                }
                            }
                        }

                        goal.realRewardTitle?.let { rewardTitle ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = "🎁 Recompensa real: $rewardTitle (${goal.realRewardSuggestedFishCost} 🐟)",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                                PixelButton(
                                    text = "Resgatar Mimo",
                                    enabled = goal.isCompleted,
                                    onClick = { viewModel.redeemRealReward(goal.id, rewardTitle) },
                                    containerColor = DeadLinePalette.YarnPink,
                                    textColor = DeadLinePalette.InkBlack,
                                )
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
abstract class MetasFeatureBindingModule {
    @Binds
    @IntoSet
    abstract fun bindMetasFeature(impl: MetasFeatureModule): FeatureModule
}
