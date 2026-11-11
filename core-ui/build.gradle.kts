plugins {
    id("deadline.android.library")
    id("deadline.android.compose")
}

android {
    namespace = "com.deadline.core.ui"
}

dependencies {
    implementation(project(":core-domain"))
    implementation(libs.androidx.core.ktx)

    testImplementation(libs.junit4)
}
