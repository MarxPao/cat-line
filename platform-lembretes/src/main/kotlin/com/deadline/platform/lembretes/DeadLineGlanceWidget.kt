package com.deadline.platform.lembretes

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.Button
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.Text
import com.deadline.core.domain.model.CheckInCommand
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.time.DayBoundary
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.flow.first

/**
 * Widget Glance na tela inicial do Android (WP-23 · Secao 12 e Secao 24):
 * Mostra os proximos compromissos pendentes do dia logico atual e permite
 * fazer check-in rapido direto da tela inicial ("Feito").
 */
class DeadLineGlanceAppWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val appContext = context.applicationContext
        val entryPoint = EntryPointAccessors.fromApplication(
            appContext,
            ReminderReceiverEntryPoint::class.java,
        )
        val todayKey = DayBoundary().currentDayKey(entryPoint.clock())
        val occurrences = runCatching {
            entryPoint.occurrenceRepository().observeDay(todayKey).first()
                .filter { it.state == OccurrenceState.PENDENTE }
                .take(3)
        }.getOrDefault(emptyList())

        provideContent {
            WidgetContent(occurrences = occurrences.map { it.id.value to it.title })
        }
    }

    @Composable
    private fun WidgetContent(occurrences: List<Pair<String, String>>) {
        Column(
            modifier = GlanceModifier
                .fillMaxWidth()
                .padding(12.dp),
        ) {
            Text(text = "Dead Line 🐾 Próximos Prazos")
            Spacer(modifier = GlanceModifier.height(6.dp))
            if (occurrences.isEmpty()) {
                Text(text = "Miau! Tudo em dia por enquanto, mamãe!")
            } else {
                occurrences.forEach { (occId, title) ->
                    Row(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                    ) {
                        Text(
                            text = title,
                            modifier = GlanceModifier.defaultWeight(),
                        )
                        Button(
                            text = "Feito",
                            onClick = actionRunCallback<QuickCheckInWidgetAction>(
                                actionParametersOf(PARAM_OCCURRENCE_ID to occId)
                            ),
                        )
                    }
                }
            }
        }
    }

    companion object {
        val PARAM_OCCURRENCE_ID = ActionParameters.Key<String>("occurrence_id")
    }
}

class QuickCheckInWidgetAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val occId = parameters[DeadLineGlanceAppWidget.PARAM_OCCURRENCE_ID] ?: return
        val appContext = context.applicationContext
        val entryPoint = EntryPointAccessors.fromApplication(
            appContext,
            ReminderReceiverEntryPoint::class.java,
        )
        entryPoint.occurrenceRepository().registerCheckIn(
            CheckInCommand(
                occurrenceId = OccurrenceId(occId),
                checkedInAt = entryPoint.clock().instant(),
                origin = CheckInOrigin.TOQUE,
            )
        )
        DeadLineGlanceAppWidget().update(appContext, glanceId)
    }
}

class DeadLineWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = DeadLineGlanceAppWidget()
}
