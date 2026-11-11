package com.deadline.app.di

import com.deadline.core.domain.event.EventBus
import com.deadline.core.domain.event.InMemoryEventBus
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.time.Clock
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppDomainModule {

    @Provides
    @Singleton
    fun provideSystemClock(): Clock = Clock.systemDefaultZone()

    @Provides
    @Singleton
    fun provideEventBus(): EventBus = InMemoryEventBus()
}
