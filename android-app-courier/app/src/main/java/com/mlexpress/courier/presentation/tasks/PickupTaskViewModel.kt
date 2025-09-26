package com.mlexpress.courier.presentation.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.courier.data.model.ConfirmationData
import com.mlexpress.courier.data.model.CourierOrder
import com.mlexpress.courier.data.model.LocationData
import com.mlexpress.courier.data.model.OrderStatus
import com.mlexpress.courier.data.remote.dto.NetworkResult
import com.mlexpress.courier.data.repository.CourierOrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PickupTaskViewModel @Inject constructor(
    private val orderRepository: CourierOrderRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(PickupTaskUiState())
    val uiState: StateFlow<PickupTaskUiState> = _uiState.asStateFlow()
    
    fun loadOrderDetails(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            when (val result = orderRepository.getOrderById(orderId)) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        order = result.data,
                        errorMessage = null
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                is NetworkResult.Loading -> {
                    _uiState.value = _uiState.value.copy(isLoading = true)
                }
            }
        }
    }
    
    fun confirmPickup(photoUrl: String?, notes: String?) {
        val currentOrder = _uiState.value.order ?: return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isConfirming = true)
            
            try {
                val confirmationData = ConfirmationData(
                    timestamp = System.currentTimeMillis(),
                    photoUrl = photoUrl,
                    notes = notes,
                    location = LocationData(
                        latitude = currentOrder.senderLatitude,
                        longitude = currentOrder.senderLongitude,
                        accuracy = 10.0f,
                        timestamp = System.currentTimeMillis()
                    )
                )
                
                when (val result = orderRepository.confirmPickup(currentOrder.id, confirmationData)) {
                    is NetworkResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isConfirming = false,
                            order = result.data,
                            successMessage = "取件确认成功！"
                        )
                    }
                    is NetworkResult.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isConfirming = false,
                            errorMessage = result.message
                        )
                    }
                    is NetworkResult.Loading -> {
                        _uiState.value = _uiState.value.copy(isConfirming = true)
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isConfirming = false,
                    errorMessage = e.message ?: "确认取件失败"
                )
            }
        }
    }
    
    fun reportIssue(issueDescription: String) {
        val currentOrder = _uiState.value.order ?: return
        
        viewModelScope.launch {
            try {
                when (val result = orderRepository.reportIssue(currentOrder.id, issueDescription)) {
                    is NetworkResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            successMessage = "问题已上报，客服将尽快处理"
                        )
                    }
                    is NetworkResult.Error -> {
                        _uiState.value = _uiState.value.copy(
                            errorMessage = result.message
                        )
                    }
                    is NetworkResult.Loading -> {
                        // Handle loading if needed
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = e.message ?: "问题上报失败"
                )
            }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
    
    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }
}

data class PickupTaskUiState(
    val isLoading: Boolean = false,
    val order: CourierOrder? = null,
    val isConfirming: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null
)
