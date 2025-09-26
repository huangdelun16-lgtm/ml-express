package com.mlexpress.customer.presentation.settings

import android.app.Activity
import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mlexpress.customer.presentation.MainActivity
import com.mlexpress.customer.utils.LanguageManager
import com.mlexpress.customer.utils.LanguageOption
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LanguageSettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val languageManager: LanguageManager
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(LanguageSettingsUiState())
    val uiState: StateFlow<LanguageSettingsUiState> = _uiState.asStateFlow()
    
    fun loadLanguageSettings() {
        viewModelScope.launch {
            try {
                val currentLanguageCode = languageManager.getCurrentLanguage()
                val availableLanguages = languageManager.getSupportedLanguages()
                val currentLanguage = availableLanguages.find { it.code == currentLanguageCode }
                
                _uiState.value = _uiState.value.copy(
                    currentLanguage = currentLanguage,
                    availableLanguages = availableLanguages,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "Failed to load language settings"
                )
            }
        }
    }
    
    fun selectLanguage(languageCode: String) {
        if (_uiState.value.isChangingLanguage) return
        
        val currentLanguageCode = _uiState.value.currentLanguage?.code
        if (currentLanguageCode == languageCode) return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isChangingLanguage = true)
            
            try {
                val success = languageManager.setLanguage(languageCode)
                
                if (success) {
                    val newLanguage = _uiState.value.availableLanguages
                        .find { it.code == languageCode }
                    
                    _uiState.value = _uiState.value.copy(
                        isChangingLanguage = false,
                        currentLanguage = newLanguage,
                        languageChanged = true
                    )
                    
                    android.util.Log.d("LanguageSettings", "Language changed to: $languageCode")
                } else {
                    _uiState.value = _uiState.value.copy(
                        isChangingLanguage = false,
                        errorMessage = "Failed to change language"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isChangingLanguage = false,
                    errorMessage = e.message ?: "Language change failed"
                )
            }
        }
    }
    
    fun restartApp() {
        try {
            // 重启应用以应用语言更改
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra("language_changed", true)
            }
            
            context.startActivity(intent)
            
            // 结束当前Activity
            if (context is Activity) {
                context.finish()
            }
        } catch (e: Exception) {
            android.util.Log.e("LanguageSettings", "Failed to restart app", e)
            _uiState.value = _uiState.value.copy(
                errorMessage = "Failed to restart application"
            )
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}

data class LanguageSettingsUiState(
    val isLoading: Boolean = true,
    val currentLanguage: LanguageOption? = null,
    val availableLanguages: List<LanguageOption> = emptyList(),
    val isChangingLanguage: Boolean = false,
    val languageChanged: Boolean = false,
    val errorMessage: String? = null
)
