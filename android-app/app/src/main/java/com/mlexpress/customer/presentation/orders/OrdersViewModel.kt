package com.mlexpress.customer.presentation.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.data.model.Order
import com.mlexpress.customer.data.model.OrderStatus
import com.mlexpress.customer.data.remote.dto.NetworkResult
import com.mlexpress.customer.data.repository.AuthRepository
import com.mlexpress.customer.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()
    
    private val _selectedStatus = MutableStateFlow(OrderStatusFilter.ALL)
    
    init {
        // Observe status changes and reload orders
        viewModelScope.launch {
            _selectedStatus.collect { status ->
                _uiState.value = _uiState.value.copy(selectedStatus = status)
                loadOrders()
            }
        }
    }
    
    fun loadOrders() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            try {
                val currentUser = authRepository.getCurrentUser().first()
                val userId = currentUser?.id
                
                if (userId == null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "User not found"
                    )
                    return@launch
                }
                
                val statusFilter = when (_selectedStatus.value) {
                    OrderStatusFilter.ACTIVE -> listOf(
                        OrderStatus.PENDING,
                        OrderStatus.CONFIRMED,
                        OrderStatus.PICKED_UP,
                        OrderStatus.IN_TRANSIT,
                        OrderStatus.DELIVERING
                    )
                    OrderStatusFilter.COMPLETED -> listOf(OrderStatus.DELIVERED)
                    OrderStatusFilter.CANCELLED -> listOf(
                        OrderStatus.CANCELLED,
                        OrderStatus.RETURNED
                    )
                    OrderStatusFilter.ALL -> null
                }
                
                // Try to load from network first, fall back to local cache
                val result = if (statusFilter != null) {
                    // For filtered results, we need to make multiple API calls or use local data
                    // For now, use local data with filtering
                    try {
                        val orders = orderRepository.getOrdersByUserAndStatusFlow(userId, statusFilter).first()
                        NetworkResult.Success(orders)
                    } catch (e: Exception) {
                        NetworkResult.Error(e.message ?: "Failed to load orders")
                    }
                } else {
                    orderRepository.getOrders(userId)
                }
                
                when (result) {
                    is NetworkResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            orders = result.data,
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
                    errorMessage = e.message ?: "Unknown error occurred"
                )
            }
        }
    }
    
    fun selectStatus(status: OrderStatusFilter) {
        _selectedStatus.value = status
    }
    
    fun refreshOrders() {
        loadOrders()
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}

data class OrdersUiState(
    val isLoading: Boolean = false,
    val orders: List<Order> = emptyList(),
    val selectedStatus: OrderStatusFilter = OrderStatusFilter.ALL,
    val errorMessage: String? = null
)

enum class OrderStatusFilter {
    ALL,
    ACTIVE,
    COMPLETED,
    CANCELLED
}
