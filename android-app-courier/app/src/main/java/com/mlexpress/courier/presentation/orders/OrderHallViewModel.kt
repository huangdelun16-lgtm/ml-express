package com.mlexpress.courier.presentation.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.courier.data.model.CourierOrder
import com.mlexpress.courier.data.remote.dto.NetworkResult
import com.mlexpress.courier.data.repository.CourierOrderRepository
import com.mlexpress.courier.data.repository.CourierRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OrderHallViewModel @Inject constructor(
    private val orderRepository: CourierOrderRepository,
    private val courierRepository: CourierRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(OrderHallUiState())
    val uiState: StateFlow<OrderHallUiState> = _uiState.asStateFlow()
    
    private var realTimeUpdateJob: Job? = null
    
    init {
        loadCourierStatus()
    }
    
    private fun loadCourierStatus() {
        viewModelScope.launch {
            try {
                val courier = courierRepository.getCurrentCourier().first()
                _uiState.value = _uiState.value.copy(
                    isOnline = courier?.isOnline ?: false
                )
            } catch (e: Exception) {
                // Handle error silently
            }
        }
    }
    
    fun loadAvailableOrders() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            try {
                val courier = courierRepository.getCurrentCourier().first()
                val courierId = courier?.id
                
                if (courierId == null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "骑手信息未找到"
                    )
                    return@launch
                }
                
                when (val result = orderRepository.getAvailableOrders(courierId)) {
                    is NetworkResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            availableOrders = result.data,
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
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "加载订单失败"
                )
            }
        }
    }
    
    fun acceptOrder(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(acceptingOrderId = orderId)
            
            try {
                when (val result = orderRepository.acceptOrder(orderId)) {
                    is NetworkResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            acceptingOrderId = null,
                            message = "接单成功！",
                            availableOrders = _uiState.value.availableOrders.filter { it.id != orderId }
                        )
                    }
                    is NetworkResult.Error -> {
                        _uiState.value = _uiState.value.copy(
                            acceptingOrderId = null,
                            errorMessage = result.message
                        )
                    }
                    is NetworkResult.Loading -> {
                        // Keep loading state
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    acceptingOrderId = null,
                    errorMessage = e.message ?: "接单失败"
                )
            }
        }
    }
    
    fun toggleOnlineStatus() {
        viewModelScope.launch {
            try {
                val currentStatus = _uiState.value.isOnline
                
                when (val result = courierRepository.updateOnlineStatus(!currentStatus)) {
                    is NetworkResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isOnline = !currentStatus,
                            message = if (!currentStatus) "已上线，可以接收订单" else "已离线"
                        )
                        
                        if (!currentStatus) {
                            // 上线后立即加载可用订单
                            loadAvailableOrders()
                            startRealTimeUpdates()
                        } else {
                            // 离线后停止实时更新
                            stopRealTimeUpdates()
                            _uiState.value = _uiState.value.copy(availableOrders = emptyList())
                        }
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
                    errorMessage = e.message ?: "状态切换失败"
                )
            }
        }
    }
    
    fun startRealTimeUpdates() {
        if (_uiState.value.isOnline) {
            realTimeUpdateJob?.cancel()
            realTimeUpdateJob = viewModelScope.launch {
                while (true) {
                    delay(30_000) // 每30秒更新一次
                    if (_uiState.value.isOnline) {
                        loadAvailableOrders()
                    }
                }
            }
        }
    }
    
    fun stopRealTimeUpdates() {
        realTimeUpdateJob?.cancel()
        realTimeUpdateJob = null
    }
    
    fun refreshOrders() {
        if (_uiState.value.isOnline) {
            loadAvailableOrders()
        }
    }
    
    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
    
    override fun onCleared() {
        super.onCleared()
        stopRealTimeUpdates()
    }
}

data class OrderHallUiState(
    val isLoading: Boolean = false,
    val isOnline: Boolean = false,
    val availableOrders: List<CourierOrder> = emptyList(),
    val acceptingOrderId: String? = null,
    val errorMessage: String? = null,
    val message: String? = null
)
