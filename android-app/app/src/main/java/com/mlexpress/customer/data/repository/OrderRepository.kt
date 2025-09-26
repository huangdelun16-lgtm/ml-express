package com.mlexpress.customer.data.repository

import com.mlexpress.customer.data.local.dao.OrderDao
import com.mlexpress.customer.data.local.preferences.UserPreferences
import com.mlexpress.customer.data.model.*
import com.mlexpress.customer.data.remote.api.OrderApi
import com.mlexpress.customer.data.remote.dto.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton
import java.util.*

@Singleton
class OrderRepository @Inject constructor(
    private val orderApi: OrderApi,
    private val orderDao: OrderDao,
    private val userPreferences: UserPreferences
) {
    
    suspend fun calculateOrderCost(
        senderLatitude: Double,
        senderLongitude: Double,
        receiverLatitude: Double,
        receiverLongitude: Double,
        packageType: PackageType,
        weight: Double,
        serviceType: ServiceType,
        isUrgent: Boolean = false
    ): NetworkResult<CalculateCostResponse> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = CalculateCostRequest(
                senderLatitude = senderLatitude,
                senderLongitude = senderLongitude,
                receiverLatitude = receiverLatitude,
                receiverLongitude = receiverLongitude,
                packageType = packageType.name,
                weight = weight,
                serviceType = serviceType.name,
                isUrgent = isUrgent
            )
            
            val response = orderApi.calculateOrderCost("Bearer $accessToken", request)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { data ->
                    NetworkResult.Success(data)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to calculate cost"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun createOrder(
        senderName: String,
        senderPhone: String,
        senderAddress: String,
        senderLatitude: Double,
        senderLongitude: Double,
        receiverName: String,
        receiverPhone: String,
        receiverAddress: String,
        receiverLatitude: Double,
        receiverLongitude: Double,
        packageType: PackageType,
        weight: Double,
        dimensions: String?,
        description: String?,
        declaredValue: Double?,
        serviceType: ServiceType,
        isUrgent: Boolean,
        paymentMethod: PaymentType,
        notes: String?
    ): NetworkResult<Order> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            val userId = userPreferences.getUserId().first()
            
            if (accessToken.isNullOrEmpty() || userId.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = CreateOrderRequest(
                senderName = senderName,
                senderPhone = senderPhone,
                senderAddress = senderAddress,
                senderLatitude = senderLatitude,
                senderLongitude = senderLongitude,
                receiverName = receiverName,
                receiverPhone = receiverPhone,
                receiverAddress = receiverAddress,
                receiverLatitude = receiverLatitude,
                receiverLongitude = receiverLongitude,
                packageType = packageType.name,
                weight = weight,
                dimensions = dimensions,
                description = description,
                declaredValue = declaredValue,
                serviceType = serviceType.name,
                isUrgent = isUrgent,
                paymentMethod = paymentMethod.name,
                notes = notes
            )
            
            val response = orderApi.createOrder("Bearer $accessToken", request)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orderDto ->
                    val order = orderDto.toOrder(userId)
                    // Save to local database
                    orderDao.insertOrder(order)
                    NetworkResult.Success(order)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to create order"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun getOrders(
        userId: String,
        page: Int = 1,
        limit: Int = 20,
        status: OrderStatus? = null
    ): NetworkResult<List<Order>> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = orderApi.getOrders(
                "Bearer $accessToken",
                page,
                limit,
                status?.name
            )
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { paginatedResponse ->
                    val orders = paginatedResponse.items.map { it.toOrder(userId) }
                    // Update local database
                    orders.forEach { orderDao.insertOrder(it) }
                    NetworkResult.Success(orders)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                // Return cached data if network fails
                val cachedOrders = if (status != null) {
                    orderDao.getOrdersByUserAndStatus(userId, listOf(status)).first()
                } else {
                    orderDao.getOrdersByUser(userId).first()
                }
                NetworkResult.Success(cachedOrders)
            }
        } catch (e: Exception) {
            // Return cached data if network fails
            try {
                val cachedOrders = if (status != null) {
                    orderDao.getOrdersByUserAndStatus(userId, listOf(status)).first()
                } else {
                    orderDao.getOrdersByUser(userId).first()
                }
                NetworkResult.Success(cachedOrders)
            } catch (cacheError: Exception) {
                NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
            }
        }
    }
    
    suspend fun getOrderById(orderId: String): NetworkResult<Order> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = orderApi.getOrderById("Bearer $accessToken", orderId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orderDto ->
                    val userId = userPreferences.getUserId().first() ?: ""
                    val order = orderDto.toOrder(userId)
                    // Update local database
                    orderDao.insertOrder(order)
                    NetworkResult.Success(order)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                // Try to get from local database
                val cachedOrder = orderDao.getOrderById(orderId)
                if (cachedOrder != null) {
                    NetworkResult.Success(cachedOrder)
                } else {
                    val errorMessage = response.body()?.error?.message ?: "Order not found"
                    NetworkResult.Error(errorMessage, response.body()?.error?.code)
                }
            }
        } catch (e: Exception) {
            // Try to get from local database
            try {
                val cachedOrder = orderDao.getOrderById(orderId)
                if (cachedOrder != null) {
                    NetworkResult.Success(cachedOrder)
                } else {
                    NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
                }
            } catch (cacheError: Exception) {
                NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
            }
        }
    }
    
    suspend fun trackOrder(orderNumber: String): NetworkResult<OrderTrackingResponse> {
        return try {
            val response = orderApi.trackOrder(orderNumber)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { trackingResponse ->
                    NetworkResult.Success(trackingResponse)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Order not found"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun cancelOrder(orderId: String, reason: String): NetworkResult<Order> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = CancelOrderRequest(reason)
            val response = orderApi.cancelOrder("Bearer $accessToken", orderId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orderDto ->
                    val userId = userPreferences.getUserId().first() ?: ""
                    val order = orderDto.toOrder(userId)
                    // Update local database
                    orderDao.updateOrder(order)
                    NetworkResult.Success(order)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to cancel order"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun rateOrder(orderId: String, rating: Int, feedback: String?): NetworkResult<Unit> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = RateOrderRequest(rating, feedback)
            val response = orderApi.rateOrder("Bearer $accessToken", orderId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                // Update local database
                orderDao.updateOrderRating(orderId, rating, feedback)
                NetworkResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to rate order"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    // Local database methods
    fun getOrdersByUserFlow(userId: String): Flow<List<Order>> {
        return orderDao.getOrdersByUser(userId)
    }
    
    fun getOrdersByUserAndStatusFlow(userId: String, statuses: List<OrderStatus>): Flow<List<Order>> {
        return orderDao.getOrdersByUserAndStatus(userId, statuses)
    }
    
    fun getOrderByIdFlow(orderId: String): Flow<Order?> {
        return orderDao.getOrderByIdFlow(orderId)
    }
    
    suspend fun getRecentOrders(userId: String, limit: Int): List<Order> {
        return orderDao.getRecentOrders(userId, limit)
    }
    
    suspend fun getOrderCountByUser(userId: String): Int {
        return orderDao.getOrderCountByUser(userId)
    }
    
    suspend fun getOrderCountByUserAndStatus(userId: String, status: OrderStatus): Int {
        return orderDao.getOrderCountByUserAndStatus(userId, status)
    }
}

// Extension function to convert DTO to Model
private fun OrderDto.toOrder(userId: String): Order {
    return Order(
        id = id,
        userId = userId,
        orderNumber = orderNumber,
        senderName = senderName,
        senderPhone = senderPhone,
        senderAddress = senderAddress,
        senderLatitude = senderLatitude,
        senderLongitude = senderLongitude,
        receiverName = receiverName,
        receiverPhone = receiverPhone,
        receiverAddress = receiverAddress,
        receiverLatitude = receiverLatitude,
        receiverLongitude = receiverLongitude,
        packageType = PackageType.valueOf(packageType),
        weight = weight,
        dimensions = dimensions,
        description = description,
        declaredValue = declaredValue,
        serviceType = ServiceType.valueOf(serviceType),
        isUrgent = isUrgent,
        distance = distance,
        baseCost = baseCost,
        serviceFee = serviceFee,
        totalCost = totalCost,
        paymentMethod = PaymentType.valueOf(paymentMethod),
        paymentStatus = PaymentStatus.valueOf(paymentStatus),
        status = OrderStatus.valueOf(status),
        courierInfo = courierInfo?.toCourierInfo(),
        createdAt = System.currentTimeMillis(), // Convert from ISO string if needed
        estimatedDeliveryTime = null, // Convert from ISO string if needed
        actualDeliveryTime = null, // Convert from ISO string if needed
        trackingUpdates = trackingUpdates.map { it.toTrackingUpdate() },
        rating = rating,
        feedback = feedback
    )
}

private fun CourierInfoDto.toCourierInfo(): CourierInfo {
    return CourierInfo(
        id = id,
        name = name,
        phone = phone,
        vehicleType = vehicleType,
        vehiclePlate = vehiclePlate,
        rating = rating,
        profileImageUrl = profileImageUrl,
        currentLatitude = currentLatitude,
        currentLongitude = currentLongitude
    )
}

private fun TrackingUpdateDto.toTrackingUpdate(): TrackingUpdate {
    return TrackingUpdate(
        id = id,
        orderId = orderId,
        status = OrderStatus.valueOf(status),
        description = description,
        timestamp = System.currentTimeMillis(), // Convert from ISO string
        location = location,
        latitude = latitude,
        longitude = longitude
    )
}
