package com.deadline.feature.foco

import android.content.Intent
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deadline.core.domain.config.FeatureFlagKey
import com.deadline.core.domain.engine.AppBlockRule
import com.deadline.core.domain.engine.BlockPolicy
import com.deadline.core.domain.model.RigorLevel
import com.deadline.core.domain.port.DailyAppUsageReportItem
import com.deadline.core.domain.port.FocusControlRepository
import com.deadline.core.domain.port.GuideStep
import com.deadline.core.domain.port.PermissionHealth
import com.deadline.core.domain.port.PermissionKind
import com.deadline.core.domain.port.PermissionState
import com.deadline.core.ui.components.NoveloComponent
import com.deadline.core.ui.components.NoveloMode
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalTime
import javax.inject.Inject
import javax.inject.Singleton

@HiltViewModel
class FocoViewModel @Inject constructor(
    private val focusRepository: FocusControlRepository,
    private val permissionHealth: PermissionHealth,
) : ViewModel() {

    val rules: StateFlow<List<AppBlockRule>> =
        focusRepository.observeBlockRules().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    val todayUsageReport: StateFlow<List<DailyAppUsageReportItem>> =
        focusRepository.observeTodayUsageReport().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    private val _permissionStates = MutableStateFlow(permissionHealth.status())
    val permissionStates: StateFlow<List<PermissionState>> = _permissionStates.asStateFlow()

    private val _selectedGuideStep = MutableStateFlow<GuideStep?>(null)
    val selectedGuideStep: StateFlow<GuideStep?> = _selectedGuideStep.asStateFlow()

    private val _emergencyStatus = MutableStateFlow<String?>(null)
    val emergencyStatus: StateFlow<String?> = _emergencyStatus.asStateFlow()

    init {
        viewModelScope.launch {
            focusRepository.sampleRecentUsageEvents()
        }
    }

    fun refreshPermissions() {
        _permissionStates.value = permissionHealth.status()
    }

    fun selectPermissionGuide(kind: PermissionKind) {
        _selectedGuideStep.value = permissionHealth.intentFor(kind)
    }

    fun saveRule(
        packageName: String,
        rigor: RigorLevel,
        windowStartText: String,
        windowEndText: String,
        passMinutes: Int,
    ) {
        val start = runCatching { LocalTime.parse(windowStartText.trim()) }.getOrDefault(LocalTime.of(8, 0))
        val end = runCatching { LocalTime.parse(windowEndText.trim()) }.getOrDefault(LocalTime.of(23, 0))
        viewModelScope.launch {
            focusRepository.upsertBlockRule(
                packageName = packageName,
                rigor = rigor,
                windowStart = start,
                windowEnd = end,
                unlockPassMinutes = passMinutes,
            )
        }
    }

    fun deleteRule(packageName: String) {
        viewModelScope.launch {
            focusRepository.removeBlockRule(packageName)
        }
    }

    fun triggerEmergencyRelease(packageName: String) {
        viewModelScope.launch {
            focusRepository.grantEmergencyOrPassSession(
                packageName = packageName,
                durationMinutes = 30,
                reason = "Saída garantida segurando a gatinha por 10s",
            )
            _emergencyStatus.value = "Saída de emergência ativada para $packageName (30 min liberados)."
        }
    }
}

@Singleton
class FocoFeatureModule @Inject constructor() : FeatureModule {
    override val key: FeatureFlagKey = FeatureFlagKey.FOCO
    override val route: String = "foco"
    override val titlePtBr: String = "Foco"
    override val subtitlePtBr: String = "Bloqueio de apps (níveis 0 a 4), tracker de uso e saúde das permissões"
    override val order: Int = 8

    @Composable
    override fun ScreenContent() {
        val viewModel: FocoViewModel = hiltViewModel()
        val rules by viewModel.rules.collectAsState()
        val usageReport by viewModel.todayUsageReport.collectAsState()
        val permissions by viewModel.permissionStates.collectAsState()
        val guideStep by viewModel.selectedGuideStep.collectAsState()
        val emergencyStatus by viewModel.emergencyStatus.collectAsState()
        val context = LocalContext.current

        var packageInput by remember { mutableStateOf("com.instagram.android") }
        var selectedRigor by remember { mutableStateOf(RigorLevel.AVISO) }
        var windowStart by remember { mutableStateOf("08:00") }
        var windowEnd by remember { mutableStateOf("22:30") }
        var passMinutes by remember { mutableIntStateOf(15) }

        var isHoldingEmergency by remember { mutableStateOf(false) }
        var holdSecondsElapsed by remember { mutableIntStateOf(0) }

        LaunchedEffect(isHoldingEmergency) {
            if (!isHoldingEmergency) {
                holdSecondsElapsed = 0
                return@LaunchedEffect
            }
            for (s in 1..BlockPolicy.EMERGENCY_HOLD_SECONDS) {
                delay(1_000L)
                holdSecondsElapsed = s
            }
            viewModel.triggerEmergencyRelease(packageInput)
            isHoldingEmergency = false
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Foco · Bloqueio Modulável (Níveis 0 a 4) & Tracker",
                style = MaterialTheme.typography.titleMedium,
            )

            // 1. Tela "Saude das Permissoes" em verde ou vermelho com passo a passo da gatinha (Secao 22 · WP-30)
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
                        Text(
                            text = "Saúde das Permissões (Toque para passo a passo)",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        PixelButton(
                            text = "Atualizar",
                            onClick = { viewModel.refreshPermissions() },
                        )
                    }

                    permissions.forEach { perm ->
                        val statusColor = if (perm.isGranted) DeadLinePalette.LeafGreen else DeadLinePalette.AlertRed
                        val badge = if (perm.isGranted) "VERDE (OK)" else "VERMELHO (Pendente)"
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(text = perm.kind.name, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    text = if (perm.requiresRestrictedSettingsUnlock) {
                                        "$badge · Requer liberar 'Configurações restritas' (Android 13+)"
                                    } else {
                                        badge
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = statusColor,
                                )
                            }
                            PixelButton(
                                text = "Passo a Passo",
                                onClick = { viewModel.selectPermissionGuide(perm.kind) },
                                containerColor = statusColor,
                            )
                        }
                    }

                    guideStep?.let { step ->
                        PixelSpeechBubble(
                            text = "${step.titlePtBr}: ${step.instructionsPtBr.joinToString(" ")}",
                            typewriterEnabled = true,
                        )
                        PixelButton(
                            text = "Abrir Configuração no Android",
                            onClick = {
                                runCatching {
                                    context.startActivity(
                                        Intent(step.systemAction).apply {
                                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        }
                                    )
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            // 2. Configuracao de regra por app e nivel de rigor (0 Observar a 4 Firme)
            Pixel9PatchCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = DeadLinePalette.FurWhite,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Configurar Regra de Bloqueio · Escolha ao seu gosto",
                        style = MaterialTheme.typography.titleSmall,
                    )

                    Text(
                        text = "Escolha rápida de redes sociais:",
                        style = MaterialTheme.typography.bodySmall,
                        color = DeadLinePalette.GrayDark,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        BlockPolicy.POPULAR_SOCIAL_MEDIA_PRESETS.take(4).forEach { preset ->
                            FilterChip(
                                selected = packageInput == preset.packageName,
                                onClick = {
                                    packageInput = preset.packageName
                                    selectedRigor = preset.defaultRigor
                                },
                                label = { Text("${preset.iconEmoji} ${preset.name}") },
                            )
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        BlockPolicy.POPULAR_SOCIAL_MEDIA_PRESETS.drop(4).forEach { preset ->
                            FilterChip(
                                selected = packageInput == preset.packageName,
                                onClick = {
                                    packageInput = preset.packageName
                                    selectedRigor = preset.defaultRigor
                                },
                                label = { Text("${preset.iconEmoji} ${preset.name}") },
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true))
                        OutlinedTextField(
                            value = packageInput,
                            onValueChange = { packageInput = it },
                            label = { Text("Pacote do app") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        listOf(
                            RigorLevel.OBSERVAR to "0 Observar",
                            RigorLevel.AVISO to "1 Aviso",
                            RigorLevel.FRICCAO to "2 Fricção 15s",
                            RigorLevel.CONDICIONAL to "3 Tarefas",
                            RigorLevel.FIRME to "4 Firme",
                        ).forEach { (rigor, label) ->
                            FilterChip(
                                selected = selectedRigor == rigor,
                                onClick = { selectedRigor = rigor },
                                label = { Text(label) },
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = windowStart,
                            onValueChange = { windowStart = it },
                            label = { Text("Início (HH:mm)") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = windowEnd,
                            onValueChange = { windowEnd = it },
                            label = { Text("Fim (HH:mm)") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                        )
                    }

                    PixelButton(
                        text = "Salvar Regra de Foco",
                        onClick = {
                            viewModel.saveRule(
                                packageName = packageInput,
                                rigor = selectedRigor,
                                windowStartText = windowStart,
                                windowEndText = windowEnd,
                                passMinutes = passMinutes,
                            )
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            // 3. Saida de emergencia garantida segurando a gatinha por 10s (Secao 22: "O app nao prende a usuaria")
            Pixel9PatchCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = DeadLinePalette.WallCream,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Saída Garantida de Emergência (Segure por 10s para destravar)",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .pointerInput(Unit) {
                                detectTapGestures(
                                    onPress = {
                                        isHoldingEmergency = true
                                        tryAwaitRelease()
                                        isHoldingEmergency = false
                                    }
                                )
                            },
                    ) {
                        NoveloComponent(
                            mode = NoveloMode.Barra(
                                progressZeroToOne = holdSecondsElapsed / 10f,
                                label = if (isHoldingEmergency) {
                                    "Segurando a gatinha... ${holdSecondsElapsed}/10s"
                                } else {
                                    "Pressione e segure aqui por 10 segundos para saída de emergência"
                                },
                                isGolden = true,
                            )
                        )
                    }
                    emergencyStatus?.let { msg ->
                        Text(text = msg, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            // Regras ativas
            if (rules.isNotEmpty()) {
                Text(text = "Regras Configuradas (${rules.size})", style = MaterialTheme.typography.titleSmall)
                rules.forEach { rule ->
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
                                Text(text = rule.packageName, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    text = "Nível ${rule.rigor.level} (${rule.rigor.name}) · ${rule.windowStart} às ${rule.windowEnd}",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                            PixelButton(
                                text = "Remover",
                                onClick = { viewModel.deleteRule(rule.packageName) },
                                containerColor = DeadLinePalette.AlertRed,
                            )
                        }
                    }
                }
            }

            // Relatorio do Tracker de Tempo de Uso do Dia
            Pixel9PatchCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = DeadLinePalette.WallCream,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Tracker de Tempo de Uso de Hoje (Retenção de 180 dias)",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    if (usageReport.isEmpty()) {
                        Text(
                            text = "Nenhuma amostra registrada ainda ou permissão de uso pendente.",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    } else {
                        usageReport.forEach { item ->
                            Text(
                                text = "• ${item.packageName}: ${item.totalMinutesToday} min (Meta: ${item.dailyGoalMinutes} min)",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class FocoFeatureBindingModule {
    @Binds
    @IntoSet
    abstract fun bindFocoFeature(impl: FocoFeatureModule): FeatureModule
}
