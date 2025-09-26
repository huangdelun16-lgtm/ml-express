package com.mlexpress.customer.presentation.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.mlexpress.customer.R
import com.mlexpress.customer.presentation.home.HomeScreen
import com.mlexpress.customer.presentation.orders.OrdersScreen
import com.mlexpress.customer.presentation.tracking.TrackingScreen
import com.mlexpress.customer.presentation.profile.ProfileScreen
import com.mlexpress.customer.presentation.order.CreateOrderScreen
import com.mlexpress.customer.presentation.order.OrderDetailsScreen
import com.mlexpress.customer.presentation.order.OrderSuccessScreen
import com.mlexpress.customer.presentation.settings.LanguageSettingsScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    val navController = rememberNavController()
    
    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                
                bottomNavItems.forEach { item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = null) },
                        label = { Text(stringResource(item.label)) },
                        selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                        onClick = {
                            navController.navigate(item.route) {
                                // Pop up to the start destination of the graph to
                                // avoid building up a large stack of destinations
                                // on the back stack as users select items
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                // Avoid multiple copies of the same destination when
                                // reselecting the same item
                                launchSingleTop = true
                                // Restore state when reselecting a previously selected item
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("home") {
                HomeScreen(navController = navController)
            }
            composable("orders") {
                OrdersScreen(navController = navController)
            }
            composable("tracking") {
                TrackingScreen(navController = navController)
            }
            composable("profile") {
                ProfileScreen(navController = navController)
            }
            
            // Order related screens
            composable("create_order") {
                CreateOrderScreen(navController = navController)
            }
            composable("order_details/{orderId}") { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                OrderDetailsScreen(navController = navController, orderId = orderId)
            }
            composable("order_success/{orderId}") { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                OrderSuccessScreen(navController = navController, orderId = orderId)
            }
            
            // Settings screens
            composable("language_settings") {
                LanguageSettingsScreen(navController = navController)
            }
        }
    }
}

data class BottomNavItem(
    val route: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val label: Int
)

private val bottomNavItems = listOf(
    BottomNavItem("home", Icons.Default.Home, R.string.nav_home),
    BottomNavItem("orders", Icons.Default.List, R.string.nav_orders),
    BottomNavItem("tracking", Icons.Default.LocationOn, R.string.nav_tracking),
    BottomNavItem("profile", Icons.Default.Person, R.string.nav_profile)
)
