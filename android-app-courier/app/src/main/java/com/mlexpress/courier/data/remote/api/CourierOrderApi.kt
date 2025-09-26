package com.mlexpress.courier.data.remote.api

import com.mlexpress.courier.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface CourierOrderApi {
    
    @GET("orders/available")
    suspend fun getAvailableOrders(
        @Header("Authorization") token: String,
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radius") radius: Double = 10.0
    ): Response<ApiResponse<List<CourierOrderDto>>>
    
    @POST("orders/{orderId}/accept")
    suspend fun acceptOrder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String
    ): Response<ApiResponse<CourierOrderDto>>
    
    @GET("orders/active")
    suspend fun getActiveTasks(
        @Header("Authorization") token: String
    ): Response<ApiResponse<List<CourierOrderDto>>>
    
    @GET("orders/{orderId}")
    suspend fun getOrderById(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String
    ): Response<ApiResponse<CourierOrderDto>>
    
    @PUT("orders/{orderId}/status")
    suspend fun updateOrderStatus(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: UpdateOrderStatusRequest
    ): Response<ApiResponse<CourierOrderDto>>
    
    @POST("orders/{orderId}/pickup")
    suspend fun confirmPickup(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: ConfirmPickupRequest
    ): Response<ApiResponse<CourierOrderDto>>
    
    @POST("orders/{orderId}/delivery")
    suspend fun confirmDelivery(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: ConfirmDeliveryRequest
    ): Response<ApiResponse<CourierOrderDto>>
    
    @POST("orders/{orderId}/issue")
    suspend fun reportIssue(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: ReportIssueRequest
    ): Response<ApiResponse<Unit>>
}

interface CourierApi {
    
    @PUT("courier/status")
    suspend fun updateStatus(
        @Header("Authorization") token: String,
        @Body request: UpdateCourierStatusRequest
    ): Response<ApiResponse<Unit>>
    
    @PUT("courier/location")
    suspend fun updateLocation(
        @Header("Authorization") token: String,
        @Body request: UpdateLocationRequest
    ): Response<ApiResponse<Unit>>
    
    @GET("courier/profile")
    suspend fun getProfile(
        @Header("Authorization") token: String
    ): Response<ApiResponse<CourierDto>>
    
    @PUT("courier/profile")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body request: UpdateCourierProfileRequest
    ): Response<ApiResponse<CourierDto>>
    
    @POST("courier/logout")
    suspend fun logout(
        @Header("Authorization") token: String
    ): Response<ApiResponse<Unit>>
}

// Additional request DTOs
data class UpdateCourierProfileRequest(
    val fullName: String?,
    val email: String?,
    val vehicleType: String?,
    val vehiclePlate: String?
)
