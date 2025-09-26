package com.mlexpress.customer.data.remote.api

import com.mlexpress.customer.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

/**
 * 认证API服务接口
 */
interface AuthApiService {
    
    /**
     * 发送OTP验证码
     */
    @POST("auth/send-otp")
    suspend fun sendOtp(
        @Body request: SendOtpRequest
    ): Response<ApiResponse<SendOtpResponse>>
    
    /**
     * 验证OTP码
     */
    @POST("auth/verify-otp")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequest
    ): Response<ApiResponse<VerifyOtpResponse>>
    
    /**
     * 用户注册
     */
    @POST("auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<ApiResponse<AuthResponse>>
    
    /**
     * 用户登录
     */
    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<ApiResponse<AuthResponse>>
    
    /**
     * 刷新访问令牌
     */
    @POST("auth/refresh-token")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest
    ): Response<ApiResponse<AuthResponse>>
    
    /**
     * 用户登出
     */
    @POST("auth/logout")
    suspend fun logout(
        @Header("Authorization") token: String
    ): Response<ApiResponse<Unit>>
    
    /**
     * 更新FCM推送令牌
     */
    @PUT("auth/fcm-token")
    suspend fun updateFcmToken(
        @Header("Authorization") token: String,
        @Body request: UpdateFcmTokenRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * 获取用户资料
     */
    @GET("auth/profile")
    suspend fun getProfile(
        @Header("Authorization") token: String
    ): Response<ApiResponse<UserProfileResponse>>
    
    /**
     * 更新用户资料
     */
    @PUT("auth/profile")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body request: UpdateProfileRequest
    ): Response<ApiResponse<UserProfileResponse>>
    
    /**
     * 修改密码
     */
    @PUT("auth/change-password")
    suspend fun changePassword(
        @Header("Authorization") token: String,
        @Body request: ChangePasswordRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * 验证令牌有效性
     */
    @GET("auth/verify-token")
    suspend fun verifyToken(
        @Header("Authorization") token: String
    ): Response<ApiResponse<TokenValidationResponse>>
    
    /**
     * 重置密码
     */
    @POST("auth/reset-password")
    suspend fun resetPassword(
        @Body request: ResetPasswordRequest
    ): Response<ApiResponse<Unit>>
}

// ==================== 请求DTO ====================

/**
 * 发送OTP请求
 */
data class SendOtpRequest(
    val phoneNumber: String,
    val countryCode: String = "+95",
    val purpose: String = "login" // login, register, reset_password
)

/**
 * 验证OTP请求
 */
data class VerifyOtpRequest(
    val phoneNumber: String,
    val otp: String,
    val otpToken: String,
    val deviceInfo: DeviceInfo? = null
)

/**
 * 用户注册请求
 */
data class RegisterRequest(
    val phoneNumber: String,
    val fullName: String,
    val email: String? = null,
    val password: String? = null,
    val otpToken: String,
    val fcmToken: String? = null,
    val deviceInfo: DeviceInfo? = null,
    val referralCode: String? = null
)

/**
 * 用户登录请求
 */
data class LoginRequest(
    val phoneNumber: String,
    val password: String? = null,
    val otpToken: String? = null,
    val fcmToken: String? = null,
    val deviceInfo: DeviceInfo? = null,
    val rememberMe: Boolean = false
)

/**
 * 刷新令牌请求
 */
data class RefreshTokenRequest(
    val refreshToken: String,
    val deviceInfo: DeviceInfo? = null
)

/**
 * 更新FCM令牌请求
 */
data class UpdateFcmTokenRequest(
    val fcmToken: String,
    val deviceInfo: DeviceInfo? = null
)

/**
 * 更新用户资料请求
 */
data class UpdateProfileRequest(
    val fullName: String? = null,
    val email: String? = null,
    val profileImageUrl: String? = null,
    val language: String? = null,
    val notificationSettings: NotificationSettings? = null
)

/**
 * 修改密码请求
 */
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

/**
 * 重置密码请求
 */
data class ResetPasswordRequest(
    val phoneNumber: String,
    val otp: String,
    val otpToken: String,
    val newPassword: String
)

/**
 * 设备信息
 */
data class DeviceInfo(
    val deviceId: String,
    val deviceModel: String,
    val osVersion: String,
    val appVersion: String,
    val platform: String = "android",
    val timezone: String,
    val language: String
)

/**
 * 通知设置
 */
data class NotificationSettings(
    val orderUpdates: Boolean = true,
    val promotions: Boolean = true,
    val systemMessages: Boolean = true,
    val emailNotifications: Boolean = false,
    val smsNotifications: Boolean = true
)

// ==================== 响应DTO ====================

/**
 * 发送OTP响应
 */
data class SendOtpResponse(
    val otpToken: String,
    val expiresIn: Int, // seconds
    val message: String,
    val canResendAfter: Int = 60 // seconds
)

/**
 * 验证OTP响应
 */
data class VerifyOtpResponse(
    val isValid: Boolean,
    val isNewUser: Boolean,
    val tempToken: String? = null, // 用于注册流程
    val user: UserProfileResponse? = null, // 已有用户信息
    val accessToken: String? = null,
    val refreshToken: String? = null
)

/**
 * 认证响应
 */
data class AuthResponse(
    val user: UserProfileResponse,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int, // seconds
    val tokenType: String = "Bearer"
)

/**
 * 用户资料响应
 */
data class UserProfileResponse(
    val id: String,
    val phoneNumber: String,
    val fullName: String,
    val email: String? = null,
    val profileImageUrl: String? = null,
    val isPhoneVerified: Boolean = false,
    val isEmailVerified: Boolean = false,
    val language: String = "en",
    val timezone: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val lastLoginAt: String? = null,
    val notificationSettings: NotificationSettings? = null,
    val stats: UserStats? = null
)

/**
 * 令牌验证响应
 */
data class TokenValidationResponse(
    val isValid: Boolean,
    val userId: String? = null,
    val expiresAt: String? = null,
    val permissions: List<String> = emptyList()
)

/**
 * 用户统计信息
 */
data class UserStats(
    val totalOrders: Int = 0,
    val completedOrders: Int = 0,
    val cancelledOrders: Int = 0,
    val totalSpent: Double = 0.0,
    val averageRating: Float = 0.0f,
    val memberSince: String
)
