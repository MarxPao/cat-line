package com.deadline.feature.habitos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import com.deadline.core.domain.model.HabitId
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.port.HabitDefinition
import com.deadline.core.domain.port.HabitRepository
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
class HabitosViewModel @Inject constructor(
    private val habitRepository: HabitRepository,
    private val dayBoundary: DayBoundary,
    private val clock: Clock,
) : ViewModel() {

    private val currentDayKey get() = dayBoundary.currentDayKey(clock)

    val habits: StateFlow<List<HabitDefinition>> =
        habitRepository.observeActiveHabits(currentDayKey).stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    fun createHabit(
        title: String,
        category: RoutineCategory,
        freqCode: String,
        timesPerWeek: Int,
        windowStartText: String,
        windowEndText: String,
    ) {
        if (title.isBlank()) return
        val start = runCatching { LocalTime.parse(windowStartText.trim()) }.getOrNull()
        val end = runCatching { LocalTime.parse(windowEndText.trim()) }.getOrElse { LocalTime.of(22, 0) }
        val freq = when (freqCode) {
            "DIAS_UTEIS" -> RecurrenceFrequency.Weekdays
            "X_SEMANA" -> RecurrenceFrequency.TimesPerWeek(timesPerWeek.coerceIn(1, 7))
            else -> RecurrenceFrequency.Daily
        }
        val weeklyTarget = when (freq) {
            is RecurrenceFrequency.TimesPerWeek -> freq.count
            RecurrenceFrequency.Weekdays -> 5
            else -> 7
        }

        viewModelScope.launch {
            habitRepository.upsertHabit(
                HabitDefinition(
                    id = HabitId(UUID.randomUUID().toString()),
                    title = title.trim(),
                    category = category,
                    frequency = freq,
                    windowStart = start,
                    windowEnd = end,
                    weeklyTarget = weeklyTarget,
                )
            )
        }
    }

    fun markHabitDoneToday(habitId: HabitId) {
        viewModelScope.launch {
            habitRepository.completeHabitForDay(habitId, currentDayKey)
        }
    }

    fun useReserveYarn(habitId: HabitId) {
        viewModelScope.launch {
            habitRepository.applyReserveYarnToProtectStreak(habitId, currentDayKey.minusDays(1))
        }
    }
}

@Singleton
class HabitosFeatureModule @Inject constructor() : FeatureModule {
    override val key: FeatureFlagKey = FeatureFlagKey.HABITOS
    override val route: String = "habitos"
    override val titlePtBr: String = "Hábitos"
    override val subtitlePtBr: String = "Frequências, janelas de horário e sequências com novelo reserva"
    override val order: Int = 3

    @Composable
    override fun ScreenContent() {
        val viewModel: HabitosViewModel = hiltViewModel()
        val habits by viewModel.habits.collectAsState()

        var title by remember { mutableStateOf("") }
        var windowStart by remember { mutableStateOf("08:00") }
        var windowEnd by remember { mutableStateOf("21:00") }
        var freqCode by remember { mutableStateOf("DIARIO") }
        var timesPerWeek by remember { mutableStateOf(3) }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Hábitos · Sequências & Novelo Reserva",
                style = MaterialTheme.typography.titleMedium,
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = title.isNotBlank()))
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Novo hábito (ex: Beber água, Ler 20 min)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true))
                OutlinedTextField(
                    value = windowStart,
                    onValueChange = { windowStart = it },
                    label = { Text("Janela início (HH:mm)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = windowEnd,
                    onValueChange = { windowEnd = it },
                    label = { Text("Janela fim (HH:mm)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true, isGolden = true))
                listOf(
                    "DIARIO" to "Todos os dias",
                    "DIAS_UTEIS" to "Dias úteis",
                    "X_SEMANA" to "${timesPerWeek}x na semana",
                ).forEach { (code, label) ->
                    FilterChip(
                        selected = freqCode == code,
                        onClick = { freqCode = code },
                        label = { Text(label) },
                    )
                }
            }

            PixelButton(
                text = "Criar Hábito (+8🐟 base)",
                onClick = {
                    viewModel.createHabit(
                        title = title,
                        category = RoutineCategory.HIGIENE,
                        freqCode = freqCode,
                        timesPerWeek = timesPerWeek,
                        windowStartText = windowStart,
                        windowEndText = windowEnd,
                    )
                    title = ""
                },
                modifier = Modifier.fillMaxWidth(),
            )

            habits.forEach { habit ->
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
                                Text(text = habit.title, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    text = "Sequência: ${habit.currentStreakDays} dias · Janela até ${habit.windowEnd} · Novelos reserva: ${habit.reserveYarnsAvailable}",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                            PixelButton(
                                text = if (habit.completedToday) "Feito hoje!" else "Cumprir",
                                enabled = !habit.completedToday,
                                onClick = { viewModel.markHabitDoneToday(habit.id) },
                                containerColor = if (habit.completedToday) DeadLinePalette.LeafGreen else DeadLinePalette.CalicoOrange,
                            )
                        }

                        NoveloComponent(
                            mode = NoveloMode.Barra(
                                progressZeroToOne = (habit.currentStreakDays.coerceAtMost(25) / 25f),
                                label = "Bônus de sequência (teto 1,5x aos 25 dias)",
                                isGolden = habit.currentStreakDays >= 7,
                            )
                        )

                        if (habit.reserveYarnsAvailable > 0) {
                            PixelButton(
                                text = "Usar Novelo Reserva (proteger dia perdido)",
                                onClick = { viewModel.useReserveYarn(habit.id) },
                                containerColor = DeadLinePalette.GoldenYarn,
                                textColor = DeadLinePalette.InkBlack,
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
abstract class HabitosFeatureBindingModule {
    @Binds
    @IntoSet
    abstract fun bindHabitosFeature(impl: HabitosFeatureModule): FeatureModule
}
