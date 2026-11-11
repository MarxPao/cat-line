package com.deadline.feature.agenda

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.FilterChip
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
import com.deadline.core.domain.engine.RecurrenceFrequency
import com.deadline.core.domain.engine.RecurringCommitmentSeries
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.port.AgendaRepository
import com.deadline.core.domain.time.DayBoundary
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
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.Clock
import java.time.LocalTime
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@HiltViewModel
class AgendaViewModel @Inject constructor(
    private val agendaRepository: AgendaRepository,
    private val dayBoundary: DayBoundary,
    private val clock: Clock,
) : ViewModel() {

    val seriesList: StateFlow<List<RecurringCommitmentSeries>> =
        agendaRepository.observeSeries().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    fun saveCommitment(
        title: String,
        effort: EffortLevel,
        category: RoutineCategory,
        frequencyKind: String,
        timesPerWeekCount: Int,
        plannedStartText: String,
        deadlineText: String,
    ) {
        if (title.isBlank()) return
        val startLocal = runCatching { LocalTime.parse(plannedStartText.trim()) }.getOrNull()
        val deadlineLocal = runCatching { LocalTime.parse(deadlineText.trim()) }
            .getOrElse { LocalTime.of(20, 0) }
        val todayKey = dayBoundary.currentDayKey(clock)

        val freq = when (frequencyKind) {
            "DIARIO" -> RecurrenceFrequency.Daily
            "DIAS_UTEIS" -> RecurrenceFrequency.Weekdays
            "X_SEMANA" -> RecurrenceFrequency.TimesPerWeek(timesPerWeekCount.coerceIn(1, 7))
            else -> RecurrenceFrequency.Once(todayKey)
        }

        val series = RecurringCommitmentSeries(
            commitmentId = CommitmentId(UUID.randomUUID().toString()),
            title = title.trim(),
            type = CommitmentType.TAREFA,
            effort = effort,
            category = category,
            frequency = freq,
            plannedStartTime = startLocal,
            deadlineTime = deadlineLocal,
            startDate = todayKey,
        )

        viewModelScope.launch {
            agendaRepository.upsertSeries(series)
        }
    }

    fun deleteCommitment(id: CommitmentId) {
        viewModelScope.launch {
            agendaRepository.deleteSeries(id)
        }
    }
}

@Singleton
class AgendaFeatureModule @Inject constructor() : FeatureModule {
    override val key: FeatureFlagKey = FeatureFlagKey.AGENDA
    override val route: String = "agenda"
    override val titlePtBr: String = "Agenda"
    override val subtitlePtBr: String = "Compromissos, recorrência e edição com o novelo"
    override val order: Int = 2

    @Composable
    override fun ScreenContent() {
        val viewModel: AgendaViewModel = hiltViewModel()
        val series by viewModel.seriesList.collectAsState()

        var title by remember { mutableStateOf("") }
        var plannedStart by remember { mutableStateOf("18:30") }
        var deadline by remember { mutableStateOf("19:00") }
        var selectedEffort by remember { mutableStateOf(EffortLevel.M) }
        var selectedCategory by remember { mutableStateOf(RoutineCategory.ESTUDAR_LER) }
        var selectedFrequency by remember { mutableStateOf("HOJE") }
        var timesPerWeek by remember { mutableStateOf(3) }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Agenda · Novo Compromisso",
                style = MaterialTheme.typography.titleMedium,
            )

            // Campo 1: Titulo com novelo de edicao ao lado
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = title.isNotBlank()))
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Título do compromisso") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }

            // Campo 2: Horario de inicio e Prazo com novelo ao lado
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true))
                OutlinedTextField(
                    value = plannedStart,
                    onValueChange = { plannedStart = it },
                    label = { Text("Início: HH:mm") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true, isGolden = true))
                OutlinedTextField(
                    value = deadline,
                    onValueChange = { deadline = it },
                    label = { Text("Prazo: HH:mm") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }

            // Campo 3: Esforco P / M / G com novelo
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true))
                Text("Esforço:", style = MaterialTheme.typography.bodySmall)
                EffortLevel.entries.forEach { effort ->
                    FilterChip(
                        selected = selectedEffort == effort,
                        onClick = { selectedEffort = effort },
                        label = { Text("${effort.name} · ${effort.baseFishReward} peixinhos") },
                        modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                    )
                }
            }

            // Campo 4: Categoria da rotina da gatinha
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true))
                Text("Rotina:", style = MaterialTheme.typography.bodySmall)
                listOf(
                    RoutineCategory.ESTUDAR_LER to "Estudar",
                    RoutineCategory.TRABALHAR to "Trabalho",
                    RoutineCategory.TREINAR to "Treino",
                    RoutineCategory.CUIDAR_CASA to "Casa",
                ).forEach { (cat, label) ->
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { selectedCategory = cat },
                        label = { Text(label) },
                        modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                    )
                }
            }

            // Campo 5: Recorrencia
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true))
                listOf(
                    "HOJE" to "Só hoje",
                    "DIARIO" to "Todo dia",
                    "DIAS_UTEIS" to "Dias úteis",
                    "X_SEMANA" to "${timesPerWeek}x por semana",
                ).forEach { (code, label) ->
                    FilterChip(
                        selected = selectedFrequency == code,
                        onClick = { selectedFrequency = code },
                        label = { Text(label) },
                        modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                    )
                }
            }

            PixelButton(
                text = "Enrolar na Agenda",
                modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                onClick = {
                    viewModel.saveCommitment(
                        title = title,
                        effort = selectedEffort,
                        category = selectedCategory,
                        frequencyKind = selectedFrequency,
                        timesPerWeekCount = timesPerWeek,
                        plannedStartText = plannedStart,
                        deadlineText = deadline,
                    )
                    title = ""
                },
                modifier = Modifier.fillMaxWidth(),
            )

            if (series.isNotEmpty()) {
                Text(
                    text = "Séries e Compromissos Ativos (${series.size})",
                    style = MaterialTheme.typography.titleSmall,
                )
                series.forEach { item ->
                    Pixel9PatchCard(
                        modifier = Modifier.fillMaxWidth(),
                        backgroundColor = DeadLinePalette.WallCream,
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(text = item.title, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    text = "Prazo: ${item.deadlineTime} · Esforço ${item.effort.name} · ${item.category.name}",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                            PixelButton(
                                text = "Excluir",
                                onClick = { viewModel.deleteCommitment(item.commitmentId) },
                                containerColor = DeadLinePalette.AlertRed,
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
abstract class AgendaFeatureBindingModule {
    @Binds
    @IntoSet
    abstract fun bindAgendaFeature(impl: AgendaFeatureModule): FeatureModule
}
