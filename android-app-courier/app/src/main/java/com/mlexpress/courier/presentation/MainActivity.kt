package com.mlexpress.courier.presentation

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
import com.mlexpress.courier.presentation.auth.CourierAuthScreen
import com.mlexpress.courier.presentation.main.CourierMainScreen
import com.mlexpress.courier.presentation.theme.MLExpressCourierTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    private val viewModel: MainViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        
        super.onCreate(savedInstanceState)
        
        splashScreen.setKeepOnScreenCondition {
            viewModel.isInitializing.value
        }
        
        setContent {
            MLExpressCourierTheme {
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
                    MLExpressCourierApp(viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
fun MLExpressCourierApp(
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
            CourierAuthScreen(
                onAuthSuccess = {
                    viewModel.onAuthenticationSuccess()
                }
            )
        }
        else -> {
            CourierMainScreen()
        }
    }
}
