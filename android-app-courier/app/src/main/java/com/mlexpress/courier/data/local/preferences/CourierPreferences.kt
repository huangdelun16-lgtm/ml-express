package com.mlexpress.courier.data.local.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "courier_preferences")

@Singleton
class CourierPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    companion object {
        private val ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val COURIER_ID = stringPreferencesKey("courier_id")
        private val IS_FIRST_LAUNCH = booleanPreferencesKey("is_first_launch")
        private val LANGUAGE = stringPreferencesKey("language")
        private val FCM_TOKEN = stringPreferencesKey("fcm_token")
        
        // Location preferences
        private val LOCATION_SHARING_ENABLED = booleanPreferencesKey("location_sharing_enabled")
        private val LAST_KNOWN_LATITUDE = doublePreferencesKey("last_known_latitude")
        private val LAST_KNOWN_LONGITUDE = doublePreferencesKey("last_known_longitude")
        
        // Order preferences
        private val MAX_ORDER_DISTANCE = doublePreferencesKey("max_order_distance")
        private val ACCEPTS_FRAGILE_ITEMS = booleanPreferencesKey("accepts_fragile_items")
        private val ACCEPTS_LARGE_ITEMS = booleanPreferencesKey("accepts_large_items")
        
        // Notification preferences
        private val ORDER_NOTIFICATIONS_ENABLED = booleanPreferencesKey("order_notifications_enabled")
        private val EARNINGS_NOTIFICATIONS_ENABLED = booleanPreferencesKey("earnings_notifications_enabled")
        private val SYSTEM_NOTIFICATIONS_ENABLED = booleanPreferencesKey("system_notifications_enabled")
    }
    
    // Authentication
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
    
    suspend fun saveCourierId(courierId: String) {
        context.dataStore.edit { preferences ->
            preferences[COURIER_ID] = courierId
        }
    }
    
    fun getCourierId(): Flow<String?> {
        return context.dataStore.data.map { preferences ->
            preferences[COURIER_ID]
        }
    }
    
    suspend fun clearAuthData() {
        context.dataStore.edit { preferences ->
            preferences.remove(ACCESS_TOKEN)
            preferences.remove(REFRESH_TOKEN)
            preferences.remove(COURIER_ID)
        }
    }
    
    // App settings
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
    
    // Location settings
    suspend fun setLocationSharingEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[LOCATION_SHARING_ENABLED] = enabled
        }
    }
    
    fun isLocationSharingEnabled(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[LOCATION_SHARING_ENABLED] ?: true
        }
    }
    
    suspend fun saveLastKnownLocation(latitude: Double, longitude: Double) {
        context.dataStore.edit { preferences ->
            preferences[LAST_KNOWN_LATITUDE] = latitude
            preferences[LAST_KNOWN_LONGITUDE] = longitude
        }
    }
    
    fun getLastKnownLocation(): Flow<Pair<Double?, Double?>> {
        return context.dataStore.data.map { preferences ->
            val latitude = preferences[LAST_KNOWN_LATITUDE]
            val longitude = preferences[LAST_KNOWN_LONGITUDE]
            Pair(latitude, longitude)
        }
    }
    
    // Order preferences
    suspend fun setMaxOrderDistance(distance: Double) {
        context.dataStore.edit { preferences ->
            preferences[MAX_ORDER_DISTANCE] = distance
        }
    }
    
    fun getMaxOrderDistance(): Flow<Double> {
        return context.dataStore.data.map { preferences ->
            preferences[MAX_ORDER_DISTANCE] ?: 10.0
        }
    }
    
    suspend fun setAcceptsFragileItems(accepts: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[ACCEPTS_FRAGILE_ITEMS] = accepts
        }
    }
    
    fun getAcceptsFragileItems(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[ACCEPTS_FRAGILE_ITEMS] ?: true
        }
    }
    
    suspend fun setAcceptsLargeItems(accepts: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[ACCEPTS_LARGE_ITEMS] = accepts
        }
    }
    
    fun getAcceptsLargeItems(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[ACCEPTS_LARGE_ITEMS] ?: true
        }
    }
    
    // Notification preferences
    suspend fun setOrderNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[ORDER_NOTIFICATIONS_ENABLED] = enabled
        }
    }
    
    fun isOrderNotificationsEnabled(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[ORDER_NOTIFICATIONS_ENABLED] ?: true
        }
    }
    
    suspend fun setEarningsNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[EARNINGS_NOTIFICATIONS_ENABLED] = enabled
        }
    }
    
    fun isEarningsNotificationsEnabled(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[EARNINGS_NOTIFICATIONS_ENABLED] ?: true
        }
    }
    
    suspend fun setSystemNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[SYSTEM_NOTIFICATIONS_ENABLED] = enabled
        }
    }
    
    fun isSystemNotificationsEnabled(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[SYSTEM_NOTIFICATIONS_ENABLED] ?: true
        }
    }
    
    // Clear all data
    suspend fun clearAllData() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
