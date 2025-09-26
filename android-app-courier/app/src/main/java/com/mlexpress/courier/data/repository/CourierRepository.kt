package com.mlexpress.courier.data.repository

import com.mlexpress.courier.data.local.dao.CourierDao
import com.mlexpress.courier.data.local.preferences.CourierPreferences
import com.mlexpress.courier.data.model.Courier
import com.mlexpress.courier.data.model.CourierStatus
import com.mlexpress.courier.data.remote.api.CourierApi
import com.mlexpress.courier.data.remote.dto.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CourierRepository @Inject constructor(
    private val courierApi: CourierApi,
    private val courierDao: CourierDao,
    private val courierPreferences: CourierPreferences
) {
    
    fun getCurrentCourier(): Flow<Courier?> {
        return courierPreferences.getCourierId().let { courierIdFlow ->
            kotlinx.coroutines.flow.flow {
                courierIdFlow.collect { courierId ->
                    if (!courierId.isNullOrEmpty()) {
                        val courier = courierDao.getCourierById(courierId)
                        emit(courier)
                    } else {
                        emit(null)
                    }
                }
            }
        }
    }
    
    suspend fun updateOnlineStatus(isOnline: Boolean): NetworkResult<Unit> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            val courierId = courierPreferences.getCourierId().first()
            
            if (accessToken.isNullOrEmpty() || courierId.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val newStatus = if (isOnline) CourierStatus.ONLINE else CourierStatus.OFFLINE
            val request = UpdateCourierStatusRequest(newStatus.name)
            
            val response = courierApi.updateStatus("Bearer $accessToken", request)
            if (response.isSuccessful && response.body()?.success == true) {
                // Update local status
                courierDao.updateCourierStatus(courierId, newStatus, isOnline)
                NetworkResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to update status"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun updateLocation(latitude: Double, longitude: Double): NetworkResult<Unit> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            val courierId = courierPreferences.getCourierId().first()
            
            if (accessToken.isNullOrEmpty() || courierId.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = UpdateLocationRequest(latitude, longitude)
            val response = courierApi.updateLocation("Bearer $accessToken", request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                // Update local location
                courierDao.updateCourierLocation(courierId, latitude, longitude, System.currentTimeMillis())
                NetworkResult.Success(Unit)
            } else {
                // Still update locally even if network fails
                courierDao.updateCourierLocation(courierId, latitude, longitude, System.currentTimeMillis())
                NetworkResult.Success(Unit)
            }
        } catch (e: Exception) {
            // Update locally even if network fails
            try {
                val courierId = courierPreferences.getCourierId().first()
                if (!courierId.isNullOrEmpty()) {
                    courierDao.updateCourierLocation(courierId, latitude, longitude, System.currentTimeMillis())
                }
                NetworkResult.Success(Unit)
            } catch (localError: Exception) {
                NetworkResult.Error(e.message ?: "Location update failed", ApiErrorCodes.NETWORK_ERROR)
            }
        }
    }
    
    suspend fun logout(): NetworkResult<Unit> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (!accessToken.isNullOrEmpty()) {
                courierApi.logout("Bearer $accessToken")
            }
            
            // Clear local data
            courierPreferences.clearAuthData()
            courierDao.clearAllCouriers()
            
            NetworkResult.Success(Unit)
        } catch (e: Exception) {
            // Clear local data even if network fails
            courierPreferences.clearAuthData()
            courierDao.clearAllCouriers()
            NetworkResult.Success(Unit)
        }
    }
    
    suspend fun isLoggedIn(): Boolean {
        val accessToken = courierPreferences.getAccessToken().first()
        val courierId = courierPreferences.getCourierId().first()
        return !accessToken.isNullOrEmpty() && !courierId.isNullOrEmpty()
    }
}

// Mock repository for earnings (placeholder)
@Singleton
class EarningsRepository @Inject constructor() {
    
    suspend fun getTodayEarnings(courierId: String): Double {
        // TODO: Implement actual earnings calculation
        return 50000.0 // Mock data
    }
    
    suspend fun getTodayOrderCount(courierId: String): Int {
        // TODO: Implement actual order count
        return 8 // Mock data
    }
    
    suspend fun getAvailableBalance(courierId: String): Double {
        // TODO: Implement actual balance calculation
        return 125000.0 // Mock data
    }
    
    suspend fun getPendingEarnings(courierId: String): Double {
        // TODO: Implement actual pending earnings
        return 25000.0 // Mock data
    }
    
    suspend fun getRecentEarnings(courierId: String, limit: Int): List<com.mlexpress.courier.data.model.EarningsRecord> {
        // TODO: Implement actual earnings records
        return emptyList() // Mock data
    }
    
    suspend fun requestWithdrawal(courierId: String, amount: Double): NetworkResult<Unit> {
        // TODO: Implement actual withdrawal request
        return NetworkResult.Success(Unit)
    }
}
