package com.deadline.core.ui.feature

import androidx.compose.runtime.Composable
import com.deadline.core.domain.config.FeatureFlagKey

/**
 * Contrato de cada modulo de funcionalidade (Secao 2 · AD-11).
 * O :app registra todos os FeatureModule via Hilt e consulta o DataStore
 * para exibir apenas os modulos habilitados pela usuaria.
 */
interface FeatureModule {
    val key: FeatureFlagKey
    val route: String
    val titlePtBr: String
    val subtitlePtBr: String
    val order: Int

    @Composable
    fun ScreenContent()
}
