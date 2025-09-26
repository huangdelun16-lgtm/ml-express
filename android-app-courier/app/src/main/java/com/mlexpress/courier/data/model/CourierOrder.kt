package com.mlexpress.courier.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.parcelize.Parcelize
import android.os.Parcelable

@Parcelize
@Entity(tableName = "courier_orders")
data class CourierOrder(
    @PrimaryKey
    val id: String,
    val orderNumber: String,
    val customerId: String,
    val courierId: String? = null,
    
    // 寄件人信息
    val senderName: String,
    val senderPhone: String,
    val senderAddress: String,
    val senderLatitude: Double,
    val senderLongitude: Double,
    
    // 收件人信息
    val receiverName: String,
    val receiverPhone: String,
    val receiverAddress: String,
    val receiverLatitude: Double,
    val receiverLongitude: Double,
    
    // 包裹信息
    val packageType: String,
    val weight: Double,
    val dimensions: String? = null,
    val description: String? = null,
    val declaredValue: Double? = null,
    val isFragile: Boolean = false,
    
    // 服务信息
    val serviceType: String,
    val isUrgent: Boolean = false,
    val specialInstructions: String? = null,
    
    // 费用信息
    val distance: Double,
    val baseCost: Double,
    val serviceFee: Double,
    val totalCost: Double,
    val courierEarning: Double = 0.0,
    
    // 订单状态
    val status: OrderStatus = OrderStatus.PENDING,
    val priority: OrderPriority = OrderPriority.NORMAL,
    
    // 时间信息
    val createdAt: Long = System.currentTimeMillis(),
    val assignedAt: Long? = null,
    val pickedUpAt: Long? = null,
    val deliveredAt: Long? = null,
    val estimatedPickupTime: Long? = null,
    val estimatedDeliveryTime: Long? = null,
    
    // 确认信息
    val pickupConfirmation: ConfirmationData? = null,
    val deliveryConfirmation: ConfirmationData? = null,
    
    // 评价信息
    val customerRating: Int? = null,
    val customerFeedback: String? = null,
    val courierNotes: String? = null
) : Parcelable

@Parcelize
data class ConfirmationData(
    val timestamp: Long,
    val photoUrl: String? = null,
    val signature: String? = null,
    val qrCode: String? = null,
    val notes: String? = null,
    val location: LocationData? = null
) : Parcelable

@Parcelize
data class LocationData(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val timestamp: Long
) : Parcelable

@Parcelize
data class TaskUpdate(
    val id: String,
    val orderId: String,
    val courierId: String,
    val status: OrderStatus,
    val description: String,
    val timestamp: Long,
    val location: LocationData? = null,
    val photoUrl: String? = null,
    val notes: String? = null
) : Parcelable

enum class OrderStatus {
    PENDING,
    ASSIGNED,
    ACCEPTED,
    PICKED_UP,
    IN_TRANSIT,
    ARRIVED,
    DELIVERED,
    CANCELLED,
    RETURNED,
    FAILED
}

enum class OrderPriority {
    LOW,
    NORMAL,
    HIGH,
    URGENT
}

enum class TaskType {
    PICKUP,
    DELIVERY
}

// 扩展函数
fun OrderStatus.getDisplayName(): String {
    return when (this) {
        OrderStatus.PENDING -> "待分配"
        OrderStatus.ASSIGNED -> "已分配"
        OrderStatus.ACCEPTED -> "已接单"
        OrderStatus.PICKED_UP -> "已取件"
        OrderStatus.IN_TRANSIT -> "运输中"
        OrderStatus.ARRIVED -> "已到达"
        OrderStatus.DELIVERED -> "已送达"
        OrderStatus.CANCELLED -> "已取消"
        OrderStatus.RETURNED -> "已退回"
        OrderStatus.FAILED -> "配送失败"
    }
}

fun OrderPriority.getDisplayName(): String {
    return when (this) {
        OrderPriority.LOW -> "低优先级"
        OrderPriority.NORMAL -> "普通"
        OrderPriority.HIGH -> "高优先级"
        OrderPriority.URGENT -> "紧急"
    }
}

fun OrderStatus.getColor(): androidx.compose.ui.graphics.Color {
    return when (this) {
        OrderStatus.PENDING -> androidx.compose.ui.graphics.Color(0xFFFF9800)
        OrderStatus.ASSIGNED -> androidx.compose.ui.graphics.Color(0xFF2196F3)
        OrderStatus.ACCEPTED -> androidx.compose.ui.graphics.Color(0xFF4CAF50)
        OrderStatus.PICKED_UP -> androidx.compose.ui.graphics.Color(0xFF9C27B0)
        OrderStatus.IN_TRANSIT -> androidx.compose.ui.graphics.Color(0xFF00BCD4)
        OrderStatus.ARRIVED -> androidx.compose.ui.graphics.Color(0xFF8BC34A)
        OrderStatus.DELIVERED -> androidx.compose.ui.graphics.Color(0xFF388E3C)
        OrderStatus.CANCELLED -> androidx.compose.ui.graphics.Color(0xFFF44336)
        OrderStatus.RETURNED -> androidx.compose.ui.graphics.Color(0xFFFF5722)
        OrderStatus.FAILED -> androidx.compose.ui.graphics.Color(0xFF795548)
    }
}

fun OrderPriority.getColor(): androidx.compose.ui.graphics.Color {
    return when (this) {
        OrderPriority.LOW -> androidx.compose.ui.graphics.Color(0xFF9E9E9E)
        OrderPriority.NORMAL -> androidx.compose.ui.graphics.Color(0xFF2196F3)
        OrderPriority.HIGH -> androidx.compose.ui.graphics.Color(0xFFFF9800)
        OrderPriority.URGENT -> androidx.compose.ui.graphics.Color(0xFFF44336)
    }
}
