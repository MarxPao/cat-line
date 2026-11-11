plugins {
    id("deadline.android.library")
    id("deadline.android.hilt")
}

android {
    namespace = "com.deadline.platform.bloqueio"
}

dependencies {
    implementation(project(":core-domain"))
}
