package com.mysplitwise.app.ui.groups

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
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
import com.mysplitwise.app.logic.Calculations
import com.mysplitwise.app.logic.Currency

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupDetailScreen(repository: AppStateRepository, groupId: String, onClose: () -> Unit) {
    val state by repository.state.collectAsState()
    val group = state.groups.firstOrNull { it.id == groupId } ?: run { onClose(); return }
    val members = group.memberIds.mapNotNull { id -> state.users.firstOrNull { it.id == id } }
    val debts = Calculations.groupDebts(group.memberIds, repository.baseExpenses, group.simplifyDebts)
    val groupExpenses = state.expenses.filter { it.groupId == groupId }.sortedByDescending { it.date }

    Scaffold(topBar = { TopAppBar(title = { Text(group.name) }) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Text("Balances", style = MaterialTheme.typography.titleMedium)
            if (debts.isEmpty()) {
                Text("Everyone's settled up.")
            } else {
                debts.forEach { debt ->
                    val from = state.users.firstOrNull { it.id == debt.from }
                    val to = state.users.firstOrNull { it.id == debt.to }
                    if (from != null && to != null) {
                        Text("${from.name} owes ${to.name} ${Currency.formatMoney(debt.amount, state.baseCurrency)}")
                    }
                }
            }

            Text("Expenses", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
            groupExpenses.forEach { expense ->
                Text("${expense.description} · ${Currency.formatMoney(expense.amount, expense.currency)}")
            }

            Text("Members", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
            members.forEach { member -> Text(member.name) }
        }
    }
}
