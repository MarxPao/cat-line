package com.deadline.core.domain.config

import kotlinx.coroutines.flow.Flow

/**
 * Chaves dos modulos que a usuaria pode ligar e desligar a qualquer momento (Secao 3 e AD-11).
 */
enum class FeatureFlagKey(
    val storageKey: String,
    val defaultEnabled: Boolean = true,
    val canBeDisabled: Boolean = true,
) {
    HOJE("feature_hoje_enabled", defaultEnabled = true, canBeDisabled = false),
    AGENDA("feature_agenda_enabled", defaultEnabled = true, canBeDisabled = true),
    HABITOS("feature_habitos_enabled", defaultEnabled = true, canBeDisabled = true),
    METAS("feature_metas_enabled", defaultEnabled = true, canBeDisabled = true),
    INSIGHTS("feature_insights_enabled", defaultEnabled = true, canBeDisabled = true),
    LOJA("feature_loja_enabled", defaultEnabled = true, canBeDisabled = true),
    CONVERSA("feature_conversa_enabled", defaultEnabled = true, canBeDisabled = true),
    FOCO("feature_foco_enabled", defaultEnabled = true, canBeDisabled = true),
    NOVELO_GRACINHAS("novelo_gracinhas_enabled", defaultEnabled = true, canBeDisabled = true),
    METAS_PASSOS("feature_metas_passos_enabled", defaultEnabled = true, canBeDisabled = true),
    COMPROMISSOS("feature_compromissos_enabled", defaultEnabled = true, canBeDisabled = true),
    LOG_SEMANAL("feature_log_semanal_enabled", defaultEnabled = true, canBeDisabled = true),
}

interface FeatureFlagsRepository {
    fun observeEnabledFlags(): Flow<Map<FeatureFlagKey, Boolean>>
    fun isEnabled(key: FeatureFlagKey): Flow<Boolean>
    suspend fun setEnabled(key: FeatureFlagKey, enabled: Boolean)
}
