package com.deadline.feature.loja

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deadline.core.domain.config.FeatureFlagKey
import com.deadline.core.domain.model.Balances
import com.deadline.core.domain.model.CurrencyType
import com.deadline.core.domain.port.CatInventoryState
import com.deadline.core.domain.port.LedgerRepository
import com.deadline.core.domain.port.StoreCatalogItem
import com.deadline.core.domain.port.StoreItemCategory
import com.deadline.core.domain.port.StoreRepository
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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@HiltViewModel
class LojaViewModel @Inject constructor(
    private val storeRepository: StoreRepository,
    private val ledgerRepository: LedgerRepository,
) : ViewModel() {

    val catalog: List<StoreCatalogItem> = storeRepository.getCatalog()

    val inventory: StateFlow<CatInventoryState> =
        storeRepository.observeCatInventory().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = CatInventoryState(),
        )

    val balances: StateFlow<Balances> =
        ledgerRepository.balance().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = Balances(),
        )

    private val _feedbackMessage = MutableStateFlow<String?>(null)
    val feedbackMessage: StateFlow<String?> = _feedbackMessage.asStateFlow()

    fun buy(item: StoreCatalogItem) {
        viewModelScope.launch {
            storeRepository.purchaseItem(item.id)
                .onSuccess {
                    _feedbackMessage.value = "Miau! Compramos ${item.titlePtBr}!"
                }
                .onFailure { err ->
                    _feedbackMessage.value = err.message ?: "Não foi possível comprar este item."
                }
        }
    }

    fun toggleEquip(itemId: String) {
        viewModelScope.launch {
            storeRepository.toggleEquipCosmetic(itemId)
        }
    }

    fun setRestMode(enabled: Boolean) {
        viewModelScope.launch {
            storeRepository.setRestMode(enabled)
        }
    }
}

@Singleton
class LojaFeatureModule @Inject constructor() : FeatureModule {
    override val key: FeatureFlagKey = FeatureFlagKey.LOJA
    override val route: String = "loja"
    override val titlePtBr: String = "Lojinha"
    override val subtitlePtBr: String = "Roupas, acessórios, móveis, áreas e novos gatinhos"
    override val order: Int = 6

    @Composable
    override fun ScreenContent() {
        val viewModel: LojaViewModel = hiltViewModel()
        val inventory by viewModel.inventory.collectAsState()
        val balances by viewModel.balances.collectAsState()
        val feedback by viewModel.feedbackMessage.collectAsState()

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Lojinha da Gatinha",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = "🐟 ${balances.peixinhos} · 🧶 ${balances.novelosDourados} · 🐾 ${balances.vinculo}",
                    style = MaterialTheme.typography.titleSmall,
                )
            }

            // Modo descanso (congela humor e sequencias sem perda - Secao 18 e Secao 19)
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
                        Text(
                            text = "Modo Descanso (Congela humor e sequências)",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            text = "Novelos reserva guardados: ${inventory.reserveYarnsHeld}/2",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Switch(
                        checked = inventory.isRestModeActive,
                        onCheckedChange = { viewModel.setRestMode(it) },
                    )
                }
            }

            feedback?.let { msg ->
                Text(text = msg, style = MaterialTheme.typography.bodyMedium)
            }

            viewModel.catalog.forEach { item ->
                val isOwned = item.id in inventory.ownedItemIds
                val isEquipped = item.id in inventory.equippedItemIds
                val currencyIcon = if (item.currency == CurrencyType.PEIXINHOS) "🐟" else "🧶"

                Pixel9PatchCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = DeadLinePalette.FurWhite,
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "${item.titlePtBr} (${item.price} $currencyIcon)",
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(
                                text = item.descriptionPtBr,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        if (isOwned && item.category !in setOf(StoreItemCategory.COMIDA_BRINQUEDO, StoreItemCategory.NOVELO_RESERVA)) {
                            PixelButton(
                                text = if (isEquipped) "Equipado ✓" else "Equipar",
                                onClick = { viewModel.toggleEquip(item.id) },
                                containerColor = if (isEquipped) DeadLinePalette.LeafGreen else DeadLinePalette.CozyPurple,
                            )
                        } else {
                            PixelButton(
                                text = "Comprar",
                                onClick = { viewModel.buy(item) },
                                containerColor = if (item.currency == CurrencyType.PEIXINHOS) {
                                    DeadLinePalette.CalicoOrange
                                } else {
                                    DeadLinePalette.GoldenYarn
                                },
                                textColor = if (item.currency == CurrencyType.PEIXINHOS) {
                                    DeadLinePalette.FurWhite
                                } else {
                                    DeadLinePalette.InkBlack
                                },
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
abstract class LojaFeatureBindingModule {
    @Binds
    @IntoSet
    abstract fun bindLojaFeature(impl: LojaFeatureModule): FeatureModule
}
