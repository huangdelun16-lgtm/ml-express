package com.mlexpress.customer.data.remote.api

import com.mlexpress.customer.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface PaymentApi {
    
    @POST("payments/cash")
    suspend fun processCashPayment(
        @Header("Authorization") token: String,
        @Body request: PaymentRequest
    ): Response<ApiResponse<PaymentResult>>
    
    @POST("payments/digital")
    suspend fun processDigitalPayment(
        @Header("Authorization") token: String,
        @Body request: PaymentRequest
    ): Response<ApiResponse<PaymentResult>>
    
    @GET("payments/verify/{transactionId}")
    suspend fun verifyPayment(
        @Header("Authorization") token: String,
        @Path("transactionId") transactionId: String
    ): Response<ApiResponse<PaymentVerificationResult>>
    
    @GET("payments/status/{transactionId}")
    suspend fun checkPaymentStatus(
        @Header("Authorization") token: String,
        @Path("transactionId") transactionId: String
    ): Response<ApiResponse<PaymentStatusResult>>
    
    @POST("payments/refund")
    suspend fun requestRefund(
        @Header("Authorization") token: String,
        @Body request: RefundRequest
    ): Response<ApiResponse<RefundResult>>
    
    @GET("payment-methods")
    suspend fun getPaymentMethods(
        @Header("Authorization") token: String
    ): Response<ApiResponse<List<PaymentMethodDto>>>
    
    @POST("payment-methods")
    suspend fun addPaymentMethod(
        @Header("Authorization") token: String,
        @Body request: AddPaymentMethodRequest
    ): Response<ApiResponse<PaymentMethodDto>>
    
    @DELETE("payment-methods/{methodId}")
    suspend fun deletePaymentMethod(
        @Header("Authorization") token: String,
        @Path("methodId") methodId: String
    ): Response<ApiResponse<Unit>>
    
    @PUT("payment-methods/{methodId}/default")
    suspend fun setDefaultPaymentMethod(
        @Header("Authorization") token: String,
        @Path("methodId") methodId: String
    ): Response<ApiResponse<Unit>>
}

// Request DTOs
data class PaymentRequest(
    val orderId: String,
    val amount: Double,
    val paymentMethod: String,
    val paymentDetails: Map<String, String> = emptyMap()
)

data class RefundRequest(
    val orderId: String,
    val transactionId: String,
    val reason: String,
    val amount: Double? = null // Partial refund amount
)

data class AddPaymentMethodRequest(
    val paymentType: String,
    val accountNumber: String?,
    val accountName: String?
)

// Response DTOs
data class PaymentResult(
    val transactionId: String,
    val orderId: String,
    val amount: Double,
    val status: String, // PENDING, PROCESSING, COMPLETED, FAILED
    val paymentMethod: String,
    val requiresRedirect: Boolean = false,
    val redirectUrl: String? = null,
    val qrCode: String? = null,
    val deepLink: String? = null,
    val expiresAt: String? = null,
    val message: String? = null
)

data class PaymentVerificationResult(
    val transactionId: String,
    val orderId: String,
    val status: String,
    val amount: Double,
    val paidAmount: Double? = null,
    val paymentMethod: String,
    val paidAt: String? = null,
    val failureReason: String? = null
)

data class PaymentStatusResult(
    val transactionId: String,
    val status: String,
    val lastUpdated: String,
    val statusHistory: List<PaymentStatusUpdate>
)

data class PaymentStatusUpdate(
    val status: String,
    val timestamp: String,
    val message: String? = null
)

data class RefundResult(
    val refundId: String,
    val transactionId: String,
    val orderId: String,
    val amount: Double,
    val status: String, // PENDING, PROCESSING, COMPLETED, FAILED
    val estimatedCompletionTime: String? = null,
    val message: String? = null
)

data class PaymentMethodDto(
    val id: String,
    val userId: String,
    val type: String,
    val accountNumber: String?,
    val accountName: String?,
    val isDefault: Boolean,
    val isActive: Boolean,
    val createdAt: String,
    val lastUsedAt: String?
)

// Payment status constants
object PaymentStatus {
    const val PENDING = "PENDING"
    const val PROCESSING = "PROCESSING"
    const val COMPLETED = "COMPLETED"
    const val FAILED = "FAILED"
    const val CANCELLED = "CANCELLED"
    const val REFUNDED = "REFUNDED"
    const val PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
}

// Payment method constants
object PaymentMethods {
    const val CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
    const val KBZ_PAY = "KBZ_PAY"
    const val WAVE_MONEY = "WAVE_MONEY"
    const val CB_PAY = "CB_PAY"
    const val AYA_PAY = "AYA_PAY"
}
