package com.mlexpress.customer.data.remote.api

import com.mlexpress.customer.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

/**
 * 订单API服务接口
 */
interface OrderApiService {
    
    /**
     * 计算订单费用
     */
    @POST("orders/calculate-cost")
    suspend fun calculateOrderCost(
        @Header("Authorization") token: String,
        @Body request: CalculateOrderCostRequest
    ): Response<ApiResponse<OrderCostResponse>>
    
    /**
     * 创建新订单
     */
    @POST("orders")
    suspend fun createOrder(
        @Header("Authorization") token: String,
        @Body request: CreateOrderRequest
    ): Response<ApiResponse<OrderResponse>>
    
    /**
     * 获取订单列表
     */
    @GET("orders")
    suspend fun getOrders(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null,
        @Query("dateFrom") dateFrom: String? = null,
        @Query("dateTo") dateTo: String? = null,
        @Query("sortBy") sortBy: String = "createdAt",
        @Query("sortOrder") sortOrder: String = "desc"
    ): Response<ApiResponse<PaginatedResponse<OrderResponse>>>
    
    /**
     * 获取订单详情
     */
    @GET("orders/{orderId}")
    suspend fun getOrderById(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String
    ): Response<ApiResponse<OrderDetailResponse>>
    
    /**
     * 更新订单状态
     */
    @PUT("orders/{orderId}/status")
    suspend fun updateOrderStatus(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: UpdateOrderStatusRequest
    ): Response<ApiResponse<OrderResponse>>
    
    /**
     * 取消订单
     */
    @PUT("orders/{orderId}/cancel")
    suspend fun cancelOrder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: CancelOrderRequest
    ): Response<ApiResponse<OrderResponse>>
    
    /**
     * 评价订单
     */
    @POST("orders/{orderId}/rating")
    suspend fun rateOrder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: RateOrderRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * 跟踪订单
     */
    @GET("orders/track/{orderNumber}")
    suspend fun trackOrder(
        @Path("orderNumber") orderNumber: String
    ): Response<ApiResponse<OrderTrackingResponse>>
    
    /**
     * 获取订单历史
     */
    @GET("orders/history")
    suspend fun getOrderHistory(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("year") year: Int? = null,
        @Query("month") month: Int? = null
    ): Response<ApiResponse<PaginatedResponse<OrderResponse>>>
    
    /**
     * 重新下单
     */
    @POST("orders/{orderId}/reorder")
    suspend fun reorder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: ReorderRequest? = null
    ): Response<ApiResponse<OrderResponse>>
    
    /**
     * 获取订单统计
     */
    @GET("orders/statistics")
    suspend fun getOrderStatistics(
        @Header("Authorization") token: String,
        @Query("period") period: String = "month" // day, week, month, year
    ): Response<ApiResponse<OrderStatisticsResponse>>
}

// ==================== 请求DTO ====================

/**
 * 计算订单费用请求
 */
data class CalculateOrderCostRequest(
    val senderLatitude: Double,
    val senderLongitude: Double,
    val receiverLatitude: Double,
    val receiverLongitude: Double,
    val packageType: String,
    val weight: Double,
    val dimensions: DimensionsDto? = null,
    val serviceType: String,
    val isUrgent: Boolean = false,
    val declaredValue: Double? = null,
    val pickupTime: String? = null // ISO 8601 format
)

/**
 * 创建订单请求
 */
data class CreateOrderRequest(
    // 寄件人信息
    val senderName: String,
    val senderPhone: String,
    val senderAddress: String,
    val senderLatitude: Double,
    val senderLongitude: Double,
    val senderAddressDetails: AddressDetailsDto? = null,
    
    // 收件人信息
    val receiverName: String,
    val receiverPhone: String,
    val receiverAddress: String,
    val receiverLatitude: Double,
    val receiverLongitude: Double,
    val receiverAddressDetails: AddressDetailsDto? = null,
    
    // 包裹信息
    val packageType: String,
    val weight: Double,
    val dimensions: DimensionsDto? = null,
    val description: String? = null,
    val declaredValue: Double? = null,
    val isFragile: Boolean = false,
    val specialInstructions: String? = null,
    
    // 服务信息
    val serviceType: String,
    val isUrgent: Boolean = false,
    val preferredPickupTime: String? = null,
    val preferredDeliveryTime: String? = null,
    
    // 支付信息
    val paymentMethod: String,
    val paymentDetails: Map<String, String> = emptyMap(),
    
    // 其他信息
    val notes: String? = null,
    val referenceNumber: String? = null
)

/**
 * 更新订单状态请求
 */
data class UpdateOrderStatusRequest(
    val status: String,
    val notes: String? = null,
    val location: LocationDto? = null,
    val timestamp: String? = null
)

/**
 * 取消订单请求
 */
data class CancelOrderRequest(
    val reason: String,
    val reasonCode: String? = null,
    val refundRequested: Boolean = false
)

/**
 * 评价订单请求
 */
data class RateOrderRequest(
    val rating: Int, // 1-5
    val feedback: String? = null,
    val serviceAspects: Map<String, Int> = emptyMap(), // 服务各方面评分
    val courierRating: Int? = null,
    val courierFeedback: String? = null
)

/**
 * 重新下单请求
 */
data class ReorderRequest(
    val senderAddress: String? = null,
    val receiverAddress: String? = null,
    val serviceType: String? = null,
    val paymentMethod: String? = null
)

// ==================== 响应DTO ====================

/**
 * 订单费用响应
 */
data class OrderCostResponse(
    val distance: Double, // km
    val estimatedDuration: Int, // minutes
    val baseCost: Double,
    val serviceFee: Double,
    val urgentFee: Double = 0.0,
    val insuranceFee: Double = 0.0,
    val totalCost: Double,
    val breakdown: CostBreakdownDto,
    val estimatedPickupTime: String? = null,
    val estimatedDeliveryTime: String? = null,
    val validUntil: String // 报价有效期
)

/**
 * 订单响应
 */
data class OrderResponse(
    val id: String,
    val orderNumber: String,
    val userId: String,
    
    // 地址信息
    val senderInfo: ContactInfoDto,
    val receiverInfo: ContactInfoDto,
    
    // 包裹信息
    val packageInfo: PackageInfoDto,
    
    // 服务信息
    val serviceInfo: ServiceInfoDto,
    
    // 费用信息
    val costInfo: CostInfoDto,
    
    // 状态信息
    val status: String,
    val statusHistory: List<StatusUpdateDto> = emptyList(),
    
    // 配送员信息
    val courierInfo: CourierInfoDto? = null,
    
    // 时间信息
    val createdAt: String,
    val updatedAt: String,
    val estimatedPickupTime: String? = null,
    val estimatedDeliveryTime: String? = null,
    val actualPickupTime: String? = null,
    val actualDeliveryTime: String? = null,
    
    // 支付信息
    val paymentInfo: PaymentInfoDto,
    
    // 评价信息
    val rating: RatingInfoDto? = null,
    
    // 其他信息
    val notes: String? = null,
    val referenceNumber: String? = null
)

/**
 * 订单详情响应
 */
data class OrderDetailResponse(
    val order: OrderResponse,
    val trackingUpdates: List<TrackingUpdateDto> = emptyList(),
    val courierLocation: CourierLocationDto? = null,
    val estimatedArrival: String? = null,
    val deliveryProof: DeliveryProofDto? = null
)

/**
 * 订单跟踪响应
 */
data class OrderTrackingResponse(
    val orderNumber: String,
    val status: String,
    val currentLocation: String? = null,
    val estimatedDelivery: String? = null,
    val courierInfo: CourierInfoDto? = null,
    val courierLocation: CourierLocationDto? = null,
    val trackingHistory: List<TrackingUpdateDto> = emptyList(),
    val lastUpdated: String
)

/**
 * 订单统计响应
 */
data class OrderStatisticsResponse(
    val period: String,
    val totalOrders: Int,
    val completedOrders: Int,
    val cancelledOrders: Int,
    val totalSpent: Double,
    val averageOrderValue: Double,
    val averageDeliveryTime: Int, // minutes
    val onTimeDeliveryRate: Float,
    val ordersByStatus: Map<String, Int>,
    val ordersByServiceType: Map<String, Int>,
    val monthlyTrend: List<MonthlyOrderTrendDto> = emptyList()
)

// ==================== 嵌套DTO ====================

/**
 * 联系人信息
 */
data class ContactInfoDto(
    val name: String,
    val phone: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val addressDetails: AddressDetailsDto? = null
)

/**
 * 地址详情
 */
data class AddressDetailsDto(
    val building: String? = null,
    val floor: String? = null,
    val room: String? = null,
    val landmark: String? = null,
    val city: String,
    val region: String,
    val postalCode: String? = null
)

/**
 * 包裹信息
 */
data class PackageInfoDto(
    val type: String,
    val weight: Double,
    val dimensions: DimensionsDto? = null,
    val description: String? = null,
    val declaredValue: Double? = null,
    val isFragile: Boolean = false,
    val specialInstructions: String? = null
)

/**
 * 尺寸信息
 */
data class DimensionsDto(
    val length: Double, // cm
    val width: Double,  // cm
    val height: Double  // cm
) {
    val volume: Double
        get() = length * width * height / 1000000 // 立方米
}

/**
 * 服务信息
 */
data class ServiceInfoDto(
    val type: String,
    val isUrgent: Boolean = false,
    val estimatedDuration: Int, // minutes
    val features: List<String> = emptyList()
)

/**
 * 费用信息
 */
data class CostInfoDto(
    val distance: Double,
    val baseCost: Double,
    val serviceFee: Double,
    val urgentFee: Double = 0.0,
    val insuranceFee: Double = 0.0,
    val discountAmount: Double = 0.0,
    val totalCost: Double,
    val breakdown: CostBreakdownDto
)

/**
 * 费用明细
 */
data class CostBreakdownDto(
    val distanceCost: Double,
    val weightCost: Double,
    val serviceCost: Double,
    val urgentCost: Double = 0.0,
    val insuranceCost: Double = 0.0,
    val taxes: Double = 0.0,
    val discounts: List<DiscountDto> = emptyList()
)

/**
 * 折扣信息
 */
data class DiscountDto(
    val type: String,
    val name: String,
    val amount: Double,
    val percentage: Float? = null
)

/**
 * 状态更新
 */
data class StatusUpdateDto(
    val id: String,
    val status: String,
    val description: String,
    val timestamp: String,
    val location: String? = null,
    val coordinates: LocationDto? = null,
    val updatedBy: String? = null,
    val notes: String? = null
)

/**
 * 配送员信息
 */
data class CourierInfoDto(
    val id: String,
    val name: String,
    val phone: String,
    val profileImageUrl: String? = null,
    val vehicleInfo: VehicleInfoDto,
    val rating: Float,
    val totalDeliveries: Int,
    val isOnline: Boolean = false,
    val estimatedArrival: String? = null
)

/**
 * 车辆信息
 */
data class VehicleInfoDto(
    val type: String,
    val model: String? = null,
    val color: String? = null,
    val plateNumber: String,
    val imageUrl: String? = null
)

/**
 * 配送员位置
 */
data class CourierLocationDto(
    val latitude: Double,
    val longitude: Double,
    val heading: Float = 0.0f,
    val speed: Float = 0.0f, // km/h
    val accuracy: Float = 0.0f, // meters
    val timestamp: String,
    val address: String? = null
)

/**
 * 跟踪更新
 */
data class TrackingUpdateDto(
    val id: String,
    val orderId: String,
    val status: String,
    val description: String,
    val timestamp: String,
    val location: String? = null,
    val coordinates: LocationDto? = null,
    val courierInfo: CourierInfoDto? = null,
    val estimatedTime: String? = null,
    val photoUrl: String? = null
)

/**
 * 送达证明
 */
data class DeliveryProofDto(
    val deliveryTime: String,
    val receiverName: String,
    val signature: String? = null,
    val photoUrl: String? = null,
    val location: LocationDto,
    val notes: String? = null
)

/**
 * 支付信息
 */
data class PaymentInfoDto(
    val method: String,
    val status: String,
    val amount: Double,
    val paidAmount: Double? = null,
    val transactionId: String? = null,
    val paidAt: String? = null,
    val refundAmount: Double? = null,
    val refundStatus: String? = null
)

/**
 * 评价信息
 */
data class RatingInfoDto(
    val rating: Int,
    val feedback: String? = null,
    val serviceAspects: Map<String, Int> = emptyMap(),
    val courierRating: Int? = null,
    val courierFeedback: String? = null,
    val ratedAt: String
)

/**
 * 位置信息
 */
data class LocationDto(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null,
    val timestamp: String? = null
)

/**
 * 月度订单趋势
 */
data class MonthlyOrderTrendDto(
    val month: String, // YYYY-MM
    val orderCount: Int,
    val totalAmount: Double,
    val averageAmount: Double,
    val completionRate: Float
)
