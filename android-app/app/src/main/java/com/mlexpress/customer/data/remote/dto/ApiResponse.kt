package com.mlexpress.customer.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("data")
    val data: T? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("error")
    val error: ApiError? = null,
    @SerializedName("timestamp")
    val timestamp: String? = null
)

data class ApiError(
    @SerializedName("code")
    val code: String,
    @SerializedName("message")
    val message: String,
    @SerializedName("details")
    val details: Map<String, Any>? = null
)

data class PaginatedResponse<T>(
    @SerializedName("items")
    val items: List<T>,
    @SerializedName("totalItems")
    val totalItems: Int,
    @SerializedName("totalPages")
    val totalPages: Int,
    @SerializedName("currentPage")
    val currentPage: Int,
    @SerializedName("hasNext")
    val hasNext: Boolean,
    @SerializedName("hasPrevious")
    val hasPrevious: Boolean
)

// 网络结果封装类
sealed class NetworkResult<T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error<T>(val message: String, val code: String? = null) : NetworkResult<T>()
    data class Loading<T>(val isLoading: Boolean = true) : NetworkResult<T>()
}

// 资源状态封装类
sealed class Resource<T> {
    data class Success<T>(val data: T) : Resource<T>()
    data class Error<T>(val message: String, val data: T? = null) : Resource<T>()
    data class Loading<T>(val data: T? = null) : Resource<T>()
}

// API 错误码常量
object ApiErrorCodes {
    const val INVALID_OTP = "INVALID_OTP"
    const val OTP_EXPIRED = "OTP_EXPIRED"
    const val USER_NOT_FOUND = "USER_NOT_FOUND"
    const val PHONE_ALREADY_EXISTS = "PHONE_ALREADY_EXISTS"
    const val ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
    const val INVALID_ORDER_STATUS = "INVALID_ORDER_STATUS"
    const val PAYMENT_FAILED = "PAYMENT_FAILED"
    const val LOCATION_NOT_AVAILABLE = "LOCATION_NOT_AVAILABLE"
    const val SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    const val RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    const val UNAUTHORIZED = "UNAUTHORIZED"
    const val FORBIDDEN = "FORBIDDEN"
    const val VALIDATION_ERROR = "VALIDATION_ERROR"
    const val NETWORK_ERROR = "NETWORK_ERROR"
    const val UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
