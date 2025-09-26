package com.mlexpress.courier.data.remote.api

import com.mlexpress.courier.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface CourierAuthApi {
    
    @POST("auth/send-otp")
    suspend fun sendOtp(
        @Body request: SendOtpRequest
    ): Response<ApiResponse<SendOtpResponse>>
    
    @POST("auth/verify-otp")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequest
    ): Response<ApiResponse<CourierVerifyOtpResponse>>
    
    @POST("auth/register")
    suspend fun register(
        @Body request: CourierRegisterRequest
    ): Response<ApiResponse<CourierAuthResponse>>
    
    @POST("auth/login")
    suspend fun login(
        @Body request: CourierLoginRequest
    ): Response<ApiResponse<CourierAuthResponse>>
    
    @POST("auth/refresh-token")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest
    ): Response<ApiResponse<CourierAuthResponse>>
    
    @POST("auth/logout")
    suspend fun logout(
        @Header("Authorization") token: String
    ): Response<ApiResponse<Unit>>
    
    @PUT("auth/update-fcm-token")
    suspend fun updateFcmToken(
        @Header("Authorization") token: String,
        @Body request: UpdateFcmTokenRequest
    ): Response<ApiResponse<Unit>>
}

// Request DTOs
data class SendOtpRequest(
    val phoneNumber: String,
    val countryCode: String = "+95"
)

data class VerifyOtpRequest(
    val phoneNumber: String,
    val otp: String,
    val otpToken: String
)

data class CourierRegisterRequest(
    val phoneNumber: String,
    val fullName: String,
    val email: String?,
    val workId: String?,
    val identityCard: String,
    val vehicleType: String,
    val vehiclePlate: String,
    val otpToken: String
)

data class CourierLoginRequest(
    val phoneNumber: String,
    val fcmToken: String?
)

data class RefreshTokenRequest(
    val refreshToken: String
)

data class UpdateFcmTokenRequest(
    val fcmToken: String
)

// Response DTOs
data class SendOtpResponse(
    val otpToken: String,
    val expiresIn: Int,
    val message: String
)

data class CourierVerifyOtpResponse(
    val isExistingCourier: Boolean,
    val courier: CourierDto? = null,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val otpToken: String? = null
)

data class CourierAuthResponse(
    val courier: CourierDto,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int
)

data class CourierDto(
    val id: String,
    val workId: String,
    val phoneNumber: String,
    val fullName: String,
    val email: String?,
    val profileImageUrl: String?,
    val identityCardNumber: String,
    val vehicleType: String,
    val vehiclePlate: String,
    val status: String,
    val isVerified: Boolean,
    val isActive: Boolean,
    val totalOrders: Int,
    val completedOrders: Int,
    val rating: Float,
    val totalEarnings: Double,
    val createdAt: String,
    val verifiedAt: String?
)
