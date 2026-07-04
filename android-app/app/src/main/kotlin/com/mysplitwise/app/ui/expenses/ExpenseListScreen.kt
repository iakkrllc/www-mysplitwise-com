package com.mysplitwise.app.ui.expenses

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
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
import com.mysplitwise.app.logic.Categories
import com.mysplitwise.app.logic.Currency

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseListScreen(repository: AppStateRepository, onAddExpense: () -> Unit, onExpenseClick: (String) -> Unit) {
    val state by repository.state.collectAsState()
    val expenses = state.expenses.sortedByDescending { it.date }

    Scaffold(
        topBar = { TopAppBar(title = { Text("All expenses") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddExpense) { Icon(Icons.Filled.Add, contentDescription = "Add expense") }
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
            items(expenses) { expense ->
                val category = Categories.get(expense.category)
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { onExpenseClick(expense.id) }.padding(16.dp),
                ) {
                    Icon(category.icon, contentDescription = null, tint = com.mysplitwise.app.ui.dashboard.parseHexColor(category.colorHex))
                    androidx.compose.foundation.layout.Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(if (expense.isSettlement) "Payment" else expense.description)
                        Text(expense.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(Currency.formatMoney(expense.amount, expense.currency))
                }
            }
        }
    }
}
