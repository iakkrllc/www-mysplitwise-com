package com.mysplitwise.app.ui.friends

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFriendScreen(repository: AppStateRepository, onDone: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add a friend") },
                navigationIcon = { TextButton(onClick = onDone) { Text("Cancel") } },
                actions = {
                    TextButton(
                        enabled = !isSaving && name.isNotBlank() && email.isNotBlank(),
                        onClick = {
                            isSaving = true
                            scope.launch {
                                try {
                                    repository.addFriend(name, email)
                                    onDone()
                                } catch (e: Exception) {
                                    errorMessage = e.message ?: "Couldn't add that friend"
                                } finally {
                                    isSaving = false
                                }
                            }
                        },
                    ) { Text(if (isSaving) "Saving…" else "Add") }
                },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Friend's name") }, modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = email, onValueChange = { email = it },
                label = { Text("Friend's email") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
            Text(
                "If they already have a mysplitwise account, you'll be connected instantly. If not, we'll connect you as soon as they join.",
                modifier = Modifier.padding(top = 8.dp),
            )
            errorMessage?.let { Text(it, modifier = Modifier.padding(top = 8.dp)) }
        }
    }
}
