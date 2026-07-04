package com.mysplitwise.app.ui.expenses

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
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import com.mysplitwise.app.logic.Categories
import com.mysplitwise.app.logic.Dates
import com.mysplitwise.app.logic.round2
import com.mysplitwise.app.network.SyncApi
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditExpenseScreen(
    repository: AppStateRepository,
    groupId: String?,
    preselectedFriendId: String?,
    onDone: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val state by repository.state.collectAsState()
    val candidateParticipants = remember(groupId) {
        if (groupId != null) {
            repository.getGroup(groupId)?.memberIds?.mapNotNull { repository.getUser(it) } ?: emptyList()
        } else {
            state.users
        }
    }

    var description by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("") }
    var categoryId by remember { mutableStateOf("general") }
    var showCategoryPicker by remember { mutableStateOf(false) }
    var selectedIds by remember {
        mutableStateOf(
            buildSet {
                add(repository.currentUser?.id ?: "")
                preselectedFriendId?.let { add(it) }
                if (groupId != null) addAll(candidateParticipants.map { it.id })
            },
        )
    }
    val splitState = remember { SplitEditorStateHolder(repository.currentUser?.id ?: "") }

    val participants = candidateParticipants.filter { selectedIds.contains(it.id) }
    val amount = amountText.toDoubleOrNull() ?: 0.0
    val category = Categories.get(categoryId)

    if (showCategoryPicker) {
        Scaffold(topBar = { TopAppBar(title = { Text("Category") }) }) { padding ->
            CategoryPicker(
                selectedId = categoryId,
                onSelect = { categoryId = it; showCategoryPicker = false },
                modifier = Modifier.padding(padding),
            )
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add expense") },
                navigationIcon = { TextButton(onClick = onDone) { Text("Cancel") } },
                actions = {
                    TextButton(
                        enabled = description.isNotBlank() && amount > 0 && participants.size >= 2,
                        onClick = {
                            scope.launch {
                                val shares = computeShares(amount, participants, splitState.toSplitState())
                                repository.addExpense(
                                    SyncApi.NewExpense(
                                        description = description.trim(),
                                        amount = round2(amount),
                                        currency = state.baseCurrency,
                                        category = categoryId,
                                        date = Dates.todayISO(),
                                        groupId = groupId,
                                        shares = shares,
                                    ),
                                )
                                onDone()
                            }
                        },
                    ) { Text("Save") }
                },
            )
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).padding(16.dp)) {
            item {
                OutlinedTextField(
                    value = description, onValueChange = { description = it },
                    label = { Text("Description") }, modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = amountText, onValueChange = { amountText = it },
                    label = { Text("Amount") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
            }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp).clickable { showCategoryPicker = true },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(category.icon, contentDescription = null)
                    Text(" ${category.displayName}", modifier = Modifier.weight(1f))
                }
            }
            item { Text("Split with", modifier = Modifier.padding(vertical = 8.dp)) }
            items(candidateParticipants) { user ->
                Row(
                    modifier = Modifier.fillMaxWidth()
                        .clickable {
                            selectedIds = if (selectedIds.contains(user.id)) selectedIds - user.id else selectedIds + user.id
                        }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(user.name, modifier = Modifier.weight(1f))
                    if (selectedIds.contains(user.id)) Icon(Icons.Filled.Check, contentDescription = null)
                }
            }
            if (participants.size >= 2 && amount > 0) {
                item {
                    SplitEditor(
                        amount = amount, participants = participants, state = splitState.toSplitState(),
                        onStateChange = { splitState.update(it) },
                        modifier = Modifier.padding(top = 16.dp),
                    )
                }
            }
        }
    }
}

/** Small mutable holder so [SplitState] survives recomposition without extra ceremony. */
private class SplitEditorStateHolder(initialPayerId: String) {
    private var state = SplitState(payerId = initialPayerId)
    fun toSplitState() = state
    fun update(newState: SplitState) { state = newState }
}
