package com.mysplitwise.app.ui.dashboard

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import com.mysplitwise.app.logic.Calculations
import com.mysplitwise.app.logic.Currency
import kotlin.math.abs

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(repository: AppStateRepository) {
    val state by repository.state.collectAsState()

    LaunchedEffect(Unit) { repository.refresh() }

    val friends = state.users.filterNot { it.id == repository.currentUser?.id }
    val baseExpenses = repository.baseExpenses
    val summary = repository.currentUser?.let { me ->
        Calculations.summaryForUser(me.id, friends.map { it.id }, baseExpenses)
    } ?: Calculations.BalanceSummary(0.0, 0.0, 0.0)

    Scaffold(topBar = { TopAppBar(title = { Text("mysplitwise") }) }) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
            item {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        if (summary.net >= 0) "You are owed overall" else "You owe overall",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        Currency.formatMoney(abs(summary.net), state.baseCurrency),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            item {
                Text(
                    "Friends",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
            if (friends.isEmpty()) {
                item {
                    Text(
                        "Add a friend to start splitting expenses.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            } else {
                items(friends) { friend ->
                    val me = repository.currentUser
                    if (me != null) {
                        val bal = Calculations.balanceBetween(me.id, friend.id, baseExpenses)
                        if (abs(bal) > 0.01) {
                            BalanceRow(
                                user = friend, amount = bal, currency = state.baseCurrency,
                                modifier = Modifier.padding(horizontal = 16.dp),
                            )
                        }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}
