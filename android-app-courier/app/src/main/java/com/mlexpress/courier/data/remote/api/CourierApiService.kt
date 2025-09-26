package com.mlexpress.courier.data.remote.api

import com.mlexpress.courier.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

/**
 * 骑手API服务接口
 */
interface CourierApiService {
    
    /**
     * 获取可接订单列表
     */
    @GET("courier/orders/available")
    suspend fun getAvailableOrders(
        @Header("Authorization") token: String,
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radius") radius: Double = 10.0, // km
        @Query("maxOrders") maxOrders: Int = 20
    ): Response<ApiResponse<List<AvailableOrderDto>>>
    
    /**
     * 接受订单
     */
    @POST("courier/orders/{orderId}/accept")
    suspend fun acceptOrder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: AcceptOrderRequest? = null
    ): Response<ApiResponse<CourierOrderDto>>
    
    /**
     * 拒绝订单
     */
    @POST("courier/orders/{orderId}/reject")
    suspend fun rejectOrder(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: RejectOrderRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * 获取当前任务列表
     */
    @GET("courier/tasks")
    suspend fun getCurrentTasks(
        @Header("Authorization") token: String
    ): Response<ApiResponse<List<CourierTaskDto>>>
    
    /**
     * 更新任务状态
     */
    @PUT("courier/tasks/{orderId}/status")
    suspend fun updateTaskStatus(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: UpdateTaskStatusRequest
    ): Response<ApiResponse<CourierTaskDto>>
    
    /**
     * 确认取件
     */
    @POST("courier/tasks/{orderId}/pickup")
    suspend fun confirmPickup(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: ConfirmPickupRequest
    ): Response<ApiResponse<CourierTaskDto>>
    
    /**
     * 确认送达
     */
    @POST("courier/tasks/{orderId}/delivery")
    suspend fun confirmDelivery(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: String,
        @Body request: ConfirmDeliveryRequest
    ): Response<ApiResponse<CourierTaskDto>>
    
    /**
     * 上报位置
     */
    @POST("courier/location")
    suspend fun updateLocation(
        @Header("Authorization") token: String,
        @Body request: UpdateLocationRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * 批量上报位置
     */
    @POST("courier/location/batch")
    suspend fun updateLocationBatch(
        @Header("Authorization") token: String,
        @Body request: BatchUpdateLocationRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * 更新在线状态
     */
    @PUT("courier/status")
    suspend fun updateOnlineStatus(
        @Header("Authorization") token: String,
        @Body request: UpdateOnlineStatusRequest
    ): Response<ApiResponse<CourierStatusResponse>>
    
    /**
     * 获取收入统计
     */
    @GET("courier/earnings")
    suspend fun getEarnings(
        @Header("Authorization") token: String,
        @Query("period") period: String = "month", // day, week, month, year
        @Query("dateFrom") dateFrom: String? = null,
        @Query("dateTo") dateTo: String? = null
    ): Response<ApiResponse<EarningsResponse>>
    
    /**
     * 获取收入明细
     */
    @GET("courier/earnings/details")
    suspend fun getEarningsDetails(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("type") type: String? = null
    ): Response<ApiResponse<PaginatedResponse<EarningsRecordDto>>>
    
    /**
     * 申请提现
     */
    @POST("courier/earnings/withdraw")
    suspend fun requestWithdrawal(
        @Header("Authorization") token: String,
        @Body request: WithdrawalRequest
    ): Response<ApiResponse<WithdrawalResponse>>
    
    /**
     * 获取工作统计
     */
    @GET("courier/statistics")
    suspend fun getWorkStatistics(
        @Header("Authorization") token: String,
        @Query("period") period: String = "month"
    ): Response<ApiResponse<WorkStatisticsResponse>>
    
    /**
     * 上报问题
     */
    @POST("courier/issues")
    suspend fun reportIssue(
        @Header("Authorization") token: String,
        @Body request: ReportIssueRequest
    ): Response<ApiResponse<IssueResponse>>
    
    /**
     * 获取骑手资料
     */
    @GET("courier/profile")
    suspend fun getCourierProfile(
        @Header("Authorization") token: String
    ): Response<ApiResponse<CourierProfileResponse>>
    
    /**
     * 更新骑手资料
     */
    @PUT("courier/profile")
    suspend fun updateCourierProfile(
        @Header("Authorization") token: String,
        @Body request: UpdateCourierProfileRequest
    ): Response<ApiResponse<CourierProfileResponse>>
    
    /**
     * 上传文件
     */
    @Multipart
    @POST("courier/upload")
    suspend fun uploadFile(
        @Header("Authorization") token: String,
        @Part file: okhttp3.MultipartBody.Part,
        @Part("type") type: okhttp3.RequestBody,
        @Part("orderId") orderId: okhttp3.RequestBody? = null
    ): Response<ApiResponse<FileUploadResponse>>
}

// ==================== 请求DTO ====================

/**
 * 接受订单请求
 */
data class AcceptOrderRequest(
    val estimatedPickupTime: String? = null,
    val notes: String? = null,
    val currentLocation: LocationDto? = null
)

/**
 * 拒绝订单请求
 */
data class RejectOrderRequest(
    val reason: String,
    val reasonCode: String? = null
)

/**
 * 更新任务状态请求
 */
data class UpdateTaskStatusRequest(
    val status: String,
    val location: LocationDto? = null,
    val notes: String? = null,
    val timestamp: String? = null,
    val estimatedTime: String? = null
)

/**
 * 确认取件请求
 */
data class ConfirmPickupRequest(
    val location: LocationDto,
    val timestamp: String,
    val photoUrls: List<String> = emptyList(),
    val signature: String? = null,
    val notes: String? = null,
    val packageCondition: String = "good", // good, damaged, missing
    val verificationCode: String? = null
)

/**
 * 确认送达请求
 */
data class ConfirmDeliveryRequest(
    val location: LocationDto,
    val timestamp: String,
    val receiverName: String,
    val receiverPhone: String? = null,
    val photoUrls: List<String> = emptyList(),
    val signature: String? = null,
    val notes: String? = null,
    val deliveryMethod: String = "hand_to_hand", // hand_to_hand, safe_place, neighbor
    val verificationCode: String? = null
)

/**
 * 更新位置请求
 */
data class UpdateLocationRequest(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val speed: Float? = null,
    val heading: Float? = null,
    val timestamp: String,
    val isOnDuty: Boolean = true
)

/**
 * 批量更新位置请求
 */
data class BatchUpdateLocationRequest(
    val locations: List<LocationUpdateDto>
)

data class LocationUpdateDto(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val speed: Float? = null,
    val heading: Float? = null,
    val timestamp: String
)

/**
 * 更新在线状态请求
 */
data class UpdateOnlineStatusRequest(
    val status: String, // online, offline, busy, unavailable
    val location: LocationDto? = null,
    val reason: String? = null
)

/**
 * 提现请求
 */
data class WithdrawalRequest(
    val amount: Double,
    val bankAccount: BankAccountDto,
    val notes: String? = null
)

/**
 * 银行账户信息
 */
data class BankAccountDto(
    val bankName: String,
    val accountNumber: String,
    val accountName: String,
    val bankCode: String? = null
)

/**
 * 问题上报请求
 */
data class ReportIssueRequest(
    val orderId: String? = null,
    val type: String,
    val description: String,
    val severity: String = "medium", // low, medium, high, critical
    val location: LocationDto? = null,
    val photoUrls: List<String> = emptyList()
)

/**
 * 更新骑手资料请求
 */
data class UpdateCourierProfileRequest(
    val fullName: String? = null,
    val email: String? = null,
    val vehicleInfo: VehicleInfoDto? = null,
    val workingHours: WorkingHoursDto? = null,
    val serviceAreas: List<String> = emptyList(),
    val preferences: CourierPreferencesDto? = null
)

/**
 * 工作时间
 */
data class WorkingHoursDto(
    val monday: DayScheduleDto? = null,
    val tuesday: DayScheduleDto? = null,
    val wednesday: DayScheduleDto? = null,
    val thursday: DayScheduleDto? = null,
    val friday: DayScheduleDto? = null,
    val saturday: DayScheduleDto? = null,
    val sunday: DayScheduleDto? = null
)

data class DayScheduleDto(
    val isWorking: Boolean,
    val startTime: String, // HH:mm
    val endTime: String,   // HH:mm
    val breakStart: String? = null,
    val breakEnd: String? = null
)

/**
 * 骑手偏好设置
 */
data class CourierPreferencesDto(
    val maxOrderDistance: Double = 10.0, // km
    val acceptsFragileItems: Boolean = true,
    val acceptsLargeItems: Boolean = true,
    val acceptsCashPayment: Boolean = true,
    val preferredOrderTypes: List<String> = emptyList(),
    val blacklistedAreas: List<String> = emptyList()
)

// ==================== 响应DTO ====================

/**
 * 可接订单
 */
data class AvailableOrderDto(
    val id: String,
    val orderNumber: String,
    val priority: String,
    val serviceType: String,
    val isUrgent: Boolean,
    
    val pickupInfo: ContactInfoDto,
    val deliveryInfo: ContactInfoDto,
    val packageInfo: PackageInfoDto,
    
    val distance: Double,
    val estimatedDuration: Int,
    val courierEarning: Double,
    val totalCost: Double,
    
    val createdAt: String,
    val expiresAt: String? = null,
    val estimatedPickupTime: String? = null,
    val estimatedDeliveryTime: String? = null
)

/**
 * 骑手订单
 */
data class CourierOrderDto(
    val id: String,
    val orderNumber: String,
    val customerId: String,
    val status: String,
    val priority: String,
    
    val pickupInfo: ContactInfoDto,
    val deliveryInfo: ContactInfoDto,
    val packageInfo: PackageInfoDto,
    val serviceInfo: ServiceInfoDto,
    
    val distance: Double,
    val courierEarning: Double,
    val totalCost: Double,
    
    val assignedAt: String,
    val estimatedPickupTime: String? = null,
    val estimatedDeliveryTime: String? = null,
    val actualPickupTime: String? = null,
    val actualDeliveryTime: String? = null,
    
    val customerNotes: String? = null,
    val courierNotes: String? = null,
    val specialInstructions: String? = null
)

/**
 * 骑手任务
 */
data class CourierTaskDto(
    val orderId: String,
    val orderNumber: String,
    val currentStatus: String,
    val nextAction: String, // pickup, delivery, complete
    
    val targetInfo: ContactInfoDto, // 当前目标（取件人或收件人）
    val packageInfo: PackageInfoDto,
    
    val distance: Double,
    val estimatedDuration: Int,
    val earning: Double,
    
    val instructions: List<String> = emptyList(),
    val requirements: List<String> = emptyList(),
    val warnings: List<String> = emptyList()
)

/**
 * 骑手状态响应
 */
data class CourierStatusResponse(
    val status: String,
    val isOnline: Boolean,
    val lastStatusChange: String,
    val activeOrdersCount: Int,
    val todayEarnings: Double,
    val todayOrdersCount: Int
)

/**
 * 收入响应
 */
data class EarningsResponse(
    val period: String,
    val totalEarnings: Double,
    val availableBalance: Double,
    val pendingEarnings: Double,
    val withdrawnAmount: Double,
    
    val orderEarnings: Double,
    val bonusEarnings: Double,
    val penaltyAmount: Double,
    
    val breakdown: EarningsBreakdownDto,
    val dailyEarnings: List<DailyEarningsDto> = emptyList()
)

/**
 * 收入明细
 */
data class EarningsBreakdownDto(
    val baseEarnings: Double,
    val distanceBonus: Double,
    val urgentBonus: Double,
    val ratingBonus: Double,
    val completionBonus: Double,
    val penalties: Double,
    val adjustments: Double
)

/**
 * 每日收入
 */
data class DailyEarningsDto(
    val date: String, // YYYY-MM-DD
    val earnings: Double,
    val ordersCount: Int,
    val onlineHours: Float,
    val averageRating: Float
)

/**
 * 收入记录
 */
data class EarningsRecordDto(
    val id: String,
    val orderId: String?,
    val type: String,
    val amount: Double,
    val description: String,
    val status: String, // pending, completed, failed
    val createdAt: String,
    val settledAt: String? = null,
    val notes: String? = null
)

/**
 * 提现响应
 */
data class WithdrawalResponse(
    val withdrawalId: String,
    val amount: Double,
    val fee: Double,
    val netAmount: Double,
    val status: String,
    val bankAccount: BankAccountDto,
    val estimatedCompletionTime: String,
    val createdAt: String
)

/**
 * 工作统计响应
 */
data class WorkStatisticsResponse(
    val period: String,
    val totalOrders: Int,
    val completedOrders: Int,
    val cancelledOrders: Int,
    val completionRate: Float,
    val averageDeliveryTime: Int, // minutes
    val onTimeDeliveryRate: Float,
    val totalDistance: Double, // km
    val totalOnlineTime: Int, // minutes
    val averageRating: Float,
    val totalEarnings: Double,
    val rankingPosition: Int? = null,
    val performanceScore: Float
)

/**
 * 问题响应
 */
data class IssueResponse(
    val issueId: String,
    val status: String,
    val priority: String,
    val assignedTo: String? = null,
    val estimatedResolutionTime: String? = null,
    val createdAt: String
)

/**
 * 骑手资料响应
 */
data class CourierProfileResponse(
    val id: String,
    val workId: String,
    val phoneNumber: String,
    val fullName: String,
    val email: String? = null,
    val profileImageUrl: String? = null,
    
    val identityInfo: IdentityInfoDto,
    val vehicleInfo: VehicleInfoDto,
    val workingInfo: WorkingInfoDto,
    
    val status: String,
    val isVerified: Boolean,
    val isActive: Boolean,
    val verificationLevel: String, // basic, verified, premium
    
    val statistics: CourierStatisticsDto,
    val preferences: CourierPreferencesDto,
    
    val createdAt: String,
    val verifiedAt: String? = null,
    val lastActiveAt: String
)

/**
 * 身份信息
 */
data class IdentityInfoDto(
    val identityCardNumber: String,
    val identityCardImageUrl: String? = null,
    val drivingLicenseNumber: String? = null,
    val drivingLicenseImageUrl: String? = null,
    val healthCertificateUrl: String? = null,
    val verificationStatus: String
)

/**
 * 工作信息
 */
data class WorkingInfoDto(
    val workingHours: WorkingHoursDto? = null,
    val serviceAreas: List<ServiceAreaDto> = emptyList(),
    val currentShift: ShiftInfoDto? = null
)

/**
 * 服务区域
 */
data class ServiceAreaDto(
    val id: String,
    val name: String,
    val coordinates: List<LocationDto> = emptyList(), // 多边形区域
    val isActive: Boolean = true
)

/**
 * 班次信息
 */
data class ShiftInfoDto(
    val id: String,
    val startTime: String,
    val endTime: String? = null,
    val status: String, // active, completed, cancelled
    val plannedDuration: Int, // minutes
    val actualDuration: Int? = null
)

/**
 * 骑手统计
 */
data class CourierStatisticsDto(
    val totalOrders: Int,
    val completedOrders: Int,
    val cancelledOrders: Int,
    val rating: Float,
    val totalEarnings: Double,
    val totalDistance: Double,
    val totalOnlineTime: Int, // minutes
    val joinedAt: String,
    val lastOrderAt: String? = null
)

/**
 * 文件上传响应
 */
data class FileUploadResponse(
    val fileId: String,
    val fileName: String,
    val fileUrl: String,
    val fileSize: Long,
    val mimeType: String,
    val uploadedAt: String
)
