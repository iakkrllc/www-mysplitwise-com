package com.mysplitwise.app.ui.expenses

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import com.mysplitwise.app.logic.Currency
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseDetailScreen(repository: AppStateRepository, expenseId: String, onClose: () -> Unit) {
    val state by repository.state.collectAsState()
    val expense = state.expenses.firstOrNull { it.id == expenseId } ?: run { onClose(); return }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Expense") },
                navigationIcon = { TextButton(onClick = onClose) { Text("Close") } },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Text(if (expense.isSettlement) "Payment" else expense.description, style = MaterialTheme.typography.headlineSmall)
            Text(Currency.formatMoney(expense.amount, expense.currency), style = MaterialTheme.typography.headlineMedium)
            Text(expense.date, color = MaterialTheme.colorScheme.onSurfaceVariant)

            Text("Split", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
            expense.shares.forEach { share ->
                val user = state.users.firstOrNull { it.id == share.userId }
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Text(user?.name ?: "Unknown", modifier = Modifier.weight(1f))
                    Text("owes ${Currency.formatMoney(share.owed, expense.currency)}")
                }
            }

            expense.notes?.takeIf { it.isNotEmpty() }?.let { notes ->
                Text("Notes", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
                Text(notes)
            }

            Button(
                onClick = {
                    scope.launch {
                        repository.deleteExpense(expense.id)
                        onClose()
                    }
                },
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Color(0xFFE63879)),
                modifier = Modifier.padding(top = 24.dp),
            ) { Text("Delete expense") }
        }
    }
}
