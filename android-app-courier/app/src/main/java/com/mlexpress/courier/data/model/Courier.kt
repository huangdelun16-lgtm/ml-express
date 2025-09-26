package com.mlexpress.courier.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.parcelize.Parcelize
import android.os.Parcelable

@Parcelize
@Entity(tableName = "couriers")
data class Courier(
    @PrimaryKey
    val id: String,
    val workId: String, // 工号
    val phoneNumber: String,
    val fullName: String,
    val email: String? = null,
    val profileImageUrl: String? = null,
    val identityCardNumber: String,
    val identityCardImageUrl: String? = null,
    val drivingLicenseNumber: String? = null,
    val drivingLicenseImageUrl: String? = null,
    
    // 车辆信息
    val vehicleType: VehicleType,
    val vehiclePlate: String,
    val vehicleImageUrl: String? = null,
    
    // 状态信息
    val status: CourierStatus = CourierStatus.OFFLINE,
    val isVerified: Boolean = false,
    val isActive: Boolean = true,
    val isOnline: Boolean = false,
    
    // 统计信息
    val totalOrders: Int = 0,
    val completedOrders: Int = 0,
    val cancelledOrders: Int = 0,
    val rating: Float = 5.0f,
    val totalEarnings: Double = 0.0,
    
    // 位置信息
    val currentLatitude: Double? = null,
    val currentLongitude: Double? = null,
    val lastLocationUpdate: Long? = null,
    
    // 偏好设置
    val maxOrderDistance: Double = 10.0, // km
    val preferredRegions: List<String> = emptyList(),
    val acceptsFragileItems: Boolean = true,
    val acceptsLargeItems: Boolean = true,
    
    // 时间信息
    val createdAt: Long = System.currentTimeMillis(),
    val verifiedAt: Long? = null,
    val lastActiveAt: Long = System.currentTimeMillis(),
    
    // FCM Token
    val fcmToken: String? = null,
    val language: String = "en"
) : Parcelable

@Parcelize
data class CourierDocument(
    val id: String,
    val courierId: String,
    val type: DocumentType,
    val fileName: String,
    val fileUrl: String,
    val status: DocumentStatus = DocumentStatus.PENDING,
    val uploadedAt: Long = System.currentTimeMillis(),
    val verifiedAt: Long? = null,
    val rejectedReason: String? = null
) : Parcelable

@Parcelize
data class CourierTraining(
    val id: String,
    val courierId: String,
    val moduleId: String,
    val moduleName: String,
    val isCompleted: Boolean = false,
    val score: Int? = null,
    val completedAt: Long? = null,
    val attempts: Int = 0,
    val maxAttempts: Int = 3
) : Parcelable

@Parcelize
data class EarningsRecord(
    val id: String,
    val courierId: String,
    val orderId: String,
    val amount: Double,
    val type: EarningsType,
    val description: String,
    val createdAt: Long = System.currentTimeMillis(),
    val settledAt: Long? = null,
    val isSettled: Boolean = false
) : Parcelable

enum class VehicleType {
    MOTORCYCLE,
    BICYCLE,
    CAR,
    VAN,
    TRUCK
}

enum class CourierStatus {
    OFFLINE,
    ONLINE,
    BUSY,
    UNAVAILABLE
}

enum class DocumentType {
    IDENTITY_CARD,
    DRIVING_LICENSE,
    VEHICLE_REGISTRATION,
    INSURANCE_CERTIFICATE,
    HEALTH_CERTIFICATE
}

enum class DocumentStatus {
    PENDING,
    APPROVED,
    REJECTED
}

enum class EarningsType {
    ORDER_DELIVERY,
    BONUS,
    PENALTY,
    ADJUSTMENT,
    WITHDRAWAL
}

// 扩展函数
fun VehicleType.getDisplayName(): String {
    return when (this) {
        VehicleType.MOTORCYCLE -> "摩托车"
        VehicleType.BICYCLE -> "自行车"
        VehicleType.CAR -> "汽车"
        VehicleType.VAN -> "面包车"
        VehicleType.TRUCK -> "卡车"
    }
}

fun CourierStatus.getDisplayName(): String {
    return when (this) {
        CourierStatus.OFFLINE -> "离线"
        CourierStatus.ONLINE -> "在线"
        CourierStatus.BUSY -> "忙碌"
        CourierStatus.UNAVAILABLE -> "不可用"
    }
}

fun DocumentType.getDisplayName(): String {
    return when (this) {
        DocumentType.IDENTITY_CARD -> "身份证"
        DocumentType.DRIVING_LICENSE -> "驾驶证"
        DocumentType.VEHICLE_REGISTRATION -> "行驶证"
        DocumentType.INSURANCE_CERTIFICATE -> "保险证明"
        DocumentType.HEALTH_CERTIFICATE -> "健康证明"
    }
}

fun DocumentStatus.getDisplayName(): String {
    return when (this) {
        DocumentStatus.PENDING -> "待审核"
        DocumentStatus.APPROVED -> "已通过"
        DocumentStatus.REJECTED -> "已拒绝"
    }
}
