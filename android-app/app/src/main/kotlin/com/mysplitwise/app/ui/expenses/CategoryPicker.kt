package com.mysplitwise.app.ui.expenses

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mysplitwise.app.logic.Categories
import com.mysplitwise.app.ui.dashboard.parseHexColor

@Composable
fun CategoryPicker(selectedId: String, onSelect: (String) -> Unit, modifier: Modifier = Modifier) {
    val grouped = Categories.all.groupBy { it.group }
    LazyColumn(modifier = modifier) {
        grouped.forEach { (group, categories) ->
            item {
                Text(
                    group,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
            items(categories) { category ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(category.id) }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(category.icon, contentDescription = null, tint = parseHexColor(category.colorHex))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(category.displayName, modifier = Modifier.weight(1f))
                    if (selectedId == category.id) {
                        Icon(Icons.Filled.Check, contentDescription = "Selected")
                    }
                }
            }
        }
    }
}
