import Foundation

/// Expense categories — port of `src/lib/categories.tsx`. `sfSymbol` names are SF
/// Symbols equivalents chosen to match (not copy) the web's lucide-react icons;
/// a few newer symbol names (iOS 16/17) may need swapping once verified in Xcode.
public struct CategoryInfo {
    public let id: String
    public let name: String
    public let group: String
    public let sfSymbol: String
    public let colorHex: String
}

public enum Categories {
    public static let all: [CategoryInfo] = [
        CategoryInfo(id: "general", name: "General", group: "Uncategorized", sfSymbol: "doc.plaintext", colorHex: "#8E9CA3"),
        CategoryInfo(id: "payment", name: "Payment", group: "Uncategorized", sfSymbol: "banknote", colorHex: "#7C3AED"),

        CategoryInfo(id: "dining", name: "Dining out", group: "Food and drink", sfSymbol: "fork.knife", colorHex: "#FF8A5B"),
        CategoryInfo(id: "groceries", name: "Groceries", group: "Food and drink", sfSymbol: "cart", colorHex: "#7FB069"),
        CategoryInfo(id: "liquor", name: "Liquor", group: "Food and drink", sfSymbol: "wineglass", colorHex: "#B5654C"),
        CategoryInfo(id: "coffee", name: "Coffee", group: "Food and drink", sfSymbol: "cup.and.saucer", colorHex: "#A9744F"),

        CategoryInfo(id: "rent", name: "Rent", group: "Home", sfSymbol: "house", colorHex: "#5B8DC5"),
        CategoryInfo(id: "utilities", name: "Utilities", group: "Home", sfSymbol: "bolt", colorHex: "#F2C14E"),
        CategoryInfo(id: "electricity", name: "Electricity", group: "Home", sfSymbol: "lightbulb", colorHex: "#F2C14E"),
        CategoryInfo(id: "water", name: "Water", group: "Home", sfSymbol: "drop", colorHex: "#5BB6C5"),
        CategoryInfo(id: "internet", name: "Internet", group: "Home", sfSymbol: "wifi", colorHex: "#6C8AE4"),
        CategoryInfo(id: "furniture", name: "Furniture", group: "Home", sfSymbol: "hammer", colorHex: "#9C7B5A"),
        CategoryInfo(id: "household", name: "Household supplies", group: "Home", sfSymbol: "bag", colorHex: "#C58BBB"),

        CategoryInfo(id: "car", name: "Car", group: "Transportation", sfSymbol: "car", colorHex: "#5B7CC5"),
        CategoryInfo(id: "gas", name: "Gas/Fuel", group: "Transportation", sfSymbol: "fuelpump", colorHex: "#E4694A"),
        CategoryInfo(id: "transit", name: "Bus/Train", group: "Transportation", sfSymbol: "bus", colorHex: "#5BA0C5"),

        CategoryInfo(id: "entertainment", name: "Entertainment", group: "Entertainment", sfSymbol: "film", colorHex: "#C566B5"),
        CategoryInfo(id: "tickets", name: "Movies/Tickets", group: "Entertainment", sfSymbol: "ticket", colorHex: "#B05BC5"),
        CategoryInfo(id: "sports", name: "Sports", group: "Entertainment", sfSymbol: "dumbbell", colorHex: "#5BC57F"),

        CategoryInfo(id: "travel", name: "Travel", group: "Life", sfSymbol: "airplane", colorHex: "#5BC5C0"),
        CategoryInfo(id: "shopping", name: "Shopping", group: "Life", sfSymbol: "bag.fill", colorHex: "#E48FB4"),
        CategoryInfo(id: "medical", name: "Medical", group: "Life", sfSymbol: "cross.case", colorHex: "#E45B6E"),
        CategoryInfo(id: "gifts", name: "Gifts", group: "Life", sfSymbol: "gift", colorHex: "#D65BB0"),
        CategoryInfo(id: "education", name: "Education", group: "Life", sfSymbol: "graduationcap", colorHex: "#5B86C5"),
        CategoryInfo(id: "pets", name: "Pets", group: "Life", sfSymbol: "pawprint", colorHex: "#B59A5B"),
        CategoryInfo(id: "kids", name: "Childcare", group: "Life", sfSymbol: "figure.child", colorHex: "#E4A85B"),
    ]

    private static let byId: [String: CategoryInfo] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    public static func get(_ id: String) -> CategoryInfo {
        byId[id] ?? byId["general"]!
    }
}
