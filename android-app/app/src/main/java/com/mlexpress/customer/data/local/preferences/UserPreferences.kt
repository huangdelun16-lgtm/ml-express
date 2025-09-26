package com.mlexpress.customer.data.local.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_preferences")

@Singleton
class UserPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    companion object {
        private val ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val USER_ID = stringPreferencesKey("user_id")
        private val IS_FIRST_LAUNCH = booleanPreferencesKey("is_first_launch")
        private val LANGUAGE = stringPreferencesKey("language")
        private val FCM_TOKEN = stringPreferencesKey("fcm_token")
        private val NOTIFICATION_ENABLED = booleanPreferencesKey("notification_enabled")
        private val LOCATION_PERMISSION_GRANTED = booleanPreferencesKey("location_permission_granted")
        private val LAST_KNOWN_LATITUDE = stringPreferencesKey("last_known_latitude")
        private val LAST_KNOWN_LONGITUDE = stringPreferencesKey("last_known_longitude")
    }
    
    // 认证相关
    suspend fun saveAuthTokens(accessToken: String, refreshToken: String) {
        context.dataStore.edit { preferences ->
            preferences[ACCESS_TOKEN] = accessToken
            preferences[REFRESH_TOKEN] = refreshToken
        }
    }
    
    fun getAccessToken(): Flow<String?> {
        return context.dataStore.data.map { preferences ->
            preferences[ACCESS_TOKEN]
        }
    }
    
    fun getRefreshToken(): Flow<String?> {
        return context.dataStore.data.map { preferences ->
            preferences[REFRESH_TOKEN]
        }
    }
    
    suspend fun saveUserId(userId: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_ID] = userId
        }
    }
    
    fun getUserId(): Flow<String?> {
        return context.dataStore.data.map { preferences ->
            preferences[USER_ID]
        }
    }
    
    suspend fun clearAuthData() {
        context.dataStore.edit { preferences ->
            preferences.remove(ACCESS_TOKEN)
            preferences.remove(REFRESH_TOKEN)
            preferences.remove(USER_ID)
        }
    }
    
    // 应用设置
    suspend fun setFirstLaunch(isFirstLaunch: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[IS_FIRST_LAUNCH] = isFirstLaunch
        }
    }
    
    fun isFirstLaunch(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[IS_FIRST_LAUNCH] ?: true
        }
    }
    
    suspend fun setLanguage(language: String) {
        context.dataStore.edit { preferences ->
            preferences[LANGUAGE] = language
        }
    }
    
    fun getLanguage(): Flow<String> {
        return context.dataStore.data.map { preferences ->
            preferences[LANGUAGE] ?: "en"
        }
    }
    
    // FCM Token
    suspend fun saveFcmToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[FCM_TOKEN] = token
        }
    }
    
    fun getFcmToken(): Flow<String?> {
        return context.dataStore.data.map { preferences ->
            preferences[FCM_TOKEN]
        }
    }
    
    // 通知设置
    suspend fun setNotificationEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[NOTIFICATION_ENABLED] = enabled
        }
    }
    
    fun isNotificationEnabled(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[NOTIFICATION_ENABLED] ?: true
        }
    }
    
    // 位置权限
    suspend fun setLocationPermissionGranted(granted: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[LOCATION_PERMISSION_GRANTED] = granted
        }
    }
    
    fun isLocationPermissionGranted(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[LOCATION_PERMISSION_GRANTED] ?: false
        }
    }
    
    // 最后已知位置
    suspend fun saveLastKnownLocation(latitude: Double, longitude: Double) {
        context.dataStore.edit { preferences ->
            preferences[LAST_KNOWN_LATITUDE] = latitude.toString()
            preferences[LAST_KNOWN_LONGITUDE] = longitude.toString()
        }
    }
    
    fun getLastKnownLocation(): Flow<Pair<Double?, Double?>> {
        return context.dataStore.data.map { preferences ->
            val latitude = preferences[LAST_KNOWN_LATITUDE]?.toDoubleOrNull()
            val longitude = preferences[LAST_KNOWN_LONGITUDE]?.toDoubleOrNull()
            Pair(latitude, longitude)
        }
    }
    
    // 清除所有数据
    suspend fun clearAllData() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
