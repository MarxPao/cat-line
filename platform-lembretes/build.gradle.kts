plugins {
    id("deadline.android.library")
    id("deadline.android.hilt")
}

android {
    namespace = "com.deadline.platform.lembretes"
}

dependencies {
    implementation(project(":core-domain"))
    implementation(libs.work.runtime.ktx)
    implementation(libs.glance.appwidget)
}
