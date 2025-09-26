package com.mlexpress.customer.data.repository

import com.mlexpress.customer.data.local.dao.UserDao
import com.mlexpress.customer.data.local.preferences.UserPreferences
import com.mlexpress.customer.data.model.User
import com.mlexpress.customer.data.remote.api.AuthApi
import com.mlexpress.customer.data.remote.dto.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val userDao: UserDao,
    private val userPreferences: UserPreferences
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
    ): NetworkResult<AuthResponse> {
        return try {
            val response = authApi.verifyOtp(VerifyOtpRequest(phoneNumber, otp, otpToken))
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { authResponse ->
                    // 保存用户信息到本地数据库
                    val user = authResponse.user.toUser()
                    userDao.insertUser(user)
                    
                    // 保存认证信息
                    userPreferences.saveAuthTokens(
                        authResponse.accessToken,
                        authResponse.refreshToken
                    )
                    userPreferences.saveUserId(user.id)
                    
                    NetworkResult.Success(authResponse)
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
        otpToken: String,
        fcmToken: String?
    ): NetworkResult<AuthResponse> {
        return try {
            val request = RegisterRequest(phoneNumber, fullName, email, otpToken, fcmToken)
            val response = authApi.register(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { authResponse ->
                    // 保存用户信息到本地数据库
                    val user = authResponse.user.toUser()
                    userDao.insertUser(user)
                    
                    // 保存认证信息
                    userPreferences.saveAuthTokens(
                        authResponse.accessToken,
                        authResponse.refreshToken
                    )
                    userPreferences.saveUserId(user.id)
                    
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
    
    suspend fun login(phoneNumber: String, fcmToken: String?): NetworkResult<AuthResponse> {
        return try {
            val request = LoginRequest(phoneNumber, null, fcmToken)
            val response = authApi.login(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { authResponse ->
                    // 保存用户信息到本地数据库
                    val user = authResponse.user.toUser()
                    userDao.insertUser(user)
                    
                    // 保存认证信息
                    userPreferences.saveAuthTokens(
                        authResponse.accessToken,
                        authResponse.refreshToken
                    )
                    userPreferences.saveUserId(user.id)
                    
                    NetworkResult.Success(authResponse)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Login failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun refreshToken(): NetworkResult<AuthResponse> {
        return try {
            val refreshToken = userPreferences.getRefreshToken().first()
            if (refreshToken.isNullOrEmpty()) {
                return NetworkResult.Error("No refresh token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = authApi.refreshToken(RefreshTokenRequest(refreshToken))
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { authResponse ->
                    // 更新认证信息
                    userPreferences.saveAuthTokens(
                        authResponse.accessToken,
                        authResponse.refreshToken
                    )
                    
                    NetworkResult.Success(authResponse)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Token refresh failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun logout(): NetworkResult<Unit> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (!accessToken.isNullOrEmpty()) {
                authApi.logout("Bearer $accessToken")
            }
            
            // 清除本地数据
            userPreferences.clearAuthData()
            userDao.clearAllUsers()
            
            NetworkResult.Success(Unit)
        } catch (e: Exception) {
            // 即使网络请求失败，也要清除本地数据
            userPreferences.clearAuthData()
            userDao.clearAllUsers()
            NetworkResult.Success(Unit)
        }
    }
    
    suspend fun updateFcmToken(fcmToken: String): NetworkResult<Unit> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = authApi.updateFcmToken(
                "Bearer $accessToken",
                UpdateFcmTokenRequest(fcmToken)
            )
            
            if (response.isSuccessful && response.body()?.success == true) {
                // 更新本地用户信息
                val userId = userPreferences.getUserId().first()
                if (!userId.isNullOrEmpty()) {
                    userDao.updateFcmToken(userId, fcmToken)
                }
                NetworkResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to update FCM token"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    fun getCurrentUser(): Flow<User?> {
        return userPreferences.getUserId().let { userIdFlow ->
            kotlinx.coroutines.flow.flow {
                userIdFlow.collect { userId ->
                    if (!userId.isNullOrEmpty()) {
                        val user = userDao.getUserById(userId)
                        emit(user)
                    } else {
                        emit(null)
                    }
                }
            }
        }
    }
    
    suspend fun isLoggedIn(): Boolean {
        val accessToken = userPreferences.getAccessToken().first()
        val userId = userPreferences.getUserId().first()
        return !accessToken.isNullOrEmpty() && !userId.isNullOrEmpty()
    }
    
    suspend fun getAccessToken(): String? {
        return userPreferences.getAccessToken().first()
    }
}

// 扩展函数：DTO 转换为 Model
private fun UserDto.toUser(): User {
    return User(
        id = id,
        phoneNumber = phoneNumber,
        fullName = fullName,
        email = email,
        profileImageUrl = profileImageUrl,
        isPhoneVerified = isPhoneVerified,
        isEmailVerified = isEmailVerified,
        language = language,
        createdAt = System.currentTimeMillis(),
        updatedAt = System.currentTimeMillis()
    )
}
