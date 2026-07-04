package com.mysplitwise.app.ui.groups

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
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
import com.mysplitwise.app.model.GroupType
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateEditGroupScreen(repository: AppStateRepository, onDone: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(GroupType.TRIP) }
    var selectedIds by remember { mutableStateOf(setOf<String>()) }
    val scope = rememberCoroutineScope()
    val currentUserId = repository.currentUser?.id
    val friends = repository.state.value.users.filterNot { it.id == currentUserId }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New group") },
                navigationIcon = { TextButton(onClick = onDone) { Text("Cancel") } },
                actions = {
                    TextButton(
                        enabled = name.isNotBlank(),
                        onClick = {
                            scope.launch {
                                repository.addGroup(name, type, selectedIds.toList())
                                onDone()
                            }
                        },
                    ) { Text("Create") }
                },
            )
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).padding(16.dp)) {
            item {
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text("Group name") }, modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                    GroupType.entries.forEachIndexed { index, gt ->
                        SegmentedButton(
                            selected = type == gt,
                            onClick = { type = gt },
                            shape = SegmentedButtonDefaults.itemShape(index, GroupType.entries.size),
                        ) { Text(gt.name.lowercase().replaceFirstChar { it.uppercase() }) }
                    }
                }
            }
            item { Text("Members") }
            items(friends) { friend ->
                Row(
                    modifier = Modifier.fillMaxWidth()
                        .clickable { selectedIds = if (selectedIds.contains(friend.id)) selectedIds - friend.id else selectedIds + friend.id }
                        .padding(vertical = 8.dp),
                ) {
                    Text(friend.name, modifier = Modifier.weight(1f))
                    if (selectedIds.contains(friend.id)) Icon(Icons.Filled.Check, contentDescription = null)
                }
            }
        }
    }
}
