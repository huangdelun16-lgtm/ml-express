package com.mlexpress.customer.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.data.remote.dto.NetworkResult
import com.mlexpress.customer.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()
    
    private val _otpState = MutableStateFlow(OtpUiState())
    val otpState: StateFlow<OtpUiState> = _otpState.asStateFlow()
    
    private val _registrationState = MutableStateFlow(RegistrationUiState())
    val registrationState: StateFlow<RegistrationUiState> = _registrationState.asStateFlow()
    
    fun sendOtp(phoneNumber: String) {
        if (!isValidPhoneNumber(phoneNumber)) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "请输入有效的缅甸手机号码"
            )
            return
        }
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            when (val result = authRepository.sendOtp(phoneNumber)) {
                is NetworkResult.Success -> {
                    _otpState.value = _otpState.value.copy(
                        phoneNumber = phoneNumber,
                        otpToken = result.data.otpToken,
                        expiresIn = result.data.expiresIn,
                        isOtpSent = true
                    )
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        currentStep = AuthStep.OTP_VERIFICATION
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
        val currentOtpState = _otpState.value
        if (currentOtpState.phoneNumber.isEmpty() || currentOtpState.otpToken.isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "OTP信息无效，请重新发送")
            return
        }
        
        if (otp.length != 6) {
            _uiState.value = _uiState.value.copy(errorMessage = "请输入6位验证码")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            when (val result = authRepository.verifyOtp(
                currentOtpState.phoneNumber,
                otp,
                currentOtpState.otpToken
            )) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        currentStep = AuthStep.COMPLETED
                    )
                }
                is NetworkResult.Error -> {
                    if (result.code == "USER_NOT_FOUND") {
                        // 新用户，需要注册
                        _registrationState.value = _registrationState.value.copy(
                            phoneNumber = currentOtpState.phoneNumber,
                            otpToken = currentOtpState.otpToken
                        )
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            currentStep = AuthStep.REGISTRATION
                        )
                    } else {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            errorMessage = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    _uiState.value = _uiState.value.copy(isLoading = true)
                }
            }
        }
    }
    
    fun register(fullName: String, email: String?) {
        if (fullName.trim().isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "请输入姓名")
            return
        }
        
        if (!email.isNullOrEmpty() && !isValidEmail(email)) {
            _uiState.value = _uiState.value.copy(errorMessage = "请输入有效的邮箱地址")
            return
        }
        
        val currentRegistrationState = _registrationState.value
        if (currentRegistrationState.phoneNumber.isEmpty() || currentRegistrationState.otpToken.isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "注册信息无效，请重新开始")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            when (val result = authRepository.register(
                currentRegistrationState.phoneNumber,
                fullName.trim(),
                email?.trim(),
                currentRegistrationState.otpToken,
                null // FCM token will be updated later
            )) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        currentStep = AuthStep.COMPLETED
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
    
    fun resendOtp() {
        val phoneNumber = _otpState.value.phoneNumber
        if (phoneNumber.isNotEmpty()) {
            sendOtp(phoneNumber)
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
    
    fun goBackToPhoneInput() {
        _uiState.value = _uiState.value.copy(currentStep = AuthStep.PHONE_INPUT)
        _otpState.value = OtpUiState()
    }
    
    fun goBackToOtpVerification() {
        _uiState.value = _uiState.value.copy(currentStep = AuthStep.OTP_VERIFICATION)
    }
    
    private fun isValidPhoneNumber(phoneNumber: String): Boolean {
        // 缅甸手机号格式: 09xxxxxxxxx (11位数字)
        val cleanNumber = phoneNumber.replace(Regex("[^0-9]"), "")
        return cleanNumber.matches(Regex("^09[0-9]{9}$"))
    }
    
    private fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }
}

data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val currentStep: AuthStep = AuthStep.PHONE_INPUT,
    val errorMessage: String? = null
)

data class OtpUiState(
    val phoneNumber: String = "",
    val otpToken: String = "",
    val expiresIn: Int = 0,
    val isOtpSent: Boolean = false,
    val remainingTime: Int = 0
)

data class RegistrationUiState(
    val phoneNumber: String = "",
    val otpToken: String = ""
)

enum class AuthStep {
    PHONE_INPUT,
    OTP_VERIFICATION,
    REGISTRATION,
    COMPLETED
}
