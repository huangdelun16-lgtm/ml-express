package com.mlexpress.customer.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.data.model.PaymentMethod
import com.mlexpress.customer.data.model.PaymentType
import com.mlexpress.customer.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class PaymentMethodsViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(PaymentMethodsUiState())
    val uiState: StateFlow<PaymentMethodsUiState> = _uiState.asStateFlow()
    
    fun loadPaymentMethods() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            try {
                val currentUser = authRepository.getCurrentUser().first()
                val userId = currentUser?.id ?: ""
                
                // Mock payment methods for now
                val mockPaymentMethods = listOf(
                    PaymentMethod(
                        id = UUID.randomUUID().toString(),
                        userId = userId,
                        type = PaymentType.CASH_ON_DELIVERY,
                        isDefault = true,
                        isActive = true,
                        createdAt = System.currentTimeMillis()
                    )
                )
                
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    paymentMethods = mockPaymentMethods
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "加载支付方式失败"
                )
            }
        }
    }
    
    fun addPaymentMethod(type: PaymentType, accountNumber: String?, accountName: String?) {
        viewModelScope.launch {
            try {
                val currentUser = authRepository.getCurrentUser().first()
                val userId = currentUser?.id ?: ""
                
                val newPaymentMethod = PaymentMethod(
                    id = UUID.randomUUID().toString(),
                    userId = userId,
                    type = type,
                    accountNumber = accountNumber,
                    accountName = accountName,
                    isDefault = _uiState.value.paymentMethods.isEmpty(),
                    isActive = true,
                    createdAt = System.currentTimeMillis()
                )
                
                val updatedMethods = _uiState.value.paymentMethods + newPaymentMethod
                _uiState.value = _uiState.value.copy(paymentMethods = updatedMethods)
                
                // TODO: Save to server
                
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = e.message ?: "添加支付方式失败"
                )
            }
        }
    }
    
    fun setDefaultPaymentMethod(paymentMethodId: String) {
        viewModelScope.launch {
            try {
                val updatedMethods = _uiState.value.paymentMethods.map { method ->
                    method.copy(isDefault = method.id == paymentMethodId)
                }
                
                _uiState.value = _uiState.value.copy(paymentMethods = updatedMethods)
                
                // TODO: Update on server
                
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = e.message ?: "设置默认支付方式失败"
                )
            }
        }
    }
    
    fun deletePaymentMethod(paymentMethodId: String) {
        viewModelScope.launch {
            try {
                val methodToDelete = _uiState.value.paymentMethods.find { it.id == paymentMethodId }
                
                // Don't allow deleting the default payment method if it's the only one
                if (methodToDelete?.isDefault == true && _uiState.value.paymentMethods.size == 1) {
                    _uiState.value = _uiState.value.copy(
                        errorMessage = "无法删除唯一的支付方式"
                    )
                    return@launch
                }
                
                val updatedMethods = _uiState.value.paymentMethods.filter { it.id != paymentMethodId }
                
                // If we deleted the default method, make the first remaining method default
                val finalMethods = if (methodToDelete?.isDefault == true && updatedMethods.isNotEmpty()) {
                    updatedMethods.mapIndexed { index, method ->
                        if (index == 0) method.copy(isDefault = true) else method
                    }
                } else {
                    updatedMethods
                }
                
                _uiState.value = _uiState.value.copy(paymentMethods = finalMethods)
                
                // TODO: Delete from server
                
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = e.message ?: "删除支付方式失败"
                )
            }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}

data class PaymentMethodsUiState(
    val isLoading: Boolean = false,
    val paymentMethods: List<PaymentMethod> = emptyList(),
    val errorMessage: String? = null
)
