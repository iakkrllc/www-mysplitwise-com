import SwiftUI
import MysplitwiseCore

struct GroupsListView: View {
    @EnvironmentObject var appStore: AppStore
    @State private var showCreateGroup = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(appStore.groups) { group in
                    NavigationLink(value: group.id) {
                        VStack(alignment: .leading) {
                            Text(group.name).font(.body.bold())
                            Text("\(group.memberIds.count) members").font(.caption).foregroundColor(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Groups")
            .navigationDestination(for: String.self) { groupId in
                if let group = appStore.getGroup(groupId) {
                    GroupDetailView(group: group)
                }
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showCreateGroup = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showCreateGroup) {
                CreateEditGroupView()
            }
        }
    }
}
