pluginManagement {
    includeBuild("build-logic")
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "DeadLine"

include(
    ":app",
    ":core-domain",
    ":core-data",
    ":core-ui",
    ":core-game",
    ":feature-hoje",
    ":feature-agenda",
    ":feature-habitos",
    ":feature-metas",
    ":feature-insights",
    ":feature-loja",
    ":feature-conversa",
    ":feature-foco",
    ":platform-bloqueio",
    ":platform-uso",
    ":platform-lembretes",
    ":ai-llm",
)
