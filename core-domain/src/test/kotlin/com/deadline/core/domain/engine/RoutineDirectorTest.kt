package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RoutineCategory
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class RoutineDirectorTest {

    private val director = RoutineDirector()
    private val zone = ZoneId.of("America/Sao_Paulo")
    private val dayKey = LocalDate.of(2026, 10, 25)
    private val baseTime = Instant.parse("2026-10-25T14:00:00Z")

    private fun makeOcc(
        id: String,
        category: RoutineCategory,
        plannedStart: Instant?,
        deadline: Instant,
        state: OccurrenceState,
    ) = Occurrence(
        id = OccurrenceId(id),
        commitmentId = CommitmentId("c-$id"),
        title = "Item $id",
        type = CommitmentType.TAREFA,
        effort = EffortLevel.M,
        category = category,
        dayKey = dayKey,
        zoneId = zone,
        plannedStart = plannedStart,
        deadline = deadline,
        state = state,
    )

    @Test
    fun `prioridade 1 vence quando ha compromisso em andamento`() {
        val ongoingStudy = makeOcc(
            id = "1",
            category = RoutineCategory.ESTUDAR_LER,
            plannedStart = baseTime.minusSeconds(10 * 60),
            deadline = baseTime.plusSeconds(30 * 60),
            state = OccurrenceState.PENDENTE,
        )
        val lateOther = makeOcc(
            id = "2",
            category = RoutineCategory.TRABALHAR,
            plannedStart = baseTime.minusSeconds(60 * 60),
            deadline = baseTime.minusSeconds(30 * 60),
            state = OccurrenceState.PENDENTE,
        )

        val decision = director.decide(listOf(lateOther, ongoingStudy), CatMood.FELIZ, baseTime, dayKey)
        assertEquals(RoutinePriorityReason.COMPROMISSO_EM_ANDAMENTO, decision.reason)
        assertEquals("estudar_ler", decision.animationTag)
        assertEquals("estante_livros", decision.stationId)
    }

    @Test
    fun `prioridade 2 olha o relogio quando o inicio planejado ou prazo passou sem check-in`() {
        val lateTask = makeOcc(
            id = "1",
            category = RoutineCategory.TREINAR,
            plannedStart = null,
            deadline = baseTime.minusSeconds(5 * 60),
            state = OccurrenceState.PENDENTE,
        )

        val decision = director.decide(listOf(lateTask), CatMood.FELIZ, baseTime, dayKey)
        assertEquals(RoutinePriorityReason.INICIO_PASSOU_SEM_CHECKIN, decision.reason)
        assertEquals("olhar_relogio", decision.animationTag)
    }

    @Test
    fun `prioridade 3 comemora quando todos os itens do dia estao feitos`() {
        val done1 = makeOcc("1", RoutineCategory.ESTUDAR_LER, null, baseTime, OccurrenceState.FEITO)
        val done2 = makeOcc("2", RoutineCategory.TREINAR, null, baseTime, OccurrenceState.FEITO)

        val decision = director.decide(listOf(done1, done2), CatMood.TRANQUILA, baseTime, dayKey)
        assertEquals(RoutinePriorityReason.TUDO_DO_DIA_FEITO, decision.reason)
        assertEquals("comemorar", decision.animationTag)
    }

    @Test
    fun `prioridade 4 sorteia comportamento livre de forma deterministica para a mesma semente`() {
        val first = director.decide(emptyList(), CatMood.MANHOSA, baseTime, dayKey, minuteSlotSeedOffset = 100L)
        val second = director.decide(emptyList(), CatMood.MANHOSA, baseTime, dayKey, minuteSlotSeedOffset = 100L)

        assertEquals(RoutinePriorityReason.COMPORTAMENTO_LIVRE, first.reason)
        assertEquals(first, second)
    }
}
