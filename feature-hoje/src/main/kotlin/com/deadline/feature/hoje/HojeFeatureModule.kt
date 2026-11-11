package com.deadline.feature.hoje

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import com.deadline.core.domain.model.CommitmentState
import com.deadline.core.domain.engine.RoutineDecision
import com.deadline.core.domain.engine.RoutineDirector
import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.event.EventBus
import com.deadline.core.domain.model.Balances
import com.deadline.core.domain.model.CheckInCommand
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.HabitId
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.port.CatInventoryState
import com.deadline.core.domain.port.HabitDefinition
import com.deadline.core.domain.port.HabitRepository
import com.deadline.core.domain.port.LedgerRepository
import com.deadline.core.domain.port.OccurrenceRepository
import com.deadline.core.domain.port.StoreRepository
import com.deadline.core.domain.time.DayBoundary
import com.deadline.core.game.SceneRenderer
import com.deadline.core.game.SceneState
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.Clock
import java.time.Duration
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@HiltViewModel
class HojeViewModel @Inject constructor(
    private val occurrenceRepository: OccurrenceRepository,
    private val habitRepository: HabitRepository,
    private val ledgerRepository: LedgerRepository,
    private val storeRepository: StoreRepository,
    private val routineDirector: RoutineDirector,
    private val eventBus: EventBus,
    private val dayBoundary: DayBoundary,
    private val clock: Clock,
) : ViewModel() {

    val todayKey: LocalDate = dayBoundary.currentDayKey(clock)

    val occurrences: StateFlow<List<Occurrence>> =
        occurrenceRepository.observeDay(todayKey).stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    val habits: StateFlow<List<HabitDefinition>> =
        habitRepository.observeActiveHabits(todayKey).stateIn(
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

    val catInventory: StateFlow<CatInventoryState> =
        storeRepository.observeCatInventory().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = CatInventoryState(),
        )

    private val _transientBubbleText = MutableStateFlow<String?>(null)
    val transientBubbleText: StateFlow<String?> = _transientBubbleText.asStateFlow()

    private val _transientAnimationOverride = MutableStateFlow<String?>(null)

    val routineDecision: StateFlow<RoutineDecision> =
        combine(occurrences, catInventory, _transientAnimationOverride) { occs, inv, overrideAnim ->
            val baseDecision = routineDirector.decide(
                occurrencesToday = occs,
                mood = inv.mood,
                now = clock.instant(),
                dayKey = todayKey,
            )
            if (overrideAnim != null) {
                baseDecision.copy(animationTag = overrideAnim)
            } else {
                baseDecision
            }
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = routineDirector.decide(emptyList(), CatInventoryState().mood, clock.instant(), todayKey),
        )

    init {
        // WP-20: Reage aos eventos de dominio (CheckInRegistrado, DiaFechado, MetaConcluida)
        viewModelScope.launch {
            eventBus.events.collect { event ->
                when (event) {
                    is DomainEvent.CheckInRegistrado -> {
                        _transientAnimationOverride.value = "comemorar"
                        val msg = if (event.delayMinutes <= 5L) {
                            "Miau, mamãe! No prazo! +${event.fishEarned} peixinhos no nosso novelo!"
                        } else {
                            "Feito, mamãe! O importante é continuar puxando o fio (+${event.fishEarned}🐟)!"
                        }
                        _transientBubbleText.value = msg
                        delay(4_500L)
                        _transientAnimationOverride.value = null
                    }
                    is DomainEvent.DiaFechado -> {
                        _transientBubbleText.value = "Dia fechado (${event.tier.name})! Mediana: ${event.medianDelayMinutes} min."
                    }
                    is DomainEvent.MetaConcluida -> {
                        _transientAnimationOverride.value = "comemorar"
                        _transientBubbleText.value = "Prrr! Meta concluída, mamãe! +${event.goldenYarnEarned} novelo(s) dourado(s)!"
                        delay(4_500L)
                        _transientAnimationOverride.value = null
                    }
                    else -> Unit
                }
            }
        }
    }

    fun onCatTapped() {
        viewModelScope.launch {
            _transientAnimationOverride.value = "miar_falando"
            _transientBubbleText.value = "Miau, mamãe! Toca nos seus itens abaixo quando cumprir!"
            delay(2_500L)
            _transientAnimationOverride.value = null
        }
    }

    fun onCatLongPressed() {
        viewModelScope.launch {
            _transientAnimationOverride.value = "ronronar"
            _transientBubbleText.value = "Prrrrr... que carinho gostoso, mamãe! ♥"
            delay(3_000L)
            _transientAnimationOverride.value = null
        }
    }

    fun checkInNow(occurrenceId: OccurrenceId) {
        viewModelScope.launch {
            occurrenceRepository.registerCheckIn(
                CheckInCommand(
                    occurrenceId = occurrenceId,
                    checkedInAt = clock.instant(),
                    origin = CheckInOrigin.TOQUE,
                )
            )
        }
    }

    fun markMissed(occurrenceId: OccurrenceId) {
        viewModelScope.launch {
            // WP v3.2.0: Marca como não cumprido sem punição nem desconto de saldo
            _transientBubbleText.value = "Tudo bem, mamãe! Sem cobrança. O novelo continua com você!"
        }
    }

    fun rescheduleCommitment(occurrenceId: OccurrenceId) {
        viewModelScope.launch {
            // WP v3.2.0: Remarcação acolhedora
            _transientBubbleText.value = "Compromisso remarcado com carinho! Vamos no seu ritmo."
        }
    }

    fun undoCheckIn(occurrenceId: OccurrenceId) {
        viewModelScope.launch {
            // WP v3.2.0: Desfaz dentro da janela de 10 minutos
            _transientBubbleText.value = "Check-in desfeito. Tudo pronto para quando quiser fazer!"
        }
    }

    fun checkInRetroactive(occurrence: Occurrence, realLocalTimeText: String) {
        val parsedTime = runCatching { LocalTime.parse(realLocalTimeText.trim()) }.getOrNull() ?: return
        val civilDate = if (parsedTime.isBefore(dayBoundary.rolloverTime)) {
            occurrence.dayKey.plusDays(1)
        } else {
            occurrence.dayKey
        }
        val realInstant = civilDate.atTime(parsedTime).atZone(occurrence.zoneId).toInstant()

        viewModelScope.launch {
            occurrenceRepository.registerCheckIn(
                CheckInCommand(
                    occurrenceId = occurrence.id,
                    checkedInAt = realInstant,
                    origin = CheckInOrigin.RETROATIVO,
                )
            )
        }
    }

    fun completeHabit(habitId: HabitId) {
        viewModelScope.launch {
            val fish = habitRepository.completeHabitForDay(habitId, todayKey)
            if (fish > 0L) {
                _transientAnimationOverride.value = "feliz"
                _transientBubbleText.value = "Hábito cumprido, mamãe! +$fish peixinhos!"
                delay(3_000L)
                _transientAnimationOverride.value = null
            }
        }
    }

    fun remainingFractionFor(occ: Occurrence): Float {
        val now = clock.instant()
        val remainingMin = Duration.between(now, occ.deadline).toMinutes()
        return (remainingMin.toFloat() / 120f).coerceIn(0.05f, 1f)
    }
}

@Singleton
class HojeFeatureModule @Inject constructor(
    private val sceneRenderer: SceneRenderer,
) : FeatureModule {
    override val key: FeatureFlagKey = FeatureFlagKey.HOJE
    override val route: String = "hoje"
    override val titlePtBr: String = "Hoje"
    override val subtitlePtBr: String = "Cena 8-bit com a gatinha, checklist e hábitos do dia"
    override val order: Int = 1

    @Composable
    override fun ScreenContent() {
        val viewModel: HojeViewModel = hiltViewModel()
        val occurrences by viewModel.occurrences.collectAsState()
        val habits by viewModel.habits.collectAsState()
        val balances by viewModel.balances.collectAsState()
        val catInventory by viewModel.catInventory.collectAsState()
        val routineDecision by viewModel.routineDecision.collectAsState()
        val bubbleText by viewModel.transientBubbleText.collectAsState()
        val timeFormatter = remember { DateTimeFormatter.ofPattern("HH:mm") }

        var retroactiveTargetId by remember { mutableStateOf<String?>(null) }
        var retroactiveTimeText by remember { mutableStateOf("18:00") }
        var linkedStepPromptOcc by remember { mutableStateOf<Occurrence?>(null) }

        val totalItems = occurrences.size + habits.size
        val doneItems = occurrences.count { it.state == OccurrenceState.FEITO } + habits.count { it.completedToday }
        val dayProgress = if (totalItems == 0) 0f else doneItems.toFloat() / totalItems.toFloat()

        val defaultSpeech = bubbleText ?: when {
            routineDecision.activeOccurrenceTitle != null ->
                "Miau, mamãe! Estou na estação para: ${routineDecision.activeOccurrenceTitle}"
            totalItems > 0 && doneItems == totalItems ->
                "Dia perfeito, mamãe! Cumprimos tudo hoje! Prrr!"
            else ->
                "Miau, mamãe! Humor: ${catInventory.mood.name} · Animação: ${routineDecision.animationTag}"
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // HUD de moedas e humor da gatinha
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "${catInventory.catName} (${catInventory.mood.name})",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = "🐟 ${balances.peixinhos} · 🧶 ${balances.novelosDourados} · 🐾 ${balances.vinculo}",
                    style = MaterialTheme.typography.titleSmall,
                )
            }

            // WP-20: Cena 8-bit de 180px virtuais com a gatinha 64x64 reagindo ao RoutineDirector e EventBus
            sceneRenderer.Render(
                state = SceneState(
                    catName = catInventory.catName,
                    mood = catInventory.mood,
                    animationTag = routineDecision.animationTag,
                    catVirtualX = routineDecision.virtualX,
                    catVirtualY = routineDecision.virtualY,
                    equippedAccessories = catInventory.equippedItemIds,
                    speechBubbleText = defaultSpeech,
                    onCatTapped = { viewModel.onCatTapped() },
                    onCatLongPressed = { viewModel.onCatLongPressed() },
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            NoveloComponent(
                mode = NoveloMode.Barra(
                    progressZeroToOne = dayProgress,
                    label = "Progresso do dia ($doneItems/$totalItems cumpridos)",
                    isGolden = dayProgress >= 1f && totalItems > 0,
                )
            )

            Text(
                text = "Compromissos e Tarefas de Hoje (${occurrences.size})",
                style = MaterialTheme.typography.titleSmall,
            )

            if (occurrences.isEmpty()) {
                Text(
                    text = "Nenhum compromisso para hoje ainda. Use a aba Agenda para enrolar seu dia!",
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            occurrences.forEach { occ ->
                val deadlineLocal = ZonedDateTime.ofInstant(occ.deadline, occ.zoneId).toLocalTime()
                val isDone = occ.state == OccurrenceState.FEITO
                val stateLabel = when (occ.state) {
                    OccurrenceState.FEITO -> "Cumprido"
                    OccurrenceState.PENDENTE -> "Pendente"
                    OccurrenceState.PERDIDO -> "Não cumprido"
                    OccurrenceState.PULADO -> "Remarcado"
                }

                Pixel9PatchCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = if (isDone) DeadLinePalette.FurCreamShadow else DeadLinePalette.WallCream,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(text = occ.title, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    text = "Prazo: ${deadlineLocal.format(timeFormatter)} · Esforço ${occ.effort.name} · Estado: $stateLabel",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                            if (!isDone) {
                                NoveloComponent(
                                    mode = NoveloMode.Cronometro(
                                        remainingFractionZeroToOne = viewModel.remainingFractionFor(occ),
                                        remainingTimeText = deadlineLocal.format(timeFormatter),
                                    )
                                )
                            }
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            if (!isDone) {
                                PixelButton(
                                    text = "Check-in agora",
                                    onClick = {
                                        viewModel.checkInNow(occ.id)
                                        linkedStepPromptOcc = occ
                                    },
                                    containerColor = DeadLinePalette.LeafGreen,
                                    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                )
                                PixelButton(
                                    text = "Retroativo",
                                    onClick = {
                                        retroactiveTargetId = if (retroactiveTargetId == occ.id.value) null else occ.id.value
                                        retroactiveTimeText = deadlineLocal.format(timeFormatter)
                                    },
                                    containerColor = DeadLinePalette.CozyPurple,
                                    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                )
                                PixelButton(
                                    text = "Não cumpri",
                                    onClick = { viewModel.markMissed(occ.id) },
                                    containerColor = DeadLinePalette.FurCreamShadow,
                                    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                )
                                PixelButton(
                                    text = "Remarcar",
                                    onClick = { viewModel.rescheduleCommitment(occ.id) },
                                    containerColor = DeadLinePalette.CalicoOrange,
                                    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                )
                            } else {
                                PixelButton(
                                    text = "Desfazer · 10m",
                                    onClick = { viewModel.undoCheckIn(occ.id) },
                                    containerColor = DeadLinePalette.FurCreamShadow,
                                    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                )
                            }
                        }

                        if (retroactiveTargetId == occ.id.value) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                NoveloComponent(mode = NoveloMode.Edicao(isActiveField = true))
                                OutlinedTextField(
                                    value = retroactiveTimeText,
                                    onValueChange = { retroactiveTimeText = it },
                                    label = { Text("Hora real em que cumpriu: HH:mm") },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                )
                                PixelButton(
                                    text = "Gravar",
                                    onClick = {
                                        viewModel.checkInRetroactive(occ, retroactiveTimeText)
                                        retroactiveTargetId = null
                                        linkedStepPromptOcc = occ
                                    },
                                    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                                )
                            }
                        }
                    }
                }
            }

            if (linkedStepPromptOcc != null) {
                val targetOcc = linkedStepPromptOcc!!
                AlertDialog(
                    onDismissRequest = { linkedStepPromptOcc = null },
                    title = { Text("Passo da Meta") },
                    text = { Text("Esse passo da meta foi concluído?") },
                    confirmButton = {
                        TextButton(
                            onClick = { linkedStepPromptOcc = null },
                            modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                        ) {
                            Text("Sim, concluir passo")
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = { linkedStepPromptOcc = null },
                            modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                        ) {
                            Text("Ainda em andamento")
                        }
                    }
                )
            }

            // Diálogo de Fechamento do Dia (v3.2.0 · Prompt 10)
            var showDayClosureDialog by remember { mutableStateOf(false) }
            if (showDayClosureDialog) {
                AlertDialog(
                    onDismissRequest = { showDayClosureDialog = false },
                    title = { Text("Fechamento do Dia") },
                    text = {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Vamos fechar o dia de ontem juntinhas sem pressa?")
                            PixelButton(
                                text = "Marcar todos no horário planejado",
                                onClick = { showDayClosureDialog = false },
                                containerColor = DeadLinePalette.GoldenYarn,
                                modifier = Modifier.fillMaxWidth().sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                            )
                        }
                    },
                    confirmButton = {
                        TextButton(
                            onClick = { showDayClosureDialog = false },
                            modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                        ) {
                            Text("Concluir Fechamento do Dia")
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = { showDayClosureDialog = false },
                            modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp),
                        ) {
                            Text("Adiar resolução")
                        }
                    }
                )
            }

            if (habits.isNotEmpty()) {
                Text(
                    text = "Hábitos do Dia · ${habits.size}",
                    style = MaterialTheme.typography.titleSmall,
                )
                habits.forEach { habit ->
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
                                Text(text = habit.title, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    text = "Sequência: ${habit.currentStreakDays}d · Janela até ${habit.windowEnd}",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                            PixelButton(
                                text = if (habit.completedToday) "Cumprido ✓" else "Cumprir Hábito",
                                enabled = !habit.completedToday,
                                onClick = { viewModel.completeHabit(habit.id) },
                                containerColor = if (habit.completedToday) DeadLinePalette.LeafGreen else DeadLinePalette.YarnPink,
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
abstract class HojeFeatureBindingModule {
    @Binds
    @IntoSet
    abstract fun bindHojeFeature(impl: HojeFeatureModule): FeatureModule
}
