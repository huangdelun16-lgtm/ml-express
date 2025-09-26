package com.mlexpress.customer.presentation.tracking

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.customer.R
import com.mlexpress.customer.data.model.OrderStatus
import com.mlexpress.customer.data.remote.dto.OrderTrackingResponse
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackingScreen(
    navController: NavController,
    viewModel: TrackingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var orderNumber by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Header
        Text(
            text = stringResource(R.string.tracking_title),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Search input
        OutlinedTextField(
            value = orderNumber,
            onValueChange = { orderNumber = it },
            label = { Text(stringResource(R.string.tracking_enter_id)) },
            placeholder = { Text("MDY202412190001") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = null)
            },
            keyboardOptions = KeyboardOptions(
                imeAction = ImeAction.Search
            ),
            keyboardActions = KeyboardActions(
                onSearch = {
                    focusManager.clearFocus()
                    if (orderNumber.isNotEmpty()) {
                        viewModel.trackOrder(orderNumber)
                    }
                }
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !uiState.isLoading
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Search button
        Button(
            onClick = {
                if (orderNumber.isNotEmpty()) {
                    viewModel.trackOrder(orderNumber)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = orderNumber.isNotEmpty() && !uiState.isLoading
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            } else {
                Icon(Icons.Default.Search, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(stringResource(R.string.tracking_search))
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Error message
        uiState.errorMessage?.let { error ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Text(
                    text = error,
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Tracking result
        uiState.trackingResult?.let { result ->
            TrackingResultContent(
                trackingResult = result,
                onViewDetails = { orderId ->
                    navController.navigate("order_details/$orderId")
                }
            )
        }
        
        // Empty state
        if (!uiState.isLoading && uiState.trackingResult == null && uiState.errorMessage == null) {
            EmptyTrackingState()
        }
    }
}

@Composable
private fun TrackingResultContent(
    trackingResult: OrderTrackingResponse,
    onViewDetails: (String) -> Unit
) {
    val order = trackingResult.order
    
    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Order Status Card
        Card(
            colors = CardDefaults.cardColors(
                containerColor = getStatusColor(OrderStatus.valueOf(order.status))
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = getStatusIcon(OrderStatus.valueOf(order.status)),
                    contentDescription = null,
                    modifier = Modifier.size(32.dp),
                    tint = MaterialTheme.colorScheme.onPrimary
                )
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = OrderStatus.valueOf(order.status).getDisplayName(),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    
                    Text(
                        text = "订单号: ${order.orderNumber}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                    )
                }
            }
        }
        
        // Delivery Info Card
        Card {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "配送信息",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // From Address
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    crossAxisAlignment = Alignment.Top
                ) {
                    Surface(
                        modifier = Modifier.size(32.dp),
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.primary
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = "寄",
                                color = MaterialTheme.colorScheme.onPrimary,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.width(12.dp))
                    
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "${order.senderName} ${order.senderPhone}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = order.senderAddress,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // To Address
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    crossAxisAlignment = Alignment.Top
                ) {
                    Surface(
                        modifier = Modifier.size(32.dp),
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.secondary
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = "收",
                                color = MaterialTheme.colorScheme.onSecondary,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.width(12.dp))
                    
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "${order.receiverName} ${order.receiverPhone}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = order.receiverAddress,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
        
        // Courier Location (if available)
        trackingResult.courierLocation?.let { location ->
            CourierLocationCard(location = location)
        }
        
        // Tracking Timeline
        if (order.trackingUpdates.isNotEmpty()) {
            TrackingTimelineCard(updates = order.trackingUpdates)
        }
        
        // View Details Button
        Button(
            onClick = { onViewDetails(order.id) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Visibility, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("查看完整订单详情")
        }
    }
}

@Composable
private fun CourierLocationCard(
    location: com.mlexpress.customer.data.remote.dto.CourierLocationDto
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onTertiaryContainer
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.tracking_courier_location),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onTertiaryContainer
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "配送员正在前往目的地",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onTertiaryContainer
            )
            
            Text(
                text = "最后更新: ${formatDateTime(location.lastUpdated)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
private fun TrackingTimelineCard(
    updates: List<com.mlexpress.customer.data.remote.dto.TrackingUpdateDto>
) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.tracking_order_timeline),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            updates.sortedByDescending { it.timestamp }.forEach { update ->
                TrackingUpdateItem(update = update)
            }
        }
    }
}

@Composable
private fun TrackingUpdateItem(
    update: com.mlexpress.customer.data.remote.dto.TrackingUpdateDto
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        Surface(
            modifier = Modifier.size(12.dp),
            shape = RoundedCornerShape(6.dp),
            color = getStatusColor(OrderStatus.valueOf(update.status))
        ) {}
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = update.description,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = formatDateTime(update.timestamp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            update.location?.let { location ->
                Text(
                    text = location,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun EmptyTrackingState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.Search,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "输入订单号查询物流信息",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "订单号格式如：MDY202412190001",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
        )
    }
}

private fun getStatusColor(status: OrderStatus): androidx.compose.ui.graphics.Color {
    return when (status) {
        OrderStatus.PENDING -> androidx.compose.ui.graphics.Color(0xFFFF9800)
        OrderStatus.CONFIRMED -> androidx.compose.ui.graphics.Color(0xFF2196F3)
        OrderStatus.PICKED_UP -> androidx.compose.ui.graphics.Color(0xFF9C27B0)
        OrderStatus.IN_TRANSIT -> androidx.compose.ui.graphics.Color(0xFF00BCD4)
        OrderStatus.DELIVERING -> androidx.compose.ui.graphics.Color(0xFF4CAF50)
        OrderStatus.DELIVERED -> androidx.compose.ui.graphics.Color(0xFF388E3C)
        OrderStatus.CANCELLED -> androidx.compose.ui.graphics.Color(0xFFF44336)
        OrderStatus.RETURNED -> androidx.compose.ui.graphics.Color(0xFFFF5722)
    }
}

private fun getStatusIcon(status: OrderStatus): androidx.compose.ui.graphics.vector.ImageVector {
    return when (status) {
        OrderStatus.PENDING -> Icons.Default.Schedule
        OrderStatus.CONFIRMED -> Icons.Default.CheckCircle
        OrderStatus.PICKED_UP -> Icons.Default.LocalShipping
        OrderStatus.IN_TRANSIT -> Icons.Default.LocalShipping
        OrderStatus.DELIVERING -> Icons.Default.LocalShipping
        OrderStatus.DELIVERED -> Icons.Default.Done
        OrderStatus.CANCELLED -> Icons.Default.Cancel
        OrderStatus.RETURNED -> Icons.Default.Undo
    }
}

private fun formatDateTime(timestamp: String): String {
    return try {
        // Assume ISO format from server
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("MM-dd HH:mm", Locale.getDefault())
        val date = inputFormat.parse(timestamp)
        outputFormat.format(date ?: Date())
    } catch (e: Exception) {
        timestamp
    }
}
