import org.gradle.api.GradleException
import org.gradle.api.artifacts.ProjectDependency

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}

val domainModules = setOf(":core-domain")
val infraModules = setOf(
    ":core-data",
    ":ai-llm",
    ":platform-uso",
    ":platform-bloqueio",
    ":platform-lembretes",
)
val uiGameModules = setOf(":core-ui", ":core-game")
val featureModules = setOf(
    ":feature-hoje",
    ":feature-agenda",
    ":feature-habitos",
    ":feature-metas",
    ":feature-insights",
    ":feature-loja",
    ":feature-conversa",
    ":feature-foco",
)
val appModules = setOf(":app")

val checkModuleGraph by tasks.registering {
    group = "verification"
    description = "Verifica se o grafo de dependencias entre os 16 modulos respeita a secao 3 de docs/arquitetura.md"

    doLast {
        val violations = mutableListOf<String>()

        subprojects.forEach { subproject ->
            val modulePath = subproject.path
            val inspectedConfigs = subproject.configurations.matching { cfg ->
                cfg.name in setOf(
                    "implementation",
                    "api",
                    "compileOnly",
                    "runtimeOnly",
                    "debugImplementation",
                    "releaseImplementation",
                )
            }

            val targetProjects = inspectedConfigs
                .flatMap { it.dependencies.withType(ProjectDependency::class.java) }
                .map { it.dependencyProject.path }
                .toSet()

            when (modulePath) {
                in domainModules -> {
                    if (targetProjects.isNotEmpty()) {
                        violations += "$modulePath (Camada Dominio) nao pode depender de nenhum modulo do projeto, mas depende de: $targetProjects"
                    }
                    if (subproject.plugins.hasPlugin("com.android.library") || subproject.plugins.hasPlugin("com.android.application")) {
                        violations += "$modulePath (AD-03) deve ser modulo JVM puro, sem plugin Android."
                    }
                    val externalDeps = inspectedConfigs.flatMap { it.dependencies }
                        .filterNot { it is ProjectDependency }
                        .map { "${it.group}:${it.name}" }
                    val androidDeps = externalDeps.filter { it.startsWith("android.") || it.startsWith("androidx.") || it.startsWith("com.android.") }
                    if (androidDeps.isNotEmpty()) {
                        violations += "$modulePath (AD-03) nao pode ter dependencias Android: $androidDeps"
                    }
                }

                in infraModules -> {
                    val allowed = domainModules
                    val forbidden = targetProjects - allowed
                    if (forbidden.isNotEmpty()) {
                        violations += "$modulePath (Camada Infraestrutura) so pode depender de $allowed, mas depende de: $forbidden"
                    }
                }

                ":core-ui" -> {
                    val allowed = domainModules
                    val forbidden = targetProjects - allowed
                    if (forbidden.isNotEmpty()) {
                        violations += ":core-ui (Camada Base UI) so pode depender de $allowed, mas depende de: $forbidden"
                    }
                }

                ":core-game" -> {
                    val allowed = domainModules + ":core-ui"
                    val forbidden = targetProjects - allowed
                    if (forbidden.isNotEmpty()) {
                        violations += ":core-game (Camada Base Jogo) so pode depender de $allowed, mas depende de: $forbidden"
                    }
                }

                in featureModules -> {
                    val allowed = domainModules + uiGameModules
                    val forbidden = targetProjects - allowed
                    if (forbidden.isNotEmpty()) {
                        violations += "$modulePath (Camada Funcionalidade) so pode depender de $allowed (nunca de outra feature nem de infra), mas depende de: $forbidden"
                    }
                }

                in appModules -> {
                    // :app pode depender de todos os módulos para montagem e injeção
                }

                else -> {
                    violations += "Modulo desconhecido fora da arquitetura: $modulePath"
                }
            }
        }

        if (violations.isNotEmpty()) {
            throw GradleException(
                "Violacoes de arquitetura encontradas no grafo de modulos:\n" +
                    violations.joinToString("\n") { " - $it" }
            )
        } else {
            logger.lifecycle("checkModuleGraph: todos os ${subprojects.size} modulos respeitam as regras da secao 3.")
        }
    }
}

subprojects {
    tasks.matching { it.name == "check" }.configureEach {
        dependsOn(rootProject.tasks.named("checkModuleGraph"))
    }
}
