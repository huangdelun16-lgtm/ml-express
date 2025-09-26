package com.mlexpress.customer.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.parcelize.Parcelize
import android.os.Parcelable

@Parcelize
@Entity(tableName = "orders")
data class Order(
    @PrimaryKey
    val id: String,
    val userId: String,
    val orderNumber: String,
    
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
    val packageType: PackageType,
    val weight: Double,
    val dimensions: String? = null,
    val description: String? = null,
    val declaredValue: Double? = null,
    
    // 服务信息
    val serviceType: ServiceType,
    val isUrgent: Boolean = false,
    
    // 费用信息
    val distance: Double,
    val baseCost: Double,
    val serviceFee: Double,
    val totalCost: Double,
    
    // 支付信息
    val paymentMethod: PaymentType,
    val paymentStatus: PaymentStatus = PaymentStatus.PENDING,
    
    // 订单状态
    val status: OrderStatus = OrderStatus.PENDING,
    val courierInfo: CourierInfo? = null,
    
    // 时间信息
    val createdAt: Long = System.currentTimeMillis(),
    val estimatedDeliveryTime: Long? = null,
    val actualDeliveryTime: Long? = null,
    
    // 跟踪信息
    val trackingUpdates: List<TrackingUpdate> = emptyList(),
    val rating: Int? = null,
    val feedback: String? = null
) : Parcelable

@Parcelize
data class CourierInfo(
    val id: String,
    val name: String,
    val phone: String,
    val vehicleType: String,
    val vehiclePlate: String,
    val rating: Float,
    val profileImageUrl: String? = null,
    val currentLatitude: Double? = null,
    val currentLongitude: Double? = null
) : Parcelable

@Parcelize
data class TrackingUpdate(
    val id: String,
    val orderId: String,
    val status: OrderStatus,
    val description: String,
    val timestamp: Long,
    val location: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
) : Parcelable

enum class PackageType {
    DOCUMENT,
    FOOD,
    ELECTRONICS,
    CLOTHING,
    FRAGILE,
    OTHER
}

enum class ServiceType {
    STANDARD,
    EXPRESS,
    SAME_DAY
}

enum class OrderStatus {
    PENDING,
    CONFIRMED,
    PICKED_UP,
    IN_TRANSIT,
    DELIVERING,
    DELIVERED,
    CANCELLED,
    RETURNED
}

enum class PaymentStatus {
    PENDING,
    PAID,
    FAILED,
    REFUNDED
}

// 扩展函数用于获取本地化状态文本
fun OrderStatus.getDisplayName(): String {
    return when (this) {
        OrderStatus.PENDING -> "待处理"
        OrderStatus.CONFIRMED -> "已确认"
        OrderStatus.PICKED_UP -> "已取件"
        OrderStatus.IN_TRANSIT -> "运输中"
        OrderStatus.DELIVERING -> "派送中"
        OrderStatus.DELIVERED -> "已送达"
        OrderStatus.CANCELLED -> "已取消"
        OrderStatus.RETURNED -> "已退回"
    }
}

fun PackageType.getDisplayName(): String {
    return when (this) {
        PackageType.DOCUMENT -> "文件"
        PackageType.FOOD -> "食品"
        PackageType.ELECTRONICS -> "电子产品"
        PackageType.CLOTHING -> "服装"
        PackageType.FRAGILE -> "易碎物品"
        PackageType.OTHER -> "其他"
    }
}

fun ServiceType.getDisplayName(): String {
    return when (this) {
        ServiceType.STANDARD -> "标准配送"
        ServiceType.EXPRESS -> "快速配送"
        ServiceType.SAME_DAY -> "当日达"
    }
}
