package com.mlexpress.customer.presentation.profile

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.customer.R
import com.mlexpress.customer.data.model.PaymentMethod
import com.mlexpress.customer.data.model.PaymentType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentMethodsScreen(
    navController: NavController,
    viewModel: PaymentMethodsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showAddDialog by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        viewModel.loadPaymentMethods()
    }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Top App Bar
        TopAppBar(
            title = { Text(stringResource(R.string.payment_methods_title)) },
            navigationIcon = {
                IconButton(onClick = { navController.navigateUp() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = { showAddDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Add Payment Method")
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
                        Button(onClick = viewModel::loadPaymentMethods) {
                            Text("重试")
                        }
                    }
                }
            }
            else -> {
                PaymentMethodsContent(
                    paymentMethods = uiState.paymentMethods,
                    onSetDefault = viewModel::setDefaultPaymentMethod,
                    onDelete = viewModel::deletePaymentMethod
                )
            }
        }
    }
    
    // Add Payment Method Dialog
    if (showAddDialog) {
        AddPaymentMethodDialog(
            onConfirm = { type, accountNumber, accountName ->
                viewModel.addPaymentMethod(type, accountNumber, accountName)
                showAddDialog = false
            },
            onDismiss = { showAddDialog = false }
        )
    }
}

@Composable
private fun PaymentMethodsContent(
    paymentMethods: List<PaymentMethod>,
    onSetDefault: (String) -> Unit,
    onDelete: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (paymentMethods.isEmpty()) {
            item {
                EmptyPaymentMethodsCard()
            }
        } else {
            items(paymentMethods) { paymentMethod ->
                PaymentMethodCard(
                    paymentMethod = paymentMethod,
                    onSetDefault = { onSetDefault(paymentMethod.id) },
                    onDelete = { onDelete(paymentMethod.id) }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PaymentMethodCard(
    paymentMethod: PaymentMethod,
    onSetDefault: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }
    
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Payment method icon
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(12.dp),
                color = getPaymentTypeColor(paymentMethod.type)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = getPaymentTypeIcon(paymentMethod.type),
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // Payment method info
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = getPaymentTypeName(paymentMethod.type),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    
                    if (paymentMethod.isDefault) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.primary
                        ) {
                            Text(
                                text = "默认",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        }
                    }
                }
                
                if (paymentMethod.type != PaymentType.CASH_ON_DELIVERY) {
                    paymentMethod.accountName?.let { accountName ->
                        Text(
                            text = accountName,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    paymentMethod.accountNumber?.let { accountNumber ->
                        Text(
                            text = maskAccountNumber(accountNumber),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            
            // Menu button
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "More options")
                }
                
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    if (!paymentMethod.isDefault) {
                        DropdownMenuItem(
                            text = { Text("设为默认") },
                            onClick = {
                                onSetDefault()
                                showMenu = false
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Star, contentDescription = null)
                            }
                        )
                    }
                    
                    if (paymentMethod.type != PaymentType.CASH_ON_DELIVERY) {
                        DropdownMenuItem(
                            text = { Text("删除") },
                            onClick = {
                                onDelete()
                                showMenu = false
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Delete,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyPaymentMethodsCard() {
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
                Icons.Default.Payment,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "暂无支付方式",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Text(
                text = "点击右上角"+"添加支付方式",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun AddPaymentMethodDialog(
    onConfirm: (PaymentType, String?, String?) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedType by remember { mutableStateOf(PaymentType.KBZ_PAY) }
    var accountNumber by remember { mutableStateOf("") }
    var accountName by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.payment_add_method)) },
        text = {
            Column {
                // Payment type selection
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded }
                ) {
                    OutlinedTextField(
                        value = getPaymentTypeName(selectedType),
                        onValueChange = { },
                        readOnly = true,
                        label = { Text("支付方式") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        PaymentType.values().filter { it != PaymentType.CASH_ON_DELIVERY }.forEach { type ->
                            DropdownMenuItem(
                                text = { Text(getPaymentTypeName(type)) },
                                onClick = {
                                    selectedType = type
                                    expanded = false
                                }
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Account name
                OutlinedTextField(
                    value = accountName,
                    onValueChange = { accountName = it },
                    label = { Text("账户姓名") },
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Account number
                OutlinedTextField(
                    value = accountNumber,
                    onValueChange = { accountNumber = it },
                    label = { Text("账户号码") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (accountName.isNotEmpty() && accountNumber.isNotEmpty()) {
                        onConfirm(selectedType, accountNumber, accountName)
                    }
                },
                enabled = accountName.isNotEmpty() && accountNumber.isNotEmpty()
            ) {
                Text("添加")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

private fun getPaymentTypeName(type: PaymentType): String {
    return when (type) {
        PaymentType.CASH_ON_DELIVERY -> "货到付款"
        PaymentType.KBZ_PAY -> "KBZ Pay"
        PaymentType.WAVE_MONEY -> "Wave Money"
        PaymentType.CB_PAY -> "CB Pay"
        PaymentType.AYA_PAY -> "AYA Pay"
    }
}

private fun getPaymentTypeIcon(type: PaymentType): ImageVector {
    return when (type) {
        PaymentType.CASH_ON_DELIVERY -> Icons.Default.Money
        PaymentType.KBZ_PAY -> Icons.Default.AccountBalance
        PaymentType.WAVE_MONEY -> Icons.Default.Waves
        PaymentType.CB_PAY -> Icons.Default.CreditCard
        PaymentType.AYA_PAY -> Icons.Default.AccountBalanceWallet
    }
}

private fun getPaymentTypeColor(type: PaymentType): androidx.compose.ui.graphics.Color {
    return when (type) {
        PaymentType.CASH_ON_DELIVERY -> androidx.compose.ui.graphics.Color(0xFF4CAF50)
        PaymentType.KBZ_PAY -> androidx.compose.ui.graphics.Color(0xFF2196F3)
        PaymentType.WAVE_MONEY -> androidx.compose.ui.graphics.Color(0xFF9C27B0)
        PaymentType.CB_PAY -> androidx.compose.ui.graphics.Color(0xFFFF9800)
        PaymentType.AYA_PAY -> androidx.compose.ui.graphics.Color(0xFFF44336)
    }
}

private fun maskAccountNumber(accountNumber: String): String {
    return if (accountNumber.length > 4) {
        "**** **** ${accountNumber.takeLast(4)}"
    } else {
        accountNumber
    }
}
