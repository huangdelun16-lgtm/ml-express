package com.mlexpress.courier.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.courier.data.model.CourierStatus
import com.mlexpress.courier.data.remote.dto.NetworkResult
import com.mlexpress.courier.data.repository.CourierRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CourierProfileViewModel @Inject constructor(
    private val courierRepository: CourierRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(CourierProfileUiState())
    val uiState: StateFlow<CourierProfileUiState> = _uiState.asStateFlow()
    
    fun loadProfile() {
        viewModelScope.launch {
            try {
                val courier = courierRepository.getCurrentCourier().first()
                if (courier != null) {
                    _uiState.value = _uiState.value.copy(
                        courierName = courier.fullName,
                        workId = courier.workId,
                        phone = courier.phoneNumber,
                        rating = courier.rating,
                        status = courier.status,
                        isVerified = courier.isVerified,
                        totalOrders = courier.totalOrders,
                        completedOrders = courier.completedOrders,
                        totalEarnings = courier.totalEarnings
                    )
                }
            } catch (e: Exception) {
                // Handle error silently for now
            }
        }
    }
    
    fun toggleOnlineStatus() {
        viewModelScope.launch {
            try {
                val currentStatus = _uiState.value.status
                val newStatus = when (currentStatus) {
                    CourierStatus.OFFLINE -> CourierStatus.ONLINE
                    CourierStatus.ONLINE -> CourierStatus.OFFLINE
                    CourierStatus.BUSY -> CourierStatus.OFFLINE
                    CourierStatus.UNAVAILABLE -> CourierStatus.ONLINE
                }
                
                when (val result = courierRepository.updateOnlineStatus(newStatus == CourierStatus.ONLINE)) {
                    is NetworkResult.Success -> {
                        _uiState.value = _uiState.value.copy(
                            status = newStatus,
                            message = if (newStatus == CourierStatus.ONLINE) "已上线" else "已离线"
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
                    errorMessage = e.message ?: "状态切换失败"
                )
            }
        }
    }
    
    fun logout() {
        viewModelScope.launch {
            courierRepository.logout()
            // Navigation will be handled by MainActivity
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
    
    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }
}

data class CourierProfileUiState(
    val courierName: String = "",
    val workId: String = "",
    val phone: String = "",
    val rating: Float = 5.0f,
    val status: CourierStatus = CourierStatus.OFFLINE,
    val isVerified: Boolean = false,
    val totalOrders: Int = 0,
    val completedOrders: Int = 0,
    val totalEarnings: Double = 0.0,
    val errorMessage: String? = null,
    val message: String? = null
)
