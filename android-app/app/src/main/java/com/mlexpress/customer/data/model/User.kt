package com.mlexpress.customer.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.parcelize.Parcelize
import android.os.Parcelable

@Parcelize
@Entity(tableName = "users")
data class User(
    @PrimaryKey
    val id: String,
    val phoneNumber: String,
    val fullName: String,
    val email: String? = null,
    val profileImageUrl: String? = null,
    val isPhoneVerified: Boolean = false,
    val isEmailVerified: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val fcmToken: String? = null,
    val language: String = "en", // en, my, zh
    val isActive: Boolean = true
) : Parcelable

@Parcelize
data class Address(
    val id: String,
    val userId: String,
    val label: String, // Home, Work, Other
    val fullAddress: String,
    val latitude: Double,
    val longitude: Double,
    val city: String,
    val region: String,
    val postalCode: String? = null,
    val isDefault: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
) : Parcelable

@Parcelize
data class PaymentMethod(
    val id: String,
    val userId: String,
    val type: PaymentType,
    val accountNumber: String? = null,
    val accountName: String? = null,
    val isDefault: Boolean = false,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
) : Parcelable

enum class PaymentType {
    CASH_ON_DELIVERY,
    KBZ_PAY,
    WAVE_MONEY,
    CB_PAY,
    AYA_PAY
}
