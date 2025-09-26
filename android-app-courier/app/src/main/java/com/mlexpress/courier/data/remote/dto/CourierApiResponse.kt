package com.mlexpress.courier.data.remote.dto

import com.google.gson.annotations.SerializedName

// Common API Response wrapper
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

// Network result wrapper
sealed class NetworkResult<T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error<T>(val message: String, val code: String? = null) : NetworkResult<T>()
    data class Loading<T>(val isLoading: Boolean = true) : NetworkResult<T>()
}

// Courier Order DTOs
data class CourierOrderDto(
    val id: String,
    val orderNumber: String,
    val customerId: String,
    val courierId: String?,
    val senderName: String,
    val senderPhone: String,
    val senderAddress: String,
    val senderLatitude: Double,
    val senderLongitude: Double,
    val receiverName: String,
    val receiverPhone: String,
    val receiverAddress: String,
    val receiverLatitude: Double,
    val receiverLongitude: Double,
    val packageType: String,
    val weight: Double,
    val dimensions: String?,
    val description: String?,
    val declaredValue: Double?,
    val serviceType: String,
    val isUrgent: Boolean,
    val distance: Double,
    val baseCost: Double,
    val serviceFee: Double,
    val totalCost: Double,
    val courierEarning: Double,
    val status: String,
    val priority: String,
    val createdAt: String,
    val assignedAt: String?,
    val estimatedPickupTime: String?,
    val estimatedDeliveryTime: String?
)

// Request DTOs
data class UpdateCourierStatusRequest(
    val status: String
)

data class UpdateLocationRequest(
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long = System.currentTimeMillis()
)

data class UpdateOrderStatusRequest(
    val status: String
)

data class ConfirmPickupRequest(
    val photoUrl: String?,
    val notes: String?,
    val latitude: Double?,
    val longitude: Double?
)

data class ConfirmDeliveryRequest(
    val photoUrl: String?,
    val signature: String?,
    val notes: String?,
    val latitude: Double?,
    val longitude: Double?
)

data class ReportIssueRequest(
    val description: String,
    val type: String? = null
)

// API Error codes
object ApiErrorCodes {
    const val INVALID_OTP = "INVALID_OTP"
    const val OTP_EXPIRED = "OTP_EXPIRED"
    const val COURIER_NOT_FOUND = "COURIER_NOT_FOUND"
    const val PHONE_ALREADY_EXISTS = "PHONE_ALREADY_EXISTS"
    const val ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
    const val ORDER_ALREADY_ACCEPTED = "ORDER_ALREADY_ACCEPTED"
    const val INVALID_ORDER_STATUS = "INVALID_ORDER_STATUS"
    const val LOCATION_NOT_AVAILABLE = "LOCATION_NOT_AVAILABLE"
    const val UNAUTHORIZED = "UNAUTHORIZED"
    const val FORBIDDEN = "FORBIDDEN"
    const val VALIDATION_ERROR = "VALIDATION_ERROR"
    const val NETWORK_ERROR = "NETWORK_ERROR"
    const val UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
