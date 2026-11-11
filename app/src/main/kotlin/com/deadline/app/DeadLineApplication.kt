package com.deadline.app

import android.app.Application
import com.deadline.platform.lembretes.DailyRolloverWorker
import com.deadline.platform.uso.UsageSamplingWorker
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class DeadLineApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        DailyRolloverWorker.enqueuePeriodic(this)
        UsageSamplingWorker.enqueuePeriodic(this)
    }
}
