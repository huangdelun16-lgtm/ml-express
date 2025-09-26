package com.mlexpress.courier.data.repository

import com.mlexpress.courier.data.local.dao.CourierOrderDao
import com.mlexpress.courier.data.local.preferences.CourierPreferences
import com.mlexpress.courier.data.model.*
import com.mlexpress.courier.data.remote.api.CourierOrderApi
import com.mlexpress.courier.data.remote.dto.*
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CourierOrderRepository @Inject constructor(
    private val orderApi: CourierOrderApi,
    private val orderDao: CourierOrderDao,
    private val courierPreferences: CourierPreferences
) {
    
    suspend fun getAvailableOrders(courierId: String): NetworkResult<List<CourierOrder>> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = orderApi.getAvailableOrders("Bearer $accessToken")
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orders ->
                    val courierOrders = orders.map { it.toCourierOrder() }
                    // Cache orders locally
                    courierOrders.forEach { orderDao.insertOrder(it) }
                    NetworkResult.Success(courierOrders)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to load orders"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun acceptOrder(orderId: String): NetworkResult<CourierOrder> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = orderApi.acceptOrder("Bearer $accessToken", orderId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orderDto ->
                    val courierOrder = orderDto.toCourierOrder()
                    orderDao.updateOrder(courierOrder)
                    NetworkResult.Success(courierOrder)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to accept order"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun getActiveTasks(courierId: String): NetworkResult<List<CourierOrder>> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = orderApi.getActiveTasks("Bearer $accessToken")
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orders ->
                    val courierOrders = orders.map { it.toCourierOrder() }
                    NetworkResult.Success(courierOrders)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                // Try to get from local cache
                val cachedOrders = orderDao.getActiveOrders(courierId)
                NetworkResult.Success(cachedOrders)
            }
        } catch (e: Exception) {
            // Try to get from local cache
            try {
                val cachedOrders = orderDao.getActiveOrders(courierId)
                NetworkResult.Success(cachedOrders)
            } catch (cacheError: Exception) {
                NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
            }
        }
    }
    
    suspend fun getOrderById(orderId: String): NetworkResult<CourierOrder> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = orderApi.getOrderById("Bearer $accessToken", orderId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orderDto ->
                    val courierOrder = orderDto.toCourierOrder()
                    orderDao.updateOrder(courierOrder)
                    NetworkResult.Success(courierOrder)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                // Try to get from local cache
                val cachedOrder = orderDao.getOrderById(orderId)
                if (cachedOrder != null) {
                    NetworkResult.Success(cachedOrder)
                } else {
                    val errorMessage = response.body()?.error?.message ?: "Order not found"
                    NetworkResult.Error(errorMessage, response.body()?.error?.code)
                }
            }
        } catch (e: Exception) {
            // Try to get from local cache
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
    
    suspend fun updateOrderStatus(orderId: String, status: OrderStatus): NetworkResult<CourierOrder> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = UpdateOrderStatusRequest(status.name)
            val response = orderApi.updateOrderStatus("Bearer $accessToken", orderId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orderDto ->
                    val courierOrder = orderDto.toCourierOrder()
                    orderDao.updateOrder(courierOrder)
                    NetworkResult.Success(courierOrder)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to update status"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun confirmPickup(orderId: String, confirmationData: ConfirmationData): NetworkResult<CourierOrder> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = ConfirmPickupRequest(
                photoUrl = confirmationData.photoUrl,
                notes = confirmationData.notes,
                latitude = confirmationData.location?.latitude,
                longitude = confirmationData.location?.longitude
            )
            
            val response = orderApi.confirmPickup("Bearer $accessToken", orderId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orderDto ->
                    val courierOrder = orderDto.toCourierOrder()
                    orderDao.updateOrder(courierOrder)
                    NetworkResult.Success(courierOrder)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to confirm pickup"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun confirmDelivery(orderId: String, confirmationData: ConfirmationData): NetworkResult<CourierOrder> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = ConfirmDeliveryRequest(
                photoUrl = confirmationData.photoUrl,
                signature = confirmationData.signature,
                notes = confirmationData.notes,
                latitude = confirmationData.location?.latitude,
                longitude = confirmationData.location?.longitude
            )
            
            val response = orderApi.confirmDelivery("Bearer $accessToken", orderId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { orderDto ->
                    val courierOrder = orderDto.toCourierOrder()
                    orderDao.updateOrder(courierOrder)
                    NetworkResult.Success(courierOrder)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to confirm delivery"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun reportIssue(orderId: String, issueDescription: String): NetworkResult<Unit> {
        return try {
            val accessToken = courierPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("No access token available", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = ReportIssueRequest(issueDescription)
            val response = orderApi.reportIssue("Bearer $accessToken", orderId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                NetworkResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to report issue"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun getTodayCompletedCount(courierId: String): Int {
        return try {
            orderDao.getTodayCompletedCount(courierId)
        } catch (e: Exception) {
            0
        }
    }
}

// Extension function to convert DTO to Model
private fun CourierOrderDto.toCourierOrder(): CourierOrder {
    return CourierOrder(
        id = id,
        orderNumber = orderNumber,
        customerId = customerId,
        courierId = courierId,
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
        packageType = packageType,
        weight = weight,
        dimensions = dimensions,
        description = description,
        declaredValue = declaredValue,
        serviceType = serviceType,
        isUrgent = isUrgent,
        distance = distance,
        baseCost = baseCost,
        serviceFee = serviceFee,
        totalCost = totalCost,
        courierEarning = courierEarning,
        status = OrderStatus.valueOf(status),
        priority = OrderPriority.valueOf(priority),
        createdAt = System.currentTimeMillis(), // Convert from ISO string
        assignedAt = if (assignedAt != null) System.currentTimeMillis() else null,
        estimatedPickupTime = if (estimatedPickupTime != null) System.currentTimeMillis() else null,
        estimatedDeliveryTime = if (estimatedDeliveryTime != null) System.currentTimeMillis() else null
    )
}
