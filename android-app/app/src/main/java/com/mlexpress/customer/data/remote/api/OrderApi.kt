package com.mlexpress.customer.data.remote.api

import com.mlexpress.customer.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface OrderApi {
    
    @POST("orders/calculate-cost")
    suspend fun calculateOrderCost(
        @Header("Authorization") token: String,
        @Body request: CalculateCostRequest
    ): Response<ApiResponse<CalculateCostResponse>>
    
    @POST("orders")
    suspend fun createOrder(
        @Header("Authorization") token: String,
        @Body request: CreateOrderRequest
    ): Response<ApiResponse<OrderDto>>
    
    @GET("orders")
    suspend fun getOrders(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null
    ): Response<ApiResponse<PaginatedResponse<OrderDto>>>
    
    @GET("orders/{orderId}")
    suspend fun getOrderById(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String
    ): Response<ApiResponse<OrderDto>>
    
    @GET("orders/track/{orderNumber}")
    suspend fun trackOrder(
        @Query("orderNumber") orderNumber: String
    ): Response<ApiResponse<OrderTrackingResponse>>
    
    @PUT("orders/{orderId}/cancel")
    suspend fun cancelOrder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: CancelOrderRequest
    ): Response<ApiResponse<OrderDto>>
    
    @PUT("orders/{orderId}/rate")
    suspend fun rateOrder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: RateOrderRequest
    ): Response<ApiResponse<Unit>>
}

// Request DTOs
data class CalculateCostRequest(
    val senderLatitude: Double,
    val senderLongitude: Double,
    val receiverLatitude: Double,
    val receiverLongitude: Double,
    val packageType: String,
    val weight: Double,
    val serviceType: String,
    val isUrgent: Boolean = false
)

data class CreateOrderRequest(
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
    val paymentMethod: String,
    val notes: String?
)

data class CancelOrderRequest(
    val reason: String
)

data class RateOrderRequest(
    val rating: Int,
    val feedback: String?
)

// Response DTOs
data class CalculateCostResponse(
    val distance: Double,
    val baseCost: Double,
    val serviceFee: Double,
    val urgentFee: Double,
    val totalCost: Double,
    val estimatedDeliveryTime: String
)

data class OrderDto(
    val id: String,
    val orderNumber: String,
    val userId: String,
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
    val paymentMethod: String,
    val paymentStatus: String,
    val status: String,
    val courierInfo: CourierInfoDto?,
    val createdAt: String,
    val estimatedDeliveryTime: String?,
    val actualDeliveryTime: String?,
    val trackingUpdates: List<TrackingUpdateDto>,
    val rating: Int?,
    val feedback: String?
)

data class CourierInfoDto(
    val id: String,
    val name: String,
    val phone: String,
    val vehicleType: String,
    val vehiclePlate: String,
    val rating: Float,
    val profileImageUrl: String?,
    val currentLatitude: Double?,
    val currentLongitude: Double?
)

data class TrackingUpdateDto(
    val id: String,
    val orderId: String,
    val status: String,
    val description: String,
    val timestamp: String,
    val location: String?,
    val latitude: Double?,
    val longitude: Double?
)

data class OrderTrackingResponse(
    val order: OrderDto,
    val courierLocation: CourierLocationDto?
)

data class CourierLocationDto(
    val latitude: Double,
    val longitude: Double,
    val heading: Float,
    val speed: Float,
    val lastUpdated: String
)
