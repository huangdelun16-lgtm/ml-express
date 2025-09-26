package com.mlexpress.customer.presentation.order

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.customer.R
import com.mlexpress.customer.data.model.Order
import com.mlexpress.customer.data.model.OrderStatus
import com.mlexpress.customer.data.model.TrackingUpdate
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailsScreen(
    navController: NavController,
    orderId: String,
    viewModel: OrderDetailsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    LaunchedEffect(orderId) {
        viewModel.loadOrderDetails(orderId)
    }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Top App Bar
        TopAppBar(
            title = { Text(stringResource(R.string.order_details_title)) },
            navigationIcon = {
                IconButton(onClick = { navController.navigateUp() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = { /* TODO: Share order */ }) {
                    Icon(Icons.Default.Share, contentDescription = "Share")
                }
            }
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
            uiState.errorMessage != null -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = uiState.errorMessage,
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadOrderDetails(orderId) }) {
                            Text("重试")
                        }
                    }
                }
            }
            uiState.order != null -> {
                OrderDetailsContent(
                    order = uiState.order,
                    onCancelOrder = viewModel::cancelOrder,
                    onRateOrder = { rating, feedback ->
                        viewModel.rateOrder(rating, feedback)
                    },
                    onCallCourier = { phone ->
                        // TODO: Make phone call
                    },
                    onTrackLocation = {
                        // TODO: Navigate to tracking map
                    }
                )
            }
        }
    }
}

@Composable
private fun OrderDetailsContent(
    order: Order,
    onCancelOrder: (String) -> Unit,
    onRateOrder: (Int, String?) -> Unit,
    onCallCourier: (String) -> Unit,
    onTrackLocation: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Order Status Card
        OrderStatusCard(order = order)
        
        // Order Info Card
        OrderInfoCard(order = order)
        
        // Addresses Card
        AddressesCard(order = order)
        
        // Package Info Card
        PackageInfoCard(order = order)
        
        // Cost Breakdown Card
        CostBreakdownCard(order = order)
        
        // Courier Info Card (if available)
        order.courierInfo?.let { courierInfo ->
            CourierInfoCard(
                courierInfo = courierInfo,
                onCallCourier = onCallCourier,
                onTrackLocation = onTrackLocation
            )
        }
        
        // Tracking Timeline
        if (order.trackingUpdates.isNotEmpty()) {
            TrackingTimelineCard(updates = order.trackingUpdates)
        }
        
        // Action Buttons
        ActionButtonsSection(
            order = order,
            onCancelOrder = onCancelOrder,
            onRateOrder = onRateOrder
        )
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun OrderStatusCard(order: Order) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = getStatusColor(order.status)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = getStatusIcon(order.status),
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = MaterialTheme.colorScheme.onPrimary
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = order.status.getDisplayName(),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimary
                )
                
                order.estimatedDeliveryTime?.let { estimatedTime ->
                    Text(
                        text = "预计送达: ${formatDateTime(estimatedTime)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                    )
                }
            }
        }
    }
}

@Composable
private fun OrderInfoCard(order: Order) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "订单信息",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            InfoRow("订单号", order.orderNumber)
            InfoRow("下单时间", formatDateTime(order.createdAt))
            InfoRow("服务类型", order.serviceType.getDisplayName())
            if (order.isUrgent) {
                InfoRow("紧急程度", "加急配送")
            }
            InfoRow("支付方式", getPaymentMethodName(order.paymentMethod))
            InfoRow("支付状态", getPaymentStatusName(order.paymentStatus))
        }
    }
}

@Composable
private fun AddressesCard(order: Order) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "配送地址",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Sender Address
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
            
            // Receiver Address
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
}

@Composable
private fun PackageInfoCard(order: Order) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "包裹信息",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            InfoRow("包裹类型", order.packageType.getDisplayName())
            InfoRow("重量", "${order.weight} kg")
            order.dimensions?.let { dimensions ->
                InfoRow("尺寸", dimensions)
            }
            order.description?.let { description ->
                InfoRow("描述", description)
            }
            order.declaredValue?.let { value ->
                InfoRow("申报价值", "${value.toInt()} MMK")
            }
        }
    }
}

@Composable
private fun CostBreakdownCard(order: Order) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "费用明细",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            InfoRow("配送距离", "${order.distance.format(1)} km")
            InfoRow("基础费用", "${order.baseCost.toInt()} MMK")
            InfoRow("服务费", "${order.serviceFee.toInt()} MMK")
            
            Divider(modifier = Modifier.padding(vertical = 8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "总费用",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${order.totalCost.toInt()} MMK",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun CourierInfoCard(
    courierInfo: com.mlexpress.customer.data.model.CourierInfo,
    onCallCourier: (String) -> Unit,
    onTrackLocation: () -> Unit
) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "配送员信息",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = courierInfo.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "${courierInfo.vehicleType} • ${courierInfo.vehiclePlate}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = courierInfo.rating.toString(),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { onCallCourier(courierInfo.phone) },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("联系配送员")
                }
                
                Button(
                    onClick = onTrackLocation,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("位置跟踪")
                }
            }
        }
    }
}

@Composable
private fun TrackingTimelineCard(updates: List<TrackingUpdate>) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "物流跟踪",
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
private fun TrackingUpdateItem(update: TrackingUpdate) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        Surface(
            modifier = Modifier.size(12.dp),
            shape = RoundedCornerShape(6.dp),
            color = getStatusColor(update.status)
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
private fun ActionButtonsSection(
    order: Order,
    onCancelOrder: (String) -> Unit,
    onRateOrder: (Int, String?) -> Unit
) {
    var showCancelDialog by remember { mutableStateOf(false) }
    var showRatingDialog by remember { mutableStateOf(false) }
    
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        when (order.status) {
            OrderStatus.PENDING, OrderStatus.CONFIRMED -> {
                OutlinedButton(
                    onClick = { showCancelDialog = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Cancel, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.order_cancel_order))
                }
            }
            OrderStatus.DELIVERED -> {
                if (order.rating == null) {
                    Button(
                        onClick = { showRatingDialog = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Star, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.order_rate_service))
                    }
                }
            }
            else -> {
                // No actions available for other statuses
            }
        }
    }
    
    // Cancel Order Dialog
    if (showCancelDialog) {
        CancelOrderDialog(
            onConfirm = { reason ->
                onCancelOrder(reason)
                showCancelDialog = false
            },
            onDismiss = { showCancelDialog = false }
        )
    }
    
    // Rating Dialog
    if (showRatingDialog) {
        RatingDialog(
            onConfirm = { rating, feedback ->
                onRateOrder(rating, feedback)
                showRatingDialog = false
            },
            onDismiss = { showRatingDialog = false }
        )
    }
}

@Composable
private fun CancelOrderDialog(
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var reason by remember { mutableStateOf("") }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("取消订单") },
        text = {
            Column {
                Text("请告诉我们取消订单的原因：")
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    placeholder = { Text("取消原因（可选）") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(reason.ifEmpty { "用户取消" }) }
            ) {
                Text("确认取消")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("不取消")
            }
        }
    )
}

@Composable
private fun RatingDialog(
    onConfirm: (Int, String?) -> Unit,
    onDismiss: () -> Unit
) {
    var rating by remember { mutableStateOf(5) }
    var feedback by remember { mutableStateOf("") }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("评价服务") },
        text = {
            Column {
                Text("请为本次配送服务评分：")
                Spacer(modifier = Modifier.height(16.dp))
                
                // Star rating
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    repeat(5) { index ->
                        IconButton(
                            onClick = { rating = index + 1 }
                        ) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                tint = if (index < rating) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.outline
                                }
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedTextField(
                    value = feedback,
                    onValueChange = { feedback = it },
                    placeholder = { Text("评价内容（可选）") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(rating, feedback.ifEmpty { null }) }
            ) {
                Text("提交评价")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
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

private fun getPaymentMethodName(paymentType: com.mlexpress.customer.data.model.PaymentType): String {
    return when (paymentType) {
        com.mlexpress.customer.data.model.PaymentType.CASH_ON_DELIVERY -> "货到付款"
        com.mlexpress.customer.data.model.PaymentType.KBZ_PAY -> "KBZ Pay"
        com.mlexpress.customer.data.model.PaymentType.WAVE_MONEY -> "Wave Money"
        com.mlexpress.customer.data.model.PaymentType.CB_PAY -> "CB Pay"
        com.mlexpress.customer.data.model.PaymentType.AYA_PAY -> "AYA Pay"
    }
}

private fun getPaymentStatusName(paymentStatus: com.mlexpress.customer.data.model.PaymentStatus): String {
    return when (paymentStatus) {
        com.mlexpress.customer.data.model.PaymentStatus.PENDING -> "待支付"
        com.mlexpress.customer.data.model.PaymentStatus.PAID -> "已支付"
        com.mlexpress.customer.data.model.PaymentStatus.FAILED -> "支付失败"
        com.mlexpress.customer.data.model.PaymentStatus.REFUNDED -> "已退款"
    }
}

private fun formatDateTime(timestamp: Long): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
    return formatter.format(Date(timestamp))
}

private fun Double.format(decimals: Int): String {
    return "%.${decimals}f".format(this)
}
