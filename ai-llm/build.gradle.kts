plugins {
    id("deadline.android.library")
    id("deadline.android.hilt")
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.deadline.ai.llm"
}

dependencies {
    implementation(project(":core-domain"))
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.okhttp)
    implementation(libs.okhttp.sse)
    implementation(libs.tink.android)
}
