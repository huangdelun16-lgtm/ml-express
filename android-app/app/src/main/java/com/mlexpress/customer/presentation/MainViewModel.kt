package com.mlexpress.customer.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _isInitializing = MutableStateFlow(true)
    val isInitializing: StateFlow<Boolean> = _isInitializing.asStateFlow()
    
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()
    
    fun initialize() {
        viewModelScope.launch {
            try {
                // Check if user is already authenticated
                val isLoggedIn = authRepository.isLoggedIn()
                _isAuthenticated.value = isLoggedIn
            } catch (e: Exception) {
                _isAuthenticated.value = false
            } finally {
                _isInitializing.value = false
            }
        }
    }
    
    fun onAuthenticationSuccess() {
        _isAuthenticated.value = true
    }
    
    fun onLogout() {
        viewModelScope.launch {
            authRepository.logout()
            _isAuthenticated.value = false
        }
    }
}
