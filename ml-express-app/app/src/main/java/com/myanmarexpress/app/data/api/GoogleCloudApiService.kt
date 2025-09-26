package com.myanmarexpress.app.data.api

import retrofit2.Response
import retrofit2.http.*
import java.time.Instant

/**
 * Google Cloud API服务接口
 */
interface GoogleCloudApiService {

    /**
     * 连接到您的Google Cloud ML-EXPRESS项目
     */
    @GET("orders")
    suspend fun getOrders(): Response<ApiResponse<List<OrderDto>>>

    @POST("orders")
    suspend fun createOrder(
        @Body order: CreateOrderDto
    ): Response<ApiResponse<OrderDto>>

    @GET("orders/{orderId}")
    suspend fun getOrderById(
        @Path("orderId") orderId: String
    ): Response<ApiResponse<OrderDto>>

    @PUT("orders/{orderId}/status")
    suspend fun updateOrderStatus(
        @Path("orderId") orderId: String,
        @Body status: OrderStatusDto
    ): Response<ApiResponse<OrderDto>>

    // ------------------ 骑手端专用接口 ------------------

    /**
     * 获取骑手当前任务列表
     */
    @GET("couriers/{courierId}/tasks")
    suspend fun getCourierTasks(
        @Path("courierId") courierId: String
    ): Response<ApiResponse<List<CourierTaskDto>>>

    /**
     * 更新骑手任务状态（接单、取件、送达、异常等）
     */
    @POST("couriers/{courierId}/tasks/{taskId}/status")
    suspend fun updateCourierTaskStatus(
        @Path("courierId") courierId: String,
        @Path("taskId") taskId: String,
        @Body status: CourierTaskStatusDto
    ): Response<ApiResponse<CourierTaskDto>>

    /**
     * 上传骑手实时位置
     */
    @POST("couriers/{courierId}/location")
    suspend fun uploadCourierLocation(
        @Path("courierId") courierId: String,
        @Body location: CourierLocationDto
    ): Response<ApiResponse<Unit>>

    /**
     * 获取骑手统计信息（收益、完成单量等）
     */
    @GET("couriers/{courierId}/stats")
    suspend fun getCourierStats(
        @Path("courierId") courierId: String
    ): Response<ApiResponse<CourierStatsDto>>
}

data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val error: ErrorDto? = null
)

data class ErrorDto(
    val code: String,
    val message: String
)

data class OrderDto(
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val customerPhone: String,
    val senderAddress: String,
    val receiverName: String,
    val receiverPhone: String,
    val receiverAddress: String,
    val packageType: String,
    val weight: Double,
    val amount: Double,
    val status: String,
    val createdAt: String
)

data class CreateOrderDto(
    val customerName: String,
    val customerPhone: String,
    val senderAddress: String,
    val receiverName: String,
    val receiverPhone: String,
    val receiverAddress: String,
    val packageType: String,
    val weight: Double,
    val serviceType: String
)

data class OrderStatusDto(
    val status: String,
    val notes: String? = null
)

data class CourierTaskDto(
    val taskId: String,
    val orderId: String,
    val pickupAddress: String,
    val deliveryAddress: String,
    val customerName: String,
    val customerPhone: String,
    val status: String,
    val assignedAt: String,
    val expectedDeliveryTime: String?
)

data class CourierTaskStatusDto(
    val status: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val timestamp: String = Instant.now().toString(),
    val notes: String? = null
)

data class CourierLocationDto(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val speed: Float?,
    val heading: Float?,
    val timestamp: String = Instant.now().toString()
)

data class CourierStatsDto(
    val totalCompleted: Int,
    val totalEarnings: Double,
    val activeTasks: Int,
    val rating: Double?,
    val onlineHours: Double
)

