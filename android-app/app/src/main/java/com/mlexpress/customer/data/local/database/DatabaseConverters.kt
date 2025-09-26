package com.mlexpress.customer.data.local.database

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.mlexpress.customer.data.model.*

class DatabaseConverters {
    
    private val gson = Gson()
    
    // CourierInfo 转换器
    @TypeConverter
    fun fromCourierInfo(courierInfo: CourierInfo?): String? {
        return courierInfo?.let { gson.toJson(it) }
    }
    
    @TypeConverter
    fun toCourierInfo(courierInfoString: String?): CourierInfo? {
        return courierInfoString?.let { 
            gson.fromJson(it, CourierInfo::class.java) 
        }
    }
    
    // TrackingUpdate List 转换器
    @TypeConverter
    fun fromTrackingUpdateList(trackingUpdates: List<TrackingUpdate>?): String? {
        return trackingUpdates?.let { gson.toJson(it) }
    }
    
    @TypeConverter
    fun toTrackingUpdateList(trackingUpdatesString: String?): List<TrackingUpdate>? {
        return trackingUpdatesString?.let {
            val type = object : TypeToken<List<TrackingUpdate>>() {}.type
            gson.fromJson<List<TrackingUpdate>>(it, type)
        }
    }
    
    // PackageType 转换器
    @TypeConverter
    fun fromPackageType(packageType: PackageType): String {
        return packageType.name
    }
    
    @TypeConverter
    fun toPackageType(packageTypeString: String): PackageType {
        return PackageType.valueOf(packageTypeString)
    }
    
    // ServiceType 转换器
    @TypeConverter
    fun fromServiceType(serviceType: ServiceType): String {
        return serviceType.name
    }
    
    @TypeConverter
    fun toServiceType(serviceTypeString: String): ServiceType {
        return ServiceType.valueOf(serviceTypeString)
    }
    
    // OrderStatus 转换器
    @TypeConverter
    fun fromOrderStatus(orderStatus: OrderStatus): String {
        return orderStatus.name
    }
    
    @TypeConverter
    fun toOrderStatus(orderStatusString: String): OrderStatus {
        return OrderStatus.valueOf(orderStatusString)
    }
    
    // PaymentType 转换器
    @TypeConverter
    fun fromPaymentType(paymentType: PaymentType): String {
        return paymentType.name
    }
    
    @TypeConverter
    fun toPaymentType(paymentTypeString: String): PaymentType {
        return PaymentType.valueOf(paymentTypeString)
    }
    
    // PaymentStatus 转换器
    @TypeConverter
    fun fromPaymentStatus(paymentStatus: PaymentStatus): String {
        return paymentStatus.name
    }
    
    @TypeConverter
    fun toPaymentStatus(paymentStatusString: String): PaymentStatus {
        return PaymentStatus.valueOf(paymentStatusString)
    }
}
