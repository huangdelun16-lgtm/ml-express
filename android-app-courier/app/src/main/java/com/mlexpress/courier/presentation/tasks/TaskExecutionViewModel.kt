package com.mlexpress.courier.presentation.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.courier.data.model.CourierOrder
import com.mlexpress.courier.data.model.OrderStatus
import com.mlexpress.courier.data.remote.dto.NetworkResult
import com.mlexpress.courier.data.repository.CourierOrderRepository
import com.mlexpress.courier.data.repository.CourierRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TaskExecutionViewModel @Inject constructor(
    private val orderRepository: CourierOrderRepository,
    private val courierRepository: CourierRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(TaskExecutionUiState())
    val uiState: StateFlow<TaskExecutionUiState> = _uiState.asStateFlow()
    
    fun loadCurrentTasks() {
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
                
                // Load active tasks
                when (val result = orderRepository.getActiveTasks(courierId)) {
                    is NetworkResult.Success -> {
                        val activeTasks = result.data
                        
                        // Load today's completed count
                        val todayCompleted = orderRepository.getTodayCompletedCount(courierId)
                        
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            activeTasks = activeTasks,
                            todayCompletedCount = todayCompleted,
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
                    errorMessage = e.message ?: "加载任务失败"
                )
            }
        }
    }
    
    fun refreshTasks() {
        loadCurrentTasks()
    }
    
    fun updateTaskStatus(orderId: String, status: OrderStatus) {
        viewModelScope.launch {
            try {
                when (val result = orderRepository.updateOrderStatus(orderId, status)) {
                    is NetworkResult.Success -> {
                        // Refresh tasks to get updated list
                        loadCurrentTasks()
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
                    errorMessage = e.message ?: "更新任务状态失败"
                )
            }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}

data class TaskExecutionUiState(
    val isLoading: Boolean = false,
    val activeTasks: List<CourierOrder> = emptyList(),
    val todayCompletedCount: Int = 0,
    val errorMessage: String? = null
)
