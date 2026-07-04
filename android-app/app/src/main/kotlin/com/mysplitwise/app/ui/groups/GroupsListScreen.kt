package com.mysplitwise.app.ui.groups

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupsListScreen(repository: AppStateRepository, onCreateGroup: () -> Unit, onGroupClick: (String) -> Unit) {
    val state by repository.state.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Groups") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreateGroup) { Icon(Icons.Filled.Add, contentDescription = "Create group") }
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
            items(state.groups) { group ->
                Column(
                    modifier = Modifier.fillMaxWidth().clickable { onGroupClick(group.id) }.padding(16.dp),
                ) {
                    Text(group.name)
                    Text(
                        "${group.memberIds.size} members",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
