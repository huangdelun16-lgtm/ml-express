package com.mlexpress.customer.presentation

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import com.mlexpress.customer.presentation.auth.AuthScreen
import com.mlexpress.customer.presentation.main.MainScreen
import com.mlexpress.customer.presentation.theme.MLExpressTheme
import com.mlexpress.customer.utils.LanguageManager
import com.mlexpress.customer.utils.setAppLanguage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    @Inject
    lateinit var languageManager: LanguageManager
    
    private val viewModel: MainViewModel by viewModels()
    
    override fun attachBaseContext(newBase: Context) {
        val context = runBlocking {
            try {
                val languageManager = LanguageManager(newBase, 
                    com.mlexpress.customer.data.local.preferences.UserPreferences(newBase))
                val currentLanguage = languageManager.getCurrentLanguage()
                languageManager.applyLanguage(currentLanguage)
            } catch (e: Exception) {
                newBase.setAppLanguage("zh")
            }
        }
        super.attachBaseContext(context)
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        // Install splash screen
        val splashScreen = installSplashScreen()
        
        super.onCreate(savedInstanceState)
        
        // Keep splash screen visible until initialization is complete
        splashScreen.setKeepOnScreenCondition {
            viewModel.isInitializing.value
        }
        
        // 检查是否因语言切换而重启
        val languageChanged = intent.getBooleanExtra("language_changed", false)
        if (languageChanged) {
            android.util.Log.d("MainActivity", "App restarted due to language change")
        }
        
        setContent {
            MLExpressTheme {
                val systemUiController = rememberSystemUiController()
                val isLightTheme = MaterialTheme.colorScheme.background.luminance() > 0.5f
                
                LaunchedEffect(isLightTheme) {
                    systemUiController.setSystemBarsColor(
                        color = MaterialTheme.colorScheme.background,
                        darkIcons = isLightTheme
                    )
                }
                
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MLExpressApp(viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
fun MLExpressApp(
    viewModel: MainViewModel
) {
    val isInitializing by viewModel.isInitializing.collectAsStateWithLifecycle()
    val isAuthenticated by viewModel.isAuthenticated.collectAsStateWithLifecycle()
    
    LaunchedEffect(Unit) {
        viewModel.initialize()
    }
    
    when {
        isInitializing -> {
            // Splash screen is handling this
        }
        !isAuthenticated -> {
            AuthScreen(
                onAuthSuccess = {
                    viewModel.onAuthenticationSuccess()
                }
            )
        }
        else -> {
            MainScreen()
        }
    }
}
