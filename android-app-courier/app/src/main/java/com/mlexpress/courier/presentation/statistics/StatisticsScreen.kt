package com.mlexpress.courier.presentation.statistics

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.courier.data.model.EarningsRecord
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatisticsScreen(
    navController: NavController,
    viewModel: StatisticsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    LaunchedEffect(Unit) {
        viewModel.loadStatistics()
    }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Header
        TopAppBar(
            title = { 
                Text(
                    text = "数据统计",
                    fontWeight = FontWeight.Bold
                ) 
            },
            actions = {
                IconButton(onClick = viewModel::refreshStatistics) {
                    Icon(Icons.Default.Refresh, contentDescription = "刷新")
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
                        Button(onClick = viewModel::loadStatistics) {
                            Text("重试")
                        }
                    }
                }
            }
            else -> {
                StatisticsContent(
                    uiState = uiState,
                    onWithdraw = viewModel::requestWithdrawal,
                    onViewEarningsDetails = {
                        navController.navigate("earnings_details")
                    }
                )
            }
        }
    }
}

@Composable
private fun StatisticsContent(
    uiState: StatisticsUiState,
    onWithdraw: (Double) -> Unit,
    onViewEarningsDetails: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Today's summary
        item {
            TodaySummaryCard(
                todayEarnings = uiState.todayEarnings,
                todayOrders = uiState.todayOrders,
                todayRating = uiState.todayRating,
                onlineHours = uiState.onlineHours
            )
        }
        
        // Earnings overview
        item {
            EarningsOverviewCard(
                totalEarnings = uiState.totalEarnings,
                availableBalance = uiState.availableBalance,
                pendingEarnings = uiState.pendingEarnings,
                onWithdraw = onWithdraw,
                onViewDetails = onViewEarningsDetails
            )
        }
        
        // Performance metrics
        item {
            PerformanceMetricsSection(
                totalOrders = uiState.totalOrders,
                completionRate = uiState.completionRate,
                averageRating = uiState.averageRating,
                onTimeRate = uiState.onTimeRate
            )
        }
        
        // Recent earnings
        item {
            Text(
                text = "最近收入",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
        }
        
        if (uiState.recentEarnings.isEmpty()) {
            item {
                EmptyEarningsCard()
            }
        } else {
            items(uiState.recentEarnings) { earning ->
                EarningsRecordCard(earning = earning)
            }
        }
    }
}

@Composable
private fun TodaySummaryCard(
    todayEarnings: Double,
    todayOrders: Int,
    todayRating: Float,
    onlineHours: Float
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Today,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "今日概览",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                StatisticItem(
                    value = "${todayEarnings.roundToInt()}",
                    unit = "MMK",
                    label = "今日收入",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                
                StatisticItem(
                    value = todayOrders.toString(),
                    unit = "单",
                    label = "完成订单",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                
                StatisticItem(
                    value = todayRating.toString(),
                    unit = "★",
                    label = "平均评分",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                
                StatisticItem(
                    value = onlineHours.toString(),
                    unit = "h",
                    label = "在线时长",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EarningsOverviewCard(
    totalEarnings: Double,
    availableBalance: Double,
    pendingEarnings: Double,
    onWithdraw: (Double) -> Unit,
    onViewDetails: () -> Unit
) {
    var showWithdrawDialog by remember { mutableStateOf(false) }
    
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "收入概览",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                
                TextButton(onClick = onViewDetails) {
                    Text("查看详情")
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Balance info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "可提现余额",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${availableBalance.roundToInt()} MMK",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "待结算",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${pendingEarnings.roundToInt()} MMK",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = { showWithdrawDialog = true },
                modifier = Modifier.fillMaxWidth(),
                enabled = availableBalance > 0
            ) {
                Icon(Icons.Default.AccountBalanceWallet, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("申请提现")
            }
        }
    }
    
    // Withdraw dialog
    if (showWithdrawDialog) {
        WithdrawDialog(
            availableBalance = availableBalance,
            onConfirm = { amount ->
                onWithdraw(amount)
                showWithdrawDialog = false
            },
            onDismiss = { showWithdrawDialog = false }
        )
    }
}

@Composable
private fun PerformanceMetricsSection(
    totalOrders: Int,
    completionRate: Float,
    averageRating: Float,
    onTimeRate: Float
) {
    Column {
        Text(
            text = "业绩指标",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(
                listOf(
                    MetricData("总订单", totalOrders.toString(), "单", Icons.Default.Assignment, Color(0xFF2196F3)),
                    MetricData("完成率", "${(completionRate * 100).roundToInt()}", "%", Icons.Default.CheckCircle, Color(0xFF4CAF50)),
                    MetricData("平均评分", averageRating.toString(), "★", Icons.Default.Star, Color(0xFFFFB300)),
                    MetricData("准时率", "${(onTimeRate * 100).roundToInt()}", "%", Icons.Default.Schedule, Color(0xFF9C27B0))
                )
            ) { metric ->
                MetricCard(metric = metric)
            }
        }
    }
}

@Composable
private fun MetricCard(metric: MetricData) {
    Card(
        modifier = Modifier.width(120.dp),
        colors = CardDefaults.cardColors(
            containerColor = metric.color.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = metric.icon,
                contentDescription = null,
                tint = metric.color,
                modifier = Modifier.size(24.dp)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "${metric.value}${metric.unit}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = metric.color
            )
            
            Text(
                text = metric.label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EarningsRecordCard(earning: EarningsRecord) {
    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(40.dp),
                shape = RoundedCornerShape(20.dp),
                color = getEarningsTypeColor(earning.type)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = getEarningsTypeIcon(earning.type),
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = Color.White
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = earning.description,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = formatDate(earning.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Text(
                text = "${if (earning.amount >= 0) "+" else ""}${earning.amount.roundToInt()} MMK",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = if (earning.amount >= 0) Color(0xFF4CAF50) else MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
private fun EmptyEarningsCard() {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.AttachMoney,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "暂无收入记录",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun WithdrawDialog(
    availableBalance: Double,
    onConfirm: (Double) -> Unit,
    onDismiss: () -> Unit
) {
    var withdrawAmount by remember { mutableStateOf("") }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("申请提现") },
        text = {
            Column {
                Text("可提现余额: ${availableBalance.roundToInt()} MMK")
                
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = withdrawAmount,
                    onValueChange = { withdrawAmount = it },
                    label = { Text("提现金额") },
                    suffix = { Text("MMK") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "• 最低提现金额: 10,000 MMK\n• 提现手续费: 2%\n• 到账时间: 1-3个工作日",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val amount = withdrawAmount.toDoubleOrNull()
                    if (amount != null && amount >= 10000 && amount <= availableBalance) {
                        onConfirm(amount)
                    }
                },
                enabled = withdrawAmount.toDoubleOrNull()?.let { it >= 10000 && it <= availableBalance } == true
            ) {
                Text("确认提现")
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
private fun StatisticItem(
    value: String,
    unit: String,
    label: String,
    color: androidx.compose.ui.graphics.Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            verticalAlignment = Alignment.Bottom
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = unit,
                style = MaterialTheme.typography.bodySmall,
                color = color.copy(alpha = 0.8f)
            )
        }
        
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color.copy(alpha = 0.7f)
        )
    }
}

data class MetricData(
    val label: String,
    val value: String,
    val unit: String,
    val icon: ImageVector,
    val color: Color
)

private fun getEarningsTypeColor(type: com.mlexpress.courier.data.model.EarningsType): Color {
    return when (type) {
        com.mlexpress.courier.data.model.EarningsType.ORDER_DELIVERY -> Color(0xFF4CAF50)
        com.mlexpress.courier.data.model.EarningsType.BONUS -> Color(0xFFFFB300)
        com.mlexpress.courier.data.model.EarningsType.PENALTY -> Color(0xFFF44336)
        com.mlexpress.courier.data.model.EarningsType.ADJUSTMENT -> Color(0xFF2196F3)
        com.mlexpress.courier.data.model.EarningsType.WITHDRAWAL -> Color(0xFF9C27B0)
    }
}

private fun getEarningsTypeIcon(type: com.mlexpress.courier.data.model.EarningsType): ImageVector {
    return when (type) {
        com.mlexpress.courier.data.model.EarningsType.ORDER_DELIVERY -> Icons.Default.LocalShipping
        com.mlexpress.courier.data.model.EarningsType.BONUS -> Icons.Default.Star
        com.mlexpress.courier.data.model.EarningsType.PENALTY -> Icons.Default.Remove
        com.mlexpress.courier.data.model.EarningsType.ADJUSTMENT -> Icons.Default.Tune
        com.mlexpress.courier.data.model.EarningsType.WITHDRAWAL -> Icons.Default.AccountBalanceWallet
    }
}

private fun formatDate(timestamp: Long): String {
    val formatter = SimpleDateFormat("MM-dd HH:mm", Locale.getDefault())
    return formatter.format(Date(timestamp))
}
