package com.mlexpress.customer.presentation.orders

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.customer.R
import com.mlexpress.customer.data.model.Order
import com.mlexpress.customer.data.model.OrderStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    navController: NavController,
    viewModel: OrdersViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    LaunchedEffect(Unit) {
        viewModel.loadOrders()
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.orders_title),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            
            IconButton(onClick = { /* TODO: Show filter options */ }) {
                Icon(Icons.Default.FilterList, contentDescription = "Filter")
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Status tabs
        OrderStatusTabs(
            selectedStatus = uiState.selectedStatus,
            onStatusSelected = viewModel::selectStatus
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Orders list
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.orders.isEmpty() -> {
                EmptyOrdersContent()
            }
            else -> {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.orders) { order ->
                        OrderCard(
                            order = order,
                            onClick = {
                                navController.navigate("order_details/${order.id}")
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderStatusTabs(
    selectedStatus: OrderStatusFilter,
    onStatusSelected: (OrderStatusFilter) -> Unit
) {
    val tabs = listOf(
        OrderStatusFilter.ALL to stringResource(R.string.orders_all),
        OrderStatusFilter.ACTIVE to stringResource(R.string.orders_active),
        OrderStatusFilter.COMPLETED to stringResource(R.string.orders_completed),
        OrderStatusFilter.CANCELLED to stringResource(R.string.orders_cancelled)
    )
    
    ScrollableTabRow(
        selectedTabIndex = tabs.indexOfFirst { it.first == selectedStatus },
        edgePadding = 0.dp
    ) {
        tabs.forEach { (status, title) ->
            Tab(
                selected = selectedStatus == status,
                onClick = { onStatusSelected(status) },
                text = { Text(title) }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OrderCard(
    order: Order,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Order header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = order.orderNumber,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = getStatusColor(order.status)
                ) {
                    Text(
                        text = order.status.getDisplayName(),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Addresses
            Text(
                text = "From: ${order.senderAddress}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
            Text(
                text = "To: ${order.receiverAddress}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatDate(order.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Text(
                    text = "${order.totalCost.toInt()} MMK",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun EmptyOrdersContent() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = stringResource(R.string.orders_empty),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = stringResource(R.string.orders_empty_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun getStatusColor(status: OrderStatus): androidx.compose.ui.graphics.Color {
    return when (status) {
        OrderStatus.PENDING -> MaterialTheme.colorScheme.secondary
        OrderStatus.CONFIRMED -> MaterialTheme.colorScheme.primary
        OrderStatus.PICKED_UP -> MaterialTheme.colorScheme.tertiary
        OrderStatus.IN_TRANSIT -> MaterialTheme.colorScheme.primary
        OrderStatus.DELIVERING -> MaterialTheme.colorScheme.tertiary
        OrderStatus.DELIVERED -> androidx.compose.ui.graphics.Color(0xFF4CAF50)
        OrderStatus.CANCELLED -> MaterialTheme.colorScheme.error
        OrderStatus.RETURNED -> MaterialTheme.colorScheme.error
    }
}

private fun formatDate(timestamp: Long): String {
    val formatter = java.text.SimpleDateFormat("MMM dd, yyyy", java.util.Locale.getDefault())
    return formatter.format(java.util.Date(timestamp))
}
