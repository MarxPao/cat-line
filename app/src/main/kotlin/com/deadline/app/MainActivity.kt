package com.deadline.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.deadline.core.domain.config.FeatureFlagKey
import com.deadline.core.domain.config.FeatureFlagsRepository
import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.event.EventBus
import com.deadline.core.ui.components.NoveloScreenAnticBanner
import com.deadline.core.ui.components.Pixel9PatchCard
import com.deadline.core.ui.components.PixelSpeechBubble
import com.deadline.core.ui.feature.FeatureModule
import com.deadline.core.ui.theme.DeadLinePixelTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var featureModules: Set<@JvmSuppressWildcards FeatureModule>

    @Inject
    lateinit var featureFlagsRepository: FeatureFlagsRepository

    @Inject
    lateinit var eventBus: EventBus

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sortedModules = featureModules.sortedBy { it.order }

        setContent {
            DeadLinePixelTheme {
                DeadLineAppShell(
                    allModules = sortedModules,
                    featureFlagsRepository = featureFlagsRepository,
                    eventBus = eventBus,
                )
            }
        }
    }
}

@Composable
fun DeadLineAppShell(
    allModules: List<FeatureModule>,
    featureFlagsRepository: FeatureFlagsRepository,
    eventBus: EventBus,
) {
    val enabledFlags by featureFlagsRepository.observeEnabledFlags().collectAsState(
        initial = FeatureFlagKey.entries.associateWith { it.defaultEnabled }
    )
    val latestEvent by eventBus.events.collectAsState(initial = null)
    val scope = rememberCoroutineScope()

    val activeModules = remember(allModules, enabledFlags) {
        allModules.filter { enabledFlags[it.key] != false }
    }

    var selectedRoute by remember(activeModules) {
        mutableStateOf(activeModules.firstOrNull()?.route ?: "hoje")
    }

    val currentModule = activeModules.find { it.route == selectedRoute } ?: activeModules.firstOrNull()

    Scaffold(
        bottomBar = {
            NavigationBar {
                activeModules.take(5).forEach { module ->
                    NavigationBarItem(
                        selected = currentModule?.route == module.route,
                        onClick = { selectedRoute = module.route },
                        icon = { Text(text = module.titlePtBr.take(2).uppercase()) },
                        label = { Text(text = module.titlePtBr) },
                    )
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    text = stringResource(R.string.app_name),
                    style = MaterialTheme.typography.headlineMedium,
                )
                Text(
                    text = stringResource(R.string.app_subtitle),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            item {
                val anticTrigger = when (val ev = latestEvent) {
                    is DomainEvent.CheckInRegistrado -> "checkin:${ev.occurrenceId.value}"
                    is DomainEvent.MetaConcluida -> "goal:${ev.goalId.value}"
                    else -> null
                }
                NoveloScreenAnticBanner(
                    enabled = enabledFlags[FeatureFlagKey.NOVELO_GRACINHAS] != false,
                    externalTriggerReason = anticTrigger,
                )
            }

            item {
                Pixel9PatchCard(modifier = Modifier.fillMaxWidth()) {
                    currentModule?.ScreenContent()
                }
            }

            item {
                Text(
                    text = stringResource(R.string.modularity_section_title),
                    style = MaterialTheme.typography.titleMedium,
                )
            }

            items(allModules, key = { it.key.name }) { module ->
                val isEnabled = enabledFlags[module.key] != false
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = module.titlePtBr,
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(
                                text = module.subtitlePtBr,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        Switch(
                            checked = isEnabled,
                            enabled = module.key.canBeDisabled,
                            onCheckedChange = { checked ->
                                scope.launch {
                                    featureFlagsRepository.setEnabled(module.key, checked)
                                }
                            },
                        )
                    }
                }
            }

            item {
                val anticsEnabled = enabledFlags[FeatureFlagKey.NOVELO_GRACINHAS] != false
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Gracinhas do Novelo nas telas",
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(
                                text = "O mini novelo rola, se enrosca e comemora seus check-ins",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        Switch(
                            checked = anticsEnabled,
                            onCheckedChange = { checked ->
                                scope.launch {
                                    featureFlagsRepository.setEnabled(FeatureFlagKey.NOVELO_GRACINHAS, checked)
                                }
                            },
                        )
                    }
                }
            }
        }
    }
}
