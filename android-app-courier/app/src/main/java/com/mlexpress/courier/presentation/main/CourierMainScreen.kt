package com.mlexpress.courier.presentation.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.mlexpress.courier.presentation.orders.OrderHallScreen
import com.mlexpress.courier.presentation.profile.CourierProfileScreen
import com.mlexpress.courier.presentation.statistics.StatisticsScreen
import com.mlexpress.courier.presentation.tasks.TaskExecutionScreen
import com.mlexpress.courier.presentation.tasks.PickupTaskScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierMainScreen() {
    val navController = rememberNavController()
    
    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                
                bottomNavItems.forEach { item ->
                    NavigationBarItem(
                        icon = { 
                            Badge {
                                Icon(item.icon, contentDescription = null)
                            }
                        },
                        label = { Text(item.label) },
                        selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
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
            startDestination = "order_hall",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("order_hall") {
                OrderHallScreen(navController = navController)
            }
            composable("tasks") {
                TaskExecutionScreen(navController = navController)
            }
            composable("statistics") {
                StatisticsScreen(navController = navController)
            }
            composable("profile") {
                CourierProfileScreen(navController = navController)
            }
            
            // Task related screens
            composable("pickup_task/{orderId}") { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                PickupTaskScreen(navController = navController, orderId = orderId)
            }
            composable("delivery_task/{orderId}") { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                DeliveryTaskScreen(navController = navController, orderId = orderId)
            }
            composable("task_details/{orderId}") { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                TaskDetailsScreen(navController = navController, orderId = orderId)
            }
            
            // Profile related screens
            composable("order_preferences") {
                OrderPreferencesScreen(navController = navController)
            }
            composable("documents") {
                DocumentsScreen(navController = navController)
            }
            composable("earnings_details") {
                EarningsDetailsScreen(navController = navController)
            }
            composable("work_reports") {
                WorkReportsScreen(navController = navController)
            }
            composable("settings") {
                SettingsScreen(navController = navController)
            }
            composable("help") {
                HelpScreen(navController = navController)
            }
        }
    }
}

data class CourierBottomNavItem(
    val route: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val label: String
)

private val bottomNavItems = listOf(
    CourierBottomNavItem("order_hall", Icons.Default.Inbox, "接单大厅"),
    CourierBottomNavItem("tasks", Icons.Default.TaskAlt, "我的任务"),
    CourierBottomNavItem("statistics", Icons.Default.Analytics, "数据统计"),
    CourierBottomNavItem("profile", Icons.Default.Person, "个人中心")
)

// Placeholder screens for navigation
@Composable
fun DeliveryTaskScreen(navController: androidx.navigation.NavController, orderId: String) {
    // TODO: Implement delivery task screen
    Box(
        modifier = androidx.compose.foundation.layout.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("送件任务: $orderId")
    }
}

@Composable
fun TaskDetailsScreen(navController: androidx.navigation.NavController, orderId: String) {
    // TODO: Implement task details screen
    Box(
        modifier = androidx.compose.foundation.layout.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("任务详情: $orderId")
    }
}

@Composable
fun OrderPreferencesScreen(navController: androidx.navigation.NavController) {
    // TODO: Implement order preferences screen
    Box(
        modifier = androidx.compose.foundation.layout.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("接单偏好设置")
    }
}

@Composable
fun DocumentsScreen(navController: androidx.navigation.NavController) {
    // TODO: Implement documents screen
    Box(
        modifier = androidx.compose.foundation.layout.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("认证文件")
    }
}

@Composable
fun EarningsDetailsScreen(navController: androidx.navigation.NavController) {
    // TODO: Implement earnings details screen
    Box(
        modifier = androidx.compose.foundation.layout.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("收入明细")
    }
}

@Composable
fun WorkReportsScreen(navController: androidx.navigation.NavController) {
    // TODO: Implement work reports screen
    Box(
        modifier = androidx.compose.foundation.layout.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("工作报表")
    }
}

@Composable
fun SettingsScreen(navController: androidx.navigation.NavController) {
    // TODO: Implement settings screen
    Box(
        modifier = androidx.compose.foundation.layout.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("应用设置")
    }
}

@Composable
fun HelpScreen(navController: androidx.navigation.NavController) {
    // TODO: Implement help screen
    Box(
        modifier = androidx.compose.foundation.layout.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("帮助中心")
    }
}
