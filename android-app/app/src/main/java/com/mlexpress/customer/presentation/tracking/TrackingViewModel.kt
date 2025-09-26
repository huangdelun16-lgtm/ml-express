package com.mlexpress.customer.presentation.tracking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.data.remote.dto.NetworkResult
import com.mlexpress.customer.data.remote.dto.OrderTrackingResponse
import com.mlexpress.customer.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TrackingViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(TrackingUiState())
    val uiState: StateFlow<TrackingUiState> = _uiState.asStateFlow()
    
    fun trackOrder(orderNumber: String) {
        if (orderNumber.trim().isEmpty()) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "请输入订单号"
            )
            return
        }
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null,
                trackingResult = null
            )
            
            when (val result = orderRepository.trackOrder(orderNumber.trim())) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        trackingResult = result.data,
                        errorMessage = null
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = when (result.code) {
                            "ORDER_NOT_FOUND" -> "未找到订单 $orderNumber，请检查订单号是否正确"
                            else -> result.message
                        }
                    )
                }
                is NetworkResult.Loading -> {
                    _uiState.value = _uiState.value.copy(isLoading = true)
                }
            }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
    
    fun clearResult() {
        _uiState.value = _uiState.value.copy(
            trackingResult = null,
            errorMessage = null
        )
    }
}

data class TrackingUiState(
    val isLoading: Boolean = false,
    val trackingResult: OrderTrackingResponse? = null,
    val errorMessage: String? = null
)
