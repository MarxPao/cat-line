plugins {
    id("deadline.android.library")
    id("deadline.android.compose")
    id("deadline.android.hilt")
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.deadline.core.game"
}

dependencies {
    implementation(project(":core-domain"))
    implementation(project(":core-ui"))
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.androidx.lifecycle.runtime.compose)

    testImplementation(libs.junit4)
}
