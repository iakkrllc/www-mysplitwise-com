package com.mysplitwise.app.ui.expenses

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.logic.Currency
import com.mysplitwise.app.logic.Split
import com.mysplitwise.app.logic.round2
import com.mysplitwise.app.model.ExpenseShare
import com.mysplitwise.app.model.User

enum class SplitMethod(val label: String) { EQUAL("Equal"), EXACT("Exact"), PERCENTAGE("%"), SHARES("Shares") }

data class SplitState(
    var payerId: String,
    var method: SplitMethod = SplitMethod.EQUAL,
    var rawValues: MutableMap<String, Double> = mutableMapOf(),
)

/** Builds the `shares` list for an expense — mirrors `SplitEditorView` (iOS) / `SplitEditor` (web), using the same [Split] math. */
fun computeShares(amount: Double, participants: List<User>, state: SplitState): List<ExpenseShare> {
    if (participants.isEmpty() || amount <= 0) return emptyList()
    val ids = participants.map { it.id }
    val owedAmounts = when (state.method) {
        SplitMethod.EQUAL -> Split.equal(amount, ids.size)
        SplitMethod.EXACT -> ids.map { state.rawValues[it] ?: 0.0 }
        SplitMethod.PERCENTAGE -> Split.byPercent(amount, ids.map { state.rawValues[it] ?: 0.0 })
        SplitMethod.SHARES -> Split.byShares(amount, ids.map { state.rawValues[it] ?: 0.0 })
    }
    val shares = ids.zip(owedAmounts).map { (id, owed) -> ExpenseShare(userId = id, paid = 0.0, owed = owed) }.toMutableList()
    val payerIdx = shares.indexOfFirst { it.userId == state.payerId }
    if (payerIdx >= 0) shares[payerIdx] = shares[payerIdx].copy(paid = amount)
    return shares
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SplitEditor(
    amount: Double,
    participants: List<User>,
    state: SplitState,
    onStateChange: (SplitState) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val computed = computeShares(amount, participants, state)

    Row(modifier = modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            SplitMethod.entries.forEachIndexed { index, method ->
                SegmentedButton(
                    selected = state.method == method,
                    onClick = { onStateChange(state.copy(method = method)) },
                    shape = SegmentedButtonDefaults.itemShape(index, SplitMethod.entries.size),
                ) { Text(method.label) }
            }
        }
    }

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = participants.firstOrNull { it.id == state.payerId }?.name ?: "",
            onValueChange = {},
            readOnly = true,
            label = { Text("Paid by") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth(),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            participants.forEach { user ->
                DropdownMenuItem(text = { Text(user.name) }, onClick = {
                    onStateChange(state.copy(payerId = user.id))
                    expanded = false
                })
            }
        }
    }

    participants.forEach { user ->
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
            Text(user.name, modifier = Modifier.weight(1f))
            when (state.method) {
                SplitMethod.EQUAL -> {
                    val owed = computed.firstOrNull { it.userId == user.id }?.owed ?: 0.0
                    Text(Currency.formatMoney(owed, "USD"))
                }
                else -> {
                    OutlinedTextField(
                        value = (state.rawValues[user.id] ?: 0.0).toString(),
                        onValueChange = { v ->
                            val parsed = v.toDoubleOrNull() ?: 0.0
                            val updated = state.rawValues.toMutableMap().apply { put(user.id, parsed) }
                            onStateChange(state.copy(rawValues = updated))
                        },
                        modifier = Modifier.width(100.dp),
                        singleLine = true,
                    )
                }
            }
        }
    }

    if (state.method == SplitMethod.EXACT) {
        val total = participants.sumOf { state.rawValues[it.id] ?: 0.0 }
        val diff = round2(amount - total)
        if (kotlin.math.abs(diff) > 0.001) {
            Text(
                if (diff > 0) "${Currency.formatMoney(diff, "USD")} left to assign" else "Over by ${Currency.formatMoney(-diff, "USD")}",
            )
        }
    }
}
