package com.mysplitwise.app.ui.account

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import com.mysplitwise.app.logic.Currency
import com.mysplitwise.app.network.SyncApi
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountSettingsScreen(repository: AppStateRepository, onSignOut: () -> Unit, onDeleteAccount: () -> Unit) {
    val state by repository.state.collectAsState()
    val user = repository.currentUser
    var name by remember(user?.name) { mutableStateOf(user?.name ?: "") }
    var expanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(topBar = { TopAppBar(title = { Text("Account") }) }) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
            user?.let {
                Text("Email: ${it.email}", modifier = Modifier.padding(top = 8.dp))
                it.supportId?.let { id -> Text("Support ID: $id") }
            }
            Button(
                enabled = name.isNotBlank() && name != user?.name,
                onClick = { scope.launch { repository.updateProfile(SyncApi.ProfilePatch(name = name)) } },
                modifier = Modifier.padding(top = 8.dp),
            ) { Text("Save name") }

            ExposedDropdownMenuBox(
                expanded = expanded, onExpandedChange = { expanded = it },
                modifier = Modifier.padding(top = 16.dp),
            ) {
                OutlinedTextField(
                    value = state.baseCurrency, onValueChange = {}, readOnly = true,
                    label = { Text("Base currency") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.fillMaxWidth(),
                )
                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    Currency.all.forEach { currency ->
                        DropdownMenuItem(text = { Text("${currency.symbol} ${currency.code}") }, onClick = {
                            scope.launch { repository.setBaseCurrency(currency.code) }
                            expanded = false
                        })
                    }
                }
            }

            Button(
                onClick = onSignOut,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE63879)),
                modifier = Modifier.padding(top = 24.dp),
            ) { Text("Sign out") }

            Button(
                onClick = onDeleteAccount,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE63879)),
                modifier = Modifier.padding(top = 8.dp),
            ) { Text("Delete account") }
        }
    }
}
