package com.mlexpress.courier.presentation.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.courier.data.model.CourierStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierProfileScreen(
    navController: NavController,
    viewModel: CourierProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    LaunchedEffect(Unit) {
        viewModel.loadProfile()
    }
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Profile header
        item {
            CourierProfileHeader(
                courierName = uiState.courierName,
                workId = uiState.workId,
                phone = uiState.phone,
                rating = uiState.rating,
                status = uiState.status,
                isVerified = uiState.isVerified,
                onToggleStatus = viewModel::toggleOnlineStatus
            )
        }
        
        // Quick stats
        item {
            QuickStatsCard(
                totalOrders = uiState.totalOrders,
                completedOrders = uiState.completedOrders,
                totalEarnings = uiState.totalEarnings
            )
        }
        
        // Settings menu
        items(profileMenuItems) { item ->
            ProfileMenuItem(
                item = item,
                onClick = {
                    when (item.id) {
                        "preferences" -> navController.navigate("order_preferences")
                        "documents" -> navController.navigate("documents")
                        "earnings" -> navController.navigate("earnings_details")
                        "reports" -> navController.navigate("work_reports")
                        "settings" -> navController.navigate("settings")
                        "help" -> navController.navigate("help")
                        "logout" -> viewModel.logout()
                        else -> { /* TODO: Handle other items */ }
                    }
                }
            )
        }
    }
}

@Composable
private fun CourierProfileHeader(
    courierName: String,
    workId: String,
    phone: String,
    rating: Float,
    status: CourierStatus,
    isVerified: Boolean,
    onToggleStatus: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Avatar
                Surface(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape),
                    color = MaterialTheme.colorScheme.primary
                ) {
                    Box(
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(32.dp),
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                // Courier info
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = courierName,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        
                        if (isVerified) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                Icons.Default.Verified,
                                contentDescription = "Verified",
                                modifier = Modifier.size(20.dp),
                                tint = Color(0xFF4CAF50)
                            )
                        }
                    }
                    
                    Text(
                        text = "工号: $workId",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    Text(
                        text = phone,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    // Rating
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = Color(0xFFFFB300)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = rating.toString(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFFFFB300)
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Status toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        modifier = Modifier.size(12.dp),
                        shape = CircleShape,
                        color = getStatusColor(status)
                    ) {}
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    Text(
                        text = status.getDisplayName(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                
                Switch(
                    checked = status == CourierStatus.ONLINE,
                    onCheckedChange = { onToggleStatus() }
                )
            }
        }
    }
}

@Composable
private fun QuickStatsCard(
    totalOrders: Int,
    completedOrders: Int,
    totalEarnings: Double
) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "快速统计",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                QuickStatItem(
                    value = totalOrders.toString(),
                    label = "总订单",
                    icon = Icons.Default.Assignment,
                    color = MaterialTheme.colorScheme.primary
                )
                
                QuickStatItem(
                    value = completedOrders.toString(),
                    label = "已完成",
                    icon = Icons.Default.CheckCircle,
                    color = Color(0xFF4CAF50)
                )
                
                QuickStatItem(
                    value = "${(totalEarnings / 1000).toInt()}K",
                    label = "总收入",
                    icon = Icons.Default.AttachMoney,
                    color = Color(0xFFFFB300)
                )
            }
        }
    }
}

@Composable
private fun QuickStatItem(
    value: String,
    label: String,
    icon: ImageVector,
    color: androidx.compose.ui.graphics.Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(24.dp)
        )
        
        Spacer(modifier = Modifier.height(4.dp))
        
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
        
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileMenuItem(
    item: CourierProfileMenuItem,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = null,
                tint = if (item.id == "logout") {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.primary
                }
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Text(
                text = item.title,
                style = MaterialTheme.typography.titleMedium,
                color = if (item.id == "logout") {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.onSurface
                },
                modifier = Modifier.weight(1f)
            )
            
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

data class CourierProfileMenuItem(
    val id: String,
    val icon: ImageVector,
    val title: String
)

private val profileMenuItems = listOf(
    CourierProfileMenuItem("preferences", Icons.Default.Settings, "接单偏好"),
    CourierProfileMenuItem("documents", Icons.Default.Description, "认证文件"),
    CourierProfileMenuItem("earnings", Icons.Default.AttachMoney, "收入明细"),
    CourierProfileMenuItem("reports", Icons.Default.Assessment, "工作报表"),
    CourierProfileMenuItem("vehicle", Icons.Default.DirectionsCar, "车辆管理"),
    CourierProfileMenuItem("settings", Icons.Default.Settings, "应用设置"),
    CourierProfileMenuItem("help", Icons.Default.Help, "帮助中心"),
    CourierProfileMenuItem("logout", Icons.Default.ExitToApp, "退出登录")
)

private fun getStatusColor(status: CourierStatus): Color {
    return when (status) {
        CourierStatus.OFFLINE -> Color(0xFF9E9E9E)
        CourierStatus.ONLINE -> Color(0xFF4CAF50)
        CourierStatus.BUSY -> Color(0xFFFF9800)
        CourierStatus.UNAVAILABLE -> Color(0xFFF44336)
    }
}
