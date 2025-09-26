package com.mlexpress.customer.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()
    
    fun loadProfile() {
        viewModelScope.launch {
            try {
                val currentUser = authRepository.getCurrentUser().first()
                if (currentUser != null) {
                    _uiState.value = _uiState.value.copy(
                        userName = currentUser.fullName,
                        userPhone = currentUser.phoneNumber,
                        userEmail = currentUser.email
                    )
                }
            } catch (e: Exception) {
                // Handle error silently for now
            }
        }
    }
    
    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            // Navigation will be handled by MainActivity
        }
    }
}

data class ProfileUiState(
    val userName: String = "",
    val userPhone: String = "",
    val userEmail: String? = null
)
