package com.deadline.feature.insights

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import com.deadline.core.domain.engine.DayDelaySummary
import com.deadline.core.domain.engine.DelayWindowTrend
import com.deadline.core.domain.port.BackupRepository
import com.deadline.core.domain.port.InsightsRepository
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
class InsightsViewModel @Inject constructor(
    private val insightsRepository: InsightsRepository,
    private val backupRepository: BackupRepository,
) : ViewModel() {

    val recent7Days: StateFlow<List<DayDelaySummary>> =
        insightsRepository.observeRecentDailySummaries(days = 7).stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    val trend7Days: StateFlow<DelayWindowTrend?> =
        insightsRepository.observeWindowTrend(windowDays = 7).stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = null,
        )

    val overcomingTargetMinutes: StateFlow<Int> =
        insightsRepository.observeOvercomingTargetMinutes().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = 15,
        )

    private val _backupStatusMessage = MutableStateFlow<String?>(null)
    val backupStatusMessage: StateFlow<String?> = _backupStatusMessage.asStateFlow()

    fun saveOvercomingTarget(minutesText: String) {
        val value = minutesText.toIntOrNull() ?: return
        viewModelScope.launch {
            insightsRepository.setOvercomingTargetMinutes(value)
        }
    }

    fun exportBackupToPreview() {
        viewModelScope.launch {
            val json = backupRepository.exportJson()
            _backupStatusMessage.value = "Backup exportado (${json.length} bytes): $json"
        }
    }

    fun clearAllData() {
        viewModelScope.launch {
            backupRepository.clearAllUserData()
            _backupStatusMessage.value = "Todos os dados locais foram apagados com segurança."
        }
    }
}

@Singleton
class InsightsFeatureModule @Inject constructor() : FeatureModule {
    override val key: FeatureFlagKey = FeatureFlagKey.INSIGHTS
    override val route: String = "insights"
    override val titlePtBr: String = "O Fio"
    override val subtitlePtBr: String = "Gráficos de atraso mediano, pontualidade, superação e backup"
    override val order: Int = 5

    @Composable
    override fun ScreenContent() {
        val viewModel: InsightsViewModel = hiltViewModel()
        val recent7 by viewModel.recent7Days.collectAsState()
        val trend7 by viewModel.trend7Days.collectAsState()
        val targetMin by viewModel.overcomingTargetMinutes.collectAsState()
        val backupStatus by viewModel.backupStatusMessage.collectAsState()

        var targetInput by remember(targetMin) { mutableStateOf(targetMin.toString()) }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "O Fio · Evolução de Pontualidade e Superação",
                style = MaterialTheme.typography.titleMedium,
            )

            // Grafico do Fio (mediana semanal)
            Pixel9PatchCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = DeadLinePalette.WallCream,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "O Fio da Semana · Mediana de atraso por dia em minutos",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    NoveloComponent(
                        mode = NoveloMode.Grafico(
                            delayPointsMinutes = recent7.map { it.medianDelayMinutes.toFloat() },
                            toleranceMinutes = 5f,
                        )
                    )
                }
            }

            // Indicadores da semana
            trend7?.let { trend ->
                Pixel9PatchCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = DeadLinePalette.FurWhite,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = if (trend.isOvercoming) {
                                "Superação ativa! Mediana caiu ${trend.improvementMinutes.roundToInt()} min em relação à semana passada"
                            } else {
                                "Mediana 7 dias: ${trend.currentWindowMedianMinutes.roundToInt()} min · Meta: abaixo de $targetMin min"
                            },
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            text = "Atraso médio: ${trend.currentWindowMeanMinutes.roundToInt()} min · No prazo: ${trend.onTimePercentage.roundToInt()}%",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Melhor dia: ${trend.bestDayKey ?: "-"} · Pior dia: ${trend.worstDayKey ?: "-"} · Melhor hora: ${trend.bestHourOfDay?.let { "${it}h" } ?: "-"} · Pior hora: ${trend.worstHourOfDay?.let { "${it}h" } ?: "-"}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            // Card de Log Semanal (v3.2.0 · Prompt 11)
            Pixel9PatchCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = DeadLinePalette.WallCream,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Log Semanal · Carta da Gatinha e Evolução",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        text = "Snapshot imutável com taxas de cumprimento, pontualidade e carta da gatinha.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PixelButton(
                            text = "Ver Log Semanal",
                            onClick = { /* abre viewer do log semanal */ },
                            containerColor = DeadLinePalette.YarnPink,
                            modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                        )
                        PixelButton(
                            text = "Aceitar sugestão de horário",
                            onClick = { /* aceita sugestão gentil */ },
                            containerColor = DeadLinePalette.GoldenYarn,
                            modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                        )
                    }
                }
            }

            // Meta de superacao definida pela usuaria
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true, isGolden = true))
                OutlinedTextField(
                    value = targetInput,
                    onValueChange = { targetInput = it },
                    label = { Text("Meta de superação · atraso mediano abaixo de X min") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                PixelButton(
                    text = "Definir Meta",
                    onClick = { viewModel.saveOvercomingTarget(targetInput) },
                    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                )
            }

            // Backup e Transparencia / Apagar tudo
            Pixel9PatchCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = DeadLinePalette.WallCream,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Backup e Privacidade · Dados 100% no aparelho",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PixelButton(
                            text = "Exportar Backup JSON",
                            onClick = { viewModel.exportBackupToPreview() },
                            modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                        )
                        PixelButton(
                            text = "Apagar Tudo",
                            onClick = { viewModel.clearAllData() },
                            containerColor = DeadLinePalette.AlertRed,
                            modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                        )
                    }
                    backupStatus?.let { msg ->
                        Text(text = msg, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class InsightsFeatureBindingModule {
    @Binds
    @IntoSet
    abstract fun bindInsightsFeature(impl: InsightsFeatureModule): FeatureModule
}
