plugins {
    id("deadline.android.library")
    id("deadline.android.hilt")
}

android {
    namespace = "com.deadline.platform.uso"
}

dependencies {
    implementation(project(":core-domain"))
    implementation(libs.work.runtime.ktx)
}
