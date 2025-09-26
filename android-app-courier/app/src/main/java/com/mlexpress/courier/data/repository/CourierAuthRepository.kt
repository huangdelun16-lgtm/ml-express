package com.mlexpress.courier.data.repository

import com.mlexpress.courier.data.local.dao.CourierDao
import com.mlexpress.courier.data.local.preferences.CourierPreferences
import com.mlexpress.courier.data.model.Courier
import com.mlexpress.courier.data.model.VehicleType
import com.mlexpress.courier.data.remote.api.CourierAuthApi
import com.mlexpress.courier.data.remote.dto.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CourierAuthRepository @Inject constructor(
    private val authApi: CourierAuthApi,
    private val courierDao: CourierDao,
    private val courierPreferences: CourierPreferences
) {
    
    suspend fun sendOtp(phoneNumber: String): NetworkResult<SendOtpResponse> {
        return try {
            val response = authApi.sendOtp(SendOtpRequest(phoneNumber))
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { data ->
                    NetworkResult.Success(data)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to send OTP"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun verifyOtp(
        phoneNumber: String, 
        otp: String, 
        otpToken: String
    ): NetworkResult<CourierVerifyOtpResponse> {
        return try {
            val response = authApi.verifyOtp(VerifyOtpRequest(phoneNumber, otp, otpToken))
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { verifyResponse ->
                    if (verifyResponse.isExistingCourier) {
                        // Existing courier - save auth info
                        verifyResponse.courier?.let { courierDto ->
                            val courier = courierDto.toCourier()
                            courierDao.insertCourier(courier)
                            courierPreferences.saveAuthTokens(
                                verifyResponse.accessToken!!,
                                verifyResponse.refreshToken!!
                            )
                            courierPreferences.saveCourierId(courier.id)
                        }
                    }
                    NetworkResult.Success(verifyResponse)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Invalid OTP"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun register(
        phoneNumber: String,
        fullName: String,
        email: String?,
        workId: String?,
        identityCard: String,
        vehicleType: VehicleType,
        vehiclePlate: String,
        otpToken: String
    ): NetworkResult<CourierAuthResponse> {
        return try {
            val request = CourierRegisterRequest(
                phoneNumber = phoneNumber,
                fullName = fullName,
                email = email,
                workId = workId,
                identityCard = identityCard,
                vehicleType = vehicleType.name,
                vehiclePlate = vehiclePlate,
                otpToken = otpToken
            )
            
            val response = authApi.register(request)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { authResponse ->
                    val courier = authResponse.courier.toCourier()
                    courierDao.insertCourier(courier)
                    courierPreferences.saveAuthTokens(
                        authResponse.accessToken,
                        authResponse.refreshToken
                    )
                    courierPreferences.saveCourierId(courier.id)
                    
                    NetworkResult.Success(authResponse)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Registration failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun logout(): NetworkResult<Unit> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (!accessToken.isNullOrEmpty()) {
                authApi.logout("Bearer $accessToken")
            }
            
            // Clear local data
            courierPreferences.clearAuthData()
            courierDao.clearAllCouriers()
            
            NetworkResult.Success(Unit)
        } catch (e: Exception) {
            // Clear local data even if network request fails
            courierPreferences.clearAuthData()
            courierDao.clearAllCouriers()
            NetworkResult.Success(Unit)
        }
    }
    
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
    
    suspend fun isLoggedIn(): Boolean {
        val accessToken = courierPreferences.getAccessToken().first()
        val courierId = courierPreferences.getCourierId().first()
        return !accessToken.isNullOrEmpty() && !courierId.isNullOrEmpty()
    }
    
    suspend fun getAccessToken(): String? {
        return courierPreferences.getAccessToken().first()
    }
}

// Extension function to convert DTO to Model
private fun CourierDto.toCourier(): Courier {
    return Courier(
        id = id,
        workId = workId,
        phoneNumber = phoneNumber,
        fullName = fullName,
        email = email,
        profileImageUrl = profileImageUrl,
        identityCardNumber = identityCardNumber,
        vehicleType = VehicleType.valueOf(vehicleType),
        vehiclePlate = vehiclePlate,
        status = com.mlexpress.courier.data.model.CourierStatus.valueOf(status),
        isVerified = isVerified,
        isActive = isActive,
        totalOrders = totalOrders,
        completedOrders = completedOrders,
        rating = rating,
        totalEarnings = totalEarnings,
        createdAt = System.currentTimeMillis(),
        lastActiveAt = System.currentTimeMillis()
    )
}
