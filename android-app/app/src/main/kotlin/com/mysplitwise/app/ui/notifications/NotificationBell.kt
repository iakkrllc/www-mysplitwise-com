package com.mysplitwise.app.ui.notifications

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import com.mysplitwise.app.logic.Calculations
import com.mysplitwise.app.logic.Currency

/**
 * Trimmed Phase 1 notification screen: new settlements received + simple
 * owe/owed threshold nudges. No recurring-due/comments/AI nudges yet (Phase
 * 2+) and no per-type preference toggles UI.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationBell(repository: AppStateRepository) {
    val state by repository.state.collectAsState()
    val currentUserId = repository.currentUser?.id

    LaunchedEffect(Unit) { repository.setNotificationsRead() }

    val paymentNotifs = state.expenses.filter { it.isSettlement }.mapNotNull { expense ->
        val payee = expense.shares.firstOrNull { it.owed > 0.001 }
        val payer = expense.shares.firstOrNull { it.paid > 0.001 }
        val payerUser = payer?.let { p -> state.users.firstOrNull { it.id == p.userId } }
        if (payee?.userId == currentUserId && payerUser != null) {
            "${payerUser.name} paid you ${Currency.formatMoney(expense.amount, expense.currency)}"
        } else null
    }
    val friends = state.users.filterNot { it.id == currentUserId }
    val balanceNotifs = friends.mapNotNull { friend ->
        val bal = currentUserId?.let { Calculations.balanceBetween(it, friend.id, repository.baseExpenses) } ?: 0.0
        when {
            bal > 0.5 -> "${friend.name} owes you ${Currency.formatMoney(bal, state.baseCurrency)}"
            bal < -0.5 -> "You owe ${friend.name} ${Currency.formatMoney(-bal, state.baseCurrency)}"
            else -> null
        }
    }
    val notifs = paymentNotifs + balanceNotifs

    Scaffold(topBar = { TopAppBar(title = { Text("Notifications") }) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            if (notifs.isEmpty()) {
                Text("You're all caught up.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                notifs.forEach { notif -> Text(notif, modifier = Modifier.padding(vertical = 8.dp)) }
            }
        }
    }
}
