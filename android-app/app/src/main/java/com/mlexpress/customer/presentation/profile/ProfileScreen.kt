package com.mlexpress.customer.presentation.profile

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.mlexpress.customer.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    navController: NavController,
    viewModel: ProfileViewModel = hiltViewModel()
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
            ProfileHeader(
                userName = uiState.userName,
                userPhone = uiState.userPhone,
                userEmail = uiState.userEmail
            )
        }
        
        // Profile menu items
        items(profileMenuItems) { item ->
            ProfileMenuItem(
                item = item,
                onClick = {
                        when (item.id) {
                            "language" -> navController.navigate("language_settings")
                            "logout" -> viewModel.logout()
                            else -> {
                                // TODO: Handle other menu items
                            }
                        }
                }
            )
        }
    }
}

@Composable
private fun ProfileHeader(
    userName: String,
    userPhone: String,
    userEmail: String?
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
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
            
            // User info
            Column {
                Text(
                    text = userName.ifEmpty { "User" },
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                
                Text(
                    text = userPhone,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                if (!userEmail.isNullOrEmpty()) {
                    Text(
                        text = userEmail,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileMenuItem(
    item: ProfileMenuItem,
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
                text = stringResource(item.title),
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

data class ProfileMenuItem(
    val id: String,
    val icon: ImageVector,
    val title: Int
)

private val profileMenuItems = listOf(
    ProfileMenuItem("personal_info", Icons.Default.Person, R.string.profile_personal_info),
    ProfileMenuItem("addresses", Icons.Default.LocationOn, R.string.profile_addresses),
    ProfileMenuItem("payment_methods", Icons.Default.Payment, R.string.profile_payment_methods),
    ProfileMenuItem("order_history", Icons.Default.History, R.string.profile_order_history),
    ProfileMenuItem("notifications", Icons.Default.Notifications, R.string.profile_notifications),
    ProfileMenuItem("language", Icons.Default.Language, R.string.profile_language),
    ProfileMenuItem("help_support", Icons.Default.Help, R.string.profile_help_support),
    ProfileMenuItem("about", Icons.Default.Info, R.string.profile_about),
    ProfileMenuItem("logout", Icons.Default.ExitToApp, R.string.profile_logout)
)
