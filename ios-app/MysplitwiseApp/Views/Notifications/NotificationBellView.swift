import SwiftUI
import MysplitwiseCore

/// Trimmed Phase 1 notification bell: new settlements received since last
/// read, plus simple owe/owed threshold nudges. No recurring-due/comments/AI
/// nudges yet (Phase 2+) and no per-type preference toggles UI — every type
/// here always respects `DEFAULT_NOTIFICATION_PREFS` (all on).
struct NotificationBellView: View {
    @EnvironmentObject var appStore: AppStore

    private struct Notif: Identifiable {
        let id: String
        let title: String
        let subtitle: String?
    }

    private var notifs: [Notif] {
        var result: [Notif] = []
        let base = appStore.baseCurrency
        for expense in appStore.expenses where expense.isSettlement {
            guard let payee = expense.shares.first(where: { $0.owed > 0.001 }),
                  payee.userId == appStore.currentUserId,
                  let payer = expense.shares.first(where: { $0.paid > 0.001 }),
                  let payerUser = appStore.getUser(payer.userId)
            else { continue }
            result.append(Notif(
                id: "p-\(expense.id)",
                title: "\(payerUser.name) paid you \(Currency.formatMoney(expense.amount, code: expense.currency))",
                subtitle: expense.date
            ))
        }
        let friends = appStore.users.filter { $0.id != appStore.currentUserId }
        for friend in friends {
            let bal = Calculations.balanceBetween(appStore.currentUserId, friend.id, expenses: appStore.baseExpenses)
            if bal > 0.5 {
                result.append(Notif(id: "owed-\(friend.id)", title: "\(friend.name) owes you \(Currency.formatMoney(bal, code: base))", subtitle: nil))
            } else if bal < -0.5 {
                result.append(Notif(id: "owe-\(friend.id)", title: "You owe \(friend.name) \(Currency.formatMoney(-bal, code: base))", subtitle: nil))
            }
        }
        return result
    }

    var body: some View {
        NavigationStack {
            List {
                if notifs.isEmpty {
                    Text("You're all caught up.").foregroundColor(.secondary)
                } else {
                    ForEach(notifs) { notif in
                        VStack(alignment: .leading) {
                            Text(notif.title)
                            if let subtitle = notif.subtitle {
                                Text(subtitle).font(.caption).foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Notifications")
            .task { await appStore.setNotificationsRead() }
        }
    }
}
