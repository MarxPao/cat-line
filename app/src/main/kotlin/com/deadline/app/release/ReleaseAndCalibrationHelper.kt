package com.deadline.app.release

import com.deadline.core.domain.config.EconomyConfig
import kotlin.math.roundToLong

data class ApkReleaseVersionStatus(
    val currentVersionCode: Int,
    val currentVersionName: String,
    val latestAvailableVersionCode: Int,
    val latestAvailableVersionName: String,
    val downloadUrl: String? = null,
) {
    val isUpdateAvailable: Boolean
        get() = latestAvailableVersionCode > currentVersionCode
}

/**
 * Utilitario de verificacao opcional de nova versao para instalacao direta fora da Play Store
 * e recalibracao da economia apos duas semanas de uso real (WP-33 · Secao 19 e Secao 24).
 */
object ReleaseAndCalibrationHelper {

    fun checkVersion(
        installedVersionCode: Int,
        installedVersionName: String,
        remoteVersionCode: Int = installedVersionCode,
        remoteVersionName: String = installedVersionName,
    ): ApkReleaseVersionStatus = ApkReleaseVersionStatus(
        currentVersionCode = installedVersionCode,
        currentVersionName = installedVersionName,
        latestAvailableVersionCode = remoteVersionCode,
        latestAvailableVersionName = remoteVersionName,
    )

    /**
     * Recalibra os precos de referencia da loja depois de 14 dias de uso real da cliente,
     * mantendo a proporcao da Secao 19 (1 dia tipico = referencia de ~100 peixinhos).
     */
    fun recalibratePricesAfterTwoWeeks(
        baseConfig: EconomyConfig,
        observedDailyFishLast14Days: List<Long>,
    ): EconomyConfig {
        if (observedDailyFishLast14Days.size < 14) return baseConfig
        val observedAvg = observedDailyFishLast14Days.average().coerceIn(40.0, 250.0)
        val scale = observedAvg / 100.0
        val prices = baseConfig.storeReferencePrices

        fun scalePrice(original: Long): Long =
            (original.toDouble() * scale).roundToLong().coerceAtLeast(5L)

        return baseConfig.copy(
            version = baseConfig.version + 1,
            storeReferencePrices = prices.copy(
                simpleCosmeticMin = scalePrice(prices.simpleCosmeticMin),
                simpleCosmeticMax = scalePrice(prices.simpleCosmeticMax),
                mediumCosmeticOrFurnitureMin = scalePrice(prices.mediumCosmeticOrFurnitureMin),
                mediumCosmeticOrFurnitureMax = scalePrice(prices.mediumCosmeticOrFurnitureMax),
                largeSceneItemMin = scalePrice(prices.largeSceneItemMin),
                largeSceneItemMax = scalePrice(prices.largeSceneItemMax),
                foodOrToyMin = scalePrice(prices.foodOrToyMin),
                foodOrToyMax = scalePrice(prices.foodOrToyMax),
            ),
        )
    }
}
