package com.mlexpress.customer.data.service

import android.content.Context
import com.mlexpress.customer.data.local.preferences.UserPreferences
import com.mlexpress.customer.data.model.PaymentType
import com.mlexpress.customer.data.remote.api.PaymentApi
import com.mlexpress.customer.data.remote.dto.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val paymentApi: PaymentApi,
    private val userPreferences: UserPreferences
) {
    
    suspend fun processPayment(
        orderId: String,
        amount: Double,
        paymentType: PaymentType,
        paymentDetails: Map<String, String> = emptyMap()
    ): NetworkResult<PaymentResult> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            when (paymentType) {
                PaymentType.CASH_ON_DELIVERY -> processCashOnDelivery(orderId, amount, accessToken)
                PaymentType.KBZ_PAY -> processKBZPay(orderId, amount, paymentDetails, accessToken)
                PaymentType.WAVE_MONEY -> processWaveMoney(orderId, amount, paymentDetails, accessToken)
                PaymentType.CB_PAY -> processCBPay(orderId, amount, paymentDetails, accessToken)
                PaymentType.AYA_PAY -> processAYAPay(orderId, amount, paymentDetails, accessToken)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Payment processing failed", ApiErrorCodes.UNKNOWN_ERROR)
        }
    }
    
    private suspend fun processCashOnDelivery(
        orderId: String,
        amount: Double,
        accessToken: String
    ): NetworkResult<PaymentResult> {
        return try {
            val request = PaymentRequest(
                orderId = orderId,
                amount = amount,
                paymentMethod = PaymentType.CASH_ON_DELIVERY.name,
                paymentDetails = mapOf(
                    "payment_type" to "cash_on_delivery",
                    "currency" to "MMK"
                )
            )
            
            val response = paymentApi.processCashPayment("Bearer $accessToken", request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { result ->
                    NetworkResult.Success(result)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Cash payment processing failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    private suspend fun processKBZPay(
        orderId: String,
        amount: Double,
        paymentDetails: Map<String, String>,
        accessToken: String
    ): NetworkResult<PaymentResult> {
        return try {
            val request = PaymentRequest(
                orderId = orderId,
                amount = amount,
                paymentMethod = PaymentType.KBZ_PAY.name,
                paymentDetails = paymentDetails + mapOf(
                    "payment_type" to "kbz_pay",
                    "currency" to "MMK"
                )
            )
            
            val response = paymentApi.processDigitalPayment("Bearer $accessToken", request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { result ->
                    // Handle KBZ Pay specific logic
                    if (result.requiresRedirect) {
                        // Open KBZ Pay app or web interface
                        launchKBZPayApp(result.redirectUrl, result.transactionId)
                    }
                    NetworkResult.Success(result)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "KBZ Pay processing failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    private suspend fun processWaveMoney(
        orderId: String,
        amount: Double,
        paymentDetails: Map<String, String>,
        accessToken: String
    ): NetworkResult<PaymentResult> {
        return try {
            val request = PaymentRequest(
                orderId = orderId,
                amount = amount,
                paymentMethod = PaymentType.WAVE_MONEY.name,
                paymentDetails = paymentDetails + mapOf(
                    "payment_type" to "wave_money",
                    "currency" to "MMK"
                )
            )
            
            val response = paymentApi.processDigitalPayment("Bearer $accessToken", request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { result ->
                    if (result.requiresRedirect) {
                        launchWaveMoneyApp(result.redirectUrl, result.transactionId)
                    }
                    NetworkResult.Success(result)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Wave Money processing failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    private suspend fun processCBPay(
        orderId: String,
        amount: Double,
        paymentDetails: Map<String, String>,
        accessToken: String
    ): NetworkResult<PaymentResult> {
        return try {
            val request = PaymentRequest(
                orderId = orderId,
                amount = amount,
                paymentMethod = PaymentType.CB_PAY.name,
                paymentDetails = paymentDetails + mapOf(
                    "payment_type" to "cb_pay",
                    "currency" to "MMK"
                )
            )
            
            val response = paymentApi.processDigitalPayment("Bearer $accessToken", request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { result ->
                    if (result.requiresRedirect) {
                        launchCBPayApp(result.redirectUrl, result.transactionId)
                    }
                    NetworkResult.Success(result)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "CB Pay processing failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    private suspend fun processAYAPay(
        orderId: String,
        amount: Double,
        paymentDetails: Map<String, String>,
        accessToken: String
    ): NetworkResult<PaymentResult> {
        return try {
            val request = PaymentRequest(
                orderId = orderId,
                amount = amount,
                paymentMethod = PaymentType.AYA_PAY.name,
                paymentDetails = paymentDetails + mapOf(
                    "payment_type" to "aya_pay",
                    "currency" to "MMK"
                )
            )
            
            val response = paymentApi.processDigitalPayment("Bearer $accessToken", request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { result ->
                    if (result.requiresRedirect) {
                        launchAYAPayApp(result.redirectUrl, result.transactionId)
                    }
                    NetworkResult.Success(result)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "AYA Pay processing failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun verifyPayment(transactionId: String): NetworkResult<PaymentVerificationResult> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = paymentApi.verifyPayment("Bearer $accessToken", transactionId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { result ->
                    NetworkResult.Success(result)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Payment verification failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun requestRefund(
        orderId: String,
        transactionId: String,
        reason: String
    ): NetworkResult<RefundResult> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = RefundRequest(
                orderId = orderId,
                transactionId = transactionId,
                reason = reason
            )
            
            val response = paymentApi.requestRefund("Bearer $accessToken", request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { result ->
                    NetworkResult.Success(result)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Refund request failed"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    // Launch external payment apps
    private fun launchKBZPayApp(redirectUrl: String?, transactionId: String?) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = android.net.Uri.parse(redirectUrl ?: "kbzpay://payment?txn=$transactionId")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
            } else {
                // Fallback to web browser
                launchWebPayment(redirectUrl ?: "https://kbzpay.com/payment?txn=$transactionId")
            }
        } catch (e: Exception) {
            android.util.Log.e("PaymentService", "Failed to launch KBZ Pay", e)
        }
    }
    
    private fun launchWaveMoneyApp(redirectUrl: String?, transactionId: String?) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = android.net.Uri.parse(redirectUrl ?: "wavemoney://payment?txn=$transactionId")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
            } else {
                launchWebPayment(redirectUrl ?: "https://wavemoney.com.mm/payment?txn=$transactionId")
            }
        } catch (e: Exception) {
            android.util.Log.e("PaymentService", "Failed to launch Wave Money", e)
        }
    }
    
    private fun launchCBPayApp(redirectUrl: String?, transactionId: String?) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = android.net.Uri.parse(redirectUrl ?: "cbpay://payment?txn=$transactionId")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
            } else {
                launchWebPayment(redirectUrl ?: "https://cbbank.com.mm/pay?txn=$transactionId")
            }
        } catch (e: Exception) {
            android.util.Log.e("PaymentService", "Failed to launch CB Pay", e)
        }
    }
    
    private fun launchAYAPayApp(redirectUrl: String?, transactionId: String?) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = android.net.Uri.parse(redirectUrl ?: "ayapay://payment?txn=$transactionId")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
            } else {
                launchWebPayment(redirectUrl ?: "https://ayabank.com/pay?txn=$transactionId")
            }
        } catch (e: Exception) {
            android.util.Log.e("PaymentService", "Failed to launch AYA Pay", e)
        }
    }
    
    private fun launchWebPayment(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = android.net.Uri.parse(url)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.e("PaymentService", "Failed to launch web payment", e)
        }
    }
    
    suspend fun getPaymentMethods(userId: String): NetworkResult<List<com.mlexpress.customer.data.model.PaymentMethod>> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = paymentApi.getPaymentMethods("Bearer $accessToken")
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { methods ->
                    val paymentMethods = methods.map { it.toPaymentMethod() }
                    NetworkResult.Success(paymentMethods)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to load payment methods"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun addPaymentMethod(
        userId: String,
        paymentType: PaymentType,
        accountNumber: String?,
        accountName: String?
    ): NetworkResult<com.mlexpress.customer.data.model.PaymentMethod> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val request = AddPaymentMethodRequest(
                paymentType = paymentType.name,
                accountNumber = accountNumber,
                accountName = accountName
            )
            
            val response = paymentApi.addPaymentMethod("Bearer $accessToken", request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { methodDto ->
                    val paymentMethod = methodDto.toPaymentMethod()
                    NetworkResult.Success(paymentMethod)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to add payment method"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
    
    suspend fun checkPaymentStatus(transactionId: String): NetworkResult<PaymentStatusResult> {
        return try {
            val accessToken = userPreferences.getAccessToken().first()
            if (accessToken.isNullOrEmpty()) {
                return NetworkResult.Error("Authentication required", ApiErrorCodes.UNAUTHORIZED)
            }
            
            val response = paymentApi.checkPaymentStatus("Bearer $accessToken", transactionId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { result ->
                    NetworkResult.Success(result)
                } ?: NetworkResult.Error("Empty response data")
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to check payment status"
                NetworkResult.Error(errorMessage, response.body()?.error?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error", ApiErrorCodes.NETWORK_ERROR)
        }
    }
}

// Extension function to convert DTO to Model
private fun PaymentMethodDto.toPaymentMethod(): com.mlexpress.customer.data.model.PaymentMethod {
    return com.mlexpress.customer.data.model.PaymentMethod(
        id = id,
        userId = userId,
        type = PaymentType.valueOf(type),
        accountNumber = accountNumber,
        accountName = accountName,
        isDefault = isDefault,
        isActive = isActive,
        createdAt = System.currentTimeMillis()
    )
}
