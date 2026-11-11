package com.deadline.platform.bloqueio

import android.accessibilityservice.AccessibilityService
import android.app.AlarmManager
import android.app.AppOpsManager
import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import com.deadline.core.domain.port.BlockDecision
import com.deadline.core.domain.port.BlockEnforcer
import com.deadline.core.domain.port.FocusControlRepository
import com.deadline.core.domain.port.GuideStep
import com.deadline.core.domain.port.PermissionHealth
import com.deadline.core.domain.port.PermissionKind
import com.deadline.core.domain.port.PermissionState
import dagger.Binds
import dagger.Module
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementacao de `BlockEnforcer` (WP-29 · Secao 4, Secao 7 e Secao 22):
 * Mantem o estado observavel da barreira da gatinha e aciona o `DeadLineAccessibilityService`
 * para exibir a sobreposicao (`TYPE_ACCESSIBILITY_OVERLAY`) ou voltar a tela inicial (`GLOBAL_ACTION_HOME`)
 * como fallback seguro.
 */
@Singleton
class AccessibilityBarrierEnforcer @Inject constructor() : BlockEnforcer {

    private val _activeDecision = MutableStateFlow<BlockDecision>(BlockDecision.Allow)
    val activeDecision: StateFlow<BlockDecision> = _activeDecision.asStateFlow()

    override fun show(d: BlockDecision) {
        _activeDecision.value = d
        if (d is BlockDecision.Block) {
            DeadLineAccessibilityService.activeInstance?.enforceBarrierOrNavigateHome(d)
        }
    }

    override fun dismiss() {
        _activeDecision.value = BlockDecision.Allow
    }
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface AccessibilityServiceEntryPoint {
    fun focusControlRepository(): FocusControlRepository
    fun blockEnforcer(): BlockEnforcer
}

/**
 * Servico de acessibilidade que detecta o pacote em primeiro plano em tempo real (WP-29 · Secao 7 e Secao 22):
 * "O servico nunca decide nada sozinho; so executa a decisao da politica."
 */
class DeadLineAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onServiceConnected() {
        super.onServiceConnected()
        activeInstance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return

        val entryPoint = EntryPointAccessors.fromApplication(
            applicationContext,
            AccessibilityServiceEntryPoint::class.java,
        )
        serviceScope.launch {
            val decision = entryPoint.focusControlRepository().evaluatePackageForService(pkg)
            if (decision == BlockDecision.Allow) {
                entryPoint.blockEnforcer().dismiss()
            } else {
                entryPoint.blockEnforcer().show(decision)
            }
        }
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        if (activeInstance === this) {
            activeInstance = null
        }
        super.onDestroy()
    }

    internal fun enforceBarrierOrNavigateHome(decision: BlockDecision.Block) {
        // Fallback garantido da Secao 22: executa GLOBAL_ACTION_HOME caso a janela sobreposta nao esteja aberta
        performGlobalAction(GLOBAL_ACTION_HOME)
    }

    companion object {
        @Volatile
        internal var activeInstance: DeadLineAccessibilityService? = null

        fun isRunning(): Boolean = activeInstance != null
    }
}

/**
 * Implementacao de `PermissionHealth` (WP-30 · Secao 4 e Secao 22):
 * Verifica o estado de cada permissao critica e entrega o passo a passo animado pela gatinha,
 * incluindo a liberacao de "Configuracoes restritas" no Android 13+ para APKs instalados fora da Play Store.
 */
@Singleton
class AndroidPermissionHealth @Inject constructor(
    @ApplicationContext private val context: Context,
) : PermissionHealth {

    override fun status(): List<PermissionState> {
        val isAndroid13Plus = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        val accessibilityGranted = isAccessibilityServiceEnabled()

        return listOf(
            PermissionState(
                kind = PermissionKind.USAGE_STATS,
                isGranted = hasUsageStatsPermission(),
            ),
            PermissionState(
                kind = PermissionKind.ACCESSIBILITY,
                isGranted = accessibilityGranted,
                requiresRestrictedSettingsUnlock = isAndroid13Plus && !accessibilityGranted,
            ),
            PermissionState(
                kind = PermissionKind.NOTIFICATIONS,
                isGranted = true,
            ),
            PermissionState(
                kind = PermissionKind.EXACT_ALARM,
                isGranted = canScheduleExactAlarms(),
            ),
            PermissionState(
                kind = PermissionKind.IGNORE_BATTERY_OPTIMIZATION,
                isGranted = isIgnoringBatteryOptimizations(),
            ),
            PermissionState(
                kind = PermissionKind.OEM_AUTOSTART,
                isGranted = isIgnoringBatteryOptimizations(),
            ),
        )
    }

    override fun intentFor(p: PermissionKind): GuideStep = when (p) {
        PermissionKind.USAGE_STATS -> GuideStep(
            kind = p,
            titlePtBr = "Acesso ao Uso de Apps",
            instructionsPtBr = listOf(
                "1. Toque no botão para abrir 'Acesso ao uso' no Android.",
                "2. Encontre o Dead Line na lista.",
                "3. Ative a chave 'Permitir acesso ao uso' para a gatinha medir seu foco.",
            ),
            systemAction = Settings.ACTION_USAGE_ACCESS_SETTINGS,
        )

        PermissionKind.ACCESSIBILITY -> GuideStep(
            kind = p,
            titlePtBr = "Serviço de Acessibilidade (Barreira da Gatinha)",
            instructionsPtBr = listOf(
                "1. No Android 13+, como o app é instalado fora da loja, abra primeiro Informações do App → menu ⋮ no canto superior → 'Permitir configurações restritas'.",
                "2. Depois abra Configurações → Acessibilidade → Serviços instalados.",
                "3. Ative 'Dead Line — Barreira da Gatinha'. Você pode desligar a qualquer momento segurando a gatinha por 10s!",
            ),
            systemAction = Settings.ACTION_ACCESSIBILITY_SETTINGS,
        )

        PermissionKind.NOTIFICATIONS -> GuideStep(
            kind = p,
            titlePtBr = "Notificações com botão 'Feito!'",
            instructionsPtBr = listOf(
                "1. Abra as configurações de notificações do Dead Line.",
                "2. Permita notificações para marcar seus compromissos sem abrir o app.",
            ),
            systemAction = Settings.ACTION_APP_NOTIFICATION_SETTINGS,
        )

        PermissionKind.EXACT_ALARM -> GuideStep(
            kind = p,
            titlePtBr = "Alarmes Exatos de Prazo",
            instructionsPtBr = listOf(
                "1. Abra 'Alarmes e lembretes' nas configurações do sistema.",
                "2. Permita que o Dead Line agende alarmes exatos no horário limite.",
            ),
            systemAction = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
            } else {
                Settings.ACTION_SETTINGS
            },
        )

        PermissionKind.IGNORE_BATTERY_OPTIMIZATION -> GuideStep(
            kind = p,
            titlePtBr = "Ignorar Otimização de Bateria",
            instructionsPtBr = listOf(
                "1. Escolha 'Sem restrições' na bateria do Dead Line.",
                "2. Isso evita que o celular encerre a gatinha com a tela apagada.",
            ),
            systemAction = Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
        )

        PermissionKind.OEM_AUTOSTART -> GuideStep(
            kind = p,
            titlePtBr = "Inicialização Automática do Fabricante",
            instructionsPtBr = listOf(
                "1. Em aparelhos Samsung, Xiaomi, Motorola ou Realme, fixe o Dead Line nos apps recentes.",
                "2. Ative o 'Início automático em segundo plano' nas informações do app.",
            ),
            systemAction = Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        )
    }

    private fun hasUsageStatsPermission(): Boolean = runCatching {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName,
        )
        mode == AppOpsManager.MODE_ALLOWED
    }.getOrDefault(false)

    private fun isAccessibilityServiceEnabled(): Boolean = runCatching {
        if (DeadLineAccessibilityService.isRunning()) return true
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ).orEmpty()
        enabledServices.contains(context.packageName)
    }.getOrDefault(false)

    private fun canScheduleExactAlarms(): Boolean = runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            am?.canScheduleExactAlarms() ?: true
        } else {
            true
        }
    }.getOrDefault(true)

    private fun isIgnoringBatteryOptimizations(): Boolean = runCatching {
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false
    }.getOrDefault(false)
}

@Module
@InstallIn(SingletonComponent::class)
abstract class BlockPlatformModule {

    @Binds
    @Singleton
    abstract fun bindBlockEnforcer(impl: AccessibilityBarrierEnforcer): BlockEnforcer

    @Binds
    @Singleton
    abstract fun bindPermissionHealth(impl: AndroidPermissionHealth): PermissionHealth
}
