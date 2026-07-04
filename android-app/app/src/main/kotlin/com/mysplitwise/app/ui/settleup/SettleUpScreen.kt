package com.mysplitwise.app.ui.settleup

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.data.AppStateRepository
import com.mysplitwise.app.logic.PaymentLinks
import com.mysplitwise.app.model.User
import com.mysplitwise.app.network.SyncApi
import kotlinx.coroutines.launch

/**
 * Records a payment and, if the recipient has a payment handle on file,
 * offers to open Venmo/PayPal/Cash App with the amount pre-filled. mysplitwise
 * never processes the payment itself — only the deep link.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettleUpScreen(repository: AppStateRepository, counterpart: User, suggestedAmount: Double, onDone: () -> Unit) {
    var amountText by remember { mutableStateOf(String.format("%.2f", kotlin.math.abs(suggestedAmount))) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val amount = amountText.toDoubleOrNull() ?: 0.0
    val currentUserId = repository.currentUser?.id ?: ""

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settle up with ${counterpart.name}") },
                navigationIcon = { TextButton(onClick = onDone) { Text("Cancel") } },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            OutlinedTextField(
                value = amountText, onValueChange = { amountText = it },
                label = { Text("Amount") }, modifier = Modifier.fillMaxWidth(),
            )

            if (suggestedAmount < 0) {
                val options = PaymentLinks.payOptionsFor(counterpart, amount, "mysplitwise settle up")
                if (options.isEmpty()) {
                    Text("${counterpart.name} hasn't added a payment handle yet — this will just mark the balance as settled.")
                } else {
                    options.forEach { option ->
                        TextButton(onClick = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(option.url)))
                        }) { Text(option.label) }
                    }
                }
            }

            Button(
                enabled = amount > 0,
                onClick = {
                    scope.launch {
                        val payment = if (suggestedAmount < 0) {
                            SyncApi.Payment(fromId = currentUserId, toId = counterpart.id, amount = amount, currency = repository.state.value.baseCurrency)
                        } else {
                            SyncApi.Payment(fromId = counterpart.id, toId = currentUserId, amount = amount, currency = repository.state.value.baseCurrency)
                        }
                        repository.addSettlements(listOf(payment))
                        onDone()
                    }
                },
                modifier = Modifier.padding(top = 16.dp),
            ) { Text("Mark as paid") }
        }
    }
}
