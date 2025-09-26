package com.mlexpress.customer.presentation.order

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.customer.R
import com.mlexpress.customer.data.model.PackageType
import com.mlexpress.customer.data.model.PaymentType
import com.mlexpress.customer.data.model.ServiceType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateOrderScreen(
    navController: NavController,
    viewModel: CreateOrderViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { navController.navigateUp() }) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
            }
            
            Text(
                text = stringResource(R.string.order_create_title),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Error message
        uiState.errorMessage?.let { error ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
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
        }
        
        // Sender Information
        SenderInfoSection(
            senderName = uiState.senderName,
            senderPhone = uiState.senderPhone,
            senderAddress = uiState.senderAddress,
            onSenderNameChange = viewModel::updateSenderName,
            onSenderPhoneChange = viewModel::updateSenderPhone,
            onSenderAddressClick = { /* TODO: Open address picker */ }
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Receiver Information
        ReceiverInfoSection(
            receiverName = uiState.receiverName,
            receiverPhone = uiState.receiverPhone,
            receiverAddress = uiState.receiverAddress,
            onReceiverNameChange = viewModel::updateReceiverName,
            onReceiverPhoneChange = viewModel::updateReceiverPhone,
            onReceiverAddressClick = { /* TODO: Open address picker */ }
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Package Information
        PackageInfoSection(
            packageType = uiState.packageType,
            weight = uiState.weight,
            description = uiState.description,
            declaredValue = uiState.declaredValue,
            onPackageTypeChange = viewModel::updatePackageType,
            onWeightChange = viewModel::updateWeight,
            onDescriptionChange = viewModel::updateDescription,
            onDeclaredValueChange = viewModel::updateDeclaredValue
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Service Information
        ServiceInfoSection(
            serviceType = uiState.serviceType,
            isUrgent = uiState.isUrgent,
            paymentMethod = uiState.paymentMethod,
            onServiceTypeChange = viewModel::updateServiceType,
            onUrgentChange = viewModel::updateUrgent,
            onPaymentMethodChange = viewModel::updatePaymentMethod
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Cost Calculation
        if (uiState.costCalculation != null) {
            CostCalculationSection(
                distance = uiState.costCalculation.distance,
                baseCost = uiState.costCalculation.baseCost,
                serviceFee = uiState.costCalculation.serviceFee,
                totalCost = uiState.costCalculation.totalCost
            )
            
            Spacer(modifier = Modifier.height(24.dp))
        }
        
        // Calculate Cost Button
        if (uiState.canCalculateCost && uiState.costCalculation == null) {
            Button(
                onClick = viewModel::calculateCost,
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isCalculating
            ) {
                if (uiState.isCalculating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text("计算费用")
            }
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Place Order Button
        Button(
            onClick = viewModel::createOrder,
            modifier = Modifier.fillMaxWidth(),
            enabled = uiState.canPlaceOrder && !uiState.isCreatingOrder
        ) {
            if (uiState.isCreatingOrder) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(stringResource(R.string.order_place_order))
        }
        
        Spacer(modifier = Modifier.height(32.dp))
    }
    
    // Handle order creation success
    LaunchedEffect(uiState.orderCreated) {
        if (uiState.orderCreated) {
            navController.navigate("order_success/${uiState.createdOrderId}") {
                popUpTo("create_order") { inclusive = true }
            }
        }
    }
}

@Composable
private fun SenderInfoSection(
    senderName: String,
    senderPhone: String,
    senderAddress: String,
    onSenderNameChange: (String) -> Unit,
    onSenderPhoneChange: (String) -> Unit,
    onSenderAddressClick: () -> Unit
) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.order_sender_info),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            OutlinedTextField(
                value = senderName,
                onValueChange = onSenderNameChange,
                label = { Text(stringResource(R.string.order_sender_name)) },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedTextField(
                value = senderPhone,
                onValueChange = onSenderPhoneChange,
                label = { Text(stringResource(R.string.order_sender_phone)) },
                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedTextField(
                value = senderAddress,
                onValueChange = { },
                label = { Text(stringResource(R.string.order_sender_address)) },
                leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = onSenderAddressClick) {
                        Icon(Icons.Default.Search, contentDescription = "Select Address")
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                readOnly = true,
                maxLines = 2
            )
        }
    }
}

@Composable
private fun ReceiverInfoSection(
    receiverName: String,
    receiverPhone: String,
    receiverAddress: String,
    onReceiverNameChange: (String) -> Unit,
    onReceiverPhoneChange: (String) -> Unit,
    onReceiverAddressClick: () -> Unit
) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.order_receiver_info),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            OutlinedTextField(
                value = receiverName,
                onValueChange = onReceiverNameChange,
                label = { Text(stringResource(R.string.order_receiver_name)) },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedTextField(
                value = receiverPhone,
                onValueChange = onReceiverPhoneChange,
                label = { Text(stringResource(R.string.order_receiver_phone)) },
                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedTextField(
                value = receiverAddress,
                onValueChange = { },
                label = { Text(stringResource(R.string.order_receiver_address)) },
                leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = onReceiverAddressClick) {
                        Icon(Icons.Default.Search, contentDescription = "Select Address")
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                readOnly = true,
                maxLines = 2
            )
        }
    }
}

@Composable
private fun PackageInfoSection(
    packageType: PackageType,
    weight: String,
    description: String,
    declaredValue: String,
    onPackageTypeChange: (PackageType) -> Unit,
    onWeightChange: (String) -> Unit,
    onDescriptionChange: (String) -> Unit,
    onDeclaredValueChange: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.order_package_info),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Package Type Dropdown
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded }
            ) {
                OutlinedTextField(
                    value = packageType.getDisplayName(),
                    onValueChange = { },
                    readOnly = true,
                    label = { Text(stringResource(R.string.order_package_type)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    PackageType.values().forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type.getDisplayName()) },
                            onClick = {
                                onPackageTypeChange(type)
                                expanded = false
                            }
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedTextField(
                value = weight,
                onValueChange = onWeightChange,
                label = { Text(stringResource(R.string.order_package_weight)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                suffix = { Text("kg") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedTextField(
                value = description,
                onValueChange = onDescriptionChange,
                label = { Text(stringResource(R.string.order_package_description)) },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedTextField(
                value = declaredValue,
                onValueChange = onDeclaredValueChange,
                label = { Text(stringResource(R.string.order_package_value)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                suffix = { Text("MMK") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }
    }
}

@Composable
private fun ServiceInfoSection(
    serviceType: ServiceType,
    isUrgent: Boolean,
    paymentMethod: PaymentType,
    onServiceTypeChange: (ServiceType) -> Unit,
    onUrgentChange: (Boolean) -> Unit,
    onPaymentMethodChange: (PaymentType) -> Unit
) {
    var serviceExpanded by remember { mutableStateOf(false) }
    var paymentExpanded by remember { mutableStateOf(false) }
    
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.order_service_info),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Service Type
            ExposedDropdownMenuBox(
                expanded = serviceExpanded,
                onExpandedChange = { serviceExpanded = !serviceExpanded }
            ) {
                OutlinedTextField(
                    value = serviceType.getDisplayName(),
                    onValueChange = { },
                    readOnly = true,
                    label = { Text(stringResource(R.string.order_service_type)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = serviceExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                
                ExposedDropdownMenu(
                    expanded = serviceExpanded,
                    onDismissRequest = { serviceExpanded = false }
                ) {
                    ServiceType.values().forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type.getDisplayName()) },
                            onClick = {
                                onServiceTypeChange(type)
                                serviceExpanded = false
                            }
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Urgent checkbox
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = isUrgent,
                    onCheckedChange = onUrgentChange
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("加急配送 (+额外费用)")
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Payment Method
            ExposedDropdownMenuBox(
                expanded = paymentExpanded,
                onExpandedChange = { paymentExpanded = !paymentExpanded }
            ) {
                OutlinedTextField(
                    value = getPaymentMethodDisplayName(paymentMethod),
                    onValueChange = { },
                    readOnly = true,
                    label = { Text(stringResource(R.string.order_payment_method)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = paymentExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                
                ExposedDropdownMenu(
                    expanded = paymentExpanded,
                    onDismissRequest = { paymentExpanded = false }
                ) {
                    PaymentType.values().forEach { type ->
                        DropdownMenuItem(
                            text = { Text(getPaymentMethodDisplayName(type)) },
                            onClick = {
                                onPaymentMethodChange(type)
                                paymentExpanded = false
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CostCalculationSection(
    distance: Double,
    baseCost: Double,
    serviceFee: Double,
    totalCost: Double
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.order_cost_calculation),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "距离:",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "${distance.format(1)} km",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "基础费用:",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "${baseCost.toInt()} MMK",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "服务费:",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "${serviceFee.toInt()} MMK",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            
            Divider(
                modifier = Modifier.padding(vertical = 8.dp),
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.3f)
            )
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "总费用:",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "${totalCost.toInt()} MMK",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}

private fun getPaymentMethodDisplayName(paymentType: PaymentType): String {
    return when (paymentType) {
        PaymentType.CASH_ON_DELIVERY -> "货到付款"
        PaymentType.KBZ_PAY -> "KBZ Pay"
        PaymentType.WAVE_MONEY -> "Wave Money"
        PaymentType.CB_PAY -> "CB Pay"
        PaymentType.AYA_PAY -> "AYA Pay"
    }
}

private fun Double.format(decimals: Int): String {
    return "%.${decimals}f".format(this)
}
