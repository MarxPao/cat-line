package com.deadline.core.domain.model

import kotlinx.serialization.Serializable

@JvmInline
@Serializable
value class CommitmentId(val value: String)

@JvmInline
@Serializable
value class OccurrenceId(val value: String)

@JvmInline
@Serializable
value class HabitId(val value: String)

@JvmInline
@Serializable
value class GoalId(val value: String)

@JvmInline
@Serializable
value class LedgerEntryId(val value: String)

@JvmInline
@Serializable
value class CatId(val value: String)

@JvmInline
@Serializable
value class GoalStepId(val value: String)

@JvmInline
@Serializable
value class RewardEventId(val value: String)

@Serializable
enum class CommitmentType {
    TAREFA,
    EVENTO,
    HABITO,
}

@Serializable
enum class EffortLevel(val baseFishReward: Int) {
    P(5),
    M(10),
    G(20),
}

@Serializable
enum class RoutineCategory {
    ESTUDAR_LER,
    TRABALHAR,
    TREINAR,
    COMER,
    HIGIENE,
    LAZER,
    DORMIR,
    CUIDAR_CASA,
    SAIR,
    OCIOSO,
}

@Serializable
enum class OccurrenceState {
    PENDENTE,
    FEITO,
    PERDIDO,
    PULADO,
}

@Serializable
enum class CommitmentState {
    PENDING,
    DONE,
    MISSED,
    RESCHEDULED,
    UNMARKED,
}

@Serializable
enum class CheckInOrigin {
    TOQUE,
    NOTIFICACAO,
    RETROATIVO,
}

@Serializable
enum class DelayTier {
    ADIANTADO,
    NO_PRAZO,
    ATRASADO_LEVE,
    ATRASADO_FORTE,
    PERDIDO,
}

@Serializable
enum class DayCloseTier {
    NENHUM,
    BRONZE,
    PRATA,
    OURO,
}

@Serializable
enum class CatMood(val rank: Int) {
    RADIANTE(4),
    FELIZ(3),
    TRANQUILA(2),
    SONOLENTA(1),
    MANHOSA(0),
}

@Serializable
enum class CurrencyType {
    PEIXINHOS,
    NOVELOS_DOURADOS,
    VINCULO,
}

@Serializable
enum class GoalHorizon {
    VIDA,
    TRIMESTRE,
    MES,
    SEMANA,
    TAREFA,
}

@Serializable
enum class RigorLevel(val level: Int) {
    OBSERVAR(0),
    AVISO(1),
    FRICCAO(2),
    CONDICIONAL(3),
    FIRME(4),
}

@Serializable
enum class CatTemperament {
    FOFA,
    ENGRACADA,
    ACOLHEDORA,
    FIRME,
}

@Serializable
enum class ConversationMode {
    LIVRE,
    DESABAFO,
    PLANEJAR_DIA,
    COBRANCA_GENTIL,
    COMEMORAR,
}
