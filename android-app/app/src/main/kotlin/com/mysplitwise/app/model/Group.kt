package com.mysplitwise.app.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class GroupType {
    @SerialName("trip") TRIP,
    @SerialName("home") HOME,
    @SerialName("couple") COUPLE,
    @SerialName("other") OTHER,
}

/** Port of the `Group` interface in `src/lib/types.ts`. */
@Serializable
data class Group(
    val id: String,
    val name: String,
    val type: GroupType,
    val memberIds: List<String>,
    val simplifyDebts: Boolean,
    val monthlyBudget: Double? = null,
    val createdAt: String,
)
