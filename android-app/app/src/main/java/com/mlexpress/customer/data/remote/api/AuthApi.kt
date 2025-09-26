package com.mlexpress.customer.data.remote.api

import com.mlexpress.customer.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface AuthApi {
    
    @POST("auth/send-otp")
    suspend fun sendOtp(
        @Body request: SendOtpRequest
    ): Response<ApiResponse<SendOtpResponse>>
    
    @POST("auth/verify-otp")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequest
    ): Response<ApiResponse<AuthResponse>>
    
    @POST("auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<ApiResponse<AuthResponse>>
    
    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<ApiResponse<AuthResponse>>
    
    @POST("auth/refresh-token")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest
    ): Response<ApiResponse<AuthResponse>>
    
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

data class RegisterRequest(
    val phoneNumber: String,
    val fullName: String,
    val email: String?,
    val otpToken: String,
    val fcmToken: String?
)

data class LoginRequest(
    val phoneNumber: String,
    val password: String? = null,
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
    val expiresIn: Int, // seconds
    val message: String
)

data class AuthResponse(
    val user: UserDto,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int
)

data class UserDto(
    val id: String,
    val phoneNumber: String,
    val fullName: String,
    val email: String?,
    val profileImageUrl: String?,
    val isPhoneVerified: Boolean,
    val isEmailVerified: Boolean,
    val language: String,
    val createdAt: String,
    val updatedAt: String
)
