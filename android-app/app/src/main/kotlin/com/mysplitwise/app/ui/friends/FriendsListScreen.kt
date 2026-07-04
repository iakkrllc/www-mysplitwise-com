package com.mysplitwise.app.ui.friends

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import com.mysplitwise.app.logic.Calculations
import com.mysplitwise.app.ui.dashboard.BalanceRow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsListScreen(repository: AppStateRepository, onAddFriend: () -> Unit) {
    val state by repository.state.collectAsState()
    val currentUserId = repository.currentUser?.id
    val friends = state.users.filterNot { it.id == currentUserId }
    val baseExpenses = repository.baseExpenses

    Scaffold(
        topBar = { TopAppBar(title = { Text("Friends") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddFriend) { Icon(Icons.Filled.PersonAdd, contentDescription = "Add friend") }
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
            items(friends) { friend ->
                if (currentUserId != null) {
                    val bal = Calculations.balanceBetween(currentUserId, friend.id, baseExpenses)
                    BalanceRow(
                        user = friend, amount = bal, currency = state.baseCurrency,
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )
                }
            }
        }
    }
}
