package com.mlexpress.customer.presentation.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.data.model.*
import com.mlexpress.customer.data.remote.dto.CalculateCostResponse
import com.mlexpress.customer.data.remote.dto.NetworkResult
import com.mlexpress.customer.data.repository.AuthRepository
import com.mlexpress.customer.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CreateOrderViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(CreateOrderUiState())
    val uiState: StateFlow<CreateOrderUiState> = _uiState.asStateFlow()
    
    fun updateSenderName(name: String) {
        _uiState.value = _uiState.value.copy(senderName = name)
        updateCanCalculateCost()
    }
    
    fun updateSenderPhone(phone: String) {
        _uiState.value = _uiState.value.copy(senderPhone = phone)
        updateCanCalculateCost()
    }
    
    fun updateSenderAddress(address: String, latitude: Double, longitude: Double) {
        _uiState.value = _uiState.value.copy(
            senderAddress = address,
            senderLatitude = latitude,
            senderLongitude = longitude,
            costCalculation = null // Reset cost calculation
        )
        updateCanCalculateCost()
    }
    
    fun updateReceiverName(name: String) {
        _uiState.value = _uiState.value.copy(receiverName = name)
        updateCanCalculateCost()
    }
    
    fun updateReceiverPhone(phone: String) {
        _uiState.value = _uiState.value.copy(receiverPhone = phone)
        updateCanCalculateCost()
    }
    
    fun updateReceiverAddress(address: String, latitude: Double, longitude: Double) {
        _uiState.value = _uiState.value.copy(
            receiverAddress = address,
            receiverLatitude = latitude,
            receiverLongitude = longitude,
            costCalculation = null // Reset cost calculation
        )
        updateCanCalculateCost()
    }
    
    fun updatePackageType(type: PackageType) {
        _uiState.value = _uiState.value.copy(
            packageType = type,
            costCalculation = null // Reset cost calculation
        )
        updateCanCalculateCost()
    }
    
    fun updateWeight(weight: String) {
        _uiState.value = _uiState.value.copy(
            weight = weight,
            costCalculation = null // Reset cost calculation
        )
        updateCanCalculateCost()
    }
    
    fun updateDescription(description: String) {
        _uiState.value = _uiState.value.copy(description = description)
    }
    
    fun updateDeclaredValue(value: String) {
        _uiState.value = _uiState.value.copy(declaredValue = value)
    }
    
    fun updateServiceType(type: ServiceType) {
        _uiState.value = _uiState.value.copy(
            serviceType = type,
            costCalculation = null // Reset cost calculation
        )
        updateCanCalculateCost()
    }
    
    fun updateUrgent(isUrgent: Boolean) {
        _uiState.value = _uiState.value.copy(
            isUrgent = isUrgent,
            costCalculation = null // Reset cost calculation
        )
        updateCanCalculateCost()
    }
    
    fun updatePaymentMethod(method: PaymentType) {
        _uiState.value = _uiState.value.copy(paymentMethod = method)
        updateCanPlaceOrder()
    }
    
    fun calculateCost() {
        val currentState = _uiState.value
        
        if (!currentState.canCalculateCost) {
            _uiState.value = currentState.copy(
                errorMessage = "请完善所有必填信息后再计算费用"
            )
            return
        }
        
        val weight = currentState.weight.toDoubleOrNull()
        if (weight == null || weight <= 0) {
            _uiState.value = currentState.copy(
                errorMessage = "请输入有效的包裹重量"
            )
            return
        }
        
        viewModelScope.launch {
            _uiState.value = currentState.copy(
                isCalculating = true,
                errorMessage = null
            )
            
            val result = orderRepository.calculateOrderCost(
                senderLatitude = currentState.senderLatitude,
                senderLongitude = currentState.senderLongitude,
                receiverLatitude = currentState.receiverLatitude,
                receiverLongitude = currentState.receiverLongitude,
                packageType = currentState.packageType,
                weight = weight,
                serviceType = currentState.serviceType,
                isUrgent = currentState.isUrgent
            )
            
            when (result) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isCalculating = false,
                        costCalculation = result.data,
                        errorMessage = null
                    )
                    updateCanPlaceOrder()
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isCalculating = false,
                        errorMessage = result.message
                    )
                }
                is NetworkResult.Loading -> {
                    _uiState.value = _uiState.value.copy(isCalculating = true)
                }
            }
        }
    }
    
    fun createOrder() {
        val currentState = _uiState.value
        
        if (!currentState.canPlaceOrder) {
            _uiState.value = currentState.copy(
                errorMessage = "请完善所有信息并计算费用后再下单"
            )
            return
        }
        
        val weight = currentState.weight.toDoubleOrNull() ?: 0.0
        val declaredValue = currentState.declaredValue.toDoubleOrNull()
        
        viewModelScope.launch {
            _uiState.value = currentState.copy(
                isCreatingOrder = true,
                errorMessage = null
            )
            
            val result = orderRepository.createOrder(
                senderName = currentState.senderName,
                senderPhone = currentState.senderPhone,
                senderAddress = currentState.senderAddress,
                senderLatitude = currentState.senderLatitude,
                senderLongitude = currentState.senderLongitude,
                receiverName = currentState.receiverName,
                receiverPhone = currentState.receiverPhone,
                receiverAddress = currentState.receiverAddress,
                receiverLatitude = currentState.receiverLatitude,
                receiverLongitude = currentState.receiverLongitude,
                packageType = currentState.packageType,
                weight = weight,
                dimensions = null,
                description = currentState.description.ifEmpty { null },
                declaredValue = declaredValue,
                serviceType = currentState.serviceType,
                isUrgent = currentState.isUrgent,
                paymentMethod = currentState.paymentMethod,
                notes = null
            )
            
            when (result) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isCreatingOrder = false,
                        orderCreated = true,
                        createdOrderId = result.data.id,
                        errorMessage = null
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isCreatingOrder = false,
                        errorMessage = result.message
                    )
                }
                is NetworkResult.Loading -> {
                    _uiState.value = _uiState.value.copy(isCreatingOrder = true)
                }
            }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
    
    private fun updateCanCalculateCost() {
        val currentState = _uiState.value
        val canCalculate = currentState.senderName.isNotEmpty() &&
                currentState.senderPhone.isNotEmpty() &&
                currentState.senderAddress.isNotEmpty() &&
                currentState.receiverName.isNotEmpty() &&
                currentState.receiverPhone.isNotEmpty() &&
                currentState.receiverAddress.isNotEmpty() &&
                currentState.weight.isNotEmpty() &&
                currentState.weight.toDoubleOrNull() != null &&
                currentState.weight.toDoubleOrNull()!! > 0
        
        _uiState.value = currentState.copy(canCalculateCost = canCalculate)
    }
    
    private fun updateCanPlaceOrder() {
        val currentState = _uiState.value
        val canPlace = currentState.canCalculateCost &&
                currentState.costCalculation != null &&
                !currentState.isCalculating &&
                !currentState.isCreatingOrder
        
        _uiState.value = currentState.copy(canPlaceOrder = canPlace)
    }
    
    // Initialize with current user info
    init {
        viewModelScope.launch {
            try {
                val currentUser = authRepository.getCurrentUser().first()
                if (currentUser != null) {
                    _uiState.value = _uiState.value.copy(
                        senderName = currentUser.fullName,
                        senderPhone = currentUser.phoneNumber
                    )
                    updateCanCalculateCost()
                }
            } catch (e: Exception) {
                // Handle silently
            }
        }
    }
}

data class CreateOrderUiState(
    // Sender info
    val senderName: String = "",
    val senderPhone: String = "",
    val senderAddress: String = "",
    val senderLatitude: Double = 0.0,
    val senderLongitude: Double = 0.0,
    
    // Receiver info
    val receiverName: String = "",
    val receiverPhone: String = "",
    val receiverAddress: String = "",
    val receiverLatitude: Double = 0.0,
    val receiverLongitude: Double = 0.0,
    
    // Package info
    val packageType: PackageType = PackageType.OTHER,
    val weight: String = "",
    val description: String = "",
    val declaredValue: String = "",
    
    // Service info
    val serviceType: ServiceType = ServiceType.STANDARD,
    val isUrgent: Boolean = false,
    val paymentMethod: PaymentType = PaymentType.CASH_ON_DELIVERY,
    
    // Cost calculation
    val costCalculation: CalculateCostResponse? = null,
    val isCalculating: Boolean = false,
    val canCalculateCost: Boolean = false,
    
    // Order creation
    val isCreatingOrder: Boolean = false,
    val canPlaceOrder: Boolean = false,
    val orderCreated: Boolean = false,
    val createdOrderId: String = "",
    
    // UI state
    val errorMessage: String? = null
)
