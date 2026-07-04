package com.mysplitwise.app

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.mysplitwise.app.data.AppStateRepository
import com.mysplitwise.app.data.AuthRepository
import com.mysplitwise.app.data.LocalCache
import com.mysplitwise.app.ui.account.AccountSettingsScreen
import com.mysplitwise.app.ui.account.DeleteAccountScreen
import com.mysplitwise.app.ui.auth.SignInScreen
import com.mysplitwise.app.ui.dashboard.DashboardScreen
import com.mysplitwise.app.ui.expenses.AddEditExpenseScreen
import com.mysplitwise.app.ui.expenses.ExpenseDetailScreen
import com.mysplitwise.app.ui.expenses.ExpenseListScreen
import com.mysplitwise.app.ui.friends.AddFriendScreen
import com.mysplitwise.app.ui.friends.FriendsListScreen
import com.mysplitwise.app.ui.groups.CreateEditGroupScreen
import com.mysplitwise.app.ui.groups.GroupDetailScreen
import com.mysplitwise.app.ui.groups.GroupsListScreen
import com.mysplitwise.app.ui.notifications.NotificationBell
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus as SupabaseSessionStatus
import kotlinx.coroutines.launch

private const val TAB_DASHBOARD = "dashboard"
private const val TAB_EXPENSES = "expenses"
private const val TAB_FRIENDS = "friends"
private const val TAB_GROUPS = "groups"
private const val TAB_ACTIVITY = "activity"
private const val TAB_ACCOUNT = "account"

/** Root composable: shows the sign-in flow when signed out, otherwise the main tabbed app. */
@Composable
fun MysplitwiseRoot() {
    val sessionStatus by AuthRepository.sessionStatus.collectAsState()
    when (val status = sessionStatus) {
        is SupabaseSessionStatus.Authenticated -> {
            val userId = status.session.user?.id
            if (userId != null) MainApp(currentUserId = userId) else SignInScreen()
        }
        else -> SignInScreen()
    }
}

@Composable
private fun MainApp(currentUserId: String) {
    val context = LocalContext.current
    val repository = remember(currentUserId) { AppStateRepository(currentUserId, LocalCache(context)) }
    val navController = rememberNavController()
    val scope = rememberCoroutineScopeSafe()

    LaunchedEffect(currentUserId) {
        repository.loadCached()
        repository.refresh()
    }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = currentRoute == TAB_DASHBOARD,
                    onClick = { navController.navigateToTab(TAB_DASHBOARD) },
                    icon = { Icon(Icons.Filled.Home, contentDescription = "Dashboard") },
                    label = { Text("Dashboard") },
                )
                NavigationBarItem(
                    selected = currentRoute == TAB_EXPENSES,
                    onClick = { navController.navigateToTab(TAB_EXPENSES) },
                    icon = { Icon(Icons.Filled.List, contentDescription = "Expenses") },
                    label = { Text("Expenses") },
                )
                NavigationBarItem(
                    selected = currentRoute == TAB_FRIENDS,
                    onClick = { navController.navigateToTab(TAB_FRIENDS) },
                    icon = { Icon(Icons.Filled.Person, contentDescription = "Friends") },
                    label = { Text("Friends") },
                )
                NavigationBarItem(
                    selected = currentRoute == TAB_GROUPS,
                    onClick = { navController.navigateToTab(TAB_GROUPS) },
                    icon = { Icon(Icons.Filled.Group, contentDescription = "Groups") },
                    label = { Text("Groups") },
                )
                NavigationBarItem(
                    selected = currentRoute == TAB_ACTIVITY,
                    onClick = { navController.navigateToTab(TAB_ACTIVITY) },
                    icon = { Icon(Icons.Filled.Notifications, contentDescription = "Activity") },
                    label = { Text("Activity") },
                )
                NavigationBarItem(
                    selected = currentRoute == TAB_ACCOUNT,
                    onClick = { navController.navigateToTab(TAB_ACCOUNT) },
                    icon = { Icon(Icons.Filled.Settings, contentDescription = "Account") },
                    label = { Text("Account") },
                )
            }
        },
    ) { padding ->
        NavHost(navController = navController, startDestination = TAB_DASHBOARD, modifier = Modifier.padding(padding)) {
            composable(TAB_DASHBOARD) { DashboardScreen(repository) }
            composable(TAB_EXPENSES) {
                ExpenseListScreen(
                    repository,
                    onAddExpense = { navController.navigate("addExpense") },
                    onExpenseClick = { id -> navController.navigate("expenseDetail/$id") },
                )
            }
            composable(TAB_FRIENDS) {
                FriendsListScreen(repository, onAddFriend = { navController.navigate("addFriend") })
            }
            composable(TAB_GROUPS) {
                GroupsListScreen(
                    repository,
                    onCreateGroup = { navController.navigate("createGroup") },
                    onGroupClick = { id -> navController.navigate("groupDetail/$id") },
                )
            }
            composable(TAB_ACTIVITY) { NotificationBell(repository) }
            composable(TAB_ACCOUNT) {
                AccountSettingsScreen(
                    repository,
                    onSignOut = { scope.launch { AuthRepository.signOut() } },
                    onDeleteAccount = { navController.navigate("deleteAccount") },
                )
            }
            composable("addExpense") {
                AddEditExpenseScreen(repository, groupId = null, preselectedFriendId = null, onDone = { navController.popBackStack() })
            }
            composable("expenseDetail/{id}") { backStackEntry ->
                val id = backStackEntry.arguments?.let { it.getString("id") } ?: return@composable
                ExpenseDetailScreen(repository, id, onClose = { navController.popBackStack() })
            }
            composable("addFriend") {
                AddFriendScreen(repository, onDone = { navController.popBackStack() })
            }
            composable("createGroup") {
                CreateEditGroupScreen(repository, onDone = { navController.popBackStack() })
            }
            composable("groupDetail/{id}") { backStackEntry ->
                val id = backStackEntry.arguments?.let { it.getString("id") } ?: return@composable
                GroupDetailScreen(repository, id, onClose = { navController.popBackStack() })
            }
            composable("deleteAccount") {
                DeleteAccountScreen(
                    repository,
                    onCancel = { navController.popBackStack() },
                    onDeleted = { AuthRepository.signOut() },
                )
            }
        }
    }
}

private fun NavHostController.navigateToTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

@Composable
private fun rememberCoroutineScopeSafe() = androidx.compose.runtime.rememberCoroutineScope()
