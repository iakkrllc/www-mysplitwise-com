import SwiftUI
import MysplitwiseCore

struct BalanceRowView: View {
    let user: User
    let amount: Double
    let currency: String

    private var owed: Bool { amount > 0 }

    var body: some View {
        HStack {
            Circle()
                .fill(Color(hex: user.avatarColor))
                .frame(width: 36, height: 36)
                .overlay(Text(String(user.name.prefix(1))).foregroundColor(.white).font(.headline))
            VStack(alignment: .leading) {
                Text(user.name).font(.body.bold())
                Text(owed ? "owes you" : "you owe").font(.caption).foregroundColor(.secondary)
            }
            Spacer()
            Text(Currency.formatMoney(abs(amount), code: currency))
                .font(.body.bold())
                .foregroundColor(owed ? Color(hex: "#22A85A") : Color(hex: "#E63879"))
        }
        .padding(.vertical, 6)
    }
}

extension Color {
    init(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)
        let r = Double((rgb & 0xFF0000) >> 16) / 255
        let g = Double((rgb & 0x00FF00) >> 8) / 255
        let b = Double(rgb & 0x0000FF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
