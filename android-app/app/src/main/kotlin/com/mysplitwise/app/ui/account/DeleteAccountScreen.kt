package com.mysplitwise.app.ui.account

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeleteAccountScreen(repository: AppStateRepository, onCancel: () -> Unit, onDeleted: suspend () -> Unit) {
    var confirmText by remember { mutableStateOf("") }
    var isDeleting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Delete account") },
                navigationIcon = { TextButton(onClick = onCancel) { Text("Cancel") } },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            Text("This permanently deletes your mysplitwise login and all data associated with it. This can't be undone.")
            Text("Type DELETE to confirm.", modifier = Modifier.padding(top = 16.dp))
            OutlinedTextField(value = confirmText, onValueChange = { confirmText = it }, modifier = Modifier.fillMaxWidth())
            errorMessage?.let { Text(it) }
            Button(
                enabled = !isDeleting && confirmText == "DELETE",
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE63879)),
                onClick = {
                    isDeleting = true
                    scope.launch {
                        try {
                            repository.deleteAccount()
                            onDeleted()
                        } catch (e: Exception) {
                            errorMessage = "Couldn't delete your account — try again"
                            isDeleting = false
                        }
                    }
                },
                modifier = Modifier.padding(top = 16.dp),
            ) { Text(if (isDeleting) "Deleting…" else "Delete") }
        }
    }
}
