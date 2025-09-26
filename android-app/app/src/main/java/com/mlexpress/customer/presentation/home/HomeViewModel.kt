package com.mlexpress.customer.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.data.model.Order
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
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()
    
    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            try {
                // Load user name
                val currentUser = authRepository.getCurrentUser().first()
                val userName = currentUser?.fullName ?: ""
                
                // Load recent orders
                val userId = authRepository.getCurrentUser().first()?.id
                val recentOrders = if (userId != null) {
                    orderRepository.getRecentOrders(userId, 5)
                } else {
                    emptyList()
                }
                
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    userName = userName,
                    recentOrders = recentOrders
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message
                )
            }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}

data class HomeUiState(
    val isLoading: Boolean = false,
    val userName: String = "",
    val recentOrders: List<Order> = emptyList(),
    val errorMessage: String? = null
)
