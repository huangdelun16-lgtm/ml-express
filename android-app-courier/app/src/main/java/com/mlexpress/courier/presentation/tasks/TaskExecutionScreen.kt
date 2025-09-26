package com.mlexpress.courier.presentation.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.courier.data.model.CourierOrder
import com.mlexpress.courier.data.model.OrderStatus
import com.mlexpress.courier.data.model.TaskType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskExecutionScreen(
    navController: NavController,
    viewModel: TaskExecutionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    LaunchedEffect(Unit) {
        viewModel.loadCurrentTasks()
    }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Header
        TaskExecutionHeader(
            activeTasksCount = uiState.activeTasks.size,
            todayCompletedCount = uiState.todayCompletedCount,
            onRefresh = viewModel::refreshTasks
        )
        
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.activeTasks.isEmpty() -> {
                EmptyTasksContent()
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.activeTasks) { order ->
                        ActiveTaskCard(
                            order = order,
                            onNavigate = { orderId, taskType ->
                                when (taskType) {
                                    TaskType.PICKUP -> navController.navigate("pickup_task/$orderId")
                                    TaskType.DELIVERY -> navController.navigate("delivery_task/$orderId")
                                }
                            },
                            onViewDetails = { orderId ->
                                navController.navigate("task_details/$orderId")
                            }
                        )
                    }
                    
                    item {
                        Spacer(modifier = Modifier.height(80.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun TaskExecutionHeader(
    activeTasksCount: Int,
    todayCompletedCount: Int,
    onRefresh: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "我的任务",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "进行中: $activeTasksCount",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    
                    Spacer(modifier = Modifier.width(16.dp))
                    
                    Text(
                        text = "今日完成: $todayCompletedCount",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            
            IconButton(onClick = onRefresh) {
                Icon(Icons.Default.Refresh, contentDescription = "刷新")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ActiveTaskCard(
    order: CourierOrder,
    onNavigate: (String, TaskType) -> Unit,
    onViewDetails: (String) -> Unit
) {
    val taskType = when (order.status) {
        OrderStatus.ACCEPTED -> TaskType.PICKUP
        OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.ARRIVED -> TaskType.DELIVERY
        else -> TaskType.PICKUP
    }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when (order.status) {
                OrderStatus.ACCEPTED -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                OrderStatus.PICKED_UP -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
                OrderStatus.IN_TRANSIT -> MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
                else -> MaterialTheme.colorScheme.surface
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Task header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        modifier = Modifier.size(32.dp),
                        shape = RoundedCornerShape(16.dp),
                        color = order.status.getColor()
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = getTaskIcon(taskType),
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = Color.White
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.width(12.dp))
                    
                    Column {
                        Text(
                            text = getTaskTitle(taskType),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = order.orderNumber,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = order.status.getColor()
                ) {
                    Text(
                        text = order.status.getDisplayName(),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Current task address
            val (currentAddress, currentName, currentPhone) = when (taskType) {
                TaskType.PICKUP -> Triple(order.senderAddress, order.senderName, order.senderPhone)
                TaskType.DELIVERY -> Triple(order.receiverAddress, order.receiverName, order.receiverPhone)
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                crossAxisAlignment = Alignment.Top
            ) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "$currentName $currentPhone",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = currentAddress,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { onViewDetails(order.id) },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        Icons.Default.Visibility,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("详情")
                }
                
                Button(
                    onClick = { onNavigate(order.id, taskType) },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        Icons.Default.Navigation,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        when (taskType) {
                            TaskType.PICKUP -> "去取件"
                            TaskType.DELIVERY -> "去送件"
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyTasksContent() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.TaskAlt,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "暂无进行中的任务",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "完成当前任务后，新任务将显示在这里",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
        )
    }
}

private fun getTaskIcon(taskType: TaskType): androidx.compose.ui.graphics.vector.ImageVector {
    return when (taskType) {
        TaskType.PICKUP -> Icons.Default.GetApp
        TaskType.DELIVERY -> Icons.Default.LocalShipping
    }
}

private fun getTaskTitle(taskType: TaskType): String {
    return when (taskType) {
        TaskType.PICKUP -> "取件任务"
        TaskType.DELIVERY -> "送件任务"
    }
}
