package com.mlexpress.courier.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.courier.data.model.VehicleType
import com.mlexpress.courier.data.remote.dto.NetworkResult
import com.mlexpress.courier.data.repository.CourierAuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CourierAuthViewModel @Inject constructor(
    private val authRepository: CourierAuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(CourierAuthUiState())
    val uiState: StateFlow<CourierAuthUiState> = _uiState.asStateFlow()
    
    fun sendOtp(phoneNumber: String) {
        if (!isValidPhoneNumber(phoneNumber)) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "请输入有效的缅甸手机号码"
            )
            return
        }
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true, 
                errorMessage = null,
                phoneNumber = phoneNumber
            )
            
            when (val result = authRepository.sendOtp(phoneNumber)) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        currentStep = CourierAuthStep.OTP_VERIFICATION,
                        otpToken = result.data.otpToken
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
    
    fun verifyOtp(otp: String) {
        val currentState = _uiState.value
        if (currentState.phoneNumber.isEmpty() || currentState.otpToken.isEmpty()) {
            _uiState.value = currentState.copy(errorMessage = "OTP信息无效，请重新发送")
            return
        }
        
        if (otp.length != 6) {
            _uiState.value = currentState.copy(errorMessage = "请输入6位验证码")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = currentState.copy(isLoading = true, errorMessage = null)
            
            when (val result = authRepository.verifyOtp(
                currentState.phoneNumber,
                otp,
                currentState.otpToken
            )) {
                is NetworkResult.Success -> {
                    if (result.data.isExistingCourier) {
                        // 已有骑手账户，直接登录
                        _uiState.value = currentState.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            currentStep = CourierAuthStep.COMPLETED
                        )
                    } else {
                        // 新骑手，需要注册
                        _uiState.value = currentState.copy(
                            isLoading = false,
                            currentStep = CourierAuthStep.REGISTRATION
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.value = currentState.copy(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                is NetworkResult.Loading -> {
                    _uiState.value = currentState.copy(isLoading = true)
                }
            }
        }
    }
    
    fun register(
        fullName: String,
        email: String?,
        workId: String,
        identityCard: String,
        vehicleType: VehicleType,
        vehiclePlate: String
    ) {
        if (fullName.trim().isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "请输入真实姓名")
            return
        }
        
        if (identityCard.trim().isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "请输入身份证号码")
            return
        }
        
        if (vehiclePlate.trim().isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "请输入车牌号码")
            return
        }
        
        val currentState = _uiState.value
        
        viewModelScope.launch {
            _uiState.value = currentState.copy(isLoading = true, errorMessage = null)
            
            when (val result = authRepository.register(
                phoneNumber = currentState.phoneNumber,
                fullName = fullName.trim(),
                email = email?.trim(),
                workId = workId.trim().ifEmpty { null },
                identityCard = identityCard.trim(),
                vehicleType = vehicleType,
                vehiclePlate = vehiclePlate.trim(),
                otpToken = currentState.otpToken
            )) {
                is NetworkResult.Success -> {
                    _uiState.value = currentState.copy(
                        isLoading = false,
                        currentStep = CourierAuthStep.DOCUMENT_UPLOAD
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = currentState.copy(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                is NetworkResult.Loading -> {
                    _uiState.value = currentState.copy(isLoading = true)
                }
            }
        }
    }
    
    fun uploadDocuments() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            // TODO: Implement document upload
            kotlinx.coroutines.delay(2000) // Simulate upload
            
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                currentStep = CourierAuthStep.TRAINING
            )
        }
    }
    
    fun skipDocumentUpload() {
        _uiState.value = _uiState.value.copy(
            currentStep = CourierAuthStep.TRAINING
        )
    }
    
    fun completeTraining() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            // TODO: Implement training completion
            kotlinx.coroutines.delay(2000) // Simulate training
            
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isAuthenticated = true,
                currentStep = CourierAuthStep.COMPLETED
            )
        }
    }
    
    fun resendOtp() {
        val phoneNumber = _uiState.value.phoneNumber
        if (phoneNumber.isNotEmpty()) {
            sendOtp(phoneNumber)
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
    
    fun goBackToPhoneInput() {
        _uiState.value = _uiState.value.copy(
            currentStep = CourierAuthStep.PHONE_INPUT,
            phoneNumber = "",
            otpToken = ""
        )
    }
    
    fun goBackToOtpVerification() {
        _uiState.value = _uiState.value.copy(currentStep = CourierAuthStep.OTP_VERIFICATION)
    }
    
    private fun isValidPhoneNumber(phoneNumber: String): Boolean {
        val cleanNumber = phoneNumber.replace(Regex("[^0-9]"), "")
        return cleanNumber.matches(Regex("^09[0-9]{9}$"))
    }
}

data class CourierAuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val currentStep: CourierAuthStep = CourierAuthStep.PHONE_INPUT,
    val phoneNumber: String = "",
    val otpToken: String = "",
    val errorMessage: String? = null
)

enum class CourierAuthStep {
    PHONE_INPUT,
    OTP_VERIFICATION,
    REGISTRATION,
    DOCUMENT_UPLOAD,
    TRAINING,
    COMPLETED
}
