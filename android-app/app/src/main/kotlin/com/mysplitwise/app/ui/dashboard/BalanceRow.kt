package com.mysplitwise.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.logic.Currency
import com.mysplitwise.app.model.User

@Composable
fun BalanceRow(user: User, amount: Double, currency: String, modifier: Modifier = Modifier) {
    val owed = amount > 0
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(parseHexColor(user.avatarColor)),
            contentAlignment = Alignment.Center,
        ) {
            Text(user.name.take(1), color = Color.White, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(user.name, fontWeight = FontWeight.Bold)
            Text(
                if (owed) "owes you" else "you owe",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            Currency.formatMoney(kotlin.math.abs(amount), currency),
            fontWeight = FontWeight.Bold,
            color = if (owed) Color(0xFF22A85A) else Color(0xFFE63879),
        )
    }
}

/** Parses a "#RRGGBB" brand color string (opaque) into a Compose [Color]. */
fun parseHexColor(hex: String): Color {
    val cleaned = hex.removePrefix("#")
    return Color(("FF$cleaned").toLong(16))
}
