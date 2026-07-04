import SwiftUI
import MysplitwiseCore

struct CategoryPickerView: View {
    @Binding var selectedId: String

    private var grouped: [(String, [CategoryInfo])] {
        Dictionary(grouping: Categories.all, by: \.group)
            .sorted { $0.key < $1.key }
    }

    var body: some View {
        List {
            ForEach(grouped, id: \.0) { group, categories in
                Section(group) {
                    ForEach(categories, id: \.id) { category in
                        Button {
                            selectedId = category.id
                        } label: {
                            HStack {
                                Image(systemName: category.sfSymbol)
                                    .foregroundColor(Color(hex: category.colorHex))
                                Text(category.name)
                                    .foregroundColor(.primary)
                                Spacer()
                                if selectedId == category.id {
                                    Image(systemName: "checkmark").foregroundColor(.accentColor)
                                }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Category")
    }
}
