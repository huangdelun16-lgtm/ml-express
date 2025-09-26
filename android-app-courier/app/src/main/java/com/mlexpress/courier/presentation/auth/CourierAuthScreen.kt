package com.mlexpress.courier.presentation.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mlexpress.courier.R
import com.mlexpress.courier.data.model.VehicleType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierAuthScreen(
    onAuthSuccess: () -> Unit,
    viewModel: CourierAuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    LaunchedEffect(uiState.isAuthenticated) {
        if (uiState.isAuthenticated) {
            onAuthSuccess()
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(48.dp))
        
        // Logo
        Image(
            painter = painterResource(id = R.drawable.ic_courier_logo),
            contentDescription = "ML Express Courier",
            modifier = Modifier.size(120.dp)
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Title
        Text(
            text = "ML Express 骑手端",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.primary
        )
        
        Text(
            text = "专业配送，值得信赖",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(48.dp))
        
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
        
        // Content based on current step
        when (uiState.currentStep) {
            CourierAuthStep.PHONE_INPUT -> PhoneInputContent(
                isLoading = uiState.isLoading,
                onSendOtp = viewModel::sendOtp
            )
            CourierAuthStep.OTP_VERIFICATION -> OtpVerificationContent(
                phoneNumber = uiState.phoneNumber,
                isLoading = uiState.isLoading,
                onVerifyOtp = viewModel::verifyOtp,
                onResendOtp = viewModel::resendOtp,
                onBack = viewModel::goBackToPhoneInput
            )
            CourierAuthStep.REGISTRATION -> CourierRegistrationContent(
                isLoading = uiState.isLoading,
                onRegister = viewModel::register,
                onBack = viewModel::goBackToOtpVerification
            )
            CourierAuthStep.DOCUMENT_UPLOAD -> DocumentUploadContent(
                isLoading = uiState.isLoading,
                onUploadDocuments = viewModel::uploadDocuments,
                onSkip = viewModel::skipDocumentUpload
            )
            CourierAuthStep.TRAINING -> TrainingContent(
                isLoading = uiState.isLoading,
                onCompleteTraining = viewModel::completeTraining
            )
            CourierAuthStep.COMPLETED -> {
                // This will be handled by LaunchedEffect above
            }
        }
    }
}

@Composable
private fun PhoneInputContent(
    isLoading: Boolean,
    onSendOtp: (String) -> Unit
) {
    var phoneNumber by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current
    
    Column {
        OutlinedTextField(
            value = phoneNumber,
            onValueChange = { phoneNumber = it },
            label = { Text("骑手手机号") },
            placeholder = { Text("请输入注册手机号") },
            leadingIcon = {
                Icon(Icons.Default.Phone, contentDescription = null)
            },
            supportingText = {
                Text("格式: 09xxxxxxxxx")
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Phone,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    if (phoneNumber.isNotEmpty()) {
                        onSendOtp(phoneNumber)
                    }
                }
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = { onSendOtp(phoneNumber) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading && phoneNumber.isNotEmpty()
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text("发送验证码")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Info card
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "骑手注册须知",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "• 需要提供身份证和驾驶证\n• 需要通过安全培训考试\n• 年龄需在18-60岁之间\n• 需要有合法的配送车辆",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}

@Composable
private fun OtpVerificationContent(
    phoneNumber: String,
    isLoading: Boolean,
    onVerifyOtp: (String) -> Unit,
    onResendOtp: () -> Unit,
    onBack: () -> Unit
) {
    var otp by remember { mutableStateOf("") }
    var remainingTime by remember { mutableStateOf(60) }
    val focusManager = LocalFocusManager.current
    val focusRequester = remember { FocusRequester() }
    
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        while (remainingTime > 0) {
            kotlinx.coroutines.delay(1000)
            remainingTime--
        }
    }
    
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
            }
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "验证手机号",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "验证码已发送至 $phoneNumber",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        OutlinedTextField(
            value = otp,
            onValueChange = { if (it.length <= 6) otp = it },
            label = { Text("请输入6位验证码") },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Number,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    if (otp.length == 6) {
                        onVerifyOtp(otp)
                    }
                }
            ),
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(focusRequester),
            enabled = !isLoading
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = { onVerifyOtp(otp) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading && otp.length == 6
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text("验证并继续")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        TextButton(
            onClick = onResendOtp,
            modifier = Modifier.fillMaxWidth(),
            enabled = remainingTime == 0 && !isLoading
        ) {
            Text(
                if (remainingTime > 0) {
                    "${remainingTime}秒后重新发送"
                } else {
                    "重新发送验证码"
                }
            )
        }
    }
}

@Composable
private fun CourierRegistrationContent(
    isLoading: Boolean,
    onRegister: (String, String?, String, String, VehicleType, String) -> Unit,
    onBack: () -> Unit
) {
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var workId by remember { mutableStateOf("") }
    var identityCard by remember { mutableStateOf("") }
    var vehicleType by remember { mutableStateOf(VehicleType.MOTORCYCLE) }
    var vehiclePlate by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }
    
    val focusManager = LocalFocusManager.current
    
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
            }
            
            Text(
                text = "骑手信息注册",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f)
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Personal Info
        OutlinedTextField(
            value = fullName,
            onValueChange = { fullName = it },
            label = { Text("真实姓名") },
            leadingIcon = {
                Icon(Icons.Default.Person, contentDescription = null)
            },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("邮箱 (可选)") },
            leadingIcon = {
                Icon(Icons.Default.Email, contentDescription = null)
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = workId,
            onValueChange = { workId = it },
            label = { Text("工号 (如有)") },
            leadingIcon = {
                Icon(Icons.Default.Badge, contentDescription = null)
            },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = identityCard,
            onValueChange = { identityCard = it },
            label = { Text("身份证号码") },
            leadingIcon = {
                Icon(Icons.Default.CreditCard, contentDescription = null)
            },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Vehicle Type
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded }
        ) {
            OutlinedTextField(
                value = vehicleType.getDisplayName(),
                onValueChange = { },
                readOnly = true,
                label = { Text("车辆类型") },
                leadingIcon = {
                    Icon(Icons.Default.DirectionsCar, contentDescription = null)
                },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(),
                enabled = !isLoading
            )
            
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                VehicleType.values().forEach { type ->
                    DropdownMenuItem(
                        text = { Text(type.getDisplayName()) },
                        onClick = {
                            vehicleType = type
                            expanded = false
                        }
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = vehiclePlate,
            onValueChange = { vehiclePlate = it },
            label = { Text("车牌号码") },
            leadingIcon = {
                Icon(Icons.Default.LocalShipping, contentDescription = null)
            },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    if (isFormValid(fullName, identityCard, vehiclePlate)) {
                        onRegister(fullName, email.ifEmpty { null }, workId, identityCard, vehicleType, vehiclePlate)
                    }
                }
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = { 
                onRegister(fullName, email.ifEmpty { null }, workId, identityCard, vehicleType, vehiclePlate)
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading && isFormValid(fullName, identityCard, vehiclePlate)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text("注册骑手账户")
        }
    }
}

@Composable
private fun DocumentUploadContent(
    isLoading: Boolean,
    onUploadDocuments: () -> Unit,
    onSkip: () -> Unit
) {
    Column {
        Text(
            text = "上传认证文件",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "为了确保服务质量，请上传以下文件进行审核：",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Document upload cards
        val documents = listOf(
            "身份证正反面" to Icons.Default.CreditCard,
            "驾驶证" to Icons.Default.DirectionsCar,
            "行驶证" to Icons.Default.Description,
            "健康证明" to Icons.Default.HealthAndSafety
        )
        
        documents.forEach { (title, icon) ->
            DocumentUploadCard(
                title = title,
                icon = icon,
                onUpload = { /* TODO: Implement file upload */ }
            )
            Spacer(modifier = Modifier.height(12.dp))
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = onUploadDocuments,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text("提交审核")
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        TextButton(
            onClick = onSkip,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        ) {
            Text("稍后上传")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DocumentUploadCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onUpload: () -> Unit
) {
    Card(
        onClick = onUpload,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f)
            )
            
            Icon(
                Icons.Default.CloudUpload,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun TrainingContent(
    isLoading: Boolean,
    onCompleteTraining: () -> Unit
) {
    Column {
        Text(
            text = "安全培训",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "请完成以下培训模块，确保安全配送：",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Training modules
        val trainingModules = listOf(
            "交通安全规则" to Icons.Default.Traffic,
            "包裹处理规范" to Icons.Default.Inventory,
            "客户服务标准" to Icons.Default.CustomerService,
            "应急处理流程" to Icons.Default.Emergency
        )
        
        trainingModules.forEach { (title, icon) ->
            TrainingModuleCard(
                title = title,
                icon = icon,
                isCompleted = false,
                onClick = { /* TODO: Open training module */ }
            )
            Spacer(modifier = Modifier.height(12.dp))
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = onCompleteTraining,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text("完成培训")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TrainingModuleCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isCompleted: Boolean,
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
                imageVector = icon,
                contentDescription = null,
                tint = if (isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f)
            )
            
            if (isCompleted) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
            } else {
                Icon(
                    Icons.Default.PlayArrow,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private fun isFormValid(fullName: String, identityCard: String, vehiclePlate: String): Boolean {
    return fullName.trim().isNotEmpty() && 
           identityCard.trim().isNotEmpty() && 
           vehiclePlate.trim().isNotEmpty()
}
