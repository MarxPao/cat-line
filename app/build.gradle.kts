plugins {
    id("deadline.android.application")
    id("deadline.android.compose")
    id("deadline.android.hilt")
}

android {
    namespace = "com.deadline.app"

    defaultConfig {
        applicationId = "com.deadline.app"
        versionCode = 320
        versionName = "3.2.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // WP-33: Permite assinar com chave propria via variaveis de ambiente ou fallback debug para instalacao direta
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

dependencies {
    implementation(project(":core-domain"))
    implementation(project(":core-data"))
    implementation(project(":core-ui"))
    implementation(project(":core-game"))
    implementation(project(":feature-hoje"))
    implementation(project(":feature-agenda"))
    implementation(project(":feature-habitos"))
    implementation(project(":feature-metas"))
    implementation(project(":feature-insights"))
    implementation(project(":feature-loja"))
    implementation(project(":feature-conversa"))
    implementation(project(":feature-foco"))
    implementation(project(":platform-bloqueio"))
    implementation(project(":platform-uso"))
    implementation(project(":platform-lembretes"))
    implementation(project(":ai-llm"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.hilt.navigation.compose)

    testImplementation(libs.junit4)
    testImplementation(libs.kotlinx.coroutines.test)
}
