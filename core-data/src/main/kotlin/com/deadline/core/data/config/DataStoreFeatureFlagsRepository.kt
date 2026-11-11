package com.deadline.core.data.config

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import com.deadline.core.domain.config.FeatureFlagKey
import com.deadline.core.domain.config.FeatureFlagsRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.featureFlagsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "deadline_feature_flags"
)

@Singleton
class DataStoreFeatureFlagsRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) : FeatureFlagsRepository {

    override fun observeEnabledFlags(): Flow<Map<FeatureFlagKey, Boolean>> =
        dataStore.data.map { prefs ->
            FeatureFlagKey.entries.associateWith { key ->
                if (!key.canBeDisabled) {
                    true
                } else {
                    prefs[booleanPreferencesKey(key.storageKey)] ?: key.defaultEnabled
                }
            }
        }

    override fun isEnabled(key: FeatureFlagKey): Flow<Boolean> =
        observeEnabledFlags().map { flags -> flags[key] ?: key.defaultEnabled }

    override suspend fun setEnabled(key: FeatureFlagKey, enabled: Boolean) {
        if (!key.canBeDisabled) return
        dataStore.edit { prefs ->
            prefs[booleanPreferencesKey(key.storageKey)] = enabled
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class FeatureFlagsDataModule {

    @Binds
    @Singleton
    abstract fun bindFeatureFlagsRepository(
        impl: DataStoreFeatureFlagsRepository,
    ): FeatureFlagsRepository

    companion object {
        @Provides
        @Singleton
        fun provideFeatureFlagsDataStore(
            @ApplicationContext context: Context,
        ): DataStore<Preferences> = context.featureFlagsDataStore
    }
}
