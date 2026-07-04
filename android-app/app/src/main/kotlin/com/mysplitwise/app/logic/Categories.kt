package com.mysplitwise.app.logic

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Expense categories — port of `src/lib/categories.tsx`. `icon` is a Material
 * Icons equivalent chosen to match (not copy) the web's lucide-react icons.
 */
data class CategoryInfo(
    val id: String,
    val displayName: String,
    val group: String,
    val icon: ImageVector,
    val colorHex: String,
)

object Categories {
    val all: List<CategoryInfo> by lazy {
        listOf(
            CategoryInfo("general", "General", "Uncategorized", Icons.Outlined.Receipt, "#8E9CA3"),
            CategoryInfo("payment", "Payment", "Uncategorized", Icons.Outlined.Payments, "#7C3AED"),

            CategoryInfo("dining", "Dining out", "Food and drink", Icons.Outlined.Restaurant, "#FF8A5B"),
            CategoryInfo("groceries", "Groceries", "Food and drink", Icons.Outlined.ShoppingCart, "#7FB069"),
            CategoryInfo("liquor", "Liquor", "Food and drink", Icons.Outlined.LocalBar, "#B5654C"),
            CategoryInfo("coffee", "Coffee", "Food and drink", Icons.Outlined.LocalCafe, "#A9744F"),

            CategoryInfo("rent", "Rent", "Home", Icons.Outlined.Home, "#5B8DC5"),
            CategoryInfo("utilities", "Utilities", "Home", Icons.Outlined.Bolt, "#F2C14E"),
            CategoryInfo("electricity", "Electricity", "Home", Icons.Outlined.Lightbulb, "#F2C14E"),
            CategoryInfo("water", "Water", "Home", Icons.Outlined.WaterDrop, "#5BB6C5"),
            CategoryInfo("internet", "Internet", "Home", Icons.Outlined.Wifi, "#6C8AE4"),
            CategoryInfo("furniture", "Furniture", "Home", Icons.Outlined.Chair, "#9C7B5A"),
            CategoryInfo("household", "Household supplies", "Home", Icons.Outlined.ShoppingBag, "#C58BBB"),

            CategoryInfo("car", "Car", "Transportation", Icons.Outlined.DirectionsCar, "#5B7CC5"),
            CategoryInfo("gas", "Gas/Fuel", "Transportation", Icons.Outlined.LocalGasStation, "#E4694A"),
            CategoryInfo("transit", "Bus/Train", "Transportation", Icons.Outlined.DirectionsBus, "#5BA0C5"),

            CategoryInfo("entertainment", "Entertainment", "Entertainment", Icons.Outlined.Theaters, "#C566B5"),
            CategoryInfo("tickets", "Movies/Tickets", "Entertainment", Icons.Outlined.ConfirmationNumber, "#B05BC5"),
            CategoryInfo("sports", "Sports", "Entertainment", Icons.Outlined.FitnessCenter, "#5BC57F"),

            CategoryInfo("travel", "Travel", "Life", Icons.Outlined.Flight, "#5BC5C0"),
            CategoryInfo("shopping", "Shopping", "Life", Icons.Outlined.ShoppingBag, "#E48FB4"),
            CategoryInfo("medical", "Medical", "Life", Icons.Outlined.MedicalServices, "#E45B6E"),
            CategoryInfo("gifts", "Gifts", "Life", Icons.Outlined.CardGiftcard, "#D65BB0"),
            CategoryInfo("education", "Education", "Life", Icons.Outlined.School, "#5B86C5"),
            CategoryInfo("pets", "Pets", "Life", Icons.Outlined.Pets, "#B59A5B"),
            CategoryInfo("kids", "Childcare", "Life", Icons.Outlined.ChildCare, "#E4A85B"),
        )
    }

    private val byId: Map<String, CategoryInfo> by lazy { all.associateBy { it.id } }

    fun get(id: String): CategoryInfo = byId[id] ?: byId.getValue("general")
}
