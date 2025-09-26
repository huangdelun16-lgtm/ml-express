package com.mlexpress.courier.presentation.statistics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.courier.data.model.EarningsRecord
import com.mlexpress.courier.data.remote.dto.NetworkResult
import com.mlexpress.courier.data.repository.CourierRepository
import com.mlexpress.courier.data.repository.EarningsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StatisticsViewModel @Inject constructor(
    private val courierRepository: CourierRepository,
    private val earningsRepository: EarningsRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(StatisticsUiState())
    val uiState: StateFlow<StatisticsUiState> = _uiState.asStateFlow()
    
    fun loadStatistics() {
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
                
                // Load various statistics
                val todayEarnings = earningsRepository.getTodayEarnings(courierId)
                val todayOrders = earningsRepository.getTodayOrderCount(courierId)
                val totalEarnings = courier?.totalEarnings ?: 0.0
                val availableBalance = earningsRepository.getAvailableBalance(courierId)
                val pendingEarnings = earningsRepository.getPendingEarnings(courierId)
                val recentEarnings = earningsRepository.getRecentEarnings(courierId, 10)
                
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    todayEarnings = todayEarnings,
                    todayOrders = todayOrders,
                    todayRating = courier?.rating ?: 5.0f,
                    onlineHours = 8.5f, // TODO: Calculate actual online hours
                    totalEarnings = totalEarnings,
                    availableBalance = availableBalance,
                    pendingEarnings = pendingEarnings,
                    totalOrders = courier?.totalOrders ?: 0,
                    completionRate = if (courier?.totalOrders ?: 0 > 0) {
                        (courier?.completedOrders ?: 0).toFloat() / (courier?.totalOrders ?: 1).toFloat()
                    } else 0f,
                    averageRating = courier?.rating ?: 5.0f,
                    onTimeRate = 0.95f, // TODO: Calculate actual on-time rate
                    recentEarnings = recentEarnings,
                    errorMessage = null
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "加载统计数据失败"
                )
            }
        }
    }
    
    fun refreshStatistics() {
        loadStatistics()
    }
    
    fun requestWithdrawal(amount: Double) {
        viewModelScope.launch {
            try {
                val courier = courierRepository.getCurrentCourier().first()
                val courierId = courier?.id ?: return@launch
                
                when (val result = earningsRepository.requestWithdrawal(courierId, amount)) {
                    is NetworkResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            successMessage = "提现申请已提交，预计1-3个工作日到账"
                        )
                        // Refresh statistics to update balance
                        loadStatistics()
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
                    errorMessage = e.message ?: "提现申请失败"
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

data class StatisticsUiState(
    val isLoading: Boolean = false,
    
    // Today's data
    val todayEarnings: Double = 0.0,
    val todayOrders: Int = 0,
    val todayRating: Float = 5.0f,
    val onlineHours: Float = 0.0f,
    
    // Earnings data
    val totalEarnings: Double = 0.0,
    val availableBalance: Double = 0.0,
    val pendingEarnings: Double = 0.0,
    val recentEarnings: List<EarningsRecord> = emptyList(),
    
    // Performance data
    val totalOrders: Int = 0,
    val completionRate: Float = 0.0f,
    val averageRating: Float = 5.0f,
    val onTimeRate: Float = 0.0f,
    
    // UI state
    val errorMessage: String? = null,
    val successMessage: String? = null
)
