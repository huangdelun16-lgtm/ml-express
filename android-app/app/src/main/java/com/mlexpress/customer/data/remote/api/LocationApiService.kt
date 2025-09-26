package com.mlexpress.customer.data.remote.api

import com.mlexpress.customer.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

/**
 * 位置服务API接口
 */
interface LocationApiService {
    
    /**
     * 地理编码 - 地址转坐标
     */
    @GET("location/geocode")
    suspend fun geocodeAddress(
        @Query("address") address: String,
        @Query("city") city: String? = null,
        @Query("region") region: String? = null,
        @Query("country") country: String = "MM"
    ): Response<ApiResponse<GeocodeResponse>>
    
    /**
     * 反向地理编码 - 坐标转地址
     */
    @GET("location/reverse-geocode")
    suspend fun reverseGeocode(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("language") language: String = "en"
    ): Response<ApiResponse<ReverseGeocodeResponse>>
    
    /**
     * 计算距离和路径
     */
    @POST("location/calculate-route")
    suspend fun calculateRoute(
        @Body request: CalculateRouteRequest
    ): Response<ApiResponse<RouteResponse>>
    
    /**
     * 批量计算距离
     */
    @POST("location/calculate-distances")
    suspend fun calculateDistances(
        @Body request: BatchDistanceRequest
    ): Response<ApiResponse<BatchDistanceResponse>>
    
    /**
     * 地址搜索和建议
     */
    @GET("location/search")
    suspend fun searchAddresses(
        @Query("query") query: String,
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radius") radius: Double = 10.0, // km
        @Query("limit") limit: Int = 10,
        @Query("types") types: String? = null // poi, address, landmark
    ): Response<ApiResponse<List<AddressSuggestionDto>>>
    
    /**
     * 获取附近地标
     */
    @GET("location/nearby")
    suspend fun getNearbyPlaces(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Double = 1.0, // km
        @Query("types") types: String? = null, // restaurant, shop, landmark
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<List<NearbyPlaceDto>>>
    
    /**
     * 获取服务区域
     */
    @GET("location/service-areas")
    suspend fun getServiceAreas(): Response<ApiResponse<List<ServiceAreaDto>>>
    
    /**
     * 检查服务覆盖
     */
    @GET("location/check-coverage")
    suspend fun checkServiceCoverage(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double
    ): Response<ApiResponse<ServiceCoverageResponse>>
    
    /**
     * 获取配送费用区域
     */
    @GET("location/pricing-zones")
    suspend fun getPricingZones(): Response<ApiResponse<List<PricingZoneDto>>>
    
    /**
     * 地址验证
     */
    @POST("location/validate-address")
    suspend fun validateAddress(
        @Body request: ValidateAddressRequest
    ): Response<ApiResponse<AddressValidationResponse>>
    
    /**
     * 获取最优路径
     */
    @POST("location/optimize-route")
    suspend fun optimizeRoute(
        @Body request: RouteOptimizationRequest
    ): Response<ApiResponse<OptimizedRouteResponse>>
}

// ==================== 请求DTO ====================

/**
 * 计算路径请求
 */
data class CalculateRouteRequest(
    val origin: LocationDto,
    val destination: LocationDto,
    val waypoints: List<LocationDto> = emptyList(),
    val vehicleType: String = "motorcycle",
    val avoidTolls: Boolean = false,
    val avoidHighways: Boolean = false,
    val optimize: Boolean = true
)

/**
 * 批量距离计算请求
 */
data class BatchDistanceRequest(
    val origins: List<LocationDto>,
    val destinations: List<LocationDto>,
    val vehicleType: String = "motorcycle"
)

/**
 * 地址验证请求
 */
data class ValidateAddressRequest(
    val address: String,
    val city: String? = null,
    val region: String? = null,
    val postalCode: String? = null,
    val country: String = "MM"
)

/**
 * 路径优化请求
 */
data class RouteOptimizationRequest(
    val startLocation: LocationDto,
    val endLocation: LocationDto,
    val stops: List<RouteStopDto>,
    val vehicleType: String = "motorcycle",
    val optimizeFor: String = "time" // time, distance, fuel
)

/**
 * 路径停靠点
 */
data class RouteStopDto(
    val id: String,
    val location: LocationDto,
    val address: String,
    val type: String, // pickup, delivery
    val priority: Int = 0,
    val timeWindow: TimeWindowDto? = null,
    val serviceTime: Int = 5 // minutes
)

/**
 * 时间窗口
 */
data class TimeWindowDto(
    val startTime: String, // HH:mm
    val endTime: String    // HH:mm
)

// ==================== 响应DTO ====================

/**
 * 地理编码响应
 */
data class GeocodeResponse(
    val results: List<GeocodeResultDto>,
    val status: String
)

data class GeocodeResultDto(
    val address: String,
    val formattedAddress: String,
    val location: LocationDto,
    val accuracy: String,
    val addressComponents: List<AddressComponentDto> = emptyList()
)

/**
 * 反向地理编码响应
 */
data class ReverseGeocodeResponse(
    val address: String,
    val formattedAddress: String,
    val addressComponents: List<AddressComponentDto> = emptyList(),
    val location: LocationDto,
    val accuracy: String
)

/**
 * 地址组件
 */
data class AddressComponentDto(
    val longName: String,
    val shortName: String,
    val types: List<String>
)

/**
 * 路径响应
 */
data class RouteResponse(
    val distance: Double, // km
    val duration: Int,    // minutes
    val polyline: String, // 编码的路径点
    val steps: List<RouteStepDto> = emptyList(),
    val bounds: BoundsDto,
    val warnings: List<String> = emptyList()
)

/**
 * 路径步骤
 */
data class RouteStepDto(
    val instruction: String,
    val distance: Double,
    val duration: Int,
    val startLocation: LocationDto,
    val endLocation: LocationDto,
    val maneuver: String? = null
)

/**
 * 地理边界
 */
data class BoundsDto(
    val northeast: LocationDto,
    val southwest: LocationDto
)

/**
 * 批量距离响应
 */
data class BatchDistanceResponse(
    val results: List<DistanceResultDto>
)

data class DistanceResultDto(
    val originIndex: Int,
    val destinationIndex: Int,
    val distance: Double,
    val duration: Int,
    val status: String
)

/**
 * 地址建议
 */
data class AddressSuggestionDto(
    val id: String,
    val displayName: String,
    val fullAddress: String,
    val location: LocationDto,
    val type: String, // address, poi, landmark
    val category: String? = null,
    val distance: Double? = null // 距离查询点的距离
)

/**
 * 附近地点
 */
data class NearbyPlaceDto(
    val id: String,
    val name: String,
    val address: String,
    val location: LocationDto,
    val type: String,
    val category: String,
    val rating: Float? = null,
    val distance: Double,
    val isOpen: Boolean? = null,
    val phoneNumber: String? = null
)

/**
 * 服务区域
 */
data class ServiceAreaDto(
    val id: String,
    val name: String,
    val nameLocal: String? = null,
    val type: String, // city, district, township
    val boundaries: List<LocationDto> = emptyList(),
    val center: LocationDto,
    val isActive: Boolean,
    val serviceLevel: String, // standard, premium, limited
    val estimatedDeliveryTime: Int, // minutes
    val additionalFee: Double = 0.0
)

/**
 * 服务覆盖响应
 */
data class ServiceCoverageResponse(
    val isServiceable: Boolean,
    val serviceArea: ServiceAreaDto? = null,
    val estimatedDeliveryTime: Int? = null,
    val additionalFee: Double = 0.0,
    val restrictions: List<String> = emptyList(),
    val alternatives: List<AlternativeLocationDto> = emptyList()
)

/**
 * 替代位置
 */
data class AlternativeLocationDto(
    val name: String,
    val address: String,
    val location: LocationDto,
    val distance: Double,
    val additionalFee: Double = 0.0
)

/**
 * 定价区域
 */
data class PricingZoneDto(
    val id: String,
    val name: String,
    val boundaries: List<LocationDto>,
    val baseCost: Double,
    val costPerKm: Double,
    val costPerKg: Double,
    val urgentMultiplier: Float = 1.5f,
    val isActive: Boolean
)

/**
 * 地址验证响应
 */
data class AddressValidationResponse(
    val isValid: Boolean,
    val confidence: Float, // 0.0 - 1.0
    val correctedAddress: String? = null,
    val suggestions: List<String> = emptyList(),
    val issues: List<AddressIssueDto> = emptyList()
)

/**
 * 地址问题
 */
data class AddressIssueDto(
    val type: String, // incomplete, ambiguous, invalid
    val description: String,
    val severity: String // low, medium, high
)

/**
 * 优化路径响应
 */
data class OptimizedRouteResponse(
    val optimizedOrder: List<String>, // 优化后的停靠点ID顺序
    val totalDistance: Double,
    val totalDuration: Int,
    val routes: List<RouteSegmentDto>,
    val savings: RouteSavingsDto
)

/**
 * 路径段
 */
data class RouteSegmentDto(
    val fromStopId: String,
    val toStopId: String,
    val distance: Double,
    val duration: Int,
    val polyline: String
)

/**
 * 路径节省
 */
data class RouteSavingsDto(
    val distanceSaved: Double,
    val timeSaved: Int,
    val fuelSaved: Double? = null,
    val costSaved: Double? = null
)
